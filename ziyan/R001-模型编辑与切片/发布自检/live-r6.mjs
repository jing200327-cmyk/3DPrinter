/**
 * 线上专用校验：确认发布链接打开的就是「打印设置页保存入口重构」后的新版原型。
 * 用法：node live-r6.mjs
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'https://e51777fa19224589916707490b52cdba.app.workbuddy.host';
const CDP = 9333;

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--enable-unsafe-swiftshader', '--no-first-run', '--disable-extensions',
  `--remote-debugging-port=${CDP}`, `--user-data-dir=${path.join(__dirname, 'chrome-profile-live-r6')}`,
  '--window-size=900,1000', 'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target = null;
for (let i = 0; i < 50; i++) {
  await sleep(400);
  try {
    const list = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json();
    target = list.find((t) => t.type === 'page');
    if (target) break;
  } catch { /* retry */ }
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const { resolve } = pending.get(m.id); pending.delete(m.id); resolve(m.result); }
};
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, { resolve: r }); ws.send(JSON.stringify({ id: i, method, params })); });
const q = async (e) => {
  const r = await send('Runtime.evaluate', { expression: e, returnByValue: true });
  return r.exceptionDetails ? null : r.result.value;
};
await send('Runtime.enable'); await send('Page.enable');

let pass = 0, fail = 0;
const errs = [];
const check = (name, ok, extra) => {
  if (ok) { pass++; console.log('  ✅ ' + name + (extra ? ' → ' + extra : '')); }
  else { fail++; console.log('  ❌ ' + name + (extra ? ' → ' + extra : '')); errs.push(name); }
};

await send('Page.navigate', { url: BASE + '/prototype_v1.0.html#print-settings' });
await sleep(5000);

console.log('\n=== 线上：打印设置页保存入口（r6） ===');
check('线上原型初始化成功', await q('typeof window.__R001 === "object"'));
check('顶部右侧「保存」按钮已不存在', await q('document.querySelector("#btnSaveParams") === null'));
check('顶部标题仍为「打印设置」',
  (await q('document.querySelector("#screen-print-settings .navbar__title").textContent')) === '打印设置');

await q('document.querySelector("#btnSettingsBack").click()');
await sleep(700);
check('线上点「退出」弹出保存范围弹窗',
  await q('document.querySelector("#modalSaveScope").classList.contains("is-open")') === true);
check('线上弹窗有右上角关闭按钮', await q('!!document.querySelector("#btnSaveScopeClose")'));
check('线上未选范围时底部为「取消」',
  (await q('document.querySelector("#btnSaveScopeAction").textContent')) === '取消');

await q('document.querySelector("[data-save-scope=\\"model\\"]").click()');
await sleep(400);
check('线上选中范围后底部变「确定」',
  (await q('document.querySelector("#btnSaveScopeAction").textContent')) === '确定');

const shot1 = await send('Page.captureScreenshot', { format: 'png' });
await import('node:fs').then((fs) => fs.writeFileSync(path.join(__dirname, 'live-r6-scope.png'), Buffer.from(shot1.data, 'base64')));

await q('document.querySelector("#btnSaveScopeAction").click()');
await sleep(900);
check('线上点「确定」返回模型编辑页',
  await q('document.querySelector("#screen-model-editor").classList.contains("is-active")') === true);
check('线上 Toast 为「打印设置已保存」',
  (await q('document.querySelector("#toast").textContent')) === '打印设置已保存',
  await q('document.querySelector("#toast").textContent'));
const shot2 = await send('Page.captureScreenshot', { format: 'png' });
await import('node:fs').then((fs) => fs.writeFileSync(path.join(__dirname, 'live-r6-toast.png'), Buffer.from(shot2.data, 'base64')));

console.log('\n============ 线上实测（r6） ============');
console.log('PASS ' + pass + '   FAIL ' + fail + (errs.length ? '\n失败项：\n  - ' + errs.join('\n  - ') : ''));
ws.close(); chrome.kill();
process.exit(fail ? 1 : 0);
