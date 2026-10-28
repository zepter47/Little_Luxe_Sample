import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function load(filename) {
    const exports = {};
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX},
    }).outputText, {exports, require: name => name.startsWith('.')
        ? load(path.resolve(path.dirname(filename), name) + '.ts') : require(name)});
    return exports;
}
const {staffOrderSchema, orderStatusSchema} = load('src/features/orders/order.schema.ts');
const item = {item_id: '11111111-1111-4111-8111-111111111111', quantity: 1, sale_price: 20};
const draft = {customer_id: '22222222-2222-4222-8222-222222222222', items: [item], notes: '  Customer note  '};

test('staff form validates customer, quantity boundaries and distinct order lines before approval', () => {
    assert.equal(staffOrderSchema.parse(draft).notes, 'Customer note');
    for (const patch of [{customer_id: ''}, {items: []}, {items: [item, item]}]) {
        assert.equal(staffOrderSchema.safeParse({...draft, ...patch}).success, false);
    }
    const lines = Array.from({length: 101}, (_, index) => ({...item,
        item_id: `00000000-0000-4000-8000-${index.toString(16).padStart(12, '0')}`}));
    assert.equal(staffOrderSchema.safeParse({...draft, items: lines}).success, false);
    assert.equal(staffOrderSchema.safeParse({...draft, items: lines.slice(0, 100)}).success, true);
    for (const quantity of [0, -1, 1.5, 1000, NaN, Infinity]) {
        assert.equal(staffOrderSchema.safeParse({...draft, items: [{...item, quantity}]}).success, false);
    }
    assert.equal(staffOrderSchema.safeParse({...draft, items: [{...item, quantity: 999}]}).success, true);
});

test('decline needs a nonblank reason and normalization does not affect other status actions', () => {
    const invalid = orderStatusSchema.safeParse({status: 'declined', reason: '  '});
    assert.equal(invalid.success, false);
    assert.equal(invalid.error.issues[0].path[0], 'reason');
    assert.equal(orderStatusSchema.parse({status: 'declined', reason: '  Not available  '}).reason, 'Not available');
    for (const status of ['processed', 'shipped', 'delivered']) {
        assert.equal(orderStatusSchema.safeParse({status, reason: ''}).success, true);
    }
    assert.equal(orderStatusSchema.safeParse({status: 'unknown', reason: ''}).success, false);
});

test('timeline presentation never displays staff audit fields for a customer', () => {
    const Component = load('src/features/orders/components/OrderTimeline.tsx').default;
    const entry = {history_id: 1, previous_status: 'received', new_status: 'declined', changed_on: '2026-10-28T08:00:00Z',
        reason_code: 'internal-code', change_source: 'internal-source', changed_by: 'staff-id', reason_notes: 'private-note'};
    const customer = renderToStaticMarkup(React.createElement(Component, {entries: [entry], staff: false}));
    assert.match(customer, /declined/);
    assert.doesNotMatch(customer, /internal-code|internal-source|staff-id|private-note/);
    const staff = renderToStaticMarkup(React.createElement(Component, {entries: [entry], staff: true}));
    assert.match(staff, /private-note/);
});

test('order summary calculates totals and hides added-by information from customers', () => {
    const Component = load('src/features/orders/components/OrderSummary.tsx').default;
    const props = {order: {customer_id: 'customer', order_status: 'received', order_origin: 'staff', added_by: 'private-staff-id'},
        details: [{order_details_id: 'line', item_id: 'item', item: {item_name: 'Dress'}, quantity_sold: 3, sale_price: 22}]};
    const html = renderToStaticMarkup(React.createElement(Component, {...props, staff: false}));
    assert.match(html, /Dress/);
    assert.match(html, /66/);
    assert.doesNotMatch(html, /private-staff-id/);
});
