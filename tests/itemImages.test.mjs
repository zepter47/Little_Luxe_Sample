import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(fs.readFileSync(new URL('../src/services/itemImages.ts', import.meta.url), 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
}).outputText;

function service({uploadError, insertError, updateError, cleanupError, oldPath = null} = {}) {
    const calls = [];
    const storage = {
        upload: async (path, file, options) => {
            calls.push(['upload', path, file.name, options]);
            return {data: {path}, error: file.name === 'bad.png' ? uploadError : null};
        },
        remove: async paths => {calls.push(['remove', ...paths]); return {error: cleanupError};},
        getPublicUrl: path => ({data: {publicUrl: `https://example.test/Fashion/${path}`}}),
    };
    const client = {
        storage: {from: bucket => {assert.equal(bucket, 'Fashion'); return storage;}},
        from: table => ({
            select: () => ({eq: () => ({single: async () => ({data: {image_path: oldPath}, error: null})})}),
            update: values => ({eq: (_, id) => ({select: () => ({single: async () => {
                calls.push(['update', id, values.image_path]); return {data: {item_id: id}, error: updateError};
            }})})}),
            insert: async row => {calls.push(['insert', table, row]); return {error: row.storage_path.endsWith('id-2.png') ? insertError : null};},
        }),
    };
    let id = 0;
    const exports = {};
    vm.runInNewContext(source, {exports, require: () => ({supabase: client}), crypto: {randomUUID: () => `id-${++id}`}});
    return {api: exports, calls};
}
const file = (name = 'good.png', size = 100, type = 'image/png') => ({name, size, type});

test('accepts 6 MB and rejects larger, empty and unsupported files', () => {
    const {api} = service();
    api.validateItemImage(file('limit.png', 6 * 1024 * 1024));
    for (const invalid of [file('large.png', 6 * 1024 * 1024 + 1), file('empty.png', 0), file('bad.svg', 10, 'image/svg+xml')]) {
        assert.throws(() => api.validateItemImage(invalid), /6 MB/);
    }
});

test('profile replacement updates the item before removing the old image', async () => {
    const {api, calls} = service({oldPath: 'profile_picture/old.jpg'});
    const result = await api.uploadItemProfileImage({itemId: 'item-1', file: file()});
    assert.equal(result.path, 'profile_picture/id-1.png');
    assert.deepEqual(calls.map(c => c[0]), ['upload', 'update', 'remove']);
    assert.equal(calls[1][1], 'item-1');
    assert.equal(calls[2][1], 'profile_picture/old.jpg');
});

test('a failed profile update cleans up the new file and preserves the old one', async () => {
    const {api, calls} = service({oldPath: 'profile_picture/old.jpg', updateError: {message: 'update denied'}});
    await assert.rejects(api.uploadItemProfileImage({itemId: 'item-1', file: file()}), /update denied/);
    assert.equal(calls.at(-1)[1], 'profile_picture/id-1.png');
});

test('old-file cleanup failure reports a warning after a successful replacement', async () => {
    const {api} = service({oldPath: 'profile_picture/old.jpg', cleanupError: {message: 'delete denied'}});
    const result = await api.uploadItemProfileImage({itemId: 'item-1', file: file()});
    assert.match(result.warning, /old file could not be removed/);
});

test('gallery partial failure returns only failed files for retry and removes unlinked objects', async () => {
    const {api, calls} = service({insertError: {message: 'insert denied'}});
    const good = file('first.png'), bad = file('second.png');
    const result = await api.uploadItemGalleryImages({itemId: 'item-1', files: [good, bad]});
    assert.equal(result.uploaded.length, 1);
    assert.equal(result.failed.length, 1);
    assert.equal(result.failed[0].file, bad);
    assert.equal(calls.at(-1)[1], 'item_images/id-2.png');
    const inserted = calls.find(c => c[0] === 'insert')[2];
    assert.equal(inserted.item_id, 'item-1');
    assert.equal(inserted.image_id, 'id-1');
    assert.equal(inserted.storage_path, 'item_images/id-1.png');
});

test('an upload failure never writes an image record', async () => {
    const {api, calls} = service({uploadError: {message: 'upload denied'}});
    const result = await api.uploadItemGalleryImages({itemId: 'item-1', files: [file('bad.png')]});
    assert.equal(result.failed.length, 1);
    assert.deepEqual(calls.map(c => c[0]), ['upload']);
});

test('cleanup failure includes the orphan path for recovery', async () => {
    const {api} = service({updateError: {message: 'update denied'}, cleanupError: {message: 'delete denied'}});
    await assert.rejects(api.uploadItemProfileImage({itemId: 'item-1', file: file()}), /profile_picture\/id-1.png/);
});

test('public URLs support relative paths and preserve legacy images', () => {
    const {api} = service();
    assert.equal(api.getItemImageUrl('profile_picture/image.png'), 'https://example.test/Fashion/profile_picture/image.png');
    assert.equal(api.getItemImageUrl('https://legacy.test/image.png'), 'https://legacy.test/image.png');
    assert.equal(api.getItemImageUrl('data:image/png;base64,abc'), 'data:image/png;base64,abc');
    assert.equal(api.getItemImageUrl(null), '');
});
