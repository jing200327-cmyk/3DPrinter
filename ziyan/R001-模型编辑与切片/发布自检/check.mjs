/** 发布站点本地自检：三个页面能否正常打开、有无报错 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '发布');   // 发布/
const PORT = 8901, CDP = 9227;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.md': 'text/markdown; charset=utf-8', '.json': 'application/json' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--enable-unsafe-swiftshader', '--no-first-run', '--disable-extensions',
  `--remote-debugging-port=${CDP}`, `--user-data-dir=${path.join(__dirname, 'chrome-profile-deploy')}`, 'about:blank'
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
let id = 0; const pending = new Map(); const errs = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const { resolve } = pending.get(m.id); pending.delete(m.id); resolve(m.result); return; }
  if (m.method === 'Runtime.exceptionThrown') errs.push('EXC: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push('CONSOLE: ' + m.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errs.push('LOG: ' + m.params.entry.text);
};
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, { resolve: r }); ws.send(JSON.stringify({ id: i, method, params })); });
const q = async (e) => {
  const r = await send('Runtime.evaluate', { expression: e, returnByValue: true });
  return r.exceptionDetails ? 'ERR:' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text) : r.result.value;
};

await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable');

let pass = 0, fail = 0;
const check = (n, c, d) => { if (c) { pass++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n + (d ? ' → ' + d : '')); } };

// ---------- 1. 原型首页 ----------
console.log('\n=== 1. index.html（原型） ===');
errs.length = 0;
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` });
await sleep(3000);
check('页面标题正确', (await q('document.title')).includes('模型编辑与切片'));
check('Three.js 已加载', await q('!!window.THREE'));
check('应用初始化完成', await q('!!window.__R001'));
check('内嵌 STL 模型解析成功', await q('window.__R001.BASE.x > 60'));
const shot = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(path.join(__dirname, 'deploy-01-index.png'), Buffer.from(shot.data, 'base64'));
await q(`__R001.go('model-editor')`); await sleep(900);
check('进入编辑页后 3D 实际绘制出内容', await q(`(()=>{const c=document.querySelector('#gl');const t=document.createElement('canvas');t.width=c.width;t.height=c.height;const x=t.getContext('2d');x.drawImage(c,0,0);const d=x.getImageData(0,0,t.width,t.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>10)n++;return n;})()`) > 2000);
const shot2 = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(path.join(__dirname, 'deploy-02-editor.png'), Buffer.from(shot2.data, 'base64'));
check('无报错', errs.length === 0, errs.slice(0, 3).join(' | '));

// ---------- 2. PRD ----------
console.log('\n=== 2. prd.html ===');
errs.length = 0;
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/prd.html` });
await sleep(2500);
const prdText = await q(`document.getElementById('doc').innerText`);
check('PRD 渲染出正文（非加载中/失败）', prdText && prdText.length > 2000, '长度 ' + (prdText ? prdText.length : 0));
check('包含关键章节「需求目标」', prdText.includes('需求目标'));
check('包含关键章节「数据追踪与埋点」', prdText.includes('数据追踪与埋点'));
check('表格已渲染', await q(`document.querySelectorAll('#doc table').length`) > 5);
check('无报错', errs.length === 0, errs.slice(0, 3).join(' | '));
const shot3 = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(path.join(__dirname, 'deploy-03-prd.png'), Buffer.from(shot3.data, 'base64'));

// ---------- 3. 截图画廊 ----------
console.log('\n=== 3. shots/index.html ===');
errs.length = 0;
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/shots/index.html` });
await sleep(2500);
const expectedShots = fs.readdirSync(path.join(ROOT, 'shots')).filter((f) => f.endsWith('.png')).length;
check('画廊张数与截图目录一致（' + expectedShots + ' 张）', await q(`document.querySelectorAll('.grid figure').length`) === expectedShots);
check('图片全部加载成功（无破图）', await q(`[...document.querySelectorAll('.grid img')].every(i=>i.complete && i.naturalWidth>0)`));
check('无报错', errs.length === 0, errs.slice(0, 3).join(' | '));
const shot4 = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(path.join(__dirname, 'deploy-04-shots.png'), Buffer.from(shot4.data, 'base64'));

console.log(`\n============ 结果 ============`);
console.log(`PASS ${pass}   FAIL ${fail}`);
ws.close(); chrome.kill(); server.close();
process.exit(fail ? 1 : 0);
