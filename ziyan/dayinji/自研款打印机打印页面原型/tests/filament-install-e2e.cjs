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
    const panel = page.locator('.filament-panel');
    const guide = page.locator('#filament-guide-screen');
    const operation = page.locator('#filament-operation-screen');
    const missing = page.locator('#filament-not-detected-dialog');
    const state = () => page.evaluate(() => ({ ...window.__filamentOperation.state }));
    const actionsEnabled = async () => {
      for (const id of ['load-filament', 'unload-filament']) {
        assert.equal(await page.locator('#' + id).isEnabled(), true);
        assert.equal(await page.locator('#' + id).evaluate(el => el.classList.contains('is-active')), true);
      }
    };
    const shot = async (locator, name) => {
      if (process.env.FILAMENT_INSTALL_SHOTS) await locator.screenshot({ animations: 'disabled', path: path.join(process.env.FILAMENT_INSTALL_SHOTS, name + '.png') });
    };
    await actionsEnabled();
    assert.equal(await page.locator('#filament-spool').getAttribute('aria-pressed'), 'false');
    await page.locator('#unload-filament').click();
    assert.equal(await page.locator('#filament-guide-title').textContent(), '退出耗材');
    await page.locator('#filament-guide-back').click();
    await page.locator('#simulate-filament-empty').click();
    assert.equal(await panel.getAttribute('data-filament-installation'), 'first-install');
    assert.match(await page.locator('#simulation-filament-status').textContent(), /首次安装耗材/);
    await actionsEnabled();
    await shot(panel, 'first-install-panel');
    await page.locator('#load-filament').click();
    assert.equal(await guide.isVisible(), true, 'Panel entry opens the guide before checking the sensor');
    assert.equal(await missing.isVisible(), false);
    assert.equal((await state()).running, false);
    await page.locator('#filament-guide-start').click();
    assert.equal(await missing.isVisible(), true);
    assert.equal(await page.locator('#filament-not-detected-copy').textContent(), '当前打印机未检测到耗材进入，请安装耗材并将耗材插入至喷头不能移动为止');
    assert.equal(await missing.locator('button').count(), 1);
    assert.equal(await missing.evaluate(el => el.matches(':modal')), true, 'Missing-material feedback blocks the guide until acknowledged');
    await page.clock.runFor(20000);
    assert.equal((await state()).running, false, 'Missing material must not start the heater or operation timer');
    assert.equal(await operation.isVisible(), false);
    await shot(page.locator('body'), 'no-material-dialog');
    await page.locator('#filament-not-detected-ok').click();
    assert.equal(await missing.isVisible(), false);
    assert.equal(await guide.isVisible(), true, 'Acknowledgement stays on the installation guide');
    await page.locator('#simulation-filament-sensor').selectOption('present');
    assert.equal(await guide.isVisible(), true, 'A sensor result does not reset navigation');
    assert.equal(await page.locator('#filament-spool').getAttribute('aria-pressed'), 'false');
    await page.locator('#filament-guide-start').click();
    assert.equal(await guide.isVisible(), false);
    assert.equal(await operation.isVisible(), true);
    assert.equal(await page.locator('#device-page').evaluate(el => el.inert), true);
    assert.equal((await state()).operation, 'feed');
    await actionsEnabled();
    assert.equal(await page.locator('#filament-operation-steps .fo-step:visible').count(), 2);
    assert.deepEqual(await page.evaluate(() => window.__filamentOperation.nodeLabels()), ['加热喷嘴温度', '吐出耗材丝']);
    await page.clock.runFor(10000);
    assert.equal((await state()).step, 2);
    assert.equal(await page.locator('#filament-operation-label').textContent(), '吐出耗材丝');
    assert.equal(await page.locator('#filament-operation-banner').getAttribute('data-tone'), 'info');
    await shot(operation, 'feed-extruding');
    // Returning and choosing the opposite operation must not replace the running feed.
    await page.locator('#filament-operation-back').click();
    const before = await state();
    await page.locator('#unload-filament').click();
    await page.locator('#filament-guide-start').click();
    assert.equal(await guide.isVisible(), true);
    assert.equal((await state()).operation, 'feed');
    assert.equal((await state()).elapsed, before.elapsed);
    await page.locator('#filament-guide-back').click();
    await page.locator('#simulation-filament-sensor').selectOption('absent');
    await page.locator('#load-filament').click();
    assert.equal(await guide.isVisible(), false, '进料中入口直接进入进度页，不再经过安装引导');
    assert.equal(await missing.isVisible(), false, '恢复运行中进度不重复检查安装传感器');
    assert.equal(await operation.isVisible(), true);
    assert.equal((await state()).elapsed, before.elapsed, '回到进料进度页保留计时');
    assert.equal((await state()).step, 2, 'Resuming must not restart heating');
    await shot(operation, 'feed-resumed-direct');
    await page.clock.runFor(5000);
    assert.equal((await state()).done, true, 'Feed completes after heat + extrusion, without a pull-back stage');
    assert.equal(await page.locator('#filament-operation-label').textContent(), '进料完成');
    await actionsEnabled();
    await page.locator('#filament-operation-primary').click();
    assert.equal(await panel.getAttribute('data-filament-state'), 'loaded');
    await actionsEnabled();
    // Retraction is still available in the first-install state, without any selection or sensor gate.
    await page.locator('#simulate-filament-empty').click();
    await page.locator('#unload-filament').click();
    await page.locator('#filament-guide-start').click();
    assert.equal((await state()).operation, 'retract');
    assert.equal((await state()).running, true);
    assert.equal(await page.locator('#filament-operation-steps .fo-step:visible').count(), 3);
    await page.clock.runFor(5000);
    await page.locator('#filament-operation-back').click();
    const retractBefore = await state();
    assert.match(await page.locator('#unload-filament').textContent(), /退料中/);
    await page.locator('#unload-filament').click();
    assert.equal(await guide.isVisible(), false, '退料中入口直接进入进度页，不再经过退出引导');
    assert.equal(await operation.isVisible(), true);
    assert.equal((await state()).operation, 'retract');
    assert.equal((await state()).elapsed, retractBefore.elapsed, '回到退料进度页保留计时');
    assert.equal((await state()).step, retractBefore.step, '回到退料进度页保留当前步骤');
    await shot(operation, 'retract-resumed-direct');
    await page.clock.runFor(15000);
    assert.equal((await state()).done, true);
    assert.equal(await page.locator('#filament-operation-label').textContent(), '退料完成，请将耗材从料管中抽出');
    for (const width of [320, 375]) {
      await page.setViewportSize({ width, height: 812 });
      assert.equal(await operation.evaluate(el => el.scrollWidth <= el.clientWidth), true);
      const label = page.locator('#filament-operation-label');
      assert.equal(await label.evaluate(el => el.scrollHeight <= el.clientHeight), true);
      await shot(operation, 'retract-completed-' + width);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('#filament-operation-primary').click();
    assert.equal(await panel.getAttribute('data-filament-state'), 'retracted');
    await actionsEnabled();
    await page.locator('#unload-filament').click();
    await page.locator('#filament-guide-start').click();
    await page.locator('#filament-operation-primary').click();
    await page.locator('#filament-cancel-confirm').click();
    await page.waitForFunction(() => !window.__filamentOperation.state.running);
    await actionsEnabled();
    // Sensor signal, not an existing/selected spool, determines whether the guide may feed.
    await page.locator('#simulate-filament-detected').click();
    await page.locator('#filament-detected-ok').click();
    await page.locator('#filament-spool').click();
    await page.locator('#simulation-filament-sensor').selectOption('absent');
    await page.locator('#load-filament').click();
    await page.locator('#filament-guide-start').click();
    assert.equal(await missing.isVisible(), true);
    assert.equal((await state()).running, false);
    await page.locator('#filament-not-detected-ok').click();
    for (const width of [320, 375, 768]) {
      await page.setViewportSize({ width, height: 812 });
      await page.locator('#filament-guide-start').click();
      const box = await missing.boundingBox();
      assert(box.x >= 0 && box.x + box.width <= width);
      assert.equal(await missing.evaluate(el => el.scrollWidth <= el.clientWidth), true);
      await page.locator('#filament-not-detected-ok').click();
      assert.equal(await guide.isVisible(), true);
    }
    assert.deepEqual(errors, []);
    console.log('PASS: always-enabled actions, first installation, sensor-gated guide, missing-material acknowledgement, two-stage feed, resume/conflict protection, retraction and responsive dialog');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
