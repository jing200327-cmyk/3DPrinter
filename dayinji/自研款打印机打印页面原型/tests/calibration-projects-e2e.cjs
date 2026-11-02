const {chromium}=require('C:/Users/MECHREVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {spawn}=require('node:child_process');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const server=spawn('D:/opt/anaconda/python.exe',['-m','http.server','8045','--bind','127.0.0.1','--directory',path.join(__dirname,'../../..')],{stdio:'ignore',windowsHide:true});
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:375,height:812}}), errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install();await page.clock.pauseAt(new Date());
  const base=process.env.PRINTER_PAGE_URL||'http://127.0.0.1:8045/dayinji/'+encodeURIComponent('自研款打印机打印页面原型')+'/index.html';
  await page.goto(base+'?status=ready&filamentSensor=present&filamentFed=yes');
  await page.locator('#printer-settings').click();await page.locator('#open-device-control').click();await page.locator('#open-level-calibration').click();
  assert.equal(await page.locator('#calibration-bed').count(),1,'Bed leveling is independently selectable');
  assert.equal(await page.locator('#calibration-tuning').count(),1);
  assert.match(await page.locator('#calibration-estimate').textContent(),/8/);
  await page.locator('#calibration-bed').uncheck();assert.match(await page.locator('#calibration-estimate').textContent(),/3/);
  await page.locator('#calibration-tuning').uncheck();assert.equal(await page.locator('#calibration-start').isDisabled(),true);
  await page.locator('#calibration-bed').check();assert.match(await page.locator('#calibration-estimate').textContent(),/5/);
  await page.locator('#calibration-tuning').check();
  const shot=async name=>{if(process.env.CAPTURE_DIR)await page.screenshot({path:path.join(process.env.CAPTURE_DIR,name+'.png')});};
  await shot('calibration-selection');await page.locator('#calibration-start').click();
  assert.equal(await page.locator('#calibration-running').isVisible(),true);assert.equal(await page.locator('#calibration-confirm').isVisible(),false);
  await page.clock.runFor(6000);assert(Number(await page.locator('#calibration-progress-bar').getAttribute('aria-valuenow'))>0);
  await shot('calibration-running');await page.locator('#calibration-exit').click();
  assert.equal(await page.locator('#calibration-screen').isVisible(),false);
  assert.equal(await page.locator('#calibration-workbench-status').isVisible(),true);
  for(const selector of ['#load-filament','#unload-filament','#printer-switch','#firmware-banner']){
   assert.equal(await page.locator(selector).getAttribute('aria-disabled'),'true');
  }
  await page.locator('#load-filament').click({force:true});assert.equal(await page.locator('#filament-guide-screen').isVisible(),false);
  await page.locator('#printer-switch').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#add-printer-screen').isVisible(),false);
  await shot('calibration-workbench-locked');
  await page.reload();assert.equal(await page.locator('#load-filament').getAttribute('aria-disabled'),'true');
  await page.locator('#calibration-workbench-status').click();assert.equal(await page.locator('#calibration-running').isVisible(),true);
  await page.clock.runFor(18500);
  assert.equal(await page.locator('#calibration-progress-bar').getAttribute('aria-valuenow'),'100');
  assert.equal(await page.locator('#calibration-confirm').isVisible(),true);
  assert.notEqual(await page.locator('#load-filament').getAttribute('aria-disabled'),'true');
  await shot('calibration-completed');await page.locator('#calibration-confirm').click();
  assert.equal(await page.locator('#calibration-screen').isVisible(),false);assert.equal(await page.locator('#calibration-workbench-status').isVisible(),false);
  await page.locator('#printer-settings').click();await page.locator('#open-device-control').click();await page.locator('#open-level-calibration').click();
  for(const width of [320,768,1440]){await page.setViewportSize({width,height:900});assert(await page.locator('#calibration-screen').evaluate(el=>el.scrollWidth<=el.clientWidth));}
  // 单项必须独立执行；已有打印任务时，离开校准页也不能绕过设备互斥。
  await page.setViewportSize({width:375,height:812});
  for(const [project,duration] of [['bed',15000],['tuning',9000]]){
   await page.goto(base+'?status=printing&plate=1&filamentSensor=present&filamentFed=yes');
   await page.locator('#printer-settings').click();await page.locator('#open-device-control').click();await page.locator('#open-level-calibration').click();
   await page.locator(project==='bed'?'#calibration-tuning':'#calibration-bed').uncheck();await page.locator('#calibration-start').click();
   assert.equal(await page.locator('.cal-project-status').count(),1);
   await page.locator('#calibration-leave').click();
   await page.locator('#pause-print').click({force:true});await page.locator('#cancel-print').focus();await page.keyboard.press('Enter');
   assert.equal(await page.locator('dialog[open]').count(),0);assert.equal(new URL(page.url()).searchParams.get('status'),'printing');
   await page.clock.runFor(duration);await page.locator('#calibration-workbench-status').click();
   assert.equal(await page.locator('#calibration-confirm').isVisible(),true);await page.locator('#calibration-confirm').click();
   assert.notEqual(await page.locator('#pause-print').getAttribute('aria-disabled'),'true');
  }
  assert.deepEqual(errors,[]);console.log('PASS selection, additive estimates, disabled empty selection, progress, leaving, pointer/keyboard device lock, refresh recovery, completion, confirm, responsive layout.');
 }finally{await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exit(1)});
