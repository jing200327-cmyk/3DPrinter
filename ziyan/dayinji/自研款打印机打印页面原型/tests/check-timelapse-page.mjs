/* 延时摄影模型列表页专项校验（真实 DOM 的下载 → 进度 → 播放、多选删除）。
   用法：node tests/check-timelapse-page.mjs [file:// 本地页 或 http:// 站点根URL]
   验：① 列表按原图顺序列出三个模型，缩略图真的加载出来；② 点「下载」出现进度环与
   「下载中…」，跑满后按钮变「播放」且缩略图中央出现播放图标；③ 顶栏删除进入多选态、
   可多选、批量删除后未选中的保留；④ 摄像头右上角「延时摄影」按钮能进本页。
   另存三张验收图：默认 / 下载中 / 可播放（+ 多选态）。 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const target = process.argv[2] || pathToFileURL(path.join(root, 'index.html')).href;
const isOnline = /^https?:/.test(target);
const pageUrl = isOnline
  ? `${target.replace(/\/+$/, '')}/${['dayinji', '自研款打印机打印页面原型', 'index.html'].map(encodeURIComponent).join('/')}`
  : target;

const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ziyan-timelapse-'));
const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--remote-debugging-port=0', `--user-data-dir=${profileDir}`, '--window-size=390,844', pageUrl], { stdio: 'ignore' });
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
let passed = 0;
const failures = [];
const assert = (ok, m) => { if (ok) passed += 1; else failures.push(m); };

async function port() {
  const f = path.join(profileDir, 'DevToolsActivePort');
  for (let i = 0; i < 100; i++) { if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').split(/\r?\n/)[0]; await delay(100); }
  throw new Error('Chrome 没起来：拿不到 DevTools 端口');
}
function connect(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  const errors = [];
  let seq = 0;
  socket.addEventListener('message', ({ data }) => {
    const m = JSON.parse(data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); return; }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value || a.description).join(' '));
  });
  return {
    errors,
    ready: new Promise((res, rej) => { socket.addEventListener('open', res, { once: true }); socket.addEventListener('error', rej, { once: true }); }),
    send(method, params = {}) { seq += 1; return new Promise((resolve, reject) => { pending.set(seq, { resolve, reject }); socket.send(JSON.stringify({ id: seq, method, params })); }); },
    close() { socket.close(); }
  };
}
const ev = async (cdp, expr) => (await cdp.send('Runtime.evaluate', { returnByValue: true, awaitPromise: true, expression: expr })).result.value;
async function waitFor(cdp, expr, message, timeoutMs = 25000) {
  const started = Date.now();
  for (;;) {
    try { if (await ev(cdp, expr)) return; } catch { /* 导航瞬间执行上下文会被替换 */ }
    if (Date.now() - started > timeoutMs) throw new Error(message);
    await delay(250);
  }
}
const clickSel = async (cdp, sel) => {
  const box = await ev(cdp, `(() => { const el = document.querySelector(${JSON.stringify(sel)}); const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
  for (const type of ['mousePressed', 'mouseReleased']) {
    await cdp.send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 });
  }
};

try {
  const p = await port();
  const targets = await fetch(`http://127.0.0.1:${p}/json/list`).then((r) => r.json());
  const cdp = connect(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  /* 线上冷启动慢：等 JS 就绪（openReuseScreen 是页面脚本里的函数），不能只等 DOM */
  await waitFor(cdp, `typeof openReuseScreen === 'function' && !!document.querySelector('#timelapse-action')`, '页面脚本没就绪');

  // 摄像头右上角「延时摄影」按钮 → 本页
  await clickSel(cdp, '#timelapse-action');
  await waitFor(cdp, `!document.querySelector('#timelapse-screen').hidden`, '摄像头右上角的延时摄影按钮没有进入模型列表页');
  const opened = await ev(cdp, `({ title: document.querySelector('.timelapse-bar__title').textContent, count: document.querySelectorAll('.timelapse-item:not([hidden])').length })`);
  assert(opened.title === '延时摄影', `页面标题不对：${JSON.stringify(opened)}`);
  assert(opened.count === 3, `应列出 3 个模型，实际 ${opened.count}`);

  // 列表内容与顺序必须与参考图一致
  const list = await ev(cdp, `(async () => {
    /* 缩略图是 JS 动态插入的 <img>，线上走网关、解码比本地慢：
       这里显式等每张图 complete 再读，否则会把「还没解码完」误判成「图挂了」 */
    const imgs = [...document.querySelectorAll('.timelapse-item:not([hidden]) .timelapse-thumb img')];
    await Promise.all(imgs.map((img) => (img.complete ? Promise.resolve() : new Promise((r) => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); }))));
    return [...document.querySelectorAll('.timelapse-item:not([hidden])')].map((el) => {
      const img = el.querySelector('.timelapse-thumb img');
      return {
        name: el.querySelector('.timelapse-name').textContent,
        meta: [...el.querySelectorAll('.timelapse-sub span')].map((s) => s.textContent),
        label: el.querySelector('[data-role="label"]').textContent,
        status: el.dataset.status,
        loaded: img.complete && img.naturalWidth > 0,
        natural: [img.naturalWidth, img.naturalHeight]
      };
    });
  })()`);
  assert(JSON.stringify(list.map((i) => i.name)) === JSON.stringify(['史蒂夫_01', '史蒂夫_02_012209', '史蒂夫_03_012207']), `模型名称/顺序与参考图不一致：${JSON.stringify(list)}`);
  assert(JSON.stringify(list[0].meta) === JSON.stringify(['5 h 15 min', '62g']), `第一个模型的时长/克重与参考图不一致：${JSON.stringify(list[0])}`);
  assert(JSON.stringify(list[1].meta) === JSON.stringify(['3 h 48 min', '50g']), `第二个模型的时长/克重与参考图不一致：${JSON.stringify(list[1])}`);
  assert(JSON.stringify(list[2].meta) === JSON.stringify(['1 h 35 min', '20g']), `第三个模型的时长/克重与参考图不一致：${JSON.stringify(list[2])}`);
  list.forEach((i) => assert(i.loaded && i.natural[0] > 0, `缩略图没加载出来：${JSON.stringify(i)}`));
  list.forEach((i) => assert(i.label === '下载' && i.status === 'idle', `初始状态应为「未下载」：${JSON.stringify(i)}`));

  // 命中盒 ≥44px（真实鼠标点击要用）
  const hitBoxes = await ev(cdp, `[...document.querySelectorAll('.timelapse-cta, .timelapse-bar__btn')].map((el) => ({ id: el.id || el.className, w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) }))`);
  hitBoxes.forEach((b) => assert(b.w >= 44 && b.h >= 44, `命中盒不足 44px：${JSON.stringify(b)}`));

  await cdp.send('Page.captureScreenshot', { format: 'png' }).then((s) => fs.writeFileSync(path.join(root, 'tests', 'prototype-timelapse-list.png'), Buffer.from(s.data, 'base64')));

  // 点第一个模型的「下载」→ 应立刻进入下载中
  await clickSel(cdp, '.timelapse-item:nth-child(1) .timelapse-cta');
  await waitFor(cdp, `document.querySelector('.timelapse-item:nth-child(1)').dataset.status === 'downloading'`, '点下载后没有进入下载中状态');
  const downloading = await ev(cdp, `(() => {
    const el = document.querySelector('.timelapse-item:nth-child(1)');
    const ring = el.querySelector('.timelapse-ring');
    return {
      label: el.querySelector('[data-role="label"]').textContent,
      ringVisible: !ring.hidden,
      percent: el.querySelector('[data-role="percent"]').textContent,
      barWidth: el.querySelector('[data-role="bar"]').style.width,
      badgeHidden: el.querySelector('.timelapse-play-badge').hidden,
      disabled: el.querySelector('.timelapse-cta').disabled
    };
  })()`);
  assert(downloading.label === '下载中…', `下载中按钮文案不对：${JSON.stringify(downloading)}`);
  assert(downloading.ringVisible, `下载中应显示缩略图进度环：${JSON.stringify(downloading)}`);
  assert(downloading.disabled, '下载中按钮应不可重复点击');
  assert(downloading.badgeHidden, '下载中不应出现播放图标');
  await cdp.send('Page.captureScreenshot', { format: 'png' }).then((s) => fs.writeFileSync(path.join(root, 'tests', 'prototype-timelapse-downloading.png'), Buffer.from(s.data, 'base64')));

  // 等进度跑满 → 变「播放」+ 缩略图中央播放图标
  await waitFor(cdp, `document.querySelector('.timelapse-item:nth-child(1)').dataset.status === 'ready'`, '下载进度没有跑完 / 没有切到可播放状态', 30000);
  const ready = await ev(cdp, `(() => {
    const el = document.querySelector('.timelapse-item:nth-child(1)');
    const badge = el.querySelector('.timelapse-play-badge');
    const r = badge.getBoundingClientRect();
    const t = el.querySelector('.timelapse-thumb').getBoundingClientRect();
    return {
      label: el.querySelector('[data-role="label"]').textContent,
      ringHidden: el.querySelector('.timelapse-ring').hidden,
      badgeVisible: !badge.hidden,
      badgeCentred: Math.abs((r.left + r.width / 2) - (t.left + t.width / 2)) < 2 && Math.abs((r.top + r.height / 2) - (t.top + t.height / 2)) < 2,
      disabled: el.querySelector('.timelapse-cta').disabled
    };
  })()`);
  assert(ready.label === '播放', `下载完成后按钮应变「播放」：${JSON.stringify(ready)}`);
  assert(ready.ringHidden, '下载完成后进度环应收起');
  assert(ready.badgeVisible && ready.badgeCentred, `缩略图中央应出现播放图标：${JSON.stringify(ready)}`);
  assert(!ready.disabled, '可播放状态按钮应可点');
  // 其它两个模型不受影响
  const others = await ev(cdp, `[...document.querySelectorAll('.timelapse-item:nth-child(n+2)')].map((el) => ({ status: el.dataset.status, label: el.querySelector('[data-role="label"]').textContent }))`);
  others.forEach((o) => assert(o.status === 'idle' && o.label === '下载', `其它模型状态被影响了：${JSON.stringify(o)}`));
  await cdp.send('Page.captureScreenshot', { format: 'png' }).then((s) => fs.writeFileSync(path.join(root, 'tests', 'prototype-timelapse-playable.png'), Buffer.from(s.data, 'base64')));

  // 顶栏删除 → 多选态
  await clickSel(cdp, '#open-timelapse-delete');
  await waitFor(cdp, `document.querySelector('#open-timelapse-delete').getAttribute('aria-pressed') === 'true' && !document.querySelector('#timelapse-delete-bar').hidden`, '点删除没有进入多选态');
  const picking = await ev(cdp, `({ pressed: document.querySelector('#open-timelapse-delete').getAttribute('aria-pressed'), confirmDisabled: document.querySelector('#timelapse-delete-confirm').disabled, confirmLabel: document.querySelector('#timelapse-delete-confirm').textContent, picking: document.querySelectorAll('.timelapse-item.is-picking').length })`);
  assert(picking.pressed === 'true', `删除按钮未标记为按下态：${JSON.stringify(picking)}`);
  assert(picking.confirmDisabled, '未选任何模型时删除按钮应禁用');
  assert(picking.picking === 3, `多选态下三个模型都应可勾选：${JSON.stringify(picking)}`);

  // 勾选第 1、3 个 → 计数应为 2
  await clickSel(cdp, '.timelapse-item:nth-child(1) .timelapse-card');
  await clickSel(cdp, '.timelapse-item:nth-child(3) .timelapse-card');
  await waitFor(cdp, `document.querySelector('#timelapse-delete-confirm').textContent === '删除（2）'`, '多选计数不对');
  const picked = await ev(cdp, `({ label: document.querySelector('#timelapse-delete-confirm').textContent, disabled: document.querySelector('#timelapse-delete-confirm').disabled, picked: document.querySelectorAll('.timelapse-item.is-picked').length })`);
  assert(picked.label === '删除（2）' && !picked.disabled && picked.picked === 2, `多选状态不对：${JSON.stringify(picked)}`);
  await cdp.send('Page.captureScreenshot', { format: 'png' }).then((s) => fs.writeFileSync(path.join(root, 'tests', 'prototype-timelapse-picking.png'), Buffer.from(s.data, 'base64')));

  // 确认删除 → 未选中的第 2 个保留
  await clickSel(cdp, '#timelapse-delete-confirm');
  await waitFor(cdp, `document.querySelectorAll('.timelapse-item:not([hidden])').length === 1`, '批量删除后剩余数量不对');
  const afterDelete = await ev(cdp, `({ remaining: [...document.querySelectorAll('.timelapse-item:not([hidden]) .timelapse-name')].map((n) => n.textContent), barHidden: document.querySelector('#timelapse-delete-bar').hidden, pressed: document.querySelector('#open-timelapse-delete').getAttribute('aria-pressed'), toast: document.querySelector('#toast').textContent })`);
  assert(JSON.stringify(afterDelete.remaining) === JSON.stringify(['史蒂夫_02_012209']), `未选中的模型应保留：${JSON.stringify(afterDelete)}`);
  assert(afterDelete.barHidden, '删除后应退出多选态并收起操作条');
  assert(afterDelete.pressed === 'false', '删除后删除按钮应回到未按下态');
  assert(afterDelete.toast.includes('2 个'), `删除 Toast 文案不对：${JSON.stringify(afterDelete)}`);

  // 全部删完 → 空态
  await clickSel(cdp, '#open-timelapse-delete');
  await waitFor(cdp, `document.querySelector('#open-timelapse-delete').getAttribute('aria-pressed') === 'true'`, '剩余一项时点删除没有进入多选态');
  await clickSel(cdp, '.timelapse-item:not([hidden]) .timelapse-card');
  await clickSel(cdp, '#timelapse-delete-confirm');
  await waitFor(cdp, `!document.querySelector('#timelapse-empty').hidden`, '全部删完后没有出现空态说明');
  const emptyState = await ev(cdp, `({ visible: document.querySelectorAll('.timelapse-item:not([hidden])').length, emptyText: document.querySelector('#timelapse-empty').textContent })`);
  assert(emptyState.visible === 0, `全部删完后应没有剩余模型：${JSON.stringify(emptyState)}`);

  // 左上角返回 → 回到打印页
  await clickSel(cdp, '#timelapse-screen-back');
  await waitFor(cdp, `document.querySelector('#timelapse-screen').hidden && !document.querySelector('#device-page').inert`, '左上角返回没有回到打印页');
  assert(cdp.errors.length === 0, `控制台报错：${cdp.errors.join(' | ')}`);

  console.log(`\n延时摄影模型列表页校验：${passed} 项通过，${failures.length} 项失败  （${isOnline ? '线上' : '本地 file://'}）`);
  failures.forEach((f) => console.log(`  ✗ ${f}`));
  process.exitCode = failures.length ? 1 : 0;
} catch (error) {
  console.error(`\n校验中断：${error.message}`);
  failures.forEach((f) => console.log(`  ✗ ${f}`));
  process.exitCode = 1;
} finally {
  chrome.kill();
  await delay(300);
  try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch { /* 清理临时 profile 失败不影响结论 */ }
}
