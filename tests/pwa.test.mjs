import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, structuredClone, setTimeout, clearTimeout });
  return exports;
}

test('only a valid higher minimum release requires an update', () => {
  const { requiresUpdate } = load('src/pwa/version.ts');
  assert.equal(requiresUpdate({ minimumSupportedVersion: 2 }, 1), true);
  for (const policy of [null, {}, { minimumSupportedVersion: 1 }, { minimumSupportedVersion: 0 },
    { minimumSupportedVersion: '2' }, { minimumSupportedVersion: 1.5 }, { minimumSupportedVersion: Infinity }]) {
    assert.equal(requiresUpdate(policy, 1), false);
  }
});

test('update flush waits for pending draft writes and propagates storage failures', async () => {
  const { DraftAutosaver, flushDrafts } = load('src/services/drafts/draftAutosaver.ts');
  let release;
  const writes = [];
  const saver = new DraftAutosaver(value => new Promise(resolve => {
    writes.push(value); release = resolve;
  }), () => {});
  saver.changed({ notes: 'latest edit' });
  let finished = false;
  const flushing = flushDrafts().then(() => { finished = true; });
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(finished, false);
  assert.equal(writes[0].notes, 'latest edit');
  release();
  await flushing;
  await saver.stop();
  const failing = new DraftAutosaver(async () => { throw new Error('storage full'); }, () => {});
  failing.changed({ notes: 'preserve me' });
  await assert.rejects(flushDrafts(), /storage full/);
  await failing.stop();
  await flushDrafts();
});
