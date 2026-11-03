const {chromium}=require('C:/Users/MECHREVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const base=process.env.PRINTER_BASE_URL||'http://127.0.0.1:8765/dayinji/'+encodeURIComponent('自研款打印机打印页面原型')+'/';
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true,args:['--host-resolver-rules=MAP jing200327-cmyk.github.io 185.199.109.153']});try{const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2}),errors=[];p.on('pageerror',e=>errors.push(e.message));
for(const file of ['index.html','index-offline.html']){
 await p.goto(base+file+'?deviceAccount=child');await p.locator('#printer-settings').click();
 for(const id of ['open-firmware-version','open-print-options','open-device-control','open-remove-printer'])assert(await p.locator('#'+id).isHidden(),id);
 const visible=await p.locator('#device-settings-screen button:visible').evaluateAll(es=>es.map(e=>e.id).sort());assert.deepEqual(visible,['device-settings-back','open-device-info','open-timelapse-settings']);
 await p.locator('#open-device-info').click();assert(await p.locator('#device-info-screen').isVisible());assert.equal(await p.locator('#device-account-badge').textContent(),'已授权');await p.locator('#device-info-back').click();
 await p.locator('#open-timelapse-settings').click();if(file==='index.html'){assert(await p.locator('#timelapse-screen').isVisible());await p.locator('#timelapse-screen-back').click();}else{assert.equal(await p.locator('#toast').textContent(),'当前打印机离线');}
 await p.locator('#device-settings-back').click();assert(await p.locator('#device-settings-screen').isHidden());
}
for(const account of ['parent','base']){await p.goto(base+'index.html?addPrinterAccount='+account);await p.locator('#printer-settings').click();for(const id of ['open-device-info','open-firmware-version','open-print-options','open-device-control','open-timelapse-settings','open-remove-printer'])assert(await p.locator('#'+id).isVisible());}
await p.goto(base+'index.html?addPrinterAccount=child');await p.locator('#printer-settings').click();assert(await p.locator('#open-firmware-version').isHidden());
for(const width of [320,390,768]){await p.setViewportSize({width,height:844});const a=await p.locator('#open-device-info').boundingBox(),c=await p.locator('#open-timelapse-settings').boundingBox();assert(a.y+a.height<c.y);}
await p.setViewportSize({width:390,height:844});await p.addStyleTag({content:'#simulation-console{display:none!important}'});if(process.env.CHILD_SETTINGS_SHOT)await p.screenshot({path:process.env.CHILD_SETTINGS_SHOT});assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,errors,base}));
}finally{await b.close()}})();
