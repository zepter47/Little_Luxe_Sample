import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function saverClass() {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/drafts/draftAutosaver.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, structuredClone, setTimeout,
    clearTimeout });
  return exports.DraftAutosaver;
}

const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

// The VM uses the mocked global timers; no real sleeps are needed.
test('typing saves one detached latest snapshot after a 500ms pause', async t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  const Saver = saverClass(), writes = [];
  const saver = new Saver(async value => { writes.push(value); }, assert.fail);
  const input = {notes: 'A', lines: [{quantity: '1'}]};
  saver.changed(input);
  t.mock.timers.tick(300);
  input.notes = 'AB';
  saver.changed(input);
  input.lines[0].quantity = '99';
  t.mock.timers.tick(499);
  await settle();
  assert.equal(writes.length, 0);
  t.mock.timers.tick(1);
  await settle();
  assert.equal(writes.length, 1);
  assert.equal(writes[0].notes, 'AB');
  assert.equal(writes[0].lines[0].quantity, '1');
  await saver.stop();
});

test('continuous edits still save at the maximum wait', async t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  const Saver = saverClass(), writes = [];
  const saver = new Saver(async value => {writes.push(value);}, assert.fail);
  for (let i = 0; i < 8; i++) {
    saver.changed(i);
    t.mock.timers.tick(400);
    await settle();
  }
  assert.deepEqual(writes, [7]);
  await saver.stop();
});

test('queued writes stay ordered and a failed older write cannot resurrect old input', async t => {
  const Saver = saverClass(), writes = [], errors = [];
  let rejectFirst;
  const saver = new Saver(async value => {
    writes.push(value);
    if (value === 'old') await new Promise((_, reject) => {rejectFirst = reject;});
  }, error => errors.push(error));
  saver.changed('old');
  const first = saver.flush();
  await settle();
  saver.changed('new');
  const second = saver.flush();
  rejectFirst(new Error('Temporary failure'));
  await assert.rejects(first, /Temporary failure/);
  await second;
  await saver.flush();
  assert.deepEqual(writes, ['old', 'new']);
  assert.equal(errors.length, 1);
  await saver.stop();
});

test('failed latest save can be retried and stop cancels pending timers', async t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  const Saver = saverClass(), writes = [];
  let failed = false;
  const saver = new Saver(async value => {
    if (!failed) {failed = true; throw new Error('Quota');}
    writes.push(value);
  }, () => {});
  saver.changed('recoverable');
  await assert.rejects(saver.flush(), /Quota/);
  await saver.flush();
  assert.deepEqual(writes, ['recoverable']);
  saver.changed('discarded');
  await saver.stop();
  saver.changed('ignored');
  t.mock.timers.tick(5000);
  await settle();
  assert.deepEqual(writes, ['recoverable']);
});
