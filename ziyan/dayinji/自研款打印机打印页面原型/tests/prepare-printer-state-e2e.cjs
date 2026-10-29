const {chromium}=require('C:/Users/MECHREVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');const {pathToFileURL}=require('node:url');const path=require('node:path');const fs=require('node:fs');
const base=process.env.PRINTER_PAGE_URL||pathToFileURL(path.join(__dirname,'../index.html')).href;
const out=process.env.PREPARE_PRINTER_SHOTS;
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:process.env.PRINT_HOST_MAP?[`--host-resolver-rules=${process.env.PRINT_HOST_MAP}`]:[]});
 const page=await browser.newPage({viewport:{width:1440,height:950}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const load=async(extra={})=>{const u=new URL(base);Object.entries({status:'ready',screen:'prepare-print',queue:'plate-2,plate-3',filamentSensor:'present',...extra}).forEach(([k,v])=>u.searchParams.set(k,v));await page.goto(u.href,{waitUntil:'domcontentloaded'});};
 const shot=async(name)=>{if(!out)return;fs.mkdirSync(out,{recursive:true});await page.locator('#prepare-print-screen').screenshot({path:path.join(out,name+'.png'),animations:'disabled'});};
 try{
 await page.clock.install();await page.clock.pauseAt(new Date());await load();
 const control=page.locator('#simulation-prepare-printer');const toast=page.locator('#toast');
 assert.deepEqual(await control.locator('option').allTextContents(),['空闲','离线','忙碌','连接中']);assert.equal(await control.inputValue(),'idle');
 await page.locator('#prepare-plate-list [data-plate="3"] .plate-row-hit').click({position:{x:240,y:12}});await page.locator('#timelapse-toggle').click();
 for(const [state,copy,label]of[['offline','打印机已离线','离线'],['connecting','打印机连接中','连接中']]){
 await control.selectOption(state);const u=page.url();await page.locator('#start-print').click();
 assert.equal(await toast.textContent(),copy);assert.equal(await toast.evaluate(e=>e.classList.contains('toast--prepare')&&e.classList.contains('is-visible')),true);
 assert.equal(page.url(),u);assert.equal(await page.locator('#prepare-print-screen').isVisible(),true);assert.equal(await page.locator('#prepare-stage .prepare-idle').textContent(),label);
 assert.equal(await page.locator('#prepare-plate-list [data-plate="3"]').getAttribute('aria-selected'),'true');assert.equal(await page.locator('#timelapse-toggle').getAttribute('aria-checked'),'false');
 const r=await toast.boundingBox();const f=await page.locator('#prepare-print-screen').boundingBox();assert(r.y>=f.y&&r.y+r.height<f.y+200);
 await shot(state==='offline'?'PRINT-B-03-offline':'PRINT-B-04-connecting');await page.clock.runFor(2000);assert.equal(await toast.evaluate(e=>e.classList.contains('is-visible')),false);
 }
 await control.selectOption('busy');const current=await page.locator('#task-title').textContent();await page.locator('#start-print').click();
 assert.equal(await toast.textContent(),'打印机正忙碌，打印任务已添加至打印队列');assert.equal(await page.locator('#prepare-print-screen').isVisible(),true);assert.equal(await page.locator('#task-title').textContent(),current);
 const expected=['plate-2','plate-3','prepared-3','prepared-1','prepared-2'];assert.deepEqual(new URL(page.url()).searchParams.get('queue').split(','),expected);
 assert.equal(await page.locator('#start-print').isDisabled(),true);await page.locator('#start-print').evaluate(e=>e.click());assert.deepEqual(new URL(page.url()).searchParams.get('queue').split(','),expected);
 await shot('PRINT-B-05-busy-queued');await page.reload({waitUntil:'domcontentloaded'});assert.equal(await control.inputValue(),'busy');assert.equal(await page.locator('#start-print').isDisabled(),true);assert.deepEqual(new URL(page.url()).searchParams.get('queue').split(','),expected);
 await page.locator('#prepare-print-back').click();await page.locator('#queue-toggle').click();assert.equal(await page.locator('#print-queue [data-queue-id]:visible').count(),5);
 await page.locator('#print-queue [data-queue-id="prepared-2"]').click();assert.equal(await page.locator('#prepare-state-screen').isVisible(),true);assert.equal(await page.locator('#prepare-state-start').isDisabled(),true,'队首前有旧任务时不允许插队');
 // 新批次到达队首后沿用原执行链路，当前任务 ID 与原模型批次区分。
 await load({status:'completed',queue:'prepared-3,prepared-1,prepared-2',preparePrinter:'busy',prepareSubmitted:'yes'});await page.locator('#prepare-print-back').click();await page.locator('#next-plate').click();await page.waitForURL(u=>u.searchParams.get('activeTask')==='prepared-3');
 assert.equal(new URL(page.url()).searchParams.get('status'),'preparing');assert.equal(await page.locator('#task-title').textContent(),'史蒂夫_03_012207');assert.equal(new URL(page.url()).searchParams.get('queue'),'prepared-1,prepared-2');
 // 已有打印任务继续运行；提交不会替换或重置它的进度。
 await load({status:'printing',preparePrinter:'busy'});const before=await page.locator('#remaining-time').textContent();await page.locator('#start-print').click();await page.clock.runFor(2000);assert.equal(await page.locator('#task-panel').getAttribute('data-status'),'printing');assert.notEqual(await page.locator('#remaining-time').textContent(),before);
 await page.locator('#simulate-single').click();await page.waitForURL(u=>u.searchParams.get('plates')==='single');assert.equal(new URL(page.url()).searchParams.has('prepareSubmitted'),false);assert.equal(await control.inputValue(),'idle');
 // 设备不可达时先阻断；恢复空闲后重新走原耗材门禁。
 await load({filamentSensor:'absent',preparePrinter:'offline'});await page.locator('#start-print').click();assert.equal(await page.locator('#print-filament-required-dialog').isVisible(),false);await control.selectOption('idle');await page.locator('#start-print').click();assert.equal(await page.locator('#print-filament-required-dialog').isVisible(),true);
 await load();await page.locator('#start-print').click();await page.waitForURL(u=>u.searchParams.get('status')==='preparing');assert.equal(await page.locator('#prepare-print-screen').isVisible(),false);
 for(const width of[375,320]){await page.setViewportSize({width,height:812});await load({preparePrinter:'offline'});await page.locator('#start-print').click();const r=await toast.boundingBox();assert(r.x>=0&&r.x+r.width<=width);await shot('mobile-offline-'+width);}
 assert.deepEqual(errors,[]);console.log('PASS: idle/offline/connecting/busy, top Toasts, preserved options, no unreachable submissions, queued batch persistence/deduplication/FIFO, sensor priority and mobile layouts');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
