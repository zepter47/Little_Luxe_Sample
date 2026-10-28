import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

function load(filename, dependencies = {}) {
    const exports = {};
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
    }).outputText, {exports, require: name => {
        if (name in dependencies) return dependencies[name];
        if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), name) + '.ts', dependencies);
        throw new Error(`Unexpected dependency: ${name}`);
    }});
    return exports;
}

test('people labels prefer available names, then email, and never fall back to an ID', () => {
    const {orderPersonName, orderPersonLabel} = load('src/features/orders/order.model.ts');
    const {purchaseAuthorName} = load('src/features/purchases/purchase.model.ts');
    const {customerDisplayName} = load('src/features/customers/customer.model.ts');
    const person = {customer_id: 'private-uuid', first_name: ' Jane ', last_name: ' Doe ', email: 'jane@example.test'};
    for (const [values, expected] of [[person, 'Jane Doe'], [{...person, last_name: null}, 'Jane'],
        [{...person, first_name: null, last_name: ' '}, 'jane@example.test']]) {
        assert.equal(orderPersonName(values), expected);
        assert.equal(orderPersonLabel(person.customer_id, [values]), expected);
        assert.equal(purchaseAuthorName(person.customer_id, [values]), expected);
        assert.equal(customerDisplayName(values), expected);
    }
    assert.equal(purchaseAuthorName(null, []), 'Not recorded');
    assert.doesNotMatch(orderPersonLabel('private-uuid', []), /private-uuid/);
    assert.doesNotMatch(purchaseAuthorName('private-uuid', []), /private-uuid/);
});

test('display lookups select only public customer name/email fields and filter the requested IDs', async () => {
    for (const [feature, filename, method] of [['orders', 'order', 'getOrderPeopleAsync'], ['purchases', 'purchase', 'getPurchasePeopleAsync']]) {
        const calls = [];
        const api = load(`src/features/${feature}/${filename}.api.ts`, {
            '../../lib/supabase': {supabase: {from: table => {
                calls.push(table);
                return {select: columns => {
                    calls.push(columns);
                    return {in: async (column, ids) => {calls.push(column, ids); return {data: [], error: null};}};
                }};
            }}},
            './order.schema': {}, './order.errors': {},
        });
        await api[method]([]);
        assert.equal(calls.length, 0);
        await api[method](['id-a', 'id-b']);
        assert.deepEqual(calls, ['customer', 'customer_id,first_name,last_name,email', 'customer_id', ['id-a', 'id-b']]);
    }
});

test('people query keys are scoped by viewer, deduplicate IDs and disable anonymous lookups', () => {
    const {getOrderPeopleQueryOption} = load('src/features/orders/order.query.ts', {
        '@tanstack/react-query': {queryOptions: value => value, mutationOptions: value => value},
        './order.api': {}, '../items/item.types': {itemKeys: {all: ['items']}},
    });
    const first = getOrderPeopleQueryOption('viewer-a', ['b', null, 'a', 'b']);
    const second = getOrderPeopleQueryOption('viewer-a', ['a', 'b']);
    assert.equal(JSON.stringify(first.queryKey), JSON.stringify(second.queryKey));
    assert.notEqual(JSON.stringify(first.queryKey), JSON.stringify(getOrderPeopleQueryOption('viewer-b', ['a', 'b']).queryKey));
    assert.equal(getOrderPeopleQueryOption('', ['a']).enabled, false);
    assert.equal(getOrderPeopleQueryOption('viewer-a', []).enabled, false);
});
