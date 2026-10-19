import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const prototypeRoot = path.resolve(import.meta.dirname, '..');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ziyan-print-journey-'));
const settingsPreviewPath = path.join(prototypeRoot, 'prototype-settings.png');
const filamentPickerPreviewPath = path.join(prototypeRoot, 'prototype-filament-picker.png');
const uploadPreviewPath = path.join(prototypeRoot, 'prototype-uploading.png');
const printingPreviewPath = path.join(prototypeRoot, 'prototype-printing-status.png');
const completedPreviewPath = path.join(prototypeRoot, 'prototype-completed-status.png');
const pageUrl = pathToFileURL(path.join(prototypeRoot, 'index.html')).href;

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--remote-debugging-port=0',
  `--user-data-dir=${profileDir}`,
  '--window-size=390,844',
  pageUrl
], { stdio: 'ignore' });

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForDevToolsPort() {
  const portFile = path.join(profileDir, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (fs.existsSync(portFile)) return fs.readFileSync(portFile, 'utf8').split(/\r?\n/)[0];
    await delay(100);
  }
  throw new Error('Chrome DevTools port was not created.');
}

function connectCdp(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  const events = [];
  let sequence = 0;
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
      return;
    }
    events.push(message);
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function evaluate(cdp, expression) {
  const response = await cdp.send('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression });
  return response.result.value;
}

async function waitFor(cdp, expression, message) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      if (await evaluate(cdp, expression)) return;
    } catch {
      // A navigation briefly replaces the execution context.
    }
    await delay(100);
  }
  throw new Error(message);
}

async function saveFullScreenshot(cdp, targetPath) {
  const layout = await cdp.send('Page.getLayoutMetrics');
  const screenshot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: 390, height: Math.ceil(layout.cssContentSize.height), scale: 1 }
  });
  fs.writeFileSync(targetPath, Buffer.from(screenshot.data, 'base64'));
}

try {
  const port = await waitForDevToolsPort();
  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
  const target = targets.find((item) => item.type === 'page');
  assert(target, 'No browser page target was found.');

  const cdp = connectCdp(target.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  await cdp.send('Log.enable');
  await cdp.send('Accessibility.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await cdp.send('Page.reload');
  await delay(650);

  const settings = await evaluate(cdp, `(() => {
    const model = document.querySelector('#model-reference');
    const modelLoaded = model.complete && model.naturalWidth > 0;
    const modelRect = model.getBoundingClientRect();
    const hotspotRect = document.querySelector('#print-now').getBoundingClientRect();
    document.querySelector('#print-now').click();
    const firstPlateRect = document.querySelector('[data-plate="1"]').getBoundingClientRect();
    document.querySelector('[data-plate="3"]').click();
    document.querySelector('#open-preview').click();
    const external = document.querySelector('input[value="external"]');
    external.click();
    const externalDisabledPicker = document.querySelector('#open-filament-picker').disabled;
    document.querySelector('input[value="cfs"]').click();
    document.querySelector('#open-filament-picker').click();
    const unavailableDisabled = document.querySelector('[data-filament-slot="3"]').disabled;
    const pickerFrame = document.querySelector('.filament-picker-frame').getBoundingClientRect();
    const pickerRadios = [...document.querySelectorAll('[data-filament-slot]')].map(option => {
      const rect = option.getBoundingClientRect();
      return {
        slot: option.dataset.filamentSlot,
        left: (rect.left - pickerFrame.left) / pickerFrame.width,
        top: (rect.top - pickerFrame.top) / pickerFrame.height,
        width: rect.width / pickerFrame.width,
        height: rect.height / pickerFrame.height
      };
    });
    document.querySelector('[data-filament-slot="1"]').click();
    document.querySelector('#confirm-filament').click();
    document.querySelector('#copy-plus').click();
    document.querySelector('#copy-plus').click();
    document.querySelector('#copy-minus').click();
    document.querySelector('#print-calibration').click();
    return {
      modelLoaded,
      printHotspot: {
        left: (hotspotRect.left - modelRect.left) / modelRect.width,
        top: (hotspotRect.top - modelRect.top) / modelRect.height,
        right: (hotspotRect.right - modelRect.left) / modelRect.width,
        bottom: (hotspotRect.bottom - modelRect.top) / modelRect.height
      },
      settingsVisible: !document.querySelector('#screen-settings').hidden,
      headings: {
        plate: document.querySelector('#plate-title').textContent,
        part: document.querySelector('#part-title').textContent
      },
      firstPlateSize: { width: firstPlateRect.width, height: firstPlateRect.height },
      plateCount: document.querySelectorAll('[data-plate]').length,
      carouselScrollable: document.querySelector('#plate-carousel').scrollWidth > document.querySelector('#plate-carousel').clientWidth,
      selectedPlate: document.querySelector('.plate-card.is-selected').dataset.plate,
      selectedModelSrc: decodeURI(document.querySelector('#selected-model-image').currentSrc),
      previewMessage: document.querySelector('#toast').textContent,
      externalDisabledPicker,
      unavailableDisabled,
      pickerRadios,
      filamentSlot: document.querySelector('#filament-slot-number').textContent,
      filamentLabel: document.querySelector('#filament-label').textContent,
      copyCount: document.querySelector('#copy-count').textContent,
      calibration: document.querySelector('#print-calibration').getAttribute('aria-pressed'),
      timelapse: document.querySelector('#timelapse').getAttribute('aria-pressed'),
      copyControlsHidden: ['#copy-minus', '#copy-plus'].every(selector => {
        const style = getComputedStyle(document.querySelector(selector));
        return style.fontSize === '0px' && style.color === 'rgba(0, 0, 0, 0)';
      })
    };
  })()`);

  assert(settings.modelLoaded && settings.settingsVisible, 'Model detail did not open the print settings journey.');
  assert(settings.printHotspot.left > 0.51 && settings.printHotspot.top < 0.88 && settings.printHotspot.right > 0.96 && settings.printHotspot.bottom < 0.94, 'Immediate-print hotspot is not shifted right and upward over the source button.');
  assert(settings.headings.plate === '选择要打印的盘' && settings.headings.part === '选择要打印的零件', 'Plate and part headings are incorrect.');
  assert(Math.round(settings.firstPlateSize.width) === 185 && Math.round(settings.firstPlateSize.height) === 258, 'Plate cards must be 185 x 258 pixels.');
  assert(settings.plateCount === 3 && settings.carouselScrollable, 'Three horizontally scrollable plates are required.');
  assert(settings.selectedPlate === '3' && settings.selectedModelSrc.endsWith('选择要打印的盘3.jpg'), 'Plate 3 selection did not update the material preview.');
  assert(settings.previewMessage === '已打开预览', 'Preview feedback is incorrect.');
  assert(settings.externalDisabledPicker && settings.unavailableDisabled, 'External spool or unavailable warehouse slot rules are incorrect.');
  assert(settings.pickerRadios.every(option => option.width < 0.1 && option.height < 0.12 && option.top < 0.58), 'Warehouse radio hotspots are not compact or high enough.');
  assert(settings.filamentSlot === '1' && settings.filamentLabel.includes('黑色'), 'Filament selection did not return slot 1 black PLA.');
  assert(settings.copyCount === '2' && settings.calibration === 'false' && settings.timelapse === 'true', 'Copy or print option controls are incorrect.');
  assert(settings.copyControlsHidden, 'Copy plus and minus characters must be visually hidden while hotspots remain interactive.');

  const plateClickTarget = await evaluate(cdp, `(() => {
    document.querySelector('[data-plate="1"]').click();
    const carousel = document.querySelector('#plate-carousel');
    carousel.scrollLeft = 0;
    const card = document.querySelector('[data-plate="2"]');
    const cardRect = card.getBoundingClientRect();
    const carouselRect = carousel.getBoundingClientRect();
    return {
      x: (Math.max(cardRect.left, carouselRect.left) + Math.min(cardRect.right, carouselRect.right)) / 2,
      y: cardRect.top + cardRect.height / 2
    };
  })()`);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: plateClickTarget.x, y: plateClickTarget.y, button: 'left', buttons: 1, clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: plateClickTarget.x, y: plateClickTarget.y, button: 'left', buttons: 0, clickCount: 1 });
  await delay(120);
  const physicallySelectedPlate = await evaluate(cdp, `document.querySelector('.plate-card.is-selected').dataset.plate`);
  assert(physicallySelectedPlate === '2', 'A real pointer click on a visible plate did not select that plate.');
  const physicallySelectedPlateTwoSrc = await evaluate(cdp, `decodeURI(document.querySelector('#selected-model-image').currentSrc)`);
  assert(physicallySelectedPlateTwoSrc.endsWith('选择要打印的盘2（修改）.jpg'), 'Plate 2 did not use the modified artwork in the linked preview.');

  const dragSetup = await evaluate(cdp, `(() => {
    const carousel = document.querySelector('#plate-carousel');
    const rect = carousel.getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height, before: carousel.scrollLeft };
  })()`);
  const dragY = dragSetup.top + dragSetup.height / 2;
  const dragStartX = dragSetup.left + dragSetup.width * 0.25;
  const dragEndX = dragSetup.left + dragSetup.width * 0.78;
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: dragStartX, y: dragY, button: 'left', buttons: 1, clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: dragEndX, y: dragY, button: 'left', buttons: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: dragEndX, y: dragY, button: 'left', buttons: 0, clickCount: 1 });
  await delay(120);
  const dragAfter = await evaluate(cdp, `document.querySelector('#plate-carousel').scrollLeft`);
  assert(dragSetup.before - dragAfter > 40, 'Pointer drag did not move the plate carousel horizontally.');

  const touchDragStart = await evaluate(cdp, `document.querySelector('#plate-carousel').scrollLeft`);
  const touchStartX = dragSetup.left + dragSetup.width * 0.78;
  const touchEndX = dragSetup.left + dragSetup.width * 0.25;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: touchStartX, y: dragY }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: touchEndX, y: dragY }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await delay(300);
  const touchDragAfter = await evaluate(cdp, `document.querySelector('#plate-carousel').scrollLeft`);
  assert(touchDragAfter - touchDragStart > 40, 'Touch swipe did not move the plate carousel horizontally.');
  const selectionAfterTouchDrag = await evaluate(cdp, `document.querySelector('.plate-card.is-selected').dataset.plate`);
  assert(selectionAfterTouchDrag === '2', 'Touch swipe unexpectedly selected a plate instead of only scrolling the carousel.');
  await evaluate(cdp, `document.querySelector('[data-plate="3"]').click()`);
  await saveFullScreenshot(cdp, settingsPreviewPath);

  await evaluate(cdp, `document.querySelector('#open-filament-picker').click()`);
  const filamentPickerScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(filamentPickerPreviewPath, Buffer.from(filamentPickerScreenshot.data, 'base64'));
  await evaluate(cdp, `document.querySelector('#close-filament-picker').click()`);

  await evaluate(cdp, `document.querySelector('#start-print').click()`);
  await delay(500);
  const upload = await evaluate(cdp, `(() => ({
    open: document.querySelector('#upload-dialog').open,
    progress: Number(document.querySelector('#upload-progress').getAttribute('aria-valuenow'))
  }))()`);
  assert(upload.open && upload.progress > 0 && upload.progress < 100, 'Two-second upload progress did not start.');
  const uploadScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(uploadPreviewPath, Buffer.from(uploadScreenshot.data, 'base64'));

  await waitFor(cdp, `document.title === '自研款打印机打印页面原型' && typeof openPrintSettings === 'function'`, 'Upload did not navigate to the printer page after two seconds.');
  const printer = await evaluate(cdp, `(() => ({
    plate: new URLSearchParams(location.search).get('plate'),
    taskSrc: decodeURI(document.querySelector('.model-crop img').currentSrc),
    taskTitle: document.querySelector('#task-title').textContent,
    taskMeta: document.querySelector('.task-meta').textContent
  }))()`);
  assert(printer.plate === '3' && printer.taskSrc.endsWith('选择要打印的盘3.jpg'), `Printer page did not receive the selected plate artwork: ${JSON.stringify(printer)}`);
  assert(printer.taskTitle === '史蒂夫_03_012207' && printer.taskMeta.includes('1 h 35 min') && printer.taskMeta.includes('20 g'), 'Plate 3 printer task summary is incorrect.');
  assert(await evaluate(cdp, `document.querySelector('#task-panel').dataset.status`) === 'preparing', 'Printer page must begin in preparation state after the original journey.');
  await evaluate(cdp, `for (let index = 0; index < 30; index += 1) advancePreparation()`);

  await evaluate(cdp, `(() => { document.querySelector('#queue-toggle').click(); document.querySelector('#queued-task').click(); })()`);
  await waitFor(cdp, `document.title === '自研款打印机打印旅程原型' && document.querySelector('#screen-settings')?.classList.contains('is-active') && document.querySelector('#screen-settings')?.dataset.jobStatus === 'printing'`, 'Printing queue task did not return to print settings.');
  const printingState = await evaluate(cdp, `(() => ({
    href: location.href,
    search: location.search,
    notice: document.querySelector('#printing-notice').textContent,
    noticeVisible: !document.querySelector('#printing-notice').hidden,
    selectedPlate: document.querySelector('.plate-card.is-selected').dataset.plate,
    tag: document.querySelector('.plate-card.is-selected .plate-status-tag').textContent,
    tagColor: getComputedStyle(document.querySelector('.plate-card.is-selected .plate-status-tag')).color,
    tagBackground: getComputedStyle(document.querySelector('.plate-card.is-selected .plate-status-tag')).backgroundColor
  }))()`);
  assert(printingState.noticeVisible && printingState.notice === '打印机正在打印', `Printing warning is missing from the settings page: ${JSON.stringify(printingState)}`);
  assert(printingState.selectedPlate === '3' && printingState.tag === '正在打印', 'The previously selected plate lacks the printing tag.');
  assert(printingState.tagBackground === 'rgb(32, 36, 43)' && printingState.tagColor === 'rgb(84, 160, 255)', 'Printing tag colors are incorrect.');
  const printingTagOwnership = await evaluate(cdp, `(() => {
    document.querySelector('[data-plate="1"]').click();
    const taggedPlate = document.querySelector('.plate-card.has-job-status')?.dataset.plate;
    const selectedPlate = document.querySelector('.plate-card.is-selected')?.dataset.plate;
    document.querySelector('[data-plate="3"]').click();
    return { taggedPlate, selectedPlate };
  })()`);
  assert(printingTagOwnership.taggedPlate === '3' && printingTagOwnership.selectedPlate === '1', 'Printing tag moved with the current browsing selection instead of staying on the started plate.');
  await saveFullScreenshot(cdp, printingPreviewPath);

  await evaluate(cdp, `document.querySelector('#settings-back').click()`);
  await waitFor(cdp, `document.title === '自研款打印机打印页面原型' && typeof openPrintSettings === 'function'`, 'Settings back did not return to the printer page.');
  assert(await evaluate(cdp, `document.querySelector('#task-panel').dataset.status`) === 'printing', 'Settings back did not preserve the printing state.');
  await evaluate(cdp, `(() => {
    document.querySelector('#finish-now').click();
    document.querySelector('#queue-toggle').click();
    document.querySelector('#queued-task-second').click();
  })()`);
  await waitFor(cdp, `document.title === '自研款打印机打印旅程原型' && document.querySelector('#settings-title')?.textContent === 'Choose your builder' && document.querySelector('#screen-settings')?.classList.contains('is-active') && document.querySelector('#screen-settings')?.dataset.jobStatus === 'completed'`, 'Completed queue task did not return to the v2 builder page.');
  const completedState = await evaluate(cdp, `(() => ({
    v2Route: decodeURI(location.pathname).includes('dayinlvchengv2'),
    completed: new URLSearchParams(location.search).get('completed'),
    noticeVisible: !document.querySelector('#printing-notice').hidden,
    selectedPlate: document.querySelector('.plate-card.is-selected').dataset.plate,
    tag: document.querySelector('.plate-card.is-selected .plate-status-tag').textContent,
    tagColor: getComputedStyle(document.querySelector('.plate-card.is-selected .plate-status-tag')).color,
    tagBackground: getComputedStyle(document.querySelector('.plate-card.is-selected .plate-status-tag')).backgroundColor
  }))()`);
  assert(completedState.v2Route && completedState.completed === '3', `Completed queue task did not carry the completed set to v2: ${JSON.stringify(completedState)}`);
  assert(!completedState.noticeVisible && completedState.selectedPlate === '3' && completedState.tag === '已打印', 'Completed plate status is incorrect.');
  assert(completedState.tagBackground === 'rgb(32, 36, 43)' && completedState.tagColor === 'rgb(255, 255, 255)', 'Completed tag colors are incorrect.');
  await saveFullScreenshot(cdp, completedPreviewPath);

  const responsiveLayouts = [];
  for (const width of [320, 768, 1024, 1440]) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: width <= 390 });
    responsiveLayouts.push(await evaluate(cdp, `(() => ({
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      shellWidth: Math.round(document.querySelector('.phone-shell').getBoundingClientRect().width)
    }))()`));
  }
  responsiveLayouts.forEach((layout) => {
    assert(layout.documentWidth === layout.viewportWidth, `Horizontal overflow detected at ${layout.viewportWidth}px.`);
    assert(layout.shellWidth === Math.min(layout.viewportWidth, 390), `Unexpected phone shell width at ${layout.viewportWidth}px.`);
  });

  const accessibilityTree = await cdp.send('Accessibility.getFullAXTree');
  const unnamedButtons = accessibilityTree.nodes.filter((node) => node.role?.value === 'button' && !node.name?.value?.trim());
  assert(unnamedButtons.length === 0, `Found ${unnamedButtons.length} button(s) without accessible names.`);

  await evaluate(cdp, `document.querySelector('#settings-back').click()`);
  await waitFor(cdp, `document.title === '自研款打印机打印页面原型' && document.querySelector('#task-panel')?.dataset.status === 'completed'`, 'Returning from completed settings did not preserve the completed printer state.');
  const completedReturn = await evaluate(cdp, `(() => ({
    status: document.querySelector('#task-panel').dataset.status,
    plate: new URLSearchParams(location.search).get('plate'),
    time: document.querySelector('#remaining-time').textContent
  }))()`);
  assert(completedReturn.status === 'completed' && completedReturn.plate === '3' && completedReturn.time === '00:00:00', 'Completed printer state or selected plate was lost after returning.');

  const browserErrors = cdp.events.filter((event) =>
    event.method === 'Runtime.exceptionThrown' ||
    (event.method === 'Log.entryAdded' && ['error', 'warning'].includes(event.params.entry.level))
  );
  assert(browserErrors.length === 0, `Browser emitted ${browserErrors.length} error/warning event(s).`);

  console.log(JSON.stringify({ settings, physicallySelectedPlate, physicallySelectedPlateTwoSrc, selectionAfterTouchDrag, plateDrag: { before: dragSetup.before, after: dragAfter }, touchDrag: { before: touchDragStart, after: touchDragAfter }, upload, printer, printingState, printingTagOwnership, completedState, completedReturn, responsiveLayouts, unnamedButtons: 0, browserErrors: 0, settingsPreviewPath, filamentPickerPreviewPath, uploadPreviewPath, printingPreviewPath, completedPreviewPath }, null, 2));
  cdp.close();
} finally {
  chrome.kill();
  await new Promise((resolve) => {
    if (chrome.exitCode !== null) resolve();
    else chrome.once('exit', resolve);
    setTimeout(resolve, 1000);
  });
  if (path.resolve(profileDir).startsWith(path.resolve(os.tmpdir()))) {
    try {
      fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    } catch {
      // The temporary OS profile remains a safe fallback if Chrome briefly retains a lock.
    }
  }
}
