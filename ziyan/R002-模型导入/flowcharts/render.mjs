/**
 * 渲染 index.html → main_flow.png（主链路）+ offline_flow.png（无网链路）
 * 用法：node render.mjs
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __d = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__d, '..');
const PORT = 8914, CDP = 9233;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.mmd': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml'
};

const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); s.end('404'); return; }
  s.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(s);
});
await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));

const ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--enable-unsafe-swiftshader', '--no-first-run',
  '--window-size=1720,1200', `--remote-debugging-port=${CDP}`,
  `--user-data-dir=${path.join(__d, 'chrome-profile')}`, 'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let t = null;
for (let i = 0; i < 60; i++) {
  await sleep(400);
  try {
    const l = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json();
    t = l.find((x) => x.type === 'page');
    if (t) break;
  } catch { /* retry */ }
}
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((a, b) => { ws.onopen = a; ws.onerror = b; });
let id = 0; const pend = new Map(); const errs = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const { res, rej } = pend.get(m.id); pend.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); return; }
  if (m.method === 'Runtime.exceptionThrown') errs.push('EXC ' + (m.params.exceptionDetails && m.params.exceptionDetails.text));
};
const send = (me, pa = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: me, params: pa })); });
await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1720, height: 1200, deviceScaleFactor: 2, mobile: false });

await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/flowcharts/index.html` });
// 等所有截图完成加载
await sleep(2500);
const ev = async (x) => {
  const r = await send('Runtime.evaluate', { expression: `(function(){return (${x});})()`, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text);
  return r.result.value;
};

const broken = await ev(`(function(){
    var ns=document.querySelectorAll('img.node__shot');
    var miss=[];ns.forEach(function(im){if(!im.complete||im.naturalWidth===0)miss.push(im.alt||im.src.split('/').pop());});
    return miss;
  })()`);
console.log('图片加载失败:', broken.length ? broken.join(', ') : '无');

// 等到所有图完成
for (let i = 0; i < 30 && broken.length === 0; i++) {
  await sleep(300);
  const b = await ev(`(function(){
    var ns=document.querySelectorAll('img.node__shot');
    for(var i=0;i<ns.length;i++) if(!ns[i].complete||ns[i].naturalWidth===0) return true;
    return false;
  })()`);
  if (!b) break;
}

async function shootSection(id, file) {
  const box = await ev(`(function(){
    var c=document.getElementById('${id}');
    var r=c.getBoundingClientRect();
    return {x:Math.round(r.left+window.scrollX),y:Math.round(r.top+window.scrollY),w:Math.ceil(r.width),h:Math.ceil(r.height)};
  })()`);
  const shot = await send('Page.captureScreenshot', {
    format: 'png', captureBeyondViewport: true,
    clip: { x: box.x, y: box.y, width: box.w, height: box.h, scale: 2 }
  });
  fs.writeFileSync(path.join(__d, file), Buffer.from(shot.data, 'base64'));
  console.log('  → ' + file + '  (' + box.w + '×' + box.h + ')');
}

await shootSection('main-flow', 'main_flow.png');
await shootSection('offline-flow', 'offline_flow.png');

try { ws.close(); } catch { /* ignore */ }
ch.kill();
srv.close();
process.exit(errs.length ? 1 : 0);