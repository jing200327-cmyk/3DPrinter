/**
 * 从真实原型里抓「手机屏」干净截图（隐藏演示侧栏、白底、2x），
 * 用于合成 PRD 流程图。
 *
 * 用法：node make-thumbs.mjs
 * 产出：flowcharts/thumbs/*.png
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROTOTYPE = path.resolve(__dirname, '..', 'prototype');
const OUT = path.join(__dirname, 'thumbs');
fs.mkdirSync(OUT, { recursive: true });

const PORT = 8903, CDP = 9231;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/prototype_v1.0.html';
  const f = path.join(PROTOTYPE, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--enable-unsafe-swiftshader', '--no-first-run', '--disable-extensions',
  `--remote-debugging-port=${CDP}`, `--user-data-dir=${path.join(__dirname, 'chrome-profile-thumbs')}`,
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
  } catch { }
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

const PREP = `(() => {
  if (!document.getElementById('__thumbcss')) {
    const s = document.createElement('style'); s.id = '__thumbcss';
    s.textContent = 'body{background:#fff!important} .stage{padding:0!important;gap:0!important;align-items:flex-start!important}' +
                    ' .demo{display:none!important} .toast{display:none!important}';
    document.head.appendChild(s);
  }
})()`;

/** 每个状态：先执行 setup，再等一会，然后裁手机外壳 */
const STATES = [
  ['entry', `__R001.go('model-detail')`, 900],
  ['editor-1', `__R001.demo(1); __R001.rebuild(); __R001.go('model-editor');`, 1400],
  ['editor-8', `__R001.demo(8); __R001.rebuild();`, 1400],
  ['selected', `__R001.demo(1); __R001.rebuild(); __R001.selectModel(__R001.currentPlate().models[0].id);`, 1200],
  ['scale-scale', `__R001.demo(1); __R001.rebuild(); __R001.selectModel(__R001.currentPlate().models[0].id); __R001.openScaleSheet();`, 1500],
  ['scale-percent', `__R001.setPercent(60);`, 1200],
  ['copy', `__R001.closeScaleSheet(); __R001.copy();`, 1200],
  ['prepare-settings', `__R001.go('print-settings');`, 1100],
  ['support-off', `document.querySelector('#toggleSupport').click();`, 900],
  ['save-scope', `__R001.go('print-settings'); __R001.openSaveScope();`, 1000],
  ['save-scope-selected', `document.querySelector('[data-save-scope="model"]').click();`, 800],
  ['slice-loading', `document.querySelector('[data-close-modal]').click(); __R001.go('model-editor'); __R001.demo(3); __R001.rebuild();`, 1100],
  ['slicing', `__R001.runSlice();`, 900],
  ['prepare', ``, 3400],
  ['save-name', `document.querySelector('#btnSaveSlice').click();`, 1000],
  ['saving-progress', `document.querySelector('#modalSaveName [data-close-modal]').click(); __R001.openSaveName(); __R001.startSaving();`, 800],
  ['save-done', `__R001.finishSaving();`, 1000],
  ['slice-failed', `__R001.state.sliceFail = true; __R001.go('model-editor'); __R001.runSlice();`, 3800],
  ['out-of-bounds', `__R001.state.sliceFail = false; __R001.demo(1); __R001.rebuild(); __R001.go('model-editor'); __R001.state.outOfBounds = true; __R001.rebuild();`, 1400],
  ['empty-plate', `__R001.state.outOfBounds = false; __R001.demo(1); __R001.rebuild(); __R001.selectModel(__R001.currentPlate().models[0].id); __R001.remove();`, 1200],
];

await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/prototype_v1.0.html` });
await sleep(3500);
await q(PREP);
await sleep(400);

const pad = 17;
for (const [name, setup, wait] of STATES) {
  if (setup) await q(setup);
  await q(PREP);
  await sleep(wait);
  const r = await q(`JSON.stringify((()=>{const b=document.querySelector('.phone').getBoundingClientRect();
    return {x:b.left, y:b.top, w:b.width, h:b.height};})())`);
  const box = JSON.parse(r);
  const shot = await send('Page.captureScreenshot', {
    format: 'png',
    clip: { x: box.x - pad, y: box.y - pad, width: box.w + pad * 2, height: box.h + pad * 2, scale: 2 }
  });
  const file = path.join(OUT, name + '.png');
  fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
  console.log('  ✅ ' + name + '  (' + Math.round(fs.statSync(file).size / 1024) + ' KB)');
}

ws.close(); chrome.kill(); server.close();
process.exit(0);
