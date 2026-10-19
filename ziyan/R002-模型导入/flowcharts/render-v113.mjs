/**
 * 精简渲染器：flowcharts/index.html → main_flow.png + offline_flow.png
 * 沿用 check-v11.mjs 已验证的 Chrome 启动模式（唯一临时 profile + CDP 轮询 + 条件等待）。
 * 用法：node render-v113.mjs
 */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __d = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__d, '..');
const PORT = 8936, CDP = 9256;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg' };

const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); s.end('404'); return; }
  s.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(s);
});
await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'flow-'));
const ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--enable-unsafe-swiftshader', '--no-first-run',
  '--disable-extensions', '--hide-scrollbars', '--window-size=1760,1400',
  `--remote-debugging-port=${CDP}`, `--user-data-dir=${profile}`, 'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let t = null;
for (let i = 0; i < 60; i++) {
  await sleep(400);
  try {
    const l = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json();
    t = l.find((x) => x.type === 'page'); if (t) break;
  } catch { /* retry */ }
}
if (!t) { console.error('无法连接 Chrome'); process.exit(2); }
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((a, b) => { ws.onopen = a; ws.onerror = b; });
let id = 0; const pend = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const { res, rej } = pend.get(m.id); pend.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
};
const send = (me, pa = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: me, params: pa })); });
await send('Runtime.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1760, height: 1400, deviceScaleFactor: 2, mobile: false });
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/flowcharts/index.html` });

const ev = async (x) => {
  const r = await send('Runtime.evaluate', { expression: `(function(){return (${x});})()`, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};

// 条件等待：页面就绪 + 所有截图节点图片解码完成（替代固定 sleep）
let ready = false;
for (let i = 0; i < 80; i++) {
  await sleep(400);
  try {
    ready = await ev(`(function(){
      if (document.readyState !== 'complete') return false;
      var ns = document.querySelectorAll('img.node__shot');
      if (!ns.length) return false;
      for (var i=0;i<ns.length;i++) if (!ns[i].complete || ns[i].naturalWidth===0) return false;
      return true;
    })()`);
    if (ready) break;
  } catch { /* retry */ }
}
console.log('页面与截图资源就绪:', ready);
const missing = await ev(`Array.from(document.querySelectorAll('img.node__shot')).filter(function(im){return !im.complete||im.naturalWidth===0;}).map(function(im){return im.src;})`);
if (missing.length) { console.error('仍有加载失败:', missing); }
const counts = await ev(`({shots: document.querySelectorAll('img.node__shot').length})`);
console.log('截图节点数:', counts.shots);
await sleep(800);

async function shoot(id, file) {
  const box = await ev(`(function(){
    var c = document.getElementById('${id}');
    var r = c.getBoundingClientRect();
    return { x: Math.round(r.left+window.scrollX), y: Math.round(r.top+window.scrollY), w: Math.ceil(r.width), h: Math.ceil(r.height) };
  })()`);
  console.error(`[${id}] box = ${box.w}x${box.h} @ ${box.x},${box.y}`);
  // 把视口调到能容纳整个 section，再整屏截图（避免 captureBeyondViewport 在高区块上失败）
  const vh = Math.min(16000, Math.max(1200, box.y + box.h + 40));
  await send('Emulation.setDeviceMetricsOverride', { width: 1800, height: vh, deviceScaleFactor: 2, mobile: false });
  await sleep(600);
  await ev(`window.scrollTo(0, 0)`);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__d, file), Buffer.from(shot.data, 'base64'));
  console.error('  →', file);
  // 还原视口
  await send('Emulation.setDeviceMetricsOverride', { width: 1760, height: 1400, deviceScaleFactor: 2, mobile: false });
}
try {
  await shoot('main-flow', 'main_flow.png');
  await shoot('offline-flow', 'offline_flow.png');
} catch (e) {
  console.error('截图失败:', e && e.message || e);
}

try { ws.close(); } catch { /* ignore */ }
ch.kill();
srv.close();
try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
process.exit(0);