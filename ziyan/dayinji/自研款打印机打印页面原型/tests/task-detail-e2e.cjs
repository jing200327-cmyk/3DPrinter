/* 三个任务详情必须使用新版准备打印页，状态章跟随当前盘，结果不因查看而改变。 */
const { chromium } = require('C:/Users/MECHREVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const output = process.env.PRINTER_SCREENSHOTS || root;
const baseline = process.argv.includes('--baseline');
const errors = [];
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    fs.mkdirSync(output, { recursive: true });
    const cases = [ ['printing', '正在打印'], ['cancelled', '已取消'], ['completed', '已完成'] ];
    for (const [status, label] of cases) {
      const url = new URL(pathToFileURL(path.join(root, 'index.html')));
      url.search = `?status=${status}&plate=1`;
      await page.goto(url.href);
      await page.evaluate(() => openPrepareStateScreen('2'));
      const stage = page.locator('#prepare-state-stage');
      await stage.waitFor({ state: 'visible' });
      await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.querySelectorAll('#prepare-state-stage img')].map(image => image.decode())); });
      await stage.screenshot({ path: path.join(output, `prototype-prepare-state-${status}${baseline ? '-before' : ''}.png`) });
      assert.equal(await stage.locator('.prepare-model').count(), 3);
      assert.equal(await stage.locator('.prepare-material').count(), 3);
      assert.equal(await stage.locator('.prepare-model-name').first().textContent(), '史蒂夫_01_012214');
      assert.match(await page.locator('#state-stamp').getAttribute('src'), new RegExp(label));
      assert.equal(await stage.locator('[data-row="1"]').getAttribute('aria-disabled'), 'true');
      assert.equal(await stage.locator('[data-row="2"]').getAttribute('aria-selected'), 'true');
      assert.equal(await page.locator('#prepare-state-start').isDisabled(), status === 'printing');
      assert.equal(await stage.locator('.prepare-switch').count(), 1, '任务详情缺少与新版准备页一致的切换入口');
      assert.ok(await stage.locator('[data-row="1"] .prepare-model').evaluate(node => Number(getComputedStyle(node).opacity) < 1), '状态盘内容应置灰，状态章保持清晰');
      const geometry = await stage.evaluate(node => {
        const row = node.querySelector('[data-row="1"]').getBoundingClientRect();
        const stamp = node.querySelector('#state-stamp').getBoundingClientRect();
        return { rowTop: row.top, rowBottom: row.bottom, stampTop: stamp.top, stampBottom: stamp.bottom, stampCenter: (stamp.top + stamp.bottom) / 2, rowCenter: (row.top + row.bottom) / 2 };
      });
      assert.ok(Math.abs(geometry.stampCenter - geometry.rowCenter) < 1, '状态章应居中覆盖当前盘');
      assert.ok(geometry.stampTop >= geometry.rowTop && geometry.stampBottom <= geometry.rowBottom, '状态章不应侵入邻盘');
      await stage.locator('.prepare-switch').click();
      assert.equal(await page.locator('#add-printer-screen').isVisible(), true);
      await page.locator('#add-printer-back').click();
      assert.equal(await stage.isVisible(), true, '切换入口返回时保留原详情');
      await page.locator('#prepare-state-back').click();
      assert.equal(await page.locator('#task-panel').getAttribute('data-status'), status, '查看详情不改变原任务状态');
    }
    for (const plate of ['2', '3']) {
      const url = new URL(pathToFileURL(path.join(root, 'index.html')));
      url.search = `?status=printing&plate=${plate}`;
      await page.goto(url.href);
      await page.evaluate(() => openPrepareStateScreen('1'));
      assert.equal(await page.locator('#state-stamp').evaluate(node => node.closest('.state-row')?.dataset.row), plate, '状态章应跟随实际任务盘');
    }
    assert.deepEqual(errors, []);
    console.log('PASS: 三种任务详情、状态章位置、禁用条件、返回状态及非首盘回归。');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
