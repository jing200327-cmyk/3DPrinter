/** 线上地址实测：原型是否真能跑（WebGL / 3D 绘制 / 无报错） */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'https://e51777fa19224589916707490b52cdba.app.workbuddy.host';
const CDP = 9228;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--enable-unsafe-swiftshader', '--no-first-run', '--disable-extensions',
  `--remote-debugging-port=${CDP}`, `--user-data-dir=${path.join(__dirname, 'chrome-profile-live')}`, 'about:blank'
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

console.log('线上地址：' + BASE);
console.log('\n=== 原型（线上） ===');
await send('Page.navigate', { url: BASE + '/' });
await sleep(6000);
check('页面标题正确', (await q('document.title')).includes('模型编辑与切片'));
check('Three.js 从线上加载成功', await q('!!window.THREE'));
check('应用初始化完成', await q('!!window.__R001'));
check('内嵌 STL 解析成功（真实尺寸）', await q('window.__R001.BASE.x > 60 && window.__R001.BASE.y > 99'),
  await q('JSON.stringify(window.__R001 && window.__R001.BASE)'));
check('模型详情页复用图已加载', await q(`(()=>{const i=document.querySelector('#mdArtwork');return !!i&&i.complete&&i.naturalWidth>0;})()`));
await q(`__R001.go('model-editor')`); await sleep(1200);
const px = await q(`(()=>{const c=document.querySelector('#gl');const t=document.createElement('canvas');t.width=c.width;t.height=c.height;const x=t.getContext('2d');x.drawImage(c,0,0);const d=x.getImageData(0,0,t.width,t.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>10)n++;return n;})()`);
check('3D 实际绘制出内容（canvas 有效像素 ' + px + '）', px > 2000);
await q(`__R001.selectModel(__R001.currentPlate().models[0].id); __R001.setPercent(60)`);
await sleep(600);
check('线上交互可用（缩放生效）', await q(`Math.abs(__R001.currentPlate().models[0].sx-0.6)<1e-6`));
const s = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(path.join(__dirname, 'live-editor.png'), Buffer.from(s.data, 'base64'));
check('无报错', errs.length === 0, errs.slice(0, 4).join(' | '));

console.log('\n=== PRD（线上） ===');
errs.length = 0;
await send('Page.navigate', { url: BASE + '/prd.html' });
await sleep(4000);
const t = await q(`document.getElementById('doc').innerText`);
check('PRD 正文渲染成功（长度 ' + (t ? t.length : 0) + '）', t && t.length > 2000);
check('无报错', errs.length === 0, errs.slice(0, 3).join(' | '));

console.log('\n=== 截图画廊（线上） ===');
errs.length = 0;
await send('Page.navigate', { url: BASE + '/shots/index.html' });
await sleep(5000);
check('画廊所有截图全部加载成功（无破图）', await q(`[...document.querySelectorAll('.grid img')].every(i=>i.complete&&i.naturalWidth>0)`));
check('无报错', errs.length === 0, errs.slice(0, 3).join(' | '));

console.log(`\n============ 线上实测 ============`);
console.log(`PASS ${pass}   FAIL ${fail}`);
ws.close(); chrome.kill();
process.exit(fail ? 1 : 0);
