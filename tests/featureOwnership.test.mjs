import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('src/features');
function files(directory) {
    return fs.readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
        const filename = path.join(directory, entry.name);
        return entry.isDirectory() ? files(filename) : /\.tsx?$/.test(filename) ? [filename] : [];
    });
}

test('features own their UI and do not import admin components or another feature UI', () => {
    for (const filename of files(root)) {
        const feature = path.relative(root, filename).split(path.sep)[0];
        if (!['admin', 'Categories', 'units', 'items', 'suppliers', 'customers', 'stock', 'purchases', 'orders', 'returns'].includes(feature)) continue;
        for (const match of fs.readFileSync(filename, 'utf8').matchAll(/from\s+['"]([^'"]+)['"]/g)) {
            if (!match[1].startsWith('.')) continue;
            const target = path.resolve(path.dirname(filename), match[1]);
            const relative = path.relative(root, target);
            const dependency = relative.split(path.sep)[0];
            // Stock is explicitly allowed to select each child screen for navigation.
            if (feature === 'stock' && filename.endsWith('StockManagement.tsx')) continue;
            if (dependency !== feature && !relative.startsWith('..')) {
                assert.ok(!/[/\\](?:components|Components)[/\\]/.test(relative), `${filename} imports another feature's UI: ${match[1]}`);
            }
            assert.ok(!/components[/\\]forms[/\\]/.test(relative), `${filename} must own its form UI`);
        }
    }
});

test('stock and admin parents contain navigation, without database or query orchestration', () => {
    for (const filename of ['src/features/stock/StockManagement.tsx', 'src/routes/admin.tsx']) {
        assert.doesNotMatch(fs.readFileSync(filename, 'utf8'), /useQuery|useMutation|supabase|\.api['"]|\.query['"]/);
    }
    assert.deepEqual(fs.readdirSync('src/features/stock').sort(), ['README.md', 'Stock.styles.ts', 'StockManagement.tsx', 'StockNavigation.tsx']);
});
