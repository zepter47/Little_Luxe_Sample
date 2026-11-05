import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require = createRequire(import.meta.url);
function load(filename) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX},
  }).outputText, {exports, require: name => name.startsWith('.')
    ? load(path.resolve(path.dirname(filename), name) + '.ts') : require(name)});
  return exports;
}
const {discountedPrice, formatUGX} = load('src/features/items/item.pricing.ts');
test('UGX prices round half up once per unit and accept no-discount and free items', () => {
  for (const [price, discount, expected] of [[10000,0,10000],[10000,20,8000],[10000,100,0],[999,15,849],[999,50,500],[1,50,1],[1,51,0],[0,100,0]])
    assert.equal(discountedPrice(price, discount), expected);
  assert.equal(discountedPrice(Number.MAX_SAFE_INTEGER, 0), Number.MAX_SAFE_INTEGER);
  for (const d of [-1,101,1.5,NaN,Infinity]) assert.throws(() => discountedPrice(10000,d));
  for (const p of [-1,1.5,NaN,Infinity]) assert.throws(() => discountedPrice(p,20));
  assert.match(formatUGX(8000), /UGX 8,000/);
});
test('discount display hides at zero and shows original and final prices for free items', () => {
  const ItemPrice = load('src/features/items/components/ItemPrice.tsx').default;
  const html = discount => renderToStaticMarkup(React.createElement(ItemPrice, {price:10000,discount}));
  assert.doesNotMatch(html(0), /OFF|<s /);
  assert.match(html(20), /20% OFF/);
  assert.match(html(20), /UGX 8,000/);
  assert.match(html(100), /100% OFF/);
  assert.match(html(100), /UGX 0/);
});
test('order validation rejects fractional percentages and money while preserving pricing snapshots', () => {
  const {orderItemsSchema} = load('src/features/orders/order.schema.ts');
  const line = {item_id:'11111111-1111-4111-8111-111111111111',quantity:1,sale_price:0,original_sale_price:999,order_discount:100};
  assert.equal(orderItemsSchema.parse([line])[0].order_discount,100);
  for (const patch of [{order_discount:1.5},{order_discount:101},{order_discount:-1},{sale_price:1.5}])
    assert.equal(orderItemsSchema.safeParse([{...line,...patch}]).success,false);
});
