const { chromium } = require('C:/Users/MECHREVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const base=process.env.PRINTER_OFFLINE_URL||pathToFileURL(path.join(__dirname,'../index-offline.html')).href;
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install();await page.clock.pauseAt(new Date());
  async function open(role='owner',result='timeout',online=false){
   const u=new URL(online?'index.html':base,base);u.search='';
   u.searchParams.set('connectionAccount',role);u.searchParams.set('reconnectResult',result);
   u.searchParams.set('ownerName','家长');u.searchParams.set('serverStatus','paused');
   if(online)u.searchParams.set('status','printing');
   await page.goto(u.href);
   await page.locator('#connection-console').waitFor({state:'attached'});
  }
  const screenshot=async(name)=>{
   if(process.env.CONNECTION_SHOTS)await page.screenshot({clip:await page.locator('#device-page').boundingBox(),animations:'disabled',path:path.join(process.env.CONNECTION_SHOTS,name+'.png')});
  };
  await open();
  assert.equal(await page.locator('#reconnect-sheet-layer').count(),0,'Branch choices belong in the console, not the product flow');
  await page.locator('[data-connection-account="restricted"]').click();
  await page.locator('#connection-owner-name').fill('爸爸');
  await page.locator('[data-reconnect-result="timeout"]').click();
  await page.locator('#reconnect-button').click();await page.clock.runFor(10001);
  assert.equal(await page.locator('#reconnect-timeout-copy').textContent(),'无法连接打印机，请联系爸爸（打印机超管账号）重新配网连接');
  await page.locator('#reconnect-dismiss').click();
  for(const role of ['owner','restricted']){
   for(const trigger of ['#reconnect-button','#connection-refresh']){
    await open(role);
    assert.equal(await page.locator(`[data-connection-account="${role}"]`).getAttribute('aria-checked'),'true');
    await page.locator(trigger).click();
    assert.equal(await page.locator('#reconnect-button').isDisabled(),true);
    assert.equal(await page.locator('#connection-refresh').isDisabled(),true);
    assert.equal(await page.locator('#printer-connection-state').getAttribute('data-connection-status'),'connecting');
    assert.equal(await page.locator('#connection-owner-name').isDisabled(),true);
    const attempt=await page.evaluate(()=>window.__CONNECTION_DEMO.state.attempt);
    await page.clock.runFor(10000);
    assert.equal(await page.locator('#reconnect-timeout-dialog').isVisible(),false,'Timeout is strictly beyond 10 seconds');
    assert.equal(await page.evaluate(()=>window.__CONNECTION_DEMO.state.attempt),attempt);
    await page.clock.runFor(1);
    assert.equal(await page.locator('#reconnect-timeout-dialog').isVisible(),true);
    assert.equal(await page.locator('#printer-connection-state').getAttribute('data-connection-status'),'offline');
    assert.equal(await page.locator('#reconnect-button').isEnabled(),true);
    const copy=await page.locator('#reconnect-timeout-copy').textContent();
    if(role==='owner'){
     assert.equal(copy,'无法连接打印机，可重新配网连接');
     assert.equal(await page.locator('#reconnect-reconfigure').isVisible(),true);
    }else{
     assert.equal(copy,'无法连接打印机，请联系家长（打印机超管账号）重新配网连接');
     assert.equal(await page.locator('#reconnect-reconfigure').isVisible(),false);
     assert.equal(await page.locator('#reconnect-timeout-dialog button:visible').count(),1);
    }
    await screenshot(role+'-timeout');
    await page.locator('#reconnect-dismiss').click();
    assert.equal(await page.locator('#reconnect-timeout-dialog').isVisible(),false);
    await page.clock.runFor(15000);
    assert.equal(await page.locator('#reconnect-timeout-dialog').isVisible(),false,'One failed attempt must not repeatedly show alerts');
   }
  }
  await open();await page.locator('#reconnect-button').click();await page.clock.runFor(10001);
  await page.locator('#reconnect-reconfigure').click();
  await page.waitForURL(u=>u.searchParams.get('screen')==='printer-select');
  assert.equal(await page.locator('#screen-printer-select').isVisible(),true);
  await open('restricted');await page.locator('#printer-switch').click();
  await page.locator('#configure-new-printer').click();
  assert.equal(await page.locator('#toast').textContent(),'仅超管可修改打印机网络，请联系超管');
  assert.equal(await page.locator('#add-printer-screen').isVisible(),true);
  assert.match(page.url(),/index-offline/);
  for(const role of ['owner','restricted']){
   await open(role,'success');await page.locator('#connection-refresh').click();
   await page.clock.runFor(2000);
   await page.waitForURL(u=>u.pathname.endsWith('/index.html'));
   assert.equal(await page.locator('#task-panel').getAttribute('data-status'),'paused','Recovery must display the simulated device response, not the old printing snapshot');
   assert.equal(new URL(page.url()).searchParams.get('connectionAccount'),role);
   assert.equal(await page.locator('#reconnect-timeout-dialog').count(),0);
   await page.clock.runFor(12000);
   assert.equal(await page.locator('#task-panel').isVisible(),true);
  }
  await open('restricted','timeout',true);
  await page.locator('#connection-offline-cause').selectOption('heartbeat');
  await page.locator('#simulate-connection-offline').click();
  await page.clock.runFor(10000);
  assert.equal(await page.locator('#printer-connection-state').getAttribute('data-connection-status'),'connecting');
  assert.equal(await page.locator('#task-panel').evaluate(e=>e.inert),true);
  assert.equal(await page.locator('.filament-panel').evaluate(e=>e.inert),true);
  assert.equal(await page.locator('#timelapse-placeholder').getAttribute('data-camera-state'),'off');
  const headerBox=await page.locator('.printer-header').boundingBox();
  const labelBox=await page.locator('#printer-connection-state-label').boundingBox();
  assert(labelBox.y+labelBox.height<=headerBox.y+headerBox.height,'Connecting indicator must remain in the header');
  assert.equal(await page.locator('#printer-connection-state-image').isVisible(),false,'A complete header reference image must not cover the camera or task panel');
  await screenshot('heartbeat-connection-abnormal');
  await page.clock.runFor(5000);
  await page.waitForURL(u=>u.pathname.endsWith('/index-offline.html'));
  assert.equal(await page.locator('#task-panel').count(),0);
  assert.equal(await page.locator('.filament-panel').count(),0);
  assert.equal(await page.locator('#firmware-banner').count(),0);
  assert.equal(await page.locator('#camera-offline').getAttribute('data-camera-state'),'off');
  assert.equal(await page.locator('.bottom-nav').isVisible(),true);
  assert.equal(await page.locator('#reconnect-button').isDisabled(),true,'Disconnect starts an automatic recovery attempt');
  await page.clock.runFor(10001);
  assert.match(await page.locator('#reconnect-timeout-copy').textContent(),/请联系家长/);
  await page.locator('#reconnect-dismiss').click();
  // A response wins over an outstanding deadline; changing the scenario cancels stale timers.
  await page.locator('#reconnect-button').click();await page.clock.runFor(5000);
  await page.locator('#simulate-connection-response').click();
  await page.waitForURL(u=>u.pathname.endsWith('/index.html'));
  assert.equal(await page.locator('#task-panel').getAttribute('data-status'),'paused');
  await page.clock.runFor(15000);
  assert.equal(await page.locator('#reconnect-timeout-dialog').count(),0);
  await open();await page.locator('#reconnect-button').click();await page.clock.runFor(5000);
  await page.locator('#reset-connection-demo').click();await page.clock.runFor(15000);
  assert.equal(await page.locator('#reconnect-timeout-dialog').isVisible(),false);
  assert.equal(await page.locator('#reconnect-button').isEnabled(),true);
  for(const cause of ['network','session']){
   await open('restricted','timeout',true);
   await page.locator('#connection-offline-cause').selectOption(cause);
   await page.locator('#simulate-connection-offline').click();
   await page.waitForURL(u=>u.pathname.endsWith('/index-offline.html'));
   assert.equal(new URL(page.url()).searchParams.get('disconnect'),cause);
  }
  for(const width of [320,375,768]){
   await page.setViewportSize({width,height:812});await open('restricted');
   await page.locator('#reconnect-button').click();await page.clock.runFor(10001);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   const box=await page.locator('#reconnect-timeout-dialog').boundingBox();assert(box.x>=0&&box.x+box.width<=width);
   await screenshot('restricted-timeout-'+width);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: role-based 10s timeout, both reconnect entries, owner-only reconfiguration, success reconciliation, heartbeat/network/session loss, automatic retry, recovery race and responsive console');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
