const {chromium}=require('C:/Users/MECHREVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const base=process.env.PRINTER_PAGE_URL||'http://127.0.0.1:8765/dayinji/'+encodeURIComponent('自研款打印机打印页面原型')+'/index.html';
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true,args:['--host-resolver-rules=MAP jing200327-cmyk.github.io 185.199.109.153']});try{const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});const errors=[];p.on('pageerror',e=>errors.push(e.message));
for(const role of ['parent','base','child']){await p.goto(base+'?addPrinterAccount='+role+'&screen=add-printer');assert(await p.locator('#my-printers-list').isVisible());assert.equal(await p.locator('#other-printers-list').isVisible(),role!=='child');assert.equal(await p.locator('#configure-new-printer').isVisible(),role!=='child');assert.equal(await p.locator('#open-share-printer').isVisible(),role==='parent');}
const cards = p.locator('#my-printers-list .printer-card');
assert.equal(await cards.first().locator('.printer-name').textContent(), 'Ugee Funbox(1)');
await cards.nth(1).click();
await p.locator('#add-printer-screen').waitFor({state:'hidden'});
assert.equal(await p.locator('#workbench-printer-name').textContent(), 'Ugee Funbox');
await p.reload();
await p.locator('#printer-switch').click();
assert.equal(await cards.first().getAttribute('aria-pressed'), 'true');
assert.equal(await cards.first().locator('.printer-name').textContent(), 'Ugee Funbox');
assert(await p.locator('#other-printers-list').isHidden());
await p.addStyleTag({content:'#simulation-console{display:none!important}'});if(process.env.CHILD_PRINTER_SHOT)await p.screenshot({path:process.env.CHILD_PRINTER_SHOT});
await p.locator('#add-printer-back').click();assert(await p.locator('#add-printer-screen').isHidden());
await p.goto(base + '?screen=add-printer&addPrinterAccount=parent');
for (const [id, nearbyName, boundName] of [
  ['printer-ug01', 'UG-01', 'UG-01'],
  ['printer-ug02', 'UG-02', 'UG-02'],
  ['printer-nearby-funbox', 'ugee Funbox', 'ugee Funbox(2)']
]) {
  await p.locator('#' + id).click();
  assert.equal(await p.locator('#printer-bind-target').textContent(), nearbyName);
  await p.locator('#printer-bind-confirm').click();
  await p.locator('#add-printer-screen').waitFor({state:'hidden'});
  assert.equal(await p.locator('#workbench-printer-name').textContent(), boundName);
  await p.locator('#printer-switch').click();
  assert.equal(await cards.first().locator('.printer-name').textContent(), boundName);
  assert.equal(await cards.first().getAttribute('aria-pressed'), 'true');
  assert(await p.locator('#' + id).isHidden());
}
await p.goto(base + '?screen=add-printer&myPrinters=empty');
await p.locator('#printer-nearby-funbox').click();
await p.locator('#printer-bind-confirm').click();
assert.equal(await p.locator('#workbench-printer-name').textContent(), 'ugee Funbox');
assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,errors,base}));
}finally{await b.close()}})();
