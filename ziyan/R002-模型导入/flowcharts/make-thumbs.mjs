/**
 * 从真实原型里抓「手机屏」干净截图（隐藏演示侧栏、白底、2x），
 * 用于合成 R002 PRD 流程图。管线与 R001 make-thumbs.mjs 一致。
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

const PORT = 8904, CDP = 9231;
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
  if (r.exceptionDetails) {
    console.log('  ⚠ JS 异常: ' + ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text).slice(0, 200));
    return null;
  }
  return r.result.value;
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

/** 每个状态前的统一复位：关弹窗 / 关弹层 / 回有网 */
const RESET = `(() => {
  document.querySelectorAll('.modal.is-open').forEach(m => m.classList.remove('is-open'));
  __R002.closeImportSheet();
  __R002.state.offlineBanner = false; __R002.syncNetBanner();
  __R002.state.importMode = 'normal';
})();`;

/** 每个状态：先执行 setup，再等一会，然后裁手机外壳 */
const STATES = [
  ['entry',            `__R002.go('creative-space');`, 900],
  ['empty-editor',     `__R002.go('import-empty-editor');`, 1100],
  ['import-sheet',     `__R002.go('import-sheet');`, 1100],
  ['my-slice',         `__R002.go('import-sheet/slice');`, 1100],
  ['picker-multi',     `__R002.go('system-picker'); document.querySelector('#btnPickerAll').click();`, 1200],
  ['compress',         `__R002.go('compress-dialog');`, 1100],
  ['format',           `__R002.go('format-unsupported');`, 1100],
  ['progress',         `__R002.go('import-progress');`, 1400],
  ['partial',          `__R002.go('partial-result');`, 1300],
  ['overflow',         `__R002.runDemo('overflow');`, 1400],
  ['editor-3',         `__R001.demo(3); __R001.rebuild(); __R002.go('model-editor');`, 1500],
  ['r001-detail',      `${RESET} __R002.go('model-detail');`, 1100],
  ['offline-banner',   `${RESET} __R002.go('offline-dialog');`, 1200],
  ['offline-picker',   `${RESET} __R002.go('offline-picker');`, 1200],
  ['offline-unbound',  `${RESET} __R002.go('offline-unbound');`, 1200],
  ['offline-transfer', `${RESET} __R002.go('offline-transfer');`, 1200],
  ['upload-progress',  `${RESET} __R002.go('upload-progress');`, 1400],
  ['upload-done',      `${RESET} __R002.go('upload-done');`, 1400],
  ['offline-prepare',  `${RESET} __R002.go('offline-prepare');`, 1400]
];

await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/prototype_v1.0.html` });
await sleep(4500);   // 首次加载 vendor（three.js 等）较慢
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
