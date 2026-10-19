/* 打印前准备页（真实 DOM）验收：
   1) 标题 / 打印机已连接 图标文案保持不变
   2) 左上角回退按钮 → 打印机打印页原型
   3) 三步耗材操作图文（图 1~图 6 占位符）
   4) 底部「去进料」→ 工作台页 + 耗材面板高光
   5) 底部「去打印」→ 模型库首页（探索玩具页）
   用法：node tests/check-print-ready.mjs http://127.0.0.1:8713
*/
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const baseUrl = (process.argv[2] || 'http://127.0.0.1:8713').replace(/\/+$/, '');
const encode = (relative) => relative.split('/').map(encodeURIComponent).join('/');
const pairingUrl = `${baseUrl}/${encode('lianjiepeiwnag/打印机首次配网连接流程原型/index.html')}`;
const printerUrl = `${baseUrl}/${encode('dayinji/自研款打印机打印页面原型/index.html')}`;
const shotDir = path.resolve('.');

const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ziyan-prepready-'));
const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=0',
  `--user-data-dir=${profileDir}`, '--window-size=390,844', 'about:blank'
], { stdio: 'ignore' });
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

let passed = 0;
const failures = [];
const assert = (ok, message) => { if (ok) passed += 1; else failures.push(message); };

async function devToolsPort() {
  const f = path.join(profileDir, 'DevToolsActivePort');
  for (let i = 0; i < 80; i += 1) {
    if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').split(/\r?\n/)[0];
    await delay(100);
  }
  throw new Error('no port');
}

function connect(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  const errors = [];
  let seq = 0;
  socket.addEventListener('message', ({ data }) => {
    const m = JSON.parse(data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id); pending.delete(m.id);
      m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
      return;
    }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      errors.push(m.params.args.map((a) => a.value || a.description).join(' '));
    }
  });
  return {
    errors,
    ready: new Promise((res, rej) => { socket.addEventListener('open', res, { once: true }); socket.addEventListener('error', rej, { once: true }); }),
    send(method, params = {}) { seq += 1; return new Promise((res, rej) => { pending.set(seq, { resolve: res, reject: rej }); socket.send(JSON.stringify({ id: seq, method, params })); }); },
    close() { socket.close(); }
  };
}

const ev = async (cdp, expr) => (await cdp.send('Runtime.evaluate', { returnByValue: true, awaitPromise: true, expression: expr })).result.value;
const go = async (cdp, url) => { await cdp.send('Page.navigate', { url }); await delay(1000); };

async function clickSelector(cdp, selector) {
  const box = await ev(cdp, `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, h: b.height }; })()`);
  assert(Boolean(box), `点击目标不存在：${selector}`);
  if (!box) return;
  const y = box.h >= 44 ? box.y : Math.max(2, Math.min(box.y, 844 - 2));
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y, button: 'left', clickCount: 1 });
  await delay(1200);
}

async function shot(cdp, file) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(shotDir, file), Buffer.from(data, 'base64'));
}

const port = await devToolsPort();
const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json());
const pageTarget = targets.find((t) => t.type === 'page');
assert(pageTarget, '未找到可调试的页面目标');
const cdp = connect(pageTarget.webSocketDebuggerUrl);
await cdp.ready;
await cdp.send('Page.enable');
await cdp.send('Runtime.enable');

/* ---------- 1. 打印前准备页本身的结构 ---------- */
await go(cdp, `${pairingUrl}?screen=print-ready`);

const page = await ev(cdp, `(() => {
  const q = (s) => document.querySelector(s);
  const title = q('#print-ready-title');
  const back = q('#print-ready-back');
  const steps = [...document.querySelectorAll('.filament-step')];
  const tags = [...document.querySelectorAll('.filament-media-tag')].map((n) => n.textContent.trim());
  const placeholders = [...document.querySelectorAll('.filament-media-placeholder')];
  const gotoFeed = q('#goto-filament');
  const gotoPrint = q('#goto-print');
  const rect = (el) => { const b = el.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height), top: Math.round(b.top), inView: b.top >= 0 && b.bottom <= innerHeight }; };
  return {
    screenActive: q('#screen-print-ready').classList.contains('is-active'),
    title: title.textContent.trim(),
    titleVisible: title.getBoundingClientRect().width > 0,
    bannerTitle: q('.connected-banner h2').textContent.trim(),
    bannerCopy: q('.connected-banner p').textContent.trim(),
    checkIcon: Boolean(q('.connected-check svg')),
    oldImageGone: !q('.final-reference-image'),
    oldHotspotGone: !q('#finish-network-setup'),
    backLabel: back.getAttribute('aria-label'),
    backBox: rect(back),
    stepCount: steps.length,
    stepTitles: steps.map((s) => s.querySelector('h3').textContent.trim()),
    stepCopies: steps.map((s) => s.querySelector('p').textContent.trim()),
    stepIndexes: steps.map((s) => s.querySelector('.filament-step-index').textContent.trim()),
    tags,
    placeholderCount: placeholders.length,
    placeholderAllSquare: placeholders.every((p) => { const b = p.getBoundingClientRect(); return Math.abs(b.width - b.height) < 3; }),
    placeholderAllDashed: placeholders.every((p) => getComputedStyle(p).borderStyle === 'dashed'),
    gotoFeedText: gotoFeed.textContent.trim(),
    gotoPrintText: gotoPrint.textContent.trim(),
    feedIsLeft: gotoFeed.getBoundingClientRect().left < gotoPrint.getBoundingClientRect().left,
    feedBox: rect(gotoFeed),
    printBox: rect(gotoPrint),
    imagesPerStep: steps.map((s) => s.querySelectorAll('.filament-step-media figure').length)
  };
})()`);

assert(page.screenActive, '打印前准备页未激活');
assert(page.title === '打印前准备', `标题应保持「打印前准备」，实际 ${page.title}`);
assert(page.titleVisible, '标题不可见');
assert(page.bannerTitle === '打印机已连接', `图标文案应保持「打印机已连接」，实际 ${page.bannerTitle}`);
assert(page.bannerCopy === '网络配置完成，可以开始打印前准备。', `副文案被改动：${page.bannerCopy}`);
assert(page.checkIcon, '打印机已连接的勾选图标丢失');
assert(page.oldImageGone && page.oldHotspotGone, '旧的大图引用与热区仍留在页面上');
assert(page.backLabel === '返回打印机打印页面', `回退按钮无障碍名不对：${page.backLabel}`);
assert(page.backBox.w >= 44 && page.backBox.h >= 44 && page.backBox.inView, `回退按钮命中盒过小或不可见：${JSON.stringify(page.backBox)}`);

assert(page.stepCount === 3, `应为 3 步耗材操作，实际 ${page.stepCount}`);
assert(JSON.stringify(page.stepIndexes) === JSON.stringify(['1', '2', '3']), `步骤序号不对：${JSON.stringify(page.stepIndexes)}`);
assert(JSON.stringify(page.stepTitles) === JSON.stringify(['插入耗材', '进料', '观察喷嘴']), `步骤标题不对：${JSON.stringify(page.stepTitles)}`);
assert(page.stepCopies[0] === '将耗材插入，向喷头里推送耗材，直至无法前进。', `步骤 1 文案不对：${page.stepCopies[0]}`);
assert(page.stepCopies[1] === 'APP自动识别到耗材进入，选中耗材，编辑耗材信息并点击进料。', `步骤 2 文案不对：${page.stepCopies[1]}`);
assert(page.stepCopies[2] === '如果喷头正常吐出料丝，则完成进料。', `步骤 3 文案不对：${page.stepCopies[2]}`);
assert(page.placeholderCount === 6, `应为 6 张占位图，实际 ${page.placeholderCount}`);
assert(JSON.stringify(page.tags) === JSON.stringify(['图片1', '图片2', '图片3', '图片4', '图片5', '图片6']), `占位图编号不对：${JSON.stringify(page.tags)}`);
assert(page.placeholderAllSquare, '占位图未按 1:1 方图排版');
assert(page.placeholderAllDashed, '占位图应使用虚线边框表示待补图');
assert(JSON.stringify(page.imagesPerStep) === JSON.stringify([2, 2, 2]), `每步应为 2 张图：${JSON.stringify(page.imagesPerStep)}`);

assert(page.gotoFeedText === '去进料', `左侧按钮文案应为「去进料」，实际 ${page.gotoFeedText}`);
assert(page.gotoPrintText === '去打印', `右侧按钮文案应为「去打印」，实际 ${page.gotoPrintText}`);
assert(page.feedIsLeft, '「去进料」应在左侧、「去打印」在右侧');
assert(page.feedBox.h >= 44 && page.printBox.h >= 44, '底部按钮高度不足 44px');
assert(page.feedBox.inView && page.printBox.inView, '底部按钮需无需滚动即可点击');
await shot(cdp, 'prototype-print-ready-real.png');

/* ---------- 2. 左上角回退 → 打印机打印页原型 ---------- */
await clickSelector(cdp, '#print-ready-back');
const backNav = await ev(cdp, `({ title: document.title, path: decodeURI(location.pathname), search: location.search })`);
assert(backNav.title === '自研款打印机打印页面原型' && backNav.path.endsWith('dayinji/自研款打印机打印页面原型/index.html') && backNav.search === '',
  `回退按钮未回到打印机打印页原型：${JSON.stringify(backNav)}`);

/* ---------- 3. 「去进料」→ 工作台页 + 耗材面板高光 ---------- */
await go(cdp, `${pairingUrl}?screen=print-ready`);
await clickSelector(cdp, '#goto-filament');
/* 等跳转目标页 load 事件触发后再断言：耗材高光是挂在 load 上的 */
await ev(cdp, `new Promise((resolve) => {
  if (document.readyState === 'complete') { resolve(true); return; }
  window.addEventListener('load', () => resolve(true), { once: true });
  setTimeout(() => resolve(false), 15000);
})`);
await delay(400);
const feedNav = await ev(cdp, `({ title: document.title, path: decodeURI(location.pathname), search: location.search })`);
assert(feedNav.title === '自研款打印机打印页面原型' && feedNav.search === '?highlight=filament',
  `「去进料」未跳到工作台页：${JSON.stringify(feedNav)}`);
const feedState = await ev(cdp, `(() => {
  const panel = document.querySelector('.filament-panel');
  const b = panel.getBoundingClientRect();
  const frame = panel.querySelector('.filament-panel-frame');
  return {
    onDevicePage: !document.querySelector('#device-page').hidden,
    highlighted: panel.classList.contains('is-guide-flash'),
    animation: getComputedStyle(frame).animationName,
    inView: b.top >= 0 && b.bottom <= innerHeight
  };
})()`);
assert(feedState.onDevicePage, '「去进料」应停在打印机工作台页');
assert(feedState.highlighted, '「去进料」未给耗材控制面板加上高光标记');
assert(feedState.animation === 'filament-guide-glow', `耗材面板高光动画未生效：${feedState.animation}`);
assert(feedState.inView, '耗材控制面板应滚动到可视区域');
await shot(cdp, 'prototype-print-ready-feed-highlight.png');

/* 高光是短暂的：数秒后应自动撤掉 */
await delay(8600);
const flashCleared = await ev(cdp, `!document.querySelector('.filament-panel').classList.contains('is-guide-flash')`);
assert(flashCleared, '耗材面板高光未在数秒后自动撤掉');

/* ---------- 4. 「去打印」→ 模型库首页（探索玩具页） ---------- */
await go(cdp, `${pairingUrl}?screen=print-ready`);
await clickSelector(cdp, '#goto-print');
const printNav = await ev(cdp, `({ title: document.title, path: decodeURI(location.pathname), search: location.search })`);
assert(printNav.title === '自研款打印机打印页面原型' && printNav.search === '?screen=explore-toys',
  `「去打印」未跳到模型库首页：${JSON.stringify(printNav)}`);
const exploreState = await ev(cdp, `(() => {
  const screen = document.querySelector('#explore-toys-screen');
  const img = screen.querySelector('img');
  const b = screen.getBoundingClientRect();
  return {
    visible: !screen.hidden,
    inView: b.top >= -2 && b.bottom <= innerHeight + 2,
    src: decodeURI(img.getAttribute('src')),
    loaded: img.complete && img.naturalWidth > 0,
    alt: img.alt
  };
})()`);
assert(exploreState.visible, '「去打印」后探索玩具页未打开');
assert(exploreState.src.endsWith('原型修改复用图片资源/探索玩具页.png'), `探索玩具页底图不对：${exploreState.src}`);
assert(exploreState.loaded, '探索玩具页底图未加载成功');
assert(exploreState.inView, '探索玩具页应铺满设备框可视区');
await shot(cdp, 'prototype-print-ready-goto-print.png');

assert(cdp.errors.length === 0, `页面存在控制台错误：${JSON.stringify(cdp.errors)}`);

cdp.close();
chrome.kill();
console.log(`\n通过 ${passed} 项`);
if (failures.length) {
  console.log(`失败 ${failures.length} 项：`);
  failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  process.exit(1);
}
console.log('打印前准备页验收全部通过');
