const {chromium}=require('C:/Users/MECHREVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {spawn}=require('node:child_process');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const server=spawn('D:/opt/anaconda/python.exe',['-m','http.server','8047','--bind','127.0.0.1','--directory',path.resolve(__dirname,'../../..')],{stdio:'ignore',windowsHide:true});
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:375,height:812}}), errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install();await page.clock.pauseAt(new Date());
  const host=process.env.PROTOTYPE_HOST||'http://127.0.0.1:8047';
  if(!process.env.PROTOTYPE_HOST)for(let i=0;i<30;i++){try{await fetch(host);break;}catch{await new Promise(resolve=>setTimeout(resolve,100));}}
  const pairing=host+'/lianjiepeiwnag/'+encodeURIComponent('打印机首次配网连接流程原型')+'/index.html';
  const workbench=host+'/dayinji/'+encodeURIComponent('自研款打印机打印页面原型')+'/index-offline.html';
  await page.goto(workbench);assert.equal(await page.locator('#offline-print-card').count(),1,'Offline workbench contains a dedicated print card');
  assert.equal(await page.locator('#offline-print-card p').textContent(),'如果打印机已开机但无网络，可使用无网打印');
  assert(await page.locator('.offline-notice').evaluate(el=>Boolean(el.compareDocumentPosition(document.querySelector('#offline-print-card'))&Node.DOCUMENT_POSITION_FOLLOWING)));
  for(const width of [320,375,768,1440]){await page.setViewportSize({width,height:900});assert(await page.locator('#device-page').evaluate(el=>el.scrollWidth<=el.clientWidth));assert.equal(await page.locator('#open-offline-print').isVisible(),true);}
  await page.setViewportSize({width:375,height:812});
  if(process.env.CAPTURE_DIR)await page.screenshot({path:path.join(process.env.CAPTURE_DIR,'offline-workbench.png')});
  await page.locator('#connection-refresh').click();assert.equal(await page.locator('#connection-refresh').isDisabled(),true);await page.clock.runFor(10001);
  assert.equal(await page.locator('#reconnect-timeout-dialog').isVisible(),true);await page.locator('#reconnect-dismiss').click();assert.equal(await page.locator('#offline-print-card').isVisible(),true);
  for(const account of ['owner','restricted']){
   await page.goto(workbench+'?connectionAccount='+account+'&offlineVersion=classic&ownerName=家长');
   await page.locator('#open-offline-print').click();await page.waitForURL('**/index.html?**');
   assert.equal(await page.locator('#screen-offline-guide').isVisible(),true);
   await page.locator('#offline-guide-back').click();await page.waitForURL('**/index-offline.html?**');
   assert.equal(new URL(page.url()).searchParams.get('connectionAccount'),account);assert.equal(new URL(page.url()).searchParams.get('offlineVersion'),'classic');
  }
  await page.goto(pairing);assert.equal(await page.locator('[data-start-action="offline"],.offline-start-entry').count(),0);
  assert.equal(await page.locator('#screen-start').isVisible(),true);
  await page.goto(pairing+'?flow=offline');await page.waitForURL('**/index-offline.html*');assert.equal(await page.locator('#offline-print-card').isVisible(),true);
  await page.locator('#open-offline-print').click();await page.locator('#offline-connect').click();
  assert.equal(await page.locator('#offline-connecting').isVisible(),true);await page.locator('#offline-cancel-connect').click();assert.equal(await page.locator('#screen-offline-guide').isVisible(),true);
  await page.locator('#offline-connect').click();await page.locator('#offline-demo-timeout').click();assert.equal(await page.locator('#offline-timeout').isVisible(),true);
  await page.locator('#offline-retry').click();await page.clock.runFor(6500);
  assert.equal(await page.locator('#screen-offline-library').isVisible(),true);assert.equal(await page.locator('.offline-model').count(),9);
  await page.locator('#offline-tab-slices').click();await page.locator('.offline-model').first().click();assert.equal(await page.locator('#offline-upload').isVisible(),true);await page.clock.runFor(4000);
  assert.equal(await page.locator('#offline-upload').isVisible(),false);
  await page.locator('#offline-import-local').click();assert.equal(await page.locator('#screen-offline-files').isVisible(),true);
  await page.locator('[data-offline-file="2"]').click({force:true});assert.equal(await page.locator('#offline-print-local').isDisabled(),true);
  await page.locator('[data-offline-file="0"]').click();await page.locator('#offline-print-local').click();assert.equal(await page.locator('#offline-upload').isVisible(),true);await page.clock.runFor(4000);assert.equal(await page.locator('#screen-offline-library').isVisible(),true);
  assert.deepEqual(errors,[]);console.log('PASS relocated card, specified copy, both role/version return paths, removed empty-workbench entry, old link migration, responsive layout, original guide/cancel/connect/library/upload/local-file flows.');
 }finally{await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exit(1)});
