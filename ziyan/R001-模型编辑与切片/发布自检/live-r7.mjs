/**
 * 线上专用校验（r7）：确认发布链接打开的就是「自动摆盘智能优化」后的新版原型。
 * 用法：node live-r7.mjs
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'https://e51777fa19224589916707490b52cdba.app.workbuddy.host';
const CDP = 9334;

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--enable-unsafe-swiftshader', '--no-first-run', '--disable-extensions',
  `--remote-debugging-port=${CDP}`, `--user-data-dir=${path.join(__dirname, 'chrome-profile-live-r7')}`,
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

await send('Page.navigate', { url: BASE + '/prototype_v1.0.html' });
await sleep(5500);

console.log('\n=== 线上：自动摆盘智能优化（r7） ===');
check('线上原型初始化成功', await q('typeof window.__R001 === "object"'));
check('演示台存在「自动摆盘优化」分支',
  await q('document.querySelectorAll("[data-demo-opt]").length') === 1);

// 回到入口页，真实点击演示分支
await q(`__R001.go('model-detail')`);
await sleep(600);
await q(`document.querySelector('[data-demo-opt]').click()`);
await sleep(700);

check('线上点击分支 → 进入模型编辑页',
  await q('document.querySelector("#screen-model-editor").classList.contains("is-active")') === true);
check('线上 Toast 文案正确',
  (await q('document.querySelector("#toast").textContent')) === '当前已优化摆盘，同色模型摆置同一盘，目前盘数为5',
  await q('document.querySelector("#toast").textContent'));
check('线上 Toast 处于可见态',
  await q('document.querySelector("#toast").classList.contains("is-open")') === true);
const shot = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(path.join(__dirname, 'live-r7-optimized.png'), Buffer.from(shot.data, 'base64'));

check('线上优化后盘数为 5', await q('__R001.state.plates.length') === 5);
check('线上优化后零件总数为 10', await q('__R001.totalModels()') === 10);
check('线上同色两件合一盘', await q('__R001.state.plates.every(p=>p.models.length===2)') === true);
check('线上盘号连续 1..5',
  (await q(`JSON.stringify([...document.querySelectorAll('#plateChips .plate-chip')].map(b=>b.textContent))`)) ===
  JSON.stringify(['1', '2', '3', '4', '5']));

console.log('\n============ 线上实测（r7） ============');
console.log('PASS ' + pass + '   FAIL ' + fail + (errs.length ? '\n失败项：\n  - ' + errs.join('\n  - ') : ''));
ws.close(); chrome.kill();
process.exit(fail ? 1 : 0);
