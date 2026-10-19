/* 发布前/发布后通用的跳转互通校验：两个原型在同一个站点里互相跳转是否正常。
   用法：node tests/_publish-links.mjs <站点根 URL>，例如
   node tests/_publish-links.mjs http://127.0.0.1:8713
   node tests/_publish-links.mjs https://xxxx.net
*/
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const baseUrl = (process.argv[2] || 'http://127.0.0.1:8713').replace(/\/+$/, '');
const encode = (relative) => relative.split('/').map(encodeURIComponent).join('/');
const pairingUrl = `${baseUrl}/${encode('lianjiepeiwnag/打印机首次配网连接流程原型/index.html')}`;
const printerUrl = `${baseUrl}/${encode('dayinji/自研款打印机打印页面原型/index.html')}`;

const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ziyan-links-'));
const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=0',
  `--user-data-dir=${profileDir}`, '--window-size=390,844', 'about:blank'
], { stdio: 'ignore' });
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

let passed = 0;
const failures = [];
const assert = (ok, message) => { if (ok) passed += 1; else failures.push(message); };

async function port() {
  const f = path.join(profileDir, 'DevToolsActivePort');
  for (let i = 0; i < 80; i += 1) { if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').split(/\r?\n/)[0]; await delay(100); }
  throw new Error('no port');
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
    send(method, params = {}) { seq += 1; return new Promise((res, rej) => { pending.set(seq, { resolve: res, reject: rej }); socket.send(JSON.stringify({ id: seq, method, params })); }); },
    close() { socket.close(); }
  };
}

const ev = async (cdp, expr) => (await cdp.send('Runtime.evaluate', { returnByValue: true, awaitPromise: true, expression: expr })).result.value;
const go = async (cdp, url) => { await cdp.send('Page.navigate', { url }); await delay(900); };

async function clickSelector(cdp, selector) {
  const box = await ev(cdp, `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, h: b.height, top: b.top, bottom: b.bottom }; })()`);
  assert(Boolean(box), `点击目标不存在：${selector}`);
  if (!box) return;
  if (box.h === 0 || box.top < 2 || box.bottom > innerHeightProxy - 2) {
    await ev(cdp, `document.querySelector(${JSON.stringify(selector)}).scrollIntoView({ block: 'center' })`);
    await delay(300);
    const again = await ev(cdp, `(() => { const el = document.querySelector(${JSON.stringify(selector)}); const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
    box.x = again.x; box.y = again.y;
  }
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await delay(300);
}

let innerHeightProxy = 844;

try {
  const p = await port();
  const list = await fetch(`http://127.0.0.1:${p}/json/list`).then((r) => r.json());
  const cdp = connect(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });

  /* ---- 1. 两个原型首页都能打开，且关键资源 200 ---- */
  for (const [name, url, marker] of [
    ['配网流程', pairingUrl, '#add-printer'],
    ['打印页面原型', printerUrl, '#printer-switch'],
    ['发布根页', baseUrl + '/', '.links']
  ]) {
    await go(cdp, url);
    const info = await ev(cdp, `({ title: document.title, url: decodeURI(location.href), has: Boolean(document.querySelector(${JSON.stringify(marker)})) })`);
    assert(info.has, `${name} 打开后缺少关键节点 ${marker}（当前 URL ${info.url}）`);
  }

  /* ---- 2. 打印页面原型 → 配网流程（添加打印机 → 配置新的打印机） ---- */
  await go(cdp, printerUrl);
  await clickSelector(cdp, '#printer-switch');
  await delay(300);
  const addPrinterOpened = await ev(cdp, `[...document.querySelectorAll('.reuse-screen')].filter(s => !s.hidden).map(s => s.id)`);
  assert(String(addPrinterOpened) === 'add-printer-screen', '打印页「添加打印机」未打开添加打印机页，实际 ' + JSON.stringify(addPrinterOpened));
  await clickSelector(cdp, '#configure-new-printer');
  await delay(1200);
  let now = await ev(cdp, `({ href: decodeURI(location.href), screen: [...document.querySelectorAll('[data-screen]')].filter(s => !s.hidden).map(s => s.dataset.screen) })`);
  assert(now.href.includes('打印机首次配网连接流程原型/index.html'), '跨原型跳转未落到配网流程，实际 ' + now.href);
  assert(now.href.includes('screen=printer-select'), '跨原型跳转未带 ?screen=printer-select，实际 ' + now.href);
  assert(String(now.screen) === 'printer-select', '配网流程未落在「选择要设置的打印机」，实际 ' + JSON.stringify(now.screen));

  /* ---- 3. 配网流程「打印前准备」页 → 打印页面原型（回退 / 去进料 / 去打印） ---- */
  await go(cdp, `${pairingUrl}?screen=print-ready`);
  await delay(400);
  await clickSelector(cdp, '#print-ready-back');
  await delay(1200);
  now = await ev(cdp, `({ href: decodeURI(location.href), hasSwitch: Boolean(document.querySelector('#printer-switch')) })`);
  assert(now.href.includes('自研款打印机打印页面原型/index.html'), '打印前准备页左上角回退未跳回打印页面原型，实际 ' + now.href);
  assert(!now.href.includes('?'), '左上角回退不应带额外深链参数，实际 ' + now.href);
  assert(now.hasSwitch, '跳回后打印页面原型关键节点缺失');

  await go(cdp, `${pairingUrl}?screen=print-ready`);
  await clickSelector(cdp, '#goto-filament');
  await delay(1200);
  now = await ev(cdp, `({ href: decodeURI(location.href), highlight: Boolean(document.querySelector('.filament-panel')?.classList.contains('is-guide-flash')) })`);
  assert(now.href.includes('highlight=filament'), '「去进料」未带耗材高光参数跳到工作台，实际 ' + now.href);
  assert(now.highlight, '「去进料」跳转后耗材控制面板未高亮');

  await go(cdp, `${pairingUrl}?screen=print-ready`);
  await clickSelector(cdp, '#goto-print');
  await delay(1200);
  now = await ev(cdp, `({ href: decodeURI(location.href), exploreOpen: Boolean(document.querySelector('#explore-toys-screen:not([hidden])')) })`);
  assert(now.href.includes('screen=explore-toys'), '「去打印」未跳到模型库首页，实际 ' + now.href);
  assert(now.exploreOpen, '「去打印」跳转后探索玩具页未打开');

  /* ---- 4. 儿童受限：家长授权 → 加入共享打印机 → 查看我的打印机 → 打印页面原型 ---- */
  await go(cdp, `${pairingUrl}?account=child&screen=join-scan`);
  const childStart = await ev(cdp, `({
    screen: [...document.querySelectorAll('[data-screen]')].filter(s => !s.hidden).map(s => s.dataset.screen),
    pill: document.querySelector('#start-cta-auth')?.textContent.trim()
  })`);
  assert(String(childStart.screen) === 'join-scan', '加入共享页深链未生效，实际 ' + JSON.stringify(childStart.screen));
  assert(childStart.pill === '前往认证', '儿童模式按钮文案应为「前往认证」，实际 ' + childStart.pill);

  await ev(cdp, `window.__joinShare.setInvite('valid')`);
  await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#join-code-input').value = 'ABCD1234'; document.querySelector('#join-code-input').dispatchEvent(new Event('input'))` });
  await delay(200);
  const nextEnabled = await ev(cdp, `!document.querySelector('#join-code-next').disabled`);
  assert(nextEnabled, '输入 8 位邀请码后「下一步」仍为禁用');
  await clickSelector(cdp, '#join-code-next');
  await delay(400);
  now = await ev(cdp, `[...document.querySelectorAll('[data-screen]')].filter(s => !s.hidden).map(s => s.dataset.screen)`);
  assert(String(now) === 'join-confirm', '未进入「确认邀请」，实际 ' + JSON.stringify(now));
  await clickSelector(cdp, '#join-confirm-accept');
  await delay(400);
  now = await ev(cdp, `[...document.querySelectorAll('[data-screen]')].filter(s => !s.hidden).map(s => s.dataset.screen)`);
  assert(String(now) === 'join-done', '未进入「加入成功」，实际 ' + JSON.stringify(now));
  await clickSelector(cdp, '#join-done-view');
  await delay(1200);
  now = await ev(cdp, `({ href: decodeURI(location.href), hasSwitch: Boolean(document.querySelector('#printer-switch')) })`);
  assert(now.href.includes('自研款打印机打印页面原型/index.html'), '「查看我的打印机」未跳到打印页面原型，实际 ' + now.href);
  assert(now.hasSwitch, '「查看我的打印机」跳过去后关键节点缺失');

  /* ---- 4b. 儿童受限账号起始页 v2：家长授权先判断家庭群组 ---- */
  await go(cdp, `${pairingUrl}?account=child&version=v2`);
  let v2 = await ev(cdp, `({
    screen: [...document.querySelectorAll('[data-screen]')].filter(s => !s.hidden).map(s => s.dataset.screen),
    authorize: document.querySelector('#start-cta-authorize-v2')?.textContent.trim(),
    chip: !document.querySelector('#demo-chip')?.hidden
  })`);
  assert(String(v2.screen) === 'start-v2', '儿童 v2 深链未落到起始页v2，实际 ' + JSON.stringify(v2.screen));
  assert(v2.authorize === '家长授权', 'v2 起始页缺少「家长授权」按钮，实际 ' + v2.authorize);
  assert(v2.chip, 'v2 起始页应显示演示台入口');

  /* 群组外（默认）：跳转儿童账号个人二维码页 */
  await clickSelector(cdp, '#start-cta-authorize-v2');
  await delay(400);
  v2 = await ev(cdp, `({
    screen: [...document.querySelectorAll('[data-screen]')].filter(s => !s.hidden).map(s => s.dataset.screen),
    hint: document.querySelector('.child-qr__hint')?.textContent.trim(),
    rects: document.querySelectorAll('#child-qr-svg rect').length,
    badge: Boolean(document.querySelector('.child-qr__badge img'))
  })`);
  assert(String(v2.screen) === 'child-qr', 'v2 家长授权（群组外）未跳转二维码页，实际 ' + JSON.stringify(v2.screen));
  assert(v2.hint === '家长扫码添加至家庭群组后可分享打印机', '二维码页提示文案不符：' + v2.hint);
  assert(v2.rects > 100, '二维码图形未生成，rect 数量 ' + v2.rects);
  assert(v2.badge, '二维码中心头像徽章缺失');

  /* 二维码页返回：回到起始页v2 */
  await clickSelector(cdp, '#child-qr-back');
  await delay(300);
  v2 = await ev(cdp, `[...document.querySelectorAll('[data-screen]')].filter(s => !s.hidden).map(s => s.dataset.screen)`);
  assert(String(v2) === 'start-v2', '二维码页返回未落到起始页v2，实际 ' + JSON.stringify(v2));

  /* 群组内：弹 Toast 并停留本页 */
  await ev(cdp, `window.__joinShare.setFamily('in')`);
  await clickSelector(cdp, '#start-cta-authorize-v2');
  await delay(300);
  v2 = await ev(cdp, `({
    screen: [...document.querySelectorAll('[data-screen]')].filter(s => !s.hidden).map(s => s.dataset.screen),
    toast: document.querySelector('#toast')?.textContent,
    visible: document.querySelector('#toast')?.classList.contains('is-visible')
  })`);
  assert(String(v2.screen) === 'start-v2', 'v2 家长授权（群组内）应停留在起始页v2，实际 ' + JSON.stringify(v2.screen));
  assert(v2.toast === '已向小明妈妈发起打印机授权申请', 'Toast 文案不符：' + v2.toast);
  assert(v2.visible, 'Toast 未显示');

  /* v1 儿童链路不受影响：家长授权仍进加入共享打印机 */
  await go(cdp, `${pairingUrl}?account=child`);
  v2 = await ev(cdp, `[...document.querySelectorAll('[data-screen]')].filter(s => !s.hidden).map(s => s.dataset.screen)`);
  assert(String(v2) === 'start', 'v1 儿童深链未落到起始页，实际 ' + JSON.stringify(v2));
  await clickSelector(cdp, '#start-cta-authorize');
  await delay(400);
  v2 = await ev(cdp, `[...document.querySelectorAll('[data-screen]')].filter(s => !s.hidden).map(s => s.dataset.screen)`);
  assert(String(v2) === 'join-scan', 'v1 家长授权未进入加入共享打印机，实际 ' + JSON.stringify(v2));

  /* ---- 5. 配网流程演示台可用 ---- */
  await go(cdp, `${pairingUrl}?screen=demo`);
  const demo = await ev(cdp, `({
    screen: [...document.querySelectorAll('[data-screen]')].filter(s => !s.hidden).map(s => s.dataset.screen),
    options: document.querySelectorAll('.demo-option').length
  })`);
  assert(String(demo.screen) === 'demo', '演示台深链未生效');
  assert(demo.options >= 13, '演示台选项偏少：' + demo.options);

  /* ---- 6. 分享打印机（打印页面原型）可用 ---- */
  await go(cdp, `${printerUrl}?share=normal`);
  const share = await ev(cdp, `({
    screen: [...document.querySelectorAll('.reuse-screen')].filter(s => !s.hidden).map(s => s.id),
    code: document.querySelector('#share-code')?.textContent,
    qr: document.querySelector('#share-qr-image')?.complete
  })`);
  assert(String(share.screen) === 'share-printer-screen', '分享打印机深链未生效，实际 ' + JSON.stringify(share.screen));
  assert(share.code === 'ABCD 1234', '分享页邀请码异常：' + share.code);
  assert(share.qr === true, '分享页二维码未加载');

  assert(cdp.errors.length === 0, '存在 console 报错：' + JSON.stringify(cdp.errors.slice(0, 4)));
  cdp.close();
} finally {
  chrome.kill();
}

const summary = `\n互通校验（${baseUrl}）：通过 ${passed} 项，失败 ${failures.length} 项\n`;
if (failures.length) {
  console.log(summary);
  failures.forEach((m, i) => console.log(`  ${i + 1}. ${m}`));
  process.exitCode = 1;
} else {
  console.log(summary + '全部通过 ✅');
}
