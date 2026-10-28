import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { QueryClient, QueryObserver } from '@tanstack/react-query';

const source = ts.transpileModule(fs.readFileSync(new URL('../src/features/auth/useAuth.ts', import.meta.url), 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
}).outputText;

function setup() {
    const client = new QueryClient({defaultOptions: {queries: {retry: false, gcTime: Infinity}}});
    let claims = {userId: 'staff-a', appRole: 'staff', isAuthenticated: true};
    let checks = 0, callback, cleanup;
    const jobs = new Map();
    let timer = 0;
    const options = {queryKey: ['auth'], staleTime: Infinity, queryFn: async () => {checks++; return claims;}};
    client.setQueryData(['auth'], claims);
    client.setQueryData(['items', 'admin', 'staff-a'], ['private inventory']);
    const observer = new QueryObserver(client, options);
    const unsubscribe = observer.subscribe(() => {});
    const exports = {};
    const modules = {
        react: {useEffect: effect => {cleanup = effect();}},
        '@tanstack/react-query': {useQuery: () => observer.getCurrentResult(), useQueryClient: () => client},
        '../../lib/supabase': {supabase: {auth: {onAuthStateChange: listener => {
            callback = listener;
            return {data: {subscription: {unsubscribe() {callback = undefined;}}}};
        }}}},
        './auth.query': {getAuthQueryOption: () => options},
        './auth.types': {authKeys: {all: ['auth']}},
    };
    vm.runInNewContext(source, {exports, require: name => {
        assert.ok(modules[name], name);
        return modules[name];
    }, setTimeout: fn => {jobs.set(++timer, fn); return timer;}, clearTimeout: id => jobs.delete(id)});
    exports.useAuth();
    function emit(event, userId, role = 'staff') {
        claims = {userId, appRole: userId ? role : null, isAuthenticated: !!userId};
        callback(event, userId ? {user: {id: userId, is_anonymous: false}} : null);
    }
    async function flush() {
        for (const [id, job] of jobs) {jobs.delete(id); job();}
        for (let i = 0; i < 20; i++) await Promise.resolve();
    }
    return {client, emit, flush, get checks() {return checks;}, cleanup() {cleanup(); unsubscribe(); client.clear();}, jobs};
}

test('same-user sign-in and token refresh preserve inventory while rechecking claims', async () => {
    const h = setup();
    try {
        for (const event of ['INITIAL_SESSION', 'SIGNED_IN', 'SIGNED_IN', 'TOKEN_REFRESHED']) {
            h.emit(event, 'staff-a');
            await h.flush();
            assert.deepEqual(h.client.getQueryData(['items', 'admin', 'staff-a']), ['private inventory']);
        }
        assert.equal(h.checks, 4);
        h.emit('TOKEN_REFRESHED', 'staff-a', 'customer');
        await h.flush();
        assert.equal(h.client.getQueryData(['auth']).appRole, 'customer', 'Role changes must still reach route guards');
    } finally {h.cleanup();}
});

test('account switch clears private caches and checks the new account', async () => {
    const h = setup();
    try {
        h.emit('SIGNED_IN', 'staff-b');
        await h.flush();
        assert.equal(h.client.getQueryData(['items', 'admin', 'staff-a']), undefined);
        assert.equal(h.client.getQueryData(['auth']).userId, 'staff-b');
        assert.equal(h.checks, 1);
    } finally {h.cleanup();}
});

test('sign-out clears protected data and produces anonymous auth', async () => {
    const h = setup();
    try {
        h.emit('SIGNED_OUT', null);
        await h.flush();
        assert.equal(h.client.getQueryData(['items', 'admin', 'staff-a']), undefined);
        assert.equal(h.client.getQueryData(['auth']).isAuthenticated, false);
    } finally {h.cleanup();}
});

test('queued sign-out and sign-in cannot leave the previous inventory cached', async () => {
    const h = setup();
    try {
        h.emit('SIGNED_OUT', null);
        h.emit('SIGNED_IN', 'staff-b');
        await h.flush();
        assert.equal(h.client.getQueryData(['items', 'admin', 'staff-a']), undefined);
        assert.equal(h.client.getQueryData(['auth']).userId, 'staff-b');
    } finally {h.cleanup();}
});

test('unmount cancels deferred auth work', async () => {
    const h = setup();
    h.emit('SIGNED_IN', 'staff-b');
    assert.equal(h.jobs.size, 1);
    h.cleanup();
    assert.equal(h.jobs.size, 0);
});
