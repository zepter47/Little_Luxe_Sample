// Run against npm run dev. All API calls are intercepted; no backend data changes.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try {
  for (const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
   const page = await browser.newPage({viewport});
   const errors = [];
   page.on('pageerror', e => errors.push(e.message));
   let requests = 0;
   const items = Array.from({length:18}, (_,i) => ({item_id:`item-${i}`, item_name:i===0?'Floral Dress':i===1?'Tiny Dress':`Vase ${i}`, sale_price:i===1?1000:10000, item_discount:i<2?20:0, item_category_id:i<2?'clothes':'home', image_path:null, product_notes:'Lovely things.', is_active:true,is_stocked:true}));
   await page.route('**/*.supabase.co/**', route => {
    const url = route.request().url();
    let data = [];
    if (url.includes('get_storefront_items')) {requests++;data=items;}
    else if(url.includes('item_category')) data=[{item_category_id:'clothes',category_name:'Clothing',category_notes:null},{item_category_id:'home',category_name:'Homewares',category_notes:null}];
    return route.fulfill({json:data});
   });
   await page.goto(process.env.COLLECTION_TEST_URL || 'http://127.0.0.1:5173/');
   const search = page.getByRole('textbox',{name:'Search items by name',exact:true});
   await page.getByRole('heading',{name:'Floral Dress',exact:true}).waitFor();
   const initialRequests = requests;
   await search.fill('dress');
   assert.equal(await page.locator('h3').count(),18);
   assert.equal(requests,initialRequests);
   await search.press('Enter');
   await page.waitForFunction(()=>document.querySelectorAll('h3').length===2);
   const fab = page.getByRole('button',{name:'Open collection filters'});
   await fab.click();
   await page.getByRole('combobox',{name:'Category',exact:true}).click();
   await page.getByRole('option',{name:'Clothing',exact:true}).click();
   await page.getByRole('spinbutton',{name:'Minimum price',exact:true}).fill('8000');
   await page.getByRole('spinbutton',{name:'Maximum price',exact:true}).fill('8000');
   await page.getByRole('switch',{name:'Discounted items only'}).check();
   assert.equal(await page.locator('h3').count(),2);
   await page.getByRole('button',{name:'Apply filters',exact:true}).click();
   await page.waitForFunction(()=>document.querySelectorAll('h3').length===1);
   await page.getByRole('heading',{name:'Floral Dress',exact:true}).waitFor();
   await fab.click();
   await page.getByRole('button',{name:'Reset',exact:true}).click();
   assert.equal(await page.locator('h3').count(),1);
   await page.getByRole('button',{name:'Cancel',exact:true}).click();
   await fab.click();
   assert.equal(await page.getByRole('spinbutton',{name:'Minimum price',exact:true}).inputValue(),'8000');
   await page.getByRole('spinbutton',{name:'Maximum price',exact:true}).fill('7000');
   await page.getByRole('button',{name:'Apply filters',exact:true}).click();
   await page.getByText('Maximum price must be at least the minimum price.',{exact:true}).waitFor();
   await page.getByRole('button',{name:'Reset',exact:true}).click();
   await page.getByRole('button',{name:'Apply filters',exact:true}).click();
   await page.waitForFunction(()=>document.querySelectorAll('h3').length===2);
   await page.getByRole('button',{name:'Clear search text',exact:true}).click();
   assert.equal(await page.locator('h3').count(),2);
   await page.getByRole('button',{name:'Search items',exact:true}).click();
   await page.waitForFunction(()=>document.querySelectorAll('h3').length===18);
   const before = await fab.boundingBox();
   const searchBefore = await search.boundingBox();
   await page.evaluate(()=>window.scrollTo(0,1000));
   const after = await fab.boundingBox();
   assert.equal(after.y,before.y);
   assert.equal((await search.boundingBox()).y,searchBefore.y);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await search.fill('nothing matches');
   await search.press('Enter');
   await page.getByText('No little luxuries found.',{exact:true}).waitFor();
   assert.equal(requests,initialRequests);
   assert.deepEqual(errors,[]);
   await page.screenshot({path:`work/collection-${viewport.width}.png`,fullPage:false});
   console.log(`Passed ${viewport.width}px: explicit submission, combined filters, discounted price, validation, cancel/reset, fixed scroll positions, no extra requests`);
   await page.close();
  }
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
