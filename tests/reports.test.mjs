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
test('cost snapshots remain usable after the stock link is deleted', () => {
    const saved = {...line, stock_reservation: [{quantity_reserved: 3, reservation_status: 'fulfilled', unit_cost_price: 60, stock: null}]};
    assert.equal(model.lineAmounts(saved).cost, 180);
    assert.equal(model.lineAmounts(saved).profit, 120);
});
test('daily, weekly and monthly APIs each request their own date boundaries', async () => {
    const api = {};
    const calls = [];
    const query = {
        select() {return this;}, eq() {return this;}, order() {return this;},
        gte(_, value) {calls.push(['start',value]);return this;},
        lt(_, value) {calls.push(['end',value]);return this;},
        async range() {return {data:[],error:null};},
    };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/reports/report.api.ts','utf8'), {
        compilerOptions: {module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
    }).outputText,{exports:api,require:name=> {
        if(name==='./report.model') return model;
        if(name==='../../lib/supabase') return {supabase:{from:()=>query}};
        throw new Error(name);
    }});
    for(const [fn,period] of [['getDailySalesReport','daily'],['getWeeklySalesReport','weekly'],['getMonthlySalesReport','monthly']]) {
        calls.length=0;
        await api[fn]('2026-11-11');
        const range=model.reportRange('2026-11-11',period);
        assert.deepEqual(calls,[['start',range.start],['end',range.end]]);
    }
});
