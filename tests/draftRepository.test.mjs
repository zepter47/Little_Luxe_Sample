import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {createRequire} from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function load(filename) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
  }).outputText, {exports, structuredClone, File, require: name => name.startsWith('.')
    ? load(path.resolve(path.dirname(filename), name) + '.ts') : require(name)});
  return exports;
}
const {createDraftRepository} = load('src/services/drafts/draftRepository.ts');
const {purchaseDraftSchema} = load('src/features/purchases/purchase.draft.schema.ts');
const {staffOrderDraftSchema} = load('src/features/orders/staffOrder.draft.schema.ts');
const {itemDraftSchema} = load('src/features/items/item.draft.schema.ts');

function table() {
  const records = new Map();
  return {
    name: crypto.randomUUID(), db: {name: 'test'}, records,
    get: async userId => structuredClone(records.get(userId)),
    put: async value => { records.set(value.userId, structuredClone(value)); },
    delete: async userId => { records.delete(userId); },
  };
}
const record = () => ({userId: 'alice', formatVersion: 1, updatedAt: 1, status: 'editing', extra: undefined,
  values: {invoice_number: '', supplier_id: '', purchase_notes: 'incomplete', lines: [{lineId: 'a', item_id: '', quantity: '', unit_price: '', batch_number: '', expiry_date: ''}]}});

test('draft schema accepts unfinished lines and owner keys isolate reads and deletion', async () => {
  const storage = table();
  const repo = createDraftRepository(storage, value => purchaseDraftSchema.parse(value));
  await repo.save(record());
  await repo.save({...record(), userId: 'bob'});
  assert.equal((await repo.load('alice')).values.lines[0].quantity, '');
  assert.equal(await repo.load('charlie'), undefined);
  await repo.remove('alice');
  assert.equal(await repo.load('alice'), undefined);
  assert.equal((await repo.load('bob')).userId, 'bob');
});

test('load waits for an earlier write and a failed write does not poison later operations', async () => {
  const storage = table();
  let release;
  storage.put = async value => {
    await new Promise(resolve => {release = resolve;});
    storage.records.set(value.userId, value);
  };
  const repo = createDraftRepository(storage, value => purchaseDraftSchema.parse(value));
  const save = repo.save(record());
  await Promise.resolve(); await Promise.resolve();
  const read = repo.load('alice');
  release();
  await save;
  assert.equal((await read).userId, 'alice');
  storage.put = async () => {throw new Error('quota');};
  await assert.rejects(repo.save(record()), /quota/);
  await repo.remove('alice');
  assert.equal(await repo.load('alice'), undefined);
});

test('completed drafts are never restored and malformed or mismatched records are not silently overwritten', async () => {
  const storage = table();
  const repo = createDraftRepository(storage, value => purchaseDraftSchema.parse(value));
  await repo.save({...record(), status: 'completed'});
  assert.equal(await repo.load('alice'), undefined);
  storage.records.set('alice', {...record(), formatVersion: 99});
  await assert.rejects(repo.load('alice'));
  assert.equal(storage.records.get('alice').formatVersion, 99);
  storage.records.set('alice', {...record(), userId: 'bob'});
  await assert.rejects(repo.load('alice'), /owner/);
});

test('structured draft values preserve File attachments, NaN and staff retry metadata', () => {
  const item = itemDraftSchema.parse({...record(), values: {
    is_active: true, item_name: '', sale_price: NaN, item_category_id: '', product_notes: '', uom_id: '',
  }, extra: {savedId: 'already-created', profile: new File(['image'], 'profile.png', {type: 'image/png'}),
    profilePath: '', gallery: [], warning: ''}});
  const copy = structuredClone(item);
  assert.equal(Number.isNaN(copy.values.sale_price), true);
  assert.equal(copy.extra.profile.name, 'profile.png');
  assert.equal(copy.extra.savedId, 'already-created');
  const order = staffOrderDraftSchema.parse({...record(), values: {
    customer_id: '', notes: '', items: [{item_id: '', quantity: NaN, sale_price: 0}],
  }, extra: {payload: 'same-confirmed-payload', id: 'stable-request'}});
  assert.equal(Number.isNaN(order.values.items[0].quantity), true);
  assert.equal(order.extra.id, 'stable-request');
});
