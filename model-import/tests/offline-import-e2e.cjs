const {chromium}=require('C:/Users/MECHREVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {spawn}=require('node:child_process'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const server=spawn('D:/opt/anaconda/python.exe',['-m','http.server','8048','--bind','127.0.0.1','--directory',path.resolve(__dirname,'../..')],{stdio:'ignore',windowsHide:true});
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
 const host=process.env.PROTOTYPE_HOST||'http://127.0.0.1:8048';
 if(!process.env.PROTOTYPE_HOST)for(let i=0;i<30;i++){try{await fetch(host);break;}catch{await new Promise(r=>setTimeout(r,100));}}
 const page=await browser.newPage({viewport:{width:430,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.clock.pauseAt(new Date());
 const model=host+'/model-import/prototype_v1.1.html',base=host+'/dayinji/'+encodeURIComponent('自研款打印机打印页面原型')+'/';
 await page.goto(model+'#offline-guide');assert.match(await page.locator('.og-step__title').first().textContent(),/蓝色重置键/);
 const c=await page.locator('.og-key').evaluate(el=>getComputedStyle(el).color);const rgb=c.match(/\d+/g).map(Number);assert(rgb[2]>rgb[0]);
 await page.goto(base+'index-offline.html?connectionAccount=restricted');await page.locator('#open-offline-print').click();assert.match(page.url(),/model-import/);assert.equal(await page.locator('#screen-offline-guide').getAttribute('class'),'screen is-active');
 await page.locator('#btnGuideBack').click();await page.waitForURL('**/index-offline.html*');assert.equal(new URL(page.url()).searchParams.get('connectionAccount'),'restricted');
 await page.goto(base+'index.html?status=ready&phoneNetwork=offline');await page.locator('#phone-network-dismiss').click();assert.equal(await page.locator('#phone-network-banner').isVisible(),true);
 await page.locator('#phone-offline-print').click();await page.locator('#btnGuideBack').click();await page.waitForURL('**/index.html?**');assert.equal(await page.locator('#phone-network-banner').isVisible(),true);
 await page.locator('#phone-offline-print').click();await page.locator('#btnGuideGoPrint').click();assert.equal(await page.locator('#guideConnecting').isVisible(),true);await page.clock.runFor(2200);
 assert.equal(await page.locator('#screen-system-picker').getAttribute('class'),'screen is-active');assert.equal(await page.locator('#btnPickerConfirm').textContent(),'打印');assert.equal(await page.locator('#netBanner').isVisible(),false);
 await page.locator('[data-file$=".stl"]').first().click();assert.equal(await page.locator('#btnPickerConfirm').isDisabled(),true);
 await page.locator('[data-file="batch_plate.gcode"]').click();await page.locator('#btnPickerConfirm').click();await page.clock.runFor(15000);assert.equal(await page.locator('#modalUploadDone').evaluate(el=>el.classList.contains('is-open')),true);
 await page.locator('#btnUploadDoneKnow').click();await page.waitForURL('**/dayinji/**/index.html?**');
 await page.goto(model+'#offline-guide-connect-fail');assert.equal(await page.locator('#guideConnActions').isVisible(),true);await page.locator('#btnGuideConnRetry').click();await page.clock.runFor(2200);assert.equal(await page.locator('#screen-system-picker').getAttribute('class'),'screen is-active');
 for(const kind of ['unbound','invalid','guest','expired']){await page.goto(model+'#offline-'+kind);assert.equal(await page.locator('#modalOfflineBlock').evaluate(el=>el.classList.contains('is-open')),true);}
 assert.deepEqual(errors,[]);console.log('PASS blue reset, offline-card and phone-banner entry, origin returns, connection/retry, gcode-only picker, upload/completion, reference binding branches.');
 }finally{await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exit(1)});
