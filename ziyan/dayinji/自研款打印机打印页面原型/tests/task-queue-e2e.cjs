const { chromium } = require('C:/Users/MECHREVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const base = process.env.PRINTER_PAGE_URL || pathToFileURL(path.join(__dirname, '../index.html')).href;
const output = process.env.TASK_QUEUE_OUTPUT;
(async () => {
 const browser = await chromium.launch({ executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true });
 const failures=[];
 async function scenario(name, run) {
  const page=await browser.newPage({viewport:{width:375,height:812}});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-10-22T00:00:00Z')});
  await page.clock.pauseAt(new Date('2026-10-22T00:00:01Z'));
  try {await run(page);assert.deepEqual(errors,[]);console.log('PASS: '+name);}
  catch(e){failures.push(name+': '+e.message);console.error('FAIL: '+name+': '+e.message);}
  finally{await page.close();}
 }
 const queueIds=page=>page.locator('[data-queue-task]:not([hidden])').evaluateAll(rows=>rows.map(row=>row.dataset.queueId));
 async function cancel(page,all=false) {
  await page.locator('#cancel-print').click();
  await page.locator(all?'#dialog-confirm':'#dialog-dismiss').click();
  await page.locator('#transition-overlay').waitFor({state:'visible'});
  await page.clock.runFor(2100);
 }
 async function images(page) {
  await page.waitForFunction(()=>[...document.querySelectorAll('#active-task-image,[data-queue-task]:not([hidden]) .queue-task-artwork')].every(i=>i.complete&&i.naturalWidth>0));
 }
 async function shot(page,name) {
  if(output){
   fs.mkdirSync(output,{recursive:true});
   await page.clock.runFor(2200);
   await page.locator('#device-page').evaluate(el=>{el.scrollTop=document.querySelector('#task-panel').offsetTop-55;});
   await page.locator('#task-panel').screenshot({path:path.join(output,name+'.png')});
  }
 }
 try {
 await scenario('cancel current offers restart and next; restart uses heating',async page=>{
  await page.goto(base+'?status=printing');await cancel(page);
  assert.equal(await page.locator('#task-state').textContent(),'已取消打印任务');
  assert.equal(await page.locator('#completion-actions').isVisible(),true);
  assert.deepEqual(await queueIds(page),['plate-2','plate-3']);
  await images(page);await shot(page,'cancel-current');
  await page.locator('#restart-print').click();
  assert.equal(await page.locator('#preparation-label').textContent(),'升温中');
 });
 await scenario('cancel all offers model sources and empty queue; survives reload',async page=>{
  await page.goto(base+'?status=printing');await cancel(page,true);
  assert.equal(await page.locator('#task-state').textContent(),'已取消打印任务');
  assert.equal(await page.locator('#cancelled-explore-toys').isVisible(),true);
  assert.equal(await page.locator('#cancelled-my-models').isVisible(),true);
  assert.deepEqual(await queueIds(page),[]);
  assert.equal(await page.locator('#queue-empty').isVisible(),true);
  await images(page);await shot(page,'cancel-all');
  await page.reload();assert.deepEqual(await queueIds(page),[]);
  await page.locator('#cancelled-explore-toys').click();
  assert.equal(await page.locator('#explore-toys-screen').isVisible(),true);
  await page.locator('#explore-toys-back').click();
  await page.locator('#cancelled-my-models').click();
  assert.equal(await page.locator('#reference-title').textContent(),'我的模型');
 });
 for(const terminal of ['completed','cancelled']) await scenario(terminal+' → queue → start preserves terminal result and image assets',async page=>{
  await page.goto(base+'?status=printing');
  if(terminal==='completed')await page.locator('#finish-now').click();else await cancel(page);
  if(await page.locator('#print-queue').isHidden())await page.locator('#queue-toggle').click();
  await page.locator('[data-queue-id="plate-2"]').click();
  assert.equal(await page.locator('.state-row[data-row="1"]').getAttribute('aria-disabled'),'true');
  await page.locator('#prepare-state-start').click();
  await page.waitForURL(u=>u.searchParams.get('plate')==='2');
  assert.deepEqual(await queueIds(page),['plate-3']);
  await images(page);await shot(page,terminal+'-start-plate-2');
  await page.reload();assert.deepEqual(await queueIds(page),['plate-3']);
  await page.locator('#finish-now').click();
  await page.locator('#queue-toggle').click();
  await page.locator('[data-queue-id="plate-3"]').click();
  for(const plate of ['1','2'])assert.equal(await page.locator(`.state-row[data-row="${plate}"]`).getAttribute('aria-disabled'),'true');
  for(const plate of ['1','2'])assert.equal(await page.locator(`.state-row[data-row="${plate}"] .plate-3d-btn`).isDisabled(),true);
  await page.locator('#prepare-state-start').click();
  await page.waitForURL(u=>u.searchParams.get('plate')==='3');
  assert.deepEqual(await queueIds(page),[]);await images(page);
 });
 await scenario('cancel current next plate never restores cancelled plate',async page=>{
  await page.goto(base+'?status=printing');await cancel(page);
  await page.locator('#next-plate').click();await page.waitForURL(u=>u.searchParams.get('plate')==='2');
  assert.deepEqual(await queueIds(page),['plate-3']);await images(page);
 });
 await scenario('cancel all preserves other submission and can start its queue head',async page=>{
  await page.goto(base+'?status=printing&family=multi');await cancel(page,true);
  assert.deepEqual(await queueIds(page),['girl-1','girl-2']);
  await page.locator('[data-queue-id="girl-1"]').click();
  await page.locator('#prepare-state-start').click();
  await page.waitForURL(u=>u.searchParams.get('activeTask')==='girl-1');
  assert.deepEqual(await queueIds(page),['girl-2']);await images(page);
 });
 await scenario('queue remains FIFO; busy printer cannot start another plate',async page=>{
  await page.goto(base+'?status=printing');
  await page.locator('#queue-toggle').click();await page.locator('[data-queue-id="plate-2"]').click();
  assert.equal(await page.locator('#prepare-state-start').isDisabled(),true);
  await page.locator('#prepare-state-back').click();await page.locator('#finish-now').click();
  await page.locator('[data-queue-id="plate-2"]').click();
  await page.locator('.state-row[data-row="3"] .state-row-hit').click();
  assert.equal(await page.locator('#prepare-state-start').isDisabled(),true);
  await page.locator('.state-row[data-row="2"] .state-row-hit').click();
  assert.equal(await page.locator('#prepare-state-start').isDisabled(),false);
 });
 await scenario('cancel all → new model submission starts a fresh queue',async page=>{
  await page.goto(base+'?status=printing');await cancel(page,true);
  await page.locator('#cancelled-explore-toys').click();await page.locator('#explore-toys-anywhere').click();
  await page.locator('#open-prepare-print').click();await page.locator('#start-print').click();
  await page.waitForURL(u=>u.searchParams.get('status')==='preparing');
  assert.deepEqual(await queueIds(page),['plate-2','plate-3']);await images(page);
 });
 assert.deepEqual(failures,[]);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
