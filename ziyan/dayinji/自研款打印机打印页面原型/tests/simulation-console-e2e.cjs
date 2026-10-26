const {chromium}=require('C:/Users/MECHREVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const base=process.env.PRINTER_PAGE_URL||pathToFileURL(path.join(__dirname,'../index.html')).href;
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const failures=[];
 async function scenario(name,run){
  const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-10-22T00:00:00Z')});await page.clock.pauseAt(new Date('2026-10-22T00:00:01Z'));
  try{await run(page);assert.deepEqual(errors,[]);console.log('PASS: '+name);}catch(e){failures.push(name+': '+e.message);console.error('FAIL: '+name+': '+e.message);}finally{await page.close();}
 }
 try{
 await scenario('single dismiss and close never cancel; confirm uses model-source actions',async page=>{
  await page.goto(base+'?status=printing&plates=single');
  assert.equal(await page.locator('[data-queue-task]:not([hidden])').count(),0);
  const timeBeforeDismiss=await page.locator('#remaining-time').textContent();
  await page.locator('#cancel-print').click();
  assert.equal(await page.locator('#dialog-dismiss').textContent(),'暂不');assert.equal(await page.locator('#dialog-confirm').textContent(),'取消任务');
  await page.locator('#dialog-dismiss').click();await page.clock.runFor(2100);
  assert.equal(await page.locator('#task-panel').getAttribute('data-status'),'printing');
  assert.notEqual(await page.locator('#remaining-time').textContent(),timeBeforeDismiss);
  await page.locator('#cancel-print').click();await page.locator('#dialog-close').click();await page.clock.runFor(2100);
  assert.equal(await page.locator('#task-panel').getAttribute('data-status'),'printing');
  await page.locator('#cancel-print').click();await page.locator('#dialog-confirm').click();await page.locator('#transition-overlay').waitFor({state:'visible'});await page.clock.runFor(2100);
  assert.equal(await page.locator('#task-state').textContent(),'已取消打印任务');
  assert.equal(await page.locator('#cancelled-model-actions').isVisible(),true);
  assert.equal(await page.locator('#completion-actions').isVisible(),false);
  assert.equal(await page.locator('#queue-empty').isVisible(),true);
  await page.reload();assert.equal(await page.locator('#cancelled-model-actions').isVisible(),true);
  await page.goto(base+'?status=cancelled&plates=single');assert.equal(await page.locator('#cancelled-model-actions').isVisible(),true);
 });
 await scenario('right console switches fresh single and multi simulations; family entry is available',async page=>{
  await page.goto(base);
  assert.equal(await page.locator('#simulation-console').count(),1);
  const consoleBox=await page.locator('#simulation-console').boundingBox(),phone=await page.locator('#device-page').boundingBox();assert(consoleBox.x>=phone.x+phone.width);
  assert.equal(await page.locator('#simulate-family').isEnabled(),true);
  await page.locator('#simulate-single').click();await page.waitForURL(u=>u.searchParams.get('plates')==='single');
  assert.equal(await page.locator('#task-panel').getAttribute('data-status'),'printing');
  assert.equal(await page.locator('[data-queue-task]:not([hidden])').count(),0);
  assert.equal(await page.locator('#simulate-single').getAttribute('aria-checked'),'true');
  await page.locator('#simulate-multi').click();await page.waitForURL(u=>!u.searchParams.has('plates'));
  assert.equal(await page.locator('[data-queue-task]:not([hidden])').count(),2);
  assert.equal(await page.locator('#simulate-multi').getAttribute('aria-checked'),'true');
  await page.locator('#cancel-print').click();assert.equal(await page.locator('#dialog-dismiss').textContent(),'取消当前任务');
 });
 await scenario('small screens can open the collapsed console without outer overflow',async page=>{
  for(const viewport of [{width:320,height:568},{width:375,height:812},{width:768,height:1024}]){
   await page.setViewportSize(viewport);await page.goto(base);
   assert.equal(await page.locator('#simulation-console').getAttribute('open'),null);
   await page.locator('#simulation-console summary').click();
   assert.equal(await page.locator('#simulate-single').isVisible(),true);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
 });
 assert.deepEqual(failures,[]);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
