import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/* 校验 2026-10-16 新增的两处配网交互：
   ① 起始页右上角「帮助」→ 自下而上弹出「连接配网常见问题解决方案弹窗」，底部蓝色下划线外链
   ② 网络配置页点「连接」→ 自下而上弹出【连接等待】页（蓝色圆圈 + 水波纹虚线），正常 / 60s 超时两条分支
   用法：node tests/check-help-connecting.mjs [站点根URL]（不带参数则只跑本地 file://） */

const prototypeRoot = path.resolve(import.meta.dirname, '..');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const onlineRoot = process.argv[2] ? process.argv[2].replace(/\/+$/, '') : '';
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ziyan-pairing-help-'));
const shotDir = path.join(prototypeRoot, onlineRoot ? 'shots-help-online' : 'shots-help');
fs.mkdirSync(shotDir, { recursive: true });

const pairingUrl = onlineRoot
  ? `${onlineRoot}/lianjiepeiwnag/${encodeURIComponent('打印机首次配网连接流程原型')}/index.html`
  : pathToFileURL(path.join(prototypeRoot, 'index.html')).href;

const chrome = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--remote-debugging-port=0', `--user-data-dir=${profileDir}`,
  '--window-size=390,844', pairingUrl
], { stdio: 'ignore' });

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
let passed = 0;
const failures = [];
const consoleErrors = [];

function assert(condition, message) {
  if (condition) { passed += 1; return; }
  failures.push(message);
}

async function waitForDevToolsPort() {
  const portFile = path.join(profileDir, 'DevToolsActivePort');
  for (let i = 0; i < 80; i += 1) {
    if (fs.existsSync(portFile)) return fs.readFileSync(portFile, 'utf8').split(/\r?\n/)[0];
    await delay(100);
  }
  throw new Error('Chrome DevTools port was not created.');
}

function connectCdp(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  const listeners = [];
  let sequence = 0;
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
      return;
    }
    listeners.forEach((fn) => fn(message));
  });
  return {
    ready: new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    }),
    on(fn) { listeners.push(fn); },
    send(method, params = {}) {
      sequence += 1;
      return new Promise((resolve, reject) => {
        pending.set(sequence, { resolve, reject });
        socket.send(JSON.stringify({ id: sequence, method, params }));
      });
    },
    close() { socket.close(); }
  };
}

async function evaluate(cdp, expression) {
  const response = await cdp.send('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || 'evaluate failed');
  return response.result.value;
}

/* 走真实链路到达【网络配置】页（必须真的连上打印机热点，否则连接会被前置校验拦下） */
const GOTO_HOME_WIFI = `(() => {
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  return (async () => {
    const active = () => document.querySelector('.app-screen.is-active')?.dataset.screen;
    document.querySelector('#add-printer').click();
    if (document.querySelector('#location-dialog').open) document.querySelector('#location-cancel').click();
    await wait(0);
    if (active() !== 'printer-select') return { ok: false, at: active(), step: 'printer-select' };
    document.querySelector('#printer-type').click();
    await wait(0);
    document.querySelector('#ready-next').click();
    await wait(0);
    document.querySelector('#open-wlan').click();
    await wait(0);
    document.querySelector('[data-wlan="Ugee Funbox-AP"]').click();
    await wait(0);
    document.querySelector('#settings-back').click();
    await wait(0);
    return { ok: active() === 'home-wifi', at: active(), toast: document.querySelector('#toast').textContent };
  })();
})()`;

async function shot(cdp, name) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const file = path.join(shotDir, name);
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
  return file;
}

const port = await waitForDevToolsPort();
const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
const pageTarget = targets.find((item) => item.type === 'page' && item.url.includes('index.html')) || targets.find((item) => item.type === 'page');
if (!pageTarget) throw new Error(`page target not found: ${JSON.stringify(targets.map((t) => t.url))}`);
const page = connectCdp(pageTarget.webSocketDebuggerUrl);
await page.ready;
await page.send('Runtime.enable');
await page.send('Page.enable');
await page.send('Log.enable');
await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
page.on((message) => {
  if (message.method === 'Log.entryAdded' && message.params?.entry?.level === 'error') {
    consoleErrors.push(message.params.entry.text);
  }
});

/* 等页面脚本就绪（深链 /演示台初始化后 window.__joinShare 才存在） */
for (let i = 0; i < 100; i += 1) {
  const ready = await evaluate(page, 'Boolean(window.__joinShare && document.querySelector("#start-help"))');
  if (ready) break;
  await delay(100);
}

/* ---------- ① 帮助 → 常见问题解决方案弹窗 ---------- */
const help = await evaluate(page, `(() => {
  const startHelp = document.querySelector('#start-help');
  const rect = startHelp.getBoundingClientRect();
  /* 命中测试：热区中心点最上层元素应为本按钮 */
  const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
  startHelp.click();
  const dialog = document.querySelector('#faq-dialog');
  const items = [...dialog.querySelectorAll('.faq-item')];
  const link = document.querySelector('#faq-link');
  const linkStyle = getComputedStyle(link);
  const footText = document.querySelector('#faq-more').textContent.trim();
  const animation = getComputedStyle(dialog).animationName;
  return {
    helpExists: Boolean(startHelp),
    hitIsHelp: hit === startHelp,
    helpTapSize: { w: Math.round(rect.width), h: Math.round(rect.height) },
    open: dialog.open,
    itemCount: items.length,
    questions: items.map((n) => n.querySelector('.faq-q').textContent),
    answersFilled: items.every((n) => (n.querySelector('.faq-a').textContent || '').length > 10),
    footText,
    linkText: link.textContent,
    linkColor: linkStyle.color,
    linkDecoration: linkStyle.textDecorationLine,
    animation,
    /* 帮助热区应落在整图右上角「帮助」二字上：换算到 686×1530 原图坐标 */
    imgBox: (() => {
      const img = document.querySelector('#start-reference').getBoundingClientRect();
      const scale = Math.max(img.width / 686, img.height / 1530);
      const drawnW = 686 * scale;
      const drawnH = 1530 * scale;
      return {
        x: Math.round((rect.left + rect.width / 2 - img.left - (img.width - drawnW) / 2) / scale),
        y: Math.round((rect.top + rect.height / 2 - img.top) / scale)
      };
    })()
  };
})()`);
/* 弹窗滑入动画 280ms，等播完再量几何，避免量到动画中间帧 */
await delay(420);
const faqGeometry = await evaluate(page, `(() => {
  const d = document.querySelector('#faq-dialog').getBoundingClientRect();
  return { anchoredBottom: Math.abs(d.bottom - innerHeight) < 2, width: Math.round(d.width) };
})()`);

assert(help.helpExists, '起始页缺少「帮助」热区 #start-help');
assert(help.hitIsHelp, '「帮助」热区中心点未命中本按钮（被整图或其他元素遮挡）');
assert(help.helpTapSize.h >= 44, `「帮助」热区可点高度需 ≥44px，实际 ${help.helpTapSize.h}px`);
assert(help.open, '点击「帮助」未弹出常见问题弹窗 #faq-dialog');
assert(help.itemCount >= 3, `常见问题条数不足（${help.itemCount}），至少 3 条`);
assert(help.answersFilled, '存在没有解决方案正文的常见问题条目');
assert(help.footText === '【详情查看连接配网常见问题】', `底部文案不正确：${help.footText}`);
assert(help.linkText === '连接配网常见问题', `蓝色下划线链接文案不正确：${help.linkText}`);
assert(help.linkColor === 'rgb(91, 104, 239)', `「连接配网常见问题」应为蓝色，实际 ${help.linkColor}`);
assert(help.linkDecoration.includes('underline'), `「连接配网常见问题」应带下划线，实际 ${help.linkDecoration}`);
assert(help.animation.includes('sheet-up'), `弹窗应为自下而上滑入动画，实际 ${help.animation}`);
assert(faqGeometry.anchoredBottom, '弹窗应贴底弹出');
/* 原图内「帮助」二字包围盒 x 605~659 / y 131~157，中心约 (632, 144) */
assert(Math.abs(help.imgBox.x - 632) <= 20 && Math.abs(help.imgBox.y - 144) <= 24, `「帮助」热区未对准整图上的「帮助」二字：原图坐标 ${JSON.stringify(help.imgBox)}（期望约 x632 / y144）`);
await delay(400);
await shot(page, '01-faq-sheet.png');

/* 外链点击 → 提示跳转，且不离开当前页 */
const faqLink = await evaluate(page, `(() => {
  const before = location.href;
  document.querySelector('#faq-link').click();
  const toast = document.querySelector('#toast');
  return { toast: toast.textContent, visible: toast.classList.contains('is-visible'), stayed: location.href === before, stillOpen: document.querySelector('#faq-dialog').open };
})()`);
assert(/跳转至官方连接配网FAQ/.test(faqLink.toast), `点击外链未给出跳转提示：${faqLink.toast}`);
assert(faqLink.visible, '跳转提示 Toast 未显示');
assert(faqLink.stayed, '原型不应真的离开当前页');
assert(faqLink.stillOpen, '点击外链不应关闭弹窗');

/* Esc 关闭 + 焦点回到「帮助」 */
const faqClose = await evaluate(page, `(() => {
  document.querySelector('#faq-dialog').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  document.querySelector('#faq-dialog').close();
  document.querySelector('#faq-close').focus();
  document.querySelector('#faq-close').click();
  return { open: document.querySelector('#faq-dialog').open };
})()`);
assert(!faqClose.open, '「关闭」按钮未关闭常见问题弹窗');

/* v2 起始页也有帮助热区（切儿童账号 + v2 版本才落v2 起始页） */
const helpV2 = await evaluate(page, `(async () => {
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  window.__joinShare.account('child');
  window.__joinShare.setVersion('v2');
  await wait(0);
  const onV2 = document.querySelector('.app-screen.is-active')?.dataset.screen;
  document.querySelector('#start-help-v2').click();
  const open = document.querySelector('#faq-dialog').open;
  document.querySelector('#faq-close').click();
  window.__joinShare.account('parent');
  window.__joinShare.setVersion('v1');
  await wait(0);
  return { onV2, open, backTo: document.querySelector('.app-screen.is-active')?.dataset.screen };
})()`);
assert(helpV2.onV2 === 'start-v2', `未切到起始页v2，实际 ${helpV2.onV2}`);
assert(helpV2.open, '起始页v2 的「帮助」未弹出常见问题弹窗');
assert(helpV2.backTo === 'start', `切回家长账号后应回v1 起始页，实际 ${helpV2.backTo}`);

/* ---------- ② 【连接等待】页 ---------- */
const arrived = await evaluate(page, GOTO_HOME_WIFI);
assert(arrived.ok, `未能走到【网络配置】页（停在 ${arrived.at} / ${arrived.step || '-'}）：${arrived.toast || ''}`);

const waiting = await evaluate(page, `(() => {
  const password = document.querySelector('#home-wifi-password');
  password.value = '12345678';
  password.dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('#connect-home-wifi').click();
  const dialog = document.querySelector('#connecting-dialog');
  const core = document.querySelector('.connecting-core');
  const coreStyle = getComputedStyle(core);
  const ripples = [...document.querySelectorAll('.ripple')];
  return {
    open: dialog.open,
    coreText: document.querySelector('#connecting-core-text').textContent,
    coreBg: coreStyle.backgroundColor,
    coreRadius: coreStyle.borderRadius,
    coreAnimation: coreStyle.animationName,
    coreIsCircle: coreStyle.borderRadius.includes('50%'),
    coreColor: coreStyle.color,
    coreW: coreStyle.width,
    coreH: coreStyle.height,
    title: document.querySelector('#connecting-title').textContent,
    rippleCount: ripples.length,
    rippleBorders: ripples.map((n) => getComputedStyle(n).borderStyle + '/' + getComputedStyle(n).borderColor),
    rippleAnimations: ripples.map((n) => getComputedStyle(n).animationName),
    tip: document.querySelector('.connecting-tip').textContent,
    limitNote: document.querySelector('#connecting-limit-note').textContent,
    /* 圆心与文案是否同心 */
    concentric: (() => {
      const c = core.getBoundingClientRect();
      const t = document.querySelector('#connecting-core-text').getBoundingClientRect();
      return Math.abs((c.left + c.width / 2) - (t.left + t.width / 2)) < 1.5
        && Math.abs((c.top + c.height / 2) - (t.top + t.height / 2)) < 1.5;
    })(),
    /* 圆圈是否在页面中心 */
    stageCentered: (() => {
      const v = document.querySelector('.connecting-visual').getBoundingClientRect();
      return Math.abs((v.left + v.width / 2) - innerWidth / 2) < 2;
    })(),
    /* 贴底弹出 + 动画（等动画播完再量，避免量到动画中间帧） */
    sheetGeometry: 'pending'
  };
})()`);
await delay(420);
const sheetGeometry = await evaluate(page, `(() => {
  const d = document.querySelector('#connecting-dialog').getBoundingClientRect();
  return { animation: getComputedStyle(document.querySelector('#connecting-dialog')).animationName, anchoredBottom: Math.abs(d.bottom - innerHeight) < 2, left: Math.round(d.left), width: Math.round(d.width) };
})()`);

assert(waiting.open, '网络配置页点「连接」未弹出【连接等待】页');
assert(waiting.coreText === '正在连接打印机中...', `圆心文案不正确：${waiting.coreText}`);
assert(waiting.title === '正在连接打印机中...', `无障碍标题不正确：${waiting.title}`);
assert(waiting.coreIsCircle, '中心元素应为圆形');
assert(waiting.coreW === waiting.coreH, `中心圆圈应为正圆：${waiting.coreW} × ${waiting.coreH}`);
assert(waiting.concentric, '圆心文案未与蓝色圆圈同心');
assert(waiting.stageCentered, '蓝色圆圈组未水平居中于页面');
assert(waiting.coreBg === 'rgb(103, 91, 230)', `中心圆圈应为蓝色填充，实际 ${waiting.coreBg}`);
assert(waiting.coreColor === 'rgb(255, 255, 255)', `圆心文案应为白色，实际 ${waiting.coreColor}`);
assert(waiting.coreAnimation.includes('core-tap'), `蓝色圆圈应有「动态点击」脉冲动效，实际 ${waiting.coreAnimation}`);
assert(waiting.rippleCount >= 2, `水波纹虚线圆圈数量不足：${waiting.rippleCount}`);
assert(waiting.rippleBorders.every((b) => b.startsWith('dashed')), `水波纹圆圈应为虚线：${JSON.stringify(waiting.rippleBorders)}`);
assert(waiting.rippleBorders.every((b) => /rgb\(169, 205, 251\)/.test(b)), `水波纹圆圈应为浅蓝色：${JSON.stringify(waiting.rippleBorders)}`);
assert(waiting.rippleAnimations.every((a) => a.includes('ripple-out')), `水波纹圆圈应向外扩散：${JSON.stringify(waiting.rippleAnimations)}`);
assert(waiting.limitNote.includes('60s'), `应标注 60s 超时阈值：${waiting.limitNote}`);
assert(sheetGeometry.animation.includes('sheet-up'), `【连接等待】页应为自下而上弹出，实际 ${sheetGeometry.animation}`);
assert(sheetGeometry.anchoredBottom, '【连接等待】页应贴底弹出');
await shot(page, '02-connecting-wait.png');

/* 计时在走（1s 一跳，等够1.2s 再断言） */
await delay(600);
const ticking = await evaluate(page, `document.querySelector('#connecting-seconds').textContent`);
assert(Number(ticking) >= 1, `连接等待计时未走动：${ticking}`);

/* ---------- ②-b 正常分支 ---------- */
const success = await evaluate(page, `(async () => {
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  document.querySelector('#connecting-done').click();
  const closed = !document.querySelector('#connecting-dialog').open;
  const successVisible = !document.querySelector('#connection-success').hidden;
  const stillHomeWifi = document.querySelector('.app-screen.is-active')?.dataset.screen === 'home-wifi';
  await wait(1000);
  return {
    closed, successVisible, stillHomeWifi,
    finalScreen: document.querySelector('.app-screen.is-active')?.dataset.screen,
    finalTitle: document.querySelector('#print-ready-title').textContent
  };
})()`);
assert(success.closed, '正常分支未关闭【连接等待】页');
assert(success.successVisible, '正常分支未显示「连接成功」提示');
assert(success.stillHomeWifi, '正常分支应在【网络配置】页上叠加提示，而不是立刻跳走');
assert(success.finalScreen === 'print-ready', `正常分支未进入【打印前准备】，实际 ${success.finalScreen}`);
assert(success.finalTitle === '打印前准备', `终页标题不正确：${success.finalTitle}`);
await delay(300);
await shot(page, '03-connecting-success.png');

/* ---------- ②-c 异常分支：60s 超时（重新走一遍链路） ---------- */
const rejoin = await evaluate(page, GOTO_HOME_WIFI);
assert(rejoin.ok, `异常分支前未能回到【网络配置】页（停在 ${rejoin.at}）`);

const timeout = await evaluate(page, `(() => {
  const password = document.querySelector('#home-wifi-password');
  password.value = '12345678';
  password.dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('#connect-home-wifi').click();
  const waitOpen = document.querySelector('#connecting-dialog').open;
  const passwordBefore = password.value;
  document.querySelector('#connecting-timeout').click();
  const dialog = document.querySelector('#notice-dialog');
  return {
    waitOpen,
    passwordBefore,
    waitClosed: !document.querySelector('#connecting-dialog').open,
    noticeOpen: dialog.open,
    noticeText: document.querySelector('#notice-message').textContent,
    confirmLabel: document.querySelector('#notice-confirm').textContent,
    actionCount: document.querySelectorAll('#notice-dialog .dialog-actions button').length,
    screen: document.querySelector('.app-screen.is-active')?.dataset.screen,
    passwordAfterDialog: password.value
  };
})()`);

assert(timeout.waitOpen, '异常分支未能进入【连接等待】页');
assert(timeout.waitClosed, '超时后【连接等待】页未关闭');
assert(timeout.noticeOpen, '超时后未弹出提醒弹窗');
assert(timeout.noticeText === '连接失败，请检查：1.WiFi密码是否正确；2.在点击连接前手机是否连接上打印机WiFi热点', `超时提醒文案与文档不符：${timeout.noticeText}`);
assert(timeout.confirmLabel === '确定', `提醒弹窗按钮应为【确定】，实际 ${timeout.confirmLabel}`);
assert(timeout.actionCount === 1, '提醒弹窗应只有【确定】一个按钮');
assert(timeout.screen === 'home-wifi', `超时后应回到【网络配置】页，实际 ${timeout.screen}`);
assert(timeout.passwordAfterDialog === timeout.passwordBefore, '弹窗展示期间密码不应被提前清空');
await delay(300);
await shot(page, '04-connecting-timeout-notice.png');

const afterConfirm = await evaluate(page, `(async () => {
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  document.querySelector('#notice-confirm').click();
  await wait(60); /* dialog 的close 事件是异步派发的，等一拍再断言 */
  const password = document.querySelector('#home-wifi-password');
  return {
    noticeOpen: document.querySelector('#notice-dialog').open,
    passwordCleared: password.value === '',
    passwordType: password.type,
    invalid: password.getAttribute('aria-invalid'),
    screen: document.querySelector('.app-screen.is-active')?.dataset.screen
  };
})()`);
assert(!afterConfirm.noticeOpen, '点【确定】未关闭提醒弹窗');
assert(afterConfirm.passwordCleared, '点【确定】后密码输入框未自动清空');
assert(afterConfirm.passwordType === 'password', '清空时应把密码框恢复为掩码态');
assert(afterConfirm.invalid === null, '清空后应移除 aria-invalid');
assert(afterConfirm.screen === 'home-wifi', `点【确定】后应停留在【网络配置】页，实际 ${afterConfirm.screen}`);
await delay(300);
await shot(page, '05-after-timeout-cleared.png');

/* 超时后密码已被清空 → 用户重新输入正确密码可再次发起连接（异常可恢复） */
const recovered = await evaluate(page, `(() => {
  const password = document.querySelector('#home-wifi-password');
  const emptyAtFirst = password.value === '';
  password.value = '12345678';
  password.dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('#connect-home-wifi').click();
  const opened = document.querySelector('#connecting-dialog').open;
  document.querySelector('#connecting-done').click();
  return { emptyAtFirst, opened, closed: !document.querySelector('#connecting-dialog').open, seconds: document.querySelector('#connecting-seconds').textContent };
})()`);
assert(recovered.emptyAtFirst, '超时后密码框本应已被清空');
assert(recovered.opened, '清空密码后重新输入正确密码，应能再次进入【连接等待】页（异常可恢复）');
assert(recovered.closed, '再次连接后未能正常关闭【连接等待】页');
assert(recovered.seconds === '0', `新一轮连接的计时应从 0 开始，实际 ${recovered.seconds}`);

/* 无控制台报错 */
const browserErrors = consoleErrors.length;

console.log(JSON.stringify({
  target: onlineRoot || 'local file://',
  passed,
  failed: failures.length,
  failures,
  faq: { itemCount: help.itemCount, questions: help.questions, footText: help.footText, linkColor: help.linkColor, linkDecoration: help.linkDecoration, imgBoxHit: help.imgBox, helpTapSize: help.helpTapSize, animation: help.animation },
  connecting: { coreText: waiting.coreText, coreBg: waiting.coreBg, concentric: waiting.concentric, rippleBorders: waiting.rippleBorders, coreAnimation: waiting.coreAnimation, sheetGeometry, timeoutText: timeout.noticeText },
  browserErrors,
  consoleErrors,
  shotDir
}, null, 2));

page.close();
chrome.kill();
try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch { /* 临时目录清理失败不影响结论 */ }

if (failures.length || consoleErrors.length) process.exit(1);