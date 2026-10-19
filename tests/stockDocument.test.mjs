import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import ts from 'typescript';

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
