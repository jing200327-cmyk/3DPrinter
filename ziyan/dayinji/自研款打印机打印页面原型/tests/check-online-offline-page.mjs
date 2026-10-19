/* 线上专项校验：打印机离线工作台页（index-offline.html）在已发布站点上的
   离线态内容与「重新连接」两种分支跳转。
   用法：node tests/check-online-offline-page.mjs <站点根URL>
   例如：node tests/check-online-offline-page.mjs https://xxxx.app.workbuddy.host
   说明：发布站的资源走网关、冷启动比本地慢，所有等待都轮询到条件成立，
   不用固定 sleep 断言（固定等待在线上会误报，曾实测）。
   配套的本地版是 tests/check-offline-page.mjs（file:// 直开，44 项断言 + 截图）。 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ziyan-offline-http-'));
const base = (process.argv[2] || 'http://127.0.0.1:8714').replace(/\/+$/, '');
const enc = (rel) => rel.split('/').map(encodeURIComponent).join('/');
const offlineUrl = `${base}/${enc('dayinji/自研款打印机打印页面原型/index-offline.html')}`;
const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=0', `--user-data-dir=${profileDir}`, '--window-size=375,812', offlineUrl], { stdio: 'ignore' });
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
let passed = 0;
const failures = [];
const assert = (ok, m) => { if (ok) passed += 1; else failures.push(m); };

async function port() {
  const f = path.join(profileDir, 'DevToolsActivePort');
  for (let i = 0; i < 80; i++) { if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').split(/\r?\n/)[0]; await delay(100); }
  throw new Error('no port');
}

function connect(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  const errors = [];
  let seq = 0;
  socket.addEventListener('message', ({ data }) => {
    const m = JSON.parse(data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); return; }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value || a.description).join(' '));
  });
  return {
    errors,
    ready: new Promise((res, rej) => { socket.addEventListener('open', res, { once: true }); socket.addEventListener('error', rej, { once: true }); }),
    send(method, params = {}) { seq += 1; return new Promise((res, rej) => { pending.set(seq, { resolve: res, reject: rej }); socket.send(JSON.stringify({ id: seq, method, params })); }); },
    close() { socket.close(); }
  };
}

const ev = async (cdp, expr) => (await cdp.send('Runtime.evaluate', { returnByValue: true, awaitPromise: true, expression: expr })).result.value;
async function waitFor(cdp, expr, message, timeoutMs = 25000) {
  const started = Date.now();
  for (;;) {
    try {
      if (await ev(cdp, expr)) return;
    } catch { /* 导航瞬间执行上下文会被替换 */ }
    if (Date.now() - started > timeoutMs) throw new Error(message);
    await delay(300);
  }
}
const clickSel = async (cdp, sel) => {
  const box = await ev(cdp, `(() => { const el = document.querySelector(${JSON.stringify(sel)}); const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await delay(300);
};

try {
  const p = await port();
  const list = await fetch(`http://127.0.0.1:${p}/json/list`).then((r) => r.json());
  const cdp = connect(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await cdp.send('Page.navigate', { url: offlineUrl });
  await waitFor(cdp, `document.readyState === 'complete' && document.querySelector('#reconnect-button') && document.querySelector('.offline-notice-copy').textContent.trim().length > 0`, '离线页未就绪');
  await delay(600);
  const first = await ev(cdp, `({ copy: document.querySelector('.offline-notice-copy').textContent.trim(), btn: document.querySelector('#reconnect-button').textContent.trim(), status: document.querySelector('#printer-connection-state').dataset.connectionStatus, cam: document.querySelector('#camera-offline').dataset.cameraState })`);
  assert(first.copy === '当前打印机处于离线状态，请重新连接打印机。', 'HTTP 离线文案异常');
  assert(first.btn === '重新连接', 'HTTP 重新连接按钮异常');
  assert(first.status === 'offline' && first.cam === 'off', 'HTTP 离线/摄像头状态异常');

  /* 3D 打印机离线图标 + 恢复的两个顶部按钮 */
  const headerState = await ev(cdp, `(async () => {
    const image = document.querySelector('#printer-connection-state-image');
    if (!image.complete) await new Promise(resolve => image.addEventListener('load', resolve, { once: true }));
    const hit = (sel) => { const el = document.querySelector(sel); if (!el) return null; const b = el.getBoundingClientRect(); return { w: b.width, h: b.height }; };
    return {
      statusSrc: decodeURI(image.currentSrc),
      natural: [image.naturalWidth, image.naturalHeight],
      patchGone: !document.querySelector('.header-gear-patch'),
      switchBtn: hit('#printer-switch'),
      settingsBtn: hit('#printer-settings')
    };
  })()`);
  assert(headerState.statusSrc.endsWith('lianjiezhuangtai/离线.png'), 'HTTP 离线图标应为原 离线.png（灰色●）：' + headerState.statusSrc);
  assert(headerState.natural[0] === 74 && headerState.natural[1] === 42, 'HTTP 离线图标资产尺寸异常：' + headerState.natural.join('×'));
  assert(headerState.patchGone, 'HTTP 齿轮补丁应已移除');
  assert(headerState.switchBtn && headerState.switchBtn.w >= 42, 'HTTP 添加打印机按钮未恢复或命中盒不足');
  assert(headerState.settingsBtn && headerState.settingsBtn.w >= 42, 'HTTP 设备设置按钮未恢复或命中盒不足');

  /* 设备设置：打开设备设置页（页内四行离线不可用，左上角返回） */
  await clickSel(cdp, '#printer-settings');
  await waitFor(cdp, `!document.querySelector('#device-settings-screen').hidden`, 'HTTP 设备设置按钮未打开设备设置页');
  const settingsPage = await ev(cdp, `({ screens: [...document.querySelectorAll('.reuse-screen')].filter(s => !s.hidden).map(s => s.id), artLoaded: document.querySelector('#device-settings-screen img').complete })`);
  assert(String(settingsPage.screens) === 'device-settings-screen', 'HTTP 设备设置页未正确打开：' + JSON.stringify(settingsPage.screens));
  assert(settingsPage.artLoaded, 'HTTP 设备设置页原图未加载');
  await clickSel(cdp, '#open-firmware-version');
  await delay(400);
  const rowToast = await ev(cdp, `({ text: document.querySelector('#toast').textContent, stillSettings: !document.querySelector('#device-settings-screen').hidden })`);
  assert(rowToast.text === '打印机离线，该功能暂不可用', 'HTTP 设备设置行 Toast 异常：' + rowToast.text);
  assert(rowToast.stillSettings, 'HTTP 设备设置行点击后应留在本页');
  await clickSel(cdp, '#device-settings-back');
  await waitFor(cdp, `document.querySelector('#device-settings-screen').hidden`, 'HTTP 设备设置页返回未生效');

  /* 说明卡插画：3D 打印机（产品渲染） */
  const noticeArt = await ev(cdp, `(() => { const img = document.querySelector('.offline-notice-art img'); return img ? [img.naturalWidth, img.naturalHeight] : null; })()`);
  assert(noticeArt && noticeArt[0] === 176 && noticeArt[1] === 176, 'HTTP 说明卡 3D 打印机插画资产异常：' + (noticeArt && noticeArt.join('×')));

  await clickSel(cdp, '#reconnect-button');
  await waitFor(cdp, `!document.querySelector('#reconnect-sheet-layer').hidden`, '分支弹层未打开');
  await delay(320);
  await clickSel(cdp, '#reconnect-branch-paired');
  await waitFor(cdp, `decodeURI(location.href).includes('自研款打印机打印页面原型/index.html') && !location.href.includes('index-offline')`, '分支一未跳转打印页原型');
  let now = await ev(cdp, `({ href: decodeURI(location.href), has: Boolean(document.querySelector('#task-panel')) })`);
  assert(now.href.includes('自研款打印机打印页面原型/index.html') && !now.href.includes('index-offline') && now.has, '分支一 HTTP 跳转异常: ' + now.href);
  await cdp.send('Page.navigate', { url: offlineUrl });
  await waitFor(cdp, `document.readyState === 'complete' && document.querySelector('#reconnect-button') && document.querySelector('.offline-notice-copy').textContent.trim().length > 0`, '离线页二次打开未就绪');
  await delay(500);
  await clickSel(cdp, '#connection-refresh');
  const refreshLoading = await ev(cdp, `({ disabled: document.querySelector('#connection-refresh').disabled, loading: document.querySelector('#connection-refresh').classList.contains('is-loading'), spin: getComputedStyle(document.querySelector('#connection-refresh svg')).animationName })`);
  assert(refreshLoading.disabled && refreshLoading.loading, 'HTTP 刷新按钮未进入检测 Loading 状态');
  assert(refreshLoading.spin === 'connection-refresh-spin', 'HTTP 刷新按钮检测中图标未旋转');
  await waitFor(cdp, `!document.querySelector('#reconnect-sheet-layer').hidden`, '头部刷新按钮未打开分支弹层');
  await delay(320);
  await clickSel(cdp, '#reconnect-branch-unpaired');
  await waitFor(cdp, `decodeURI(location.href).includes('打印机首次配网连接流程原型/index.html')`, '分支二未跳转配网流程');
  await delay(1200);
  now = await ev(cdp, `({ href: decodeURI(location.href), screen: [...document.querySelectorAll('[data-screen]')].filter((s) => !s.hidden).map((s) => s.dataset.screen) })`);
  assert(now.href.includes('打印机首次配网连接流程原型/index.html') && now.href.includes('screen=printer-select'), '分支二 HTTP 跳转异常: ' + now.href);
  assert(String(now.screen) === 'printer-select', '分支二未落在选择要设置的打印机: ' + JSON.stringify(now.screen));

  /* 添加打印机按钮：打开添加打印机页；「配置新的打印机」前往配网流程 */
  await cdp.send('Page.navigate', { url: offlineUrl });
  await waitFor(cdp, `document.readyState === 'complete' && document.querySelector('#printer-switch')`, '离线页三次打开未就绪');
  await clickSel(cdp, '#printer-switch');
  await waitFor(cdp, `!document.querySelector('#add-printer-screen').hidden`, 'HTTP 添加打印机按钮未打开添加打印机页');
  const addPrinterPage = await ev(cdp, `({ screens: [...document.querySelectorAll('.reuse-screen')].filter(s => !s.hidden).map(s => s.id), artLoaded: document.querySelector('#add-printer-screen img').complete })`);
  assert(String(addPrinterPage.screens) === 'add-printer-screen', 'HTTP 添加打印机页未正确打开：' + JSON.stringify(addPrinterPage.screens));
  assert(addPrinterPage.artLoaded, 'HTTP 添加打印机页原图未加载');
  await clickSel(cdp, '#add-printer-back');
  await waitFor(cdp, `document.querySelector('#add-printer-screen').hidden`, 'HTTP 添加打印机页返回未生效');
  await clickSel(cdp, '#printer-switch');
  await waitFor(cdp, `!document.querySelector('#add-printer-screen').hidden`, 'HTTP 二次打开添加打印机页失败');
  await clickSel(cdp, '#configure-new-printer');
  await waitFor(cdp, `decodeURI(location.href).includes('打印机首次配网连接流程原型/index.html')`, 'HTTP 配置新的打印机未跳转配网流程');
  await waitFor(cdp, `[...document.querySelectorAll('[data-screen]')].filter((s) => !s.hidden).map((s) => s.dataset.screen).join() === 'printer-select'`, 'HTTP 配置新的打印机未落在选择要设置的打印机');
  assert(cdp.errors.length === 0, 'console 报错: ' + JSON.stringify(cdp.errors.slice(0, 3)));
  cdp.close();
} finally {
  chrome.kill();
}
console.log(`\n线上离线页校验（${base}）：通过 ${passed} 项，失败 ${failures.length} 项`);
failures.forEach((m, i) => console.log(`  ${i + 1}. ${m}`));
if (failures.length) process.exitCode = 1; else console.log('全部通过 ✅');
