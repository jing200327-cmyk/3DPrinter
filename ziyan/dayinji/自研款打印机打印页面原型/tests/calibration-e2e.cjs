const { chromium } = require('C:/Users/MECHREVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const base = process.env.PRINTER_PAGE_URL || pathToFileURL(path.join(__dirname, '../index.html')).href;
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await page.goto(base);
    const shot = async name => {
      if (process.env.CONTROL_SHOTS) await page.screenshot({ animations: 'disabled', clip: await page.locator('#calibration-screen').boundingBox(), path: path.join(process.env.CONTROL_SHOTS, `calibration-${name}.png`) });
    };
    const waitDone = async () => {
      assert.equal(await page.locator('#calibration-processing-dialog').isVisible(), true);
      assert.equal(await page.locator('#calibration-processing-dialog button').count(), 0);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#calibration-processing-dialog').isVisible(), true, 'Escape must not skip processing');
      await page.clock.runFor(2999);
      assert.equal(await page.locator('#calibration-processing-dialog').isVisible(), true, 'Waiting must last the full 3 seconds');
      await page.clock.runFor(1);
      assert.equal(await page.locator('#calibration-processing-dialog').isVisible(), false);
    };
    const step = () => page.locator('#calibration-step').textContent();
    const offset = () => page.locator('#calibration-offset').textContent();
    await page.locator('#printer-settings').click();
    await page.locator('#open-device-control').click();
    await page.locator('#open-level-calibration').click();
    assert.equal(await page.locator('#calibration-clean-stage').isVisible(), true);
    await page.waitForFunction(() => { const img = document.querySelector('.calibration-clean-photo img'); return img.complete && img.naturalWidth > 0; });
    await shot('clean');
    await page.locator('#calibration-continue').click();
    await shot('processing');
    assert.equal(await page.locator('#calibration-clean-stage').isVisible(), true);
    // Native modal must intercept a real click at the underlying exit button.
    const exitBox = await page.locator('#calibration-exit').boundingBox();
    await page.mouse.click(exitBox.x + exitBox.width / 2, exitBox.y + exitBox.height / 2);
    assert.equal(await page.locator('#calibration-exit-dialog').isVisible(), false);
    await waitDone();
    assert.equal(await step(), '1');
    assert.equal(await offset(), '-0.3 mm');
    await shot('point-1');
    await page.locator('#calibration-up').click();
    assert.equal(await offset(), '-0.3 mm', 'Offset commits after device wait');
    await waitDone();
    assert.equal(await offset(), '-0.2 mm');
    assert.equal(await page.locator('#calibration-up').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#calibration-up').evaluate(el => getComputedStyle(el).color), 'rgb(255, 255, 255)');
    await shot('arrow-selected');
    await page.locator('#calibration-down').click();
    await waitDone();
    assert.equal(await offset(), '-0.3 mm');
    assert.equal(await page.locator('#calibration-up').getAttribute('aria-pressed'), 'false');
    assert.equal(await page.locator('#calibration-down').getAttribute('aria-pressed'), 'true');
    // Decimal operations must not accumulate floating point display errors.
    for (let n = 0; n < 3; n++) { await page.locator('#calibration-up').click(); await waitDone(); }
    assert.equal(await offset(), '0.0 mm');
    const order = [6, 7, 8, 5, 4, 3, 0, 1, 2];
    for (let n = 0; n < order.length; n++) {
      assert.equal(await step(), String(n + 1));
      assert.equal(await page.locator('.calibration-point[data-state="current"]').getAttribute('data-position'), String(order[n]));
      assert.equal(await page.locator('.calibration-point[data-state="complete"]').count(), n);
      for (let previous = 0; previous < n; previous++) assert.equal(await page.locator(`[data-position="${order[previous]}"]`).getAttribute('data-state'), 'complete');
      if ([1, 7].includes(n)) await shot(`point-${n + 1}`);
      if (n < 8) {
        await page.locator('#calibration-next').click();
        assert.equal(await step(), String(n + 1));
        await waitDone();
      }
    }
    assert.equal(await page.locator('#calibration-next').textContent(), '完成');
    await page.locator('#calibration-retry').click();
    await waitDone();
    assert.equal(await step(), '1');
    assert.equal(await offset(), '-0.3 mm');
    assert.equal(await page.locator('.calibration-point[data-state="complete"]').count(), 0);
    await page.locator('#calibration-down').click(); await waitDone();
    await page.locator('#calibration-exit').click();
    await shot('exit');
    assert.equal(await page.locator('#calibration-exit-title').textContent(), '退出设置的参数将全部丢失');
    await page.locator('#calibration-exit-cancel').click();
    assert.equal(await offset(), '-0.4 mm');
    await page.locator('#calibration-exit').click();
    await page.locator('#calibration-exit-confirm').click();
    assert.equal(await page.locator('#calibration-screen').isVisible(), true);
    await waitDone();
    assert.equal(await page.locator('#device-control-screen').isVisible(), true);
    await page.locator('#open-level-calibration').click();
    assert.equal(await page.locator('#calibration-clean-stage').isVisible(), true);
    await page.locator('#calibration-continue').click(); await waitDone();
    assert.equal(await offset(), '-0.3 mm', 'Confirmed exit discards draft');
    for (let n = 0; n < 9; n++) { await page.locator('#calibration-next').click(); await waitDone(); }
    assert.equal(await page.locator('#device-control-screen').isVisible(), true);
    assert.equal(await page.locator('#toast').textContent(), '调平校准已完成');
    assert.deepEqual(JSON.parse(await page.locator('#calibration-screen').getAttribute('data-completed-offsets')), [-0.3, 0.2, 0, 0, 0, 0, 0, -0.1, 0]);
    // No accumulated navigation entries after completion and exit/re-entry.
    await page.locator('#device-control-back').click();
    assert.equal(await page.locator('#device-settings-screen').isVisible(), true);
    for (const viewport of [{ width: 768, height: 1024 }, { width: 375, height: 812 }, { width: 320, height: 568 }]) {
      await page.setViewportSize(viewport);
      await page.locator('#open-device-control').click();
      await page.locator('#open-level-calibration').click();
      await page.locator('#calibration-continue').click(); await waitDone();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.locator('#calibration-down').click(); await waitDone();
      if (viewport.width === 320) await shot('mobile-320');
      await page.locator('#calibration-exit').click();
      await page.locator('#calibration-exit-confirm').click(); await waitDone();
      await page.locator('#device-control-back').click();
    }
    assert.deepEqual(errors, []);
    console.log('PASS: clean stage, exact 3s blocking modal, Escape/mouse interception, 0.1mm offsets, retained arrow style, 9-point S order, retry, exit/discard, completion, navigation and phone/tablet layouts');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
