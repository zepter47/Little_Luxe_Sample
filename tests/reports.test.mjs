import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const model = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/reports/report.model.ts', 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
}).outputText, {exports: model, Intl, Date});
test('Uganda daily, Monday weekly, and leap-month boundaries are exclusive', () => {
    assert.equal(model.reportRange('2026-11-09', 'weekly').start, '2026-11-08T21:00:00.000Z');
    assert.equal(model.reportRange('2026-11-15', 'weekly').end, '2026-11-15T21:00:00.000Z');
    assert.equal(model.reportRange('2024-02-29', 'monthly').start, '2024-01-31T21:00:00.000Z');
    assert.equal(model.reportRange('2024-02-29', 'monthly').end, '2024-02-29T21:00:00.000Z');
    assert.equal(model.reportRange('2026-12-31', 'daily').end, '2026-12-31T21:00:00.000Z');
});
const line = {quantity_sold: 3, sale_price: 100, stock_reservation: [
    {quantity_reserved: 1, reservation_status: 'fulfilled', stock: {cost_price: 40}},
    {quantity_reserved: 2, reservation_status: 'fulfilled', stock: {cost_price: 70}},
]};
test('profit uses quantities and all fulfilled batches, including losses', () => {
    assert.equal(model.lineAmounts(line).cost, 180);
    assert.equal(model.lineAmounts(line).profit, 120);
    assert.equal(model.lineAmounts({...line, sale_price: 50}).profit, -30);
});
test('missing allocations never become zero cost or inflated profit', () => {
    const missing = {...line, stock_reservation: []};
    assert.equal(model.lineAmounts(missing).profit, null);
    assert.equal(model.reportTotals([{lines: [line]}, {lines: [missing]}]).profit, null);
    assert.equal(model.reportTotals([]).profit, 0);
});
