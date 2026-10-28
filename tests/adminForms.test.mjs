import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';
import * as zod from 'zod';

function load(filename, dependencies = {}) {
    const exports = {};
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
    }).outputText;
    vm.runInNewContext(source, {exports, crypto: webcrypto, require: name => {
        assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
        return dependencies[name];
    }});
    return exports;
}
const helpers = {queryOptions: value => value, mutationOptions: value => value};

test('required administrative names reject whitespace and normalize valid drafts', () => {
    for (const [file, exported, field] of [
        ['Categories/category', 'categorySchema', 'category_name'],
        ['units/unit', 'unitSchema', 'uom_name'],
        ['suppliers/supplierCategory', 'supplierCategorySchema', 'category_name'],
    ]) {
        const schema = load(`src/features/${file}.schema.ts`, {zod})[exported];
        const defaults = field === 'uom_name' ? {uom_notes: ''} : {category_notes: ''};
        assert.equal(schema.safeParse({...defaults, [field]: '   '}).success, false);
        assert.equal(schema.parse({...defaults, [field]: '  New name  '})[field], 'New name');
    }
});

test('customer form validates contact input and preserves an inactive boolean', () => {
    const {customerSchema} = load('src/features/customers/customer.schema.ts', {zod});
    const draft = {first_name: '  Walk ', last_name: 'In', email: '', phone_number: '', address: '', customer_notes: '', is_active: false};
    assert.equal(customerSchema.parse(draft).is_active, false);
    assert.equal(customerSchema.parse(draft).first_name, 'Walk');
    assert.equal(customerSchema.safeParse({...draft, email: 'invalid'}).success, false);
    assert.equal(customerSchema.safeParse({...draft, is_active: 'false'}).success, false);
    assert.equal(customerSchema.parse({...draft, email: ' person@example.test '}).email, 'person@example.test');
});

test('supplier form requires a real category selection before approval', () => {
    const {supplierSchema} = load('src/features/suppliers/supplier.schema.ts', {zod});
    const draft = {supplier_name: 'Supplier', supplier_cat_id: '', supplier_email: '', supplier_contact: '', supplier_address: '', supplier_notes: ''};
    assert.equal(supplierSchema.safeParse(draft).success, false);
    assert.equal(supplierSchema.safeParse({...draft, supplier_cat_id: '11111111-1111-4111-8111-111111111111'}).success, true);
});

test('supplier edit retains its identity; creating a supplier generates an identity once per mutation', async () => {
    const calls = [];
    const query = load('src/features/suppliers/supplier.query.ts', {
        '@tanstack/react-query': helpers,
        './supplier.types': {supplierKeys: {all: ['suppliers']}},
        './supplier.api': {saveSupplierAsync: async (...args) => calls.push(args)},
    });
    const mutation = query.saveSupplierMutationOption({invalidateQueries: async () => {}});
    const values = {supplier_name: 'Supplier', supplier_cat_id: 'category', supplier_email: '', supplier_contact: '', supplier_address: '', supplier_notes: ''};
    assert.equal(calls.length, 0);
    await mutation.mutationFn({id: 'existing-id', values});
    assert.equal(calls[0][0].supplier_id, 'existing-id');
    assert.equal(calls[0][1], true);
    await mutation.mutationFn({values});
    assert.match(calls[1][0].supplier_id, /^[0-9a-f-]{36}$/);
    assert.equal(calls[1][1], false);
    assert.equal(calls[1][0].supplier_email, null);
});

test('customer API sends the confirmed inactive state and edit identity unchanged', async () => {
    let sent;
    const api = load('src/features/customers/customer.api.ts', {
        '../../lib/supabase': {supabase: {rpc: async (name, args) => {sent = {name, args}; return {data: 'customer-id', error: null};}}},
    });
    await api.saveCustomer({first_name: 'Walk', last_name: 'In', email: '', phone_number: '', address: '', customer_notes: '', is_active: false}, 'customer-id');
    assert.equal(sent.name, 'save_customer');
    assert.equal(sent.args.p_customer_id, 'customer-id');
    assert.equal(sent.args.p_is_active, false);
});
