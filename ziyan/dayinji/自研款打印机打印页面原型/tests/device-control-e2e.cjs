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
    await page.locator('#printer-settings').click();
    assert.equal(await page.locator('#open-device-control').count(), 1, 'Settings must include device control');
    const settingsLayout = await page.evaluate(() => {
      const rect = id => document.querySelector(id).getBoundingClientRect();
      return rect('#open-device-control').top >= rect('#open-print-options').bottom - 1 && rect('#open-timelapse-settings').top > rect('#open-device-control').bottom;
    });
    assert(settingsLayout);
    await page.locator('#open-device-control').click();
    await page.locator('#open-motion-control').click();
    const values = () => page.locator('[data-axis-value]').allTextContents();
    assert.deepEqual(await values(), ['0', '180', '180']);
    await page.locator('[data-move-step="1"]').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('[data-move-step="5"]').getAttribute('aria-checked'), 'true');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.locator('[data-move-step="1"]').getAttribute('aria-checked'), 'true');
    await page.locator('[data-axis="x"][data-direction="-1"]').click();
    assert.equal(await page.locator('#toast').textContent(), '可调节范围是0-180mm');
    assert.deepEqual(await values(), ['0', '180', '180']);
    for (const step of [1, 5, 10]) {
      await page.locator(`[data-move-step="${step}"]`).click();
      assert.equal(await page.locator(`[data-move-step="${step}"]`).getAttribute('aria-checked'), 'true');
      await page.locator('[data-axis="x"][data-direction="1"]').click();
    }
    assert.deepEqual(await values(), ['16', '180', '180']);
    await page.locator('[data-axis="x"][data-direction="-1"]').click();
    assert.equal((await values())[0], '6');
    await page.locator('[data-move-step="1"]').click();
    for (const axis of ['y', 'z']) {
      await page.locator(`[data-axis="${axis}"][data-direction="1"]`).click();
      assert.equal(await page.locator(`[data-axis-value="${axis}"]`).textContent(), '180');
      await page.locator(`[data-axis="${axis}"][data-direction="-1"]`).click();
      assert.equal(await page.locator(`[data-axis-value="${axis}"]`).textContent(), '179');
    }
    await page.locator('#motor-release').click();
    assert.equal(await page.locator('#motor-release').getAttribute('aria-checked'), 'true');
    await page.locator('#motion-reset').click();
    assert.deepEqual(await values(), ['0', '180', '180']);
    assert.equal(await page.locator('#motor-release').getAttribute('aria-checked'), 'false');
    await page.clock.runFor(2000);
    if (process.env.CONTROL_SHOTS) await page.locator('#motion-control-screen').screenshot({ animations: 'disabled', path: path.join(process.env.CONTROL_SHOTS, 'device-motion.png') });
    await page.locator('#motion-control-back').click();
    await page.locator('#exterior-light').click();
    assert.equal(await page.locator('#exterior-light').getAttribute('aria-checked'), 'true');
    await page.locator('#open-temperature-control').click();
    assert.equal(await page.locator('#nozzle-current').textContent(), '110');
    assert.equal(await page.locator('#nozzle-target').textContent(), '200');
    if (process.env.CONTROL_SHOTS) await page.locator('#temperature-screen').screenshot({ animations: 'disabled', path: path.join(process.env.CONTROL_SHOTS, 'device-temperature.png') });
    await page.locator('#temperature-heat').click();
    assert.equal(await page.locator('#temperature-screen').getAttribute('data-operation'), 'idle');
    await page.locator('#edit-nozzle-target').click();
    for (const value of ['', '189', '261']) {
      await page.locator('#nozzle-target-input').fill(value);
      await page.locator('#save-nozzle-target').click();
      assert.equal(await page.locator('#temperature-target-dialog').isVisible(), true);
      assert.equal(await page.locator('#temperature-target-error').isVisible(), true);
    }
    await page.locator('#nozzle-target-input').fill('190');
    await page.locator('#save-nozzle-target').click();
    assert.equal(await page.locator('#nozzle-target').textContent(), '190');
    await page.locator('#edit-nozzle-target').click();
    await page.locator('#nozzle-target-input').fill('260');
    await page.locator('#save-nozzle-target').click();
    assert.equal(await page.locator('#nozzle-target').textContent(), '260');
    await page.clock.runFor(2000);
    await page.locator('#edit-nozzle-target').click();
    await page.locator('#nozzle-target-input').fill('210');
    await page.clock.runFor(300);
    await page.locator('#nozzle-target-input').click();
    const drawerBox = await page.locator('#temperature-target-dialog').boundingBox();
    const temperatureBox = await page.locator('#temperature-screen').boundingBox();
    assert(drawerBox.y >= temperatureBox.y && drawerBox.y + drawerBox.height <= temperatureBox.y + temperatureBox.height + 1, JSON.stringify({ drawerBox, temperatureBox }));
    if (process.env.CONTROL_SHOTS) await page.screenshot({ animations: 'disabled', path: path.join(process.env.CONTROL_SHOTS, 'device-temperature-drawer.png'), clip: temperatureBox });
    await page.locator('#close-temperature-target').click();
    assert.equal(await page.locator('#nozzle-target').textContent(), '260');
    await page.locator('#edit-nozzle-target').click();
    await page.locator('#nozzle-target-input').fill('220');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#nozzle-target').textContent(), '260');
    for (const operation of ['heat', 'cool']) {
      const before = Number(await page.locator('#nozzle-current').textContent());
      await page.locator(`#temperature-${operation}`).click();
      assert.equal(await page.locator(`#temperature-${operation}`).textContent(), '取消');
      await page.clock.runFor(900);
      const after = Number(await page.locator('#nozzle-current').textContent());
      assert(operation === 'heat' ? after > before : after < before);
      if (process.env.CONTROL_SHOTS) await page.locator('#temperature-screen').screenshot({ animations: 'disabled', path: path.join(process.env.CONTROL_SHOTS, `device-temperature-${operation}.png`) });
      await page.locator(`#temperature-${operation}`).click();
      assert.equal(await page.locator('#temperature-cancel-dialog').isVisible(), true);
      await page.locator('#temperature-keep-operation').click();
      assert.equal(await page.locator('#temperature-screen').getAttribute('data-operation'), operation);
      await page.locator(`#temperature-${operation}`).click();
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#temperature-screen').getAttribute('data-operation'), operation);
      await page.locator(`#temperature-${operation}`).click();
      await page.locator('#temperature-confirm-cancel').click();
      assert.equal(await page.locator('#temperature-screen').getAttribute('data-operation'), 'idle');
      const stopped = await page.locator('#nozzle-current').textContent();
      await page.clock.runFor(900);
      assert.equal(await page.locator('#nozzle-current').textContent(), stopped);
    }
    await page.locator('#temperature-heat').click();
    await page.clock.runFor(20000);
    assert.equal(await page.locator('#nozzle-current').textContent(), '260');
    assert.equal(await page.locator('#temperature-screen').getAttribute('data-operation'), 'idle');
    await page.locator('#temperature-cool').click();
    await page.clock.runFor(30000);
    assert.equal(await page.locator('#nozzle-current').textContent(), '25');
    await page.locator('#temperature-back').click();
    assert.equal(await page.locator('#exterior-light').getAttribute('aria-checked'), 'true');
    await page.locator('#open-level-calibration').click();
    assert.equal(await page.locator('#device-control-screen').isVisible(), true);
    for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 320, height: 568 }]) {
      await page.setViewportSize(viewport);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.locator('#open-motion-control').click();
      await page.locator('#motion-reset').click();
      await page.locator('#motion-control-back').click();
    }
    if (process.env.CONTROL_SHOTS) {
      await page.clock.runFor(2000);
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.locator('#device-control-screen').screenshot({ animations: 'disabled', path: path.join(process.env.CONTROL_SHOTS, 'device-control-menu.png') });
    }
    await page.locator('#device-control-back').click();
    assert.equal(await page.locator('#device-settings-screen').isVisible(), true);
    if (process.env.CONTROL_SHOTS) await page.locator('#device-settings-screen').screenshot({ animations: 'disabled', path: path.join(process.env.CONTROL_SHOTS, 'device-settings-control.png') });
    await page.locator('#device-settings-back').click();
    assert.equal(await page.locator('#device-page').getAttribute('inert'), null);
    assert.deepEqual(errors, []);
    console.log('PASS: settings entry, XYZ steps/bounds/reset, motor release, light, target drawer/range, heating/cooling/cancel/completion, navigation and responsive layout');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });

