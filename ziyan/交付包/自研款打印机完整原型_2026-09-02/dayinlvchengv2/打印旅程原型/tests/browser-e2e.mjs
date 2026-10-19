import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ziyan-journey-v2-'));
const pageUrl = pathToFileURL(path.join(root, 'index.html')).href;
const previews = {
  create: path.join(root, 'prototype-v2-create.png'),
  build: path.join(root, 'prototype-v2-build.png'),
  color: path.join(root, 'prototype-v2-color.png'),
  picker: path.join(root, 'prototype-v2-picker.png'),
  printing: path.join(root, 'prototype-v2-printing.png'),
  printingColorLocked: path.join(root, 'prototype-v2-printing-color-locked.png'),
  completed: path.join(root, 'prototype-v2-completed.png'),
  onePending: path.join(root, 'prototype-v2-one-pending.png'),
  allCompleted: path.join(root, 'prototype-v2-all-completed.png')
};

const chrome = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=0',
  `--user-data-dir=${profileDir}`, '--window-size=390,844', pageUrl
], { stdio: 'ignore' });
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function waitForPort() {
  const portFile = path.join(profileDir, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (fs.existsSync(portFile)) return fs.readFileSync(portFile, 'utf8').split(/\r?\n/)[0];
    await delay(100);
  }
  throw new Error('Chrome DevTools port was not created.');
}

function connect(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  const events = [];
  let sequence = 0;
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const request = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
    } else events.push(message);
  });
  return {
    events,
    ready: new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    }),
    send(method, params = {}) {
      sequence += 1;
      return new Promise((resolve, reject) => {
        pending.set(sequence, { resolve, reject });
        socket.send(JSON.stringify({ id: sequence, method, params }));
      });
    },
    close() { socket.close(); }
  };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || 'Runtime evaluation failed.');
  return result.result.value;
}

async function waitFor(cdp, expression, message) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { if (await evaluate(cdp, expression)) return; } catch { /* navigation */ }
    await delay(100);
  }
  throw new Error(message);
}

async function screenshot(cdp, targetPath) {
  const image = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(targetPath, Buffer.from(image.data, 'base64'));
}

try {
  const port = await waitForPort();
  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
  const target = targets.find((item) => item.type === 'page');
  assert(target, 'No browser page target was found.');
  const cdp = connect(target.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  await cdp.send('Log.enable');
  await cdp.send('Accessibility.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await cdp.send('Page.reload');
  await delay(650);

  const createButton = await evaluate(cdp, `(() => {
    const button = document.querySelector('#print-now');
    const settingsButton = document.querySelector('#model-settings');
    const rect = button.getBoundingClientRect();
    const settingsRect = settingsButton.getBoundingClientRect();
    const style = getComputedStyle(button);
    const settingsStyle = getComputedStyle(settingsButton);
    return {
      text: button.textContent.trim(), width: rect.width, height: rect.height,
      right: innerWidth - rect.right, bottomRatio: (innerHeight - rect.bottom) / innerHeight,
      radius: style.borderRadius, background: style.backgroundColor, color: style.color,
      settings: {
        text: settingsButton.textContent.trim(), width: settingsRect.width, height: settingsRect.height,
        gap: rect.left - settingsRect.right, bottomDelta: Math.abs(rect.bottom - settingsRect.bottom),
        radius: settingsStyle.borderRadius, background: settingsStyle.backgroundColor, color: settingsStyle.color
      }
    };
  })()`);
  assert(createButton.text === 'Create it', 'Start-page button label is incorrect.');
  assert(Math.round(createButton.width) === 172 && Math.round(createButton.height) === 52, 'Create it must be 172 x 52 pixels.');
  assert(createButton.right >= 7 && createButton.right <= 13, 'Create it is not aligned over the lower-right source button.');
  assert(createButton.bottomRatio > 0.113 && createButton.bottomRatio < 0.125, 'Create it was not moved upward by another 2 pixels.');
  assert(createButton.radius === '8px' && createButton.background === 'rgb(108, 99, 255)' && createButton.color === 'rgb(255, 255, 255)', 'Create it styling is incorrect.');
  assert(createButton.settings.text === 'Settings' && Math.round(createButton.settings.width) === 172 && Math.round(createButton.settings.height) === 52, 'Settings button label or size is incorrect.');
  assert(Math.round(createButton.settings.gap) === 25 && createButton.settings.bottomDelta <= 1, 'Settings must be 25 pixels left of Create it and vertically aligned.');
  assert(createButton.settings.radius === createButton.radius && createButton.settings.background === createButton.background && createButton.settings.color === createButton.color, 'Settings does not reuse the Create it styling.');
  await screenshot(cdp, previews.create);

  await evaluate(cdp, `document.querySelector('#model-settings').click()`);
  await delay(150);
  const buildPage = await evaluate(cdp, `(() => {
    const carousel = document.querySelector('#plate-carousel');
    const card = document.querySelector('[data-plate="1"]');
    const cardRect = card.getBoundingClientRect();
    const contentRect = document.querySelector('.settings-content').getBoundingClientRect();
    return {
      title: document.querySelector('#settings-title').textContent,
      plateVisible: !document.querySelector('#step-plate').hidden,
      materialHidden: document.querySelector('#step-material').hidden,
      button: document.querySelector('#choose-color').textContent.trim(),
      plateCount: document.querySelectorAll('[data-plate]').length,
      cardWidth: cardRect.width, cardHeight: cardRect.height,
      centerDelta: Math.abs((cardRect.left + cardRect.width / 2) - (contentRect.left + contentRect.width / 2)),
      scrollable: carousel.scrollWidth > carousel.clientWidth,
      removed: ['#copy-minus', '#copy-count', '#copy-plus', '#print-calibration', '#timelapse', '#part-title'].every((selector) => !document.querySelector(selector))
    };
  })()`);
  assert(buildPage.title === 'Choose your builder' && buildPage.plateVisible && buildPage.materialHidden, 'Build selection is not the first preparation page.');
  assert(buildPage.button === 'Choose your color', 'Build page action label is incorrect.');
  assert(buildPage.plateCount === 3 && buildPage.scrollable, 'Build page needs three horizontally scrollable plates.');
  assert(Math.round(buildPage.cardWidth) === 322 && buildPage.cardHeight >= 400 && buildPage.centerDelta <= 2, 'Build plates are not large and centered.');
  assert(buildPage.removed, 'Copies, calibration, timelapse, or part selection remains in the new flow.');
  await screenshot(cdp, previews.build);

  const carouselRect = await evaluate(cdp, `(() => { const rect = document.querySelector('#plate-carousel').getBoundingClientRect(); return { left: rect.left, top: rect.top, width: rect.width, height: rect.height }; })()`);
  const swipeY = carouselRect.top + carouselRect.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: carouselRect.left + carouselRect.width * .8, y: swipeY }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: carouselRect.left + carouselRect.width * .2, y: swipeY }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await delay(350);
  const swiped = await evaluate(cdp, `document.querySelector('#plate-carousel').scrollLeft`);
  assert(swiped > 100, 'Touch swipe did not move the build carousel.');
  await evaluate(cdp, `document.querySelector('[data-plate="2"]').click()`);
  assert(await evaluate(cdp, `document.querySelector('.plate-card.is-selected').dataset.plate`) === '2', 'Plate 2 could not be selected.');

  await evaluate(cdp, `document.querySelector('#choose-color').click()`);
  const colorPage = await evaluate(cdp, `(() => ({
    title: document.querySelector('#settings-title').textContent,
    plateHidden: document.querySelector('#step-plate').hidden,
    materialVisible: !document.querySelector('#step-material').hidden,
    foodBox: document.querySelector('label:has(input[value="cfs"])').textContent.trim(),
    foodTray: document.querySelector('label:has(input[value="external"])').textContent.trim(),
    picker: document.querySelector('#filament-choice-title').textContent.trim(),
    action: document.querySelector('#start-print').textContent.trim(),
    preview: decodeURI(document.querySelector('#selected-model-image').currentSrc)
  }))()`);
  assert(colorPage.title === 'Choose  your  color' && colorPage.plateHidden && colorPage.materialVisible, 'Color matching is not the second preparation page.');
  assert(colorPage.foodBox === 'Food Box' && colorPage.foodTray === 'Food Tray', 'Material-source labels are incorrect.');
  assert(colorPage.picker === 'pick your color' && colorPage.action === 'Start Creating', 'Color picker or start action label is incorrect.');
  assert(colorPage.preview.endsWith('选择要打印的盘2（修改）.jpg'), 'Color page did not preserve the selected plate preview.');

  await evaluate(cdp, `document.querySelector('input[value="external"]').click()`);
  assert(await evaluate(cdp, `document.querySelector('#open-filament-picker').disabled`) === true, 'Food Tray should disable the warehouse picker.');
  await evaluate(cdp, `document.querySelector('input[value="cfs"]').click(); document.querySelector('#open-filament-picker').click()`);
  const pickerTitle = await evaluate(cdp, `(() => {
    const title = document.querySelector('#filament-picker-visible-title');
    const style = getComputedStyle(title);
    return { text: title.textContent.trim(), visible: style.display !== 'none' && title.getBoundingClientRect().height > 0 };
  })()`);
  assert(pickerTitle.visible && pickerTitle.text === 'pick your color', 'The opened color picker page title is incorrect.');
  await screenshot(cdp, previews.picker);
  await evaluate(cdp, `document.querySelector('[data-filament-slot="1"]').click(); document.querySelector('#confirm-filament').click()`);
  assert(await evaluate(cdp, `document.querySelector('#filament-slot-number').textContent`) === '1', 'Warehouse color selection did not return slot 1.');
  await screenshot(cdp, previews.color);

  await evaluate(cdp, `document.querySelector('#start-print').click()`);
  await delay(450);
  const upload = await evaluate(cdp, `({ open: document.querySelector('#upload-dialog').open, progress: Number(document.querySelector('#upload-progress').getAttribute('aria-valuenow')) })`);
  assert(upload.open && upload.progress > 0 && upload.progress < 100, 'Two-second upload progress did not start.');
  await waitFor(cdp, `document.title === '自研款打印机打印页面原型' && typeof openPrintSettings === 'function'`, 'Start Creating did not navigate to the printer page.');
  const printer = await evaluate(cdp, `(() => ({
    plate: new URLSearchParams(location.search).get('plate'), source: new URLSearchParams(location.search).get('source'), status: new URLSearchParams(location.search).get('status'),
    taskStatus: document.querySelector('#task-panel').dataset.status,
    image: decodeURI(document.querySelector('.model-crop img').currentSrc), meta: document.querySelector('.task-meta').textContent
  }))()`);
  assert(printer.plate === '2' && printer.source === 'journey-v2' && printer.status === 'preparing' && printer.taskStatus === 'preparing', 'Start Creating did not open the selected plate in preparation state.');
  assert(printer.image.endsWith('选择要打印的盘2（修改）.jpg') && printer.meta.includes('3 h 48 min'), 'Printer task did not use plate 2 data.');
  await evaluate(cdp, `for (let index = 0; index < 30; index += 1) advancePreparation()`);

  await evaluate(cdp, `document.querySelector('#queue-toggle').click(); document.querySelector('#queued-task').click()`);
  await waitFor(cdp, `document.title === '自研款打印机打印旅程原型' && document.querySelector('#screen-settings')?.dataset.jobStatus === 'printing'`, 'Printer queue did not return to v2 settings.');
  const printing = await evaluate(cdp, `(() => ({
    plate: document.querySelector('.plate-card.is-selected').dataset.plate,
    tag: document.querySelector('.plate-card.has-job-status .plate-status-tag').textContent,
    title: document.querySelector('#settings-title').textContent,
    builderHidden: document.querySelector('#step-plate').hidden,
    colorVisible: !document.querySelector('#step-material').hidden,
    image: decodeURI(document.querySelector('#selected-model-image').currentSrc),
    entry: new URLSearchParams(location.search).get('entry'),
    selectedParam: new URLSearchParams(location.search).get('selected'),
    startDisabled: document.querySelector('#start-print').disabled
  }))()`);
  assert(printing.plate === '1' && printing.tag === '正在打印' && printing.title === 'Choose  your  color' && printing.builderHidden && printing.colorVisible, `Queue task did not open its color page directly: ${JSON.stringify(printing)}`);
  assert(printing.entry === 'queue' && printing.selectedParam === '1' && printing.image.endsWith('选中要打印的盘1.jpg') && printing.startDisabled, 'Queue task target or printing configuration lock was not preserved.');
  await screenshot(cdp, previews.printing);

  const lockedColorPage = await evaluate(cdp, `(() => ({
    title: document.querySelector('#settings-title').textContent,
    startDisabled: document.querySelector('#start-print').disabled,
    cfsDisabled: document.querySelector('input[value="cfs"]').disabled,
    externalDisabled: document.querySelector('input[value="external"]').disabled,
    pickerDisabled: document.querySelector('#open-filament-picker').disabled
  }))()`);
  assert(lockedColorPage.title === 'Choose  your  color' && lockedColorPage.startDisabled, `Printing configuration must disable only Start Creating: ${JSON.stringify(lockedColorPage)}`);
  assert(!lockedColorPage.cfsDisabled && !lockedColorPage.externalDisabled && !lockedColorPage.pickerDisabled, 'Printing configuration unexpectedly disabled material controls.');
  await screenshot(cdp, previews.printingColorLocked);

  await evaluate(cdp, `document.querySelector('input[value="external"]').click(); document.querySelector('#settings-back').click()`);
  await waitFor(cdp, `document.title === '自研款打印机打印页面原型' && document.querySelector('#task-panel')?.dataset.status === 'printing'`, 'Queue color back did not return directly to the printer.');
  await evaluate(cdp, `document.querySelector('#queue-toggle').click(); document.querySelector('[data-queue-task][data-plate="1"]').click()`);
  await waitFor(cdp, `document.title === '自研款打印机打印旅程原型' && !document.querySelector('#step-material')?.hidden`, 'Reopening queue plate 1 did not return to its color page.');
  const restoredTray = await evaluate(cdp, `(() => ({
    source: document.querySelector('input[name="feed-source"]:checked').value,
    pickerDisabled: document.querySelector('#open-filament-picker').disabled,
    slot: document.querySelector('#filament-slot-number').textContent,
    startDisabled: document.querySelector('#start-print').disabled
  }))()`);
  assert(restoredTray.source === 'external' && restoredTray.pickerDisabled && restoredTray.slot === '料架' && restoredTray.startDisabled, `Food Tray setting was not restored for builder 1: ${JSON.stringify(restoredTray)}`);

  await evaluate(cdp, `document.querySelector('input[value="cfs"]').click(); document.querySelector('#open-filament-picker').click(); document.querySelector('[data-filament-slot="2"]').click(); document.querySelector('#confirm-filament').click(); document.querySelector('#settings-back').click()`);
  await waitFor(cdp, `document.title === '自研款打印机打印页面原型' && document.querySelector('#task-panel')?.dataset.status === 'printing'`, 'Configured queue color back did not return directly to the printer.');
  await evaluate(cdp, `document.querySelector('#queue-toggle').click(); document.querySelector('[data-queue-task][data-plate="1"]').click()`);
  await waitFor(cdp, `document.title === '自研款打印机打印旅程原型' && !document.querySelector('#step-material')?.hidden`, 'Reopening configured queue plate 1 did not return to its color page.');
  const restoredBox = await evaluate(cdp, `(() => ({
    source: document.querySelector('input[name="feed-source"]:checked').value,
    pickerDisabled: document.querySelector('#open-filament-picker').disabled,
    slot: document.querySelector('#filament-slot-number').textContent,
    selectedSlot: document.querySelector('[data-filament-slot].is-selected')?.dataset.filamentSlot,
    startDisabled: document.querySelector('#start-print').disabled,
    stored: JSON.parse(localStorage.getItem('ziyan-v2-builder-material-settings'))
  }))()`);
  assert(restoredBox.source === 'cfs' && !restoredBox.pickerDisabled && restoredBox.slot === '2' && restoredBox.selectedSlot === '2' && restoredBox.startDisabled, `Food Box slot was not restored for builder 1: ${JSON.stringify(restoredBox)}`);
  assert(restoredBox.stored?.['1']?.source === 'cfs' && restoredBox.stored?.['1']?.slot === '2', `Builder material settings were not persisted by builder: ${JSON.stringify(restoredBox.stored)}`);

  await evaluate(cdp, `document.querySelector('#settings-back').click()`);
  await waitFor(cdp, `document.title === '自研款打印机打印页面原型' && typeof openPrintSettings === 'function'`, 'V2 settings back did not return to printer.');
  assert(await evaluate(cdp, `new URLSearchParams(location.search).get('source')`) === 'journey-v2', 'V2 source marker was lost on return.');
  assert(await evaluate(cdp, `document.querySelector('#task-panel').dataset.status`) === 'printing', 'V2 settings back did not preserve the printing state.');
  await evaluate(cdp, `document.querySelector('#finish-now').click(); document.querySelector('#next-plate').click()`);
  await waitFor(cdp, `document.title === '自研款打印机打印旅程原型' && document.querySelector('#screen-settings')?.dataset.jobStatus === 'completed'`, 'Completed task did not return to v2 settings.');
  const completed = await evaluate(cdp, `(() => ({
    plate: document.querySelector('.plate-card.is-selected').dataset.plate,
    completed: new URLSearchParams(location.search).get('completed'),
    tagged: [...document.querySelectorAll('.plate-card.is-completed')].map(card => card.dataset.plate),
    tag: document.querySelector('.plate-card.has-job-status .plate-status-tag').textContent,
    chooseDisabled: document.querySelector('#choose-color').disabled
  }))()`);
  assert(completed.plate === '2' && completed.completed === '2' && JSON.stringify(completed.tagged) === JSON.stringify(['2']) && completed.tag === '已打印', 'Completed plate set was not preserved in v2.');
  assert(completed.chooseDisabled, 'A completed selected builder must not continue to color selection.');
  await screenshot(cdp, previews.completed);

  await evaluate(cdp, `document.querySelector('[data-plate="1"]').click(); document.querySelector('#choose-color').click(); document.querySelector('#start-print').click()`);
  await waitFor(cdp, `document.title === '自研款打印机打印页面原型' && new URLSearchParams(location.search).get('plate') === '1'`, 'Selecting plate 1 after plate 2 completion did not start the next task.');
  const onePending = await evaluate(cdp, `(() => ({
    completed: new URLSearchParams(location.search).get('completed'),
    requestedStatus: new URLSearchParams(location.search).get('status'),
    taskStatus: document.querySelector('#task-panel').dataset.status,
    queueCount: document.querySelectorAll('[data-queue-task]:not([hidden])').length,
    queuePlates: [...document.querySelectorAll('[data-queue-task]:not([hidden])')].map(task => task.dataset.plate),
    queueLabel: document.querySelector('#queue-toggle small').textContent
  }))()`);
  assert(onePending.completed === '2' && onePending.requestedStatus === 'printing' && onePending.taskStatus === 'printing' && onePending.queueCount === 1 && JSON.stringify(onePending.queuePlates) === JSON.stringify(['3']), `Completed-builder continuation did not skip preparation or exclude plate 2: ${JSON.stringify(onePending)}`);
  assert(onePending.queueLabel.includes('1 个待打印任务'), 'One-pending-task queue label is incorrect.');
  await evaluate(cdp, `document.querySelector('#queue-toggle').click()`);
  const onePendingArtwork = await evaluate(cdp, `(() => {
    const visibleTasks = [...document.querySelectorAll('[data-queue-task]')].filter(task => getComputedStyle(task).display !== 'none' && task.getClientRects().length > 0);
    const imageSources = visibleTasks.map(task => decodeURI(task.querySelector('img').currentSrc));
    const reusedSources = [...document.querySelectorAll('[data-queue-task] img[src]')].map(image => decodeURI(image.currentSrc));
    return {
      visiblePlates: visibleTasks.map(task => task.dataset.plate),
      imageSources,
      reusedSources,
      uniqueImageCount: new Set(reusedSources).size
    };
  })()`);
  assert(JSON.stringify(onePendingArtwork.visiblePlates) === JSON.stringify(['3']), `Completed or duplicate queue artwork is still visible: ${JSON.stringify(onePendingArtwork)}`);
  assert(onePendingArtwork.imageSources.length === 1 && onePendingArtwork.imageSources[0].endsWith('打印队列3.jpg'), `The remaining queue does not exclusively reuse plate 3 artwork: ${JSON.stringify(onePendingArtwork)}`);
  assert(onePendingArtwork.reusedSources.length === 1 && onePendingArtwork.uniqueImageCount === onePendingArtwork.reusedSources.length, `Queue artwork is reused more than once: ${JSON.stringify(onePendingArtwork)}`);
  await evaluate(cdp, `document.querySelector('#queue-toggle').scrollIntoView({ block: 'start' })`);
  await delay(100);
  await screenshot(cdp, previews.onePending);

  await evaluate(cdp, `document.querySelector('#finish-now').click(); document.querySelector('#next-plate').click()`);
  await waitFor(cdp, `document.title === '自研款打印机打印旅程原型' && document.querySelectorAll('.plate-card.is-completed').length === 2`, 'The second completed task did not return to builder with two completed tags.');
  const secondBuilder = await evaluate(cdp, `(() => ({
    completed: [...document.querySelectorAll('.plate-card.is-completed')].map(card => card.dataset.plate),
    selected: document.querySelector('.plate-card.is-selected').dataset.plate,
    tags: [...document.querySelectorAll('.plate-card.is-completed .plate-status-tag')].map(tag => tag.textContent)
  }))()`);
  assert(JSON.stringify(secondBuilder.completed) === JSON.stringify(['1', '2']) && secondBuilder.selected === '1' && secondBuilder.tags.every(tag => tag === '已打印'), `Second builder completion state is incorrect: ${JSON.stringify(secondBuilder)}`);

  await evaluate(cdp, `document.querySelector('[data-plate="3"]').click(); document.querySelector('#choose-color').click(); document.querySelector('#start-print').click()`);
  await waitFor(cdp, `document.title === '自研款打印机打印页面原型' && new URLSearchParams(location.search).get('plate') === '3'`, 'Selecting the final plate did not start the final task.');
  const finalPrinting = await evaluate(cdp, `(() => ({
    completed: new URLSearchParams(location.search).get('completed'),
    requestedStatus: new URLSearchParams(location.search).get('status'),
    taskStatus: document.querySelector('#task-panel').dataset.status,
    queueCount: document.querySelectorAll('[data-queue-task]:not([hidden])').length,
    queueToggleHidden: document.querySelector('#queue-toggle').hidden
  }))()`);
  assert(finalPrinting.completed.split(',').sort().join(',') === '1,2' && finalPrinting.requestedStatus === 'printing' && finalPrinting.taskStatus === 'printing' && finalPrinting.queueCount === 0 && finalPrinting.queueToggleHidden, `Final continuation did not skip preparation or render an empty queue: ${JSON.stringify(finalPrinting)}`);

  await evaluate(cdp, `document.querySelector('#finish-now').click()`);
  const allCompleted = await evaluate(cdp, `(() => {
    const image = document.querySelector('#local-file img');
    return {
      restartVisible: !document.querySelector('#restart-print').hidden,
      nextHidden: document.querySelector('#next-plate').hidden,
      localVisible: !document.querySelector('#local-file').hidden,
      localLoaded: image.complete && image.naturalWidth > 0,
      localSrc: decodeURI(image.currentSrc),
      queueToggleHidden: document.querySelector('#queue-toggle').hidden
    };
  })()`);
  assert(allCompleted.restartVisible && allCompleted.nextHidden && allCompleted.localVisible && allCompleted.localLoaded && allCompleted.localSrc.endsWith('本地文件.jpg'), `All-completed actions are incorrect: ${JSON.stringify(allCompleted)}`);
  assert(allCompleted.queueToggleHidden, 'The empty queue should be hidden after every plate is completed.');
  await screenshot(cdp, previews.allCompleted);
  await evaluate(cdp, `document.querySelector('#local-file').click()`);
  assert(await evaluate(cdp, `document.querySelector('#toast').textContent`) === '已打开本地文件', 'Local file feedback is incorrect.');

  const layouts = [];
  for (const width of [320, 768, 1024, 1440]) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: width <= 390 });
    layouts.push(await evaluate(cdp, `({ viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth, shell: Math.round(document.querySelector('.phone-shell').getBoundingClientRect().width) })`));
  }
  layouts.forEach(({ viewport, page, shell }) => {
    assert(page === viewport, `Horizontal overflow detected at ${viewport}px.`);
    assert(shell === Math.min(viewport, 390), `Unexpected shell width at ${viewport}px.`);
  });
  const tree = await cdp.send('Accessibility.getFullAXTree');
  const unnamedButtons = tree.nodes.filter((node) => node.role?.value === 'button' && !node.name?.value?.trim());
  assert(unnamedButtons.length === 0, `Found ${unnamedButtons.length} unnamed buttons.`);
  const browserErrors = cdp.events.filter((event) => event.method === 'Runtime.exceptionThrown' || (event.method === 'Log.entryAdded' && ['error', 'warning'].includes(event.params.entry.level)));
  assert(browserErrors.length === 0, `Browser emitted ${browserErrors.length} error/warning event(s).`);

  console.log(JSON.stringify({ createButton, buildPage, swiped, colorPage, upload, printer, printing, lockedColorPage, restoredTray, restoredBox, completed, onePending, secondBuilder, finalPrinting, allCompleted, layouts, previews }, null, 2));
  cdp.close();
} finally {
  chrome.kill();
  await new Promise((resolve) => {
    if (chrome.exitCode !== null) resolve();
    else chrome.once('exit', resolve);
    setTimeout(resolve, 1000);
  });
  try { fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch { /* safe temp fallback */ }
}
