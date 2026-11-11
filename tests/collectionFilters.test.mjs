import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(file) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
  }).outputText, {exports, require: () => load('src/features/items/item.pricing.ts')});
  return exports;
}
const {filterCollection, priceRangeError, emptyCollectionFilters: empty} = load('src/features/items/item.filters.ts');
const items = [
  {item_name:'Floral Dress', item_category_id:'clothes', sale_price:10000, item_discount:20},
  {item_name:'Tiny Dress', item_category_id:'clothes', sale_price:999, item_discount:50},
  {item_name:'Gift', item_category_id:null, sale_price:1000, item_discount:100},
  {item_name:'Vase', item_category_id:'home', sale_price:8000, item_discount:0},
];
test('name search is trimmed, case insensitive and treats symbols literally', () => {
  assert.equal(filterCollection(items, ' DRESS ', empty).length, 2);
  assert.equal(filterCollection(items, '%', empty).length, 0);
  assert.equal(filterCollection(items, '', empty).length, 4);
});
test('criteria intersect and price uses inclusive rounded discounted UGX amounts', () => {
  assert.equal(filterCollection(items, 'dress', {...empty, categoryId:'clothes', minPrice:'500', maxPrice:'8000', discountedOnly:true}).length, 2);
  assert.equal(filterCollection(items, '', {...empty, minPrice:'0', maxPrice:'0', discountedOnly:true})[0].item_name, 'Gift');
  assert.equal(filterCollection(items, '', {...empty, categoryId:'home', discountedOnly:true}).length, 0);
  assert.equal(filterCollection(items, '', {...empty, maxPrice:'499'}).length, 1);
});
test('price validation accepts open bounds and zero, rejects invalid and reversed ranges', () => {
  for (const range of [empty, {...empty,minPrice:'0'}, {...empty,minPrice:'500',maxPrice:'500'}]) assert.equal(priceRangeError(range), null);
  for (const range of [{minPrice:'-1'}, {maxPrice:'1.5'}, {minPrice:'Infinity'}, {maxPrice:'NaN'}, {minPrice:'10',maxPrice:'9'}])
    assert.ok(priceRangeError({...empty,...range}));
});
