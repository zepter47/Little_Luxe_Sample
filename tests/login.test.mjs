import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as zod from 'zod';

function load(filename, dependencies) {
    const exports = {};
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
    }).outputText;
    vm.runInNewContext(source, {exports, require: name => {
        assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
        return dependencies[name];
    }});
    return exports;
}
const schemas = load('src/features/auth/login.schema.ts', {zod});

test('email validation rejects malformed input and trims valid addresses', () => {
    for (const email of ['', '   ', 'invalid', 'person@', '@example.com', 'a b@example.com']) {
        assert.equal(schemas.loginSchema.safeParse({email}).success, false, email);
    }
    assert.equal(schemas.loginSchema.parse({email: ' person@example.com '}).email, 'person@example.com');
    assert.equal(schemas.loginSchema.safeParse({email: ''}).error.issues[0].message, 'Enter your email address.');
});

test('OTP requires exactly six ASCII digits and preserves leading zeroes', () => {
    for (const code of ['', '12345', '1234567', '12a456', '123 56', ' 123456', '１２３４５６']) {
        assert.equal(schemas.loginCodeSchema.safeParse({code}).success, false, code);
    }
    assert.equal(schemas.loginCodeSchema.parse({code: '012345'}).code, '012345');
});

function api(auth) {
    return load('src/features/auth/auth.api.ts', {
        '../../lib/supabase': {supabase: {auth}},
        './auth.types': {}, './login.schema': schemas,
    });
}

test('request code validates before calling Supabase and omits link redirects', async () => {
    const calls = [];
    const auth = api({signInWithOtp: async args => {calls.push(args); return {error: null};}});
    await assert.rejects(auth.signInAsync('invalid'));
    assert.equal(calls.length, 0);
    await auth.signInAsync(' person@example.com ');
    assert.equal(calls[0].email, 'person@example.com');
    assert.equal(calls[0].options, undefined);
});

test('verification validates input, uses email OTP, and requires a session', async () => {
    const calls = [];
    let result = {data: {session: {access_token: 'session'}}, error: null};
    const auth = api({verifyOtp: async args => {calls.push(args); return result;}});
    await assert.rejects(auth.verifySignInAsync({email: 'person@example.com', code: '12345'}));
    assert.equal(calls.length, 0);
    await auth.verifySignInAsync({email: 'person@example.com', code: '012345'});
    assert.equal(calls[0].type, 'email');
    assert.equal(calls[0].token, '012345');
    assert.equal(calls[0].email, 'person@example.com');
    result = {data: {session: null}, error: new Error('Code expired')};
    await assert.rejects(auth.verifySignInAsync({email: 'person@example.com', code: '012345'}), /Code expired/);
    result = {data: {session: null}, error: null};
    await assert.rejects(auth.verifySignInAsync({email: 'person@example.com', code: '012345'}), /request a new code/);
});
