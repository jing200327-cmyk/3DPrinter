/* 统一关闭确认交互验收：
   1) 受影响页面（打印机准备 / 连接打印机热点 / 网络配置）点右上角 × 先弹二次确认
   2) 弹窗文案固定为「打印前，请务必完成打印机设置，只需几分钟即可完成」
   3) 弹窗含「确认」「取消」两按钮，沿用既有弹窗样式规范
   4) 点「取消」：关弹窗、留在当前页、状态与已填数据完全不变（含焦点回到关闭图标）
   5) 点「确认」：关弹窗并跳转回工作台（打印机）页面
   6) 终页「打印前准备」不弹此弹窗，保持原有直接行为
   7) 组件可复用：createConfirmDialog 能再造一个独立实例，文案可配置
   用法：node tests/check-close-confirm.mjs http://127.0.0.1:8713
*/
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const baseUrl = (process.argv[2] || 'http://127.0.0.1:8713').replace(/\/+$/, '');
const encode = (relative) => relative.split('/').map(encodeURIComponent).join('/');
const pairingUrl = `${baseUrl}/${encode('lianjiepeiwnag/打印机首次配网连接流程原型/index.html')}`;
const shotDir = path.resolve('.');
const EXPECTED_COPY = '打印前，请务必完成打印机设置，只需几分钟即可完成';

const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ziyan-closeconfirm-'));
const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=0',
  `--user-data-dir=${profileDir}`, '--window-size=390,844', 'about:blank'
], { stdio: 'ignore' });
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

let passed = 0;
const failures = [];
const assert = (ok, message) => { if (ok) passed += 1; else failures.push(message); };

async function devToolsPort() {
  const f = path.join(profileDir, 'DevToolsActivePort');
  for (let i = 0; i < 80; i += 1) {
    if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').split(/\r?\n/)[0];
    await delay(100);
  }
  throw new Error('no devtools port');
}

function connect(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  const errors = [];
  let seq = 0;
  socket.addEventListener('message', ({ data }) => {
    const m = JSON.parse(data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id); pending.delete(m.id);
      m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
      return;
    }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      errors.push(m.params.args.map((a) => a.value || a.description).join(' '));
    }
  });
  return {
    errors,
    ready: new Promise((res, rej) => { socket.addEventListener('open', res, { once: true }); socket.addEventListener('error', rej, { once: true }); }),
    send(method, params = {}) { seq += 1; return new Promise((res, rej) => { pending.set(seq, { resolve: res, reject: rej }); socket.send(JSON.stringify({ id: seq, method, params })); }); },
    close() { socket.close(); }
  };
}

const ev = async (cdp, expr) => (await cdp.send('Runtime.evaluate', { returnByValue: true, awaitPromise: true, expression: expr })).result.value;
const go = async (cdp, url) => { await cdp.send('Page.navigate', { url }); await delay(1100); };

async function shot(cdp, file) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(shotDir, file), Buffer.from(data, 'base64'));
}

const port = await devToolsPort();
const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json());
const pageTarget = targets.find((t) => t.type === 'page');
assert(pageTarget, '未找到可调试的页面目标');
const cdp = connect(pageTarget.webSocketDebuggerUrl);
await cdp.ready;
await cdp.send('Page.enable');
await cdp.send('Runtime.enable');

/* ---------- 1. 受影响页面清单：三个页面标了 confirm，终页标了 direct ---------- */
await go(cdp, `${pairingUrl}?screen=start`);
const wiring = await ev(cdp, `(() => {
  const rows = [...document.querySelectorAll('[data-close]')].map((b) => ({
    screen: b.closest('[data-screen]').dataset.screen,
    mode: b.dataset.close,
    label: b.getAttribute('aria-label')
  }));
  return {
    rows,
    confirmScreens: rows.filter((r) => r.mode === 'confirm').map((r) => r.screen),
    directScreens: rows.filter((r) => r.mode === 'direct').map((r) => r.screen)
  };
})()`);
assert(JSON.stringify(wiring.confirmScreens) === JSON.stringify(['printer-ready', 'hotspot', 'home-wifi']),
  `应确认的页面不对：${JSON.stringify(wiring.confirmScreens)}`);
assert(JSON.stringify(wiring.directScreens) === JSON.stringify(['print-ready']),
  `直接关闭的页面应只有终页：${JSON.stringify(wiring.directScreens)}`);
assert(wiring.rows.every((r) => r.label === '退出配网流程'), '关闭图标无障碍名应保持「退出配网流程」');

/* ---------- 2. 逐页验证：点 × 弹窗 → 取消不改变状态 → 确认跳转工作台 ---------- */
/* 「网络配置」页最能验证「已填数据不丢」，先填好密码与 WiFi 选择 */
await go(cdp, `${pairingUrl}?screen=home-wifi`);
await ev(cdp, `(() => {
  const pwd = document.querySelector('#home-wifi-password');
  pwd.value = 'my-secret-123';
  pwd.dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('#home-wifi-name').value = 'STEM_Lab_2.4G';
  return true;
})()`);

for (const screen of wiring.confirmScreens) {
  /* 每次迭代都重新填一次：上一轮点「确认」会走复位流程清空密码 */
  await ev(cdp, `(() => {
    const pwd = document.querySelector('#home-wifi-password');
    pwd.value = 'my-secret-123';
    pwd.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#home-wifi-name').value = 'STEM_Lab_2.4G';
    return true;
  })()`);
  await ev(cdp, `(() => { showScreen(${JSON.stringify(screen)}); return true; })()`);
  await delay(250);

  const before = await ev(cdp, `(() => ({
    screen: [...document.querySelectorAll('[data-screen]')].filter((s) => !s.hidden).map((s) => s.dataset.screen)[0],
    pwd: document.querySelector('#home-wifi-password').value,
    wlan: document.querySelector('#home-wifi-name').value
  }))()`);

  /* 点右上角 × */
  await ev(cdp, `(() => { document.querySelector('[data-screen="${screen}"] [data-close]').click(); return true; })()`);
  await delay(450);

  const dialogState = await ev(cdp, `(() => {
    const dialogs = [...document.querySelectorAll('dialog.app-dialog')].filter((d) => d.open);
    const d = dialogs[0];
    if (!d) return { open: false };
    const buttons = [...d.querySelectorAll('.dialog-actions button')];
    const active = document.activeElement;
    return {
      open: true,
      count: dialogs.length,
      classes: d.className,
      title: d.querySelector('h2')?.textContent.trim(),
      copy: d.querySelector('p')?.textContent.trim(),
      buttons: buttons.map((b) => b.textContent.trim()),
      buttonHeights: buttons.map((b) => Math.round(b.getBoundingClientRect().height)),
      iconClass: d.querySelector('.dialog-icon')?.className,
      focused: active?.textContent?.trim(),
      stillSameScreen: [...document.querySelectorAll('[data-screen]')].filter((s) => !s.hidden).map((s) => s.dataset.screen)[0],
      pwdKept: document.querySelector('#home-wifi-password').value
    };
  })()`);

  assert(dialogState.open, `${screen}：点关闭图标未弹出确认弹窗`);
  assert(dialogState.count === 1, `${screen}：应只弹一个确认弹窗，实际 ${dialogState.count}`);
  assert(dialogState.copy === EXPECTED_COPY, `${screen}：弹窗文案不符，实际「${dialogState.copy}」`);
  assert(JSON.stringify(dialogState.buttons) === JSON.stringify(['取消', '确认']),
    `${screen}：弹窗按钮应为「取消」「确认」，实际 ${JSON.stringify(dialogState.buttons)}`);
  assert(dialogState.classes.includes('app-dialog'), `${screen}：弹窗未沿用 app-dialog 样式规范`);
  assert(dialogState.buttonHeights.every((h) => h >= 44), `${screen}：弹窗按钮高度不足 44px`);
  assert(dialogState.focused === '取消', `${screen}：弹窗默认焦点应在「取消」，实际 ${dialogState.focused}`);
  assert(dialogState.stillSameScreen === before.screen, `${screen}：弹窗期间不应切换页面`);
  assert(dialogState.pwdKept === before.pwd, `${screen}：弹窗期间已填密码被改动`);

  /* 点「取消」：留在当前页，数据与状态不变，焦点回到关闭图标 */
  await ev(cdp, `(() => {
    const d = [...document.querySelectorAll('dialog.app-dialog')].find((x) => x.open);
    [...d.querySelectorAll('.dialog-actions button')].find((b) => b.textContent.trim() === '取消').click();
    return true;
  })()`);
  await delay(400);

  const afterCancel = await ev(cdp, `(() => ({
    dialogOpen: [...document.querySelectorAll('dialog.app-dialog')].some((d) => d.open),
    screen: [...document.querySelectorAll('[data-screen]')].filter((s) => !s.hidden).map((s) => s.dataset.screen)[0],
    pwd: document.querySelector('#home-wifi-password').value,
    wlan: document.querySelector('#home-wifi-name').value,
    focusOnClose: document.activeElement?.dataset?.close !== undefined,
    focusTag: document.activeElement?.tagName
  }))()`);

  assert(!afterCancel.dialogOpen, `${screen}：点取消后弹窗未关闭`);
  assert(afterCancel.screen === before.screen, `${screen}：点取消后离开了当前页`);
  assert(afterCancel.pwd === before.pwd, `${screen}：点取消后已填密码被清空`);
  assert(afterCancel.wlan === before.wlan, `${screen}：点取消后 WiFi 选择被重置`);
  assert(afterCancel.focusOnClose, `${screen}：点取消后焦点未回到关闭图标`);
  /* 点「确认」：跳转回工作台（打印机）页面 */
  await ev(cdp, `(() => { document.querySelector('[data-screen="${screen}"] [data-close]').click(); return true; })()`);
  await delay(400);
  if (screen === wiring.confirmScreens[0]) await shot(cdp, 'prototype-close-confirm-dialog.png');
  await ev(cdp, `(() => {
    const d = [...document.querySelectorAll('dialog.app-dialog')].find((x) => x.open);
    [...d.querySelectorAll('.dialog-actions button')].find((b) => b.textContent.trim() === '确认').click();
    return true;
  })()`);
  await delay(1300);

  const nav = await ev(cdp, `({ title: document.title, path: decodeURI(location.pathname), isWorkbench: Boolean(document.querySelector('#device-page')) })`);
  assert(nav.title === '自研款打印机打印页面原型' && nav.path.endsWith('dayinji/自研款打印机打印页面原型/index.html'),
    `${screen}：点确认未跳转回工作台页面，实际 ${JSON.stringify(nav)}`);
  assert(nav.isWorkbench, `${screen}：跳转后未落在工作台页面`);
  /* 回到配网流程继续下一页 */
  await go(cdp, `${pairingUrl}?screen=${screen}`);
}
/* ---------- 3. 终页「打印前准备」不弹确认，保持原有直接行为 ---------- */
await go(cdp, `${pairingUrl}?screen=print-ready`);
await ev(cdp, `(() => { document.querySelector('#screen-print-ready [data-close]').click(); return true; })()`);
await delay(500);
const finalBehaviour = await ev(cdp, `({
  dialogOpen: [...document.querySelectorAll('dialog.app-dialog')].some((d) => d.open),
  screen: [...document.querySelectorAll('[data-screen]')].filter((s) => !s.hidden).map((s) => s.dataset.screen)[0]
})`);
assert(!finalBehaviour.dialogOpen, '终页「打印前准备」不应弹二次确认弹窗');
assert(finalBehaviour.screen === 'start', `终页点关闭应保持原有行为回到起始页，实际 ${finalBehaviour.screen}`);

/* ---------- 4. Esc / 点遮罩等同取消 ---------- */
await go(cdp, `${pairingUrl}?screen=printer-ready`);
await ev(cdp, `(() => { document.querySelector('#screen-printer-ready [data-close]').click(); return true; })()`);
await delay(400);
await ev(cdp, `(() => {
  const d = [...document.querySelectorAll('dialog.app-dialog')].find((x) => x.open);
  d.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  d.close();
  return true;
})()`);
await delay(400);
const afterEsc = await ev(cdp, `({
  dialogOpen: [...document.querySelectorAll('dialog.app-dialog')].some((d) => d.open),
  screen: [...document.querySelectorAll('[data-screen]')].filter((s) => !s.hidden).map((s) => s.dataset.screen)[0]
})`);
assert(!afterEsc.dialogOpen, 'Esc 未关闭确认弹窗');
assert(afterEsc.screen === 'printer-ready', 'Esc 关闭弹窗后不应离开当前页');
/* ---------- 5. 组件可复用：再造一个独立实例，文案可配置 ---------- */
const reusable = await ev(cdp, `(() => {
  if (typeof createConfirmDialog !== 'function') return { available: false };
  const custom = createConfirmDialog({ title: '退出登录', message: '确定要退出当前账号吗', confirmText: '退出', cancelText: '再想想', icon: '⚠', iconClass: 'dialog-icon--location' });
  const all = [...document.querySelectorAll('dialog.app-dialog')];
  custom.element.id = 'custom-confirm-probe';
  return {
    available: true,
    totalDialogs: all.length,
    copy: custom.element.querySelector('p').textContent.trim(),
    title: custom.element.querySelector('h2').textContent.trim(),
    buttons: [...custom.element.querySelectorAll('.dialog-actions button')].map((b) => b.textContent.trim()),
    iconClass: custom.element.querySelector('.dialog-icon').className,
    exitDialogs: all.filter((d) => !d.id).length
  };
})()`);
assert(reusable.available, 'createConfirmDialog 未暴露为可复用工厂');
assert(reusable.totalDialogs >= 2, `组件应能创建多个独立实例，实际 ${reusable.totalDialogs} 个`);
assert(reusable.copy === '确定要退出当前账号吗', `实例文案应可配置，实际「${reusable.copy}」`);
assert(reusable.title === '退出登录', `实例标题应可配置，实际「${reusable.title}」`);
assert(JSON.stringify(reusable.buttons) === JSON.stringify(['再想想', '退出']), `实例按钮文案应可配置，实际 ${JSON.stringify(reusable.buttons)}`);
assert(reusable.iconClass.includes('dialog-icon--location'), '实例图标样式应可配置');

/* 自定义实例的取消/确认分支确实可用。
   注意：不能在页面里 await ask() 的 promise —— CDP 的 awaitPromise 会与 <dialog> 模态卡住，
   所以把结果落到 window 变量上，再由测试侧同步读回。 */
await ev(cdp, `(() => {
  window.__customFlow = {};
  const custom = createConfirmDialog({ message: '确定要退出当前账号吗', confirmText: '退出', cancelText: '再想想' });
  custom.ask().then((v) => { window.__customFlow.cancelled = v; });
  [...custom.element.querySelectorAll('.dialog-actions button')].find((b) => b.textContent.trim() === '再想想').click();
  custom.ask().then((v) => { window.__customFlow.confirmed = v; });
  [...custom.element.querySelectorAll('.dialog-actions button')].find((b) => b.textContent.trim() === '退出').click();
  custom.element.remove();
  return true;
})()`);
await delay(300);
const customFlow = await ev(cdp, `({ ...window.__customFlow })`);
assert(customFlow.cancelled === false, `自定义实例点取消应返回 false，实际 ${customFlow.cancelled}`);
assert(customFlow.confirmed === true, `自定义实例点确认应返回 true，实际 ${customFlow.confirmed}`);

/* ---------- 6. 连点关闭图标不叠弹窗 ---------- */
await go(cdp, `${pairingUrl}?screen=printer-ready`);
await ev(cdp, `(() => {
  const btn = document.querySelector('#screen-printer-ready [data-close]');
  btn.click(); btn.click(); btn.click();
  return true;
})()`);
await delay(500);
const stacked = await ev(cdp, `[...document.querySelectorAll('dialog.app-dialog')].filter((d) => d.open).length`);
assert(stacked === 1, `连点关闭图标应只弹一个弹窗，实际 ${stacked} 个`);

assert(cdp.errors.length === 0, `页面存在控制台错误：${JSON.stringify(cdp.errors)}`);
cdp.close();
chrome.kill();
console.log(`\n通过 ${passed} 项`);
if (failures.length) {
  console.log(`失败 ${failures.length} 项：`);
  failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  process.exit(1);
}
console.log('统一关闭确认交互验收全部通过');
