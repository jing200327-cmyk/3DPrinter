const {chromium}=require('C:/Users/MECHREVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const base=process.env.PRINTER_PAGE_URL||'http://127.0.0.1:8765/dayinji/'+encodeURIComponent('自研款打印机打印页面原型')+'/index.html';
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true,args:['--host-resolver-rules=MAP jing200327-cmyk.github.io 185.199.109.153']});try{const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});const errors=[];p.on('pageerror',e=>errors.push(e.message));
for(const role of ['parent','base','child']){await p.goto(base+'?addPrinterAccount='+role+'&screen=add-printer');assert(await p.locator('#my-printers-list').isVisible());assert.equal(await p.locator('#other-printers-list').isVisible(),role!=='child');assert.equal(await p.locator('#configure-new-printer').isVisible(),role!=='child');assert.equal(await p.locator('#open-share-printer').isVisible(),role==='parent');}
await p.locator('#my-printers-list .printer-card').nth(1).click();assert.equal(await p.locator('#my-printers-list .printer-card').nth(1).getAttribute('aria-pressed'),'true');
await p.reload();assert(await p.locator('#other-printers-list').isHidden());
await p.addStyleTag({content:'#simulation-console{display:none!important}'});if(process.env.CHILD_PRINTER_SHOT)await p.screenshot({path:process.env.CHILD_PRINTER_SHOT});
await p.locator('#add-printer-back').click();assert(await p.locator('#add-printer-screen').isHidden());assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,errors,base}));
}finally{await b.close()}})();
