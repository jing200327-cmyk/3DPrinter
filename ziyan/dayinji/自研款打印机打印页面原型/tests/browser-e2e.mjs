import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const prototypeRoot = path.resolve(import.meta.dirname, '..');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ziyan-printer-prototype-'));
const readyPreviewPath = path.join(prototypeRoot, 'prototype-ready.png');
const exploreToysPreviewPath = path.join(prototypeRoot, 'prototype-explore-toys.png');
const modelDetailPreviewPath = path.join(prototypeRoot, 'prototype-model-detail.png');
const preparePrintPreviewPath = path.join(prototypeRoot, 'prototype-prepare-print.png');
const prepareChangedPreviewPath = path.join(prototypeRoot, 'prototype-prepare-print-color-changed.png');
const prepareMaterialPreviewPath = path.join(prototypeRoot, 'prototype-prepare-material.png');
const prepareEmptyPreviewPath = path.join(prototypeRoot, 'prototype-prepare-empty.png');
const deviceSettingsFirmwarePreviewPath = path.join(prototypeRoot, 'prototype-device-settings-firmware.png');
const firmwareUpgradePreviewPath = path.join(prototypeRoot, 'prototype-firmware-upgrade.png');
const firmwareDialogPreviewPath = path.join(prototypeRoot, 'prototype-firmware-dialog.png');
const firmwareProgressPreviewPath = path.join(prototypeRoot, 'prototype-firmware-progress.png');
const firmwareDonePreviewPath = path.join(prototypeRoot, 'prototype-firmware-done.png');
const firmwareVersionPreviewPath = path.join(prototypeRoot, 'prototype-firmware-version.png');
const prepareUncheckedPreviewPath = path.join(prototypeRoot, 'prototype-prepare-print-unchecked.png');
const preparingFromPreparePreviewPath = path.join(prototypeRoot, 'prototype-preparing-from-prepare.png');
const timelapseFullscreenPreviewPath = path.join(prototypeRoot, 'prototype-timelapse-fullscreen.png');
const preparingPreviewPath = path.join(prototypeRoot, 'prototype-preparing.png');
const preparingCancelDialogPreviewPath = path.join(prototypeRoot, 'prototype-preparing-cancel-dialog.png');
const cancelledPreviewPath = path.join(prototypeRoot, 'prototype-cancelled-minimal.png');
const cancelAllPreviewPath = path.join(prototypeRoot, 'prototype-cancelled-all-tasks.png');
const previewPath = path.join(prototypeRoot, 'prototype-preview.png');
const plateTwoQueuePreviewPath = path.join(prototypeRoot, 'prototype-plate2-queue.png');
const queueTwoColorPreviewPath = path.join(prototypeRoot, 'prototype-queue-plate2-prepare.png');
const multiAccountQueuePreviewPath = path.join(prototypeRoot, 'prototype-multi-account-queue.png');
const preparePlateDragPreviewPath = path.join(prototypeRoot, 'prototype-prepare-plate-drag.png');
const prepareStateCompletedPreviewPath = path.join(prototypeRoot, 'prototype-prepare-state-completed.png');
const completedActionsPreviewPath = path.join(prototypeRoot, 'prototype-completed-actions.png');
const nextPlatePreviewPath = path.join(prototypeRoot, 'prototype-next-plate-preparing.png');
const filamentPanelPreviewPath = path.join(prototypeRoot, 'prototype-filament-panel.png');
const feedingPreviewPath = path.join(prototypeRoot, 'prototype-feeding.png');
const feedingDonePreviewPath = path.join(prototypeRoot, 'prototype-feeding-done.png');
const retractingPreviewPath = path.join(prototypeRoot, 'prototype-retracting.png');
const offlineConnectionPreviewPath = path.join(prototypeRoot, 'prototype-connection-offline.png');
const cameraLimitPreviewPath = path.join(prototypeRoot, 'prototype-camera-view-limit.png');
const deviceSettingsPreviewPath = path.join(prototypeRoot, 'prototype-device-settings.png');
const printOptionsPreviewPath = path.join(prototypeRoot, 'prototype-print-options.png');
const timelapsePagePreviewPath = path.join(prototypeRoot, 'prototype-timelapse-page.png');
const timelapseDeletePreviewPath = path.join(prototypeRoot, 'prototype-timelapse-delete.png');
const fanFilterPreviewPath = path.join(prototypeRoot, 'prototype-fan-filter.png');
const fanAlertPreviewPath = path.join(prototypeRoot, 'prototype-fan-alert.png');
const fullscreenFeedPreviewPath = path.join(prototypeRoot, 'prototype-fullscreen-feeding.png');
const fullscreenRetractPreviewPath = path.join(prototypeRoot, 'prototype-fullscreen-retracting.png');
const fullscreenFanAlertPreviewPath = path.join(prototypeRoot, 'prototype-fullscreen-fan-alert.png');
const addPrinterPreviewPath = path.join(prototypeRoot, 'prototype-add-printer.png');
const removePrinterPreviewPath = path.join(prototypeRoot, 'prototype-remove-printer.png');
const logicDemoPreviewPath = path.join(prototypeRoot, 'prototype-logic-demo.png');
const materialSettingsPreviewPath = path.join(prototypeRoot, 'prototype-material-settings.png');
const materialNamePreviewPath = path.join(prototypeRoot, 'prototype-material-name.png');
const materialTypePreviewPath = path.join(prototypeRoot, 'prototype-material-type.png');
const materialColorPreviewPath = path.join(prototypeRoot, 'prototype-material-color.png');
const pageUrl = pathToFileURL(path.join(prototypeRoot, 'index.html')).href;

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--remote-debugging-port=0',
  `--user-data-dir=${profileDir}`,
  '--window-size=375,812',
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

async function waitFor(cdp, expression, message) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const evaluation = await cdp.send('Runtime.evaluate', { returnByValue: true, expression });
      if (evaluation.result.value) return;
    } catch {
      // Navigation briefly replaces the execution context.
    }
    await delay(100);
  }
  throw new Error(message);
}

/* 真实命中测试用的鼠标点击：走浏览器命中判定，能验证热区的层级关系 */
async function mouse(cdp, type, x, y) {
  await cdp.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
}

async function clickAt(cdp, x, y) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await delay(220);
}

async function inspectPlateMapping(cdp, plate) {
  await cdp.send('Page.navigate', { url: `${pageUrl}?plate=${plate}&status=printing` });
  await delay(500);
  const evaluation = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const visibleTasks = [...document.querySelectorAll('[data-queue-task]:not([hidden])')];
      const images = [document.querySelector('#active-task-image'), ...visibleTasks.map(task => task.querySelector('.queue-task-artwork'))];
      await Promise.all(images.map(image => image.complete ? Promise.resolve() : new Promise(resolve => image.addEventListener('load', resolve, { once: true }))));
      return {
        activeSrc: decodeURI(document.querySelector('#active-task-image').currentSrc),
        title: document.querySelector('#task-title').textContent,
        meta: document.querySelector('.task-meta').textContent,
        time: document.querySelector('#remaining-time').textContent,
        queuePlates: visibleTasks.map(task => task.dataset.plate),
        queueSrcs: visibleTasks.map(task => decodeURI(task.querySelector('.queue-task-artwork').currentSrc))
      };
    })()`
  });
  return evaluation.result.value;
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
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await cdp.send('Page.reload');
  await delay(700);

  /* 进料中 / 退料中页面在未进入时必须完全不可见：
     .fo-screen 自己是 display:flex，若漏了 [hidden] 兜底会一直盖在打印页上（真实踩过一次） */
  const filamentLayerResult = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const screen = document.querySelector('#filament-operation-screen');
      const atCenter = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
      return { hidden: screen.hidden, display: getComputedStyle(screen).display, painted: screen.offsetParent !== null, topAt: atCenter ? (atCenter.id || atCenter.className) : '' };
    })()`
  });
  const filamentLayer = filamentLayerResult.result.value;
  assert(filamentLayer.hidden && filamentLayer.display === 'none' && !filamentLayer.painted, `进料中页面在初始状态必须隐藏：${JSON.stringify(filamentLayer)}`);
  assert(filamentLayer.topAt !== 'filament-operation-screen', `进料中页面不得盖在打印页之上：${JSON.stringify(filamentLayer)}`);

  const readyState = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const image = document.querySelector('#ready-navigation-image');
      if (!image.complete) await new Promise(resolve => image.addEventListener('load', resolve, { once: true }));
      const frame = document.querySelector('#model-navigation').getBoundingClientRect();
      const artwork = image.getBoundingClientRect();
      const buttonGeometry = [...document.querySelectorAll('.model-navigation-hotspot')].map(button => {
        const rect = button.getBoundingClientRect();
        return {
          left: (rect.left - frame.left) / frame.width,
          top: (rect.top - frame.top) / frame.height,
          right: (rect.right - frame.left) / frame.width,
          bottom: (rect.bottom - frame.top) / frame.height
        };
      });
      return {
        status: document.querySelector('#task-panel').dataset.status,
        label: document.querySelector('#task-state').textContent,
        modelNavigationVisible: !document.querySelector('#model-navigation').hidden,
        taskSummaryHidden: document.querySelector('.task-summary').hidden,
        actionsHidden: document.querySelector('#task-actions').hidden,
        completionHidden: document.querySelector('#completion-actions').hidden,
        queueToggleHidden: document.querySelector('#queue-toggle').hidden,
        queueHidden: document.querySelector('#print-queue').hidden,
        loaded: image.naturalWidth === 800 && image.naturalHeight === 395,
        src: decodeURI(image.currentSrc),
        crop: { frameHeight: frame.height, imageTopDelta: artwork.top - frame.top, imageBottomDelta: artwork.bottom - frame.bottom },
        buttonGeometry
      };
    })()`
  });
  const ready = readyState.result.value;
  assert(ready.status === 'ready' && ready.label === '可打印', `Direct printer entry did not start in the ready state: ${JSON.stringify(ready)}`);
  assert(ready.modelNavigationVisible && ready.taskSummaryHidden && ready.actionsHidden && ready.completionHidden && ready.queueToggleHidden && ready.queueHidden, `Ready state exposes non-navigation task content: ${JSON.stringify(ready)}`);
  assert(ready.loaded && ready.src.endsWith('打印任务面板空闲.jpg') && ready.crop.imageTopDelta < -20 && Math.abs(ready.crop.imageBottomDelta) < 1, `Ready navigation artwork was not loaded and cropped correctly: ${JSON.stringify(ready)}`);
  assert(ready.buttonGeometry.length === 2 && ready.buttonGeometry[0].left < 0.1 && ready.buttonGeometry[0].top > 0.58 && ready.buttonGeometry[0].right < 0.5 && ready.buttonGeometry[1].left > 0.5 && ready.buttonGeometry[1].bottom < 0.93, `Ready navigation hotspots do not cover both source buttons: ${JSON.stringify(ready.buttonGeometry)}`);
  const readyConnection = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const panel = document.querySelector('#printer-connection-state');
      const image = document.querySelector('#printer-connection-state-image');
      if (image && !image.complete) await new Promise(resolve => image.addEventListener('load', resolve, { once: true }));
      if (!panel || !image) return { present: false };
      const header = document.querySelector('.printer-header').getBoundingClientRect();
      const rect = image.getBoundingClientRect();
      return {
        present: true,
        status: panel.dataset.connectionStatus,
        label: document.querySelector('#printer-connection-state-label').textContent,
        hidden: image.hidden,
        src: decodeURI(image.currentSrc),
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        rect: {
          left: (rect.left - header.left) / header.width,
          top: (rect.top - header.top) / header.height,
          right: (rect.right - header.left) / header.width,
          bottom: (rect.bottom - header.top) / header.height
        }
      };
    })()`
  });
  assert(readyConnection.result.value.present && readyConnection.result.value.status === 'idle' && readyConnection.result.value.label === '空闲' && !readyConnection.result.value.hidden, `Ready state did not show the idle printer connection overlay: ${JSON.stringify(readyConnection.result.value)}`);
  assert(readyConnection.result.value.src.endsWith('lianjiezhuangtai/空闲.png') && readyConnection.result.value.naturalWidth === 97 && readyConnection.result.value.naturalHeight === 39, `Idle connection asset is incorrect: ${JSON.stringify(readyConnection.result.value)}`);
  assert(readyConnection.result.value.rect.left > 0.15 && readyConnection.result.value.rect.left < 0.18 && readyConnection.result.value.rect.top > 0.69 && readyConnection.result.value.rect.top < 0.75, `Idle connection overlay does not cover the source busy indicator: ${JSON.stringify(readyConnection.result.value.rect)}`);
  const cameraMonitor = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const monitor = document.querySelector('#timelapse-placeholder');
      const image = document.querySelector('#camera-monitor-image');
      const timelapse = document.querySelector('#timelapse-action');
      const toggle = document.querySelector('#camera-toggle');
      if (!image.complete) await new Promise(resolve => image.addEventListener('load', resolve, { once: true }));
      const frame = monitor.getBoundingClientRect();
      const relative = (node) => { const rect = node.getBoundingClientRect(); return { left: (rect.left - frame.left) / frame.width, top: (rect.top - frame.top) / frame.height, right: (rect.right - frame.left) / frame.width, bottom: (rect.bottom - frame.top) / frame.height, zIndex: getComputedStyle(node).zIndex }; };
      const active = { state: monitor.dataset.cameraState, image: decodeURI(image.currentSrc), pressed: toggle.getAttribute('aria-pressed'), timelapse: relative(timelapse), toggle: relative(toggle), background: getComputedStyle(timelapse).backgroundColor, color: getComputedStyle(timelapse).color };
      toggle.click();
      if (!image.complete) await new Promise(resolve => image.addEventListener('load', resolve, { once: true }));
      const off = { state: monitor.dataset.cameraState, image: decodeURI(image.currentSrc), pressed: toggle.getAttribute('aria-pressed'), timelapse: relative(timelapse) };
      return { active, off };
    })()`
  });
  assert(cameraMonitor.result.value.active.state === 'on' && cameraMonitor.result.value.active.image.endsWith('shexiangtou/空闲延时摄影.jpg') && cameraMonitor.result.value.active.pressed === 'true' && cameraMonitor.result.value.active.timelapse.right > 0.95 && cameraMonitor.result.value.active.timelapse.top < 0.12 && cameraMonitor.result.value.active.toggle.left < 0.14 && cameraMonitor.result.value.active.toggle.bottom > 0.86, `Camera monitor controls are not positioned at the required corners or do not use the idle timelapse asset: ${JSON.stringify(cameraMonitor.result.value)}`);
  assert(cameraMonitor.result.value.active.background.startsWith('rgba(') && cameraMonitor.result.value.active.color === 'rgb(255, 255, 255)' && Number(cameraMonitor.result.value.active.timelapse.zIndex) > 1, `Timelapse action does not use the required translucent gray, white, top-layer styling: ${JSON.stringify(cameraMonitor.result.value.active)}`);
  assert(cameraMonitor.result.value.off.state === 'off' && cameraMonitor.result.value.off.pressed === 'false' && cameraMonitor.result.value.off.image.endsWith('shexiangtou/关闭摄像头状态.jpg') && Number(cameraMonitor.result.value.off.timelapse.zIndex) > 1, `Camera toggle did not preserve the timelapse action while replacing the monitor with the off-state asset: ${JSON.stringify(cameraMonitor.result.value.off)}`);
  const readyScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(readyPreviewPath, Buffer.from(readyScreenshot.data, 'base64'));

  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#explore-toys').click()` });
  await waitFor(cdp, `!document.querySelector('#explore-toys-screen').hidden`, 'Explore toys did not open the reused 探索玩具页 artwork.');
  const exploreToys = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const screen = document.querySelector('#explore-toys-screen');
      const image = screen.querySelector('img');
      if (!image.complete) await new Promise(resolve => image.addEventListener('load', resolve, { once: true }));
      const stage = screen.querySelector('.reuse-stage').getBoundingClientRect();
      const relative = (selector) => {
        const rect = document.querySelector(selector).getBoundingClientRect();
        return {
          left: (rect.left - stage.left) / stage.width,
          top: (rect.top - stage.top) / stage.height,
          right: (rect.right - stage.left) / stage.width,
          bottom: (rect.bottom - stage.top) / stage.height
        };
      };
      return {
        visible: !screen.hidden,
        loaded: image.complete && image.naturalWidth > 0,
        src: decodeURI(image.currentSrc),
        imageSize: { width: image.naturalWidth, height: image.naturalHeight },
        deviceInert: document.querySelector('#device-page').inert,
        back: relative('#explore-toys-back'),
        anywhere: relative('#explore-toys-anywhere'),
        backZ: Number(getComputedStyle(document.querySelector('#explore-toys-back')).zIndex),
        anywhereZ: Number(getComputedStyle(document.querySelector('#explore-toys-anywhere')).zIndex),
        backHeight: Math.round(document.querySelector('#explore-toys-back').getBoundingClientRect().height)
      };
    })()`
  });
  const explore = exploreToys.result.value;
  assert(explore.visible && explore.loaded && explore.src.endsWith('原型修改复用图片资源/探索玩具页.png'), `Explore toys did not open the reused artwork: ${JSON.stringify(explore)}`);
  assert(explore.imageSize.width === 941 && explore.imageSize.height === 1672, `Explore toys artwork has unexpected dimensions: ${JSON.stringify(explore.imageSize)}`);
  assert(explore.deviceInert, 'Printing prototype must be inert while the explore page is open.');
  assert(explore.back.left < 0.01 && explore.back.top < 0.01 && explore.back.right > 0.4, `Explore back hotspot is not pinned to the artwork top-left corner: ${JSON.stringify(explore.back)}`);
  assert(explore.back.bottom < 0.036, `Explore back hotspot would overlap the 筛选 pill: ${JSON.stringify(explore.back)}`);
  assert(explore.backHeight >= 20, `Explore back hotspot is too small to tap: ${explore.backHeight}px`);
  assert(explore.backZ > explore.anywhereZ, 'Explore back hotspot must sit above the click-anywhere layer.');
  assert(explore.anywhere.left < 0.001 && explore.anywhere.right > 0.999 && explore.anywhere.bottom > 0.999, `Explore click-anywhere layer does not cover the page: ${JSON.stringify(explore.anywhere)}`);
  const exploreToysScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(exploreToysPreviewPath, Buffer.from(exploreToysScreenshot.data, 'base64'));

  /* 左上角真实命中测试：回退热区必须盖住“点击任意位置”那一层 */
  const exploreCorner = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => { const r = document.querySelector('#explore-toys-back').getBoundingClientRect(); return { x: r.left + 14, y: r.top + 14 }; })()`
  });
  await clickAt(cdp, exploreCorner.result.value.x, exploreCorner.result.value.y);
  await waitFor(cdp, `document.querySelector('#explore-toys-screen').hidden && !document.querySelector('#device-page').inert`, 'Explore top-left corner did not return to the printer page.');

  /* 点击中间 → 模型详情页 */
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#explore-toys').click()` });
  await waitFor(cdp, `!document.querySelector('#explore-toys-screen').hidden`, 'Explore page did not reopen.');
  const exploreCenter = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => { const r = document.querySelector('#explore-toys-anywhere').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.6 }; })()`
  });
  await clickAt(cdp, exploreCenter.result.value.x, exploreCenter.result.value.y);
  await waitFor(cdp, `!document.querySelector('#model-detail-screen').hidden`, 'Clicking anywhere on the explore page did not open the model detail page.');
  const modelDetailShot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(modelDetailPreviewPath, Buffer.from(modelDetailShot.data, 'base64'));

  /* 模型详情 → 准备打印 → 选择耗材 → 无耗材 → 回到准备打印 */
  const prepareChain = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const shot = (selector) => {
        const stage = document.querySelector(selector + ' .reuse-stage').getBoundingClientRect();
        const image = document.querySelector(selector + ' img');
        const active = [...document.querySelectorAll('.reuse-screen')].filter(screen => !screen.hidden).map(screen => screen.id);
        return { stage, image, active };
      };
      const detail = document.querySelector('#model-detail-screen');
      const detailImage = detail.querySelector('img');
      if (!detailImage.complete) await new Promise(resolve => detailImage.addEventListener('load', resolve, { once: true }));
      const detailStage = detail.querySelector('.reuse-stage').getBoundingClientRect();
      const printHotspot = document.querySelector('#open-prepare-print').getBoundingClientRect();
      const relative = (rect, stage) => ({
        left: (rect.left - stage.left) / stage.width,
        top: (rect.top - stage.top) / stage.height,
        right: (rect.right - stage.left) / stage.width,
        bottom: (rect.bottom - stage.top) / stage.height,
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      });
      const result = {
        detailSrc: decodeURI(detailImage.currentSrc),
        detailSize: { width: detailImage.naturalWidth, height: detailImage.naturalHeight },
        printHotspot: relative(printHotspot, detailStage)
      };
      document.querySelector('#open-prepare-print').click();
      await wait(240);
      const printStage = document.querySelector('#prepare-print-screen .reuse-stage').getBoundingClientRect();
      const printImage = document.querySelector('#prepare-print-screen img');
      result.preparePrintSrc = decodeURI(printImage.currentSrc);
      result.preparePrintSize = { width: printImage.naturalWidth, height: printImage.naturalHeight };
      /* 打印机卡片右侧的“切换”热区 */
      result.switchHotspot = relative(document.querySelector('#prepare-switch-printer').getBoundingClientRect(), printStage);
      /* 五张耗材色卡：盘 1 一张、盘 2 两张、盘 3 两张；只有盘 3 右侧那张带红框 */
      result.chips = [...document.querySelectorAll('.plate-material-hit')].map((chip) => ({
        plate: chip.closest('.plate-row').dataset.plate,
        chip: chip.dataset.chip,
        target: chip.dataset.target,
        mismatch: chip.classList.contains('plate-material-hit--mismatch'),
        labelled: Boolean(chip.getAttribute('aria-label')),
        box: relative(chip.getBoundingClientRect(), printStage)
      }));
      /* 非红框色卡 → 选择耗材页 → 底部“确定” → 准备打印页 */
      document.querySelector('.plate-row[data-plate="1"] [data-chip="left"]').click();
      await wait(240);
      const materialImage = document.querySelector('#prepare-material-screen img');
      result.prepareMaterialSrc = decodeURI(materialImage.currentSrc);
      result.prepareMaterialSize = { width: materialImage.naturalWidth, height: materialImage.naturalHeight };
      const materialStage = document.querySelector('#prepare-material-screen .reuse-stage').getBoundingClientRect();
      result.materialConfirm = relative(document.querySelector('#prepare-material-confirm').getBoundingClientRect(), materialStage);
      result.materialClose = relative(document.querySelector('#prepare-material-close').getBoundingClientRect(), materialStage);
      document.querySelector('#prepare-material-confirm').click();
      await wait(240);
      result.afterMaterialConfirm = shot('#prepare-print-screen').active;
      /* 盘 2 右侧（不带红框）也必须进选择耗材页 */
      document.querySelector('.plate-row[data-plate="2"] [data-chip="right"]').click();
      await wait(240);
      result.plateTwoRightChipOpened = shot('#prepare-material-screen').active;
      document.querySelector('#prepare-material-close').click();
      await wait(240);
      result.afterMaterialClose = shot('#prepare-print-screen').active;
      /* 红框色卡 → 无耗材页；这一趟只验证右上角 × 能回准备打印页（此时还没换色） */
      document.querySelector('.plate-row[data-plate="3"] [data-chip="right"]').click();
      await wait(240);
      const emptyImage = document.querySelector('#prepare-empty-screen img');
      result.prepareEmptySrc = decodeURI(emptyImage.currentSrc);
      result.prepareEmptySize = { width: emptyImage.naturalWidth, height: emptyImage.naturalHeight };
      const emptyStage = document.querySelector('#prepare-empty-screen .reuse-stage').getBoundingClientRect();
      result.emptySpool = relative(document.querySelector('#prepare-empty-spool').getBoundingClientRect(), emptyStage);
      result.emptyClose = relative(document.querySelector('#prepare-empty-close').getBoundingClientRect(), emptyStage);
      document.querySelector('#prepare-empty-close').click();
      await wait(240);
      result.afterEmptyClose = shot('#prepare-print-screen').active;
      result.afterEmptyCloseSrc = decodeURI(document.querySelector('#prepare-artwork').currentSrc);
      /* 再走一趟完整链路：红框色卡 → 无耗材页 → 中央料架 → 选择耗材页 → 确定
         → 耗材颜色已变更，整张准备打印页换成“耗材颜色更换后”的原图 */
      document.querySelector('.plate-row[data-plate="3"] [data-chip="right"]').click();
      await wait(240);
      document.querySelector('#prepare-empty-spool').click();
      await wait(240);
      result.afterEmptySpoolSrc = decodeURI(document.querySelector('#prepare-material-screen img').currentSrc);
      result.afterEmptySpool = shot('#prepare-material-screen').active;
      document.querySelector('#prepare-material-confirm').click();
      await wait(300);
      result.afterEmptyConfirm = shot('#prepare-print-screen').active;
      var changedStage = document.querySelector('#prepare-stage');
      result.changedArtworkSrc = decodeURI(document.querySelector('#prepare-artwork').currentSrc);
      result.changedArtworkSize = { width: document.querySelector('#prepare-artwork').naturalWidth, height: document.querySelector('#prepare-artwork').naturalHeight };
      result.changedRatio = getComputedStyle(changedStage).getPropertyValue('--reuse-ratio').trim();
      result.changedRowArt = [...document.querySelectorAll('.plate-row')].map((rowElement) => ({
        plate: rowElement.dataset.plate,
        slot: rowElement.dataset.slot,
        src: decodeURI(rowElement.querySelector('.plate-row-art').currentSrc)
      }));
      /* 换图后色卡热区必须仍严格压在卡片上。卡片在原图像素空间的几何是量好的：
         左卡 x 165~238、右卡 x 245~318；卡身 = 行切片顶 + 47，高 53。 */
      const artRect = document.querySelector('#prepare-artwork').getBoundingClientRect();
      const slotTopsForCheck = [222, 366, 511];
      const toViewport = (px, py) => ({ x: artRect.left + (artRect.width * px) / 375, y: artRect.top + (artRect.height * py) / 812 });
      result.changedChipAlignment = [...document.querySelectorAll('.plate-row')].flatMap((rowElement) => {
        const slotTop = slotTopsForCheck[Number(rowElement.dataset.slot)];
        const cardTop = slotTop + 47;
        const cardBottom = cardTop + 53;
        return [...rowElement.querySelectorAll('.plate-material-hit')].map((chipElement) => {
          const box = chipElement.getBoundingClientRect();
          const cardLeftX = chipElement.dataset.chip === 'left' ? 165 : 245;
          const cardRightX = cardLeftX + 73;
          const cardCentre = toViewport((cardLeftX + cardRightX) / 2, (cardTop + cardBottom) / 2);
          const cardTopLeft = toViewport(cardLeftX, cardTop);
          const cardBottomRight = toViewport(cardRightX, cardBottom);
          return {
            plate: rowElement.dataset.plate,
            chip: chipElement.dataset.chip,
            dx: Math.round((box.left + box.right) / 2 - cardCentre.x),
            dy: Math.round((box.top + box.bottom) / 2 - cardCentre.y),
            covers: box.left <= cardTopLeft.x + 2 && box.top <= cardTopLeft.y + 2 && box.right >= cardBottomRight.x - 2 && box.bottom >= cardBottomRight.y - 2
          };
        });
      });
      /* 红框已经消失：原来分流的盘 3 右侧色卡，现在也走选择耗材页 */
      document.querySelector('.plate-row[data-plate="3"] [data-chip="right"]').click();
      await wait(240);
      result.afterChangeMismatchChip = shot('#prepare-material-screen').active;
      document.querySelector('#prepare-material-close').click();
      await wait(300);
      result.afterChangeSheetClose = shot('#prepare-print-screen').active;
      result.afterChangeSheetCloseSrc = decodeURI(document.querySelector('#prepare-artwork').currentSrc);
      /* 其他按钮交互不变：勾选框照样能勾 / 取消，盘照样能选 */
      const toggleAfterChange = document.querySelector('#timelapse-toggle');
      const toggleBefore = toggleAfterChange.getAttribute('aria-checked');
      toggleAfterChange.click();
      await wait(150);
      const toggleMid = toggleAfterChange.getAttribute('aria-checked');
      toggleAfterChange.click();
      await wait(150);
      result.changedTimelapse = { before: toggleBefore, mid: toggleMid, restored: toggleAfterChange.getAttribute('aria-checked') };
      document.querySelector('.plate-row[data-plate="2"] .plate-row-hit').click();
      await wait(150);
      result.changedSelectedPlate = document.querySelector('.plate-row[aria-selected="true"]').dataset.plate;
      selectPlate('1');
      /* 等勾选提示的 toast 自动收起，免得挡住换色后的验收截图 */
      await wait(1900);
      /* 准备打印页“切换” → 添加打印机页 → 返回准备打印页 */
      document.querySelector('#prepare-switch-printer').click();
      await wait(260);
      result.afterSwitch = shot('#add-printer-screen').active;
      result.addPrinterSrc = decodeURI(document.querySelector('#add-printer-screen img').currentSrc);
      document.querySelector('#add-printer-back').click();
      await wait(240);
      result.afterSwitchBack = shot('#prepare-print-screen').active;
      return result;
    })()`
  });
  const chain = prepareChain.result.value;
  assert(chain.detailSrc.endsWith('原型修改复用图片资源/模型详情页.png') && chain.detailSize.width === 941 && chain.detailSize.height === 1672, `Model detail page did not load its artwork: ${JSON.stringify(chain)}`);
  assert(chain.printHotspot.left > 0.5 && chain.printHotspot.left < 0.51 && chain.printHotspot.right > 0.96 && chain.printHotspot.top > 0.91 && chain.printHotspot.bottom < 0.985 && chain.printHotspot.height >= 44, `立即打印 hotspot does not cover the artwork button: ${JSON.stringify(chain.printHotspot)}`);
  assert(chain.preparePrintSrc.endsWith('assets/准备打印页-底图.png') && chain.preparePrintSize.width === 311 && chain.preparePrintSize.height === 675, `Prepare print page did not load its sliced artwork: ${JSON.stringify(chain)}`);
  /* 打印机卡片右侧的“切换” */
  assert(chain.switchHotspot.left > 0.73 && chain.switchHotspot.left < 0.74 && chain.switchHotspot.right > 0.95 && chain.switchHotspot.right < 0.96 && chain.switchHotspot.top > 0.10 && chain.switchHotspot.top < 0.12 && chain.switchHotspot.bottom < 0.22 && chain.switchHotspot.width >= 44 && chain.switchHotspot.height >= 44, `The 切换 hotspot does not cover the printer-card switch: ${JSON.stringify(chain.switchHotspot)}`);
  /* 五张色卡 + 红框分流 */
  assert(chain.chips.length === 5, `Expected 5 material chips, got ${chain.chips.length}.`);
  assert(chain.chips.every((chip) => chip.labelled && chip.box.width >= 44 && chip.box.height >= 44), `Material chips are unusable: ${JSON.stringify(chain.chips)}`);
  assert(JSON.stringify(chain.chips.map((chip) => `${chip.plate}:${chip.chip}:${chip.target}:${chip.mismatch}`)) === JSON.stringify(['1:left:prepareMaterial:false', '2:left:prepareMaterial:false', '2:right:prepareMaterial:false', '3:left:prepareMaterial:false', '3:right:prepareEmpty:true']), `Material chip routing is wrong: ${JSON.stringify(chain.chips)}`);
  const leftChip = chain.chips[0].box;
  const rightChip = chain.chips[2].box;
  assert(leftChip.left > 0.44 && leftChip.left < 0.45 && leftChip.right > 0.64 && leftChip.right < 0.66, `The left colour chip hotspot is misplaced: ${JSON.stringify(leftChip)}`);
  assert(rightChip.left > 0.65 && rightChip.left < 0.67 && rightChip.right > 0.85 && rightChip.right < 0.87, `The right colour chip hotspot does not cover the red-bordered card: ${JSON.stringify(rightChip)}`);
  assert(leftChip.top > 0.325 && leftChip.bottom < 0.41, `The row-1 colour chip hotspot is not inside its row: ${JSON.stringify(leftChip)}`);
  /* 选择耗材页：底部确定 + 右上角 × */
  assert(chain.prepareMaterialSrc.endsWith('原型修改复用图片资源/准备打印页选择耗材.png') && chain.prepareMaterialSize.width === 314, `Prepare material page did not load its artwork: ${JSON.stringify(chain)}`);
  assert(chain.materialConfirm.left < 0.02 && chain.materialConfirm.right > 0.98 && chain.materialConfirm.top > 0.92 && chain.materialConfirm.bottom < 1 && chain.materialConfirm.height >= 44, `The 确定 hotspot does not cover the sheet confirm button: ${JSON.stringify(chain.materialConfirm)}`);
  assert(chain.materialClose.left > 0.84 && chain.materialClose.right < 0.996 && chain.materialClose.top > 0.44 && chain.materialClose.bottom < 0.53 && chain.materialClose.width >= 44 && chain.materialClose.height >= 44, `The sheet close hotspot is misplaced: ${JSON.stringify(chain.materialClose)}`);
  assert(chain.afterMaterialConfirm.length === 1 && chain.afterMaterialConfirm[0] === 'prepare-print-screen', `确定 did not return to the prepare-print page: ${JSON.stringify(chain.afterMaterialConfirm)}`);
  assert(chain.plateTwoRightChipOpened[0] === 'prepare-material-screen', `A non-red-bordered chip did not open the material sheet: ${JSON.stringify(chain.plateTwoRightChipOpened)}`);
  assert(chain.afterMaterialClose[0] === 'prepare-print-screen', `The material sheet close did not return to the prepare-print page: ${JSON.stringify(chain.afterMaterialClose)}`);
  /* 红框色卡 → 无耗材页 → 中央料架 → 选择耗材页 */
  assert(chain.prepareEmptySrc.endsWith('原型修改复用图片资源/准备打印页无耗材.png') && chain.prepareEmptySize.width === 308, `Prepare empty page did not load its artwork: ${JSON.stringify(chain)}`);
  assert(chain.emptySpool.left > 0.30 && chain.emptySpool.left < 0.32 && chain.emptySpool.right > 0.68 && chain.emptySpool.right < 0.70 && chain.emptySpool.top > 0.65 && chain.emptySpool.bottom < 0.86 && chain.emptySpool.width >= 90 && chain.emptySpool.height >= 90, `The centre spool hotspot does not cover the 料架: ${JSON.stringify(chain.emptySpool)}`);
  assert(chain.emptyClose.left > 0.84 && chain.emptyClose.right < 0.996 && chain.emptyClose.top > 0.44 && chain.emptyClose.bottom < 0.53 && chain.emptyClose.width >= 44 && chain.emptyClose.height >= 44, `The empty-sheet close hotspot is misplaced: ${JSON.stringify(chain.emptyClose)}`);
  assert(chain.afterEmptySpool[0] === 'prepare-material-screen' && chain.afterEmptySpoolSrc.endsWith('原型修改复用图片资源/准备打印页选择耗材.png'), `The 无耗材 spool did not open the material sheet: ${JSON.stringify(chain.afterEmptySpool)}`);
  assert(chain.afterEmptyConfirm.length === 1 && chain.afterEmptyConfirm[0] === 'prepare-print-screen', `确定 after the 无耗材 path did not return to the prepare-print page: ${JSON.stringify(chain.afterEmptyConfirm)}`);
  assert(chain.afterEmptyClose[0] === 'prepare-print-screen', `The empty sheet close did not return to the prepare-print page: ${JSON.stringify(chain.afterEmptyClose)}`);
  /* 切换 → 添加打印机页 → 返回 */
  assert(chain.afterSwitch.length === 1 && chain.afterSwitch[0] === 'add-printer-screen' && chain.addPrinterSrc.endsWith('原型修改复用图片资源/添加打印机.png'), `准备打印页的切换 did not open the add-printer page: ${JSON.stringify(chain.afterSwitch)}`);
  assert(chain.afterSwitchBack.length === 1 && chain.afterSwitchBack[0] === 'prepare-print-screen', `The add-printer back control did not return to the prepare-print page: ${JSON.stringify(chain.afterSwitchBack)}`);
  /* 换色后的准备打印页：整页换成“耗材颜色更换后”的原图，其他按钮交互不变 */
  assert(chain.afterEmptyClose[0] === 'prepare-print-screen' && chain.afterEmptyCloseSrc.endsWith('assets/准备打印页-底图.png'), `The empty sheet close did not return to the default prepare-print page: ${JSON.stringify(chain.afterEmptyClose)} ${chain.afterEmptyCloseSrc}`);
  assert(chain.changedArtworkSrc.endsWith('assets/准备打印页-更换后-底图.png') && chain.changedArtworkSize.width === 375 && chain.changedArtworkSize.height === 812, `确定 did not swap in the color-changed artwork: ${chain.changedArtworkSrc} ${JSON.stringify(chain.changedArtworkSize)}`);
  assert(chain.changedRatio.replace(/\s+/g, '') === '375/812', `The color-changed artwork did not relock the stage ratio: ${chain.changedRatio}`);
  assert(chain.changedRowArt.length === 3 && chain.changedRowArt.every((row) => row.src.endsWith(`assets/准备打印页-更换后-盘${row.plate}.png`)), `The colour-changed plate rows did not swap: ${JSON.stringify(chain.changedRowArt)}`);
  assert(chain.changedChipAlignment.length === 5 && chain.changedChipAlignment.every((chip) => chip.covers && Math.abs(chip.dx) <= 5 && Math.abs(chip.dy) <= 5), `Colour-chip hotspots drifted off their cards after the artwork swap: ${JSON.stringify(chain.changedChipAlignment)}`);
  assert(chain.afterChangeMismatchChip[0] === 'prepare-material-screen', `The red-bordered chip still routed to the empty sheet after the colour change: ${JSON.stringify(chain.afterChangeMismatchChip)}`);
  assert(chain.afterChangeSheetClose[0] === 'prepare-print-screen' && chain.afterChangeSheetCloseSrc.endsWith('assets/准备打印页-更换后-底图.png'), `Closing the sheet dropped the colour-changed artwork: ${JSON.stringify(chain.afterChangeSheetClose)} ${chain.afterChangeSheetCloseSrc}`);
  assert(chain.changedTimelapse.before === 'true' && chain.changedTimelapse.mid === 'false' && chain.changedTimelapse.restored === 'true', `The timelapse checkbox stopped working after the colour change: ${JSON.stringify(chain.changedTimelapse)}`);
  assert(chain.changedSelectedPlate === '2', `The plate list stopped being selectable after the colour change: ${chain.changedSelectedPlate}`);

  /* 换色后的准备打印页验收图（此时还停在换色态） */
  const prepareChangedScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(prepareChangedPreviewPath, Buffer.from(prepareChangedScreenshot.data, 'base64'));
  /* 从模型详情重新进准备打印页 = 重新走流程，原图回到未换色那一张 */
  const prepareReentry = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const artwork = () => decodeURI(document.querySelector('#prepare-artwork').currentSrc);
      document.querySelector('#prepare-print-back').click();
      await wait(240);
      document.querySelector('#open-prepare-print').click();
      await wait(320);
      return {
        afterReentry: artwork(),
        visible: [...document.querySelectorAll('.reuse-screen')].filter(screen => !screen.hidden).map(screen => screen.id)
      };
    })()`
  });
  const reentry = prepareReentry.result.value;
  assert(reentry.visible.length === 1 && reentry.visible[0] === 'prepare-print-screen' && reentry.afterReentry.endsWith('assets/准备打印页-底图.png'), `Re-entering the prepare page did not restore the default artwork: ${JSON.stringify(reentry)}`);

  /* 准备打印页 / 选择耗材页 / 无耗材页的验收图（此时已回到准备打印页） */
  const preparePrintScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(preparePrintPreviewPath, Buffer.from(preparePrintScreenshot.data, 'base64'));
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('.plate-row[data-plate="1"] [data-chip="left"]').click()` });
  await delay(240);
  const prepareMaterialScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(prepareMaterialPreviewPath, Buffer.from(prepareMaterialScreenshot.data, 'base64'));
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#prepare-material-confirm').click(); document.querySelector('.plate-row[data-plate="3"] [data-chip="right"]').click()` });
  await delay(240);
  const prepareEmptyScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(prepareEmptyPreviewPath, Buffer.from(prepareEmptyScreenshot.data, 'base64'));
  await cdp.send('Runtime.evaluate', { expression: `returnToReuseScreen('preparePrint')` });
  await delay(240);

  /* 返回链：准备打印 → 模型详情 */
  const prepareBack = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const visible = () => [...document.querySelectorAll('.reuse-screen')].filter(screen => !screen.hidden).map(screen => screen.id);
      document.querySelector('#prepare-print-back').click();
      await wait(200);
      const afterPrintBack = visible();
      document.querySelector('#model-detail-back').click();
      await wait(200);
      const afterDetailBack = visible();
      document.querySelector('#explore-toys-back').click();
      await wait(200);
      return { afterPrintBack, afterDetailBack, finalVisible: visible(), deviceInteractive: !document.querySelector('#device-page').inert };
    })()`
  });
  const back = prepareBack.result.value;
  assert(back.afterPrintBack.length === 1 && back.afterPrintBack[0] === 'model-detail-screen', `准备打印 back did not return to the model detail page: ${JSON.stringify(back)}`);
  assert(back.afterDetailBack.length === 1 && back.afterDetailBack[0] === 'explore-toys-screen', `模型详情 back did not return to the explore page: ${JSON.stringify(back)}`);
  assert(back.finalVisible.length === 0 && back.deviceInteractive, `探索玩具 back did not return to the printer page: ${JSON.stringify(back)}`);

  /* ---------- 回归：只进一次「设备设置」（顶栏齿轮）不该把首页固件提醒条一起收掉 ----------
     提醒条反映的是「设备上有没有待安装的新版本」这一设备事实，与「从哪个入口进的设置页」无关；
     只有走完整条升级链路（更新完成页点「我知道了」）才该让它消失。 */
  const firmwareGearRegression = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const visible = () => [...document.querySelectorAll('.reuse-screen')].filter(screen => !screen.hidden).map(screen => screen.id);
      const banner = () => {
        const node = document.querySelector('#firmware-banner');
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return { hidden: node.hidden, display: style.display, width: Math.round(rect.width), height: Math.round(rect.height) };
      };
      const before = banner();
      document.querySelector('#printer-settings').click();
      await wait(300);
      const inSettings = { visible: visible(), badgeHidden: document.querySelector('#firmware-status-badge').hidden };
      document.querySelector('#open-firmware-version').click();
      await wait(320);
      const rowTarget = visible();
      document.querySelector('#firmware-version-back').click();
      await wait(260);
      document.querySelector('#device-settings-back').click();
      await wait(320);
      return { before, inSettings, rowTarget, after: banner(), deviceInteractive: !document.querySelector('#device-page').inert };
    })()`
  });
  const gearRegression = firmwareGearRegression.result.value;
  assert(!gearRegression.before.hidden && gearRegression.before.height >= 44, `The firmware banner must be visible on the first screen: ${JSON.stringify(gearRegression.before)}`);
  assert(gearRegression.inSettings.visible.length === 1 && gearRegression.inSettings.visible[0] === 'device-settings-screen', `The gear did not open 设备设置: ${JSON.stringify(gearRegression.inSettings)}`);
  assert(gearRegression.inSettings.badgeHidden, `Opening 设备设置 from the gear must not show the orange firmware copy: ${JSON.stringify(gearRegression.inSettings)}`);
  assert(gearRegression.rowTarget.length === 1 && gearRegression.rowTarget[0] === 'firmware-version-screen', `From the gear the 固件版本 row must open 固件版本页: ${JSON.stringify(gearRegression.rowTarget)}`);
  assert(!gearRegression.after.hidden && gearRegression.after.display === 'flex' && gearRegression.after.width >= 343 && gearRegression.after.height >= 44, `Opening 设备设置 once from the gear must not remove the home firmware banner: ${JSON.stringify(gearRegression.after)}`);
  assert(gearRegression.deviceInteractive, 'The printer page must stay interactive after the gear round trip.');

  /* ---------- 固件升级链路：首页提醒条 → 设备设置 → 固件升级 → 确认 → 0-100% → 更新完成 → 回首页 ---------- */
  const firmwareFlow = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const visible = () => [...document.querySelectorAll('.reuse-screen')].filter(screen => !screen.hidden).map(screen => screen.id);
      const box = (node) => { const rect = node.getBoundingClientRect(); return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: Math.round(rect.width), height: Math.round(rect.height) }; };
      /* 把原图像素换算成视口坐标：热区必须真的压在烘焙件上 */
      const project = (stageRect, width, height) => (px, py) => ({
        x: stageRect.left + (stageRect.width * px) / width,
        y: stageRect.top + (stageRect.height * py) / height
      });
      const result = {};
      const banner = document.querySelector('#firmware-banner');
      const cta = banner.querySelector('.firmware-banner-cta');
      result.banner = {
        hidden: banner.hidden,
        text: banner.textContent.trim(),
        box: box(banner),
        ctaText: cta.textContent.trim(),
        ctaColor: getComputedStyle(cta).color,
        ctaUnderline: getComputedStyle(cta).textDecorationLine,
        cueColor: getComputedStyle(banner).color,
        cueBackground: getComputedStyle(banner).backgroundColor
      };
      banner.click();
      await wait(280);
      result.afterBanner = visible();
      const settingsStage = document.querySelector('#device-settings-screen .reuse-stage').getBoundingClientRect();
      const badge = document.querySelector('#firmware-status-badge');
      const badgeBox = box(badge);
      result.badge = {
        hidden: badge.hidden,
        text: badge.textContent.trim(),
        color: getComputedStyle(badge).color,
        box: {
          left: (badgeBox.left - settingsStage.left) / settingsStage.width,
          top: (badgeBox.top - settingsStage.top) / settingsStage.height,
          right: (badgeBox.right - settingsStage.left) / settingsStage.width,
          bottom: (badgeBox.bottom - settingsStage.top) / settingsStage.height,
          width: badgeBox.width,
          height: badgeBox.height
        }
      };
      /* 原图烘焙的蓝字本体是 x 244~322 / y 192~200（376×809），覆盖层必须整块盖住它 */
      const toSettings = project(settingsStage, 376, 809);
      const blueStart = toSettings(244, 192);
      const blueEnd = toSettings(322, 200);
      result.badgeCoversBakedText = badgeBox.left <= blueStart.x + 1 && badgeBox.top <= blueStart.y + 1 &&
        badgeBox.right >= blueEnd.x - 1 && badgeBox.bottom >= blueEnd.y - 1;
      const versionRow = box(document.querySelector('#open-firmware-version'));
      result.versionRow = {
        left: (versionRow.left - settingsStage.left) / settingsStage.width,
        top: (versionRow.top - settingsStage.top) / settingsStage.height,
        right: (versionRow.right - settingsStage.left) / settingsStage.width,
        bottom: (versionRow.bottom - settingsStage.top) / settingsStage.height,
        width: versionRow.width,
        height: versionRow.height
      };
      document.querySelector('#open-firmware-version').click();
      await wait(300);
      result.afterVersionRow = visible();
      const upgradeStage = document.querySelector('#firmware-upgrade-screen .reuse-stage').getBoundingClientRect();
      const upgradeImage = document.querySelector('#firmware-upgrade-screen img');
      const upgradeHotspot = box(document.querySelector('#firmware-upgrade-now'));
      result.upgrade = {
        src: decodeURI(upgradeImage.currentSrc),
        size: { width: upgradeImage.naturalWidth, height: upgradeImage.naturalHeight },
        stageRatio: upgradeStage.width / upgradeStage.height,
        hotspot: {
          left: (upgradeHotspot.left - upgradeStage.left) / upgradeStage.width,
          top: (upgradeHotspot.top - upgradeStage.top) / upgradeStage.height,
          right: (upgradeHotspot.right - upgradeStage.left) / upgradeStage.width,
          bottom: (upgradeHotspot.bottom - upgradeStage.top) / upgradeStage.height,
          width: upgradeHotspot.width,
          height: upgradeHotspot.height
        }
      };
      /* 原图里的“立即升级”胶囊是 x 97~259 / y 357~411 */
      const toUpgrade = project(upgradeStage, 375, 812);
      result.upgradeHotspotCoversCapsule =
        upgradeHotspot.left <= toUpgrade(97, 357).x + 1 && upgradeHotspot.top <= toUpgrade(97, 357).y + 1 &&
        upgradeHotspot.right >= toUpgrade(259, 411).x - 1 && upgradeHotspot.bottom >= toUpgrade(259, 411).y - 1;
      /* 立即升级 → 确认弹窗 */
      document.querySelector('#firmware-upgrade-now').click();
      await wait(300);
      const dialog = document.querySelector('#firmware-dialog');
      const cancelButton = document.querySelector('#firmware-dialog-cancel');
      const confirmButton = document.querySelector('#firmware-dialog-confirm');
      result.dialog = {
        open: dialog.open,
        title: document.querySelector('#firmware-dialog-title').textContent.trim(),
        cancelLabel: cancelButton.textContent.trim(),
        confirmLabel: confirmButton.textContent.trim(),
        cancelBorder: getComputedStyle(cancelButton).borderTopColor,
        cancelBorderWidth: getComputedStyle(cancelButton).borderTopWidth,
        cancelBackground: getComputedStyle(cancelButton).backgroundColor,
        confirmBackground: getComputedStyle(confirmButton).backgroundImage
      };
      /* 先取消一次：弹窗关掉，仍停在固件升级页 */
      cancelButton.click();
      await wait(260);
      result.afterCancel = { open: dialog.open, visible: visible() };
      /* 再来一次并确认，进升级进度页 */
      document.querySelector('#firmware-upgrade-now').click();
      await wait(220);
      confirmButton.click();
      await wait(240);
      const progressStage = document.querySelector('#firmware-progress-screen .reuse-stage').getBoundingClientRect();
      const progressImage = document.querySelector('#firmware-progress-screen img');
      const disc = box(document.querySelector('.firmware-progress-disc'));
      const percentNode = document.querySelector('#firmware-progress-percent');
      const percentBox = box(percentNode);
      result.progress = {
        visible: visible(),
        src: decodeURI(progressImage.currentSrc),
        size: { width: progressImage.naturalWidth, height: progressImage.naturalHeight },
        discColor: getComputedStyle(document.querySelector('.firmware-progress-disc')).backgroundColor,
        percentColourWhite: getComputedStyle(percentNode).color,
        startValue: percentNode.getAttribute('aria-valuenow'),
        /* 数字必须正对圆心：36px 字号的整行行高会比圆片高一点，所以比中心而不是比包含 */
        percentCentre: {
          dx: Math.round((percentBox.left + percentBox.right) / 2 - (disc.left + disc.right) / 2),
          dy: Math.round((percentBox.top + percentBox.bottom) / 2 - (disc.top + disc.bottom) / 2)
        }
      };
      /* 原图烘焙的“50%”是 x 155~220 / y 540~565，覆盖片必须整块盖住它 */
      const toProgress = project(progressStage, 375, 812);
      result.discCoversBakedPercent =
        disc.left <= toProgress(155, 540).x + 1 && disc.top <= toProgress(155, 540).y + 1 &&
        disc.right >= toProgress(220, 565).x - 1 && disc.bottom >= toProgress(220, 565).y - 1;
      /* 进度必须自己跑到 100% 并自动切到“更新完成” */
      const seen = [Number(percentNode.getAttribute('aria-valuenow'))];
      for (let attempt = 0; attempt < 80; attempt += 1) {
        await wait(120);
        const current = visible();
        if (current.length === 1 && current[0] === 'firmware-done-screen') break;
        seen.push(Number(percentNode.getAttribute('aria-valuenow')));
      }
      result.progressTrail = { samples: seen.length, monotonic: seen.every((value, index) => index === 0 || value >= seen[index - 1]), reached: seen[seen.length - 1] };
      const doneScreen = document.querySelector('#firmware-done-screen');
      const doneStage = doneScreen.querySelector('.reuse-stage').getBoundingClientRect();
      const doneImage = doneScreen.querySelector('img');
      const doneHotspot = box(document.querySelector('#firmware-done-ok'));
      result.done = {
        visible: visible(),
        src: decodeURI(doneImage.currentSrc),
        size: { width: doneImage.naturalWidth, height: doneImage.naturalHeight },
        hotspot: {
          left: (doneHotspot.left - doneStage.left) / doneStage.width,
          top: (doneHotspot.top - doneStage.top) / doneStage.height,
          right: (doneHotspot.right - doneStage.left) / doneStage.width,
          bottom: (doneHotspot.bottom - doneStage.top) / doneStage.height,
          width: doneHotspot.width,
          height: doneHotspot.height
        }
      };
      /* 原图里的“我知道了”是 x 105~268 / y 452~494 */
      const toDone = project(doneStage, 375, 812);
      result.doneHotspotCoversButton =
        doneHotspot.left <= toDone(105, 452).x + 1 && doneHotspot.top <= toDone(105, 452).y + 1 &&
        doneHotspot.right >= toDone(268, 494).x - 1 && doneHotspot.bottom >= toDone(268, 494).y - 1;
      /* 我知道了 → 收起全部浮层回到打印页首页，固件标记为已更新 */
      document.querySelector('#firmware-done-ok').click();
      await wait(320);
      result.afterDone = {
        visible: visible(),
        bannerHidden: document.querySelector('#firmware-banner').hidden,
        badgeHidden: document.querySelector('#firmware-status-badge').hidden,
        deviceInteractive: !document.querySelector('#device-page').inert
      };
      /* 普通入口（顶栏齿轮）进来：不再显示橙色文案，固件版本行落在固件版本页并逐级回退 */
      document.querySelector('#printer-settings').click();
      await wait(280);
      result.normalBadgeHidden = document.querySelector('#firmware-status-badge').hidden;
      document.querySelector('#open-firmware-version').click();
      await wait(300);
      const versionImage = document.querySelector('#firmware-version-screen img');
      result.versionPage = {
        visible: visible(),
        src: decodeURI(versionImage.currentSrc),
        size: { width: versionImage.naturalWidth, height: versionImage.naturalHeight }
      };
      document.querySelector('#firmware-version-back').click();
      await wait(260);
      result.afterVersionBack = visible();
      document.querySelector('#device-settings-back').click();
      await wait(260);
      result.afterSettingsBack = visible();
      return result;
    })()`
  });
  const firmware = firmwareFlow.result.value;
  /* 首页提醒条：白底黑字 + 橙色带下划线入口 */
  assert(!firmware.banner.hidden && firmware.banner.text === '新的固件版本可用，立即升级>' && firmware.banner.ctaText === '立即升级>', `The firmware banner text is wrong: ${JSON.stringify(firmware.banner)}`);
  assert(firmware.banner.cueBackground === 'rgb(255, 255, 255)' && firmware.banner.cueColor === 'rgb(28, 28, 30)', `The firmware banner is not white with black copy: ${JSON.stringify(firmware.banner)}`);
  assert(firmware.banner.ctaColor === 'rgb(241, 99, 38)' && firmware.banner.ctaUnderline.includes('underline'), `立即升级> is not orange and underlined: ${JSON.stringify(firmware.banner)}`);
  assert(firmware.banner.box.width >= 343 && firmware.banner.box.height >= 44, `The firmware banner is too small to tap: ${JSON.stringify(firmware.banner.box)}`);
  assert(firmware.afterBanner.length === 1 && firmware.afterBanner[0] === 'device-settings-screen', `The firmware banner did not open 设备设置: ${JSON.stringify(firmware.afterBanner)}`);
  /* 设备设置页：橙色“新的固件版本可用”整块压在原图蓝字上 */
  assert(!firmware.badge.hidden && firmware.badge.text === '新的固件版本可用' && firmware.badge.color === 'rgb(241, 99, 38)', `The firmware status badge is wrong: ${JSON.stringify(firmware.badge)}`);
  assert(firmware.badgeCoversBakedText, `The firmware status badge does not cover the baked 固件已是最新版本: ${JSON.stringify(firmware.badge.box)}`);
  assert(firmware.badge.box.height >= 14 && firmware.badge.box.left > 0.6 && firmware.badge.box.right < 0.9, `The firmware status badge is misplaced: ${JSON.stringify(firmware.badge.box)}`);
  /* 固件版本整行热区（原图行区间 y 150~207 / 376 宽） */
  assert(firmware.versionRow.left > 0.02 && firmware.versionRow.left < 0.04 && firmware.versionRow.right > 0.96, `The 固件版本 row hotspot does not span the card: ${JSON.stringify(firmware.versionRow)}`);
  assert(firmware.versionRow.top > 0.18 && firmware.versionRow.top < 0.19 && firmware.versionRow.bottom > 0.25 && firmware.versionRow.bottom < 0.26 && firmware.versionRow.height >= 44, `The 固件版本 row hotspot does not cover the row band: ${JSON.stringify(firmware.versionRow)}`);
  assert(firmware.afterVersionRow.length === 1 && firmware.afterVersionRow[0] === 'firmware-upgrade-screen', `With a pending update the 固件版本 row must open 固件升级: ${JSON.stringify(firmware.afterVersionRow)}`);
  /* 固件升级页 */
  assert(firmware.upgrade.src.endsWith('assets/固件升级页.png') && firmware.upgrade.size.width === 375 && firmware.upgrade.size.height === 812, `The 固件升级 page did not load its artwork: ${JSON.stringify(firmware.upgrade)}`);
  assert(Math.abs(firmware.upgrade.stageRatio - 375 / 812) < 0.002 && firmware.upgradeHotspotCoversCapsule && firmware.upgrade.hotspot.width >= 44 && firmware.upgrade.hotspot.height >= 44, `The 立即升级 hotspot does not cover the artwork capsule: ${JSON.stringify(firmware.upgrade.hotspot)}`);
  /* 确认弹窗：左侧“取消”黑边框，右侧“确认升级”实心渐变 */
  assert(firmware.dialog.open && firmware.dialog.title === '最新版本：2.02，是否确认升级', `The upgrade confirm dialog is wrong: ${JSON.stringify(firmware.dialog)}`);
  assert(firmware.dialog.cancelLabel === '取消' && firmware.dialog.confirmLabel === '确认升级', `The upgrade dialog buttons are mislabelled: ${JSON.stringify(firmware.dialog)}`);
  assert(firmware.dialog.cancelBorder === 'rgb(28, 28, 30)' && parseFloat(firmware.dialog.cancelBorderWidth) >= 1 && firmware.dialog.cancelBackground === 'rgb(255, 255, 255)', `The left 取消 button does not have a black outline: ${JSON.stringify(firmware.dialog)}`);
  assert(firmware.dialog.confirmBackground.includes('gradient'), `The 确认升级 button is not a solid accent button: ${firmware.dialog.confirmBackground}`);
  assert(!firmware.afterCancel.open && firmware.afterCancel.visible.length === 1 && firmware.afterCancel.visible[0] === 'firmware-upgrade-screen', `取消 did not just close the dialog: ${JSON.stringify(firmware.afterCancel)}`);
  /* 升级进度页：真实 0→100%，盖住原图烘焙的 50% */
  assert(firmware.progress.visible.length === 1 && firmware.progress.visible[0] === 'firmware-progress-screen', `确认升级 did not open the progress page: ${JSON.stringify(firmware.progress.visible)}`);
  assert(firmware.progress.src.endsWith('assets/固件升级打印页.png') && firmware.progress.size.width === 375 && firmware.progress.size.height === 812, `The progress page did not load its artwork: ${JSON.stringify(firmware.progress)}`);
  assert(firmware.discCoversBakedPercent, `The progress disc does not cover the baked 50%: ${JSON.stringify(firmware.progress)}`);
  assert(firmware.progress.discColor === 'rgb(0, 121, 224)' && firmware.progress.percentColourWhite === 'rgb(255, 255, 255)', `The progress readout is not white on blue: ${JSON.stringify(firmware.progress)}`);
  assert(Math.abs(firmware.progress.percentCentre.dx) <= 4 && Math.abs(firmware.progress.percentCentre.dy) <= 4, `The progress number is not centred on the blue disc: ${JSON.stringify(firmware.progress.percentCentre)}`);
  assert(Number(firmware.progress.startValue) < 20, `The progress should start near 0: ${firmware.progress.startValue}`);
  assert(firmware.progressTrail.monotonic && firmware.progressTrail.reached === 100 && firmware.progressTrail.samples > 3, `The progress simulation did not run 0→100: ${JSON.stringify(firmware.progressTrail)}`);
  assert(firmware.done.visible.length === 1 && firmware.done.visible[0] === 'firmware-done-screen', `100% did not switch to the 更新完成 page: ${JSON.stringify(firmware.done.visible)}`);
  assert(firmware.done.src.endsWith('assets/更新完成页.png') && firmware.done.size.width === 375 && firmware.done.size.height === 812, `The 更新完成 page did not load its artwork: ${JSON.stringify(firmware.done)}`);
  assert(firmware.doneHotspotCoversButton && firmware.done.hotspot.width >= 44 && firmware.done.hotspot.height >= 44, `The 我知道了 hotspot does not cover the artwork button: ${JSON.stringify(firmware.done.hotspot)}`);
  assert(firmware.afterDone.visible.length === 0 && firmware.afterDone.deviceInteractive, `我知道了 did not return to the printer page: ${JSON.stringify(firmware.afterDone)}`);
  assert(firmware.afterDone.bannerHidden && firmware.afterDone.badgeHidden, `The firmware entries did not disappear after the update: ${JSON.stringify(firmware.afterDone)}`);
  assert(firmware.normalBadgeHidden, 'The orange firmware copy must not show without a pending update.');
  assert(firmware.versionPage.visible.length === 1 && firmware.versionPage.visible[0] === 'firmware-version-screen', `Without a pending update the 固件版本 row must open 固件版本页: ${JSON.stringify(firmware.versionPage.visible)}`);
  assert(firmware.versionPage.src.endsWith('assets/固件版本页.png') && firmware.versionPage.size.width === 375 && firmware.versionPage.size.height === 812, `The 固件版本 page did not load its artwork: ${JSON.stringify(firmware.versionPage)}`);
  assert(firmware.afterVersionBack.length === 1 && firmware.afterVersionBack[0] === 'device-settings-screen', `The 固件版本 back control did not return to 设备设置: ${JSON.stringify(firmware.afterVersionBack)}`);
  assert(firmware.afterSettingsBack.length === 0, `The 设备设置 back control did not return to the printer page: ${JSON.stringify(firmware.afterSettingsBack)}`);

  /* 提醒条「点击后本次隐藏，刷新 / 重进恢复」：
     保留旧版已处理记录，验证历史 localStorage 不会再吞掉入口。 */
  await cdp.send('Page.navigate', { url: pageUrl });
  await waitFor(cdp, `!!document.querySelector('#firmware-banner')`, 'The firmware banner is missing on a fresh printer page.');
  await cdp.send('Runtime.evaluate', { expression: `localStorage.setItem('ziyan.firmware.bannerHandled', '1')` });
  await cdp.send('Page.navigate', { url: pageUrl });
  /* 等 JS API 就绪再点，光等 DOM 元素会在导航后立刻命中「元素在但监听器还没绑」的窗口 */
  await waitFor(cdp, `typeof openReuseScreen === 'function' && !!document.querySelector('#firmware-banner') && !document.querySelector('#firmware-banner').hidden`, 'The firmware banner must be visible even with the legacy handled flag.');
  const bannerHandled = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const wait = (ms) => new Promise(r => setTimeout(r, ms));
      const open = (sel) => !document.querySelector(sel).hidden;
      const banner = document.querySelector('#firmware-banner');
      const out = {};
      out.beforeClick = !banner.hidden;
      out.storedBefore = localStorage.getItem('ziyan.firmware.bannerHandled');
      banner.click();
      await wait(280);
      out.settingsOpen = open('#device-settings-screen');
      out.storedAfter = localStorage.getItem('ziyan.firmware.bannerHandled');
      /* 设备事实没变：仍能走升级入口 */
      document.querySelector('#open-firmware-version').click();
      await wait(280);
      out.upgradeStillReachable = open('#firmware-upgrade-screen');
      document.querySelector('#firmware-upgrade-back').click();
      await wait(200);
      document.querySelector('#device-settings-back').click();
      await wait(260);
      out.backHome = !open('#device-settings-screen');
      /* 返回打印页：提醒条不再显示 */
      out.bannerHiddenAfterBack = banner.hidden;
      /* 刷新后恢复显示，不沿用本次点击或历史存储状态 */
      location.reload();
      return out;
    })()`
  });
  /* 等 JS 初始化后再检查，避免仅检查 HTML 默认显隐 */
  await waitFor(cdp, `typeof openReuseScreen === 'function' && localStorage.getItem('ziyan.firmware.bannerHandled') === '1'`, 'The printer page did not come back (or its JS was not ready) after reload.');
  const afterReload = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `({ hidden: document.querySelector('#firmware-banner').hidden, stored: localStorage.getItem('ziyan.firmware.bannerHandled') })`
  });
  assert(bannerHandled.result.value.beforeClick, 'The firmware banner should be visible on a fresh page.');
  assert(bannerHandled.result.value.settingsOpen, 'Clicking the banner did not open 设备设置.');
  assert(bannerHandled.result.value.storedBefore === '1' && bannerHandled.result.value.storedAfter === '1', 'The legacy handled flag must be ignored and left untouched.');
  assert(bannerHandled.result.value.upgradeStillReachable, 'After handling the banner the 固件升级 entry must still be reachable from 设备设置.');
  assert(bannerHandled.result.value.backHome && bannerHandled.result.value.bannerHiddenAfterBack, `The banner came back after returning to the printer page: ${JSON.stringify(bannerHandled.result.value)}`);
  assert(!afterReload.result.value.hidden && afterReload.result.value.stored === '1', `The banner must reappear after a reload despite the legacy handled flag: ${JSON.stringify(afterReload.result.value)}`);
  /* 复位提醒状态，后面的版式断言（要量提醒条的位置）仍需看到它 */
  await cdp.send('Runtime.evaluate', { expression: `setFirmwareBannerHandled(false); setFirmwareUpdateAvailable(true)` });
  await waitFor(cdp, `!document.querySelector('#firmware-banner').hidden`, 'Could not restore the firmware banner for the remaining layout assertions.');

  /* 固件相关页面的验收图（跑完链路后固件已是最新，这里手动把提醒条恢复出来再逐页截图） */
  const firmwareShots = [
    [deviceSettingsFirmwarePreviewPath, `document.querySelector('#printer-settings').click(); setFirmwareUpdateAvailable(true); setFirmwareSettingsHasUpdate(true)`],
    [firmwareUpgradePreviewPath, `document.querySelector('#open-firmware-version').click()`],
    [firmwareDialogPreviewPath, `document.querySelector('#firmware-upgrade-now').click()`],
    [firmwareVersionPreviewPath, `document.querySelector('#firmware-dialog-cancel').click(); document.querySelector('#firmware-upgrade-back').click(); setFirmwareUpdateAvailable(false); document.querySelector('#open-firmware-version').click()`]
  ];
  for (const [previewFile, action] of firmwareShots) {
    await cdp.send('Runtime.evaluate', { expression: action });
    await delay(340);
    const firmwareShot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(previewFile, Buffer.from(firmwareShot.data, 'base64'));
  }
  /* 升级进度页：确认后等进度跑到中段再截图（同时验证进度真的在走） */
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#firmware-version-back').click(); setFirmwareUpdateAvailable(true); setFirmwareSettingsHasUpdate(true); document.querySelector('#open-firmware-version').click(); document.querySelector('#firmware-upgrade-now').click(); document.querySelector('#firmware-dialog-confirm').click()` });
  await delay(1500);
  const firmwareProgressScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(firmwareProgressPreviewPath, Buffer.from(firmwareProgressScreenshot.data, 'base64'));
  await waitFor(cdp, `!document.querySelector('#firmware-done-screen').hidden`, 'The firmware update never reached 100%.');
  await delay(320);
  const firmwareDoneScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(firmwareDonePreviewPath, Buffer.from(firmwareDoneScreenshot.data, 'base64'));
  await cdp.send('Runtime.evaluate', { expression: `stopFirmwareProgress(); document.querySelector('#firmware-done-ok').click()` });
  await waitFor(cdp, `[...document.querySelectorAll('.reuse-screen')].every(screen => screen.hidden)`, '设备设置 did not close after the firmware shots.');

  /* ---------- 准备打印页：延时摄影勾选 + 底部开始打印 ---------- */
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#explore-toys').click(); document.querySelector('#explore-toys-anywhere').click(); document.querySelector('#open-prepare-print').click()` });
  await waitFor(cdp, `!document.querySelector('#prepare-print-screen').hidden`, 'Prepare print page did not open for the controls check.');
  const prepareControls = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const stage = document.querySelector('#prepare-print-screen .reuse-stage').getBoundingClientRect();
      const relative = (selector) => {
        const rect = document.querySelector(selector).getBoundingClientRect();
        return {
          left: (rect.left - stage.left) / stage.width,
          top: (rect.top - stage.top) / stage.height,
          right: (rect.right - stage.left) / stage.width,
          bottom: (rect.bottom - stage.top) / stage.height,
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        };
      };
      const toggle = document.querySelector('#timelapse-toggle');
      const box = document.querySelector('.timelapse-check-box');
      const style = () => { const cs = getComputedStyle(box); return { background: cs.backgroundColor, borderWidth: cs.borderTopWidth }; };
      const result = {
        activeScreens: [...document.querySelectorAll('.reuse-screen')].filter(screen => !screen.hidden).map(screen => screen.id),
        startHotspot: relative('#start-print'),
        checkHotspot: relative('#timelapse-toggle'),
        checkBoxSize: [Math.round(box.getBoundingClientRect().width), Math.round(box.getBoundingClientRect().height)],
        role: toggle.getAttribute('role'),
        initialChecked: toggle.getAttribute('aria-checked'),
        initialBox: style()
      };
      toggle.click();
      await wait(160);
      result.afterOff = { checked: toggle.getAttribute('aria-checked'), box: style() };
      const center = (() => { const r = toggle.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })();
      result.toggleCenter = center;
      result.afterOn = null;
      return result;
    })()`
  });
  const controls = prepareControls.result.value;
  assert(controls.activeScreens.length === 1 && controls.activeScreens[0] === 'prepare-print-screen', `Prepare print controls check landed on the wrong screen: ${JSON.stringify(controls.activeScreens)}`);
  assert(controls.startHotspot.left < 0.017 && controls.startHotspot.left > 0.015 && controls.startHotspot.right > 0.99 && controls.startHotspot.top > 0.92 && controls.startHotspot.bottom < 1 && controls.startHotspot.width > 300, `The 开始打印 hotspot does not cover the artwork button: ${JSON.stringify(controls.startHotspot)}`);
  assert(controls.checkHotspot.width >= 44 && controls.checkHotspot.height >= 44, `The 延时摄影 checkbox hit area is smaller than 44px: ${JSON.stringify(controls.checkHotspot)}`);
  assert(controls.checkHotspot.bottom < controls.startHotspot.top, `The 延时摄影 checkbox overlaps the 开始打印 hotspot: ${JSON.stringify(controls)}`);
  assert(controls.role === 'checkbox' && controls.checkBoxSize[0] === 22 && controls.checkBoxSize[1] === 21, `The 延时摄影 checkbox visual is wrong: ${JSON.stringify(controls)}`);
  assert(controls.initialChecked === 'true' && controls.initialBox.background === 'rgba(0, 0, 0, 0)' && controls.initialBox.borderWidth === '0px', `The 延时摄影 checkbox must start checked with the baked artwork showing through: ${JSON.stringify(controls)}`);
  assert(controls.afterOff.checked === 'false' && controls.afterOff.box.background === 'rgb(255, 255, 255)' && Number.parseFloat(controls.afterOff.box.borderWidth) > 0, `Unchecking 延时摄影 did not cover the baked checkbox with an empty box: ${JSON.stringify(controls.afterOff)}`);
  const uncheckedShot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(prepareUncheckedPreviewPath, Buffer.from(uncheckedShot.data, 'base64'));

  /* 再点一次必须能勾回来（真实鼠标事件） */
  await clickAt(cdp, controls.toggleCenter.x, controls.toggleCenter.y);
  const reChecked = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => { const toggle = document.querySelector('#timelapse-toggle'); const cs = getComputedStyle(document.querySelector('.timelapse-check-box')); return { checked: toggle.getAttribute('aria-checked'), background: cs.backgroundColor, borderWidth: cs.borderTopWidth }; })()`
  });
  assert(reChecked.result.value.checked === 'true' && reChecked.result.value.background === 'rgba(0, 0, 0, 0)' && reChecked.result.value.borderWidth === '0px', `Re-checking 延时摄影 did not restore the baked checkbox: ${JSON.stringify(reChecked.result.value)}`);

  /* 底部开始打印 → 打印页进入准备中 */
  const startPoint = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => { const r = document.querySelector('#start-print').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`
  });
  await clickAt(cdp, startPoint.result.value.x, startPoint.result.value.y);
  await waitFor(cdp, `document.querySelector('#task-panel').dataset.status === 'preparing'`, 'The 开始打印 hotspot did not put the printer task panel into the 准备中 state.');
  const startPrint = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => ({
      panelStatus: document.querySelector('#task-panel').dataset.status,
      stateText: document.querySelector('#task-state').textContent,
      progressState: document.querySelector('#progress-state').textContent,
      preparationVisible: !document.querySelector('#preparation-progress').hidden,
      activeScreens: [...document.querySelectorAll('.reuse-screen')].filter(screen => !screen.hidden).map(screen => screen.id),
      deviceInteractive: !document.querySelector('#device-page').inert
    }))()`
  });
  const started = startPrint.result.value;
  assert(started.panelStatus === 'preparing' && started.stateText === '准备中' && started.progressState === '准备打印' && started.preparationVisible, `准备中 state did not render after 开始打印: ${JSON.stringify(started)}`);
  assert(started.activeScreens.length === 0 && started.deviceInteractive, `开始打印 did not close the reuse overlays: ${JSON.stringify(started)}`);
  const preparingShot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(preparingFromPreparePreviewPath, Buffer.from(preparingShot.data, 'base64'));

  /* ---------- 准备打印页：盘列表默认选中 + 点选 + 上下拖动排序 ---------- */
  await cdp.send('Page.navigate', { url: pageUrl });
  await delay(800);
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#explore-toys').click(); document.querySelector('#explore-toys-anywhere').click(); document.querySelector('#open-prepare-print').click()` });
  await waitFor(cdp, `!document.querySelector('#prepare-print-screen').hidden`, 'Prepare print page did not open for the plate list check.');
  const plateList = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      await wait(240);
      const rows = [...document.querySelectorAll('.plate-row')];
      const bySlot = rows.slice().sort((a, b) => Number(a.dataset.slot) - Number(b.dataset.slot));
      const stage = document.querySelector('#prepare-stage').getBoundingClientRect();
      const ring = document.querySelector('.plate-row[data-plate="1"] .plate-row-ring');
      const ringRect = ring.getBoundingClientRect();
      const hit = document.querySelector('.plate-row[data-plate="1"] .plate-row-hit').getBoundingClientRect();
      const row2Hit = document.querySelector('.plate-row[data-plate="2"] .plate-row-hit').getBoundingClientRect();
      const material = document.querySelector('.plate-row[data-plate="2"] [data-chip="left"]').getBoundingClientRect();
      return {
        order: bySlot.map(row => row.dataset.plate),
        selected: rows.filter(row => row.getAttribute('aria-selected') === 'true').map(row => row.dataset.plate),
        ringBorder: getComputedStyle(ring).borderTopColor,
        ringInset: {
          left: (ringRect.left - stage.left) / stage.width,
          right: (ringRect.right - stage.left) / stage.width,
          top: (ringRect.top - stage.top) / stage.height,
          bottom: (ringRect.bottom - stage.top) / stage.height
        },
        rowHitBox: { width: Math.round(hit.width), height: Math.round(hit.height) },
        row2Center: { x: row2Hit.left + row2Hit.width * 0.22, y: row2Hit.top + row2Hit.height / 2 },
        materialBox: { width: Math.round(material.width), height: Math.round(material.height), top: (material.top - stage.top) / stage.height },
        rowArtLoaded: rows.every(row => { const image = row.querySelector('.plate-row-art'); return image.complete && image.naturalWidth > 0; })
      };
    })()`
  });
  const plate = plateList.result.value;
  assert(JSON.stringify(plate.order) === JSON.stringify(['1', '2', '3']) && JSON.stringify(plate.selected) === JSON.stringify(['1']), `The plate list must default to plate 1 at the top: ${JSON.stringify(plate)}`);
  assert(plate.ringBorder === 'rgb(34, 197, 94)', `The selected plate row has no green highlight: ${JSON.stringify(plate)}`);
  assert(plate.ringInset.left > 0.04 && plate.ringInset.left < 0.07 && plate.ringInset.right > 0.86 && plate.ringInset.right < 0.9 && plate.ringInset.top > 0.285 && plate.ringInset.bottom < 0.46, `The green highlight does not wrap the row: ${JSON.stringify(plate.ringInset)}`);
  assert(plate.rowArtLoaded && plate.rowHitBox.width >= 44 && plate.rowHitBox.height >= 44, `Plate row artwork or hit area is unusable: ${JSON.stringify(plate)}`);
  assert(plate.materialBox.width >= 44 && plate.materialBox.height >= 44, `Plate material hotspot is too small: ${JSON.stringify(plate.materialBox)}`);

  /* 点第二行 → 选中切换 */
  await clickAt(cdp, plate.row2Center.x, plate.row2Center.y);
  const afterRowClick = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => ({ selected: [...document.querySelectorAll('.plate-row')].filter(row => row.getAttribute('aria-selected') === 'true').map(row => row.dataset.plate), ring1: getComputedStyle(document.querySelector('.plate-row[data-plate="1"] .plate-row-ring')).borderTopColor, ring2: getComputedStyle(document.querySelector('.plate-row[data-plate="2"] .plate-row-ring')).borderTopColor }))()`
  });
  assert(JSON.stringify(afterRowClick.result.value.selected) === JSON.stringify(['2']) && afterRowClick.result.value.ring2 === 'rgb(34, 197, 94)' && afterRowClick.result.value.ring1 === 'rgba(0, 0, 0, 0)', `Clicking a plate row did not move the selection: ${JSON.stringify(afterRowClick.result.value)}`);

  /* 把第三行拖到最上面 → 顺序真的变了，选中跟着行走 */
  const dragPoints = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const bySlot = [...document.querySelectorAll('.plate-row')].slice().sort((a, b) => Number(a.dataset.slot) - Number(b.dataset.slot));
      const last = bySlot[2].querySelector('.plate-row-hit').getBoundingClientRect();
      const first = bySlot[0].getBoundingClientRect();
      return { x: last.left + last.width * 0.22, y0: last.top + last.height / 2, y1: first.top + first.height / 2 };
    })()`
  });
  await mouse(cdp, 'mousePressed', dragPoints.result.value.x, dragPoints.result.value.y0);
  for (let step = 1; step <= 8; step += 1) {
    await mouse(cdp, 'mouseMoved', dragPoints.result.value.x, dragPoints.result.value.y0 + ((dragPoints.result.value.y1 - dragPoints.result.value.y0) * step) / 8);
    await delay(40);
  }
  await mouse(cdp, 'mouseReleased', dragPoints.result.value.x, dragPoints.result.value.y1);
  await delay(460);
  const afterDrag = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => ({
      order: [...document.querySelectorAll('.plate-row')].slice().sort((a, b) => Number(a.dataset.slot) - Number(b.dataset.slot)).map(row => row.dataset.plate),
      slots: [...document.querySelectorAll('.plate-row')].map(row => row.dataset.plate + ':' + row.dataset.slot),
      selected: [...document.querySelectorAll('.plate-row')].filter(row => row.getAttribute('aria-selected') === 'true').map(row => row.dataset.plate),
      transforms: [...document.querySelectorAll('.plate-row')].map(row => row.style.transform || '')
    }))()`
  });
  assert(JSON.stringify(afterDrag.result.value.order) === JSON.stringify(['3', '1', '2']), `Dragging plate 3 to the top did not reorder the list: ${JSON.stringify(afterDrag.result.value)}`);
  assert(afterDrag.result.value.transforms.every(value => value === ''), `The dragged row kept a stale transform: ${JSON.stringify(afterDrag.result.value)}`);
  const plateDragScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(preparePlateDragPreviewPath, Buffer.from(plateDragScreenshot.data, 'base64'));

  /* ---------- 任务状态版准备打印页：正在打印 / 已取消 / 已打印 ---------- */
  const prepareStates = [];
  for (const preset of [
    { status: 'printing', state: 'printing', stamp: '状态戳-正在打印.png', disabled: true, busy: true },
    { status: 'paused', state: 'printing', stamp: '状态戳-正在打印.png', disabled: true, busy: true },
    { status: 'cancelled', state: 'cancelled', stamp: '状态戳-已取消.png', disabled: false, busy: false },
    { status: 'completed', state: 'completed', stamp: '状态戳-已打印.png', disabled: false, busy: false }
  ]) {
    await cdp.send('Page.navigate', { url: `${pageUrl}?status=${preset.status}` });
    await delay(760);
    await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#queue-toggle').click(); document.querySelector('[data-queue-task]').click()` });
    await waitFor(cdp, `!document.querySelector('#prepare-state-screen').hidden`, `Queue task in ${preset.status} state did not open the prepare-state page.`);
    const measured = await cdp.send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async () => {
        const artwork = document.querySelector('#prepare-state-artwork');
        const stamp = document.querySelector('#state-stamp');
        if (!artwork.complete) await new Promise(resolve => artwork.addEventListener('load', resolve, { once: true }));
        // 状态戳是另一张图：JS 换 src 后浏览器要重新解码，只等底图会让 stamp.currentSrc
        // 偶尔还是空串（原预存在的偶发失败，命中 prepared/取消 等不同状态各一次）
        if (!stamp.complete) await new Promise(resolve => stamp.addEventListener('load', resolve, { once: true }));
        const stage = document.querySelector('#prepare-state-stage').getBoundingClientRect();
        const start = document.querySelector('#prepare-state-start').getBoundingClientRect();
        const stampedRow = document.querySelector('.state-row[data-row="1"]');
        const row3 = document.querySelector('.state-row[data-row="3"] .state-row-hit').getBoundingClientRect();
        return {
          state: document.querySelector('#prepare-state-stage').dataset.state,
          artwork: decodeURI(artwork.currentSrc).split('/').pop(),
          artworkSize: { width: artwork.naturalWidth, height: artwork.naturalHeight },
          ratio: getComputedStyle(document.querySelector('#prepare-state-stage')).aspectRatio,
          stampFile: decodeURI(stamp.currentSrc).split('/').pop(),
          stampHidden: stamp.hidden,
          stampTop: parseFloat(stamp.style.top),
          stampLeft: parseFloat(stamp.style.left),
          busyPatchHidden: document.querySelector('#printer-busy-patch').hidden,
          selected: [...document.querySelectorAll('.state-row[role="option"]')].filter(row => row.getAttribute('aria-selected') === 'true').map(row => row.dataset.row),
          startDisabled: document.querySelector('#prepare-state-start').disabled,
          dimVisible: !document.querySelector('#prepare-state-dim').hidden,
          stampedRowDisabled: stampedRow.getAttribute('aria-disabled'),
          stampedHitHidden: stampedRow.querySelector('.state-row-hit').hidden,
          stampedMaterialHidden: stampedRow.querySelector('.state-material-hit').hidden,
          startBox: { width: Math.round(start.width), height: Math.round(start.height), top: (start.top - stage.top) / stage.height },
          row3Box: { width: Math.round(row3.width), height: Math.round(row3.height) }
        };
      })()`
    });
    prepareStates.push({ preset, measured: measured.result.value });
    assert(measured.result.value.state === preset.state && measured.result.value.artwork === '准备打印页-底图.png' && measured.result.value.artworkSize.width === 311 && measured.result.value.artworkSize.height === 675, `Queue task in ${preset.status} state opened the wrong prepare page: ${JSON.stringify(measured.result.value)}`);
    assert(!measured.result.value.stampHidden && measured.result.value.stampFile === preset.stamp && Math.abs(measured.result.value.stampTop - 36.148) < 0.01 && Math.abs(measured.result.value.stampLeft - 49.15) < 0.01, `The ${preset.state} stamp must sit on plate 1: ${JSON.stringify(measured.result.value)}`);
    assert(measured.result.value.busyPatchHidden === !preset.busy, `The ${preset.state} page busy patch visibility is wrong: ${JSON.stringify(measured.result.value)}`);
    assert(measured.result.value.startDisabled === preset.disabled && measured.result.value.dimVisible === preset.disabled, `${preset.status} 开始打印 state is wrong: ${JSON.stringify(measured.result.value)}`);
    assert(measured.result.value.stampedRowDisabled === 'true' && measured.result.value.stampedHitHidden && measured.result.value.stampedMaterialHidden, `Plate 1 must stay stamped and inert on the ${preset.state} page: ${JSON.stringify(measured.result.value)}`);
    assert(JSON.stringify(measured.result.value.selected) === JSON.stringify(['2']), `The ${preset.state} page must default to plate 2: ${JSON.stringify(measured.result.value)}`);
    assert(measured.result.value.startBox.width > 300 && measured.result.value.startBox.height >= 44 && measured.result.value.row3Box.width >= 44 && measured.result.value.row3Box.height >= 44, `The ${preset.state} page hotspots are unusable: ${JSON.stringify(measured.result.value)}`);
  }
  assert(prepareStates.every(entry => entry.measured.ratio === '311 / 675'), `All state pages must reuse the sliced 311 / 675 artwork: ${JSON.stringify(prepareStates.map(entry => entry.measured.ratio))}`);

  /* 盘 2 打印中：队列里盘 1 也能复用——状态戳盖在盘 2 上，盘 1 可选 */
  await cdp.send('Page.navigate', { url: `${pageUrl}?plate=2&status=printing` });
  await delay(760);
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#queue-toggle').click(); document.querySelector('[data-queue-task][data-plate="1"]').click()` });
  await waitFor(cdp, `!document.querySelector('#prepare-state-screen').hidden`, 'Queue plate 1 (while plate 2 prints) did not open the prepare-state page.');
  const plateOneReused = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const stamp = document.querySelector('#state-stamp');
      const row1 = document.querySelector('.state-row[data-row="1"]');
      const row2 = document.querySelector('.state-row[data-row="2"]');
      return {
        stampTop: parseFloat(stamp.style.top),
        stampAlt: stamp.alt,
        row1HitHidden: row1.querySelector('.state-row-hit').hidden,
        row2HitHidden: row2.querySelector('.state-row-hit').hidden,
        row2Disabled: row2.getAttribute('aria-disabled'),
        selected: [...document.querySelectorAll('.state-row[role="option"]')].filter(row => row.getAttribute('aria-selected') === 'true').map(row => row.dataset.row)
      };
    })()`
  });
  assert(Math.abs(plateOneReused.result.value.stampTop - 53.926) < 0.01 && plateOneReused.result.value.stampAlt.includes('史蒂夫_02_012209'), `The stamp must follow the printing plate 2: ${JSON.stringify(plateOneReused.result.value)}`);
  assert(!plateOneReused.result.value.row1HitHidden && plateOneReused.result.value.row2HitHidden && plateOneReused.result.value.row2Disabled === 'true', `Plate 1 must be reusable while plate 2 is stamped: ${JSON.stringify(plateOneReused.result.value)}`);
  assert(JSON.stringify(plateOneReused.result.value.selected) === JSON.stringify(['1']), `Queue plate 1 must preselect plate 1: ${JSON.stringify(plateOneReused.result.value)}`);

  /* 状态版里换耗材颜色：确定后回到状态版准备打印页，只换该盘切片，状态戳不动 */
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('.state-row[data-row="1"] .state-material-hit').click()` });
  await delay(300);
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#prepare-material-confirm').click()` });
  await waitFor(cdp, `!document.querySelector('#prepare-state-screen').hidden && document.querySelector('#prepare-material-screen').hidden`, 'Confirming the material sheet did not return to the state prepare page.');
  const stateColorChange = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    awaitPromise: true,
    expression: `(async () => {
      const stamp = document.querySelector('#state-stamp');
      const row1Art = document.querySelector('.state-row[data-row="1"] .plate-row-art');
      // 同上：换色后状态戳会重新解码，等它 complete 再读 currentSrc
      if (!stamp.complete) await new Promise(resolve => stamp.addEventListener('load', resolve, { once: true }));
      return {
        visible: [...document.querySelectorAll('.reuse-screen')].filter(screen => !screen.hidden).map(screen => screen.id),
        row1Art: decodeURI(row1Art.currentSrc),
        stampFile: decodeURI(stamp.currentSrc).split('/').pop(),
        stampTop: parseFloat(stamp.style.top)
      };
    })()`
  });
  assert(stateColorChange.result.value.visible.length === 1 && stateColorChange.result.value.visible[0] === 'prepare-state-screen', `Color change must land back on the state prepare page: ${JSON.stringify(stateColorChange.result.value)}`);
  assert(stateColorChange.result.value.row1Art.endsWith('准备打印页-更换后-盘1.png'), `Plate 1 row art must swap to the changed variant: ${JSON.stringify(stateColorChange.result.value)}`);
  assert(stateColorChange.result.value.stampFile === '状态戳-正在打印.png' && Math.abs(stateColorChange.result.value.stampTop - 53.926) < 0.01, `The stamp must not move when only the filament color changes: ${JSON.stringify(stateColorChange.result.value)}`);

  /* 已取消版：选盘 3 → 开始打印 → 该盘进入任务面板并开始打印 */
  await cdp.send('Page.navigate', { url: `${pageUrl}?status=cancelled` });
  await delay(760);
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#queue-toggle').click(); document.querySelector('[data-queue-task]').click()` });
  await waitFor(cdp, `!document.querySelector('#prepare-state-screen').hidden`, 'Cancelled prepare page did not open.');
  const row3Point = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => { const r = document.querySelector('.state-row[data-row="3"] .state-row-hit').getBoundingClientRect(); return { x: r.left + r.width * 0.2, y: r.top + r.height / 2 }; })()`
  });
  await clickAt(cdp, row3Point.result.value.x, row3Point.result.value.y);
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#prepare-state-start').click()` });
  await waitFor(cdp, `document.querySelector('#task-panel')?.dataset.status === 'printing' && new URLSearchParams(location.search).get('plate') === '3'`, '开始打印 on the cancelled prepare page did not start plate 3.');
  const cancelledStarted = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => ({ plate: new URLSearchParams(location.search).get('plate'), status: document.querySelector('#task-panel').dataset.status, title: document.querySelector('#task-title').textContent, percent: document.querySelector('#task-percent').textContent }))()`
  });
  assert(cancelledStarted.result.value.title === '史蒂夫_03_012207' && cancelledStarted.result.value.percent === '0%', `The selected plate did not enter the task panel as the printing model: ${JSON.stringify(cancelledStarted.result.value)}`);

  /* ---------- 延时摄影页 / 删除页：整屏铺满 ---------- */
  const timelapseFullscreen = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.width <= 390 });
    await cdp.send('Page.navigate', { url: pageUrl });
    await delay(700);
    const measured = await cdp.send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async () => {
        const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        const frame = { w: Math.min(innerWidth, 375), h: Math.min(innerHeight, 812), left: Math.max(0, Math.round((innerWidth - Math.min(innerWidth, 375)) / 2)), top: Math.max(0, Math.round((innerHeight - Math.min(innerHeight, 812)) / 2)) };
        document.querySelector('#timelapse-action').click();
        await wait(240);
        const screen = document.querySelector('#timelapse-screen');
        const rect = screen.getBoundingClientRect();
        const page = document.querySelector('.timelapse-page');
        const back = document.querySelector('#timelapse-screen-back').getBoundingClientRect();
        const del = document.querySelector('#open-timelapse-delete').getBoundingClientRect();
        const items = [...document.querySelectorAll('.timelapse-item')].map((el) => {
          const card = el.querySelector('.timelapse-card').getBoundingClientRect();
          const cta = el.querySelector('.timelapse-cta').getBoundingClientRect();
          const img = el.querySelector('.timelapse-thumb img');
          return {
            name: el.querySelector('.timelapse-name').textContent,
            card: { w: Math.round(card.width), h: Math.round(card.height), left: Math.round(card.left), top: Math.round(card.top) },
            cta: { w: Math.round(cta.width), h: Math.round(cta.height) },
            label: el.querySelector('[data-role="label"]').textContent,
            thumbLoaded: img.complete && img.naturalWidth > 0,
            thumbNatural: [img.naturalWidth, img.naturalHeight]
          };
        });
        return {
          viewport: [innerWidth, innerHeight], frame,
          screen: [Math.round(rect.width), Math.round(rect.height), Math.round(rect.left)],
          pageFillsFrame: page.getBoundingClientRect().width >= frame.w - 1,
          back: { w: Math.round(back.width), h: Math.round(back.height), left: Math.round(back.left) },
          del: { w: Math.round(del.width), h: Math.round(del.height), right: Math.round(innerWidth - del.right) },
          title: document.querySelector('.timelapse-bar__title').textContent,
          items,
          deleteBarHidden: document.querySelector('#timelapse-delete-bar').hidden
        };
      })()`
    });
    timelapseFullscreen.push(measured.result.value);
  }
  /* 延时摄影页现在是真实 DOM（不再是整图铺满），所以断言「锁在 375×812 设备框内 + 真实列表结构」 */
  timelapseFullscreen.forEach((entry) => {
    const label = `${entry.viewport[0]}x${entry.viewport[1]}`;
    assert(entry.screen[0] === entry.frame.w && entry.screen[1] === entry.frame.h && entry.screen[2] === entry.frame.left, `延时摄影页 is not locked in the iPhone 13 mini frame at ${label}: ${JSON.stringify(entry)}`);
    assert(entry.pageFillsFrame, `延时摄影页 content does not fill the device frame at ${label}: ${JSON.stringify(entry)}`);
    assert(entry.title === '延时摄影', `延时摄影页 title is wrong at ${label}: ${entry.title}`);
    /* 顶栏：返回在左、删除在右，两个命中盒都要 ≥44px */
    /* 返回按钮是 44px 命中盒，贴在顶栏左缘（顶栏自身有 8px 内边距，所以比框左缘 inward 约 8px） */
    const backInset = entry.back.left - entry.frame.left;
    assert(entry.back.w >= 44 && entry.back.h >= 44 && backInset >= 0 && backInset <= 16, `返回按钮 is not a 44px hit box near the frame's left at ${label}: ${JSON.stringify({ back: entry.back, frameLeft: entry.frame.left, backInset })}`);
    assert(entry.del.w >= 44 && entry.del.h >= 44, `删除按钮 is not a 44px hit box at ${label}: ${JSON.stringify(entry.del)}`);
    /* 三个模型项，顺序与原图一致（史蒂夫_01 / _02_012209 / _03_012207） */
    assert(entry.items.length === 3, `延时摄影页 should list 3 models at ${label}: ${JSON.stringify(entry.items)}`);
    assert(JSON.stringify(entry.items.map((i) => i.name)) === JSON.stringify(['史蒂夫_01', '史蒂夫_02_012209', '史蒂夫_03_012207']), `延时摄影 model names/order do not match the reference artwork at ${label}: ${JSON.stringify(entry.items)}`);
    entry.items.forEach((item) => {
      assert(item.thumbLoaded && item.thumbNatural[0] > 0, `延时摄影 thumbnail did not load: ${JSON.stringify(item)}`);
      assert(item.card.w > 0 && item.card.h > 0, `延时摄影 card has no size: ${JSON.stringify(item)}`);
      assert(item.cta.w >= 44 && item.cta.h >= 44, `延时摄影 CTA is below the 44px minimum: ${JSON.stringify(item)}`);
      assert(item.label === '下载', `延时摄影 CTA should start as 下载: ${JSON.stringify(item)}`);
    });
    /* 卡片自上而下排列 */
    for (let i = 1; i < entry.items.length; i += 1) assert(entry.items[i].card.top > entry.items[i - 1].card.top, `延时摄影 cards are not stacked top-down at ${label}: ${JSON.stringify(entry.items)}`);
    assert(entry.deleteBarHidden, `删除操作条 should stay hidden until 删除 is tapped at ${label}`);
  });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await cdp.send('Page.navigate', { url: pageUrl });
  await delay(700);
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#timelapse-action').click()` });
  await delay(300);
  const timelapseShot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(timelapseFullscreenPreviewPath, Buffer.from(timelapseShot.data, 'base64'));
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#timelapse-screen-back').click()` });
  await waitFor(cdp, `[...document.querySelectorAll('.reuse-screen')].every(screen => screen.hidden)`, '延时摄影页 did not close.');

  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#my-models').click()` });
  await waitFor(cdp, `!document.querySelector('#reference-screen').hidden && decodeURI(document.querySelector('#reference-image').currentSrc).endsWith('我的模型.jpg')`, 'My models did not open the reused reference image.');
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#reference-back').click()` });
  await waitFor(cdp, `document.querySelector('#task-panel').dataset.status === 'ready' && document.querySelector('#reference-screen').hidden`, 'My models did not return to the ready printer page.');

  await cdp.send('Page.navigate', { url: `${pageUrl}?connection=offline` });
  await waitFor(cdp, `document.querySelector('#printer-connection-state')?.dataset.connectionStatus === 'offline'`, 'Offline printer connection state did not render.');
  const offlineConnection = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const panel = document.querySelector('#printer-connection-state');
      const image = document.querySelector('#printer-connection-state-image');
      if (!image.complete) await new Promise(resolve => image.addEventListener('load', resolve, { once: true }));
      const header = document.querySelector('.printer-header').getBoundingClientRect();
      const rect = image.getBoundingClientRect();
      return {
        status: panel.dataset.connectionStatus,
        label: document.querySelector('#printer-connection-state-label').textContent,
        hidden: image.hidden,
        src: decodeURI(image.currentSrc),
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        rect: {
          left: (rect.left - header.left) / header.width,
          top: (rect.top - header.top) / header.height,
          right: (rect.right - header.left) / header.width,
          bottom: (rect.bottom - header.top) / header.height
        }
      };
    })()`
  });
  assert(offlineConnection.result.value.status === 'offline' && offlineConnection.result.value.label === '离线' && !offlineConnection.result.value.hidden, `Offline state did not show its connection overlay: ${JSON.stringify(offlineConnection.result.value)}`);
  assert(offlineConnection.result.value.src.endsWith('lianjiezhuangtai/离线.png') && offlineConnection.result.value.naturalWidth === 74 && offlineConnection.result.value.naturalHeight === 42, `Offline connection asset is incorrect: ${JSON.stringify(offlineConnection.result.value)}`);
  assert(offlineConnection.result.value.rect.left > 0.15 && offlineConnection.result.value.rect.left < 0.18 && offlineConnection.result.value.rect.top > 0.69 && offlineConnection.result.value.rect.top < 0.75, `Offline connection overlay does not cover the source busy indicator: ${JSON.stringify(offlineConnection.result.value.rect)}`);
  const offlineConnectionScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(offlineConnectionPreviewPath, Buffer.from(offlineConnectionScreenshot.data, 'base64'));

  await cdp.send('Page.navigate', { url: `${pageUrl}?status=preparing` });
  await delay(500);

  const preparingCancellation = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      document.querySelector('#cancel-print').click();
      const dialog = document.querySelector('#action-dialog');
      const closeRect = document.querySelector('#dialog-close').getBoundingClientRect();
      const dialogRect = dialog.getBoundingClientRect();
      return {
        open: dialog.open,
        prompt: document.querySelector('#dialog-title').textContent,
        copy: document.querySelector('#dialog-copy').textContent,
        dismiss: document.querySelector('#dialog-dismiss').textContent,
        confirm: document.querySelector('#dialog-confirm').textContent,
        closeLabel: document.querySelector('#dialog-close').getAttribute('aria-label'),
        closeInTopRight: closeRect.right <= dialogRect.right && closeRect.left > dialogRect.left + dialogRect.width / 2 && closeRect.top < dialogRect.top + dialogRect.height / 2
      };
    })()`
  });
  assert(preparingCancellation.result.value.open && preparingCancellation.result.value.prompt === '是否要取消任务', `Cancellation dialog prompt is incorrect: ${JSON.stringify(preparingCancellation.result.value)}`);
  assert(preparingCancellation.result.value.copy === '' && preparingCancellation.result.value.dismiss === '取消当前任务' && preparingCancellation.result.value.confirm === '取消全部任务', 'Cancellation dialog actions are incorrect.');
  assert(preparingCancellation.result.value.closeInTopRight && preparingCancellation.result.value.closeLabel === '关闭弹窗', `Cancellation dialog close control is missing from the top-right corner: ${JSON.stringify(preparingCancellation.result.value)}`);
  const preparingCancelDialogScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(preparingCancelDialogPreviewPath, Buffer.from(preparingCancelDialogScreenshot.data, 'base64'));
  const closeResult = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      document.querySelector('#dialog-close').click();
      await new Promise(resolve => setTimeout(resolve, 50));
      return {
        dialogOpen: document.querySelector('#action-dialog').open,
        status: document.querySelector('#task-panel').dataset.status,
        queueHidden: document.querySelector('#print-queue').hidden
      };
    })()`
  });
  assert(!closeResult.result.value.dialogOpen && closeResult.result.value.status === 'preparing' && closeResult.result.value.queueHidden, `关闭按钮 did not dismiss the dialog and keep printing: ${JSON.stringify(closeResult.result.value)}`);
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#cancel-print').click(); document.querySelector('#dialog-dismiss').click()` });
  /* form method="dialog" 的关闭事件异步派发，稍等再读过渡弹窗状态 */
  await delay(150);
  const cancellingTransition = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => ({
      overlayVisible: !document.querySelector('#transition-overlay').hidden,
      label: document.querySelector('#transition-label').textContent,
      cancelText: document.querySelector('#cancel-print span:last-child').textContent,
      cancelDisabled: document.querySelector('#cancel-print').disabled
    }))()`
  });
  assert(cancellingTransition.result.value.overlayVisible && cancellingTransition.result.value.label === '取消中...' && cancellingTransition.result.value.cancelText === '取消中...' && cancellingTransition.result.value.cancelDisabled, `取消中过渡弹窗或按钮态不正确: ${JSON.stringify(cancellingTransition.result.value)}`);
  await waitFor(cdp, `document.querySelector('#task-panel').dataset.status === 'cancelled'`, '取消中过渡 did not land on the cancelled state.');
  await waitFor(cdp, `document.querySelector('#transition-overlay').hidden`, '取消中弹窗 did not close after the transition.');
  const cancelledState = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => ({
      status: document.querySelector('#task-panel').dataset.status,
      label: document.querySelector('#task-state').textContent,
      taskCopyHidden: document.querySelector('.task-copy').hidden,
      preparationHidden: document.querySelector('#preparation-progress').hidden,
      percentHidden: document.querySelector('#task-percent').hidden,
      countdownHidden: document.querySelector('#remaining-time').hidden,
      progressHidden: document.querySelector('#task-progress').hidden,
      actionsHidden: document.querySelector('#task-actions').hidden,
      queueToggleHidden: document.querySelector('#queue-toggle').hidden,
      queueHidden: document.querySelector('#print-queue').hidden,
      queueExpanded: document.querySelector('#queue-toggle').getAttribute('aria-expanded'),
      queueTasks: [...document.querySelectorAll('[data-queue-task]:not([hidden])')].map((task) => task.dataset.queueId),
      connectionStatus: document.querySelector('#printer-connection-state').dataset.connectionStatus,
      connectionLabel: document.querySelector('#printer-connection-state-label').textContent,
      connectionImageHidden: document.querySelector('#printer-connection-state-image').hidden
    }))()`
  });
  assert(cancelledState.result.value.status === 'cancelled' && cancelledState.result.value.label === '已取消打印任务', `Preparing cancellation did not enter the minimal cancelled state: ${JSON.stringify(cancelledState.result.value)}`);
  assert(cancelledState.result.value.taskCopyHidden && cancelledState.result.value.preparationHidden && cancelledState.result.value.percentHidden && cancelledState.result.value.countdownHidden && cancelledState.result.value.progressHidden && cancelledState.result.value.actionsHidden && !cancelledState.result.value.queueHidden, `Cancelled state did not preserve its waiting print queue: ${JSON.stringify(cancelledState.result.value)}`);
  assert(cancelledState.result.value.connectionStatus === 'idle' && cancelledState.result.value.connectionLabel === '空闲' && !cancelledState.result.value.connectionImageHidden, `Cancelled task did not restore the idle connection indicator: ${JSON.stringify(cancelledState.result.value)}`);
  assert(!cancelledState.result.value.queueToggleHidden && cancelledState.result.value.queueExpanded === 'true' && cancelledState.result.value.queueTasks.join(',') === 'plate-2,plate-3', `取消当前任务 must leave the waiting queue untouched: ${JSON.stringify(cancelledState.result.value)}`);
  const cancelledScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(cancelledPreviewPath, Buffer.from(cancelledScreenshot.data, 'base64'));
  await cdp.send('Page.reload');
  await delay(250);

  const preparingScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(preparingPreviewPath, Buffer.from(preparingScreenshot.data, 'base64'));
  const preparation = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const readStage = () => ({
        label: document.querySelector('#preparation-label').textContent,
        percent: document.querySelector('#preparation-percent').textContent,
        percentHidden: document.querySelector('#preparation-percent').hidden
      });
      const panelRect = document.querySelector('#task-panel').getBoundingClientRect();
      const cancelRect = document.querySelector('#cancel-print').getBoundingClientRect();
      const spinnerStyle = getComputedStyle(document.querySelector('#preparation-spinner'));
      const statusStyle = getComputedStyle(document.querySelector('.task-status'));
      const initial = {
        duration: PREPARATION_DURATION_SECONDS,
        status: document.querySelector('#task-panel').dataset.status,
        taskState: document.querySelector('#task-state').textContent,
        progressState: document.querySelector('#progress-state').textContent,
        preparingVisible: !document.querySelector('#preparation-progress').hidden,
        taskPercentHidden: document.querySelector('#task-percent').hidden,
        countdownHidden: document.querySelector('#remaining-time').hidden,
        printProgressHidden: document.querySelector('#task-progress').hidden,
        finishHidden: document.querySelector('#finish-now').hidden,
        pauseHidden: document.querySelector('#pause-print').hidden,
        queueHidden: document.querySelector('#queue-toggle').hidden,
        connectionStatus: document.querySelector('#printer-connection-state').dataset.connectionStatus,
        connectionLabel: document.querySelector('#printer-connection-state-label').textContent,
        connectionImageHidden: document.querySelector('#printer-connection-state-image').hidden,
        cancelVisible: !document.querySelector('#cancel-print').hidden,
        cancelCenterDelta: Math.abs((cancelRect.left + cancelRect.width / 2) - (panelRect.left + panelRect.width / 2)),
        spinner: { width: spinnerStyle.width, height: spinnerStyle.height, animation: spinnerStyle.animationName, borderTopColor: spinnerStyle.borderTopColor, borderRightColor: spinnerStyle.borderRightColor },
        theme: { color: statusStyle.color, background: statusStyle.backgroundColor },
        stage: readStage()
      };
      const analysisProgress = [Number(initial.stage.percent.replace('%', ''))];
      for (let index = 0; index < 9; index += 1) {
        advancePreparation();
        analysisProgress.push(Number(document.querySelector('#preparation-percent').textContent.replace('%', '')));
      }
      const analysisComplete = readStage();
      advancePreparation();
      const calibration = readStage();
      for (let index = 0; index < 4; index += 1) advancePreparation();
      const homing = readStage();
      for (let index = 0; index < 4; index += 1) advancePreparation();
      const leveling = readStage();
      for (let index = 0; index < 4; index += 1) advancePreparation();
      const heating = readStage();
      for (let index = 0; index < 4; index += 1) advancePreparation();
      const afterPreparation = {
        status: document.querySelector('#task-panel').dataset.status,
        preparingHidden: document.querySelector('#preparation-progress').hidden,
        countdownVisible: !document.querySelector('#remaining-time').hidden,
        printProgressVisible: !document.querySelector('#task-progress').hidden,
        finishVisible: !document.querySelector('#finish-now').hidden,
        pauseVisible: !document.querySelector('#pause-print').hidden,
        queueVisible: !document.querySelector('#queue-toggle').hidden,
        connectionStatus: document.querySelector('#printer-connection-state').dataset.connectionStatus,
        connectionLabel: document.querySelector('#printer-connection-state-label').textContent,
        connectionImageHidden: document.querySelector('#printer-connection-state-image').hidden
      };
      return { initial, analysisProgress, analysisComplete, stages: [calibration, homing, leveling, heating], afterPreparation };
    })()`
  });
  const preparing = preparation.result.value;
  assert(preparing.initial.duration === 26 && preparing.initial.status === 'preparing' && preparing.initial.taskState === '准备中' && preparing.initial.progressState === '准备打印', `Initial preparation state is incorrect: ${JSON.stringify(preparing.initial)}`);
  assert(preparing.initial.preparingVisible && preparing.initial.taskPercentHidden && preparing.initial.countdownHidden && preparing.initial.printProgressHidden, 'Preparation content did not replace printing progress and countdown.');
  assert(preparing.initial.finishHidden && preparing.initial.pauseHidden && preparing.initial.queueHidden && preparing.initial.cancelVisible && preparing.initial.cancelCenterDelta <= 2, 'Preparation actions or queue visibility is incorrect.');
  assert(preparing.initial.connectionStatus === 'busy' && preparing.initial.connectionLabel === '忙碌' && preparing.initial.connectionImageHidden, `Preparing state did not expose the source busy indicator: ${JSON.stringify(preparing.initial)}`);
  assert(preparing.initial.spinner.width === preparing.initial.spinner.height && preparing.initial.spinner.animation !== 'none' && preparing.initial.spinner.borderTopColor !== preparing.initial.spinner.borderRightColor, `Preparation spinner is incorrect: ${JSON.stringify(preparing.initial.spinner)}`);
  assert(preparing.initial.theme.background === 'rgb(240, 237, 255)', `Preparation theme is not pale purple: ${JSON.stringify(preparing.initial.theme)}`);
  assert(preparing.initial.stage.label === '正在分析模型' && !preparing.initial.stage.percentHidden && preparing.initial.stage.percent === '0%', 'Analysis stage must begin at 0%.');
  assert(preparing.analysisProgress.length === 10 && preparing.analysisProgress.every((value, index, values) => index === 0 || value > values[index - 1]), `Analysis progress must rise in distinct jumps: ${JSON.stringify(preparing.analysisProgress)}`);
  assert(preparing.analysisComplete.label === '正在分析模型' && preparing.analysisComplete.percent === '100%' && !preparing.analysisComplete.percentHidden, 'Analysis progress must jump to 100% before the next stage.');
  assert(JSON.stringify(preparing.stages.map(stage => stage.label)) === JSON.stringify(['校准中', '归零中', '调平中', '升温中']) && preparing.stages.every(stage => stage.percentHidden), `Preparation stage order or percent visibility is incorrect: ${JSON.stringify(preparing.stages)}`);
  assert(preparing.afterPreparation.status === 'printing' && preparing.afterPreparation.preparingHidden && preparing.afterPreparation.countdownVisible && preparing.afterPreparation.printProgressVisible && preparing.afterPreparation.finishVisible && preparing.afterPreparation.pauseVisible && preparing.afterPreparation.queueVisible, `Preparation did not switch to printing after 26 seconds: ${JSON.stringify(preparing.afterPreparation)}`);
  assert(preparing.afterPreparation.connectionStatus === 'busy' && preparing.afterPreparation.connectionLabel === '忙碌' && preparing.afterPreparation.connectionImageHidden, `Printing transition did not keep the source busy indicator: ${JSON.stringify(preparing.afterPreparation)}`);

  const evaluation = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const timeBeforeTick = document.querySelector('#remaining-time').textContent;
      const taskAsset = document.querySelector('#active-task-image');
      const taskReference = {
        loaded: taskAsset.complete && taskAsset.naturalWidth > 0,
        src: decodeURI(taskAsset.currentSrc),
        title: document.querySelector('#task-title').textContent,
        meta: document.querySelector('.task-meta').textContent,
        initialTime: timeBeforeTick
      };
      await wait(1100);
      const timeAfterTick = document.querySelector('#remaining-time').textContent;

      const pause = document.querySelector('#pause-print');
      pause.click();
      const pausingTransition = {
        overlayVisible: !document.querySelector('#transition-overlay').hidden,
        label: document.querySelector('#transition-label').textContent,
        pauseText: pause.querySelector('span:last-child').textContent,
        cancelDisabled: document.querySelector('#cancel-print').disabled
      };
      await wait(2300);
      const pausedTime = document.querySelector('#remaining-time').textContent;
      await wait(1100);
      const pausedTimeAfterWait = document.querySelector('#remaining-time').textContent;
      const pausedTheme = document.querySelector('#task-panel').dataset.status;
      const pausedConnection = {
        status: document.querySelector('#printer-connection-state').dataset.connectionStatus,
        imageHidden: document.querySelector('#printer-connection-state-image').hidden
      };
      pause.click();
      const resumingTransition = {
        overlayVisible: !document.querySelector('#transition-overlay').hidden,
        label: document.querySelector('#transition-label').textContent,
        pauseText: pause.querySelector('span:last-child').textContent,
        cancelDisabled: document.querySelector('#cancel-print').disabled
      };
      await wait(2300);
      const resumedStatus = document.querySelector('#task-panel').dataset.status;

      const queueToggle = document.querySelector('#queue-toggle');
      queueToggle.click();
      const queuedReference = {
        loaded: [...document.querySelectorAll('[data-queue-task]:not([hidden]) .queue-task-artwork')].every(image => image.complete && image.naturalWidth > 0),
        srcs: [...document.querySelectorAll('[data-queue-task]:not([hidden]) .queue-task-artwork')].map(image => decodeURI(image.currentSrc)),
        plates: [...document.querySelectorAll('[data-queue-task]:not([hidden])')].map(task => task.dataset.plate),
        taskCount: document.querySelectorAll('[data-queue-task]:not([hidden])').length
      };

      const filamentReference = document.querySelector('#filament-panel-image');
      const spoolHotspot = document.querySelector('#filament-spool');
      const selectionRing = document.querySelector('#filament-selection-ring');
      const filamentStatus = document.querySelector('#filament-status');
      const loadButton = document.querySelector('#load-filament');
      const unloadButton = document.querySelector('#unload-filament');
      const directActionsPresent = Boolean(loadButton) && Boolean(unloadButton);
      const oldPanelRemoved = !document.querySelector('#filament-settings, #filament-sheet, #filament-reference');
      const controlsPanelRemoved = !document.querySelector('.controls-section, #control-carousel, .carousel-dots, #control-settings');
      const loadDisabledBeforeSelection = loadButton.disabled;
      const unloadDisabledBeforeSelection = unloadButton.disabled;
      const ringHiddenBeforeSelection = selectionRing.hidden && filamentStatus.hidden;
      spoolHotspot.click();
      await wait(80);
      const spoolSelected = spoolHotspot.getAttribute('aria-pressed') === 'true' && !selectionRing.hidden;
      const loadEnabledAfterSelection = !loadButton.disabled && loadButton.classList.contains('is-active');
      const unloadStillDisabled = unloadButton.disabled && !unloadButton.classList.contains('is-active');
      const filamentFrame = document.querySelector('.filament-panel-frame').getBoundingClientRect();
      const filamentCanvasBox = document.querySelector('.filament-panel-canvas');
      const filamentCanvas = filamentCanvasBox.getBoundingClientRect();
      const filamentImage = filamentReference.getBoundingClientRect();
      const fanBanner = document.querySelector('#fan-filter-banner');
      const fanBannerRect = fanBanner.getBoundingClientRect();
      const taskPanelRect = document.querySelector('#task-panel').getBoundingClientRect();
      const contentRect = document.querySelector('.page-content').getBoundingClientRect();
      const relativeToFilamentCanvas = (selector) => {
        const rect = document.querySelector(selector).getBoundingClientRect();
        return {
          left: (rect.left - filamentCanvas.left) / filamentCanvas.width,
          top: (rect.top - filamentCanvas.top) / filamentCanvas.height,
          right: (rect.right - filamentCanvas.left) / filamentCanvas.width,
          bottom: (rect.bottom - filamentCanvas.top) / filamentCanvas.height,
          centerX: (rect.left + rect.width / 2 - filamentCanvas.left) / filamentCanvas.width
        };
      };
      const filamentGeometry = {
        naturalWidth: filamentReference.naturalWidth,
        naturalHeight: filamentReference.naturalHeight,
        renderedWidth: filamentImage.width,
        renderedHeight: filamentImage.height,
        renderedRatio: filamentImage.width / filamentImage.height,
        canvasWidthDelta: Math.abs(filamentCanvas.width - filamentImage.width),
        canvasPresent: Boolean(filamentCanvasBox),
        canvasOverflow: filamentImage.bottom - filamentCanvas.bottom,
        frameContainsCanvas: filamentCanvas.top >= filamentFrame.top && Math.abs(filamentCanvas.bottom - filamentFrame.bottom) < 0.5,
        visibleLeftDelta: Math.abs(filamentImage.left - taskPanelRect.left),
        visibleRightDelta: Math.abs(filamentImage.right - taskPanelRect.right),
        bannerHeight: fanBannerRect.height,
        bannerWidthDelta: Math.abs(fanBannerRect.width - filamentCanvas.width),
        bannerSeamGap: fanBannerRect.bottom - filamentCanvas.top,
        /* 任务面板和耗材面板之间现在夹着固件提醒条，两段间距都按 page-content 的 16px gap 校验 */
        firmwareBannerToTaskGap: document.querySelector('#firmware-banner').getBoundingClientRect().top - taskPanelRect.bottom,
        bannerToTaskGap: fanBannerRect.top - document.querySelector('#firmware-banner').getBoundingClientRect().bottom,
        bannerText: fanBanner.textContent.replace(/\\s+/g, ''),
        bannerGradient: getComputedStyle(fanBanner).backgroundImage,
        spool: relativeToFilamentCanvas('#filament-spool'),
        ring: relativeToFilamentCanvas('#filament-selection-ring'),
        load: relativeToFilamentCanvas('#load-filament'),
        unload: relativeToFilamentCanvas('#unload-filament')
      };

      document.querySelector('#finish-now').click();
      const completed = {
        status: document.querySelector('#task-panel').dataset.status,
        percent: document.querySelector('#task-percent').textContent,
        time: document.querySelector('#remaining-time').textContent,
        actionsVisible: !document.querySelector('#completion-actions').hidden,
        activeActionsHidden: document.querySelector('#task-actions').hidden,
        nextPlateVisible: !document.querySelector('#next-plate').hidden,
        restartLabel: document.querySelector('#restart-print span:last-child').textContent,
        connectionStatus: document.querySelector('#printer-connection-state').dataset.connectionStatus,
        connectionLabel: document.querySelector('#printer-connection-state-label').textContent,
        connectionImageHidden: document.querySelector('#printer-connection-state-image').hidden
      };
      document.querySelector('#restart-print').click();
      const restarted = {
        status: document.querySelector('#task-panel').dataset.status,
        preparingVisible: !document.querySelector('#preparation-progress').hidden,
        stage: document.querySelector('#preparation-label').textContent,
        percentHidden: document.querySelector('#preparation-percent').hidden,
        countdownHidden: document.querySelector('#remaining-time').hidden,
        completionHidden: document.querySelector('#completion-actions').hidden,
        connectionStatus: document.querySelector('#printer-connection-state').dataset.connectionStatus,
        connectionImageHidden: document.querySelector('#printer-connection-state-image').hidden
      };
      await wait(1900);

      return {
        viewport: { width: document.documentElement.clientWidth, height: innerHeight },
        taskReference,
        countdownWorked: timeBeforeTick !== timeAfterTick,
        pausingTransition,
        resumingTransition,
        resumedStatus,
        pauseWorked: pausedTheme === 'paused' && pausedTime === pausedTimeAfterWait,
        pausedConnection,
        queuedReference,
        filamentReference: { loaded: filamentReference.complete && filamentReference.naturalWidth > 0, src: decodeURI(filamentReference.currentSrc) },
        directActionsPresent,
        oldPanelRemoved,
        controlsPanelRemoved,
        loadDisabledBeforeSelection,
        unloadDisabledBeforeSelection,
        ringHiddenBeforeSelection,
        spoolSelected,
        loadEnabledAfterSelection,
        unloadStillDisabled,
        filamentGeometry,
        completed,
        restarted,
        pageHeight: document.documentElement.scrollHeight
      };
    })()`
  });

  const result = evaluation.result.value;
  assert(result.viewport.width === 375 && result.viewport.height === 812, `Expected an iPhone 13 mini viewport, got ${result.viewport.width}x${result.viewport.height}px.`);
  assert(result.taskReference.loaded && result.taskReference.src.endsWith('选中要打印的盘1.jpg'), 'Plate 1 task artwork did not load.');
  assert(result.taskReference.title === '史蒂夫_01_012214' && result.taskReference.meta.includes('5 h 15 min'), 'Plate 1 task name or duration is incorrect.');
  assert(result.taskReference.initialTime === '05:15:00', 'Printing countdown must begin at 5 h 15 min.');
  assert(result.countdownWorked, 'Countdown did not decrement.');
  assert(result.pauseWorked, 'Pause did not freeze the countdown or apply paused status.');
  assert(result.pausingTransition.overlayVisible && result.pausingTransition.label === '暂停中...' && result.pausingTransition.pauseText === '暂停中...' && result.pausingTransition.cancelDisabled, `暂停过渡弹窗或按钮态不正确: ${JSON.stringify(result.pausingTransition)}`);
  assert(result.resumingTransition.overlayVisible && result.resumingTransition.label === '继续打印中...' && result.resumingTransition.pauseText === '继续中...' && result.resumingTransition.cancelDisabled, `继续过渡弹窗或按钮态不正确: ${JSON.stringify(result.resumingTransition)}`);
  assert(result.resumedStatus === 'printing', `继续打印中过渡后应回到打印中: ${result.resumedStatus}`);
  assert(result.pausedConnection.status === 'busy' && result.pausedConnection.imageHidden, `Paused state did not retain the source busy indicator: ${JSON.stringify(result.pausedConnection)}`);
  assert(result.queuedReference.loaded && result.queuedReference.taskCount === 2, 'Print queue images or task controls are incorrect.');
  assert(JSON.stringify(result.queuedReference.plates) === JSON.stringify(['2', '3']), `Plate 1 queue should contain plates 2 and 3: ${JSON.stringify(result.queuedReference)}`);
  assert(result.queuedReference.srcs[0].endsWith('打印队列2.jpg') && result.queuedReference.srcs[1].endsWith('打印队列3.jpg'), `Plate 1 queue artwork is incorrect: ${JSON.stringify(result.queuedReference)}`);
  assert(result.filamentReference.loaded && result.filamentReference.src.endsWith('原型修改复用图片资源/耗材面板.png'), 'Required replacement filament-panel image did not load.');
  assert(result.directActionsPresent && result.oldPanelRemoved && result.controlsPanelRemoved, 'Replacement filament panel did not remove the old sheet and the device-control section.');
  assert(result.loadDisabledBeforeSelection && result.unloadDisabledBeforeSelection && result.ringHiddenBeforeSelection, 'Filament actions must start disabled with no selection ring or status text.');
  assert(result.spoolSelected, 'Clicking the blue spool did not switch on the green selection state.');
  assert(result.loadEnabledAfterSelection && result.unloadStillDisabled, 'Selecting the spool must enable the load action only.');
  assert(result.filamentGeometry.naturalWidth === 352 && result.filamentGeometry.naturalHeight === 248, `Replacement filament artwork has unexpected dimensions: ${JSON.stringify(result.filamentGeometry)}`);
  assert(Math.abs(result.filamentGeometry.renderedWidth - (result.viewport.width - 32)) < 0.5, `Filament panel width does not match the page content column: ${JSON.stringify(result.filamentGeometry)}`);
  assert(Math.abs(result.filamentGeometry.renderedRatio - 352 / 248) < 0.01, `Filament panel artwork is distorted: ${JSON.stringify(result.filamentGeometry)}`);
  assert(result.filamentGeometry.canvasPresent && result.filamentGeometry.canvasWidthDelta < 0.5 && Math.abs(result.filamentGeometry.canvasOverflow) < 0.5, `Filament artwork canvas is missing or changed size: ${JSON.stringify(result.filamentGeometry)}`);
  assert(result.filamentGeometry.frameContainsCanvas, `Fan-filter banner is not attached above the filament artwork: ${JSON.stringify(result.filamentGeometry)}`);
  assert(result.filamentGeometry.visibleLeftDelta < 1 && result.filamentGeometry.visibleRightDelta < 1, `Visible filament panel is not aligned with the print task panel: ${JSON.stringify(result.filamentGeometry)}`);
  assert(Math.abs(result.filamentGeometry.bannerHeight - 22) < 0.5 && result.filamentGeometry.bannerWidthDelta < 0.5, `Fan-filter banner geometry is wrong: ${JSON.stringify(result.filamentGeometry)}`);
  assert(Math.abs(result.filamentGeometry.bannerSeamGap) < 0.6, `Fan-filter banner is not seamlessly joined to the filament panel: ${JSON.stringify(result.filamentGeometry)}`);
  assert(result.filamentGeometry.bannerToTaskGap > 14 && result.filamentGeometry.bannerToTaskGap < 18, `Fan-filter banner lost the page-content gap to the firmware banner: ${JSON.stringify(result.filamentGeometry)}`);
  assert(result.filamentGeometry.firmwareBannerToTaskGap > 14 && result.filamentGeometry.firmwareBannerToTaskGap < 18, `The firmware banner lost the page-content gap to the task panel: ${JSON.stringify(result.filamentGeometry)}`);
  assert(result.filamentGeometry.bannerText === '当前风扇剩余100h需要更换滤芯' && result.filamentGeometry.bannerGradient.includes('linear-gradient') && result.filamentGeometry.bannerGradient.includes('116, 86, 238') && result.filamentGeometry.bannerGradient.includes('57, 129, 241'), `Fan-filter banner copy or gradient is wrong: ${JSON.stringify(result.filamentGeometry)}`);
  assert(result.filamentGeometry.spool.left > 0.38 && result.filamentGeometry.spool.left < 0.41 && result.filamentGeometry.spool.right > 0.58 && result.filamentGeometry.spool.right < 0.61 && result.filamentGeometry.spool.top > 0.19 && result.filamentGeometry.spool.top < 0.23 && result.filamentGeometry.spool.bottom > 0.48 && result.filamentGeometry.spool.bottom < 0.52, `Spool hotspot does not cover the blue spool artwork: ${JSON.stringify(result.filamentGeometry.spool)}`);
  assert(result.filamentGeometry.ring.left > 0.36 && result.filamentGeometry.ring.left < 0.40 && result.filamentGeometry.ring.right > 0.59 && result.filamentGeometry.ring.right < 0.63 && result.filamentGeometry.ring.top > 0.17 && result.filamentGeometry.ring.top < 0.21 && result.filamentGeometry.ring.bottom > 0.50 && result.filamentGeometry.ring.bottom < 0.54, `Green selection ring is not hugging the spool: ${JSON.stringify(result.filamentGeometry.ring)}`);
  assert(result.filamentGeometry.load.left < 0.05 && result.filamentGeometry.load.top > 0.7 && result.filamentGeometry.load.top < 0.73 && result.filamentGeometry.load.right > 0.42 && result.filamentGeometry.load.right < 0.45, `Load button does not cover the left source-art button: ${JSON.stringify(result.filamentGeometry.load)}`);
  assert(result.filamentGeometry.unload.left > 0.51 && result.filamentGeometry.unload.left < 0.54 && result.filamentGeometry.unload.top > 0.7 && result.filamentGeometry.unload.right > 0.91, `Unload button does not cover the right source-art button: ${JSON.stringify(result.filamentGeometry.unload)}`);
  assert(result.completed.status === 'completed', 'Finish shortcut did not enter completed state.');
  assert(result.completed.percent === '100%' && result.completed.time === '00:00:00', 'Completed state did not reach 100% and zero time.');
  assert(result.completed.actionsVisible, 'Completed state actions are not visible.');
  assert(result.completed.activeActionsHidden, 'Pause and cancel actions remained visible after completion.');
  assert(result.completed.nextPlateVisible, 'Next plate should be visible while the queue is not empty.');
  assert(result.completed.restartLabel === '重新打印', 'Completed left action must be named 重新打印.');
  assert(result.completed.connectionStatus === 'idle' && result.completed.connectionLabel === '空闲' && !result.completed.connectionImageHidden, `Completed state did not switch the header to idle: ${JSON.stringify(result.completed)}`);
  assert(result.restarted.status === 'preparing' && result.restarted.preparingVisible && result.restarted.stage === '升温中' && result.restarted.percentHidden && result.restarted.countdownHidden, `重新打印必须先进入只承接喷嘴升温的准备中: ${JSON.stringify(result.restarted)}`);
  assert(result.restarted.completionHidden, 'Restart did not hide the completed actions.');
  assert(result.restarted.connectionStatus === 'busy' && result.restarted.connectionImageHidden, `Restart did not restore the source busy indicator: ${JSON.stringify(result.restarted)}`);
  /* 重新打印的准备中只承接升温：快进 30s 让页面回到打印中，再进入队列用例 */
  await cdp.send('Runtime.evaluate', { expression: `for (let index = 0; index < 30; index += 1) advancePreparation(); 'ok'` });
  await waitFor(cdp, `document.querySelector('#task-panel').dataset.status === 'printing'`, 'Reprint preparation did not return to printing.');

  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('.filament-panel').scrollIntoView({ block: 'center' })` });
  await delay(180);
  const filamentPanelScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(filamentPanelPreviewPath, Buffer.from(filamentPanelScreenshot.data, 'base64'));

  /* 打印队列里的待打印任务：按当前状态打开准备打印页，不再跳转打印旅程的配色页 */
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#queue-toggle').click(); document.querySelector('[data-queue-task][data-plate="2"]').click()` });
  await waitFor(cdp, `!document.querySelector('#prepare-state-screen').hidden`, 'Queue plate 2 did not open the prepare-print page.');
  const queueTwoColor = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const artwork = document.querySelector('#prepare-state-artwork');
      const stamp = document.querySelector('#state-stamp');
      if (!artwork.complete) await new Promise(resolve => artwork.addEventListener('load', resolve, { once: true }));
      const stage = document.querySelector('#prepare-state-stage').getBoundingClientRect();
      const rowHit = document.querySelector('.state-row[data-row="2"] .state-row-hit').getBoundingClientRect();
      const material = document.querySelector('.state-row[data-row="2"] .state-material-hit').getBoundingClientRect();
      const stampedRow = document.querySelector('.state-row[data-row="1"]');
      return {
        state: document.querySelector('#prepare-state-stage').dataset.state,
        artwork: decodeURI(artwork.currentSrc),
        stamp: decodeURI(stamp.currentSrc),
        stampTop: parseFloat(stamp.style.top),
        selected: [...document.querySelectorAll('.state-row[role="option"]')].filter(row => row.getAttribute('aria-selected') === 'true').map(row => row.dataset.row),
        startDisabled: document.querySelector('#prepare-state-start').disabled,
        dimVisible: !document.querySelector('#prepare-state-dim').hidden,
        stampedHasNoHit: stampedRow.querySelector('.state-row-hit').hidden && stampedRow.querySelector('.state-material-hit').hidden,
        rowHitBox: { width: Math.round(rowHit.width), height: Math.round(rowHit.height) },
        materialBox: {
          left: (material.left - stage.left) / stage.width,
          right: (material.right - stage.left) / stage.width,
          top: (material.top - stage.top) / stage.height,
          bottom: (material.bottom - stage.top) / stage.height,
          width: Math.round(material.width),
          height: Math.round(material.height)
        }
      };
    })()`
  });
  const queueState = queueTwoColor.result.value;
  assert(queueState.state === 'printing' && queueState.artwork.endsWith('assets/准备打印页-底图.png') && queueState.stamp.endsWith('assets/状态戳-正在打印.png') && Math.abs(queueState.stampTop - 36.148) < 0.01, `Queue plate 2 did not open the printing-state prepare page: ${JSON.stringify(queueState)}`);
  assert(queueState.selected.length === 1 && queueState.selected[0] === '2', `Queue plate 2 did not preselect the clicked plate: ${JSON.stringify(queueState)}`);
  assert(queueState.startDisabled && queueState.dimVisible, `The printing-state prepare page must disable 开始打印: ${JSON.stringify(queueState)}`);
  assert(queueState.stampedHasNoHit, `The stamped plate must not expose any hotspot: ${JSON.stringify(queueState)}`);
  assert(queueState.rowHitBox.width >= 44 && queueState.rowHitBox.height >= 44, `State row hotspots are too small: ${JSON.stringify(queueState.rowHitBox)}`);
  assert(queueState.materialBox.width >= 44 && queueState.materialBox.height >= 44 && queueState.materialBox.left > 0.43 && queueState.materialBox.right <= 0.995 && queueState.materialBox.top > 0.45 && queueState.materialBox.bottom < 0.62, `The state page material hotspot is misplaced or too small: ${JSON.stringify(queueState.materialBox)}`);
  const queueTwoColorScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(queueTwoColorPreviewPath, Buffer.from(queueTwoColorScreenshot.data, 'base64'));
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#prepare-state-back').click()` });
  await waitFor(cdp, `[...document.querySelectorAll('.reuse-screen')].every(screen => screen.hidden) && document.querySelector('#task-panel').dataset.status === 'printing'`, 'The queue prepare page did not return to the printing printer page.');
  const queueBack = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => ({
      status: document.querySelector('#task-panel').dataset.status,
      image: decodeURI(document.querySelector('#active-task-image').currentSrc)
    }))()`
  });
  assert(queueBack.result.value.status === 'printing' && queueBack.result.value.image.endsWith('选中要打印的盘1.jpg'), `Queue prepare back did not preserve the active printer task: ${JSON.stringify(queueBack.result.value)}`);

  const plateTwoMapping = await inspectPlateMapping(cdp, '2');
  assert(plateTwoMapping.activeSrc.endsWith('选择要打印的盘2（修改）.jpg'), `Plate 2 active artwork is incorrect: ${JSON.stringify(plateTwoMapping)}`);
  assert(plateTwoMapping.title === '史蒂夫_02_012209' && plateTwoMapping.meta.includes('3 h 48 min') && plateTwoMapping.time === '03:48:00', `Plate 2 task details are incorrect: ${JSON.stringify(plateTwoMapping)}`);
  assert(JSON.stringify(plateTwoMapping.queuePlates) === JSON.stringify(['1', '3']) && plateTwoMapping.queueSrcs[0].endsWith('打印队列1.jpg') && plateTwoMapping.queueSrcs[1].endsWith('打印队列3.jpg'), `Plate 2 queue mapping is incorrect: ${JSON.stringify(plateTwoMapping)}`);
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#queue-toggle').click()` });
  const plateTwoLayout = await cdp.send('Page.getLayoutMetrics');
  const plateTwoScreenshot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: 375, height: Math.ceil(plateTwoLayout.cssContentSize.height), scale: 1 }
  });
  fs.writeFileSync(plateTwoQueuePreviewPath, Buffer.from(plateTwoScreenshot.data, 'base64'));

  const plateThreeMapping = await inspectPlateMapping(cdp, '3');
  assert(plateThreeMapping.activeSrc.endsWith('选择要打印的盘3.jpg'), `Plate 3 active artwork is incorrect: ${JSON.stringify(plateThreeMapping)}`);
  assert(plateThreeMapping.title === '史蒂夫_03_012207' && plateThreeMapping.meta.includes('1 h 35 min') && plateThreeMapping.time === '01:35:00', `Plate 3 task details are incorrect: ${JSON.stringify(plateThreeMapping)}`);
  assert(JSON.stringify(plateThreeMapping.queuePlates) === JSON.stringify(['1', '2']) && plateThreeMapping.queueSrcs[0].endsWith('打印队列1.jpg') && plateThreeMapping.queueSrcs[1].endsWith('打印队列2.jpg'), `Plate 3 queue mapping is incorrect: ${JSON.stringify(plateThreeMapping)}`);

  await cdp.send('Page.navigate', { url: `${pageUrl}?status=printing&family=multi` });
  await delay(500);
  const multiAccountQueue = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      document.querySelector('#queue-toggle').click();
      const tasks = [...document.querySelectorAll('[data-queue-task]:not([hidden])')];
      await Promise.all(tasks.map(task => {
        const image = task.querySelector('.queue-task-artwork');
        return image.complete ? Promise.resolve() : new Promise(resolve => image.addEventListener('load', resolve, { once: true }));
      }));
      const activeCard = document.querySelector('#active-task-owner-card');
      return {
        count: tasks.length,
        owners: tasks.map(task => task.dataset.owner),
        borderColors: tasks.map(task => getComputedStyle(task).borderTopColor),
        avatarSources: tasks.map(task => decodeURI(task.querySelector('.task-owner-avatar').currentSrc)),
        girlArtwork: tasks.slice(2).map(task => decodeURI(task.querySelector('.queue-task-artwork').currentSrc)),
        activeOwner: activeCard.dataset.owner,
        activeBorder: getComputedStyle(activeCard).borderTopColor,
        activeAvatar: decodeURI(document.querySelector('#active-task-owner-avatar').currentSrc),
        activeAvatarRect: (() => {
          const avatar = document.querySelector('#active-task-owner-avatar').getBoundingClientRect();
          const card = activeCard.getBoundingClientRect();
          return { width: avatar.width, height: avatar.height, left: avatar.left - card.left, top: avatar.top - card.top };
        })()
      };
    })()`
  });
  const multi = multiAccountQueue.result.value;
  assert(multi.count === 4 && JSON.stringify(multi.owners) === JSON.stringify(['boy', 'boy', 'girl', 'girl']), `Multi-account queue did not show two boy and two girl tasks: ${JSON.stringify(multi)}`);
  assert(multi.activeOwner === 'boy' && multi.activeAvatar.endsWith('人物头像-男孩.png') && multi.activeBorder === 'rgb(77, 156, 255)', `Active boy task identity frame is incorrect: ${JSON.stringify(multi)}`);
  assert(multi.activeAvatarRect.width >= 32 && multi.activeAvatarRect.width <= 36 && multi.activeAvatarRect.height >= 32 && multi.activeAvatarRect.height <= 36 && multi.activeAvatarRect.left <= 12 && multi.activeAvatarRect.top <= 12, `Active owner avatar is not a compact top-left circle: ${JSON.stringify(multi.activeAvatarRect)}`);
  assert(multi.borderColors[0] === 'rgb(77, 156, 255)' && multi.borderColors[2] === 'rgb(54, 183, 126)' && multi.avatarSources[2].endsWith('人物头像-女孩.png'), `Queue identity borders or avatars are incorrect: ${JSON.stringify(multi)}`);
  assert(multi.girlArtwork[0].endsWith('女孩的待打印任务__1.jpg') && multi.girlArtwork[1].endsWith('女孩的待打印任务_2.jpg'), `Girl queue artwork is incorrect: ${JSON.stringify(multi)}`);
  const multiAccountQueueScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  fs.writeFileSync(multiAccountQueuePreviewPath, Buffer.from(multiAccountQueueScreenshot.data, 'base64'));

  /* 多账号队列：任何待打印任务都统一进入准备打印页（打印中 → 正在打印版） */
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#queued-task').click()` });
  await waitFor(cdp, `!document.querySelector('#prepare-state-screen').hidden`, 'Multi-account boy queue task did not open the prepare-print page.');
  const boyQueueState = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => ({ state: document.querySelector('#prepare-state-stage').dataset.state, selected: [...document.querySelectorAll('.state-row[role="option"]')].filter(row => row.getAttribute('aria-selected') === 'true').map(row => row.dataset.row), disabled: document.querySelector('#prepare-state-start').disabled }))()`
  });
  assert(boyQueueState.result.value.state === 'printing' && boyQueueState.result.value.disabled, `Multi-account boy queue page has the wrong state: ${JSON.stringify(boyQueueState.result.value)}`);
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#prepare-state-back').click()` });
  await waitFor(cdp, `[...document.querySelectorAll('.reuse-screen')].every(screen => screen.hidden) && document.querySelector('#task-panel')?.dataset.status === 'printing'`, 'Multi-account queue prepare back did not return to the printing page.');
  const boyQueueBack = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => ({ search: location.search, status: document.querySelector('#task-panel').dataset.status, count: document.querySelectorAll('[data-queue-task]:not([hidden])').length, owners: [...document.querySelectorAll('[data-queue-task]:not([hidden])')].map(task => task.dataset.owner) }))()`
  });
  assert(boyQueueBack.result.value.count === 4 && JSON.stringify(boyQueueBack.result.value.owners) === JSON.stringify(['boy', 'boy', 'girl', 'girl']), `Queue prepare back lost the four-task multi-account queue: ${JSON.stringify(boyQueueBack.result.value)}`);

  /* 女孩任务同样统一进入准备打印页，不再走 v3 配色页 */
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#queue-toggle').click(); document.querySelector('#queued-girl-task-one').click()` });
  await waitFor(cdp, `!document.querySelector('#prepare-state-screen').hidden`, 'Girl queue task did not open the prepare-print page.');
  const girlQueueRoute = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => ({ state: document.querySelector('#prepare-state-stage').dataset.state, disabled: document.querySelector('#prepare-state-start').disabled }))()`
  });
  assert(girlQueueRoute.result.value.state === 'printing' && girlQueueRoute.result.value.disabled, `Girl queue route has the wrong state: ${JSON.stringify(girlQueueRoute.result.value)}`);
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#prepare-state-back').click()` });
  await waitFor(cdp, `[...document.querySelectorAll('.reuse-screen')].every(screen => screen.hidden)`, 'Girl queue prepare back did not return to the printer.');

  /* 完成态：队列任务 → 已打印版准备打印页，开始打印可用且能真正起印 */
  await cdp.send('Page.navigate', { url: `${pageUrl}?status=completed&family=multi` });
  await delay(600);
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#queue-toggle').click(); document.querySelector('[data-queue-task][data-plate="2"]').click()` });
  await waitFor(cdp, `!document.querySelector('#prepare-state-screen').hidden`, 'Completed printer queue task did not open the prepare-print page.');
  const completedGirlQueue = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const artwork = document.querySelector('#prepare-state-artwork');
      const stamp = document.querySelector('#state-stamp');
      if (!artwork.complete) await new Promise(resolve => artwork.addEventListener('load', resolve, { once: true }));
      return {
        state: document.querySelector('#prepare-state-stage').dataset.state,
        artwork: decodeURI(artwork.currentSrc),
        stamp: decodeURI(stamp.currentSrc),
        stampTop: parseFloat(stamp.style.top),
        busyPatchHidden: document.querySelector('#printer-busy-patch').hidden,
        disabled: document.querySelector('#prepare-state-start').disabled,
        dim: !document.querySelector('#prepare-state-dim').hidden
      };
    })()`
  });
  const completedState = completedGirlQueue.result.value;
  assert(completedState.state === 'completed' && completedState.artwork.endsWith('assets/准备打印页-底图.png') && completedState.stamp.endsWith('assets/状态戳-已打印.png') && Math.abs(completedState.stampTop - 36.148) < 0.01 && completedState.busyPatchHidden && !completedState.disabled && !completedState.dim, `Completed printer queue page has the wrong state: ${JSON.stringify(completedState)}`);
  const girlActivePrintingScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(prepareStateCompletedPreviewPath, Buffer.from(girlActivePrintingScreenshot.data, 'base64'));
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#prepare-state-start').click()` });
  await waitFor(cdp, `document.querySelector('#task-panel')?.dataset.status === 'printing' && new URLSearchParams(location.search).get('plate') === '2'`, '开始打印 on the completed prepare page did not start printing the selected plate.');
  const completedBoyCreated = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => ({ plate: new URLSearchParams(location.search).get('plate'), status: document.querySelector('#task-panel').dataset.status, activeSrc: decodeURI(document.querySelector('#active-task-image').currentSrc), title: document.querySelector('#task-title').textContent }))()`
  });
  assert(completedBoyCreated.result.value.status === 'printing' && completedBoyCreated.result.value.activeSrc.endsWith('选择要打印的盘2（修改）.jpg') && completedBoyCreated.result.value.title === '史蒂夫_02_012209', `Starting from the completed prepare page did not promote the selected plate into the task panel: ${JSON.stringify(completedBoyCreated.result.value)}`);

  /* ---------- 下一盘：直接把队列里下一个顺位的任务拉进“准备中” ---------- */
  await cdp.send('Page.navigate', { url: `${pageUrl}?status=completed&completed=1&family=multi` });
  await delay(700);
  const nextPlateBefore = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => ({
      status: document.querySelector('#task-panel').dataset.status,
      nextHidden: document.querySelector('#next-plate').hidden,
      localFileHidden: document.querySelector('#local-file').hidden,
      queue: [...document.querySelectorAll('[data-queue-task]:not([hidden])')].map((task) => task.dataset.plate || task.dataset.task)
    }))()`
  });
  assert(nextPlateBefore.result.value.status === 'completed' && !nextPlateBefore.result.value.nextHidden && nextPlateBefore.result.value.localFileHidden, `The completed page did not expose 下一盘: ${JSON.stringify(nextPlateBefore.result.value)}`);
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#next-plate').click()` });
  await waitFor(cdp, `document.querySelector('#task-panel')?.dataset.status === 'preparing'`, '下一盘 did not start the next queued task in the 准备中 state.');
  const nextPlateStarted = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => ({
      path: decodeURI(location.pathname),
      search: location.search,
      panelStatus: document.querySelector('#task-panel').dataset.status,
      stateText: document.querySelector('#task-state').textContent,
      progressState: document.querySelector('#progress-state').textContent,
      preparationVisible: !document.querySelector('#preparation-progress').hidden,
      connection: document.querySelector('#printer-connection-state').dataset.connectionStatus,
      title: document.querySelector('#task-title').textContent,
      activeSrc: decodeURI(document.querySelector('#active-task-image').currentSrc),
      queue: [...document.querySelectorAll('[data-queue-task]:not([hidden])')].map((task) => task.dataset.plate || task.dataset.task)
    }))()`
  });
  const nextStarted = nextPlateStarted.result.value;
  assert(nextStarted.path.endsWith('dayinji/自研款打印机打印页面原型/index.html'), `下一盘 must stay inside the printer page: ${JSON.stringify(nextStarted)}`);
  assert(new URLSearchParams(nextStarted.search).get('plate') === '2' && new URLSearchParams(nextStarted.search).get('status') === 'preparing' && new URLSearchParams(nextStarted.search).get('completed') === '1', `下一盘 built the wrong deep link: ${JSON.stringify(nextStarted)}`);
  assert(nextStarted.panelStatus === 'preparing' && nextStarted.stateText === '准备中' && nextStarted.progressState === '准备打印' && nextStarted.preparationVisible, `下一盘 did not land on a live 准备中 state: ${JSON.stringify(nextStarted)}`);
  assert(nextStarted.connection === 'busy' && nextStarted.title === '史蒂夫_02_012209' && nextStarted.activeSrc.endsWith('选择要打印的盘2（修改）.jpg'), `下一盘 did not promote the next queued plate into the task panel: ${JSON.stringify(nextStarted)}`);
  assert(JSON.stringify(nextStarted.queue) === JSON.stringify(['3', 'girl-1', 'girl-2']), `下一盘 did not consume the promoted task from the queue: ${JSON.stringify(nextStarted)}`);

  await cdp.send('Page.navigate', { url: `${pageUrl}?status=completed&completed=1,2,3&family=multi` });
  await delay(700);
  const nextPlateGirl = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => ({ nextHidden: document.querySelector('#next-plate').hidden, queue: [...document.querySelectorAll('[data-queue-task]:not([hidden])')].map((task) => task.dataset.task) }))()`
  });
  assert(!nextPlateGirl.result.value.nextHidden && JSON.stringify(nextPlateGirl.result.value.queue) === JSON.stringify(['girl-1', 'girl-2']), `The girl-only queue is not reachable through 下一盘: ${JSON.stringify(nextPlateGirl.result.value)}`);
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#next-plate').click()` });
  await waitFor(cdp, `new URLSearchParams(location.search).get('activeTask') === 'girl-1' && document.querySelector('#task-panel')?.dataset.status === 'preparing'`, '下一盘 did not hand the girl task over to the 准备中 state.');
  const nextPlateGirlStarted = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => ({ search: location.search, title: document.querySelector('#task-title').textContent, stateText: document.querySelector('#task-state').textContent }))()`
  });
  assert(nextPlateGirlStarted.result.value.title === '女孩的打印任务 1' && nextPlateGirlStarted.result.value.stateText === '准备中', `下一盘 did not promote the girl task: ${JSON.stringify(nextPlateGirlStarted.result.value)}`);

  await cdp.send('Page.navigate', { url: `${pageUrl}?status=preparing` });
  await delay(500);

  const layout = await cdp.send('Page.getLayoutMetrics');
  const screenshot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: 375, height: Math.ceil(layout.cssContentSize.height), scale: 1 }
  });
  fs.writeFileSync(previewPath, Buffer.from(screenshot.data, 'base64'));

  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#finish-now').click()` });
  const completedActionsLayout = await cdp.send('Page.getLayoutMetrics');
  const completedActionsScreenshot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: 375, height: Math.ceil(completedActionsLayout.cssContentSize.height), scale: 1 }
  });
  fs.writeFileSync(completedActionsPreviewPath, Buffer.from(completedActionsScreenshot.data, 'base64'));
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#next-plate').click()` });
  await waitFor(cdp, `document.querySelector('#task-panel')?.dataset.status === 'preparing'`, '下一盘 from the completed actions did not enter 准备中.');
  const nextPlate = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => ({
      path: decodeURI(location.pathname),
      search: location.search,
      panelStatus: document.querySelector('#task-panel').dataset.status,
      stateText: document.querySelector('#task-state').textContent,
      progressState: document.querySelector('#progress-state').textContent,
      preparationVisible: !document.querySelector('#preparation-progress').hidden,
      title: document.querySelector('#task-title').textContent,
      queue: [...document.querySelectorAll('[data-queue-task]:not([hidden])')].map((task) => task.dataset.plate || task.dataset.task)
    }))()`
  });
  assert(nextPlate.result.value.path.endsWith('dayinji/自研款打印机打印页面原型/index.html'), `下一盘 must not leave the printer page: ${JSON.stringify(nextPlate.result.value)}`);
  assert(nextPlate.result.value.panelStatus === 'preparing' && nextPlate.result.value.stateText === '准备中' && nextPlate.result.value.progressState === '准备打印' && nextPlate.result.value.preparationVisible, `下一盘 did not enter a live 准备中 state: ${JSON.stringify(nextPlate.result.value)}`);
  assert(new URLSearchParams(nextPlate.result.value.search).get('completed') === '1' && JSON.stringify(nextPlate.result.value.queue) === JSON.stringify(['3']), `下一盘 lost the completed plate or the remaining queue: ${JSON.stringify(nextPlate.result.value)}`);
  const nextPlateScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(nextPlatePreviewPath, Buffer.from(nextPlateScreenshot.data, 'base64'));

  await cdp.send('Page.navigate', { url: `${pageUrl}?status=printing` });
  await waitFor(cdp, `typeof renderPlateTaskAndQueue === 'function' && Boolean(document.querySelector('#cancel-print'))`, 'Printer page did not become ready for cancellation testing.');
  const cancellation = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      document.querySelector('#cancel-print').click();
      document.querySelector('#action-dialog').close('cancel');
      await new Promise(resolve => setTimeout(resolve, 60));
      const transition = {
        overlayVisible: !document.querySelector('#transition-overlay').hidden,
        label: document.querySelector('#transition-label').textContent
      };
      await new Promise(resolve => setTimeout(resolve, 2200));
      return {
        transition,
        status: document.querySelector('#task-panel').dataset.status,
        label: document.querySelector('#task-state').textContent,
        taskCopyHidden: document.querySelector('.task-copy').hidden,
        actionsHidden: document.querySelector('#task-actions').hidden,
        queueToggleHidden: document.querySelector('#queue-toggle').hidden,
        queueHidden: document.querySelector('#print-queue').hidden,
        queueExpanded: document.querySelector('#queue-toggle').getAttribute('aria-expanded'),
        queueTasks: [...document.querySelectorAll('[data-queue-task]:not([hidden])')].map((task) => ({
          id: task.dataset.queueId,
          image: decodeURI(task.querySelector('.queue-task-artwork').currentSrc),
          label: task.querySelector('.queue-task-artwork').alt
        }))
      };
    })()`
  });
  assert(cancellation.result.value.transition.overlayVisible && cancellation.result.value.transition.label === '取消中...', `取消当前任务 must show the 取消中 transition: ${JSON.stringify(cancellation.result.value)}`);
  assert(cancellation.result.value.status === 'cancelled', `Cancel confirmation did not enter cancelled state: ${JSON.stringify(cancellation.result.value)}`);
  assert(cancellation.result.value.label === '已取消打印任务' && cancellation.result.value.taskCopyHidden && cancellation.result.value.actionsHidden, 'Cancelled state did not retain the required status label and simplified controls.');
  assert(!cancellation.result.value.queueToggleHidden && !cancellation.result.value.queueHidden && cancellation.result.value.queueExpanded === 'true', `Cancelled state did not automatically show the print queue: ${JSON.stringify(cancellation.result.value)}`);
  assert(cancellation.result.value.queueTasks.length === 2 && cancellation.result.value.queueTasks[0].id === 'plate-2' && cancellation.result.value.queueTasks[0].image.endsWith('打印队列2.jpg') && cancellation.result.value.queueTasks[0].label.includes('等待打印'), `取消当前任务 must keep the waiting queue untouched: ${JSON.stringify(cancellation.result.value)}`);

  await cdp.send('Page.navigate', { url: `${pageUrl}?status=printing&family=multi` });
  await waitFor(cdp, `typeof renderPlateTaskAndQueue === 'function' && Boolean(document.querySelector('#cancel-print'))`, 'Multi-account printer page did not become ready for cancel-all testing.');
  const cancelAll = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const before = [...document.querySelectorAll('[data-queue-task]:not([hidden])')].map((task) => task.dataset.queueId);
      document.querySelector('#cancel-print').click();
      document.querySelector('#dialog-confirm').click();
      await new Promise(resolve => setTimeout(resolve, 60));
      const transition = {
        overlayVisible: !document.querySelector('#transition-overlay').hidden,
        label: document.querySelector('#transition-label').textContent
      };
      await new Promise(resolve => setTimeout(resolve, 2200));
      return {
        before,
        transition,
        status: document.querySelector('#task-panel').dataset.status,
        label: document.querySelector('#task-state').textContent,
        taskCopyHidden: document.querySelector('.task-copy').hidden,
        actionsHidden: document.querySelector('#task-actions').hidden,
        queueToggleHidden: document.querySelector('#queue-toggle').hidden,
        queueHidden: document.querySelector('#print-queue').hidden,
        queueExpanded: document.querySelector('#queue-toggle').getAttribute('aria-expanded'),
        queueCount: document.querySelector('#queue-toggle small').textContent,
        connectionStatus: document.querySelector('#printer-connection-state').dataset.connectionStatus,
        connectionLabel: document.querySelector('#printer-connection-state-label').textContent,
        queueTasks: [...document.querySelectorAll('[data-queue-task]:not([hidden])')].map((task) => ({ id: task.dataset.queueId, owner: task.dataset.owner }))
      };
    })()`
  });
  assert(cancelAll.result.value.before.join(',') === 'plate-2,plate-3,girl-1,girl-2', `Multi-account queue is incorrect before cancelling: ${JSON.stringify(cancelAll.result.value)}`);
  assert(cancelAll.result.value.transition.overlayVisible && cancelAll.result.value.transition.label === '取消中...', `取消全部任务 must show the 取消中 transition: ${JSON.stringify(cancelAll.result.value)}`);
  assert(cancelAll.result.value.status === 'cancelled-all' && cancelAll.result.value.label === '已取消打印任务', `取消全部任务 did not enter the printer-level cancelled state: ${JSON.stringify(cancelAll.result.value)}`);
  assert(cancelAll.result.value.taskCopyHidden && cancelAll.result.value.actionsHidden, '取消全部任务 did not keep the simplified cancelled controls.');
  assert(!cancelAll.result.value.queueToggleHidden && !cancelAll.result.value.queueHidden && cancelAll.result.value.queueExpanded === 'true', `取消全部任务 did not automatically show the remaining print queue: ${JSON.stringify(cancelAll.result.value)}`);
  assert(cancelAll.result.value.queueTasks.length === 2 && cancelAll.result.value.queueTasks.every((task) => task.owner === 'girl') && cancelAll.result.value.queueTasks[0].id === 'girl-1', `取消全部任务 did not drop every queued task of the same owner: ${JSON.stringify(cancelAll.result.value)}`);
  assert(cancelAll.result.value.queueCount === '2 个待打印任务', `Queue counter was not refreshed after 取消全部任务: ${JSON.stringify(cancelAll.result.value)}`);
  assert(cancelAll.result.value.connectionStatus === 'idle' && cancelAll.result.value.connectionLabel === '空闲', '取消全部任务 did not restore the idle connection indicator.');
  const cancelAllScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(cancelAllPreviewPath, Buffer.from(cancelAllScreenshot.data, 'base64'));

  await cdp.send('Page.navigate', { url: `${pageUrl}?status=printing&family=multi&activeTask=girl-1` });
  await waitFor(cdp, `typeof renderPlateTaskAndQueue === 'function' && Boolean(document.querySelector('#cancel-print'))`, 'Girl-active printer page did not become ready for cancel-all testing.');
  const cancelAllGirl = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      document.querySelector('#cancel-print').click();
      document.querySelector('#dialog-confirm').click();
      await new Promise(resolve => setTimeout(resolve, 2300));
      return {
        label: document.querySelector('#task-state').textContent,
        queueTasks: [...document.querySelectorAll('[data-queue-task]:not([hidden])')].map((task) => task.dataset.queueId)
      };
    })()`
  });
  assert(cancelAllGirl.result.value.label === '已取消打印任务' && cancelAllGirl.result.value.queueTasks.join(',') === 'plate-1,plate-2,plate-3', `取消全部任务 must only drop tasks of the cancelled submission: ${JSON.stringify(cancelAllGirl.result.value)}`);

  await cdp.send('Page.navigate', { url: `${pageUrl}?plate=3&completed=1%2C2&status=printing` });
  await delay(500);
  const singlePlateCompletion = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      document.querySelector('#finish-now').click();
      const localImage = document.querySelector('#local-file img');
      return {
        nextPlateHidden: document.querySelector('#next-plate').hidden,
        localFileVisible: !document.querySelector('#local-file').hidden,
        localFileLoaded: localImage.complete && localImage.naturalWidth > 0,
        queueHidden: document.querySelector('#queue-toggle').hidden
      };
    })()`
  });
  assert(singlePlateCompletion.result.value.nextPlateHidden, 'Next plate should be hidden when the queue is empty.');
  assert(singlePlateCompletion.result.value.localFileVisible && singlePlateCompletion.result.value.localFileLoaded, 'All-completed state did not replace next plate with the local-file image button.');
  assert(singlePlateCompletion.result.value.queueHidden, 'All-completed state did not hide the empty queue.');

  await cdp.send('Page.reload');
  await delay(350);

  /* ---------- 单盘模型（?plates=single）：无队列 + 单盘取消弹窗（暂不/取消任务）+ 重新打印进准备中 ---------- */
  await cdp.send('Page.navigate', { url: `${pageUrl}?plates=single&status=printing` });
  await delay(700);
  const singlePlatePrinting = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      document.querySelector('#cancel-print').click();
      const dialog = document.querySelector('#action-dialog');
      return {
        queueToggleHidden: document.querySelector('#queue-toggle').hidden,
        queueCount: document.querySelectorAll('[data-queue-task]:not([hidden])').length,
        dialogOpen: dialog.open,
        title: document.querySelector('#dialog-title').textContent,
        dismiss: document.querySelector('#dialog-dismiss').textContent,
        confirm: document.querySelector('#dialog-confirm').textContent
      };
    })()`
  });
  assert(!singlePlatePrinting.result.value.queueToggleHidden && singlePlatePrinting.result.value.queueCount === 0, `单盘模型应显示空队列: ${JSON.stringify(singlePlatePrinting.result.value)}`);
  assert(singlePlatePrinting.result.value.dialogOpen && singlePlatePrinting.result.value.title === '是否要取消任务' && singlePlatePrinting.result.value.dismiss === '暂不' && singlePlatePrinting.result.value.confirm === '取消任务', `单盘取消弹窗应为「暂不 / 取消任务」: ${JSON.stringify(singlePlatePrinting.result.value)}`);
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#dialog-dismiss').click()` });
  await delay(120);
  const singleCancelDismissed = await cdp.send('Runtime.evaluate', { returnByValue: true, expression: `({ status: document.querySelector('#task-panel').dataset.status, dialogOpen: document.querySelector('#action-dialog').open })` });
  assert(!singleCancelDismissed.result.value.dialogOpen && singleCancelDismissed.result.value.status === 'printing', `暂不应保持打印中: ${JSON.stringify(singleCancelDismissed.result.value)}`);
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#cancel-print').click(); document.querySelector('#dialog-confirm').click()` });
  await waitFor(cdp, `document.querySelector('#task-panel').dataset.status === 'cancelled-all'`, '单盘取消任务未落地到已取消');

  await cdp.send('Page.navigate', { url: `${pageUrl}?plates=single&status=completed` });
  await delay(700);
  const singleCompleted = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const nextHidden = document.querySelector('#next-plate').hidden;
      const restartVisible = !document.querySelector('#restart-print').hidden;
      document.querySelector('#restart-print').click();
      return {
        nextHidden,
        restartVisible,
        status: document.querySelector('#task-panel').dataset.status,
        stage: document.querySelector('#preparation-label').textContent,
        percentHidden: document.querySelector('#preparation-percent').hidden,
        countdownHidden: document.querySelector('#remaining-time').hidden
      };
    })()`
  });
  assert(singleCompleted.result.value.nextHidden && singleCompleted.result.value.restartVisible, `单盘打印完成态只应保留重新打印: ${JSON.stringify(singleCompleted.result.value)}`);
  assert(singleCompleted.result.value.status === 'preparing' && singleCompleted.result.value.stage === '升温中' && singleCompleted.result.value.percentHidden && singleCompleted.result.value.countdownHidden, `单盘重新打印应进入只承接喷嘴升温的准备中: ${JSON.stringify(singleCompleted.result.value)}`);
  await cdp.send('Runtime.evaluate', { expression: `for (let index = 0; index < 30; index += 1) advancePreparation(); 'ok'` });
  const singleReprint = await cdp.send('Runtime.evaluate', { returnByValue: true, expression: `({ status: document.querySelector('#task-panel').dataset.status, time: document.querySelector('#remaining-time').textContent })` });
  assert(singleReprint.result.value.status === 'printing' && singleReprint.result.value.time === '05:15:00', `单盘重新打印准备后应回到打印中并重置倒计时: ${JSON.stringify(singleReprint.result.value)}`);

  /* ---------- 进料中 / 退料中：真实页面 + 时间轴状态机（R005 起替代「整图复用」） ---------- */
  const feeding = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const fo = window.__filamentOperation;
      /* 演示用压缩时长；需求侧默认时长见 prototype.js 的 foConfig（加热 10s / 每步 5s / 6s 出提示） */
      fo.durations({ heat: 3000, move: 900, tipAt: 500, tipHide: 2500 });
      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const until = async (test, timeout = 8000) => {
        const started = Date.now();
        while (Date.now() - started < timeout) {
          if (test()) return true;
          await wait(40);
        }
        return false;
      };
      const rect = (selector) => { const r = document.querySelector(selector).getBoundingClientRect(); return { top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom, right: r.right }; };
      const read = () => ({
        title: document.querySelector('#filament-operation-title').textContent,
        stepLabel: document.querySelector('#filament-operation-label').textContent,
        stepStates: [...document.querySelectorAll('.fo-step')].map(node => node.dataset.state),
        percent: document.querySelector('#filament-operation-percent').textContent,
        percentHidden: document.querySelector('#filament-operation-percent').classList.contains('is-hidden'),
        heating: document.querySelector('#filament-operation-ring').classList.contains('is-heating'),
        tempVisible: !document.querySelector('#filament-operation-temp').hidden,
        artHidden: document.querySelector('#filament-operation-art').hidden,
        art: fo.artSrc().split('/').pop(),
        degree: Number(document.querySelector('#filament-operation-degree').textContent),
        banner: document.querySelector('#filament-operation-banner').textContent,
        bannerTone: document.querySelector('#filament-operation-banner').dataset.tone,
        primary: document.querySelector('#filament-operation-primary').textContent
      });

      document.querySelector('#filament-spool').click();
      document.querySelector('#load-filament').click();
      await wait(150);

      const arcStyle = getComputedStyle(document.querySelector('#filament-operation-arc'));
      const initial = {
        ...read(),
        visible: !document.querySelector('#filament-operation-screen').hidden,
        hint: document.querySelector('#filament-operation-hint').textContent,
        backLabel: document.querySelector('#filament-operation-back').getAttribute('aria-label'),
        stepLabels: fo.nodeLabels(),
        arcDashoffset: arcStyle.strokeDashoffset,
        arcStroke: arcStyle.stroke,
        trackStroke: getComputedStyle(document.querySelector('.fo-ring-track')).stroke,
        deviceInert: document.querySelector('#device-page').inert,
        panelStatus: document.querySelector('#filament-status').textContent,
        panelStatusHidden: document.querySelector('#filament-status').hidden,
        loadLabel: document.querySelector('#load-filament').textContent,
        loadDisabled: document.querySelector('#load-filament').disabled,
        unloadDisabled: document.querySelector('#unload-filament').disabled,
        legacyArtworkGone: !document.querySelector('#filament-operation-image') && !document.querySelector('#close-filament-operation') && !document.querySelector('#cancel-filament-operation'),
        frame: rect('#filament-operation-screen'),
        back: rect('#filament-operation-back'),
        hintRect: rect('#filament-operation-hint'),
        ring: rect('#filament-operation-ring'),
        stepLabelRect: rect('#filament-operation-label'),
        bannerRect: rect('#filament-operation-banner'),
        primaryRect: rect('#filament-operation-primary'),
        viewport: { width: innerWidth, height: innerHeight }
      };

      await until(() => !document.querySelector('#filament-operation-tip').hidden, 3000);
      const tipShown = {
        visible: !document.querySelector('#filament-operation-tip').hidden,
        text: document.querySelector('#filament-operation-tip').textContent,
        rect: rect('#filament-operation-tip')
      };
      return { initial, tipShown };
    })()`
  });
  const feedingRun = feeding.result.value;
  const initialView = feedingRun.initial;
  assert(initialView.visible && initialView.title === '进料中', 'Clicking 进料 must open the real 进料中 page.');
  assert(initialView.legacyArtworkGone, 'The old merged-artwork feeding page markup must be gone.');
  assert(initialView.deviceInert, 'Printing prototype must be inert while feeding is active.');
  assert(initialView.hint === '可退出页面，进料将继续进行' && initialView.backLabel.indexOf('进料将继续进行') !== -1, `Feeding page copy is wrong: ${JSON.stringify(initialView)}`);
  assert(initialView.stepLabel === '加热喷嘴温度' && initialView.stepStates.join(',') === 'active,todo,todo', `Feeding must start at 加热喷嘴温度: ${JSON.stringify(initialView.stepStates)}`);
  assert(initialView.stepLabels.join(',') === '加热喷嘴温度,抽回当前耗材,送出新耗材', `Feeding step bar labels are wrong: ${JSON.stringify(initialView.stepLabels)}`);
  assert(initialView.heating && initialView.tempVisible && initialView.artHidden, 'The heating step must show the temperature block instead of the illustration.');
  assert(initialView.percentHidden, 'The percentage label must be reserved but hidden during heating.');
  assert(initialView.degree >= 28 && initialView.degree < 200, `Temperature should climb from 28°C: ${initialView.degree}`);
  assert(initialView.banner === '喷头温度高，请勿触碰' && initialView.bannerTone === 'warn', `Feeding step 1 banner is wrong: ${initialView.banner}`);
  assert(initialView.primary === '取消', 'The running page must offer 取消.');
  assert(initialView.arcStroke === 'rgb(235, 93, 17)' && initialView.trackStroke === 'rgb(246, 212, 196)', `Ring colours must match the design artwork: ${initialView.arcStroke} / ${initialView.trackStroke}`);
  assert(initialView.arcDashoffset === '-0px' || initialView.arcDashoffset === '0px', `Heating must fill the whole ring: ${initialView.arcDashoffset}`);
  assert(initialView.panelStatus === '进料中' && !initialView.panelStatusHidden, `Filament panel did not switch to the 进料中 state: ${JSON.stringify(initialView)}`);
  assert(initialView.loadLabel === '进料中...' && !initialView.loadDisabled, `The busy load button must stay clickable so users can reopen the progress page: ${JSON.stringify(initialView)}`);
  assert(!initialView.unloadDisabled === false, 'Unload must stay disabled while feeding.');
  /* 版式：设计稿量得的逻辑坐标为 圆环 220、圆环顶边 281、提示胶囊顶边 172.7、步骤胶囊 511、提示条整宽 74、主按钮 179×59 */
  assert(Math.abs(initialView.ring.width - 220) < 1 && Math.abs(initialView.ring.height - 220) < 1, `Ring must be 220×220: ${JSON.stringify(initialView.ring)}`);
  assert(Math.abs(initialView.ring.top - (initialView.frame.top + 281)) < 2, `Ring top must sit at 281 inside the frame: ${JSON.stringify(initialView.ring)}`);
  assert(Math.abs(initialView.hintRect.top - (initialView.frame.top + 172.7)) < 2, `Hint pill top must be 172.7: ${JSON.stringify(initialView.hintRect)}`);
  assert(Math.abs(initialView.stepLabelRect.top - (initialView.frame.top + 511)) < 2, `Step pill top must be 511: ${JSON.stringify(initialView.stepLabelRect)}`);
  assert(Math.abs(initialView.bannerRect.width - initialView.frame.width) < 1 && Math.abs(initialView.bannerRect.height - 74) < 1, `Bottom banner must be full width and 74 tall: ${JSON.stringify(initialView.bannerRect)}`);
  assert(Math.abs(initialView.primaryRect.width - 179) < 1 && Math.abs(initialView.primaryRect.height - 59) < 1, `Primary button must be 179×59: ${JSON.stringify(initialView.primaryRect)}`);
  assert(Math.abs(initialView.primaryRect.bottom - initialView.frame.bottom) < 16, 'Primary button must be anchored to the bottom of the frame.');
  assert(initialView.back.width >= 44 && initialView.back.height >= 44, 'The 回退 control must stay at least 44×44.');
  /* 加热耗时提示：需求要求进入页面 5~10s 内出现（这里把 tipAt 压到 500ms 验证时序与位置） */
  assert(feedingRun.tipShown.visible && feedingRun.tipShown.text === '加热时间较长，请耐心等待', `The long-heat tip must appear while heating: ${JSON.stringify(feedingRun.tipShown)}`);
  assert(Math.abs(feedingRun.tipShown.rect.width - 238) < 1 && feedingRun.tipShown.rect.bottom <= initialView.ring.bottom + 1, `The heat tip must sit inside the lower part of the ring: ${JSON.stringify(feedingRun.tipShown.rect)}`);
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#toast').classList.remove('is-visible')` });
  await delay(120);
  const feedingRunningShot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(feedingPreviewPath, Buffer.from(feedingRunningShot.data, 'base64'));

  const feedingSteps = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const until = async (test, timeout = 9000) => {
        const started = Date.now();
        while (Date.now() - started < timeout) { if (test()) return true; await wait(40); }
        return false;
      };
      const read = () => ({
        stepLabel: document.querySelector('#filament-operation-label').textContent,
        stepStates: [...document.querySelectorAll('.fo-step')].map(node => node.dataset.state),
        percent: document.querySelector('#filament-operation-percent').textContent,
        percentHidden: document.querySelector('#filament-operation-percent').classList.contains('is-hidden'),
        heating: document.querySelector('#filament-operation-ring').classList.contains('is-heating'),
        tempVisible: !document.querySelector('#filament-operation-temp').hidden,
        art: window.__filamentOperation.artSrc().split('/').pop(),
        banner: document.querySelector('#filament-operation-banner').textContent,
        bannerTone: document.querySelector('#filament-operation-banner').dataset.tone,
        primary: document.querySelector('#filament-operation-primary').textContent
      });
      await until(() => document.querySelector('#filament-operation-tip').hidden, 6000);
      const tipHidden = document.querySelector('#filament-operation-tip').hidden;
      /* 三段推进：抽回当前耗材 → 送出新耗材 → 完成 */
      await until(() => document.querySelector('#filament-operation-label').textContent === '抽回当前耗材');
      const pull = read();
      await until(() => document.querySelector('#filament-operation-label').textContent === '送出新耗材');
      const push = read();
      await until(() => document.querySelector('#filament-operation-primary').textContent === '完成');
      const done = read();
      return { tipHidden, pull, push, done };
    })()`
  });
  const feedingStepRun = feedingSteps.result.value;
  assert(feedingStepRun.tipHidden, 'The heat tip must hide again on its own.');
  assert(feedingStepRun.pull.stepLabel === '抽回当前耗材' && feedingStepRun.pull.stepStates.join(',') === 'done,active,todo', `Step 2 must be 抽回当前耗材: ${JSON.stringify(feedingStepRun.pull)}`);
  assert(!feedingStepRun.pull.heating && !feedingStepRun.pull.tempVisible && feedingStepRun.pull.art === '耗材操作-进料-抽回当前耗材.png', `Step 2 must swap in the 抽回当前耗材 illustration: ${JSON.stringify(feedingStepRun.pull)}`);
  assert(feedingStepRun.pull.banner === '喷头温度高，请勿触碰' && feedingStepRun.pull.bannerTone === 'warn', `Step 2 banner is wrong: ${JSON.stringify(feedingStepRun.pull)}`);
  assert(!feedingStepRun.pull.percentHidden && /%$/.test(feedingStepRun.pull.percent), `Progress percentage must track the ring: ${feedingStepRun.pull.percent}`);
  assert(feedingStepRun.push.stepLabel === '送出新耗材' && feedingStepRun.push.stepStates.join(',') === 'done,done,active', `Step 3 must be 送出新耗材: ${JSON.stringify(feedingStepRun.push)}`);
  assert(feedingStepRun.push.art === '耗材操作-进料-送出新耗材.png' && !feedingStepRun.push.tempVisible, `Step 3 illustration is wrong: ${JSON.stringify(feedingStepRun.push)}`);
  assert(feedingStepRun.push.banner === '观察是否有耗材丝送出，如果有则进料完成' && feedingStepRun.push.bannerTone === 'info', `Step 3 banner must switch to the blue hint: ${JSON.stringify(feedingStepRun.push)}`);
  assert(feedingStepRun.done.percent === '100%' && feedingStepRun.done.primary === '完成' && feedingStepRun.done.bannerTone === 'info', `Completion state is wrong: ${JSON.stringify(feedingStepRun.done)}`);
  assert(feedingStepRun.done.stepLabel === '送出新耗材' && feedingStepRun.done.stepStates.join(',') === 'done,done,active', `Completion state must keep the last step highlighted: ${JSON.stringify(feedingStepRun.done)}`);

  /* 完成后点「完成」→ 回到打印页 */
  const feedingDoneShot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(feedingDonePreviewPath, Buffer.from(feedingDoneShot.data, 'base64'));

  const feedingFinish = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      document.querySelector('#filament-operation-primary').click();
      await new Promise(resolve => setTimeout(resolve, 160));
      const load = document.querySelector('#load-filament');
      const unload = document.querySelector('#unload-filament');
      return {
        hidden: document.querySelector('#filament-operation-screen').hidden,
        deviceInteractive: !document.querySelector('#device-page').inert,
        panelStatus: document.querySelector('#filament-status').textContent,
        loadLabel: load.textContent,
        loadDisabled: load.disabled,
        loadActive: load.classList.contains('is-active'),
        unloadLabel: unload.textContent,
        unloadDisabled: unload.disabled,
        unloadActive: unload.classList.contains('is-active'),
        ringVisible: !document.querySelector('#filament-selection-ring').hidden
      };
    })()`
  });
  assert(feedingFinish.result.value.hidden && feedingFinish.result.value.deviceInteractive, 'The 完成 button must return to the printer page.');
  assert(feedingFinish.result.value.panelStatus === '进料完成', `Filament panel must settle to 进料完成: ${JSON.stringify(feedingFinish.result.value)}`);
  assert(feedingFinish.result.value.loadLabel === '进料' && feedingFinish.result.value.loadDisabled && !feedingFinish.result.value.loadActive, 'Load button did not fade back to its semi-transparent state after feeding.');
  assert(!feedingFinish.result.value.unloadDisabled && feedingFinish.result.value.unloadActive, 'Unload button did not become fully opaque and clickable after feeding.');
  assert(feedingFinish.result.value.ringVisible, 'Spool selection ring should stay visible after feeding finished.');

  /* 回退不中断进程：退料中回退 → 面板保持「退料中」→ 后台跑完自动落「退料完成」 */
  const retracting = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const until = async (test, timeout = 8000) => {
        const started = Date.now();
        while (Date.now() - started < timeout) { if (test()) return true; await wait(40); }
        return false;
      };
      window.__filamentOperation.durations({ heat: 1200, move: 700, tipAt: 100000 });
      document.querySelector('#unload-filament').click();
      await wait(150);
      const opened = {
        title: document.querySelector('#filament-operation-title').textContent,
        hint: document.querySelector('#filament-operation-hint').textContent,
        stepLabels: window.__filamentOperation.nodeLabels(),
        stepLabel: document.querySelector('#filament-operation-label').textContent,
        stepStates: [...document.querySelectorAll('.fo-step')].map(node => node.dataset.state),
        tempVisible: !document.querySelector('#filament-operation-temp').hidden,
        panelStatus: document.querySelector('#filament-status').textContent
      };
      return { opened };
    })()`
  });
  const retractOpenRun = retracting.result.value;
  assert(retractOpenRun.opened.title === '退料中' && retractOpenRun.opened.hint === '可退出页面，退料将继续进行', `Retracting page copy is wrong: ${JSON.stringify(retractOpenRun.opened)}`);
  assert(retractOpenRun.opened.stepLabels.join(',') === '加热喷嘴温度,退出当前耗材,退料完成', `Retracting step bar must end with 退料完成: ${JSON.stringify(retractOpenRun.opened.stepLabels)}`);
  assert(retractOpenRun.opened.stepLabel === '加热喷嘴温度' && retractOpenRun.opened.stepStates.join(',') === 'active,todo,todo' && retractOpenRun.opened.tempVisible, `Retracting must start with 加热喷嘴温度: ${JSON.stringify(retractOpenRun.opened)}`);
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#toast').classList.remove('is-visible')` });
  await delay(120);
  const retractingShot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(retractingPreviewPath, Buffer.from(retractingShot.data, 'base64'));

  const retractBack = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const until = async (test, timeout = 9000) => {
        const started = Date.now();
        while (Date.now() - started < timeout) { if (test()) return true; await wait(40); }
        return false;
      };
      document.querySelector('#filament-operation-back').click();
      await wait(180);
      const afterBack = {
        hidden: document.querySelector('#filament-operation-screen').hidden,
        deviceInteractive: !document.querySelector('#device-page').inert,
        panelStatus: document.querySelector('#filament-status').textContent,
        unloadLabel: document.querySelector('#unload-filament').textContent,
        unloadDisabled: document.querySelector('#unload-filament').disabled,
        running: window.__filamentOperation.state.running
      };
      /* 回退后重新点面板按钮：必须回到进度页而不是重开进程 */
      document.querySelector('#unload-filament').click();
      await wait(150);
      const reopened = {
        visible: !document.querySelector('#filament-operation-screen').hidden,
        title: document.querySelector('#filament-operation-title').textContent,
        stepLabel: document.querySelector('#filament-operation-label').textContent
      };
      await until(() => document.querySelector('#filament-operation-primary').textContent === '完成');
      document.querySelector('#filament-operation-primary').click();
      await wait(200);
      const settled = {
        hidden: document.querySelector('#filament-operation-screen').hidden,
        panelStatus: document.querySelector('#filament-status').textContent,
        loadActive: document.querySelector('#load-filament').classList.contains('is-active'),
        loadDisabled: document.querySelector('#load-filament').disabled,
        unloadLabel: document.querySelector('#unload-filament').textContent,
        unloadDisabled: document.querySelector('#unload-filament').disabled,
        running: window.__filamentOperation.state.running
      };
      return { afterBack, reopened, settled };
    })()`
  });
  const retractBackRun = retractBack.result.value;
  const retractRun = { opened: retractOpenRun.opened, ...retractBackRun };
  assert(retractRun.afterBack.hidden && retractRun.afterBack.deviceInteractive, 'The 回退 control must return to the printer page.');
  assert(retractRun.afterBack.running, 'The 回退 control must NOT interrupt the retracting process.');
  assert(retractRun.afterBack.panelStatus === '退料中' && retractRun.afterBack.unloadLabel === '退料中...', `Returning from the retracting page must keep 退料中 running: ${JSON.stringify(retractRun.afterBack)}`);
  assert(retractRun.afterBack.unloadDisabled === false, 'While retracting, the unload button must stay clickable so users can reopen the progress page.');
  assert(retractRun.reopened.visible && retractRun.reopened.title === '退料中', `The busy panel button must reopen the running progress page: ${JSON.stringify(retractRun.reopened)}`);
  assert(retractRun.settled.panelStatus === '退料完成' && retractRun.settled.unloadDisabled, `Retracting must settle to 退料完成: ${JSON.stringify(retractRun.settled)}`);
  assert(!retractRun.settled.loadDisabled && retractRun.settled.loadActive, `Load button should become available again after 退料完成: ${JSON.stringify(retractRun.settled)}`);
  /* 点「取消」二次确认 → 中止并还原面板到发起前的状态 */
  const cancelRun = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      window.__filamentOperation.durations({ heat: 6000, move: 6000, tipAt: 100000 });
      document.querySelector('#load-filament').click();
      await wait(220);
      const running = { title: document.querySelector('#filament-operation-title').textContent, primary: document.querySelector('#filament-operation-primary').textContent };
      document.querySelector('#filament-operation-primary').click();
      await wait(160);
      const dialog = {
        open: document.querySelector('#filament-cancel-dialog').open,
        title: document.querySelector('#filament-cancel-title').textContent,
        copy: document.querySelector('#filament-cancel-copy').textContent,
        confirm: document.querySelector('#filament-cancel-confirm').textContent,
        dismiss: document.querySelector('#filament-cancel-dismiss').textContent
      };
      document.querySelector('#filament-cancel-dismiss').click();
      await wait(160);
      const afterDismiss = { open: document.querySelector('#filament-cancel-dialog').open, running: window.__filamentOperation.state.running, visible: !document.querySelector('#filament-operation-screen').hidden };
      document.querySelector('#filament-operation-primary').click();
      await wait(160);
      document.querySelector('#filament-cancel-confirm').click();
      await wait(220);
      const afterConfirm = {
        open: document.querySelector('#filament-cancel-dialog').open,
        hidden: document.querySelector('#filament-operation-screen').hidden,
        deviceInteractive: !document.querySelector('#device-page').inert,
        panelStatus: document.querySelector('#filament-status').textContent,
        running: window.__filamentOperation.state.running,
        loadDisabled: document.querySelector('#load-filament').disabled
      };
      return { running, dialog, afterDismiss, afterConfirm };
    })()`
  });
  const cancelView = cancelRun.result.value;
  assert(cancelView.running.primary === '取消', 'A running operation must offer 取消.');
  assert(cancelView.dialog.open && cancelView.dialog.title === '取消进料？', `取消 must ask for confirmation: ${JSON.stringify(cancelView.dialog)}`);
  assert(cancelView.dialog.copy === '取消后将停止当前进料流程。喷嘴可能仍处于高温状态，请注意安全。' && cancelView.dialog.confirm === '取消进料' && cancelView.dialog.dismiss === '继续进料', `Cancel dialog copy is wrong: ${JSON.stringify(cancelView.dialog)}`);
  assert(!cancelView.afterDismiss.open && cancelView.afterDismiss.running && cancelView.afterDismiss.visible, '继续进料 must resume the process without leaving the page.');
  assert(!cancelView.afterConfirm.open && cancelView.afterConfirm.hidden && cancelView.afterConfirm.deviceInteractive, 'Confirming 取消进料 must abort and return to the printer page.');
  assert(cancelView.afterConfirm.panelStatus === '退料完成' && !cancelView.afterConfirm.running, `Aborting a feed must restore the panel state from before that feed: ${JSON.stringify(cancelView.afterConfirm)}`);
  assert(!cancelView.afterConfirm.loadDisabled, 'After aborting, 进料 must be available again.');

  // ---------- 摄像头观看时长 / 延时摄影 / 设备设置 / 风扇滤芯 ----------
  const cameraLimit = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const pill = document.querySelector('#timelapse-action');
      document.querySelector('#camera-view-limit').click();
      const stateAfterClick = document.querySelector('#timelapse-placeholder').dataset.cameraState;
      await new Promise(resolve => setTimeout(resolve, 7600));
      const container = document.querySelector('#timelapse-placeholder').getBoundingClientRect();
      const pillRect = pill.getBoundingClientRect();
      return {
        stateAfterClick,
        state: document.querySelector('#timelapse-placeholder').dataset.cameraState,
        src: decodeURI(document.querySelector('#camera-monitor-image').currentSrc),
        loaded: document.querySelector('#camera-monitor-image').complete && document.querySelector('#camera-monitor-image').naturalWidth > 0,
        limitButtonVisible: document.querySelector('#camera-view-limit').getBoundingClientRect().width > 44,
        pillBackground: getComputedStyle(pill).backgroundColor,
        pillChildrenHidden: getComputedStyle(pill.querySelector('svg')).visibility === 'hidden',
        pillRect: { left: (pillRect.left - container.left) / container.width, top: (pillRect.top - container.top) / container.height, right: (pillRect.right - container.left) / container.width, bottom: (pillRect.bottom - container.top) / container.height }
      };
    })()`
  });
  assert(cameraLimit.result.value.stateAfterClick === 'on' && cameraLimit.result.value.state === 'limit', `Camera viewing limit did not engage after 7 seconds: ${JSON.stringify(cameraLimit.result.value)}`);
  assert(cameraLimit.result.value.loaded && cameraLimit.result.value.src.endsWith('原型修改复用图片资源/达到观看时长后自动关闭摄像头.png'), `Camera viewing-limit artwork did not load: ${JSON.stringify(cameraLimit.result.value)}`);
  assert(cameraLimit.result.value.pillBackground === 'rgba(0, 0, 0, 0)' && cameraLimit.result.value.pillChildrenHidden, `The baked 延时摄影 label must not be doubled by the DOM pill: ${JSON.stringify(cameraLimit.result.value)}`);
  assert(cameraLimit.result.value.pillRect.left > 0.6 && cameraLimit.result.value.pillRect.left < 0.63 && cameraLimit.result.value.pillRect.top > 0.04 && cameraLimit.result.value.pillRect.top < 0.07 && cameraLimit.result.value.pillRect.right > 0.95, `Camera 延时摄影 hotspot does not cover the baked label: ${JSON.stringify(cameraLimit.result.value.pillRect)}`);
  const cameraLimitScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(cameraLimitPreviewPath, Buffer.from(cameraLimitScreenshot.data, 'base64'));

  const reuseScreens = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const open = (name) => !document.querySelector(name).hidden;
      const result = {};

      // 摄像头右上角延时摄影标签 → 延时摄影页
      document.querySelector('#timelapse-action').click();
      await wait(80);
      result.fromCamera = { open: open('#timelapse-screen'), count: document.querySelectorAll('.timelapse-item:not([hidden])').length };
      document.querySelector('#timelapse-screen-back').click();
      await wait(80);
      result.cameraBackToPrinter = !document.querySelector('#device-page').inert && !open('#timelapse-screen');

      // 设备设置 → 打印选项 / 延时摄影 → 删除演示
      document.querySelector('#printer-settings').click();
      await wait(80);
      result.deviceSettings = { open: open('#device-settings-screen'), src: decodeURI(document.querySelector('#device-settings-screen img').currentSrc) };
      document.querySelector('#open-print-options').click();
      await wait(80);
      result.printOptions = { open: open('#print-options-screen'), src: decodeURI(document.querySelector('#print-options-screen img').currentSrc) };
      document.querySelector('#print-options-back').click();
      await wait(80);
      result.printOptionsBack = open('#device-settings-screen');
      document.querySelector('#open-timelapse-settings').click();
      await wait(80);
      result.timelapse = { open: open('#timelapse-screen'), count: document.querySelectorAll('.timelapse-item:not([hidden])').length };
      /* 顶栏删除 → 多选态 → 勾两个 → 删除 → 只剩一个；再取消回到打印页 */
      document.querySelector('#open-timelapse-delete').click();
      await wait(80);
      result.timelapsePicking = {
        pressed: document.querySelector('#open-timelapse-delete').getAttribute('aria-pressed'),
        barVisible: !document.querySelector('#timelapse-delete-bar').hidden,
        confirmDisabled: document.querySelector('#timelapse-delete-confirm').disabled,
        confirmLabel: document.querySelector('#timelapse-delete-confirm').textContent
      };
      document.querySelectorAll('.timelapse-card')[0].click();
      document.querySelectorAll('.timelapse-card')[2].click();
      await wait(80);
      result.timelapsePicked = {
        label: document.querySelector('#timelapse-delete-confirm').textContent,
        disabled: document.querySelector('#timelapse-delete-confirm').disabled,
        picked: document.querySelectorAll('.timelapse-item.is-picked').length
      };
      document.querySelector('#timelapse-delete-confirm').click();
      await wait(120);
      result.timelapseDeleted = {
        remaining: [...document.querySelectorAll('.timelapse-item:not([hidden]) .timelapse-name')].map((n) => n.textContent),
        barHidden: document.querySelector('#timelapse-delete-bar').hidden,
        toast: document.querySelector('#toast').textContent
      };
      document.querySelector('#timelapse-screen-back').click();
      await wait(80);
      result.timelapseBack = open('#device-settings-screen');
      document.querySelector('#device-settings-back').click();
      await wait(80);
      result.deviceSettingsBack = !document.querySelector('#device-page').inert;

      // 风扇滤芯标签
      document.querySelector('#fan-filter-banner').click();
      await wait(80);
      result.fanFilter = { open: open('#fan-filter-screen'), src: decodeURI(document.querySelector('#fan-filter-screen img').currentSrc) };
      document.querySelector('#open-fan-alert').click();
      await wait(80);
      result.fanAlert = { open: open('#fan-alert-screen'), src: decodeURI(document.querySelector('#fan-alert-screen img').currentSrc) };
      document.querySelector('#fan-alert-back').click();
      await wait(80);
      result.fanAlertBack = open('#fan-filter-screen');
      document.querySelector('#fan-filter-replaced').click();
      await wait(80);
      result.replaced = {
        closed: !open('#fan-filter-screen') && !document.querySelector('#device-page').inert,
        bannerText: document.querySelector('#fan-filter-banner').textContent.replace(/\\s+/g, ''),
        bannerLabel: document.querySelector('#fan-filter-banner').getAttribute('aria-label')
      };
      return result;
    })()`
  });

  const reuse = reuseScreens.result.value;
  assert(reuse.fromCamera.open && reuse.fromCamera.count === 3, `The camera 延时摄影 label did not open the time-lapse list page: ${JSON.stringify(reuse.fromCamera)}`);
  assert(reuse.cameraBackToPrinter, 'The time-lapse page back hotspot did not return to the printer page.');
  assert(reuse.deviceSettings.open && reuse.deviceSettings.src.endsWith('原型修改复用图片资源/设备设置页.png'), `The 设置 button did not open the device-settings page: ${JSON.stringify(reuse.deviceSettings)}`);
  assert(reuse.printOptions.open && reuse.printOptions.src.endsWith('原型修改复用图片资源/打印选项.png') && reuse.printOptionsBack, `打印选项 row did not open the print-options page: ${JSON.stringify(reuse.printOptions)}`);
  assert(reuse.timelapse.open && reuse.timelapse.count === 3 && reuse.timelapseBack, `延时摄影 row did not open the time-lapse list page: ${JSON.stringify(reuse.timelapse)}`);
  assert(reuse.timelapsePicking.pressed === 'true' && reuse.timelapsePicking.barVisible && reuse.timelapsePicking.confirmDisabled && reuse.timelapsePicking.confirmLabel === '删除', `The time-lapse trash icon did not enter multi-select: ${JSON.stringify(reuse.timelapsePicking)}`);
  assert(reuse.timelapsePicked.label === '删除（2）' && !reuse.timelapsePicked.disabled && reuse.timelapsePicked.picked === 2, `Multi-select did not track two picked models: ${JSON.stringify(reuse.timelapsePicked)}`);
  assert(JSON.stringify(reuse.timelapseDeleted.remaining) === JSON.stringify(['史蒂夫_02_012209']) && reuse.timelapseDeleted.barHidden && reuse.timelapseDeleted.toast.includes('2 个'), `批量删除 did not keep the unselected model: ${JSON.stringify(reuse.timelapseDeleted)}`);
  assert(reuse.timelapseBack && reuse.deviceSettingsBack, 'Nested time-lapse returns did not unwind back to the printer page.');
  assert(reuse.fanFilter.open && reuse.fanFilter.src.endsWith('原型修改复用图片资源/风扇滤芯更换.png'), `The fan-filter banner did not open the replacement page: ${JSON.stringify(reuse.fanFilter)}`);
  assert(reuse.fanAlert.open && reuse.fanAlert.src.endsWith('原型修改复用图片资源/风扇提醒弹窗.png') && reuse.fanAlertBack, `The fan-filter top-right hotspot did not open the reminder dialog: ${JSON.stringify(reuse.fanAlert)}`);
  assert(reuse.replaced.closed && reuse.replaced.bannerText === '当前风扇剩余400h需要更换滤芯' && reuse.replaced.bannerLabel.includes('400h'), `我已更换 did not return with the 400h banner: ${JSON.stringify(reuse.replaced)}`);

  const captureReusePreview = async (expression, previewPath) => {
    /* 先收掉上一步残留的 toast，避免验收图里出现与当前页无关的提示 */
    await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#toast').classList.remove('is-visible')` });
    await cdp.send('Runtime.evaluate', { expression });
    await delay(160);
    if (!previewPath) return;
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(previewPath, Buffer.from(shot.data, 'base64'));
  };
  await captureReusePreview(`document.querySelector('#printer-settings').click()`, deviceSettingsPreviewPath);
  await captureReusePreview(`document.querySelector('#open-print-options').click()`, printOptionsPreviewPath);
  await captureReusePreview(`document.querySelector('#print-options-back').click()`, null);
  await captureReusePreview(`document.querySelector('#open-timelapse-settings').click()`, timelapsePagePreviewPath);
  /* 延时摄影删除演示整图页已下线：删除改为列表页顶栏的真实多选，这里只退回设备设置 */
  await captureReusePreview(`document.querySelector('#timelapse-screen-back').click(); document.querySelector('#device-settings-back').click()`, null);
  await captureReusePreview(`document.querySelector('#fan-filter-banner').click()`, fanFilterPreviewPath);
  await captureReusePreview(`document.querySelector('#open-fan-alert').click()`, fanAlertPreviewPath);
  await captureReusePreview(`document.querySelector('#fan-alert-back').click(); document.querySelector('#fan-filter-back').click()`, null);

  // ---------- 添加打印机 / 移除打印机逻辑 / 耗材设置 ----------
  const addPrinterFlow = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      document.querySelector('#printer-switch').click();
      await wait(140);
      const dialogOpened = document.querySelector('#action-dialog').open;
      const screen = document.querySelector('#add-printer-screen');
      const stage = screen.querySelector('.reuse-stage').getBoundingClientRect();
      const configure = document.querySelector('#configure-new-printer').getBoundingClientRect();
      const back = document.querySelector('#add-printer-back').getBoundingClientRect();
      const img = screen.querySelector('img');
      const result = {
        dialogOpened,
        open: !screen.hidden,
        loaded: img.complete && img.naturalWidth > 0,
        src: decodeURI(img.currentSrc),
        inertWhileOpen: document.querySelector('#device-page').inert,
        configure: { left: (configure.left - stage.left) / stage.width, top: (configure.top - stage.top) / stage.height, right: (configure.right - stage.left) / stage.width, bottom: (configure.bottom - stage.top) / stage.height },
        backPinned: back.left === stage.left && back.top === stage.top
      };
      document.querySelector('#add-printer-back').click();
      await wait(80);
      result.backClosed = screen.hidden && !document.querySelector('#device-page').inert;
      const spool = document.querySelector('#filament-spool').getBoundingClientRect();
      const edit = document.querySelector('#open-material-settings').getBoundingClientRect();
      result.editHotspot = {
        width: edit.width, height: edit.height,
        separatedFromSpool: edit.top >= spool.bottom,
        coversArtwork: null
      };
      return result;
    })()`
  });
  const addPrinter = addPrinterFlow.result.value;
  assert(!addPrinter.dialogOpened && addPrinter.open && addPrinter.loaded && addPrinter.src.endsWith('原型修改复用图片资源/添加打印机.png'), `添加打印机 did not open the reused artwork directly without the switch dialog: ${JSON.stringify(addPrinter)}`);
  assert(addPrinter.inertWhileOpen && addPrinter.backClosed, 'The 添加打印机 page did not return to the printer page.');
  assert(addPrinter.backPinned, `The 添加打印机 back hotspot is not pinned to the page top-left corner: ${JSON.stringify(addPrinter)}`);
  assert(addPrinter.configure.left > 0.12 && addPrinter.configure.left < 0.14 && addPrinter.configure.right > 0.86 && addPrinter.configure.right < 0.88 && addPrinter.configure.top > 0.85 && addPrinter.configure.top < 0.88 && addPrinter.configure.bottom > 0.93 && addPrinter.configure.bottom < 0.95, `The 配置新的打印机 hotspot does not cover the artwork button: ${JSON.stringify(addPrinter.configure)}`);
  assert(addPrinter.editHotspot.width >= 44 && addPrinter.editHotspot.height >= 40 && addPrinter.editHotspot.separatedFromSpool, `The filament edit hotspot is too small or overlaps the spool: ${JSON.stringify(addPrinter.editHotspot)}`);

  await captureReusePreview(`document.querySelector('#printer-switch').click()`, addPrinterPreviewPath);

  const removePrinterFlow = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const open = (name) => !document.querySelector(name).hidden;
      document.querySelector('#add-printer-back').click();
      await wait(80);
      document.querySelector('#printer-settings').click();
      await wait(80);
      const deviceStage = document.querySelector('#device-settings-screen .reuse-stage').getBoundingClientRect();
      const removeRow = document.querySelector('#open-remove-printer').getBoundingClientRect();
      document.querySelector('#open-remove-printer').click();
      await wait(100);
      const dialogStage = document.querySelector('#remove-printer-screen .reuse-stage').getBoundingClientRect();
      const dialogImg = document.querySelector('#remove-printer-screen img');
      const rect = (selector, stage) => {
        const r = document.querySelector(selector).getBoundingClientRect();
        return { left: (r.left - stage.left) / stage.width, top: (r.top - stage.top) / stage.height, right: (r.right - stage.left) / stage.width, bottom: (r.bottom - stage.top) / stage.height };
      };
      const result = {
        open: open('#remove-printer-screen'),
        loaded: dialogImg.complete && dialogImg.naturalWidth > 0,
        src: decodeURI(dialogImg.currentSrc),
        row: { top: (removeRow.top - deviceStage.top) / deviceStage.height, bottom: (removeRow.bottom - deviceStage.top) / deviceStage.height, left: (removeRow.left - deviceStage.left) / deviceStage.width, right: (removeRow.right - deviceStage.left) / deviceStage.width },
        cancel: rect('#remove-printer-cancel', dialogStage),
        confirm: rect('#remove-printer-confirm', dialogStage)
      };
      document.querySelector('#remove-printer-cancel').click();
      await wait(80);
      result.cancelBack = open('#device-settings-screen') && !open('#remove-printer-screen');
      document.querySelector('#open-remove-printer').click();
      await wait(80);
      document.querySelector('#remove-printer-confirm').click();
      await wait(120);
      result.logicOpen = open('#logic-demo-screen');
      // 该页已从深色霓虹演示风改为与原型统一的浅色风（浅灰底 + 白卡片 + 蓝色关键词 + 深色正文）
      result.logicTheme = (() => {
        const wrap = getComputedStyle(document.querySelector('.logic-demo'));
        const card = getComputedStyle(document.querySelector('.logic-demo-card'));
        const title = getComputedStyle(document.querySelector('.logic-demo-title'));
        const branch = getComputedStyle(document.querySelector('.logic-demo-actions button'));
        return {
          wrapBg: wrap.backgroundColor, wrapImage: wrap.backgroundImage,
          cardBg: card.backgroundColor, titleColor: title.color,
          keywordColor: getComputedStyle(document.querySelector('.logic-demo-rule b')).color,
          branchBg: branch.backgroundColor, branchBorder: branch.borderTopColor,
          // 所有文字都必须是深色，不能残留深色主题下的浅色字
          allTextDark: [...document.querySelectorAll('.logic-demo-card *')]
            .every((node) => !node.textContent.trim() || getComputedStyle(node).color !== 'rgb(232, 236, 255)'),
          badgeGone: !document.querySelector('.logic-demo-badge')
        };
      })();
      result.branchLabels = [...document.querySelectorAll('.logic-demo-actions button strong')].map((node) => node.textContent);
      document.querySelector('#logic-demo-back').click();
      await wait(80);
      result.logicBack = open('#remove-printer-screen');
      document.querySelector('#remove-printer-confirm').click();
      await wait(80);
      document.querySelector('#logic-demo-existing').click();
      await wait(100);
      result.existingBranch = { allClosed: !open('#logic-demo-screen') && !open('#remove-printer-screen') && !open('#device-settings-screen'), ready: !document.querySelector('#device-page').inert, toast: document.querySelector('#toast').textContent };
      return result;
    })()`
  });
  const removePrinter = removePrinterFlow.result.value;
  assert(removePrinter.open && removePrinter.loaded && removePrinter.src.endsWith('原型修改复用图片资源/移除打印机弹窗.png'), `移除打印机 did not open the confirm dialog artwork: ${JSON.stringify(removePrinter)}`);
  assert(removePrinter.row.top > 0.92 && removePrinter.row.bottom < 1 && removePrinter.row.left < 0.04, `The 移除打印机 hotspot is not on the artwork bottom row: ${JSON.stringify(removePrinter.row)}`);
  assert(removePrinter.cancel.left > 0.2 && removePrinter.cancel.right < 0.45 && removePrinter.confirm.left > 0.55 && removePrinter.confirm.right < 0.79 && removePrinter.cancel.top > 0.48 && removePrinter.cancel.bottom < 0.6, `The 取消 / 确认 hotspots do not cover the artwork buttons: ${JSON.stringify(removePrinter)}`);
  assert(removePrinter.cancelBack, '取消 did not return to the device settings page.');
  assert(removePrinter.logicOpen, '确认 did not open the logic page.');
  // 浅色风验收：外层浅灰底、无渐变；卡片纯白；标题深色；IF/ELSE 关键词为品牌蓝；分支行白底描边
  const lt = removePrinter.logicTheme;
  assert(lt.wrapBg === 'rgb(244, 245, 250)' && lt.wrapImage === 'none', `The logic page is not on the light page background: ${JSON.stringify(lt)}`);
  assert(lt.cardBg === 'rgb(255, 255, 255)', `The logic card is not white: ${lt.cardBg}`);
  assert(lt.titleColor === 'rgb(47, 52, 61)', `The logic title is not dark ink: ${lt.titleColor}`);
  assert(lt.keywordColor === 'rgb(67, 136, 245)', `IF/ELSE keyword is not brand blue: ${lt.keywordColor}`);
  assert(lt.branchBg === 'rgb(255, 255, 255)' && lt.branchBorder === 'rgb(232, 236, 244)', `The branch rows are not white-on-outlined: ${JSON.stringify(lt)}`);
  assert(lt.allTextDark, 'Some text is still using the old light-on-dark color.');
  assert(lt.badgeGone, 'The 逻辑演示 · 非最终视觉 badge is still present.');
  assert(JSON.stringify(removePrinter.branchLabels) === JSON.stringify(['已有其他打印机', '没有其他打印机']), `Logic-demo branches are wrong: ${JSON.stringify(removePrinter.branchLabels)}`);
  assert(removePrinter.logicBack, 'The logic-demo back control did not return to the remove dialog.');
  assert(removePrinter.existingBranch.allClosed && removePrinter.existingBranch.ready && removePrinter.existingBranch.toast.includes('Ugee Funbox'), `The 已有其他打印机 branch did not land back on the printer page: ${JSON.stringify(removePrinter.existingBranch)}`);

  const materialFlow = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const open = (name) => !document.querySelector(name).hidden;
      const result = {};
      document.querySelector('.filament-panel').scrollIntoView({ block: 'center' });
      document.querySelector('#open-material-settings').click();
      await wait(120);
      const stage = document.querySelector('#material-settings-screen .reuse-stage').getBoundingClientRect();
      const row = (selector) => {
        const r = document.querySelector(selector).getBoundingClientRect();
        return { top: (r.top - stage.top) / stage.height, bottom: (r.bottom - stage.top) / stage.height, left: (r.left - stage.left) / stage.width, right: (r.right - stage.left) / stage.width };
      };
      result.settingsOpen = open('#material-settings-screen');
      result.settingsSrc = decodeURI(document.querySelector('#material-settings-screen img').currentSrc);
      result.nameRow = row('#open-material-name');
      result.typeRow = row('#open-material-type');
      result.colorRow = row('#open-material-color');
      result.rowsDoNotOverlap = result.nameRow.bottom <= result.typeRow.top + 0.001 && result.typeRow.bottom <= result.colorRow.top + 0.001;

      document.querySelector('#open-material-name').click();
      await wait(120);
      result.nameOpen = open('#material-name-screen');
      result.nameSrc = decodeURI(document.querySelector('#material-name-screen img').currentSrc);
      const nameStage = document.querySelector('#material-name-screen .reuse-stage').getBoundingClientRect();
      const r = document.querySelector('#material-name-return').getBoundingClientRect();
      result.nameReturn = { top: (r.top - nameStage.top) / nameStage.height, bottom: (r.bottom - nameStage.top) / nameStage.height, width: r.width, height: r.height };
      document.querySelector('#material-name-return').click();
      await wait(100);
      result.nameBack = open('#material-settings-screen');

      document.querySelector('#open-material-type').click();
      await wait(120);
      result.typeOpen = open('#material-type-screen');
      result.typeSrc = decodeURI(document.querySelector('#material-type-screen img').currentSrc);
      result.typeAnywhere = (() => {
        const b = document.querySelector('#material-type-anywhere').getBoundingClientRect();
        return { width: b.width, height: b.height };
      })();
      document.querySelector('#material-type-anywhere').click();
      await wait(100);
      result.typeBack = open('#material-settings-screen');

      document.querySelector('#open-material-color').click();
      await wait(120);
      result.colorOpen = open('#material-color-screen');
      result.colorSrc = decodeURI(document.querySelector('#material-color-screen img').currentSrc);
      result.colorAnywhere = (() => {
        const b = document.querySelector('#material-color-anywhere').getBoundingClientRect();
        return { width: b.width, height: b.height };
      })();
      document.querySelector('#material-color-anywhere').click();
      await wait(100);
      result.colorBack = open('#material-settings-screen');
      document.querySelector('#material-settings-back').click();
      await wait(100);
      result.settingsBack = !document.querySelector('#device-page').inert;
      return result;
    })()`
  });
  const material = materialFlow.result.value;
  assert(material.settingsOpen && material.settingsSrc.endsWith('原型修改复用图片资源/耗材设置页.png'), `The filament edit hotspot did not open 耗材设置: ${JSON.stringify(material)}`);
  assert(material.nameRow.top > 0.11 && material.nameRow.bottom < 0.20 && material.typeRow.top > 0.18 && material.typeRow.bottom < 0.27 && material.colorRow.top > 0.25 && material.colorRow.bottom < 0.34 && material.rowsDoNotOverlap, `耗材设置 row hotspots are misaligned: ${JSON.stringify(material)}`);
  assert(material.nameOpen && material.nameSrc.endsWith('原型修改复用图片资源/名称修改页.png'), `The 名称 row did not open 名称修改页: ${JSON.stringify(material)}`);
  assert(material.nameReturn.top > 0.82 && material.nameReturn.bottom < 1 && material.nameReturn.width > 300 && material.nameReturn.height >= 44, `名称修改页 bottom return hotspot is missing or too small: ${JSON.stringify(material.nameReturn)}`);
  assert(material.nameBack, 'The 名称修改页 return control did not go back to 耗材设置.');
  assert(material.typeOpen && material.typeSrc.endsWith('原型修改复用图片资源/耗材类型修改页.png') && material.typeAnywhere.width >= 374 && material.typeAnywhere.height >= 810 && material.typeBack, `The 类型 row or its click-anywhere return is broken: ${JSON.stringify(material)}`);
  assert(material.colorOpen && material.colorSrc.endsWith('原型修改复用图片资源/颜色修改页.png') && material.colorAnywhere.width >= 374 && material.colorAnywhere.height >= 810 && material.colorBack, `The 颜色 row or its click-anywhere return is broken: ${JSON.stringify(material)}`);
  assert(material.settingsBack, '耗材设置 did not return to the printer page.');

  await captureReusePreview(`document.querySelector('#printer-settings').click(); document.querySelector('#open-remove-printer').click()`, removePrinterPreviewPath);
  await captureReusePreview(`document.querySelector('#remove-printer-confirm').click()`, logicDemoPreviewPath);
  await captureReusePreview(`document.querySelector('#logic-demo-back').click(); document.querySelector('#remove-printer-back').click(); document.querySelector('#device-settings-back').click()`, null);
  await captureReusePreview(`document.querySelector('.filament-panel').scrollIntoView({ block: 'center' }); document.querySelector('#open-material-settings').click()`, materialSettingsPreviewPath);
  await captureReusePreview(`document.querySelector('#open-material-name').click()`, materialNamePreviewPath);
  await captureReusePreview(`document.querySelector('#material-name-return').click(); document.querySelector('#open-material-type').click()`, materialTypePreviewPath);
  await captureReusePreview(`document.querySelector('#material-type-anywhere').click(); document.querySelector('#open-material-color').click()`, materialColorPreviewPath);
  await captureReusePreview(`document.querySelector('#material-color-anywhere').click(); document.querySelector('#material-settings-back').click()`, null);

  /* ---------- 整屏铺满型大图页：风扇提醒弹窗（进料中 / 退料中已改为真实 DOM 页面） ---------- */
  const fullscreenArt = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.width <= 390 });
    await cdp.send('Page.navigate', { url: pageUrl });
    await delay(700);
    const measured = await cdp.send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async () => {
        const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        const deviceFrame = { w: Math.min(innerWidth, 375), h: Math.min(innerHeight, 812), left: Math.round(Math.max(0, (innerWidth - Math.min(innerWidth, 375)) / 2)), top: Math.round(Math.max(0, (innerHeight - Math.min(innerHeight, 812)) / 2)) };
        const measure = (screenSelector, imageSelector) => {
          const screen = document.querySelector(screenSelector).getBoundingClientRect();
          const image = document.querySelector(imageSelector);
          const rect = image.getBoundingClientRect();
          return {
            screenWidth: Math.round(screen.width),
            screenHeight: Math.round(screen.height),
            screenLeft: Math.round(screen.left),
            screenTop: Math.round(screen.top),
            imageWidth: Math.round(rect.width),
            imageHeight: Math.round(rect.height),
            imageTop: Math.round(rect.top),
            imageLeft: Math.round(rect.left),
            naturalWidth: image.naturalWidth,
            naturalHeight: image.naturalHeight,
            ratioDelta: Math.abs((rect.width / rect.height) - (image.naturalWidth / image.naturalHeight)),
            coversFrame: rect.width >= deviceFrame.w - 1 && rect.height >= deviceFrame.h - 1,
            viewportWidth: innerWidth,
            viewportHeight: innerHeight
          };
        };
        /* 真实 DOM 版进料中页面同样必须锁在设备框内（不再是铺满的拼图原图） */
        document.querySelector('#filament-spool').click();
        document.querySelector('#load-filament').click();
        await wait(220);
        const screen = document.querySelector('#filament-operation-screen').getBoundingClientRect();
        const feed = {
          screenWidth: Math.round(screen.width),
          screenHeight: Math.round(screen.height),
          screenLeft: Math.round(screen.left),
          screenTop: Math.round(screen.top),
          ringRadius: Math.round(document.querySelector('#filament-operation-ring').getBoundingClientRect().width / 2),
          artLoaded: document.querySelector('#filament-operation-art').complete
        };
        window.__filamentOperation.finish();
        await wait(120);
        document.querySelector('#filament-operation-primary').click();
        await wait(200);
        const panelStatus = document.querySelector('#filament-status').textContent;
        document.querySelector('#fan-filter-banner').click();
        await wait(200);
        document.querySelector('#open-fan-alert').click();
        await wait(220);
        const fanAlert = measure('#fan-alert-screen', '#fan-alert-screen img');
        const back = document.querySelector('#fan-alert-back').getBoundingClientRect();
        const stage = document.querySelector('#fan-alert-screen .reuse-screen-frame').getBoundingClientRect();
        document.querySelector('#fan-alert-back').click();
        await wait(150);
        const fanAlertBack = !document.querySelector('#fan-filter-screen').hidden;
        document.querySelector('#fan-filter-back').click();
        await wait(150);
        return { viewportWidth: innerWidth, viewportHeight: innerHeight, deviceFrame, feed, fanAlert, panelStatus, fanAlertBack, fanAlertBackPinned: back.left === stage.left && back.top === stage.top };
      })()`
    });
    fullscreenArt.push(measured.result.value);
  }
  fullscreenArt.forEach((entry) => {
    const label = `${entry.viewportWidth}x${entry.viewportHeight}`;
    assert(entry.feed.screenWidth === entry.deviceFrame.w && entry.feed.screenHeight === entry.deviceFrame.h && entry.feed.screenLeft === entry.deviceFrame.left && entry.feed.screenTop === entry.deviceFrame.top, `进料中 page is not locked to the iPhone 13 mini frame at ${label}: ${JSON.stringify(entry.feed)}`);
    assert(entry.feed.ringRadius === 110, `进料中 ring radius must stay 110 logical px at every viewport (${label}): ${entry.feed.ringRadius}`);
    assert(entry.feed.artLoaded, `进料中 illustration must be loaded from assets/ at ${label}.`);
    assert(entry.fanAlert.screenWidth === entry.deviceFrame.w && entry.fanAlert.screenHeight === entry.deviceFrame.h && entry.fanAlert.screenLeft === entry.deviceFrame.left && entry.fanAlert.screenTop === entry.deviceFrame.top, `风扇提醒弹窗 page is not locked to the iPhone 13 mini frame at ${label}: ${JSON.stringify(entry.fanAlert)}`);
    assert(entry.fanAlert.coversFrame, `风扇提醒弹窗 artwork does not fill the device frame at ${label}: ${JSON.stringify(entry.fanAlert)}`);
    assert(entry.fanAlert.ratioDelta < 0.001, `风扇提醒弹窗 artwork is distorted inside the device frame at ${label}: ${JSON.stringify(entry.fanAlert)}`);
    assert(entry.fanAlert.imageTop === entry.fanAlert.screenTop && entry.fanAlert.imageLeft === entry.fanAlert.screenLeft, `风扇提醒弹窗 artwork is not anchored to the device frame top-left at ${label}: ${JSON.stringify(entry.fanAlert)}`);
    assert(entry.panelStatus === '进料完成', `Filament panel did not settle to 进料完成 before retracting at ${label}: ${entry.panelStatus}`);
    assert(entry.fanAlertBack && entry.fanAlertBackPinned, `The full screen 风扇提醒弹窗 did not return to the fan filter page at ${label}.`);
  });

  /* 桌面端整屏铺满验收图 */
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  const captureFullscreen = async (expression, previewPath) => {
    await cdp.send('Page.navigate', { url: pageUrl });
    await delay(700);
    await cdp.send('Runtime.evaluate', { expression, awaitPromise: true });
    await delay(240);
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(previewPath, Buffer.from(shot.data, 'base64'));
  };
  const startFeeding = `(async () => { const w = (ms) => new Promise(r => setTimeout(r, ms)); window.__filamentOperation.durations({ heat: 4000, move: 2000, tipAt: 900, tipHide: 3000 }); document.querySelector('#filament-spool').click(); document.querySelector('#load-filament').click(); await w(1100); })()`;
  await captureFullscreen(startFeeding, fullscreenFeedPreviewPath);
  await captureFullscreen(`(async () => { const w = (ms) => new Promise(r => setTimeout(r, ms)); window.__filamentOperation.durations({ heat: 900, move: 600, tipAt: 100000 }); document.querySelector('#filament-spool').click(); document.querySelector('#load-filament').click(); await w(1200); document.querySelector('#filament-operation-back').click(); await w(120); document.querySelector('#unload-filament').click(); await w(800); })()`, fullscreenRetractPreviewPath);
  await captureFullscreen(`(async () => { const w = (ms) => new Promise(r => setTimeout(r, ms)); document.querySelector('#fan-filter-banner').click(); await w(200); document.querySelector('#open-fan-alert').click(); await w(250); })()`, fullscreenFanAlertPreviewPath);

  /* ---------- iPhone 13 mini 设备框（375 × 812）+ 设备框内纵向滚动 ---------- */
  const deviceFrame = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 375, height: 812 }, { width: 320, height: 568 }]) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.width <= 390 });
    await cdp.send('Page.navigate', { url: pageUrl });
    await delay(820);
    const measured = await cdp.send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async () => {
        const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        const shell = document.querySelector('#device-page');
        const rect = shell.getBoundingClientRect();
        const expectedWidth = Math.min(innerWidth, 375);
        const expectedHeight = Math.min(innerHeight, 812);
        const nav = document.querySelector('.bottom-nav').getBoundingClientRect();
        const indicator = document.querySelector('#scroll-indicator');
        const thumb = document.querySelector('#scroll-indicator span');
        const overflow = shell.scrollHeight - shell.clientHeight;
        const indicatorBefore = { hidden: indicator.hidden };
        shell.scrollTop = Math.round(overflow / 2);
        await wait(90);
        const indicatorDuring = { visible: indicator.classList.contains('is-visible'), thumb: Math.round(parseFloat(thumb.style.height) || 0), right: Math.round(indicator.getBoundingClientRect().right) };
        const scrolledHalf = Math.round(shell.scrollTop);
        shell.scrollTop = 0;
        await wait(40);
        return {
          viewport: [innerWidth, innerHeight],
          expected: [expectedWidth, expectedHeight, Math.round(Math.max(0, (innerWidth - expectedWidth) / 2)), Math.round(Math.max(0, (innerHeight - expectedHeight) / 2))],
          shell: [Math.round(rect.width), Math.round(rect.height), Math.round(rect.left), Math.round(rect.top)],
          overflow,
          scrollWorks: scrolledHalf > 0,
          overflowY: getComputedStyle(shell).overflowY,
          documentScroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
          nav: [Math.round(nav.width), Math.round(nav.bottom)],
          indicatorBefore,
          indicatorDuring,
          headerImageWidth: Math.round(document.querySelector('.source-crop--header img').getBoundingClientRect().width)
        };
      })()`
    });
    deviceFrame.push(measured.result.value);
  }
  deviceFrame.forEach((entry) => {
    const label = `${entry.viewport[0]}x${entry.viewport[1]}`;
    assert(entry.shell[0] === entry.expected[0] && entry.shell[1] === entry.expected[1] && entry.shell[2] === entry.expected[2] && entry.shell[3] === entry.expected[3], `The shell is not an iPhone 13 mini frame at ${label}: ${JSON.stringify(entry)}`);
    assert(entry.documentScroll[0] === entry.viewport[0] && entry.documentScroll[1] === entry.viewport[1], `The document must not scroll outside the device frame at ${label}: ${JSON.stringify(entry.documentScroll)}`);
    assert(entry.headerImageWidth === entry.expected[0], `The header artwork is clipped inside the device frame at ${label}: ${entry.headerImageWidth} vs ${entry.expected[0]}`);
    assert(entry.nav[0] === entry.expected[0] && entry.nav[1] === entry.expected[3] + entry.expected[1], `The bottom nav is not anchored to the device frame at ${label}: ${JSON.stringify(entry.nav)}`);
    if (entry.overflow > 4) {
      assert(entry.overflowY === 'auto' && entry.scrollWorks, `The long page does not scroll inside the device frame at ${label}: ${JSON.stringify(entry)}`);
      assert(entry.indicatorBefore.hidden === false && entry.indicatorDuring.visible && entry.indicatorDuring.thumb >= 28, `The scroll indicator did not appear at ${label}: ${JSON.stringify(entry)}`);
      const expectedRight = entry.expected[2] + entry.expected[0];
      assert(entry.indicatorDuring.right <= expectedRight && entry.indicatorDuring.right > expectedRight - 8, `The scroll indicator is not pinned to the device frame edge at ${label}: ${JSON.stringify(entry.indicatorDuring)}`);
    }
  });

  const responsiveLayouts = [];
  for (const width of [320, 768, 1024, 1440]) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width, height: 812, deviceScaleFactor: 1, mobile: width <= 390 });
    const metrics = await cdp.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const taskRect = document.querySelector('#task-panel').getBoundingClientRect();
        const imageRect = document.querySelector('#filament-panel-image').getBoundingClientRect();
        return {
          viewportWidth: document.documentElement.clientWidth,
          documentWidth: document.documentElement.scrollWidth,
          shellWidth: Math.round(document.querySelector('.phone-shell').getBoundingClientRect().width),
          filamentRatio: imageRect.width / imageRect.height,
          filamentLeftDelta: Math.abs(imageRect.left - taskRect.left),
          filamentRightDelta: Math.abs(imageRect.right - taskRect.right)
        };
      })()`
    });
    responsiveLayouts.push(metrics.result.value);
  }
  responsiveLayouts.forEach((layout) => {
    assert(layout.documentWidth === layout.viewportWidth, `Horizontal overflow detected at ${layout.viewportWidth}px.`);
    assert(layout.shellWidth === Math.min(layout.viewportWidth, 375), `Unexpected iPhone 13 mini shell width at ${layout.viewportWidth}px.`);
    assert(Math.abs(layout.filamentRatio - 352 / 248) < 0.01, `Filament panel artwork ratio changed at ${layout.viewportWidth}px: ${JSON.stringify(layout)}`);
    assert(layout.filamentLeftDelta < 1 && layout.filamentRightDelta < 1, `Filament panel edge alignment changed at ${layout.viewportWidth}px: ${JSON.stringify(layout)}`);
  });

  const accessibilityTree = await cdp.send('Accessibility.getFullAXTree');
  const unnamedButtons = accessibilityTree.nodes.filter((node) =>
    node.role?.value === 'button' && !node.name?.value?.trim()
  );
  assert(unnamedButtons.length === 0, `Found ${unnamedButtons.length} button(s) without accessible names.`);

  const browserErrors = cdp.events.filter((event) =>
    event.method === 'Runtime.exceptionThrown' ||
    (event.method === 'Log.entryAdded' && ['error', 'warning'].includes(event.params.entry.level))
  );
  assert(browserErrors.length === 0, `Browser emitted ${browserErrors.length} error/warning event(s).`);

  console.log(JSON.stringify({ ready, readyConnection: readyConnection.result.value, offlineConnection: offlineConnection.result.value, exploreToys: explore, prepareChain: chain, exploreBack: back, firmwareFlow: firmware, prepareControls: controls, started, plateList: plate, afterDrag: afterDrag.result.value, prepareStates, cancelledStarted: cancelledStarted.result.value, timelapseFullscreen, preparingCancellation: preparingCancellation.result.value, cancelledState: cancelledState.result.value, preparation: preparing, ...result, queueTwoColor: queueTwoColor.result.value, queueBack: queueBack.result.value, plateTwoMapping, plateThreeMapping, nextPlate: nextPlate.result.value, cancellation: cancellation.result.value, cancelAll: cancelAll.result.value, cancelAllGirl: cancelAllGirl.result.value, singlePlateCompletion: singlePlateCompletion.result.value, feeding: feedingRun, retracting: retractRun, cancelRun: cancelView, cameraLimit: cameraLimit.result.value, reuse, addPrinter, removePrinter, material, fullscreenArt, deviceFrame, responsiveLayouts, unnamedButtons: 0, browserErrors: 0, cameraLimitPreviewPath, readyPreviewPath, offlineConnectionPreviewPath, exploreToysPreviewPath, prepareEmptyPreviewPath, prepareUncheckedPreviewPath, preparingFromPreparePreviewPath, timelapseFullscreenPreviewPath, preparingPreviewPath, preparingCancelDialogPreviewPath, cancelledPreviewPath, previewPath, plateTwoQueuePreviewPath, queueTwoColorPreviewPath, multiAccountQueuePreviewPath, prepareStateCompletedPreviewPath, preparePlateDragPreviewPath, completedActionsPreviewPath, nextPlatePreviewPath, filamentPanelPreviewPath, feedingPreviewPath, retractingPreviewPath, cancelAllPreviewPath, prepareChangedPreviewPath, deviceSettingsFirmwarePreviewPath, firmwareUpgradePreviewPath, firmwareDialogPreviewPath, firmwareProgressPreviewPath, firmwareDonePreviewPath, firmwareVersionPreviewPath }, null, 2));
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
      // The OS temp directory remains the safe fallback if Chrome briefly retains a lock.
    }
  }
}
