import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import ts from 'typescript';
import * as zod from 'zod';

const exports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/stock/stockDocument.model.ts', 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
}).outputText, {exports, crypto: webcrypto});
const {newDocumentLine, lineTotal, validateDocumentLines, documentLinesPayload} = exports;
const item = (overrides = {}) => ({...newDocumentLine(), item_id: 'item-a', quantity: '3', unit_price: '0.10', ...overrides});

test('a complete document requires valid item lines', () => {
    assert.match(validateDocumentLines([], false), /at least one item/);
    for (const quantity of ['0', '-1', '1.5', '', 'Infinity', '2147483648']) {
        assert.match(validateDocumentLines([item({quantity})], false), /positive whole number/);
    }
    for (const unit_price of ['', '-1', 'NaN', '1.234']) {
        assert.match(validateDocumentLines([item({unit_price})], false), /price/);
    }
    assert.match(validateDocumentLines([item({item_id: ''})], false), /select an item/);
    assert.equal(validateDocumentLines([item(), item({unit_price: '0'})], false), '');
});

test('totals calculate every line without decimal multiplication artifacts', () => {
    assert.equal(lineTotal(item()), 0.3);
    assert.equal([item(), item({quantity: '2', unit_price: '12.50'})].reduce((sum, row) => sum + lineTotal(row), 0), 25.3);
    assert.equal(lineTotal(item({unit_price: 'invalid'})), 0);
});

test('return lines require an original order line', () => {
    assert.match(validateDocumentLines([item()], true), /select an item/);
    assert.equal(validateDocumentLines([item({order_details_id: 'order-line-a', unit_price: ''})], true), '');
});

test('save payload includes all lines and excludes temporary UI keys', () => {
    const first = item({batch_number: ' B-1 ', expiry_date: '2027-01-01'}), second = item({quantity: '2'});
    assert.notEqual(first.key, second.key);
    const payload = JSON.parse(JSON.stringify(documentLinesPayload([first, second])));
    assert.equal(payload.length, 2);
    assert.deepEqual(payload[0], {item_id: 'item-a', order_details_id: null, quantity: 3, unit_price: 0.1, batch_number: 'B-1', expiry_date: '2027-01-01'});
    assert.equal(payload[1].batch_number, null);
    assert.equal(payload[1].expiry_date, null);
});

// Purchases follow the application's RHF/Zod convention instead of the generic document validator.
const purchaseModule = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/purchases/purchase.schema.ts', 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
}).outputText, {exports: purchaseModule, require: name => {
    if (name === 'zod') return zod;
    throw new Error(`Unexpected dependency: ${name}`);
}});
const {purchaseSchema} = purchaseModule;
const purchaseDraft = () => ({invoice_number: ' INV-1 ', supplier_id: '', purchase_notes: '',
    lines: [{item_id: '11111111-1111-4111-8111-111111111111',
        quantity: '2', unit_price: '12.50', batch_number: ' B1 ', expiry_date: ''}]});

test('purchase validation keeps optional supplier and needs no client date and normalizes invoice/batch', () => {
    const parsed = purchaseSchema.parse(purchaseDraft());
    assert.equal(parsed.invoice_number, 'INV-1');
    assert.equal(parsed.supplier_id, '');
    assert.equal('document_date' in parsed, false);
    assert.equal(parsed.lines[0].batch_number, 'B1');
});

test('purchase validation rejects missing and malformed inputs before mutation', () => {
    for (const patch of [{invoice_number: ' '}, {supplier_id: 'bad-id'}, {lines: []}]) {
        assert.equal(purchaseSchema.safeParse({...purchaseDraft(), ...patch}).success, false);
    }
    for (const patch of [{item_id: ''}, {quantity: '0'}, {quantity: '1.5'}, {quantity: '2147483648'},
        {unit_price: ''}, {unit_price: '-1'}, {unit_price: '1.234'}, {unit_price: 'Infinity'},
        {unit_price: '10000000000.00'}, {expiry_date: '2027-02-30'}]) {
        const draft = purchaseDraft();
        draft.lines[0] = {...draft.lines[0], ...patch};
        assert.equal(purchaseSchema.safeParse(draft).success, false, JSON.stringify(patch));
    }
});


test('purchase RPC excludes client audit timestamps even if supplied at runtime', async () => {
    const apiModule = {};
    let sent;
    vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/purchases/purchase.api.ts', 'utf8'), {
        compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
    }).outputText, {exports: apiModule, require: name => {
        assert.equal(name, '../../lib/supabase');
        return {supabase: {rpc: async (name, payload) => {sent = {name, payload}; return {data: 'purchase-id', error: null};}}};
    }});
    assert.equal(await apiModule.createPurchaseAsync({purchase: {invoice_number: 'INV-1',
        supplier_id: null, purchase_notes: null, added_on: '2000-01-01T00:00:00Z'}, lines: []}), 'purchase-id');
    assert.equal(sent.name, 'create_purchase');
    assert.equal('p_added_on' in sent.payload, false);
    assert.equal('added_on' in sent.payload, false);
    assert.deepEqual(Object.keys(sent.payload).sort(), ['p_invoice_number', 'p_items_json', 'p_purchase_notes', 'p_supplier_id']);
});
