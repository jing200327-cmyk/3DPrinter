import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const prototypeRoot = path.resolve(import.meta.dirname, '..');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ziyan-printer-prototype-'));
const preparingPreviewPath = path.join(prototypeRoot, 'prototype-preparing.png');
const preparingCancelDialogPreviewPath = path.join(prototypeRoot, 'prototype-preparing-cancel-dialog.png');
const cancelledPreviewPath = path.join(prototypeRoot, 'prototype-cancelled-minimal.png');
const previewPath = path.join(prototypeRoot, 'prototype-preview.png');
const plateTwoQueuePreviewPath = path.join(prototypeRoot, 'prototype-plate2-queue.png');
const queueTwoColorPreviewPath = path.join(prototypeRoot, 'prototype-queue2-direct-color.png');
const completedActionsPreviewPath = path.join(prototypeRoot, 'prototype-completed-actions.png');
const nextPlatePreviewPath = path.join(prototypeRoot, 'prototype-next-plate-builder.png');
const feedingPreviewPath = path.join(prototypeRoot, 'prototype-feeding.png');
const retractingPreviewPath = path.join(prototypeRoot, 'prototype-retracting.png');
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
  await cdp.send('Page.navigate', { url: `${pageUrl}?plate=${plate}` });
  await delay(500);
  const evaluation = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const images = [document.querySelector('#active-task-image'), ...document.querySelectorAll('#print-queue img')];
      await Promise.all(images.map(image => image.complete ? Promise.resolve() : new Promise(resolve => image.addEventListener('load', resolve, { once: true }))));
      return {
        activeSrc: decodeURI(document.querySelector('#active-task-image').currentSrc),
        title: document.querySelector('#task-title').textContent,
        meta: document.querySelector('.task-meta').textContent,
        time: document.querySelector('#remaining-time').textContent,
        queuePlates: [...document.querySelectorAll('[data-queue-task]')].map(task => task.dataset.plate),
        queueSrcs: [...document.querySelectorAll('#print-queue img')].map(image => decodeURI(image.currentSrc))
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
      queueHidden: document.querySelector('#queue-toggle').hidden
    }))()`
  });
  assert(cancelledState.result.value.status === 'cancelled' && cancelledState.result.value.label === '已取消打印任务', `Preparing cancellation did not enter the minimal cancelled state: ${JSON.stringify(cancelledState.result.value)}`);
  assert(cancelledState.result.value.taskCopyHidden && cancelledState.result.value.preparationHidden && cancelledState.result.value.percentHidden && cancelledState.result.value.countdownHidden && cancelledState.result.value.progressHidden && cancelledState.result.value.actionsHidden && cancelledState.result.value.queueHidden, `Cancelled state still exposes printing controls: ${JSON.stringify(cancelledState.result.value)}`);
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
        queueVisible: !document.querySelector('#queue-toggle').hidden
      };
      return { initial, analysisProgress, analysisComplete, stages: [calibration, wiping, homing, leveling, heating], afterThirtySeconds };
    })()`
  });
  const preparing = preparation.result.value;
  assert(preparing.initial.duration === 30 && preparing.initial.status === 'preparing' && preparing.initial.taskState === '准备中' && preparing.initial.progressState === '准备打印', `Initial preparation state is incorrect: ${JSON.stringify(preparing.initial)}`);
  assert(preparing.initial.preparingVisible && preparing.initial.taskPercentHidden && preparing.initial.countdownHidden && preparing.initial.printProgressHidden, 'Preparation content did not replace printing progress and countdown.');
  assert(preparing.initial.finishHidden && preparing.initial.pauseHidden && preparing.initial.queueHidden && preparing.initial.cancelVisible && preparing.initial.cancelCenterDelta <= 2, 'Preparation actions or queue visibility is incorrect.');
  assert(preparing.initial.spinner.width === preparing.initial.spinner.height && preparing.initial.spinner.animation !== 'none' && preparing.initial.spinner.borderTopColor !== preparing.initial.spinner.borderRightColor, `Preparation spinner is incorrect: ${JSON.stringify(preparing.initial.spinner)}`);
  assert(preparing.initial.theme.background === 'rgb(240, 237, 255)', `Preparation theme is not pale purple: ${JSON.stringify(preparing.initial.theme)}`);
  assert(preparing.initial.stage.label === '正在分析模型' && !preparing.initial.stage.percentHidden && preparing.initial.stage.percent === '0%', 'Analysis stage must begin at 0%.');
  assert(preparing.analysisProgress.length === 10 && preparing.analysisProgress.every((value, index, values) => index === 0 || value > values[index - 1]), `Analysis progress must rise in distinct jumps: ${JSON.stringify(preparing.analysisProgress)}`);
  assert(preparing.analysisComplete.label === '正在分析模型' && preparing.analysisComplete.percent === '100%' && !preparing.analysisComplete.percentHidden, 'Analysis progress must jump to 100% before the next stage.');
  assert(JSON.stringify(preparing.stages.map(stage => stage.label)) === JSON.stringify(['校准中', '擦嘴中', '归零中', '调平中', '升温中']) && preparing.stages.every(stage => stage.percentHidden), `Preparation stage order or percent visibility is incorrect: ${JSON.stringify(preparing.stages)}`);
  assert(preparing.afterThirtySeconds.status === 'printing' && preparing.afterThirtySeconds.preparingHidden && preparing.afterThirtySeconds.countdownVisible && preparing.afterThirtySeconds.printProgressVisible && preparing.afterThirtySeconds.finishVisible && preparing.afterThirtySeconds.pauseVisible && preparing.afterThirtySeconds.queueVisible, `Preparation did not switch to printing after 30 seconds: ${JSON.stringify(preparing.afterThirtySeconds)}`);

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
      pause.click();

      const queueToggle = document.querySelector('#queue-toggle');
      queueToggle.click();
      const queuedReference = {
        loaded: [...document.querySelectorAll('#print-queue img')].every(image => image.complete && image.naturalWidth > 0),
        srcs: [...document.querySelectorAll('#print-queue img')].map(image => decodeURI(image.currentSrc)),
        plates: [...document.querySelectorAll('[data-queue-task]')].map(task => task.dataset.plate),
        taskCount: document.querySelectorAll('[data-queue-task]').length
      };

      document.querySelector('#filament-settings').click();
      const filamentReference = document.querySelector('#filament-reference');
      const sheetOpen = document.querySelector('#filament-sheet').open;
      const sheetSlotCount = document.querySelectorAll('.sheet-slots .material-slot').length;
      const externalRackPresent = Boolean(document.querySelector('.sheet-slots .material-slot--rack'));
      document.querySelector('.sheet-slots .material-slot--rack').click();
      const externalRackSelectable = document.querySelector('.material-slots .material-slot--rack').getAttribute('aria-pressed') === 'true';
      document.querySelector('.sheet-slots [data-slot-index="2"]').click();
      const selectedSlot = document.querySelector('.material-slots .is-selected .slot-index').textContent;
      const pointerSlot = document.querySelector('#filament-pointer').dataset.slotIndex;
      const pointerPosition = document.querySelector('#filament-pointer').style.getPropertyValue('--pointer-x');
      document.querySelector('#close-filament-sheet').click();

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
        restartLabel: document.querySelector('#restart-print span:last-child').textContent
      };
      document.querySelector('#restart-print').click();
      const restarted = {
        status: document.querySelector('#task-panel').dataset.status,
        percent: document.querySelector('#task-percent').textContent,
        time: document.querySelector('#remaining-time').textContent,
        actionsVisible: !document.querySelector('#task-actions').hidden,
        completionHidden: document.querySelector('#completion-actions').hidden
      };
      await wait(1900);

      return {
        viewport: { width: document.documentElement.clientWidth, height: innerHeight },
        taskReference,
        countdownWorked: timeBeforeTick !== timeAfterTick,
        pauseWorked: pausedTheme === 'paused' && pausedTime === pausedTimeAfterWait,
        queuedReference,
        filamentReference: { loaded: filamentReference.complete && filamentReference.naturalWidth > 0, src: decodeURI(filamentReference.currentSrc) },
        sheetOpen,
        sheetSlotCount,
        externalRackPresent,
        externalRackSelectable,
        selectedSlot,
        pointerSlot,
        pointerPosition,
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
  assert(result.queuedReference.loaded && result.queuedReference.taskCount === 2, 'Print queue images or task controls are incorrect.');
  assert(JSON.stringify(result.queuedReference.plates) === JSON.stringify(['2', '3']), `Plate 1 queue should contain plates 2 and 3: ${JSON.stringify(result.queuedReference)}`);
  assert(result.queuedReference.srcs[0].endsWith('打印队列2.jpg') && result.queuedReference.srcs[1].endsWith('打印队列3.jpg'), `Plate 1 queue artwork is incorrect: ${JSON.stringify(result.queuedReference)}`);
  assert(result.filamentReference.loaded && result.filamentReference.src.endsWith('耗材.jpg'), 'Required filament reference image did not load.');
  assert(result.sheetOpen && result.sheetSlotCount === 5 && result.externalRackPresent, 'Filament settings must contain the external rack and four internal slots.');
  assert(result.externalRackSelectable, 'External rack could not be selected from filament settings.');
  assert(result.selectedSlot === '2', 'Material slot selection did not synchronize to the main panel.');
  assert(result.pointerSlot === '2' && result.pointerPosition === '52.1%', 'Material pointer did not move to the selected slot.');
  assert(result.switchWorked, 'Device control switch did not toggle.');
  assert(result.completed.status === 'completed', 'Finish shortcut did not enter completed state.');
  assert(result.completed.percent === '100%' && result.completed.time === '00:00:00', 'Completed state did not reach 100% and zero time.');
  assert(result.completed.actionsVisible, 'Completed state actions are not visible.');
  assert(result.completed.activeActionsHidden, 'Pause and cancel actions remained visible after completion.');
  assert(result.completed.nextPlateVisible, 'Next plate should be visible while the queue is not empty.');
  assert(result.completed.restartLabel === '重新打印', 'Completed left action must be named 重新打印.');
  assert(result.restarted.status === 'printing' && result.restarted.percent === '0%' && result.restarted.time === '05:15:00', `Restart did not reset the printing task: ${JSON.stringify(result.restarted)}`);
  assert(result.restarted.actionsVisible && result.restarted.completionHidden, 'Restart did not restore active task controls.');

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

  await cdp.send('Page.navigate', { url: pageUrl });
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

  await cdp.send('Page.navigate', { url: pageUrl });
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
        actionsHidden: document.querySelector('#task-actions').hidden
      };
    })()`
  });
  assert(cancellation.result.value.status === 'cancelled', `Cancel confirmation did not enter cancelled state: ${JSON.stringify(cancellation.result.value)}`);
  assert(cancellation.result.value.label === '已取消打印任务' && cancellation.result.value.taskCopyHidden && cancellation.result.value.actionsHidden, 'Cancelled state is not reduced to the required status label.');

  await cdp.send('Page.navigate', { url: `${pageUrl}?plate=3&completed=1%2C2` });
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
  const feeding = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      document.querySelector('#filament-settings').click();
      document.querySelector('#feed-filament').click();
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
      document.querySelector('#filament-settings').click();
      document.querySelector('#feed-filament').click();
      document.querySelector('#cancel-filament-operation').click();
      return { hidden: document.querySelector('#filament-operation-screen').hidden, message: document.querySelector('#toast').textContent };
    })()`
  });
  assert(feedingCancellation.result.value.hidden && feedingCancellation.result.value.message === '已取消进料', 'Printing prototype did not cancel feeding with the required message.');

  const retracting = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      document.querySelector('#filament-settings').click();
      document.querySelector('#retract-filament').click();
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
      document.querySelector('#filament-settings').click();
      document.querySelector('#retract-filament').click();
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
      expression: `(() => ({
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
        shellWidth: Math.round(document.querySelector('.phone-shell').getBoundingClientRect().width)
      }))()`
    });
    responsiveLayouts.push(metrics.result.value);
  }
  responsiveLayouts.forEach((layout) => {
    assert(layout.documentWidth === layout.viewportWidth, `Horizontal overflow detected at ${layout.viewportWidth}px.`);
    assert(layout.shellWidth === Math.min(layout.viewportWidth, 390), `Unexpected phone shell width at ${layout.viewportWidth}px.`);
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

  console.log(JSON.stringify({ preparingCancellation: preparingCancellation.result.value, cancelledState: cancelledState.result.value, preparation: preparing, ...result, queueTwoColor: queueTwoColor.result.value, queueBack: queueBack.result.value, plateTwoMapping, plateThreeMapping, nextPlate: nextPlate.result.value, cancellation: cancellation.result.value, singlePlateCompletion: singlePlateCompletion.result.value, feeding: feeding.result.value, feedingClose: feedingClose.result.value, feedingCancellation: feedingCancellation.result.value, retracting: retracting.result.value, retractingClose: retractingClose.result.value, retractingCancellation: retractingCancellation.result.value, responsiveLayouts, unnamedButtons: 0, browserErrors: 0, preparingPreviewPath, preparingCancelDialogPreviewPath, cancelledPreviewPath, previewPath, plateTwoQueuePreviewPath, queueTwoColorPreviewPath, completedActionsPreviewPath, nextPlatePreviewPath, feedingPreviewPath, retractingPreviewPath }, null, 2));
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
