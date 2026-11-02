const { chromium } = require('C:/Users/MECHREVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const path = require('node:path');
(async () => {
 const server = spawn('D:/opt/anaconda/python.exe', ['-m','http.server','8042','--bind','127.0.0.1','--directory',path.join(__dirname,'..')], {stdio:'ignore',windowsHide:true});
 const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try {
 const base = process.env.PRINTER_PAGE_URL || 'http://127.0.0.1:8042/index.html';
 const context = await browser.newContext({viewport:{width:375,height:812},permissions:['clipboard-read','clipboard-write']});
 const page=await context.newPage(), errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'?status=printing&queue=plate-2%2Cplate-3&results=%7B%7D&filamentSensor=present&filamentFed=yes&plate=1');
 await page.locator('#printer-settings').click();await page.locator('#open-device-info').click();
 assert.equal(await page.locator('#edit-device-name').count(),1,'Printer name has an edit button');
 assert.equal(await page.locator('#device-account-badge').textContent(),'机主');
 await page.locator('#edit-device-name').click();
 assert.equal(await page.locator('#device-name-dialog').isVisible(),true);
 await page.locator('#device-name-input').fill('   ');
 assert.equal(await page.locator('#device-name-save').isDisabled(),true);
 assert.match(await page.locator('#device-name-error').textContent(),/不能为空/);
 await page.locator('#device-name-input').fill('取消修改');await page.locator('#device-name-cancel').click();
 assert.equal(await page.locator('#device-display-name').textContent(),'ugee funbox');
 await page.locator('#edit-device-name').click();await page.locator('#device-name-input').fill('  我的 <打印机>  ');await page.locator('#device-name-save').click();
 assert.equal(await page.locator('#device-display-name').textContent(),'我的 <打印机>');
 assert.equal(await page.locator('#device-display-name').locator('打印机').count(),0);
 await page.reload();await page.locator('#printer-settings').click();await page.locator('#open-device-info').click();
 assert.equal(await page.locator('#device-display-name').textContent(),'我的 <打印机>');
 for(const [label,value] of [['ID','7022782816D8AB'],['SN','FB202610300001'],['IP','192.168.1.105']]) {
  const button=page.getByRole('button',{name:'复制 '+label,exact:true});assert.equal(await button.locator('svg').count(),1);
  await button.click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),value);
 }
 await page.locator('#simulation-console summary').click();
 await page.locator('#simulate-device-child').click();
 assert.equal(await page.locator('#device-account-badge').textContent(),'已授权');
 assert.equal(new URL(page.url()).searchParams.get('deviceAccount'),'child');
 assert.equal(new URL(page.url()).searchParams.get('status'),'printing');
 assert.equal(new URL(page.url()).searchParams.get('queue'),'plate-2,plate-3');
 await page.locator('#simulation-console summary').click();await page.locator('#simulate-device-parent').click();
 assert.equal(await page.locator('#device-account-badge').textContent(),'机主');
 for(const width of [320,375,768,1440]) {
  await page.setViewportSize({width,height:900});
  assert(await page.locator('#device-info-screen').evaluate(el=>el.scrollWidth<=el.clientWidth));
  const name=await page.locator('#device-display-name').boundingBox(), edit=await page.locator('#edit-device-name').boundingBox();assert(edit.x>=name.x+name.width-1);
 }
 await page.setViewportSize({width:375,height:812});
 if(process.env.CAPTURE_DIR) {
  await page.locator('#edit-device-name').click();await page.locator('#device-name-input').fill('ugee funbox');await page.locator('#device-name-save').click();
  await page.screenshot({path:path.join(process.env.CAPTURE_DIR,'device-parent.png')});
  await page.locator('#edit-device-name').click();await page.screenshot({path:path.join(process.env.CAPTURE_DIR,'device-rename.png')});await page.locator('#device-name-cancel').click();
  await page.locator('#simulation-console summary').click();await page.locator('#simulate-device-child').click();await page.screenshot({path:path.join(process.env.CAPTURE_DIR,'device-child.png')});
 }
 assert.deepEqual(errors,[]);console.log('PASS: rename validation, cancel, persistence, safe text, real clipboard, parent/child branches, task state preservation, responsive edit position.');
 } finally {await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exit(1)});
