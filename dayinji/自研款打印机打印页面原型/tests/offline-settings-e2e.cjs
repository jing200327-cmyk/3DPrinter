const {chromium}=require('C:/Users/MECHREVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');const path=require('node:path');
const shots=process.env.OFFLINE_SETTINGS_SHOTS||require('node:fs').mkdtempSync(path.join(require('node:os').tmpdir(),'offline-settings-'));
const base=process.argv[2]||'http://127.0.0.1:8765/dayinji/'+encodeURIComponent('自研款打印机打印页面原型')+'/';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true,args:['--host-resolver-rules=MAP jing200327-cmyk.github.io 185.199.109.153']});let checks=0;try{
const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(base+'index.html');await page.locator('#printer-settings').click();const online=await page.locator('#device-settings-screen .reuse-stage').innerHTML();
for(const version of ['new','classic']){
await page.goto(base+'index-offline.html?offlineVersion='+version);await page.locator('#printer-settings').click();
assert.equal((await page.locator('#device-settings-screen .reuse-stage').innerHTML()).trim(),online.trim(),'在线离线设置结构一致');checks++;
await page.screenshot({path:path.join(shots,'settings-'+version+'.png')});
for(const id of ['open-firmware-version','open-print-options','open-device-control','open-timelapse-settings']){
await page.locator('#'+id).click();assert.equal(await page.locator('#toast').innerText(),'当前打印机离线');assert(await page.locator('#toast').evaluate(e=>e.classList.contains('is-visible')));assert(await page.locator('#device-settings-screen').isVisible());checks++;
}
await page.screenshot({path:path.join(shots,'toast-'+version+'.png')});
await page.locator('#open-device-info').click();assert(await page.locator('#device-info-screen').isVisible());checks++;
for(const id of ['edit-device-name','open-storage-management']){await page.locator('#'+id).click();assert.equal(await page.locator('#toast').innerText(),'当前打印机离线');assert(await page.locator('#device-info-screen').isVisible());assert.equal(await page.locator('dialog[open]').count(),0);checks++;}
await page.locator('#device-info-back').click();assert(await page.locator('#device-settings-screen').isVisible());
await page.locator('#open-remove-printer').click();assert(await page.locator('#remove-printer-screen').isVisible());await page.locator('#remove-printer-cancel').click();assert(await page.locator('#device-settings-screen').isVisible());checks++;
await page.locator('#open-remove-printer').click();await page.locator('#remove-printer-confirm').click();assert(await page.locator('#logic-demo-screen').isVisible());await page.locator('#logic-demo-back').click();checks++;
await page.locator('#open-device-info').click();await page.keyboard.press('Escape');assert(await page.locator('#device-settings-screen').isVisible());await page.keyboard.press('Escape');assert(await page.locator('#device-settings-screen').isHidden());assert.equal(await page.locator('#device-page').evaluate(e=>e.inert),false);checks++;
}
for(const width of [320,768,1024,1440]){await page.setViewportSize({width,height:900});await page.goto(base+'index-offline.html');await page.locator('#printer-settings').click();for(const id of ['open-device-info','open-device-control','open-remove-printer'])assert(await page.locator('#'+id).isVisible());await page.screenshot({path:path.join(shots,'settings-'+width+'.png')});checks++;}
assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,errors,base}));
}finally{await browser.close()}})();
