const { chromium } = require('C:/Users/MECHREVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const printer = process.env.PRINTER_PAGE_URL || pathToFileURL(path.join(__dirname, '../index.html')).href;

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.clock.install({ time: new Date('2026-10-22T00:00:00Z') });
    await page.clock.pauseAt(new Date('2026-10-22T00:00:01Z'));
    const preparingUrl = new URL(printer);
    preparingUrl.searchParams.set('status', 'preparing');
    await page.goto(preparingUrl.href);
    const label = () => page.locator('#preparation-label').textContent();
    assert.equal(await label(), '正在分析模型');
    const progress = [];
    for (let second = 0; second < 10; second++) {
      progress.push(Number((await page.locator('#preparation-percent').textContent()).replace('%', '')));
      if (second < 9) await page.clock.runFor(1000);
    }
    assert.equal(progress[0], 0);
    assert.equal(progress[9], 100);
    assert(progress.every((value, index) => !index || value > progress[index - 1]));
    await page.clock.runFor(1000);
    const stages = [await label()];
    assert.equal(stages[0], '升温中');
    for (let second = 11; second < 26; second++) {
      await page.clock.runFor(1000);
      stages.push(await label());
      assert.equal(stages.at(-1), '升温中');
      assert.equal(await page.locator('#preparation-percent').isVisible(), false);
    }
    assert.deepEqual([...new Set(stages)], ['升温中']);
    if (process.env.PREPARATION_OUTPUT) {
      fs.mkdirSync(process.env.PREPARATION_OUTPUT, { recursive: true });
      await page.screenshot({ path: path.join(process.env.PREPARATION_OUTPUT, 'preparing-heating.png') });
    }
    await page.clock.runFor(999);
    assert.equal(await page.locator('#task-panel').getAttribute('data-status'), 'preparing');
    await page.clock.runFor(1);
    assert.equal(await page.locator('#task-panel').getAttribute('data-status'), 'printing');
    assert.equal(await page.locator('#remaining-time').isVisible(), true);
    assert.equal(await page.locator('#pause-print').isVisible(), true);

    await page.goto(preparingUrl.href);
    await page.clock.runFor(14000);
    assert.equal(await label(), '升温中');
    await page.locator('#cancel-print').click();
    await page.locator('#dialog-close').click();
    assert.equal(await page.locator('#task-panel').getAttribute('data-status'), 'preparing');
    await page.locator('#cancel-print').click();
    await page.locator('#dialog-dismiss').click();
    await page.locator('#transition-overlay').waitFor({ state: 'visible' });
    await page.clock.runFor(2100);
    assert.equal(await page.locator('#task-panel').getAttribute('data-status'), 'cancelled');
    await page.goto(preparingUrl.href);
    await page.locator('#cancel-print').click();
    await page.locator('#dialog-confirm').click();
    await page.locator('#transition-overlay').waitFor({ state: 'visible' });
    await page.clock.runFor(2100);
    assert.equal(await page.locator('#task-panel').getAttribute('data-status'), 'cancelled-all');
    assert.deepEqual(errors, []);
    console.log('PASS: analysis progresses to 100% then heating only; print at 26s; dismiss and confirm cancellation; no page errors.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
