import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const prototypeRoot = path.resolve(import.meta.dirname, '..');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ziyan-connection-states-'));
const pageUrl = pathToFileURL(path.join(prototypeRoot, 'index.html')).href;
const entryUrls = {
  idle: pathToFileURL(path.join(prototypeRoot, 'idle.html')).href,
  connecting: pathToFileURL(path.join(prototypeRoot, 'connecting.html')).href,
  offline: pathToFileURL(path.join(prototypeRoot, 'offline.html')).href
};
const screenshotPaths = {
  idle: path.join(prototypeRoot, 'prototype-idle.png'),
  connecting: path.join(prototypeRoot, 'prototype-connecting.png'),
  offline: path.join(prototypeRoot, 'prototype-offline.png'),
  filamentSheet: path.join(prototypeRoot, 'prototype-filament-sheet.png'),
  feeding: path.join(prototypeRoot, 'prototype-feeding.png'),
  retracting: path.join(prototypeRoot, 'prototype-retracting.png'),
  exploreToys: path.join(prototypeRoot, 'prototype-explore-toys.png'),
  myModels: path.join(prototypeRoot, 'prototype-my-models.png')
};

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--remote-debugging-port=0',
  `--user-data-dir=${profileDir}`,
  '--window-size=390,844',
  entryUrls.idle
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
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
  return response.result.value;
}

async function navigate(cdp, url) {
  await cdp.send('Page.navigate', { url });
  await delay(500);
}

async function clickElement(cdp, selector) {
  const readPoint = () => evaluate(cdp, `(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`);
  let point = await readPoint();
  assert(point, `Unable to click missing element: ${selector}`);
  if (point.y < 60 || point.y > 790) {
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      x: 195,
      y: 420,
      deltaX: 0,
      deltaY: point.y - 420
    });
    await delay(180);
    point = await readPoint();
  }
  assert(point.y >= 0 && point.y <= 844, `Element did not scroll into the viewport: ${selector}`);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  await delay(80);
}

async function saveFullPageScreenshot(cdp, targetPath) {
  const metrics = await cdp.send('Page.getLayoutMetrics');
  const height = Math.ceil(metrics.cssContentSize.height);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height, deviceScaleFactor: 1, mobile: true });
  await delay(80);
  const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  fs.writeFileSync(targetPath, Buffer.from(screenshot.data, 'base64'));
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
}

async function saveViewportScreenshot(cdp, targetPath) {
  const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(targetPath, Buffer.from(screenshot.data, 'base64'));
}

async function inspectState(cdp) {
  return evaluate(cdp, `(() => {
    const imageLoaded = (selector) => {
      const image = document.querySelector(selector);
      return image.complete && image.naturalWidth > 0;
    };
    const visible = (selector) => !document.querySelector(selector).hidden;
    return {
      state: document.querySelector('#device-page').dataset.state,
      queryState: new URLSearchParams(location.search).get('state'),
      statusLoaded: imageLoaded('#status-reference'),
      timelapseLoaded: imageLoaded('#timelapse-image'),
      idleTaskImageLoaded: imageLoaded('#idle-task-panel > img'),
      idleTaskVisible: visible('#idle-task-panel'),
      stateTaskVisible: visible('#state-only-task'),
      taskState: document.querySelector('#task-state').textContent,
      spinnerVisible: visible('#connecting-spinner'),
      spinnerAnimation: getComputedStyle(document.querySelector('#connecting-spinner')).animationName,
      statusAlt: document.querySelector('#status-reference').alt,
      timelapseAlt: document.querySelector('#timelapse-image').alt,
      bottomNavLoaded: imageLoaded('#bottom-nav-reference'),
      filamentVisible: document.querySelector('.filament-panel').getBoundingClientRect().height > 0,
      controlsVisible: document.querySelector('.controls-section').getBoundingClientRect().height > 0,
      title: document.title
    };
  })()`);
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
  await delay(500);

  const results = {};
  const filamentSheetResults = {};
  for (const state of ['idle', 'connecting', 'offline']) {
    await navigate(cdp, entryUrls[state]);
    results[state] = await inspectState(cdp);
    assert(results[state].state === state && results[state].queryState === state, `${state} entry did not render the matching state.`);
    assert(results[state].statusLoaded && results[state].timelapseLoaded, `${state} status or timelapse image did not load.`);
    assert(results[state].bottomNavLoaded, `${state} bottom navigation reference image did not load.`);
    assert(results[state].idleTaskImageLoaded, `${state} idle task reference image did not load.`);
    assert(results[state].filamentVisible && results[state].controlsVisible, `${state} common filament/control content is missing.`);
    assert(results[state].statusAlt.trim() && results[state].timelapseAlt.trim(), `${state} state images need descriptive text.`);
    await saveFullPageScreenshot(cdp, screenshotPaths[state]);

    await clickElement(cdp, '#filament-settings');
    await delay(340);
    filamentSheetResults[state] = await evaluate(cdp, `(() => {
      const sheet = document.querySelector('#filament-sheet');
      const frame = document.querySelector('.filament-sheet-frame');
      const rect = sheet.getBoundingClientRect();
      const feedButtonStyle = getComputedStyle(document.querySelector('#feed-filament'));
      return {
        open: sheet.open,
        slotCount: document.querySelectorAll('.sheet-slots .material-slot').length,
        hasSeparateRack: Boolean(document.querySelector('.sheet-slots .rack-slot, .sheet-slots [data-slot="rack"]')),
        feedButtonText: document.querySelector('#feed-filament').textContent.trim(),
        retractButtonText: document.querySelector('#retract-filament').textContent.trim(),
        feedButtonBackground: feedButtonStyle.backgroundColor,
        bodyLocked: document.body.classList.contains('sheet-open'),
        bottomGap: Math.round(window.innerHeight - rect.bottom),
        sheetWidth: Math.round(rect.width),
        animationName: getComputedStyle(frame).animationName,
        closeName: document.querySelector('#filament-sheet-close').getAttribute('aria-label')
      };
    })()`);
    assert(filamentSheetResults[state].open, `${state} filament sheet did not open.`);
    assert(filamentSheetResults[state].slotCount === 4 && !filamentSheetResults[state].hasSeparateRack, `${state} filament sheet must contain four slots and no separate rack column.`);
    assert(filamentSheetResults[state].feedButtonText === '进料' && filamentSheetResults[state].retractButtonText === '退料', `${state} filament operation buttons are missing.`);
    assert(filamentSheetResults[state].feedButtonBackground !== 'rgba(0, 0, 0, 0)', `${state} filament operation buttons have no visual style.`);
    assert(filamentSheetResults[state].bodyLocked, `${state} did not lock background scrolling while the sheet was open.`);
    assert(Math.abs(filamentSheetResults[state].bottomGap) <= 1, `${state} filament sheet is not anchored to the viewport bottom.`);
    assert(filamentSheetResults[state].sheetWidth === 390, `${state} filament sheet width does not match the device shell.`);
    assert(filamentSheetResults[state].animationName === 'filament-sheet-rise', `${state} filament sheet is missing the bottom-up animation.`);
    assert(filamentSheetResults[state].closeName === '关闭耗材设置', `${state} filament sheet close control has no accessible name.`);
    if (state === 'idle') await saveViewportScreenshot(cdp, screenshotPaths.filamentSheet);
    await clickElement(cdp, '#filament-sheet-close');
    assert(await evaluate(cdp, `!document.querySelector('#filament-sheet').open && !document.body.classList.contains('sheet-open')`), `${state} filament sheet did not close cleanly.`);
    assert(await evaluate(cdp, `document.activeElement === document.querySelector('#filament-settings')`), `${state} focus did not return to the filament settings button.`);
  }

  assert(results.idle.idleTaskVisible && !results.idle.stateTaskVisible, 'Idle must show the full idle task panel only.');
  assert(results.idle.taskState === '准备打印', 'Idle task state is incorrect.');
  assert(!results.idle.spinnerVisible, 'Idle must not show the connecting spinner.');

  assert(!results.connecting.idleTaskVisible && results.connecting.stateTaskVisible, 'Connecting must hide idle details and show the status-only task card.');
  assert(results.connecting.taskState === '待连接', 'Connecting task state is incorrect.');
  assert(results.connecting.spinnerVisible && results.connecting.spinnerAnimation === 'connecting-spin', 'Connecting spinner is missing or not animated.');

  assert(!results.offline.idleTaskVisible && results.offline.stateTaskVisible, 'Offline must hide idle details and show the status-only task card.');
  assert(results.offline.taskState === '待重连', 'Offline task state is incorrect.');
  assert(!results.offline.spinnerVisible, 'Offline must not show the connecting spinner.');

  await navigate(cdp, `${pageUrl}?state=idle`);
  await clickElement(cdp, '[data-action="explore"]');
  const exploreReference = await evaluate(cdp, `(() => {
    const screen = document.querySelector('#content-reference-screen');
    const image = document.querySelector('#content-reference-image');
    return { visible: !screen.hidden, loaded: image.complete && image.naturalWidth > 0, source: decodeURI(image.currentSrc), deviceInert: document.querySelector('#device-page').inert };
  })()`);
  assert(exploreReference.visible && exploreReference.loaded && exploreReference.source.endsWith('探索玩具.jpg'), 'Explore toys did not open its reference page.');
  assert(exploreReference.deviceInert, 'Device page must be inert while the explore page is open.');
  await saveViewportScreenshot(cdp, screenshotPaths.exploreToys);
  await clickElement(cdp, '#content-device-back');
  assert(await evaluate(cdp, `document.querySelector('#content-reference-screen').hidden && document.activeElement === document.querySelector('[data-action="explore"]')`), 'Explore page did not return focus to its trigger.');

  await clickElement(cdp, '[data-action="models"]');
  const modelsReference = await evaluate(cdp, `(() => {
    const screen = document.querySelector('#content-reference-screen');
    const image = document.querySelector('#content-reference-image');
    return { visible: !screen.hidden, loaded: image.complete && image.naturalWidth > 0, source: decodeURI(image.currentSrc) };
  })()`);
  assert(modelsReference.visible && modelsReference.loaded && modelsReference.source.endsWith('我的模型.jpg'), 'My models did not open its reference page.');
  await saveViewportScreenshot(cdp, screenshotPaths.myModels);
  await clickElement(cdp, '#content-device-back');
  assert(await evaluate(cdp, `document.querySelector('#content-reference-screen').hidden && document.activeElement === document.querySelector('[data-action="models"]')`), 'My models page did not return focus to its trigger.');

  await clickElement(cdp, '#filament-settings');
  await clickElement(cdp, '#feed-filament');
  const feeding = await evaluate(cdp, `(() => {
    const screen = document.querySelector('#filament-operation-screen');
    const image = document.querySelector('#filament-operation-image');
    const frame = document.querySelector('.filament-operation-frame').getBoundingClientRect();
    const relativeRect = (selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return { left: (rect.left - frame.left) / frame.width, top: (rect.top - frame.top) / frame.height, right: (rect.right - frame.left) / frame.width, bottom: (rect.bottom - frame.top) / frame.height };
    };
    return { visible: !screen.hidden, loaded: image.complete && image.naturalWidth > 0, source: decodeURI(image.currentSrc), deviceInert: document.querySelector('#device-page').inert, closeHotspot: relativeRect('#close-filament-operation'), cancelHotspot: relativeRect('#cancel-filament-operation') };
  })()`);
  assert(feeding.visible && feeding.loaded && feeding.source.endsWith('进料中.jpg') && feeding.deviceInert, 'Feeding operation page did not open correctly.');
  assert(feeding.closeHotspot.left > 0.85 && feeding.closeHotspot.top > 0.22 && feeding.closeHotspot.bottom < 0.32, 'Feeding close hotspot does not cover the source-image close button.');
  assert(feeding.cancelHotspot.left < 0.07 && feeding.cancelHotspot.top > 0.9 && feeding.cancelHotspot.bottom <= 1, 'Feeding cancel hotspot does not cover the source-image cancel button.');
  await saveViewportScreenshot(cdp, screenshotPaths.feeding);
  await clickElement(cdp, '#close-filament-operation');
  assert(await evaluate(cdp, `document.querySelector('#filament-operation-screen').hidden && document.querySelector('#toast').textContent === '已取消进料'`), 'Closing feeding did not return with the required message.');
  await clickElement(cdp, '#filament-settings');
  await clickElement(cdp, '#feed-filament');
  await clickElement(cdp, '#cancel-filament-operation');
  assert(await evaluate(cdp, `document.querySelector('#filament-operation-screen').hidden && document.querySelector('#toast').textContent === '已取消进料'`), 'Cancelling feeding did not return with the required message.');

  await clickElement(cdp, '#filament-settings');
  await clickElement(cdp, '#retract-filament');
  const retracting = await evaluate(cdp, `(() => {
    const screen = document.querySelector('#filament-operation-screen');
    const image = document.querySelector('#filament-operation-image');
    const frame = document.querySelector('.filament-operation-frame').getBoundingClientRect();
    const relativeRect = (selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return { left: (rect.left - frame.left) / frame.width, top: (rect.top - frame.top) / frame.height, right: (rect.right - frame.left) / frame.width, bottom: (rect.bottom - frame.top) / frame.height };
    };
    return { visible: !screen.hidden, loaded: image.complete && image.naturalWidth > 0, source: decodeURI(image.currentSrc), closeHotspot: relativeRect('#close-filament-operation'), cancelHotspot: relativeRect('#cancel-filament-operation') };
  })()`);
  assert(retracting.visible && retracting.loaded && retracting.source.endsWith('退料中.jpg'), 'Retracting operation page did not open correctly.');
  assert(retracting.closeHotspot.left > 0.85 && retracting.closeHotspot.top > 0.4 && retracting.closeHotspot.bottom < 0.5, 'Retracting close hotspot does not cover the source-image close button.');
  assert(retracting.cancelHotspot.left < 0.07 && retracting.cancelHotspot.top > 0.9 && retracting.cancelHotspot.bottom <= 1, 'Retracting cancel hotspot does not cover the source-image cancel button.');
  await saveViewportScreenshot(cdp, screenshotPaths.retracting);
  await clickElement(cdp, '#close-filament-operation');
  assert(await evaluate(cdp, `document.querySelector('#filament-operation-screen').hidden && document.querySelector('#toast').textContent === '已取消退料'`), 'Closing retracting did not return with the required message.');
  await clickElement(cdp, '#filament-settings');
  await clickElement(cdp, '#retract-filament');
  await clickElement(cdp, '#cancel-filament-operation');
  assert(await evaluate(cdp, `document.querySelector('#filament-operation-screen').hidden && document.querySelector('#toast').textContent === '已取消退料'`), 'Cancelling retracting did not return with the required message.');

  await clickElement(cdp, '#printer-switch');
  assert(await evaluate(cdp, `document.querySelector('#printer-dialog').open`), 'Printer switch dialog did not open.');
  await clickElement(cdp, '#printer-dialog button[value="cancel"]');
  assert(!await evaluate(cdp, `document.querySelector('#printer-dialog').open`), 'Printer switch dialog did not close.');
  await clickElement(cdp, '.switch');
  assert(await evaluate(cdp, `document.querySelector('.switch').getAttribute('aria-pressed') === 'false'`), 'Control switch did not toggle.');
  await clickElement(cdp, '.material-slot[data-slot="1"]');
  assert(await evaluate(cdp, `document.querySelector('.material-slot[data-slot="1"]').getAttribute('aria-pressed') === 'true'`), 'Material selection did not update.');

  const responsiveLayouts = [];
  for (const width of [320, 768, 1024, 1440]) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: width <= 390 });
    const metrics = await evaluate(cdp, `(() => ({
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      shellWidth: Math.round(document.querySelector('.phone-shell').getBoundingClientRect().width)
    }))()`);
    responsiveLayouts.push(metrics);
  }
  responsiveLayouts.forEach((layout) => {
    assert(layout.documentWidth === layout.viewportWidth, `Horizontal overflow detected at ${layout.viewportWidth}px.`);
    assert(layout.shellWidth === Math.min(layout.viewportWidth, 390), `Unexpected phone shell width at ${layout.viewportWidth}px.`);
  });

  const accessibilityTree = await cdp.send('Accessibility.getFullAXTree');
  const unnamedButtons = accessibilityTree.nodes.filter((node) => node.role?.value === 'button' && !node.name?.value?.trim());
  assert(unnamedButtons.length === 0, `Found ${unnamedButtons.length} button(s) without accessible names.`);

  const browserErrors = cdp.events.filter((event) =>
    event.method === 'Runtime.exceptionThrown' ||
    (event.method === 'Log.entryAdded' && ['error', 'warning'].includes(event.params.entry.level))
  );
  assert(browserErrors.length === 0, `Browser emitted ${browserErrors.length} error/warning event(s).`);

  console.log(JSON.stringify({ results, filamentSheetResults, exploreReference, modelsReference, feeding, retracting, responsiveLayouts, interactions: 23, unnamedButtons: 0, browserErrors: 0, screenshotPaths }, null, 2));
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
      // The OS temp directory is the safe fallback if Chrome briefly retains a lock.
    }
  }
}
