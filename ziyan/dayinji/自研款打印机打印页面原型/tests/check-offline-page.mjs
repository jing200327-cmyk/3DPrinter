/* 打印机离线工作台页面（index-offline.html）专项校验。
   用法：node tests/check-offline-page.mjs
   覆盖：离线连接状态（置灰 + 灰色● + 「离线」文案 + 覆盖底图「● 忙碌」）、
        「离线」右侧的蓝色刷新按钮（30 设计像素命中盒 / 16 设计像素视觉圆）、
        恢复的添加打印机 / 设备设置两个顶部按钮（打开各自整图页、页内行为与返回）、
        摄像头关闭态、任务控制面板 / 耗材面板已移除、摄像头下方 3D 打印机插画、
        摄像头下方离线说明卡片与「重新连接」按钮、重新连接的两种分支
        （已完成配网 → 打印页原型；未完成配网 → 配网流程 printer-select）、
        头部刷新按钮的连接状态检测流程（Loading + 禁止重复点击）。
   截图：prototype-offline.png（离线工作台首屏）、prototype-offline-sheet.png（分支弹层）。
*/
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const prototypeRoot = path.resolve(import.meta.dirname, '..');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ziyan-offline-page-'));
const pageUrl = pathToFileURL(path.join(prototypeRoot, 'index-offline.html')).href;
const onlinePageUrl = pathToFileURL(path.join(prototypeRoot, 'index.html')).href;
const pairingPageUrl = pathToFileURL(
  path.resolve(prototypeRoot, '../../lianjiepeiwnag/打印机首次配网连接流程原型/index.html')
).href + '?screen=printer-select';

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--remote-debugging-port=0',
  `--user-data-dir=${profileDir}`,
  '--window-size=375,812',
  pageUrl
], { stdio: 'ignore' });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  const errors = [];
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
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      errors.push(message.params.args.map((arg) => arg.value || arg.description).join(' '));
    }
  });
  return {
    errors,
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

let passed = 0;
const failures = [];
const assert = (ok, message) => { if (ok) passed += 1; else failures.push(message); };

const ev = async (cdp, expression) =>
  (await cdp.send('Runtime.evaluate', { returnByValue: true, awaitPromise: true, expression })).result.value;

async function waitFor(cdp, expression, message) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const evaluation = await cdp.send('Runtime.evaluate', { returnByValue: true, expression });
      if (evaluation.result.value) return;
    } catch {
      // 导航瞬间执行上下文会被替换
    }
    await delay(100);
  }
  throw new Error(message);
}

async function clickAt(cdp, x, y) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await delay(260);
}

async function clickSelector(cdp, selector) {
  const box = await ev(cdp, `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  })()`);
  if (!box) throw new Error(`点击目标不存在：${selector}`);
  await clickAt(cdp, box.x, box.y);
}

async function shoot(cdp, filePath) {
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
}

try {
  const port = await waitForDevToolsPort();
  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
  const cdp = connectCdp(targets.find((item) => item.type === 'page').webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await cdp.send('Page.navigate', { url: pageUrl });
  await delay(900);

  /* ---- 1. 离线连接状态：置灰 + 3D 打印机图标 + 「离线」文案 + 覆盖底图「● 忙碌」位置 ---- */
  const connection = await ev(cdp, `(async () => {
    const panel = document.querySelector('#printer-connection-state');
    const image = document.querySelector('#printer-connection-state-image');
    if (!image.complete) await new Promise(resolve => image.addEventListener('load', resolve, { once: true }));
    const header = document.querySelector('.printer-header').getBoundingClientRect();
    const rect = image.getBoundingClientRect();
    return {
      present: Boolean(panel && image),
      status: panel && panel.dataset.connectionStatus,
      label: document.querySelector('#printer-connection-state-label').textContent,
      src: decodeURI(image.currentSrc),
      natural: [image.naturalWidth, image.naturalHeight],
      renderedWidth: rect.width,
      rect: {
        left: (rect.left - header.left) / header.width,
        top: (rect.top - header.top) / header.height
      }
    };
  })()`);
  assert(connection.present, '离线连接状态节点缺失');
  assert(connection.status === 'offline', `连接状态应为 offline，实际 ${connection.status}`);
  assert(connection.label === '离线', `连接状态文案应为「离线」，实际「${connection.label}」`);
  assert(connection.src.endsWith('lianjiezhuangtai/离线.png'), `连接状态图应为原 离线.png（灰色●），实际 ${connection.src}`);
  assert(connection.natural[0] === 74 && connection.natural[1] === 42, `离线图标资产尺寸应为 74×42，实际 ${connection.natural.join('×')}`);
  assert(Math.abs(connection.renderedWidth - 74 * (375 / 390)) < 1, `离线图标渲染宽度应为 74 设计像素，实际 ${connection.renderedWidth}`);
  assert(connection.rect.left > 0.15 && connection.rect.left < 0.18 && connection.rect.top > 0.69 && connection.rect.top < 0.75,
    `离线小图未覆盖底图「● 忙碌」位置：${JSON.stringify(connection.rect)}`);

  /* ---- 2. 头部右侧蓝色刷新按钮 ---- */
  const refresh = await ev(cdp, `(() => {
    const button = document.querySelector('#connection-refresh');
    const before = getComputedStyle(button, '::before');
    const b = button.getBoundingClientRect();
    const cx = b.left + b.width / 2;
    const cy = b.top + b.height / 2;
    const topmost = document.elementFromPoint(cx, cy);
    return {
      exists: Boolean(button),
      aria: button.getAttribute('aria-label'),
      hit: [b.width, b.height],
      gradient: before.backgroundImage,
      shadow: before.boxShadow,
      circleInset: before.inset || [before.top, before.right, before.bottom, before.left].join(' '),
      iconStroke: getComputedStyle(button.querySelector('svg')).stroke,
      topmostIsSelf: topmost === button || button.contains(topmost)
    };
  })()`);
  assert(refresh.exists, '头部蓝色刷新按钮缺失');
  assert(refresh.aria === '重新连接打印机', `刷新按钮 aria-label 异常：${refresh.aria}`);
  /* 30 设计像素经 --u（375/390）换算到 375 视口约 28.8px（视觉圆 16 设计像素，与离线文字墨高同量级） */
  assert(refresh.hit[0] >= 28 && refresh.hit[1] >= 28,
    `刷新按钮命中盒不足 30 设计像素（375 视口下 ${refresh.hit.join('×')}）`);
  assert(refresh.gradient.includes('linear-gradient') && refresh.gradient.includes('rgb(79, 147, 247)'),
    `刷新按钮不是品牌蓝渐变：${refresh.gradient}`);
  assert(refresh.iconStroke === 'rgb(255, 255, 255)', `刷新图标不是白色：${refresh.iconStroke}`);
  assert(refresh.topmostIsSelf, '刷新按钮中心点最顶层元素不是它自己（可能被遮挡）');

  /* 刷新按钮应紧贴「离线」文字右侧：状态图 74 宽、文字渲染到 x 122（设计），
     按钮圆心预期 (138, 117)（设计）→ 375 视口约 (132.7, 112.5)，与文字垂直中心齐平 */
  const layout = await ev(cdp, `(() => {
    const before = getComputedStyle(document.querySelector('#connection-refresh'), '::before');
    const b = document.querySelector('#connection-refresh').getBoundingClientRect();
    return {
      circleInset: parseFloat(before.top),
      btnCenterX: b.left + b.width / 2,
      btnCenterY: b.top + b.height / 2
    };
  })()`);
  /* ::before 内缩 7 设计像素 → 视觉圆 16 设计像素（= 30 - 14），与离线文字同高 */
  assert(Math.abs(layout.circleInset - 7 * (375 / 390)) < 0.6, `刷新按钮视觉圆不是 16 设计像素：${layout.circleInset}`);
  assert(Math.abs(layout.btnCenterX - 138 * (375 / 390)) < 5 && Math.abs(layout.btnCenterY - 117 * (375 / 390)) < 5,
    `刷新按钮未落在「离线」右侧的预期位置：${JSON.stringify(layout)}`);

  /* ---- 3. 恢复原打印页顶部右侧两个入口（添加打印机 / 设备设置） ---- */
  const restored = await ev(cdp, `(() => {
    const header = document.querySelector('.printer-header').getBoundingClientRect();
    const read = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return {
        w: b.width,
        h: b.height,
        left: (b.left - header.left) / header.width,
        right: (b.right - header.left) / header.width,
        top: (b.top - header.top) / header.height
      };
    };
    return {
      patchGone: !document.querySelector('.header-gear-patch'),
      switchBtn: read('#printer-switch'),
      settingsBtn: read('#printer-settings'),
      switchAria: document.querySelector('#printer-switch') && document.querySelector('#printer-switch').getAttribute('aria-label'),
      settingsAria: document.querySelector('#printer-settings') && document.querySelector('#printer-settings').getAttribute('aria-label')
    };
  })()`);
  assert(restored.patchGone, '齿轮补丁应已移除（设置按钮恢复后不再需要补丁）');
  assert(restored.switchBtn && restored.switchAria === '添加打印机', '添加打印机按钮未恢复');
  assert(restored.settingsBtn && restored.settingsAria === '打开设备设置', '设备设置按钮未恢复');
  /* 与在线工作台同位置：switch = left 226×u / top 77×u（70×54），settings = right 15×u / top 69×u（68×68） */
  assert(restored.switchBtn && restored.switchBtn.w >= 44 && restored.switchBtn.h >= 44,
    `添加打印机命中盒不足 44 设计像素：${JSON.stringify(restored.switchBtn)}`);
  assert(restored.settingsBtn && restored.settingsBtn.w >= 44 && restored.settingsBtn.h >= 44,
    `设备设置命中盒不足 44 设计像素：${JSON.stringify(restored.settingsBtn)}`);
  assert(restored.settingsBtn && restored.settingsBtn.right > 0.94, `设备设置按钮未贴头部右缘：${restored.settingsBtn && restored.settingsBtn.right}`);
  /* 两个按钮都应是头部最顶层的可点元素（中心点命中自己） */
  const hits = await ev(cdp, `(() => {
    const at = (sel) => {
      const el = document.querySelector(sel);
      const b = el.getBoundingClientRect();
      const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      return top === el || el.contains(top);
    };
    return { switchHit: at('#printer-switch'), settingsHit: at('#printer-settings') };
  })()`);
  assert(hits.switchHit, '添加打印机按钮中心点被遮挡');
  assert(hits.settingsHit, '设备设置按钮中心点被遮挡');

  /* ---- 4. 摄像头关闭态 + 无任何摄像头交互控件 ---- */
  const camera = await ev(cdp, `(async () => {
    const monitor = document.querySelector('#camera-offline');
    const image = document.querySelector('#camera-monitor-image');
    if (!image.complete) await new Promise(resolve => image.addEventListener('load', resolve, { once: true }));
    const frame = monitor.getBoundingClientRect();
    const art = image.getBoundingClientRect();
    return {
      state: monitor.dataset.cameraState,
      src: decodeURI(image.currentSrc),
      natural: [image.naturalWidth, image.naturalHeight],
      fills: Math.abs(art.width - frame.width) < 1.5 && Math.abs(art.height - frame.height) < 1.5,
      controls: ['#timelapse-action', '#camera-toggle', '#camera-view-limit'].map(id => Boolean(document.querySelector(id)))
    };
  })()`);
  assert(camera.state === 'off', `摄像头状态应为 off，实际 ${camera.state}`);
  assert(camera.src.endsWith('shexiangtou/关闭摄像头状态.jpg'), `摄像头图应为关闭状态图，实际 ${camera.src}`);
  assert(camera.natural[0] === 1117, `关闭状态图尺寸异常：${camera.natural.join('×')}`);
  assert(camera.fills, '关闭状态图未铺满摄像头区域');
  assert(camera.controls.every(item => item === false), `离线态不应保留摄像头交互控件：${JSON.stringify(camera.controls)}`);

  /* ---- 5. 任务控制面板与耗材面板已移除 ---- */
  const removed = await ev(cdp, `({
    taskPanel: Boolean(document.querySelector('#task-panel')),
    filament: Boolean(document.querySelector('.filament-panel')),
    fanBanner: Boolean(document.querySelector('#fan-filter-banner')),
    firmwareBanner: Boolean(document.querySelector('#firmware-banner'))
  })`);
  assert(!removed.taskPanel, '离线页不得保留任务控制面板');
  assert(!removed.filament, '离线页不得保留耗材面板');
  assert(!removed.fanBanner, '离线页不得保留风扇滤芯标签');
  assert(!removed.firmwareBanner, '离线页不得保留固件提醒条');

  /* ---- 6. 摄像头下方的离线说明卡片 + 「重新连接」按钮 ---- */
  const notice = await ev(cdp, `(() => {
    const copy = document.querySelector('.offline-notice-copy');
    const button = document.querySelector('#reconnect-button');
    const card = document.querySelector('.offline-notice').getBoundingClientRect();
    const monitor = document.querySelector('#camera-offline').getBoundingClientRect();
    return {
      copy: copy && copy.textContent.trim(),
      buttonText: button && button.textContent.trim(),
      belowCamera: card.top >= monitor.bottom - 1,
      artLoaded: Boolean(document.querySelector('.offline-notice-art img')),
      artNatural: (() => { const img = document.querySelector('.offline-notice-art img'); return img ? [img.naturalWidth, img.naturalHeight] : null; })()
    };
  })()`);
  assert(notice.copy === '当前打印机处于离线状态，请重新连接打印机。', `离线说明文案不符：「${notice.copy}」`);
  assert(notice.buttonText === '重新连接', `重新连接按钮文案不符：「${notice.buttonText}」`);
  assert(notice.belowCamera, '离线说明卡片未位于摄像头画面下方');
  assert(notice.artLoaded, '离线说明插画缺失');
  assert(notice.artNatural && notice.artNatural[0] === 176 && notice.artNatural[1] === 176, `3D 打印机插画资产尺寸应为 176×176（2x），实际 ${notice.artNatural && notice.artNatural.join('×')}`);

  /* ---- 7. 分支弹层：初始隐藏，点「重新连接」打开，两个分支与跳转目标正确 ---- */
  const sheetState = await ev(cdp, `(() => {
    const layer = document.querySelector('#reconnect-sheet-layer');
    return { hidden: layer.hidden, display: getComputedStyle(layer).display };
  })()`);
  assert(sheetState.hidden && sheetState.display === 'none', `分支弹层初始应完全隐藏：${JSON.stringify(sheetState)}`);

  await clickSelector(cdp, '#reconnect-button');
  const sheetOpen = await ev(cdp, `(() => {
    const layer = document.querySelector('#reconnect-sheet-layer');
    return {
      hidden: layer.hidden,
      role: layer.querySelector('.reconnect-sheet').getAttribute('role'),
      title: document.querySelector('#reconnect-sheet-title').textContent,
      branches: [...document.querySelectorAll('.reconnect-branch')].map(b => ({
        title: b.querySelector('strong').textContent,
        sub: b.querySelector('span span').textContent
      }))
    };
  })()`);
  assert(!sheetOpen.hidden, '点「重新连接」后分支弹层未打开');
  assert(sheetOpen.role === 'dialog', '分支弹层缺少 dialog 语义');
  assert(sheetOpen.title === '重新连接打印机', `弹层标题异常：${sheetOpen.title}`);
  assert(sheetOpen.branches.length === 2, `弹层应有两个分支，实际 ${sheetOpen.branches.length}`);
  assert(sheetOpen.branches[0] && sheetOpen.branches[0].title === '打印机已完成配网', '分支一标题异常');
  assert(sheetOpen.branches[1] && sheetOpen.branches[1].title === '打印机未完成配网', '分支二标题异常');
  assert(sheetOpen.branches[0] && sheetOpen.branches[0].sub.includes('打印页原型'), '分支一说明未指向打印页原型');
  assert(sheetOpen.branches[1] && sheetOpen.branches[1].sub.includes('选择要设置的打印机'), '分支二说明未指向配网流程');

  await shoot(cdp, path.join(prototypeRoot, 'prototype-offline-sheet.png'));

  /* Esc 关闭弹层 */
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await delay(200);
  const sheetClosed = await ev(cdp, `document.querySelector('#reconnect-sheet-layer').hidden`);
  assert(sheetClosed, 'Esc 未关闭分支弹层');

  /* 首屏截图 */
  await shoot(cdp, path.join(prototypeRoot, 'prototype-offline.png'));

  /* ---- 8. 分支一：已完成配网 → 直接建立连接，跳转打印页原型（在线态） ---- */
  /* 头部刷新按钮：先进入连接状态检测（Loading + 禁用，禁止重复点击），检测完成后再打开分支弹层 */
  await clickSelector(cdp, '#connection-refresh');
  const refreshLoading = await ev(cdp, `({
    disabled: document.querySelector('#connection-refresh').disabled,
    loading: document.querySelector('#connection-refresh').classList.contains('is-loading'),
    spin: getComputedStyle(document.querySelector('#connection-refresh svg')).animationName,
    sheetStillHidden: document.querySelector('#reconnect-sheet-layer').hidden
  })`);
  assert(refreshLoading.disabled, '检测中刷新按钮未禁用（应禁止重复点击）');
  assert(refreshLoading.loading, '检测中刷新按钮缺少 is-loading 类');
  assert(refreshLoading.spin === 'connection-refresh-spin', `检测中刷新图标未旋转：${refreshLoading.spin}`);
  assert(refreshLoading.sheetStillHidden, '检测未完成时不应打开分支弹层');
  await waitFor(cdp, `!document.querySelector('#reconnect-sheet-layer').hidden`, '刷新按钮检测后未打开分支弹层');
  /* 等弹层 240ms 滑入动画结束再点分支（动画中途 getBoundingClientRect 会拿到偏移中的位置） */
  await delay(320);
  const refreshRecovered = await ev(cdp, `({
    disabled: document.querySelector('#connection-refresh').disabled,
    loading: document.querySelector('#connection-refresh').classList.contains('is-loading')
  })`);
  assert(!refreshRecovered.disabled && !refreshRecovered.loading, '检测完成后刷新按钮未恢复可点击');
  await clickSelector(cdp, '#reconnect-branch-paired');
  await waitFor(cdp, `decodeURI(location.href).includes('自研款打印机打印页面原型/index.html') && !location.href.includes('index-offline')`, '分支一未跳转打印页原型');
  const onlineLanded = await ev(cdp, `({
    href: decodeURI(location.href),
    status: document.querySelector('#task-panel') && document.querySelector('#task-panel').dataset.status,
    connection: document.querySelector('#printer-connection-state').dataset.connectionStatus
  })`);
  assert(onlineLanded.status === 'ready' && onlineLanded.connection === 'idle',
    `打印页原型落地状态异常：${JSON.stringify(onlineLanded)}`);

  /* ---- 9. 分支二：未配网 → 跳转配网流程第一步骤页「选择要设置的打印机」 ---- */
  await cdp.send('Page.navigate', { url: pageUrl });
  await delay(800);
  await clickSelector(cdp, '#reconnect-button');
  await delay(200);
  await clickSelector(cdp, '#reconnect-branch-unpaired');
  await waitFor(cdp, `decodeURI(location.href).includes('打印机首次配网连接流程原型/index.html')`, '分支二未跳转配网流程');
  const pairingLanded = await ev(cdp, `({
    href: decodeURI(location.href),
    screen: [...document.querySelectorAll('[data-screen]')].filter(s => !s.hidden).map(s => s.dataset.screen)
  })`);
  assert(pairingLanded.href.includes('screen=printer-select'), `分支二未带 ?screen=printer-select：${pairingLanded.href}`);
  assert(String(pairingLanded.screen) === 'printer-select', `分支二未落在「选择要设置的打印机」：${JSON.stringify(pairingLanded.screen)}`);

  /* ---- 10. 设备设置按钮：打开设备设置页，页内四行离线不可用，左上角返回 ---- */
  await cdp.send('Page.navigate', { url: pageUrl });
  await delay(800);
  await clickSelector(cdp, '#printer-settings');
  await waitFor(cdp, `!document.querySelector('#device-settings-screen').hidden`, '设备设置按钮未打开设备设置页');
  const settingsPage = await ev(cdp, `({
    screens: [...document.querySelectorAll('.reuse-screen')].filter(s => !s.hidden).map(s => s.id),
    artLoaded: document.querySelector('#device-settings-screen img').complete,
    inert: document.querySelector('#device-page').inert
  })`);
  assert(String(settingsPage.screens) === 'device-settings-screen', `设备设置页未正确打开：${JSON.stringify(settingsPage.screens)}`);
  assert(settingsPage.artLoaded, '设备设置页原图未加载');
  assert(settingsPage.inert, '设备设置页打开时底层页面应置为 inert');
  await clickSelector(cdp, '#open-firmware-version');
  await delay(300);
  const rowToast = await ev(cdp, `({
    text: document.querySelector('#toast').textContent,
    visible: document.querySelector('#toast').classList.contains('is-visible'),
    stillSettings: !document.querySelector('#device-settings-screen').hidden
  })`);
  assert(rowToast.text === '打印机离线，该功能暂不可用', `设备设置行 Toast 文案异常：「${rowToast.text}」`);
  assert(rowToast.visible && rowToast.stillSettings, '设备设置行点击后应留在本页并给出说明');
  await clickSelector(cdp, '#device-settings-back');
  await delay(300);
  const settingsClosed = await ev(cdp, `({
    hidden: document.querySelector('#device-settings-screen').hidden,
    inert: document.querySelector('#device-page').inert
  })`);
  assert(settingsClosed.hidden && !settingsClosed.inert, '设备设置页左上角返回未生效');

  /* ---- 11. 添加打印机按钮：打开添加打印机页；「配置新的打印机」前往配网流程 ---- */
  await clickSelector(cdp, '#printer-switch');
  await waitFor(cdp, `!document.querySelector('#add-printer-screen').hidden`, '添加打印机按钮未打开添加打印机页');
  const addPrinterPage = await ev(cdp, `({
    screens: [...document.querySelectorAll('.reuse-screen')].filter(s => !s.hidden).map(s => s.id),
    artLoaded: document.querySelector('#add-printer-screen img').complete,
    shareEntryGone: !document.querySelector('#open-share-printer')
  })`);
  assert(String(addPrinterPage.screens) === 'add-printer-screen', `添加打印机页未正确打开：${JSON.stringify(addPrinterPage.screens)}`);
  assert(addPrinterPage.artLoaded, '添加打印机页原图未加载');
  assert(addPrinterPage.shareEntryGone, '离线分支页不应携带分享打印机入口');
  await clickSelector(cdp, '#add-printer-back');
  await delay(300);
  const addPrinterClosed = await ev(cdp, `document.querySelector('#add-printer-screen').hidden`);
  assert(addPrinterClosed, '添加打印机页左上角返回未生效');
  await clickSelector(cdp, '#printer-switch');
  await waitFor(cdp, `!document.querySelector('#add-printer-screen').hidden`, '二次打开添加打印机页失败');
  await clickSelector(cdp, '#configure-new-printer');
  await waitFor(cdp, `decodeURI(location.href).includes('打印机首次配网连接流程原型/index.html')`, '配置新的打印机未跳转配网流程');
  /* 配网页 HTML 默认露出 start，深链在脚本执行时才切到 printer-select，轮询等它切过来 */
  await waitFor(cdp, `[...document.querySelectorAll('[data-screen]')].filter(s => !s.hidden).map(s => s.dataset.screen).join() === 'printer-select'`, '配置新的打印机未落在「选择要设置的打印机」');
  const addPrinterLanded = await ev(cdp, `({
    href: decodeURI(location.href),
    screen: [...document.querySelectorAll('[data-screen]')].filter(s => !s.hidden).map(s => s.dataset.screen)
  })`);
  assert(addPrinterLanded.href.includes('screen=printer-select'), `配置新的打印机未带 ?screen=printer-select：${addPrinterLanded.href}`);
  assert(String(addPrinterLanded.screen) === 'printer-select', `配置新的打印机未落在「选择要设置的打印机」：${JSON.stringify(addPrinterLanded.screen)}`);

  /* ---- 12. 原在线工作台不受影响（回归） ---- */
  await cdp.send('Page.navigate', { url: onlinePageUrl });
  await delay(800);
  const onlineIntact = await ev(cdp, `({
    taskPanel: Boolean(document.querySelector('#task-panel')),
    filament: Boolean(document.querySelector('.filament-panel')),
    cameraState: document.querySelector('#timelapse-placeholder').dataset.cameraState,
    offlinePageGone: !document.querySelector('.offline-notice')
  })`);
  assert(onlineIntact.taskPanel && onlineIntact.filament && onlineIntact.cameraState === 'on' && onlineIntact.offlinePageGone,
    `原在线工作台被破坏：${JSON.stringify(onlineIntact)}`);

  assert(cdp.errors.length === 0, '存在 console 报错：' + JSON.stringify(cdp.errors.slice(0, 4)));
  cdp.close();
} finally {
  chrome.kill();
}

const summary = `\n离线工作台页面校验（index-offline.html）：通过 ${passed} 项，失败 ${failures.length} 项\n`;
if (failures.length) {
  console.log(summary);
  failures.forEach((message, index) => console.log(`  ${index + 1}. ${message}`));
  process.exitCode = 1;
} else {
  console.log(summary + '全部通过 ✅');
}
