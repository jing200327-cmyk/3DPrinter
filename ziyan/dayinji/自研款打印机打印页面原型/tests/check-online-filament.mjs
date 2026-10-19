/* 线上验收：打开打印页面原型 → 选中料盘 → 进料 → 断言插画真的从服务端加载成功
   运行：node tests/check-online-filament.mjs <站点根URL> */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const base = (process.argv[2] || '').replace(/\/$/, '');
if (!base) {
  console.error('用法：node tests/check-online-filament.mjs <站点根URL>');
  process.exit(1);
}
const query = process.argv[3] || '';
const pageUrl = base + '/' + encodeURI('dayinji/自研款打印机打印页面原型/index.html') + query;

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ziyan-online-'));
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=0', `--user-data-dir=${profileDir}`, '--window-size=375,812', 'about:blank'], { stdio: 'ignore' });
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
let port = '';
for (let i = 0; i < 120; i += 1) {
  const f = path.join(profileDir, 'DevToolsActivePort');
  if (fs.existsSync(f)) { port = fs.readFileSync(f, 'utf8').split(/\r?\n/)[0]; break; }
  await delay(100);
}
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const socket = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => socket.addEventListener('open', r));
let id = 0;
const pend = new Map();
const failed = [];
socket.addEventListener('message', ({ data }) => {
  const m = JSON.parse(data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
  if (m.method === 'Network.loadingFailed') failed.push(m.params);
});
const send = (method, params = {}) => new Promise((res) => { id += 1; pend.set(id, res); socket.send(JSON.stringify({ id, method, params })); });
await send('Runtime.enable');
await send('Page.enable');
/* 不要禁用缓存：CDN 对带 no-cache 的请求会命中另一份旧分片，正常浏览器不会带这个头 */
await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });

const ev = async (e, ap = false) => {
  const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: ap });
  if (r.exceptionDetails) {
    console.log('  [页面异常] ' + r.exceptionDetails.text + ' :: ' + (r.exceptionDetails.exception ? r.exceptionDetails.exception.description : ''));
    return undefined;
  }
  return r.result.value;
};
const readJson = async (expression, ap = false) => {
  const raw = await ev(expression, ap);
  try { return JSON.parse(raw); } catch { return null; }
};

await send('Page.navigate', { url: pageUrl });
await delay(3200);
const booted = await ev(`Boolean(window.__filamentOperation) && Boolean(document.querySelector('#load-filament'))`);
if (!booted) {
  console.log('  诊断：' + await ev(`JSON.stringify({ hasTip: Boolean(document.querySelector('#filament-operation-tip')), scripts: [...document.querySelectorAll('script')].map(s => s.getAttribute('src')), links: [...document.querySelectorAll('link[rel=stylesheet]')].map(l => l.getAttribute('href')) })`));
}

const results = [];
const check = (ok, message) => results.push({ ok, message });

check(booted, '线上页面注入了进料调试句柄（说明拿到的是新版 prototype.js）');
if (booted) {
  await ev(`window.__filamentOperation.durations({ heat: 1500, move: 800, tipAt: 100000 })`);
  await ev(`document.querySelector('#filament-spool').click(); document.querySelector('#load-filament').click(); true`);
  await delay(300);
  const heat = await readJson(`JSON.stringify({ hidden: document.querySelector('#filament-operation-screen').hidden, label: document.querySelector('#filament-operation-label').textContent, temp: !document.querySelector('#filament-operation-temp').hidden })`);
  check(Boolean(heat) && !heat.hidden && heat.label === '加热喷嘴温度' && heat.temp, '线上进料中页面打开并停在加热步：' + JSON.stringify(heat));
  await delay(1600);
  const pull = await readJson(`(async () => {
    const img = document.querySelector('#filament-operation-art');
    if (!img.complete) await new Promise(r => img.addEventListener('load', r, { once: true }));
    await new Promise(r => setTimeout(r, 200));
    return JSON.stringify({ label: document.querySelector('#filament-operation-label').textContent, src: decodeURI(img.currentSrc), ok: img.complete && img.naturalWidth > 0, size: [img.naturalWidth, img.naturalHeight] });
  })()`, true);
  check(Boolean(pull) && pull.src.indexOf('assets/') !== -1 && pull.ok && pull.size[0] > 0, '线上进料插画真的从 assets/ 加载成功：' + JSON.stringify(pull));
  await delay(1000);
  const push = await readJson(`(async () => {
    const img = document.querySelector('#filament-operation-art');
    if (!img.complete) await new Promise(r => img.addEventListener('load', r, { once: true }));
    await new Promise(r => setTimeout(r, 200));
    return JSON.stringify({ label: document.querySelector('#filament-operation-label').textContent, src: decodeURI(img.currentSrc), ok: img.complete && img.naturalWidth > 0 });
  })()`, true);
  check(Boolean(push) && push.ok && push.src.indexOf('送出新耗材') !== -1, '线上送出新耗材插画加载成功：' + JSON.stringify(push));
}
console.log('网络失败请求：', failed.length ? failed.map((f) => f.errorText + ' ' + (f.blockedReason || '')) : '无');

const bad = results.filter((r) => !r.ok);
console.log('\n线上进料链路校验：通过 ' + (results.length - bad.length) + ' / ' + results.length);
results.forEach((r) => console.log((r.ok ? '  ✅ ' : '  ❌ ') + r.message));
socket.close();
chrome.kill();
if (bad.length) process.exitCode = 1;
