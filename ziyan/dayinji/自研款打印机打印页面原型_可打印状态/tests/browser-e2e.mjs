import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const prototypeRoot = path.resolve(import.meta.dirname, '..');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ziyan-printer-prototype-'));
const readyPreviewPath = path.join(prototypeRoot, 'prototype-ready.png');
const exploreJourneyPreviewPath = path.join(prototypeRoot, 'prototype-explore-journey-hotspot.png');
const preparingPreviewPath = path.join(prototypeRoot, 'prototype-preparing.png');
const preparingCancelDialogPreviewPath = path.join(prototypeRoot, 'prototype-preparing-cancel-dialog.png');
const cancelledPreviewPath = path.join(prototypeRoot, 'prototype-cancelled-minimal.png');
const previewPath = path.join(prototypeRoot, 'prototype-preview.png');
const plateTwoQueuePreviewPath = path.join(prototypeRoot, 'prototype-plate2-queue.png');
const queueTwoColorPreviewPath = path.join(prototypeRoot, 'prototype-queue2-direct-color.png');
const multiAccountQueuePreviewPath = path.join(prototypeRoot, 'prototype-multi-account-queue.png');
const girlActivePrintingPreviewPath = path.join(prototypeRoot, 'prototype-girl-active-printing.png');
const completedActionsPreviewPath = path.join(prototypeRoot, 'prototype-completed-actions.png');
const nextPlatePreviewPath = path.join(prototypeRoot, 'prototype-next-plate-builder.png');
const filamentPanelPreviewPath = path.join(prototypeRoot, 'prototype-filament-panel.png');
const feedingPreviewPath = path.join(prototypeRoot, 'prototype-feeding.png');
const retractingPreviewPath = path.join(prototypeRoot, 'prototype-retracting.png');
const offlineConnectionPreviewPath = path.join(prototypeRoot, 'prototype-connection-offline.png');
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
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await cdp.send('Page.reload');
  await delay(700);

  const readyState = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const navigation = document.querySelector('#task-navigation');
      const startButton = document.querySelector('#start-queued-print');
      const frame = navigation.getBoundingClientRect();
      const button = startButton.getBoundingClientRect();
      const visibleQueueTasks = [...document.querySelectorAll('[data-queue-task]:not([hidden])')];
      await Promise.all(visibleQueueTasks.map((task) => {
        const image = task.querySelector('.queue-task-artwork');
        return image.complete ? Promise.resolve() : new Promise(resolve => image.addEventListener('load', resolve, { once: true }));
      }));
      return {
        status: document.querySelector('#task-panel').dataset.status,
        label: document.querySelector('#task-state').textContent,
        taskNavigationVisible: !navigation.hidden,
        taskNavigationLabel: navigation.getAttribute('aria-label'),
        queueCopy: document.querySelector('#ready-queue-message').textContent,
        taskSummaryHidden: document.querySelector('.task-summary').hidden,
        actionsHidden: document.querySelector('#task-actions').hidden,
        completionHidden: document.querySelector('#completion-actions').hidden,
        queueToggleHidden: document.querySelector('#queue-toggle').hidden,
        queueHidden: document.querySelector('#print-queue').hidden,
        readyQueueTasks: visibleQueueTasks.map((task) => ({
          id: task.dataset.queueId,
          owner: task.dataset.owner,
          image: decodeURI(task.querySelector('.queue-task-artwork').currentSrc),
          label: task.getAttribute('aria-label')
        })),
        navigationBackground: getComputedStyle(navigation).backgroundColor,
        queueBadgeRemoved: !document.querySelector('.task-navigation-badge'),
        startButton: {
          label: startButton.textContent,
          left: (button.left - frame.left) / frame.width,
          right: (button.right - frame.left) / frame.width,
          bottom: (button.bottom - frame.top) / frame.height,
          color: getComputedStyle(startButton).color,
          backgroundImage: getComputedStyle(startButton).backgroundImage
        },
        oldSourceActionsRemoved: !document.querySelector('#explore-toys') && !document.querySelector('#my-models')
      };
    })()`
  });
  const ready = readyState.result.value;
  assert(ready.status === 'ready' && ready.label === '可打印', `Direct printer entry did not start in the ready state: ${JSON.stringify(ready)}`);
  assert(ready.taskNavigationVisible && ready.taskNavigationLabel === '任务导航区' && ready.queueCopy === '当前打印机处于空闲状态，可以开始打印队列中的任务啦。', `Ready state does not show the required task-navigation copy: ${JSON.stringify(ready)}`);
  assert(ready.taskSummaryHidden && ready.actionsHidden && ready.completionHidden && !ready.queueToggleHidden && !ready.queueHidden && ready.oldSourceActionsRemoved, `Ready state did not expose the queued girl tasks beneath task navigation: ${JSON.stringify(ready)}`);
  assert(ready.readyQueueTasks.length === 2 && ready.readyQueueTasks.every((task) => task.owner === 'girl' && task.image.includes('女孩的待打印任务') && task.label.includes('等待打印')) && ready.navigationBackground === 'rgb(255, 255, 255)' && ready.queueBadgeRemoved, `Ready queue content or task-navigation visual cleanup is incorrect: ${JSON.stringify(ready)}`);
  assert(ready.startButton.label === '开始打印' && ready.startButton.left > 0.2 && ready.startButton.right < 0.8 && ready.startButton.bottom > 0.7 && ready.startButton.color === 'rgb(255, 255, 255)' && ready.startButton.backgroundImage.includes('linear-gradient'), `Start-print action does not use the required centered blue-purple model-action styling: ${JSON.stringify(ready.startButton)}`);
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

  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#start-queued-print').click()` });
  await waitFor(cdp, `decodeURI(location.pathname).includes('dayinlvchengv3/index.html') && document.querySelector('#screen-settings')?.classList.contains('is-active') && document.querySelector('#settings-title')?.textContent === 'Choose your builder'`, 'Start-print action did not open the queued girl-task builder page.');
  await cdp.send('Page.navigate', { url: `${pageUrl}?status=completed&completed=1%2C2%2C3&family=multi` });
  await waitFor(cdp, `document.querySelector('#task-panel')?.dataset.status === 'completed' && document.querySelector('#next-plate-label')?.textContent === '探索玩具' && !document.querySelector('#next-plate')?.hidden`, 'All-boy-complete state did not replace next plate with Explore toys.');
  const completedBoyState = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => ({ label: document.querySelector('#next-plate-label').textContent, exploreStyle: document.querySelector('#next-plate').classList.contains('is-explore-toys'), localFileHidden: document.querySelector('#local-file').hidden }))()`
  });
  assert(completedBoyState.result.value.label === '探索玩具' && completedBoyState.result.value.exploreStyle && completedBoyState.result.value.localFileHidden, `All-boy-complete action was not rendered as Explore toys: ${JSON.stringify(completedBoyState.result.value)}`);
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#next-plate').click()` });
  await waitFor(cdp, `!document.querySelector('#reference-screen').hidden && decodeURI(document.querySelector('#reference-image').currentSrc).endsWith('探索玩具.jpg')`, 'Explore toys did not open the reused reference image.');
  const exploreJourneyHotspot = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const image = document.querySelector('#reference-image');
      if (!image.complete) await new Promise(resolve => image.addEventListener('load', resolve, { once: true }));
      const hotspot = document.querySelector('#explore-journey-hotspot');
      const imageRect = image.getBoundingClientRect();
      const hotspotRect = hotspot.getBoundingClientRect();
      return {
        visible: !hotspot.hidden,
        imageSize: { width: image.naturalWidth, height: image.naturalHeight },
        rect: {
          left: (hotspotRect.left - imageRect.left) / imageRect.width,
          top: (hotspotRect.top - imageRect.top) / imageRect.height,
          right: (hotspotRect.right - imageRect.left) / imageRect.width,
          bottom: (hotspotRect.bottom - imageRect.top) / imageRect.height
        }
      };
    })()`
  });
  assert(exploreJourneyHotspot.result.value.visible && exploreJourneyHotspot.result.value.imageSize.width === 1216 && exploreJourneyHotspot.result.value.imageSize.height === 2640, `Explore journey hotspot or source image is unavailable: ${JSON.stringify(exploreJourneyHotspot.result.value)}`);
  const exploreRect = exploreJourneyHotspot.result.value.rect;
  assert(Math.abs(exploreRect.left - 52 / 1216) < 0.001 && Math.abs(exploreRect.top - 1476 / 2640) < 0.001 && Math.abs(exploreRect.right - 589 / 1216) < 0.001 && Math.abs(exploreRect.bottom - 1907 / 2640) < 0.001, `Explore journey hotspot does not cover the Minion Bob thumbnail: ${JSON.stringify(exploreRect)}`);
  const exploreJourneyScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(exploreJourneyPreviewPath, Buffer.from(exploreJourneyScreenshot.data, 'base64'));
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#explore-journey-hotspot').click()` });
  await waitFor(cdp, `decodeURI(location.pathname).includes('dayinlvchengv2/打印旅程原型/index.html') && document.querySelector('#screen-model')?.classList.contains('is-active')`, 'Explore journey hotspot did not open the print journey home page.');

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
      return {
        open: dialog.open,
        prompt: document.querySelector('#dialog-title').textContent,
        copy: document.querySelector('#dialog-copy').textContent,
        dismiss: document.querySelector('#dialog-dismiss').textContent,
        confirm: document.querySelector('#dialog-confirm').textContent
      };
    })()`
  });
  assert(preparingCancellation.result.value.open && preparingCancellation.result.value.prompt === '当前打印机正在准备，是否需要取消？', `Preparing cancellation prompt is incorrect: ${JSON.stringify(preparingCancellation.result.value)}`);
  assert(preparingCancellation.result.value.copy === '' && preparingCancellation.result.value.dismiss === '暂不' && preparingCancellation.result.value.confirm === '取消任务', 'Preparing cancellation actions are incorrect.');
  const preparingCancelDialogScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(preparingCancelDialogPreviewPath, Buffer.from(preparingCancelDialogScreenshot.data, 'base64'));
  const dismissResult = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      document.querySelector('#dialog-dismiss').click();
      await new Promise(resolve => setTimeout(resolve, 50));
      return { dialogOpen: document.querySelector('#action-dialog').open, status: document.querySelector('#task-panel').dataset.status };
    })()`
  });
  assert(!dismissResult.result.value.dialogOpen && dismissResult.result.value.status === 'preparing', '暂不 did not return to the preparing page.');
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#cancel-print').click(); document.querySelector('#dialog-confirm').click()` });
  await delay(80);
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
      queueHidden: document.querySelector('#queue-toggle').hidden,
      connectionStatus: document.querySelector('#printer-connection-state').dataset.connectionStatus,
      connectionLabel: document.querySelector('#printer-connection-state-label').textContent,
      connectionImageHidden: document.querySelector('#printer-connection-state-image').hidden
    }))()`
  });
  assert(cancelledState.result.value.status === 'cancelled' && cancelledState.result.value.label === '已取消打印任务', `Preparing cancellation did not enter the minimal cancelled state: ${JSON.stringify(cancelledState.result.value)}`);
  assert(cancelledState.result.value.taskCopyHidden && cancelledState.result.value.preparationHidden && cancelledState.result.value.percentHidden && cancelledState.result.value.countdownHidden && cancelledState.result.value.progressHidden && cancelledState.result.value.actionsHidden && !cancelledState.result.value.queueHidden, `Cancelled state did not preserve its waiting print queue: ${JSON.stringify(cancelledState.result.value)}`);
  assert(cancelledState.result.value.connectionStatus === 'idle' && cancelledState.result.value.connectionLabel === '空闲' && !cancelledState.result.value.connectionImageHidden, `Cancelled task did not restore the idle connection indicator: ${JSON.stringify(cancelledState.result.value)}`);
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
      const wiping = readStage();
      for (let index = 0; index < 4; index += 1) advancePreparation();
      const homing = readStage();
      for (let index = 0; index < 4; index += 1) advancePreparation();
      const leveling = readStage();
      for (let index = 0; index < 4; index += 1) advancePreparation();
      const heating = readStage();
      for (let index = 0; index < 4; index += 1) advancePreparation();
      const afterThirtySeconds = {
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
      return { initial, analysisProgress, analysisComplete, stages: [calibration, wiping, homing, leveling, heating], afterThirtySeconds };
    })()`
  });
  const preparing = preparation.result.value;
  assert(preparing.initial.duration === 30 && preparing.initial.status === 'preparing' && preparing.initial.taskState === '准备中' && preparing.initial.progressState === '准备打印', `Initial preparation state is incorrect: ${JSON.stringify(preparing.initial)}`);
  assert(preparing.initial.preparingVisible && preparing.initial.taskPercentHidden && preparing.initial.countdownHidden && preparing.initial.printProgressHidden, 'Preparation content did not replace printing progress and countdown.');
  assert(preparing.initial.finishHidden && preparing.initial.pauseHidden && preparing.initial.queueHidden && preparing.initial.cancelVisible && preparing.initial.cancelCenterDelta <= 2, 'Preparation actions or queue visibility is incorrect.');
  assert(preparing.initial.connectionStatus === 'busy' && preparing.initial.connectionLabel === '忙碌' && preparing.initial.connectionImageHidden, `Preparing state did not expose the source busy indicator: ${JSON.stringify(preparing.initial)}`);
  assert(preparing.initial.spinner.width === preparing.initial.spinner.height && preparing.initial.spinner.animation !== 'none' && preparing.initial.spinner.borderTopColor !== preparing.initial.spinner.borderRightColor, `Preparation spinner is incorrect: ${JSON.stringify(preparing.initial.spinner)}`);
  assert(preparing.initial.theme.background === 'rgb(240, 237, 255)', `Preparation theme is not pale purple: ${JSON.stringify(preparing.initial.theme)}`);
  assert(preparing.initial.stage.label === '正在分析模型' && !preparing.initial.stage.percentHidden && preparing.initial.stage.percent === '0%', 'Analysis stage must begin at 0%.');
  assert(preparing.analysisProgress.length === 10 && preparing.analysisProgress.every((value, index, values) => index === 0 || value > values[index - 1]), `Analysis progress must rise in distinct jumps: ${JSON.stringify(preparing.analysisProgress)}`);
  assert(preparing.analysisComplete.label === '正在分析模型' && preparing.analysisComplete.percent === '100%' && !preparing.analysisComplete.percentHidden, 'Analysis progress must jump to 100% before the next stage.');
  assert(JSON.stringify(preparing.stages.map(stage => stage.label)) === JSON.stringify(['校准中', '擦嘴中', '归零中', '调平中', '升温中']) && preparing.stages.every(stage => stage.percentHidden), `Preparation stage order or percent visibility is incorrect: ${JSON.stringify(preparing.stages)}`);
  assert(preparing.afterThirtySeconds.status === 'printing' && preparing.afterThirtySeconds.preparingHidden && preparing.afterThirtySeconds.countdownVisible && preparing.afterThirtySeconds.printProgressVisible && preparing.afterThirtySeconds.finishVisible && preparing.afterThirtySeconds.pauseVisible && preparing.afterThirtySeconds.queueVisible, `Preparation did not switch to printing after 30 seconds: ${JSON.stringify(preparing.afterThirtySeconds)}`);
  assert(preparing.afterThirtySeconds.connectionStatus === 'busy' && preparing.afterThirtySeconds.connectionLabel === '忙碌' && preparing.afterThirtySeconds.connectionImageHidden, `Printing transition did not keep the source busy indicator: ${JSON.stringify(preparing.afterThirtySeconds)}`);

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
      const pausedTime = document.querySelector('#remaining-time').textContent;
      await wait(1100);
      const pausedTimeAfterWait = document.querySelector('#remaining-time').textContent;
      const pausedTheme = document.querySelector('#task-panel').dataset.status;
      const pausedConnection = {
        status: document.querySelector('#printer-connection-state').dataset.connectionStatus,
        imageHidden: document.querySelector('#printer-connection-state-image').hidden
      };
      pause.click();

      const queueToggle = document.querySelector('#queue-toggle');
      queueToggle.click();
      const queuedReference = {
        loaded: [...document.querySelectorAll('[data-queue-task]:not([hidden]) .queue-task-artwork')].every(image => image.complete && image.naturalWidth > 0),
        srcs: [...document.querySelectorAll('[data-queue-task]:not([hidden]) .queue-task-artwork')].map(image => decodeURI(image.currentSrc)),
        plates: [...document.querySelectorAll('[data-queue-task]:not([hidden])')].map(task => task.dataset.plate),
        taskCount: document.querySelectorAll('[data-queue-task]:not([hidden])').length
      };

      const filamentReference = document.querySelector('#filament-panel-image');
      const slotHotspots = [...document.querySelectorAll('.filament-slot-hotspot')];
      document.querySelector('.filament-slot-hotspot[data-slot-index="rack"]').click();
      const externalRackSelectable = document.querySelector('.filament-slot-hotspot[data-slot-index="rack"]').getAttribute('aria-pressed') === 'true';
      document.querySelector('.filament-slot-hotspot[data-slot-index="2"]').click();
      await wait(220);
      const selectedSlot = document.querySelector('.filament-slot-hotspot[aria-pressed="true"]').dataset.slotIndex;
      const pointerSlot = document.querySelector('#filament-pointer').dataset.slotIndex;
      const pointerPosition = document.querySelector('#filament-pointer').style.left;
      const directActionsPresent = Boolean(document.querySelector('#load-filament')) && Boolean(document.querySelector('#unload-filament'));
      const oldPanelRemoved = !document.querySelector('#filament-settings, #filament-sheet, #filament-reference');
      const filamentFrame = document.querySelector('.filament-panel-frame').getBoundingClientRect();
      const filamentCanvas = document.querySelector('.filament-panel-canvas')?.getBoundingClientRect();
      const filamentImage = filamentReference.getBoundingClientRect();
      const taskPanelRect = document.querySelector('#task-panel').getBoundingClientRect();
      const controlsRect = document.querySelector('.controls-section').getBoundingClientRect();
      const relativeToFilamentFrame = (selector) => {
        const rect = document.querySelector(selector).getBoundingClientRect();
        return {
          left: (rect.left - filamentFrame.left) / filamentFrame.width,
          top: (rect.top - filamentFrame.top) / filamentFrame.height,
          right: (rect.right - filamentFrame.left) / filamentFrame.width,
          bottom: (rect.bottom - filamentFrame.top) / filamentFrame.height,
          centerX: (rect.left + rect.width / 2 - filamentFrame.left) / filamentFrame.width
        };
      };
      const filamentGeometry = {
        naturalWidth: filamentReference.naturalWidth,
        naturalHeight: filamentReference.naturalHeight,
        renderedWidth: filamentImage.width,
        renderedHeight: filamentImage.height,
        renderedRatio: filamentImage.width / filamentImage.height,
        visiblePanelHeight: filamentImage.height * 309 / 323,
        configuredMaxHeight: getComputedStyle(document.querySelector('.filament-panel-frame')).maxHeight,
        frameWidthDelta: Math.abs(filamentFrame.width - filamentImage.width),
        canvasPresent: Boolean(filamentCanvas),
        imageOverflowBelowFrame: filamentImage.bottom - filamentFrame.bottom,
        controlsTopGap: controlsRect.top - filamentFrame.bottom,
        visibleLeftDelta: Math.abs((filamentImage.left + filamentImage.width * 15 / 465) - taskPanelRect.left),
        visibleRightDelta: Math.abs((filamentImage.right - filamentImage.width * 15 / 465) - taskPanelRect.right),
        selectedSlot: relativeToFilamentFrame('.filament-slot-hotspot[data-slot-index="2"]'),
        pointer: relativeToFilamentFrame('#filament-pointer'),
        load: relativeToFilamentFrame('#load-filament'),
        unload: relativeToFilamentFrame('#unload-filament')
      };

      const soundSwitch = document.querySelector('[data-control="sound"] .switch');
      soundSwitch.click();
      const switchWorked = soundSwitch.getAttribute('aria-pressed') === 'false';

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
        percent: document.querySelector('#task-percent').textContent,
        time: document.querySelector('#remaining-time').textContent,
        actionsVisible: !document.querySelector('#task-actions').hidden,
        completionHidden: document.querySelector('#completion-actions').hidden,
        connectionStatus: document.querySelector('#printer-connection-state').dataset.connectionStatus,
        connectionImageHidden: document.querySelector('#printer-connection-state-image').hidden
      };
      await wait(1900);

      return {
        viewport: { width: document.documentElement.clientWidth, height: innerHeight },
        taskReference,
        countdownWorked: timeBeforeTick !== timeAfterTick,
        pauseWorked: pausedTheme === 'paused' && pausedTime === pausedTimeAfterWait,
        pausedConnection,
        queuedReference,
        filamentReference: { loaded: filamentReference.complete && filamentReference.naturalWidth > 0, src: decodeURI(filamentReference.currentSrc) },
        slotHotspotCount: slotHotspots.length,
        directActionsPresent,
        oldPanelRemoved,
        externalRackSelectable,
        selectedSlot,
        pointerSlot,
        pointerPosition,
        filamentGeometry,
        switchWorked,
        completed,
        restarted,
        pageHeight: document.documentElement.scrollHeight
      };
    })()`
  });

  const result = evaluation.result.value;
  assert(result.viewport.width === 390, `Expected a 390px viewport, got ${result.viewport.width}px.`);
  assert(result.taskReference.loaded && result.taskReference.src.endsWith('选中要打印的盘1.jpg'), 'Plate 1 task artwork did not load.');
  assert(result.taskReference.title === '史蒂夫_01_012214' && result.taskReference.meta.includes('5 h 15 min'), 'Plate 1 task name or duration is incorrect.');
  assert(result.taskReference.initialTime === '05:15:00', 'Printing countdown must begin at 5 h 15 min.');
  assert(result.countdownWorked, 'Countdown did not decrement.');
  assert(result.pauseWorked, 'Pause did not freeze the countdown or apply paused status.');
  assert(result.pausedConnection.status === 'busy' && result.pausedConnection.imageHidden, `Paused state did not retain the source busy indicator: ${JSON.stringify(result.pausedConnection)}`);
  assert(result.queuedReference.loaded && result.queuedReference.taskCount === 2, 'Print queue images or task controls are incorrect.');
  assert(JSON.stringify(result.queuedReference.plates) === JSON.stringify(['2', '3']), `Plate 1 queue should contain plates 2 and 3: ${JSON.stringify(result.queuedReference)}`);
  assert(result.queuedReference.srcs[0].endsWith('打印队列2.jpg') && result.queuedReference.srcs[1].endsWith('打印队列3.jpg'), `Plate 1 queue artwork is incorrect: ${JSON.stringify(result.queuedReference)}`);
  assert(result.filamentReference.loaded && result.filamentReference.src.endsWith('dayinjihaocai/耗材面板.png'), 'Required replacement filament-panel image did not load.');
  assert(result.slotHotspotCount === 5 && result.directActionsPresent && result.oldPanelRemoved, 'Replacement filament panel did not remove the old sheet or expose the required direct hotspots.');
  assert(result.externalRackSelectable, 'External tray could not be selected from the replacement filament panel.');
  assert(result.selectedSlot === '2', 'Material slot selection did not synchronize on the replacement panel.');
  assert(result.pointerSlot === '2' && result.pointerPosition === '52.1%', 'Material pointer did not move to the selected slot.');
  assert(result.filamentGeometry.naturalWidth === 465 && result.filamentGeometry.naturalHeight === 323, `Replacement filament artwork has unexpected dimensions: ${JSON.stringify(result.filamentGeometry)}`);
  assert(Math.abs(result.filamentGeometry.renderedWidth - 382.6875) < 0.5, `Filament panel width changed from the established width: ${JSON.stringify(result.filamentGeometry)}`);
  assert(Math.abs(result.filamentGeometry.visiblePanelHeight - 250) < 0.5, `Visible filament panel body is not actually 250px tall: ${JSON.stringify(result.filamentGeometry)}`);
  assert(Number.parseFloat(result.filamentGeometry.configuredMaxHeight) >= 250, `Filament panel constrains its overall height below the visible 250px body: ${JSON.stringify(result.filamentGeometry)}`);
  assert(result.filamentGeometry.canvasPresent && result.filamentGeometry.frameWidthDelta < 0.5, `Filament artwork canvas is missing or changed width: ${JSON.stringify(result.filamentGeometry)}`);
  assert(result.filamentGeometry.imageOverflowBelowFrame > 9 && result.filamentGeometry.imageOverflowBelowFrame < 12, `The PNG bottom gutter was not cropped from the visible panel: ${JSON.stringify(result.filamentGeometry)}`);
  assert(Math.abs(result.filamentGeometry.controlsTopGap - 16) < 0.5, `Controls panel did not move down with the taller filament panel: ${JSON.stringify(result.filamentGeometry)}`);
  assert(result.filamentGeometry.visibleLeftDelta < 1 && result.filamentGeometry.visibleRightDelta < 1, `Visible filament panel is not aligned with the print task panel: ${JSON.stringify(result.filamentGeometry)}`);
  assert(result.filamentGeometry.selectedSlot.left > 0.43 && result.filamentGeometry.selectedSlot.top < 0.27, 'Selected Food Box hotspot does not cover the source artwork.');
  assert(result.filamentGeometry.pointer.centerX > 0.51 && result.filamentGeometry.pointer.centerX < 0.53 && result.filamentGeometry.pointer.top > 0.48 && result.filamentGeometry.pointer.bottom < 0.56, `Moving pointer does not align beneath the selected Food Box slot: ${JSON.stringify(result.filamentGeometry.pointer)}`);
  assert(result.filamentGeometry.load.left < 0.09 && result.filamentGeometry.load.top > 0.68 && result.filamentGeometry.load.right < 0.5, 'Load hotspot does not cover the left source-art button.');
  assert(result.filamentGeometry.unload.left > 0.5 && result.filamentGeometry.unload.top > 0.68 && result.filamentGeometry.unload.right > 0.9, 'Unload hotspot does not cover the right source-art button.');
  assert(result.switchWorked, 'Device control switch did not toggle.');
  assert(result.completed.status === 'completed', 'Finish shortcut did not enter completed state.');
  assert(result.completed.percent === '100%' && result.completed.time === '00:00:00', 'Completed state did not reach 100% and zero time.');
  assert(result.completed.actionsVisible, 'Completed state actions are not visible.');
  assert(result.completed.activeActionsHidden, 'Pause and cancel actions remained visible after completion.');
  assert(result.completed.nextPlateVisible, 'Next plate should be visible while the queue is not empty.');
  assert(result.completed.restartLabel === '重新打印', 'Completed left action must be named 重新打印.');
  assert(result.completed.connectionStatus === 'idle' && result.completed.connectionLabel === '空闲' && !result.completed.connectionImageHidden, `Completed state did not switch the header to idle: ${JSON.stringify(result.completed)}`);
  assert(result.restarted.status === 'printing' && result.restarted.percent === '0%' && result.restarted.time === '05:15:00', `Restart did not reset the printing task: ${JSON.stringify(result.restarted)}`);
  assert(result.restarted.actionsVisible && result.restarted.completionHidden, 'Restart did not restore active task controls.');
  assert(result.restarted.connectionStatus === 'busy' && result.restarted.connectionImageHidden, `Restart did not restore the source busy indicator: ${JSON.stringify(result.restarted)}`);

  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('.filament-panel').scrollIntoView({ block: 'center' })` });
  await delay(180);
  const filamentPanelScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(filamentPanelPreviewPath, Buffer.from(filamentPanelScreenshot.data, 'base64'));

  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#queue-toggle').click(); document.querySelector('[data-queue-task][data-plate="2"]').click()` });
  await waitFor(cdp, `document.title === '自研款打印机打印旅程原型' && !document.querySelector('#step-material')?.hidden`, 'Queue plate 2 did not open its Choose your color page directly.');
  const queueTwoColor = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => ({
      title: document.querySelector('#settings-title').textContent,
      builderHidden: document.querySelector('#step-plate').hidden,
      colorVisible: !document.querySelector('#step-material').hidden,
      selectedPlate: document.querySelector('.plate-card.is-selected')?.dataset.plate,
      activePlate: new URLSearchParams(location.search).get('plate'),
      selectedParam: new URLSearchParams(location.search).get('selected'),
      entry: new URLSearchParams(location.search).get('entry'),
      image: decodeURI(document.querySelector('#selected-model-image').currentSrc),
      startDisabled: document.querySelector('#start-print').disabled
    }))()`
  });
  assert(queueTwoColor.result.value.title === 'Choose  your  color' && queueTwoColor.result.value.builderHidden && queueTwoColor.result.value.colorVisible, `Queue plate 2 landed on the wrong settings step: ${JSON.stringify(queueTwoColor.result.value)}`);
  assert(queueTwoColor.result.value.selectedPlate === '2' && queueTwoColor.result.value.activePlate === '1' && queueTwoColor.result.value.selectedParam === '2' && queueTwoColor.result.value.entry === 'queue', `Queue plate and active print context were not separated: ${JSON.stringify(queueTwoColor.result.value)}`);
  assert(queueTwoColor.result.value.image.endsWith('选择要打印的盘2（修改）.jpg') && queueTwoColor.result.value.startDisabled, 'Queue plate 2 did not reuse the modified plate image or preserve the printing lock.');
  const queueTwoColorScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(queueTwoColorPreviewPath, Buffer.from(queueTwoColorScreenshot.data, 'base64'));
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#settings-back').click()` });
  await waitFor(cdp, `document.title === '自研款打印机打印页面原型' && document.querySelector('#task-panel')?.dataset.status === 'printing'`, 'Queue color back did not return directly to the printer page.');
  const queueBack = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => ({
      plate: new URLSearchParams(location.search).get('plate'),
      status: document.querySelector('#task-panel').dataset.status,
      image: decodeURI(document.querySelector('#active-task-image').currentSrc)
    }))()`
  });
  assert(queueBack.result.value.plate === '1' && queueBack.result.value.status === 'printing' && queueBack.result.value.image.endsWith('选中要打印的盘1.jpg'), `Queue color back did not preserve the active printer task: ${JSON.stringify(queueBack.result.value)}`);

  const plateTwoMapping = await inspectPlateMapping(cdp, '2');
  assert(plateTwoMapping.activeSrc.endsWith('选择要打印的盘2（修改）.jpg'), `Plate 2 active artwork is incorrect: ${JSON.stringify(plateTwoMapping)}`);
  assert(plateTwoMapping.title === '史蒂夫_02_012209' && plateTwoMapping.meta.includes('3 h 48 min') && plateTwoMapping.time === '03:48:00', `Plate 2 task details are incorrect: ${JSON.stringify(plateTwoMapping)}`);
  assert(JSON.stringify(plateTwoMapping.queuePlates) === JSON.stringify(['1', '3']) && plateTwoMapping.queueSrcs[0].endsWith('打印队列1.jpg') && plateTwoMapping.queueSrcs[1].endsWith('打印队列3.jpg'), `Plate 2 queue mapping is incorrect: ${JSON.stringify(plateTwoMapping)}`);
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#queue-toggle').click()` });
  const plateTwoLayout = await cdp.send('Page.getLayoutMetrics');
  const plateTwoScreenshot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: 390, height: Math.ceil(plateTwoLayout.cssContentSize.height), scale: 1 }
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

  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#queued-task').click()` });
  await waitFor(cdp, `document.title === '自研款打印机打印旅程原型' && !document.querySelector('#step-material')?.hidden && document.querySelector('.plate-card.is-selected')?.dataset.plate === '2'`, 'Boy queue task did not open its v2 Choose your color page directly.');
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#settings-back').click()` });
  await waitFor(cdp, `document.title === '自研款打印机打印页面原型' && new URLSearchParams(location.search).get('family') === 'multi' && document.querySelector('#task-panel')?.dataset.status === 'printing'`, 'Boy queue color back did not preserve the multi-account context.');
  const boyQueueBack = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => ({ search: location.search, status: document.querySelector('#task-panel').dataset.status, count: document.querySelectorAll('[data-queue-task]:not([hidden])').length, owners: [...document.querySelectorAll('[data-queue-task]:not([hidden])')].map(task => task.dataset.owner) }))()`
  });
  assert(boyQueueBack.result.value.status === 'printing' && boyQueueBack.result.value.count === 4 && JSON.stringify(boyQueueBack.result.value.owners) === JSON.stringify(['boy', 'boy', 'girl', 'girl']), `Boy queue back lost the four-task multi-account queue: ${JSON.stringify(boyQueueBack.result.value)}`);

  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#queue-toggle').click(); document.querySelector('#queued-girl-task-one').click()` });
  await waitFor(cdp, `document.title === '自研款打印机打印旅程原型' && !document.querySelector('#step-material')?.hidden && document.querySelector('.plate-card.is-selected')?.dataset.task === 'girl-1'`, 'Girl queue task did not open its v3 Choose your color page directly.');
  const girlQueueRoute = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => ({
      action: document.querySelector('#start-print').textContent,
      actionDisabled: document.querySelector('#start-print').disabled,
      noticeVisible: !document.querySelector('#printing-notice').hidden,
      preview: decodeURI(document.querySelector('#selected-model-image').currentSrc),
      backTarget: new URLSearchParams(location.search).get('return')
    }))()`
  });
  const girlRoute = girlQueueRoute.result.value;
  assert(girlRoute.action === 'Create it' && girlRoute.actionDisabled && girlRoute.noticeVisible && girlRoute.preview.endsWith('女孩的打印任务_1.jpg') && girlRoute.backTarget === 'printer', `Girl queue route has the wrong v3 state: ${JSON.stringify(girlRoute)}`);
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#settings-back').click()` });
  await waitFor(cdp, `document.title === '自研款打印机打印页面原型' && document.querySelector('#task-panel')?.dataset.status === 'printing'`, 'Girl queue color back did not return directly to the printer.');
  const girlQueueBack = await cdp.send('Runtime.evaluate', { returnByValue: true, expression: `document.querySelectorAll('[data-queue-task]:not([hidden])').length` });
  assert(girlQueueBack.result.value === 4, `Girl queue back lost the multi-account queue: ${girlQueueBack.result.value}`);

  await cdp.send('Page.navigate', { url: `${pageUrl}?status=completed&family=multi` });
  await delay(500);
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#queue-toggle').click(); document.querySelector('#queued-girl-task-one').click()` });
  await waitFor(cdp, `document.title === '自研款打印机打印旅程原型' && !document.querySelector('#step-material')?.hidden && document.querySelector('.plate-card.is-selected')?.dataset.task === 'girl-1'`, 'Completed printer girl queue task did not open its color page.');
  const completedGirlQueue = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => ({ action: document.querySelector('#start-print').textContent, disabled: document.querySelector('#start-print').disabled, noticeVisible: !document.querySelector('#printing-notice').hidden }))()`
  });
  assert(completedGirlQueue.result.value.action === 'Create it' && !completedGirlQueue.result.value.disabled && !completedGirlQueue.result.value.noticeVisible, `Completed printer girl queue page has the wrong action state: ${JSON.stringify(completedGirlQueue.result.value)}`);
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#start-print').click()` });
  await waitFor(cdp, `document.title === '自研款打印机打印页面原型' && new URLSearchParams(location.search).get('activeTask') === 'girl-1' && document.querySelector('#task-panel')?.dataset.status === 'printing'`, 'Completed girl queue Create it did not promote the selected girl task to the active printing task.');
  const completedGirlCreated = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => ({ completed: new URLSearchParams(location.search).get('completed'), activeSrc: decodeURI(document.querySelector('#active-task-image').currentSrc), activeOwner: document.querySelector('#active-task-owner-card').dataset.owner, count: document.querySelectorAll('[data-queue-task]:not([hidden])').length, owners: [...document.querySelectorAll('[data-queue-task]:not([hidden])')].map(task => task.dataset.owner) }))()`
  });
  assert(completedGirlCreated.result.value.completed === '1' && completedGirlCreated.result.value.activeSrc.endsWith('女孩的打印任务_1.jpg') && completedGirlCreated.result.value.activeOwner === 'girl', `Girl Create it did not render the girl task in the active model region: ${JSON.stringify(completedGirlCreated.result.value)}`);
  assert(completedGirlCreated.result.value.count === 3 && JSON.stringify(completedGirlCreated.result.value.owners) === JSON.stringify(['boy', 'boy', 'girl']), `Girl Create it did not retain only the remaining tasks: ${JSON.stringify(completedGirlCreated.result.value)}`);
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#queue-toggle').click()` });
  const girlActivePrintingScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  fs.writeFileSync(girlActivePrintingPreviewPath, Buffer.from(girlActivePrintingScreenshot.data, 'base64'));
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#queue-toggle').click()` });
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#queue-toggle').click(); document.querySelector('[data-queue-task][data-task="girl-2"]').click()` });
  await waitFor(cdp, `document.title === '自研款打印机打印旅程原型' && document.querySelector('.plate-card.is-selected')?.dataset.task === 'girl-2'`, 'Remaining girl queue task did not open its color page.');
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#settings-back').click()` });
  await waitFor(cdp, `document.title === '自研款打印机打印页面原型' && new URLSearchParams(location.search).get('activeTask') === 'girl-1' && document.querySelector('#task-panel')?.dataset.status === 'printing'`, 'Girl queue back did not restore the active girl printing task.');

  await cdp.send('Page.navigate', { url: `${pageUrl}?status=completed&family=multi` });
  await delay(500);
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#queue-toggle').click(); document.querySelector('#queued-task').click()` });
  await waitFor(cdp, `document.title === '自研款打印机打印旅程原型' && !document.querySelector('#step-material')?.hidden && document.querySelector('.plate-card.is-selected')?.dataset.plate === '2'`, 'Completed printer boy queue task did not open its color page.');
  const completedBoyQueue = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => ({ action: document.querySelector('#start-print').textContent, disabled: document.querySelector('#start-print').disabled }))()`
  });
  assert(completedBoyQueue.result.value.action === 'Create it' && !completedBoyQueue.result.value.disabled, `Completed printer boy queue page has the wrong action state: ${JSON.stringify(completedBoyQueue.result.value)}`);
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#start-print').click()` });
  await waitFor(cdp, `document.title === '自研款打印机打印页面原型' && new URLSearchParams(location.search).get('plate') === '2' && new URLSearchParams(location.search).get('family') === 'multi' && document.querySelector('#task-panel')?.dataset.status === 'printing'`, 'Completed boy queue Create it did not return to the multi-account printing page.');
  const completedBoyCreated = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => ({ completed: new URLSearchParams(location.search).get('completed'), count: document.querySelectorAll('[data-queue-task]:not([hidden])').length, owners: [...document.querySelectorAll('[data-queue-task]:not([hidden])')].map(task => task.dataset.owner) }))()`
  });
  assert(completedBoyCreated.result.value.completed === '1' && completedBoyCreated.result.value.count === 3 && JSON.stringify(completedBoyCreated.result.value.owners) === JSON.stringify(['boy', 'girl', 'girl']), `Created boy task did not remove it from the multi-account queue: ${JSON.stringify(completedBoyCreated.result.value)}`);

  await cdp.send('Page.navigate', { url: `${pageUrl}?status=completed&family=multi` });
  await delay(500);
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#next-plate').click()` });
  await waitFor(cdp, `document.title === '自研款打印机打印旅程原型' && !document.querySelector('#step-plate')?.hidden && document.querySelector('#settings-title')?.textContent === 'Choose your builder'`, 'Next plate did not open the Choose your builder page.');

  await cdp.send('Page.navigate', { url: `${pageUrl}?status=preparing` });
  await delay(500);

  const layout = await cdp.send('Page.getLayoutMetrics');
  const screenshot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: 390, height: Math.ceil(layout.cssContentSize.height), scale: 1 }
  });
  fs.writeFileSync(previewPath, Buffer.from(screenshot.data, 'base64'));

  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#finish-now').click()` });
  const completedActionsLayout = await cdp.send('Page.getLayoutMetrics');
  const completedActionsScreenshot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: 390, height: Math.ceil(completedActionsLayout.cssContentSize.height), scale: 1 }
  });
  fs.writeFileSync(completedActionsPreviewPath, Buffer.from(completedActionsScreenshot.data, 'base64'));
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#next-plate').click()` });
  await waitFor(cdp, `document.title === '自研款打印机打印旅程原型' && document.querySelector('#settings-title')?.textContent === 'Choose your builder' && document.querySelector('#screen-settings')?.dataset.jobStatus === 'completed' && Boolean(document.querySelector('.plate-card.has-job-status'))`, 'Next plate did not open the completed Choose your builder page.');
  const nextPlate = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const selected = document.querySelector('.plate-card.is-selected');
      const tagged = document.querySelector('.plate-card.has-job-status');
      return {
        search: location.search,
        title: document.querySelector('#settings-title')?.textContent ?? null,
        selectedPlate: selected?.dataset.plate ?? null,
        taggedPlate: tagged?.dataset.plate ?? null,
        tag: tagged?.querySelector('.plate-status-tag')?.textContent ?? null,
        status: document.querySelector('#screen-settings')?.dataset.jobStatus ?? null
      };
    })()`
  });
  assert(nextPlate.result.value.title === 'Choose your builder' && nextPlate.result.value.status === 'completed' && nextPlate.result.value.search.includes('completed=1'), `Next plate opened the wrong preparation state: ${JSON.stringify(nextPlate.result.value)}`);
  assert(nextPlate.result.value.selectedPlate === '1' && nextPlate.result.value.taggedPlate === '1' && nextPlate.result.value.tag === '已打印', 'Completed plate does not retain its 已打印 tag on the builder page.');
  const nextPlateScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(nextPlatePreviewPath, Buffer.from(nextPlateScreenshot.data, 'base64'));

  await cdp.send('Page.navigate', { url: `${pageUrl}?status=printing` });
  await waitFor(cdp, `typeof renderPlateTaskAndQueue === 'function' && Boolean(document.querySelector('#cancel-print'))`, 'Printer page did not become ready for cancellation testing.');
  const cancellation = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      document.querySelector('#cancel-print').click();
      document.querySelector('#action-dialog').close('confirm');
      await new Promise(resolve => setTimeout(resolve, 50));
      return {
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
  assert(cancellation.result.value.status === 'cancelled', `Cancel confirmation did not enter cancelled state: ${JSON.stringify(cancellation.result.value)}`);
  assert(cancellation.result.value.label === '已取消打印任务' && cancellation.result.value.taskCopyHidden && cancellation.result.value.actionsHidden, 'Cancelled state did not retain the required status label and simplified controls.');
  assert(!cancellation.result.value.queueToggleHidden && !cancellation.result.value.queueHidden && cancellation.result.value.queueExpanded === 'true', `Cancelled state did not automatically show the print queue: ${JSON.stringify(cancellation.result.value)}`);
  assert(cancellation.result.value.queueTasks.length === 3 && cancellation.result.value.queueTasks[0].id === 'plate-1' && cancellation.result.value.queueTasks[0].image.endsWith('打印队列1.jpg') && cancellation.result.value.queueTasks[0].label.includes('等待打印'), `Cancelled task was not restored as the first waiting task using its matching queue image: ${JSON.stringify(cancellation.result.value)}`);

  await cdp.send('Page.navigate', { url: `${pageUrl}?plate=3&completed=1%2C2&status=printing` });
  await delay(500);
  const singlePlateCompletion = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      document.querySelector('#finish-now').click();
      const localImage = document.querySelector('#local-file img');
      return {
        exploreToysVisible: !document.querySelector('#next-plate').hidden,
        exploreToysLabel: document.querySelector('#next-plate-label').textContent,
        localFileHidden: document.querySelector('#local-file').hidden,
        localFileLoaded: localImage.complete && localImage.naturalWidth > 0,
        queueHidden: document.querySelector('#queue-toggle').hidden
      };
    })()`
  });
  assert(singlePlateCompletion.result.value.exploreToysVisible && singlePlateCompletion.result.value.exploreToysLabel === '探索玩具', 'All-boy-completed state did not replace next plate with Explore toys.');
  assert(singlePlateCompletion.result.value.localFileHidden && singlePlateCompletion.result.value.localFileLoaded, 'Explore-toys completion state did not hide the local-file image action.');
  assert(singlePlateCompletion.result.value.queueHidden, 'All-completed state did not hide the empty queue.');

  await cdp.send('Page.reload');
  await delay(350);
  const feeding = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      document.querySelector('#load-filament').click();
      await new Promise(resolve => setTimeout(resolve, 100));
      const image = document.querySelector('#filament-operation-image');
      const frame = document.querySelector('.filament-operation-frame').getBoundingClientRect();
      const relativeRect = (selector) => {
        const rect = document.querySelector(selector).getBoundingClientRect();
        return { left: (rect.left - frame.left) / frame.width, top: (rect.top - frame.top) / frame.height, right: (rect.right - frame.left) / frame.width, bottom: (rect.bottom - frame.top) / frame.height };
      };
      return {
        visible: !document.querySelector('#filament-operation-screen').hidden,
        loaded: image.complete && image.naturalWidth > 0,
        src: decodeURI(image.currentSrc),
        deviceInert: document.querySelector('#device-page').inert,
        closeHotspot: relativeRect('#close-filament-operation'),
        cancelHotspot: relativeRect('#cancel-filament-operation')
      };
    })()`
  });
  assert(feeding.result.value.visible && feeding.result.value.loaded && feeding.result.value.src.endsWith('进料中.jpg'), 'Printing prototype did not open the feeding reference page.');
  assert(feeding.result.value.deviceInert, 'Printing prototype must be inert while feeding is active.');
  assert(feeding.result.value.closeHotspot.left > 0.85 && feeding.result.value.closeHotspot.top > 0.22 && feeding.result.value.closeHotspot.bottom < 0.32, 'Printing prototype feeding close hotspot is misplaced.');
  assert(feeding.result.value.cancelHotspot.left < 0.07 && feeding.result.value.cancelHotspot.top > 0.9 && feeding.result.value.cancelHotspot.bottom <= 1, 'Printing prototype feeding cancel hotspot is misplaced.');
  const feedingScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(feedingPreviewPath, Buffer.from(feedingScreenshot.data, 'base64'));
  const feedingClose = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      document.querySelector('#close-filament-operation').click();
      return { hidden: document.querySelector('#filament-operation-screen').hidden, message: document.querySelector('#toast').textContent };
    })()`
  });
  assert(feedingClose.result.value.hidden && feedingClose.result.value.message === '已取消进料', 'Printing prototype feeding close control did not exit with the required message.');
  const feedingCancellation = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      document.querySelector('#load-filament').click();
      document.querySelector('#cancel-filament-operation').click();
      return { hidden: document.querySelector('#filament-operation-screen').hidden, message: document.querySelector('#toast').textContent };
    })()`
  });
  assert(feedingCancellation.result.value.hidden && feedingCancellation.result.value.message === '已取消进料', 'Printing prototype did not cancel feeding with the required message.');

  const retracting = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      document.querySelector('#unload-filament').click();
      await new Promise(resolve => setTimeout(resolve, 100));
      const image = document.querySelector('#filament-operation-image');
      const frame = document.querySelector('.filament-operation-frame').getBoundingClientRect();
      const relativeRect = (selector) => {
        const rect = document.querySelector(selector).getBoundingClientRect();
        return { left: (rect.left - frame.left) / frame.width, top: (rect.top - frame.top) / frame.height, right: (rect.right - frame.left) / frame.width, bottom: (rect.bottom - frame.top) / frame.height };
      };
      return { visible: !document.querySelector('#filament-operation-screen').hidden, loaded: image.complete && image.naturalWidth > 0, src: decodeURI(image.currentSrc), closeHotspot: relativeRect('#close-filament-operation'), cancelHotspot: relativeRect('#cancel-filament-operation') };
    })()`
  });
  assert(retracting.result.value.visible && retracting.result.value.loaded && retracting.result.value.src.endsWith('退料中.jpg'), 'Printing prototype did not open the retracting reference page.');
  assert(retracting.result.value.closeHotspot.left > 0.85 && retracting.result.value.closeHotspot.top > 0.4 && retracting.result.value.closeHotspot.bottom < 0.5, 'Printing prototype retracting close hotspot is misplaced.');
  assert(retracting.result.value.cancelHotspot.left < 0.07 && retracting.result.value.cancelHotspot.top > 0.9 && retracting.result.value.cancelHotspot.bottom <= 1, 'Printing prototype retracting cancel hotspot is misplaced.');
  const retractingScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(retractingPreviewPath, Buffer.from(retractingScreenshot.data, 'base64'));
  const retractingClose = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      document.querySelector('#close-filament-operation').click();
      return { hidden: document.querySelector('#filament-operation-screen').hidden, message: document.querySelector('#toast').textContent };
    })()`
  });
  assert(retractingClose.result.value.hidden && retractingClose.result.value.message === '已取消退料', 'Printing prototype retracting close control did not exit with the required message.');
  const retractingCancellation = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      document.querySelector('#unload-filament').click();
      document.querySelector('#cancel-filament-operation').click();
      return { hidden: document.querySelector('#filament-operation-screen').hidden, message: document.querySelector('#toast').textContent };
    })()`
  });
  assert(retractingCancellation.result.value.hidden && retractingCancellation.result.value.message === '已取消退料', 'Printing prototype did not cancel retracting with the required message.');

  const responsiveLayouts = [];
  for (const width of [320, 768, 1024, 1440]) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: width <= 390 });
    const metrics = await cdp.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const taskRect = document.querySelector('#task-panel').getBoundingClientRect();
        const imageRect = document.querySelector('#filament-panel-image').getBoundingClientRect();
        return {
          viewportWidth: document.documentElement.clientWidth,
          documentWidth: document.documentElement.scrollWidth,
          shellWidth: Math.round(document.querySelector('.phone-shell').getBoundingClientRect().width),
          filamentVisibleRatio: imageRect.width / (imageRect.height * 309 / 323),
          filamentLeftDelta: Math.abs((imageRect.left + imageRect.width * 15 / 465) - taskRect.left),
          filamentRightDelta: Math.abs((imageRect.right - imageRect.width * 15 / 465) - taskRect.right)
        };
      })()`
    });
    responsiveLayouts.push(metrics.result.value);
  }
  responsiveLayouts.forEach((layout) => {
    assert(layout.documentWidth === layout.viewportWidth, `Horizontal overflow detected at ${layout.viewportWidth}px.`);
    assert(layout.shellWidth === Math.min(layout.viewportWidth, 390), `Unexpected phone shell width at ${layout.viewportWidth}px.`);
    assert(Math.abs(layout.filamentVisibleRatio - 382.6875 / 250) < 0.01, `Visible filament panel ratio changed at ${layout.viewportWidth}px.`);
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

  console.log(JSON.stringify({ ready, readyConnection: readyConnection.result.value, offlineConnection: offlineConnection.result.value, exploreJourneyHotspot: exploreJourneyHotspot.result.value, preparingCancellation: preparingCancellation.result.value, cancelledState: cancelledState.result.value, preparation: preparing, ...result, queueTwoColor: queueTwoColor.result.value, queueBack: queueBack.result.value, plateTwoMapping, plateThreeMapping, nextPlate: nextPlate.result.value, cancellation: cancellation.result.value, singlePlateCompletion: singlePlateCompletion.result.value, feeding: feeding.result.value, feedingClose: feedingClose.result.value, feedingCancellation: feedingCancellation.result.value, retracting: retracting.result.value, retractingClose: retractingClose.result.value, retractingCancellation: retractingCancellation.result.value, responsiveLayouts, unnamedButtons: 0, browserErrors: 0, readyPreviewPath, offlineConnectionPreviewPath, exploreJourneyPreviewPath, preparingPreviewPath, preparingCancelDialogPreviewPath, cancelledPreviewPath, previewPath, plateTwoQueuePreviewPath, queueTwoColorPreviewPath, multiAccountQueuePreviewPath, girlActivePrintingPreviewPath, completedActionsPreviewPath, nextPlatePreviewPath, filamentPanelPreviewPath, feedingPreviewPath, retractingPreviewPath }, null, 2));
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
