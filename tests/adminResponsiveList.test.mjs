import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function loader(compact) {
    const cache = new Map();
    function load(filename) {
        filename = path.resolve(filename);
        if (cache.has(filename)) return cache.get(filename);
        const exports = {};
        cache.set(filename, exports);
        const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
            compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX},
        }).outputText;
        vm.runInNewContext(source, {exports, require: name => {
            if (name === '@mui/material') return {...require(name), useMediaQuery: () => compact};
            if (name === '@mui/x-data-grid') return {DataGrid: props => React.createElement('div', {'data-testid': 'desktop-grid', 'data-count': props.rows.length})};
            if (name.startsWith('.')) {
                const base = path.resolve(path.dirname(filename), name);
                const target = ['.ts', '.tsx'].map(ext => base + ext).find(candidate => fs.existsSync(candidate));
                return load(target);
            }
            return require(name);
        }});
        return exports;
    }
    return load;
}
const root = new URL('../', import.meta.url).pathname;
const utils = loader(false)(path.join(root, 'src/features/admin/components/adminList.utils.ts'));
test('shared search and numeric sorting preserve the source dataset', () => {
    const rows = [{name:'Silk', price:100}, {name:'Cotton', price:20}, {name:'Silk scarf', price:9}];
    const result = utils.prepareAdminRows(rows, ' SILK ', row => row.name, 'price', 'asc', (row, field) => row[field]);
    assert.deepEqual(Array.from(result, row => row.price), [9, 100]);
    assert.deepEqual(rows.map(row => row.price), [100, 20, 9]);
    assert.equal(utils.clampAdminPage(4, 10, 12), 1);
    assert.equal(utils.clampAdminPage(4, 10, 0), 0);
});
const props = {
    items: Array.from({length: 12}, (_, index) => ({item_id: `id-${index}`, item_name:`Item ${index}`, sale_price: 25,
        quantity_on_hand: index === 0 ? 8 : 0, is_active: index !== 1, item_category_id:'category', uom_id:'unit', image_path:'https://example.test/product.jpg'})),
    categories:[{item_category_id:'category', category_name:'Accessories'}],
    units:[{uom_id:'unit', uom_name:'Piece'}], onEdit: () => {},
};
test('compact items mount only paginated image-free cards with resolved labels and edit actions', () => {
    const Component = loader(true)(path.join(root, 'src/features/admin/components/AdminItemList.tsx')).default;
    const html = renderToStaticMarkup(React.createElement(Component, props));
    assert.equal((html.match(/<article /g) || []).length, 10);
    assert.doesNotMatch(html, /desktop-grid|<img|example\.test/);
    assert.match(html, /Accessories/);
    assert.match(html, /Piece/);
    assert.match(html, /aria-label="Edit Item 0"/);
    assert.match(html, /25\.00/);
    assert.match(html, /Quantity on hand: 8/);
    assert.match(html, /Quantity on hand: 0/);
    assert.match(html, /Inactive/);
});
test('wide items mount only the grid', () => {
    const Component = loader(false)(path.join(root, 'src/features/admin/components/AdminItemList.tsx')).default;
    const html = renderToStaticMarkup(React.createElement(Component, props));
    assert.match(html, /desktop-grid/);
    assert.doesNotMatch(html, /<article |Items cards/);
});
test('compact lists explain empty datasets', () => {
    const Component = loader(true)(path.join(root, 'src/features/admin/components/AdminItemList.tsx')).default;
    const html = renderToStaticMarkup(React.createElement(Component, {...props, items:[]}));
    assert.match(html, /No items yet\./);
    assert.doesNotMatch(html, /desktop-grid|<article /);
});
