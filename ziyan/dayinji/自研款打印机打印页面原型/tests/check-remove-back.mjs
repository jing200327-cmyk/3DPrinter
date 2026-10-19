/* 专项校验：设备设置 → 移除打印机弹窗页左上角的可见回退按钮。
   验三件事：1) 按钮真实渲染出来且不是透明不可见；2) 点击命中盒中心真的能返回设备设置页；
   3) 回退按钮不与「取消 / 确认」热区重叠，也不越出设备框。
   用法：node tests/check-remove-back.mjs [file:// 本地页 或 http:// 站点根URL]
   默认跑本地 file:// 页面；传站点根 URL 则跑线上（轮询等待，不用固定 sleep）。 */
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

const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ziyan-remove-back-'));
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
    if (m.method === 'Runtime.consoleAPICalled' && m.method !== null && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value || a.description).join(' '));
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

try {
  const p = await port();
  const targets = await fetch(`http://127.0.0.1:${p}/json/list`).then((r) => r.json());
  const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
  if (!page) throw new Error('Chrome 没开出可调试的页面 target');
  const cdp = connect(page.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');

  const loaded = `(document.readyState === 'complete') && !!document.querySelector('#open-remove-printer') && !!document.querySelector('#remove-printer-back')`;
  await waitFor(cdp, loaded, '页面脚本没就绪（#open-remove-printer / #remove-printer-back 不存在）');

  // 走到「设备设置 → 移除打印机」弹窗页
  await ev(cdp, `(async () => {
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    document.querySelector('#printer-settings').click();
    await wait(120);
    document.querySelector('#open-remove-printer').click();
    await wait(200);
    return true;
  })()`);
  await waitFor(cdp, `!document.querySelector('#remove-printer-screen').hidden`, '移除打印机弹窗页没有打开');

  // 1) 按钮可见性 + 几何 + 是否与取消/确认重叠
  const style = await ev(cdp, `(() => {
    const back = document.querySelector('#remove-printer-back');
    const icon = back.querySelector('.remove-dialog-back__icon');
    const screen = document.querySelector('#remove-printer-screen');
    const stage = screen.querySelector('.reuse-stage');
    const sb = screen.getBoundingClientRect();
    const st = stage.getBoundingClientRect();
    const rb = back.getBoundingClientRect();
    const ri = icon.getBoundingClientRect();
    const cs = getComputedStyle(back);
    const ci = getComputedStyle(icon);
    const overlaps = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
    const cancel = document.querySelector('#remove-printer-cancel').getBoundingClientRect();
    const confirm = document.querySelector('#remove-printer-confirm').getBoundingClientRect();
    // 原图（411×879）里烘焙的返回箭头圆心 ≈(37, 57)，换算到舞台上的屏幕坐标
    return {
      hidden: back.hidden || screen.hidden,
      display: cs.display, visibility: cs.visibility, opacity: cs.opacity, pointerEvents: cs.pointerEvents,
      label: back.getAttribute('aria-label'),
      iconRadius: ci.borderTopLeftRadius,
      iconBg: ci.backgroundColor,
      iconSize: { w: ri.width, h: ri.height },
      hitSize: { w: rb.width, h: rb.height },
      centerInStage: { x: (ri.left + ri.width / 2 - st.left) / st.width, y: (ri.top + ri.height / 2 - st.top) / st.height },
      // 自绘圆心 vs 原图箭头圆心（都按 411×879 归一化）
      arrowInStage: { x: 37 / 411, y: 57 / 879 },
      insideFrame: rb.left >= sb.left - 0.5 && rb.right <= sb.right + 0.5 && rb.top >= sb.top - 0.5 && rb.bottom <= sb.bottom + 0.5,
      overlapsCancel: overlaps(rb, cancel),
      overlapsConfirm: overlaps(rb, confirm),
      cancelTop: (cancel.top - st.top) / st.height
    };
  })()`);

  assert(!style.hidden, '回退按钮所在页面处于 hidden 状态。');
  assert(style.display !== 'none' && style.visibility === 'visible' && Number(style.opacity) > 0.9, `回退按钮不可见：${JSON.stringify(style)}`);
  assert(style.pointerEvents !== 'none', '回退按钮 pointer-events 被关掉了，点不到。');
  assert(style.label === '返回设备设置', `aria-label 不对：${style.label}`);
  assert(parseFloat(style.iconRadius) >= 16, `内圈不是圆形（border-radius=${style.iconRadius}）。`);
  assert(/rgba?\(255, 255, 255/.test(style.iconBg), `内圈底盘不是不透明白色，会漏出被压暗的原箭头：${style.iconBg}`);
  assert(style.iconSize.w >= 30 && style.hitSize.w >= 44 && style.hitSize.h >= 44, `命中盒/图标太小：${JSON.stringify(style.hitSize)} ${JSON.stringify(style.iconSize)}`);
  assert(Math.abs(style.centerInStage.x - style.arrowInStage.x) < 0.02 && Math.abs(style.centerInStage.y - style.arrowInStage.y) < 0.02, `自绘返回键没有对准原图烘焙的返回箭头：圆心 ${JSON.stringify(style.centerInStage)} vs 原箭头 ${JSON.stringify(style.arrowInStage)}`);
  assert(style.insideFrame, '回退按钮越出了设备框。');
  assert(!style.overlapsCancel && !style.overlapsConfirm, `回退按钮压到了取消/确认按钮上：${JSON.stringify(style)}`);

  // 2) 真点击命中盒中心（而不是 .click()），确认能回到设备设置页
  await ev(cdp, `(() => {
    const back = document.querySelector('#remove-printer-back');
    const r = back.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    window.__removeBackHit = { x, y, id: hit && hit.id, closest: hit && hit.closest('#remove-printer-back') ? 'back' : (hit ? hit.className || hit.tagName : 'null') };
    return true;
  })()`);
  const hitInfo = await ev(cdp, `window.__removeBackHit`);
  assert(hitInfo.closest === 'back', `命中盒中心被别的元素挡住了，点不到回退按钮：${JSON.stringify(hitInfo)}`);

  for (const type of ['mousePressed', 'mouseReleased']) {
    await cdp.send('Input.dispatchMouseEvent', { type, x: hitInfo.x, y: hitInfo.y, button: 'left', clickCount: 1 });
  }
  await waitFor(cdp, `!document.querySelector('#remove-printer-screen').hidden === false && !document.querySelector('#device-settings-screen').hidden`, '点击左上角回退按钮后没有回到设备设置页');
  const landed = await ev(cdp, `({ settings: !document.querySelector('#device-settings-screen').hidden, dialog: !document.querySelector('#remove-printer-screen').hidden, logic: !document.querySelector('#logic-demo-screen').hidden })`);
  // 注意：只要还有任何复用页开着，底层 #device-page 就保持 inert（与其它回退按钮一致），
  // 所以这里只断言落点，不断言 inert
  assert(landed.settings && !landed.dialog && !landed.logic, `回退后落点不对：${JSON.stringify(landed)}`);

  // 3) 回归：取消仍回设备设置、确认仍进逻辑演示（原跳转逻辑没被动过）
  const regression = await ev(cdp, `(async () => {
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    const open = (sel) => !document.querySelector(sel).hidden;
    const out = {};
    document.querySelector('#open-remove-printer').click();
    await wait(150);
    document.querySelector('#remove-printer-cancel').click();
    await wait(120);
    out.cancel = open('#device-settings-screen') && !open('#remove-printer-screen');
    document.querySelector('#open-remove-printer').click();
    await wait(120);
    document.querySelector('#remove-printer-confirm').click();
    await wait(150);
    out.confirm = open('#logic-demo-screen');
    document.querySelector('#logic-demo-back').click();
    await wait(120);
    out.logicBack = open('#remove-printer-screen');
    return out;
  })()`);
  assert(regression.cancel, '回归失败：「取消」没有回到设备设置页。');
  assert(regression.confirm, '回归失败：「确认」没有进入逻辑页。');
  assert(regression.logicBack, '回归失败：逻辑页的返回没有回到移除打印机弹窗页。');

  // 4) 跳转逻辑页的浅色风格：不能残留原深色霓虹主题的任何痕迹
  const theme = await ev(cdp, `(async () => {
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    document.querySelector('#open-remove-printer').click();
    await wait(150);
    document.querySelector('#remove-printer-confirm').click();
    await wait(200);
    const wrap = getComputedStyle(document.querySelector('.logic-demo'));
    const card = getComputedStyle(document.querySelector('.logic-demo-card'));
    const branch = getComputedStyle(document.querySelector('.logic-demo-actions button'));
    const back = getComputedStyle(document.querySelector('#logic-demo-back'));
    const ink = getComputedStyle(document.querySelector('.logic-demo-title')).color;
    // 逐个元素确认没有深色主题残留（浅底浅字会看不见）
    const nodes = [...document.querySelectorAll('.logic-demo-card, .logic-demo-card *')];
    const lum = (color) => {
      const [r, g, b] = color.match(/\\d+/g).map(Number);
      return (r * 299 + g * 587 + b * 114) / 1000;
    };
    const badContrast = nodes.filter((n) => n.textContent.trim() && !n.querySelector('*')).filter((n) => {
      const fg = lum(getComputedStyle(n).color);
      let bgNode = n, bg = 'rgb(255, 255, 255)';
      while (bgNode && bgNode !== document.body) {
        const c = getComputedStyle(bgNode).backgroundColor;
        if (c && !/rgba\\(0, 0, 0, 0\\)|transparent/.test(c)) { bg = c; break; }
        bgNode = bgNode.parentElement;
      }
      return Math.abs(lum(bg) - fg) < 40;
    }).map((n) => n.className || n.tagName);
    return {
      wrapBg: wrap.backgroundColor, wrapImage: wrap.backgroundImage,
      cardBg: card.backgroundColor, cardRadius: card.borderTopLeftRadius, cardShadow: card.boxShadow,
      branchBg: branch.backgroundColor, branchBorderColor: branch.borderTopColor,
      backBg: back.backgroundColor, backMinHeight: back.minHeight,
      ink, keyword: getComputedStyle(document.querySelector('.logic-demo-rule b')).color,
      badgeGone: !document.querySelector('.logic-demo-badge'),
      // 只在本页范围内找残留的演示标记（分享打印机页自己也有「演示 · 非最终视觉」徽标，不算）
      chromeGone: ![...document.querySelectorAll('#logic-demo-screen *')]
        .filter((n) => n.children.length === 0)
        .some((n) => /霓虹|非最终视觉|逻辑演示/.test(n.textContent || '')),
      darkLeftovers: [...document.querySelectorAll('*')].filter((n) => {
        const s = getComputedStyle(n);
        return (s.color === 'rgb(232, 236, 255)' || s.color === 'rgb(255, 255, 255)') && n.closest('#logic-demo-screen');
      }).length,
      badContrast
    };
  })()`);

  assert(theme.wrapBg === 'rgb(244, 245, 250)' && theme.wrapImage === 'none', `跳转逻辑页外层不是浅灰底：${JSON.stringify(theme)}`);
  assert(theme.cardBg === 'rgb(255, 255, 255)' && parseFloat(theme.cardRadius) === 16, `卡片不是白底 16px 圆角：${JSON.stringify(theme)}`);
  assert(theme.ink === 'rgb(47, 52, 61)', `标题不是深色正文墨色：${theme.ink}`);
  assert(theme.keyword === 'rgb(67, 136, 245)', `IF/ELSE 关键词不是品牌蓝：${theme.keyword}`);
  assert(theme.branchBg === 'rgb(255, 255, 255)' && theme.branchBorderColor === 'rgb(232, 236, 244)', `分支行不是白底描边：${JSON.stringify(theme)}`);
  assert(parseFloat(theme.backMinHeight) >= 44, `「返回设备设置」按钮高度不足 44px：${theme.backMinHeight}`);
  assert(theme.badgeGone && theme.chromeGone, '「逻辑演示 · 非最终视觉」之类的演示标记没有去掉。');
  assert(theme.darkLeftovers === 0, `仍有 ${theme.darkLeftovers} 处深色主题的浅色文字残留。`);
  assert(theme.badContrast.length === 0, `浅底上文字对比度不足（会看不见）：${JSON.stringify(theme.badContrast)}`);
  assert(cdp.errors.length === 0, `控制台报错：${cdp.errors.join(' | ')}`);

  // 截图留档：弹窗页（含左上角回退按钮）+ 浅色版跳转逻辑页
  const shots = path.join(root, 'tests');
  const grab = async (name) => {
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(shots, name), Buffer.from(shot.data, 'base64'));
  };
  // 当前正停在浅色版跳转逻辑页
  await grab('prototype-remove-printer-logic.png');
  await ev(cdp, `(async () => {
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    document.querySelector('#logic-demo-back').click();
    await wait(150);
    document.querySelector('#remove-printer-back').click();
    await wait(200);
    return true;
  })()`);
  await grab('prototype-remove-printer-back.png');

  console.log(`\n移除打印机回退按钮校验：${passed} 项通过，${failures.length} 项失败  （${isOnline ? '线上' : '本地 file://'}）`);
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
