const { chromium } = require('C:/Users/MECHREVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const shots = process.env.FAMILY_PREPARE_SHOTS || fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'family-prepare-'));
const base = process.env.PRINTER_PAGE_URL || 'http://127.0.0.1:8765/dayinji/' + encodeURIComponent('自研款打印机打印页面原型') + '/index.html';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--host-resolver-rules=MAP jing200327-cmyk.github.io 185.199.109.153'] });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(base + '?simulation=family&family=multi&screen=family-prepare&status=printing&queue=plate-2,plate-3&plate=1');
    const leveling = page.locator('#family-leveling-toggle');
    assert.equal(await leveling.getAttribute('aria-checked'), 'false');
    await leveling.click(); assert.equal(await leveling.getAttribute('aria-checked'), 'true');
    await leveling.press('Space'); assert.equal(await leveling.getAttribute('aria-checked'), 'false');
    assert.equal(await page.locator('#family-timelapse-toggle').getAttribute('aria-checked'), 'true');
    const rows = page.locator('#family-plate-list .family-plate-row');
    await rows.nth(1).locator('.plate-row-hit').press('Enter');
    const selectedName = (await rows.nth(1).locator('.prepare-model-name').textContent()).trim();
    await page.locator('#family-save-slice').click();
    assert.equal(await page.locator('#slice-name').inputValue(), selectedName);
    await page.locator('#slice-name').fill('   '); assert(await page.locator('#slice-name-confirm').isDisabled());
    assert.equal(await page.locator('#slice-name-error').textContent(), '名称不能为空');
    await page.locator('#slice-name-cancel').click(); assert(await page.locator('#family-prepare-screen').isVisible());
    await page.locator('#family-save-slice').click(); assert.equal(await page.locator('#slice-name').inputValue(), selectedName);
    await page.locator('#slice-name').fill('  家庭切片  '); await page.locator('#slice-name-confirm').click();
    assert(await page.locator('#slice-saving-dialog').isVisible());
    await page.locator('#slice-success-dialog').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#slice-saved-name').textContent(), '家庭切片');
    await page.locator('#slice-save-done').click(); assert(await page.locator('#family-save-slice').evaluate(e => e === document.activeElement));
    assert.equal(await rows.nth(1).getAttribute('aria-selected'), 'true');
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const save = await page.locator('#family-save-slice').boundingBox(), submit = await page.locator('#family-submit').boundingBox();
      assert(save.x + save.width < submit.x); assert(Math.abs(save.y - submit.y) < 1);
      const options = await page.locator('#family-prepare-screen .prepare-options').boundingBox(), summary = await page.locator('#family-prepare-summary').boundingBox();
      assert(options.y + options.height < summary.y);
      await page.screenshot({ path: path.join(shots, `family-${width}.png`) });
    }
    await page.locator('#family-submit').click();
    await page.locator('[data-queue-id="girl-1"]').click();
    assert(await leveling.isEnabled()); assert(await page.locator("#family-switch-printer").isHidden()); assert(await page.locator('#family-submit').isDisabled());
    await page.locator('#family-save-slice').click(); assert(await page.locator('#slice-name-dialog').isVisible());
    await page.locator('#slice-name-cancel').click();
    // Existing prepare page still uses the selected plate, validation and shared save flow.
    await page.goto(base + '?screen=prepare-print');
    await page.locator('#leveling-toggle').click(); assert.equal(await page.locator('#leveling-toggle').getAttribute('aria-checked'), 'true');
    const originalName = (await page.locator('#prepare-plate-list .plate-row:has(.prepare-plate-check:checked) .prepare-model-name').first().textContent()).trim();
    await page.locator('#save-slice').click(); assert.equal(await page.locator('#slice-name').inputValue(), originalName.slice(0, 40));
    await page.locator('#slice-name-confirm').click(); await page.locator('#slice-success-dialog').waitFor({ state: 'visible' });
    await page.locator('#slice-view-now').click();
    assert(await page.locator('#save-slice').evaluate(e => e === document.activeElement));
    assert.match(await page.locator('#toast').innerText(), /我的切片/);
    assert.deepEqual(errors, []); console.log(JSON.stringify({ ok: true, errors, shots, base }));
  } finally { await browser.close(); }
})();
