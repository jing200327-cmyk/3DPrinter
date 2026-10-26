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
    await page.clock.install(); await page.clock.pauseAt(new Date());
    const queue = () => page.locator('[data-queue-task]:not([hidden])').evaluateAll(rows => rows.map(row => row.dataset.queueId));
    const shot = async (id, name) => {
      if (process.env.FAMILY_SHOTS) await page.locator(id).screenshot({ animations: 'disabled', path: path.join(process.env.FAMILY_SHOTS, name + '.png') });
    };
    await page.goto(base + '?status=printing');
    await page.clock.runFor(7000);
    const originalTime = await page.locator('#remaining-time').textContent();
    const originalImage = await page.locator('#active-task-image').getAttribute('src');
    assert.deepEqual(await queue(), ['plate-2', 'plate-3']);
    await page.locator('#simulate-family').click();
    assert.equal(await page.locator('#family-prepare-screen').isVisible(), true);
    assert.equal(await page.locator('#family-prepare-stage .prepare-idle').textContent(), '忙碌');
    assert.equal(await page.locator('#family-submit').textContent(), '加入打印队列');
    assert.equal(await page.locator('#family-submit').isEnabled(), true);
    assert.equal(await page.locator('#family-plate-list .family-plate-row').count(), 2);
    assert.deepEqual(await page.locator('#family-plate-list .prepare-plate-stats').allTextContents(), ['5 h 37 min40 g', '48 min5 g']);
    assert.deepEqual(await queue(), ['plate-2', 'plate-3'], 'Opening draft does not submit tasks');
    await page.waitForFunction(() => [...document.querySelectorAll('#family-plate-list img')].every(img => img.complete && img.naturalWidth > 0));
    await shot('#family-prepare-screen', 'family-prepare');
    await page.locator('#family-plate-list [data-plate="girl-2"] .plate-3d-btn').click();
    assert.equal(await page.locator('#preview-3d-screen').isVisible(), true);
    assert.match(await page.locator('#pv3d-model-name').textContent(), /骨架沧龙_02_011405/);
    assert.match(await page.locator('#pv3d-meta').textContent(), /48 min/);
    await page.locator('#preview-3d-back').click();
    assert.equal(await page.locator('#family-prepare-screen').isVisible(), true);
    // Real pointer drag reverses both submission order and the subsequent queue order.
    const second = page.locator('#family-plate-list [data-plate="girl-2"] .plate-row-hit');
    const firstBox = await page.locator('#family-plate-list [data-plate="girl-1"]').boundingBox();
    const secondBox = await second.boundingBox();
    await page.mouse.move(secondBox.x + secondBox.width - 12, secondBox.y + secondBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(secondBox.x + secondBox.width - 12, firstBox.y + firstBox.height / 2, { steps: 10 });
    await page.mouse.up();
    assert.equal(await page.locator('#family-plate-list [data-plate="girl-2"]').getAttribute('data-slot'), '0');
    await shot('#family-prepare-screen', 'family-prepare-reordered');
    await page.locator('#family-submit').click();
    assert.equal(await page.locator('#family-prepare-screen').isVisible(), false);
    assert.equal(await page.locator('#task-panel').getAttribute('data-status'), 'printing');
    assert.equal(await page.locator('#remaining-time').textContent(), originalTime, 'Joining queue must not reset current print timer');
    assert.equal(await page.locator('#active-task-image').getAttribute('src'), originalImage);
    assert.deepEqual(await queue(), ['plate-2', 'plate-3', 'girl-2', 'girl-1']);
    assert.match(await page.locator('#queue-toggle small').textContent(), /4/);
    for (const [id, owner] of [['plate-2', 'boy'], ['plate-3', 'boy'], ['girl-2', 'girl'], ['girl-1', 'girl']]) {
      const card = page.locator(`[data-queue-id="${id}"]`);
      assert.equal(await card.getAttribute('data-owner'), owner);
      assert.match(await card.getAttribute('class'), new RegExp(`owner-task-card--${owner}`));
      assert.match(await card.locator('.task-owner-avatar').getAttribute('src'), new RegExp(owner === 'girl' ? '女孩' : '男孩'));
    }
    await page.waitForFunction(() => [...document.querySelectorAll('[data-queue-task]:not([hidden]) img')].every(img => img.complete && img.naturalWidth > 0));
    await shot('#task-panel', 'family-workbench-queue');
    for (const id of ['girl-1', 'girl-2']) {
      await page.locator(`[data-queue-id="${id}"]`).click();
      assert.equal(await page.locator('#family-submit').isDisabled(), true);
      assert.equal(await page.locator(`#family-plate-list [data-plate="${id}"]`).getAttribute('aria-selected'), 'true');
      if (id === 'girl-1') await shot('#family-prepare-screen', 'family-queued-readonly');
      await page.locator('#family-prepare-back').click();
      assert.deepEqual(await queue(), ['plate-2', 'plate-3', 'girl-2', 'girl-1']);
      assert.equal(await page.locator('#device-page').getAttribute('inert'), null);
    }
    await page.reload();
    assert.deepEqual(await queue(), ['plate-2', 'plate-3', 'girl-2', 'girl-1'], 'Refresh preserves appended order');
    await page.locator('#simulate-family').click();
    assert.equal(await page.locator('#family-submit').isDisabled(), true, 'Repeated entry must not submit duplicates');
    await page.locator('#family-prepare-back').click();
    await page.locator('#finish-now').click();
    if (await page.locator('#print-queue').isHidden()) await page.locator('#queue-toggle').click();
    await page.locator('[data-queue-id="girl-2"]').click();
    assert.equal(await page.locator('#family-submit').isDisabled(), true, 'Pending family task cannot bypass FIFO after current print completes');
    await page.locator('#family-prepare-back').click();
    // Each smaller device can enter from the collapsed console and return without submission.
    for (const viewport of [{ width: 375, height: 812 }, { width: 320, height: 568 }]) {
      await page.setViewportSize(viewport); await page.goto(base + '?status=ready');
      await page.locator('#simulation-console summary').click();
      await page.locator('#simulate-family').click();
      await page.waitForURL(url => url.searchParams.get('screen') === 'family-prepare');
      assert.equal(await page.locator('#family-prepare-screen').isVisible(), true);
      assert.equal(await page.locator('#simulation-console').getAttribute('open'), null);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.locator('#family-prepare-back').click();
      assert.deepEqual(await queue(), ['plate-2', 'plate-3']);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(base + '?status=printing&plates=single');
    await page.locator('#simulate-family').click();
    await page.waitForURL(url => url.searchParams.get('screen') === 'family-prepare' && !url.searchParams.has('plates'));
    assert.deepEqual(await queue(), ['plate-2', 'plate-3']);
    await page.locator('#family-prepare-back').click();
    await page.locator('#simulate-single').click();
    await page.waitForURL(url => url.searchParams.get('plates') === 'single');
    assert.equal(new URL(page.url()).searchParams.has('simulation'), false);
    assert.deepEqual(await queue(), []);
    assert.deepEqual(errors, []);
    console.log('PASS: busy two-plate draft, metadata/3D, pointer sorting, atomic append, preserved print/old queue, role avatars/colors, readonly details/return, reload, deduplication and phone layouts');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
