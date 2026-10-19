/** 把 main_flow.html 渲染成 2 倍图 PNG */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8905, CDP = 9233;
const MIME = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/main_flow.html';
  const f = path.join(__dirname, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions',
  `--remote-debugging-port=${CDP}`, `--user-data-dir=${path.join(__dirname, 'chrome-profile-flow')}`,
  '--window-size=1760,1400', 'about:blank'
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
const send = (m, p = {}) => new Promise((r) => { const i = ++id; pending.set(i, { resolve: r }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const q = async (e) => {
  const r = await send('Runtime.evaluate', { expression: e, returnByValue: true });
  return r.exceptionDetails ? null : r.result.value;
};

await send('Runtime.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1720, height: 1500, deviceScaleFactor: 2, mobile: false });
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/main_flow.html` });
await sleep(4000);

const h = await q('Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)');
console.log('内容高度 =', h, 'px');
await send('Emulation.setDeviceMetricsOverride', { width: 1720, height: h, deviceScaleFactor: 2, mobile: false });
await sleep(1500);
const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
const out = path.join(__dirname, 'main_flow.png');
fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
console.log('已写出 main_flow.png：', Math.round(fs.statSync(out).size / 1024), 'KB  (2 倍图 →', 1720 * 2, 'x', h * 2, ')');

ws.close(); chrome.kill(); server.close();
process.exit(0);
