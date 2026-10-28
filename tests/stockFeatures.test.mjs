import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(filename, dependencies = {}) {
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
const queryHelpers = {queryOptions: value => value, mutationOptions: value => value};
const itemKeys = {all: ['items']};

test('purchase creation refreshes purchase views and inventory, without stock-owned keys', async () => {
    const types = load('src/features/purchases/purchase.types.ts');
    const query = load('src/features/purchases/purchase.query.ts', {
        '@tanstack/react-query': queryHelpers, '../items/item.types': {itemKeys},
        './purchase.types': types, './purchase.api': {createPurchaseAsync: async () => 'id'},
    });
    const invalidated = [];
    const mutation = query.createPurchaseMutationOption({invalidateQueries: async ({queryKey}) => invalidated.push([...queryKey])});
    assert.equal(mutation.retry, false);
    await mutation.onSuccess('id');
    assert.deepEqual(invalidated, [['purchases'], ['purchases', 'details', 'id'], ['items']]);
});

test('order refresh covers lists, detail, timeline, and inventory using their current namespaces', async () => {
    const types = load('src/features/orders/order.types.ts');
    const query = load('src/features/orders/order.query.ts', {
        '@tanstack/react-query': queryHelpers, '../items/item.types': {itemKeys},
        './order.types': types, './order.api': {},
    });
    const prefixes = [];
    await query.refreshOrders({invalidateQueries: async ({queryKey}) => prefixes.push([...queryKey])});
    const keys = [types.orderKeys.list('user', false, true), types.orderKeys.details('user', 'order'), types.orderKeys.timeline('user', 'order', true)];
    for (const key of keys) assert.ok(prefixes.some(prefix => prefix.every((value, index) => key[index] === value)));
    assert.deepEqual(prefixes, [['orders'], ['items']]);
    assert.equal(query.getOrdersQueryOption('', false, true).enabled, false);
});

test('order item lookup does not fetch unrelated suppliers and orders', async () => {
    const tables = [];
    const api = load('src/features/orders/order.api.ts', {
        '../../lib/supabase': {supabase: {from: table => {
            tables.push(table);
            return {select: () => ({order: async () => ({data: [{item_id: 'item'}], error: null})})};
        }}},
        './order.schema': {}, './order.errors': {},
    });
    const items = await api.getOrderItemsAsync();
    assert.equal(items[0].item_id, 'item');
    assert.deepEqual(tables, ['item']);
});

test('order action rules preserve the different online and staff workflows', () => {
    const {allowedActions} = load('src/features/orders/order.model.ts');
    assert.deepEqual([...allowedActions('staff', 'received')], ['delivered', 'declined']);
    assert.deepEqual([...allowedActions('online', 'received')], ['processed', 'declined']);
    assert.deepEqual([...allowedActions('online', 'processed')], ['shipped', 'declined']);
    assert.deepEqual([...allowedActions('online', 'shipped')], ['delivered', 'declined']);
    for (const origin of ['online', 'staff']) {
        assert.deepEqual([...allowedActions(origin, 'delivered')], []);
        assert.deepEqual([...allowedActions(origin, 'declined')], []);
    }
});

test('purchase audit timestamps keep UTC semantics when the database omits a timezone', () => {
    const {formatPurchaseDate} = load('src/features/purchases/purchase.model.ts');
    assert.equal(formatPurchaseDate(null), '—');
    assert.equal(formatPurchaseDate('2026-10-28T08:00:00'), new Date('2026-10-28T08:00:00Z').toLocaleString());
    assert.equal(formatPurchaseDate('2026-10-28T08:00:00+03:00'), new Date('2026-10-28T08:00:00+03:00').toLocaleString());
});
