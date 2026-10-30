const { chromium } = require('C:/Users/MECHREVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const base = process.env.PRINTER_PAGE_URL || pathToFileURL(require('node:path').join(__dirname, '../index.html')).href;
(async () => {
 const browser = await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try {
 const page=await browser.newPage({viewport:{width:375,height:812}}); const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base + '?status=preparing&queue=plate-2%2Cplate-3&results=%7B%7D&filamentSensor=present&filamentFed=yes&plate=1'); await page.locator('#printer-settings').click();
 assert.equal(await page.locator('#open-device-info').count(),1);
 await page.locator('#open-device-info').click();
 await page.screenshot({path:require('node:path').join(require('node:os').tmpdir(), 'device-info.png')});
 await page.locator('#open-storage-management').click();
 const before=await page.locator('#storage-used').textContent();
 await page.screenshot({path:require('node:path').join(require('node:os').tmpdir(), 'storage-management.png')});
 await page.locator('#manage-gcode').click();
 assert.equal(await page.locator('.di-model-card').count(),4);
 await page.locator('.di-more').first().click();
 await page.screenshot({path:require('node:path').join(require('node:os').tmpdir(), 'device-models-menu.png')});
 await page.getByRole('menuitem',{name:'重命名',exact:true}).click();
 await page.locator('#model-name-input').fill('   '); await page.locator('#model-save').click();
 assert.equal(await page.locator('#model-action-dialog').isVisible(),true);
 await page.locator('#model-name-input').fill('<测试模型>'); await page.locator('#model-save').click();
 assert.equal(await page.locator('.di-model-name').first().textContent(),'<测试模型>.gcode');
 await page.reload(); await page.locator('#printer-settings').click();await page.locator('#open-device-info').click();await page.locator('#open-storage-management').click();await page.locator('#manage-gcode').click();
 assert.equal(await page.locator('.di-model-name').first().textContent(),'<测试模型>.gcode');
 await page.locator('.di-more').first().click();await page.getByRole('menuitem',{name:'删除',exact:true}).click();
 await page.locator('#model-action-cancel').click();assert.equal(await page.locator('.di-model-card').count(),4);
 await page.locator('.di-more').first().click();await page.getByRole('menuitem',{name:'删除',exact:true}).click();await page.locator('#model-save').click();
 assert.equal(await page.locator('.di-model-card').count(),3);
 await page.locator('#device-models-back').click();assert.notEqual(await page.locator('#storage-used').textContent(),before);
 await page.locator('#storage-management-back').click();await page.locator('#device-info-back').click();assert.equal(await page.locator('#device-settings-screen').isVisible(),true);
 for(const width of [320,768,1440]) {await page.setViewportSize({width,height:900});await page.locator('#open-device-info').click();assert(await page.locator('#device-info-screen').evaluate(el=>el.scrollWidth<=el.clientWidth));await page.locator('#device-info-back').click();}
 await page.locator('#open-device-info').click();await page.locator('#open-storage-management').click();await page.locator('#manage-gcode').click();
 await page.locator('.di-more').first().click();await page.getByRole('menuitem',{name:'重命名',exact:true}).click();
 await page.locator('#model-name-input').fill('小机器人挂件_102910');await page.locator('#model-save').click();assert.match(await page.locator('#model-name-error').textContent(),/同名/);await page.locator('#model-action-cancel').click();
 for(let i=0;i<3;i++){await page.locator('.di-more').first().click();await page.getByRole('menuitem',{name:'删除',exact:true}).click();await page.locator('#model-save').click();}
 assert.equal(await page.locator('.di-model-card').count(),0);assert.match(await page.locator('.di-empty').textContent(),/暂无/);
 await page.reload();await page.locator('#printer-settings').click();await page.locator('#open-device-info').click();await page.locator('#open-storage-management').click();assert.equal(await page.locator('#storage-gcode-size').textContent(),'0.00MB');await page.locator('#manage-gcode').click();assert.equal(await page.locator('.di-model-card').count(),0);
 assert.deepEqual(errors,[]); console.log('PASS: navigation, menu, safe rename, persistence, delete cancel/confirm, storage updates, responsive widths, no page errors');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
