/**
 * 补拍离线拦截三态截图（凭证失效 / 未登录 / 凭证过期）→ _verify/14a|14b|14c-*.png
 * 背景：原三张为 9KB 占位空白图，离网流程图里三个节点渲染为空框。
 * 用法：node shoot-offline-blocks.mjs
 */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __d = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__d, '..');            // R002-模型导入/
const PROTO = path.join(ROOT, 'prototype');
const OUT = path.join(PROTO, '_verify');
const ZI = path.resolve(ROOT, '..');             // ziyan/
const PORT = 8937, CDP = 9257;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg' };
const SHARED = /^\/(dayinji|src|ugee|lianjiepeiwnag)(\/|$)/;

const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const base = SHARED.test(p) ? ZI : PROTO;
  const f = path.join(base, p);
  if (!f.startsWith(base) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); s.end('404'); return; }
  s.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(s);
});
await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'offblk-'));
const ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--enable-unsafe-swiftshader', '--no-first-run',
  '--disable-extensions', '--hide-scrollbars', '--window-size=440,980',
  `--remote-debugging-port=${CDP}`, `--user-data-dir=${profile}`, 'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let t = null;
for (let i = 0; i < 60; i++) {
  await sleep(400);
  try { const l = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json(); t = l.find((x) => x.type === 'page'); if (t) break; } catch { /* retry */ }
}
if (!t) { console.error('无法连接 Chrome'); process.exit(2); }
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((a, b) => { ws.onopen = a; ws.onerror = b; });
let id = 0; const pend = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const { res, rej } = pend.get(m.id); pend.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); } };
const send = (me, pa = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: me, params: pa })); });
await send('Runtime.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 440, height: 980, deviceScaleFactor: 2, mobile: true });
const ev = async (x) => {
  const r = await send('Runtime.evaluate', { expression: `(function(){ return (${x}); })()`, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};

const SHOTS = [
  ['#offline-invalid', '14a-offline-invalid.png'],
  ['#offline-guest', '14b-offline-guest.png'],
  ['#offline-expired', '14c-offline-expired.png'],
];
let n = 0;
for (const [hash, file] of SHOTS) {
  n++;
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/prototype_v1.1.html?n=blk${n}${hash}` });
  // 轮询到弹窗真正打开（深链 → 叠加层有 240ms 动画，需等条件成立）
  let okFlag = false;
  for (let i = 0; i < 40; i++) {
    await sleep(300);
    try { okFlag = await ev("!!window.__R002 && document.querySelector('#modalOfflineBlock').classList.contains('is-open')"); if (okFlag) break; } catch { /* retry */ }
  }
  await sleep(500);   // 等弹层动画结束
  const title = await ev("document.querySelector('#offlineBlockTitle').textContent");
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, file), Buffer.from(shot.data, 'base64'));
  console.error(`  ✓ ${file}  「${title}」  ${Math.round(Buffer.from(shot.data, 'base64').length / 1024)}KB`);
}

try { ws.close(); } catch { /* ignore */ }
ch.kill(); srv.close();
try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
console.error('完成');
process.exit(0);