/* 「分享打印机」专项验收：真实点击链路 + 坐标断言 + 验收截图
   运行：node tests/share-printer-e2e.mjs
*/
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const prototypeRoot = path.resolve(import.meta.dirname, '..');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ziyan-share-printer-'));
const pageUrl = pathToFileURL(path.join(prototypeRoot, 'index.html')).href;
const shot = (name) => path.join(prototypeRoot, name);

/* 添加打印机页原图 846 × 1720 上量到的关键像素 */
const ART = { w: 846, h: 1720, padRight: 79, titleTop: 176, titleBottom: 204, titleRight: 497 };

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--remote-debugging-port=0',
  `--user-data-dir=${profileDir}`,
  '--window-size=375,812',
  pageUrl
], { stdio: 'ignore' });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let passed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) passed += 1;
  else failures.push(message);
}

async function waitForDevToolsPort() {
  const portFile = path.join(profileDir, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (fs.existsSync(portFile)) return fs.readFileSync(portFile, 'utf8').split(/\r?\n/)[0];
    await delay(100);
  }
  throw new Error('Chrome DevTools port was not created.');
}

function connectCdp(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  const consoleErrors = [];
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
    if (message.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(message.params.exceptionDetails.text + ' ' + (message.params.exceptionDetails.exception?.description || ''));
    }
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      consoleErrors.push(message.params.args.map((arg) => arg.value || arg.description).join(' '));
    }
  });
  return {
    consoleErrors,
    ready: new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    }),
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
  const result = await cdp.send('Runtime.evaluate', { returnByValue: true, awaitPromise: true, expression });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ' :: ' + expression.slice(0, 120));
  return result.result.value;
}

async function clickBox(cdp, box) {
  const x = box.x;
  const y = box.y;
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await delay(260);
}

async function boxOf(cdp, selector) {
  const box = await evaluate(cdp, `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
  })()`);
  return box;
}

async function clickSelector(cdp, selector) {
  let box = await boxOf(cdp, selector);
  assert(Boolean(box), 'clickable element missing: ' + selector);
  if (!box) return null;
  /* 分享页是纵向滚动页，下半区的控件需要先滚进视口再点 */
  if (box.height === 0 || box.top < 2 || box.bottom > 810 || box.left < 0 || box.right > 375) {
    await evaluate(cdp, `document.querySelector(${JSON.stringify(selector)}).scrollIntoView({ block: 'center' })`);
    await delay(300);
    box = await boxOf(cdp, selector);
  }
  assert(box.height > 0, '元素不可见（display:none 或所属页面未打开）：' + selector);
  const hit = await evaluate(cdp, `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    const b = el.getBoundingClientRect();
    const point = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    return { ok: Boolean(point) && (el.contains(point) || point.contains(el)), tag: point ? point.tagName + '#' + (point.id || '') + '.' + (point.className || '') : 'null' };
  })()`);
  assert(hit.ok, '命中测试失败（' + selector + '）：中心点落在 ' + hit.tag);
  await clickBox(cdp, box);
  return box;
}

async function waitUntil(cdp, expression, label) {
  const ok = await evaluate(cdp, `(async () => {
    for (let i = 0; i < 60; i += 1) {
      if (${expression}) return true;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return false;
  })()`);
  assert(ok, '等待超时：' + label);
}

async function screenshot(cdp, name) {
  /* 上一步的 Toast 还在（1.8s），先收起来并等淡出动画结束，避免糊进验收图 */
  await evaluate(cdp, `document.querySelector('#toast').classList.remove('is-visible')`);
  await delay(280);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(shot(name), Buffer.from(data, 'base64'));
}

const visibleScreens = (cdp) => evaluate(cdp, `[...document.querySelectorAll('.reuse-screen')].filter(s => !s.hidden).map(s => s.id)`);
const toastText = (cdp) => evaluate(cdp, `document.querySelector('#toast').classList.contains('is-visible') ? document.querySelector('#toast').textContent : ''`);

try {
  const port = await waitForDevToolsPort();
  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
  const target = targets.find((item) => item.type === 'page');
  assert(Boolean(target), '找不到浏览器页面目标');
  const cdp = connectCdp(target.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  await cdp.send('Accessibility.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });
  await cdp.send('Page.reload');
  await delay(800);

  /* ---------- 0 · 脚本就绪 ---------- */
  const boot = await evaluate(cdp, `({
    hasHandle: Boolean(window.__sharePrinter),
    poolSize: window.__sharePrinter ? window.__sharePrinter.poolSize : 0,
    demoTogglePainted: document.querySelector('#share-demo-toggle').offsetParent !== null,
    screens: [...document.querySelectorAll('.reuse-screen')].filter(s => !s.hidden).map(s => s.id)
  })`);
  assert(boot.hasHandle, '调试句柄 __sharePrinter 未注入');
  assert(boot.poolSize === 6, '邀请码池应为 6 组，实际 ' + boot.poolSize);
  assert(boot.demoTogglePainted === false, '未进入分享页时不应看到演示入口');
  assert(boot.screens.length === 0, '初始不应有整屏页面可见');

  /* ---------- 1 · 入口：添加打印机页顶部右侧「分享打印机」 ---------- */
  await evaluate(cdp, `window.location.hash = ''; window.__sharePrinter.scenario('normal');`);
  await clickSelector(cdp, '#printer-switch');
  assert(String(await visibleScreens(cdp)) === 'add-printer-screen', '顶栏「添加打印机」应打开添加打印机页，实际 ' + JSON.stringify(await visibleScreens(cdp)));

  const entry = await evaluate(cdp, `(() => {
    const button = document.querySelector('#open-share-printer');
    const pill = button.querySelector('.add-printer-share-entry-pill');
    const art = document.querySelector('#add-printer-screen .reuse-stage img');
    const a = art.getBoundingClientRect();
    const b = button.getBoundingClientRect();
    const p = pill.getBoundingClientRect();
    const toViewport = (px, py) => ({ x: a.left + a.width * px / ${ART.w}, y: a.top + a.height * py / ${ART.h} });
    const titleTopLeft = toViewport(350, ${ART.titleTop});
    const titleBottomRight = toViewport(${ART.titleRight}, ${ART.titleBottom});
    return {
      pillLeft: p.left, pillRight: p.right, pillTop: p.top, pillBottom: p.bottom,
      pillWidth: p.width, pillHeight: p.height,
      hitHeight: b.height, hitWidth: b.width,
      artLeft: a.left, artRight: a.right, artTop: a.top, artBottom: a.bottom,
      titleCenterY: (titleTopLeft.y + titleBottomRight.y) / 2,
      titleRight: titleBottomRight.x,
      sectionTitleTop: toViewport(81, 270).y,
      padRightPx: a.width * ${ART.padRight} / ${ART.w},
      label: button.textContent.trim(),
      aria: button.getAttribute('aria-label'),
      emptyBackground: getComputedStyle(button).backgroundColor
    };
  })()`);

  assert(entry.label === '分享打印机', '入口按钮文案应为「分享打印机」，实际 ' + entry.label);
  assert(entry.aria === '分享打印机', '入口按钮 aria-label 应为「分享打印机」');
  assert(entry.hitHeight >= 44, '入口按钮命中盒高度应 ≥ 44px，实际 ' + entry.hitHeight);
  assert(entry.hitWidth >= 44, '入口按钮命中盒宽度应 ≥ 44px，实际 ' + entry.hitWidth);
  assert(entry.pillHeight >= 28 && entry.pillHeight <= 32, '入口胶囊视觉高度应在 28~32px，实际 ' + entry.pillHeight);
  /* 右缘与卡片对齐：距画布右边缘 = 原图 79px 换算出来的值 */
  assert(Math.abs((entry.artRight - entry.pillRight) - entry.padRightPx) <= 1.5,
    '入口胶囊右缘应与卡片对齐，偏差 ' + ((entry.artRight - entry.pillRight) - entry.padRightPx).toFixed(2) + 'px');
  /* 「稍低于标题」：胶囊中心比标题中心低，且低得不过分 */
  const pillCenterY = (entry.pillTop + entry.pillBottom) / 2;
  const deltaY = pillCenterY - entry.titleCenterY;
  assert(deltaY > 4, '入口应低于标题中心，实际差 ' + deltaY.toFixed(2) + 'px');
  assert(deltaY < 24, '入口不应离标题中心太远，实际差 ' + deltaY.toFixed(2) + 'px');
  /* 与标题不重叠（标题居中，入口靠右） */
  assert(entry.pillLeft > entry.titleRight + 6, '入口左缘应让开标题右缘，间隙仅 ' + (entry.pillLeft - entry.titleRight).toFixed(2) + 'px');
  /* 不压到「我的打印机」小标题与下方卡片 */
  assert(entry.pillBottom < entry.sectionTitleTop - 4,
    '入口底边不应压到「我的打印机」小标题，间隙仅 ' + (entry.sectionTitleTop - entry.pillBottom).toFixed(2) + 'px');
  assert(entry.emptyBackground === 'rgba(0, 0, 0, 0)', '入口命中盒背景应为透明，实际 ' + entry.emptyBackground);
  await screenshot(cdp, 'prototype-share-entry.png');

  /* ---------- 2 · 进入分享页 ---------- */
  await clickSelector(cdp, '.add-printer-share-entry-pill');
  assert(String(await visibleScreens(cdp)) === 'share-printer-screen', '点入口后应进入分享页，实际 ' + JSON.stringify(await visibleScreens(cdp)));

  const firstView = await evaluate(cdp, `(() => {
    const qr = document.querySelector('#share-qr-image');
    const credential = document.querySelector('#share-credential').getBoundingClientRect();
    const qrBox = document.querySelector('.share-qr').getBoundingClientRect();
    const code = document.querySelector('#share-code').getBoundingClientRect();
    return {
      name: document.querySelector('#share-device-name').textContent,
      status: document.querySelector('#share-device-status-text').textContent,
      statusAttr: document.querySelector('#share-device-status').dataset.status,
      sn: document.querySelector('#share-device-sn').textContent,
      switchHidden: document.querySelector('#share-switch-printer').hidden,
      code: document.querySelector('#share-code').textContent,
      expiry: document.querySelector('#share-expiry').textContent,
      introTitle: document.querySelector('.share-intro-copy h2').textContent,
      introCopy: document.querySelector('.share-intro-copy p').textContent,
      credentialTitle: document.querySelector('.share-credential-title').textContent,
      inviteLabel: document.querySelector('#share-invite').textContent,
      regenerateLabel: document.querySelector('#share-regenerate').textContent,
      counts: document.querySelector('#share-members-count').textContent,
      memberNames: [...document.querySelectorAll('#share-printer-screen .share-member-name')].map(n => n.textContent),
      memberRoles: [...document.querySelectorAll('#share-printer-screen .share-member-role')].map(n => n.textContent),
      memberStates: [...document.querySelectorAll('#share-printer-screen .share-member-state')].map(n => n.textContent),
      emptyDisplay: getComputedStyle(document.querySelector('#share-device-empty')).display,
      cardDisplay: getComputedStyle(document.querySelector('#share-device-card')).display,
      manageLabel: document.querySelector('#share-manage-members').textContent.trim(),
      credentialState: document.querySelector('#share-credential').dataset.state,
      qrLoaded: qr.complete && qr.naturalWidth > 0,
      qrSrc: decodeURI(qr.getAttribute('src')),
      copyEnabled: !document.querySelector('#share-copy').disabled,
      demoVisible: document.querySelector('#share-demo-toggle').offsetParent !== null,
      scrollerOverflow: document.querySelector('#share-printer-screen').scrollHeight - document.querySelector('#share-printer-screen').clientHeight,
      qrInsideCredential: qrBox.top >= credential.top && qrBox.bottom <= credential.bottom,
      codeInsideCredential: code.top >= credential.top && code.bottom <= credential.bottom,
      statusColor: getComputedStyle(document.querySelector('#share-device-status')).color,
      pageBackground: getComputedStyle(document.querySelector('#share-printer-screen')).backgroundColor,
      primaryBackground: getComputedStyle(document.querySelector('#share-invite')).backgroundImage || getComputedStyle(document.querySelector('#share-invite')).backgroundColor
    };
  })()`);

  assert(firstView.name === 'My Printer', '设备名称应为 My Printer，实际 ' + firstView.name);
  assert(firstView.status === '已连接' && firstView.statusAttr === 'online', '默认状态标签应为「已连接」');
  assert(firstView.sn === 'SN ****1234', 'SN 后四位应展示 ****1234，实际 ' + firstView.sn);
  assert(firstView.switchHidden === false, 'Owner 有多台打印机时应展示下拉箭头');
  assert(firstView.code === 'ABCD 1234', '默认邀请码应为 ABCD 1234，实际 ' + firstView.code);
  assert(/^有效期剩余 09:5\d$/.test(firstView.expiry), '邀请码有效期文案应为「有效期剩余 09:5x」，实际 ' + firstView.expiry);
  assert(firstView.cardDisplay === 'flex' && firstView.emptyDisplay === 'none', '默认只应渲染设备卡，不应同时渲染空态卡');
  assert(firstView.introTitle === '和家人一起创作', '分享说明主标题不正确：' + firstView.introTitle);
  assert(firstView.introCopy === '邀请家人使用这台打印机，一起开启 3D 创作之旅。', '分享说明副标题不正确');
  assert(firstView.credentialTitle === '邀请家人加入', '分享卡片标题应为「邀请家人加入」');
  assert(firstView.inviteLabel === '分享邀请', '主按钮文案应为「分享邀请」');
  assert(firstView.regenerateLabel === '重新生成邀请码', '文字按钮文案应为「重新生成邀请码」');
  assert(firstView.counts === '2/5', '成员数量应为 2/5，实际 ' + firstView.counts);
  assert(String(firstView.memberNames) === '小明,小红', '示例成员应为 小明 / 小红，实际 ' + firstView.memberNames);
  assert(firstView.memberRoles.every((role) => role === '受限成员'), '角色标签应均为「受限成员」');
  assert(firstView.memberStates.every((state) => state === '已加入'), '加入状态应均为「已加入」');
  assert(firstView.manageLabel.indexOf('管理共享成员') === 0, '成员区底部应有「管理共享成员」入口');
  assert(firstView.credentialState === 'active', '默认凭证状态应为 active');
  assert(firstView.qrLoaded, '二维码图片未加载成功');
  assert(firstView.qrSrc.indexOf('分享打印机-二维码-1.svg') !== -1, '默认应使用第 1 张二维码，实际 ' + firstView.qrSrc);
  assert(firstView.copyEnabled, '默认复制按钮应可用');
  assert(firstView.demoVisible, '进入分享页后演示开关应可见');
  assert(firstView.qrInsideCredential && firstView.codeInsideCredential, '二维码与邀请码应完整落在分享卡片内');
  assert(firstView.scrollerOverflow > 4, '分享页内容应超出一屏并可滚动，实际溢出 ' + firstView.scrollerOverflow);
  assert(firstView.statusColor === 'rgb(14, 155, 92)', '「已连接」应为绿色，实际 ' + firstView.statusColor);
  assert(firstView.pageBackground === 'rgb(247, 249, 252)', '页面底色应为 #F7F9FC，实际 ' + firstView.pageBackground);
  await screenshot(cdp, 'prototype-share-printer.png');

  /* 二维码中心图标压在二维码正中 */
  const qrCenter = await evaluate(cdp, `(() => {
    const qr = document.querySelector('.share-qr').getBoundingClientRect();
    const logo = document.querySelector('.share-qr-logo').getBoundingClientRect();
    return { dx: (logo.left + logo.right) / 2 - (qr.left + qr.right) / 2, dy: (logo.top + logo.bottom) / 2 - (qr.top + qr.bottom) / 2 };
  })()`);
  assert(Math.abs(qrCenter.dx) <= 1.5 && Math.abs(qrCenter.dy) <= 1.5, '二维码中心图标应居中，偏差 ' + qrCenter.dx.toFixed(2) + ',' + qrCenter.dy.toFixed(2));

  /* 有效期首屏值：10 分钟有效期刚创建完 1 秒，应显示 09:59 */
  await evaluate(cdp, `window.__sharePrinter.scenario('normal')`);
  assert((await evaluate(cdp, `window.__sharePrinter.state.secondsLeft`)) === 599, '邀请码剩余秒数应为 599（对应 09:59）');
  assert((await evaluate(cdp, `document.querySelector('#share-expiry').textContent`)) === '有效期剩余 09:59', '首屏有效期应为「有效期剩余 09:59」');

  /* 成员区在折叠线以下：滚动到底再补一张验收图 */
  await evaluate(cdp, `document.querySelector('#share-printer-screen').scrollTop = 9999`);
  await delay(300);
  await screenshot(cdp, 'prototype-share-printer-members-area.png');
  await evaluate(cdp, `document.querySelector('#share-printer-screen').scrollTop = 0`);
  await delay(200);

  /* ---------- 3 · 复制邀请码 ---------- */
  await clickSelector(cdp, '#share-copy');
  assert((await toastText(cdp)) === '邀请码已复制', '复制后应 Toast「邀请码已复制」，实际「' + (await toastText(cdp)) + '」');
  assert((await evaluate(cdp, `window.__sharePrinter.copied()`)) === 'ABCD 1234', '复制内容应为当前邀请码');

  /* ---------- 4 · 分享邀请 → 系统分享面板 ---------- */
  await clickSelector(cdp, '#share-invite');
  assert((await evaluate(cdp, `!document.querySelector('#share-target-sheet').hidden`)) === true, '点「分享邀请」应弹出分享面板');
  const panel = await evaluate(cdp, `({
    title: document.querySelector('#share-panel-title').textContent,
    sub: document.querySelector('#share-panel-sub').textContent,
    targets: [...document.querySelectorAll('.share-target')].map(b => b.textContent.trim())
  })`);
  assert(panel.title.indexOf('My Printer') !== -1, '分享面板标题应带设备名，实际 ' + panel.title);
  assert(panel.sub.indexOf('ABCD 1234') !== -1 && panel.sub.indexOf('https://app.ugee.com/i/ABCD1234') !== -1, '分享面板应同时带邀请码与邀请链接，实际 ' + panel.sub);
  assert(panel.targets.length >= 4, '分享面板目标应用偏少');
  await screenshot(cdp, 'prototype-share-printer-panel.png');
  await clickSelector(cdp, '.share-target[data-target="wechat"]');
  assert((await toastText(cdp)).indexOf('已通过「微信」发送邀请') !== -1, '选择分享目标后应有 Toast，实际「' + (await toastText(cdp)) + '」');
  assert((await evaluate(cdp, `document.querySelector('#share-target-sheet').hidden`)) === true, '选完分享目标后分享面板应关闭');

  /* ---------- 5 · 重新生成邀请码（二次确认 + 换码换二维码） ---------- */
  await clickSelector(cdp, '#share-regenerate');
  assert((await evaluate(cdp, `document.querySelector('#share-confirm-dialog').open`)) === true, '点「重新生成邀请码」应先弹二次确认');
  const confirmCopy = await evaluate(cdp, `document.querySelector('#share-confirm-copy').textContent`);
  assert(confirmCopy.indexOf('ABCD 1234') !== -1 && confirmCopy.indexOf('失效') !== -1, '二次确认应说明原邀请码将失效，实际：' + confirmCopy);
  await clickSelector(cdp, '#share-confirm-cancel');
  await waitUntil(cdp, `!document.querySelector('#share-confirm-dialog').open`, '二次确认弹窗关闭');
  assert((await evaluate(cdp, `document.querySelector('#share-code').textContent`)) === 'ABCD 1234', '取消后邀请码不应变化');

  await clickSelector(cdp, '#share-regenerate');
  await waitUntil(cdp, `document.querySelector('#share-confirm-dialog').open`, '二次确认弹窗打开');
  await clickSelector(cdp, '#share-confirm-ok');
  await waitUntil(cdp, `window.__sharePrinter.credentialState() !== 'generating'`, '邀请码生成完成');
  const regenerated = await evaluate(cdp, `({ code: document.querySelector('#share-code').textContent, src: decodeURI(document.querySelector('#share-qr-image').getAttribute('src')), expiry: document.querySelector('#share-expiry').textContent })`);
  assert(regenerated.code === 'K7MP 4821', '确认后应换到码池第 2 组，实际 ' + regenerated.code);
  assert(regenerated.src.indexOf('二维码-2.svg') !== -1, '二维码应与新邀请码一起换，实际 ' + regenerated.src);
  assert(regenerated.expiry === '有效期剩余 09:59' || /^有效期剩余 09:5\d$/.test(regenerated.expiry), '重新生成后倒计时应复位到 09:5x，实际 ' + regenerated.expiry);

  /* ---------- 6 · 设备选择面板 ---------- */
  await clickSelector(cdp, '#share-switch-printer');
  assert((await evaluate(cdp, `!document.querySelector('#share-device-sheet').hidden`)) === true, '点下拉箭头应弹出设备选择面板');
  const options = await evaluate(cdp, `[...document.querySelectorAll('.share-device-option')].map(b => ({ name: b.querySelector('.share-device-option-name').textContent, selected: b.getAttribute('aria-selected') }))`);
  assert(options.length === 3, 'Owner 名下应有 3 台打印机，实际 ' + options.length);
  assert(options.length > 0 && options[0].selected === 'true', '当前设备应处于选中态');
  await screenshot(cdp, 'prototype-share-printer-devices.png');
  await clickSelector(cdp, '.share-device-option[data-device="study"]');
  await waitUntil(cdp, `window.__sharePrinter.credentialState() !== 'generating'`, '切换设备后的邀请码生成完成');
  const switched = await evaluate(cdp, `({ name: document.querySelector('#share-device-name').textContent, status: document.querySelector('#share-device-status-text').textContent, code: document.querySelector('#share-code').textContent, note: document.querySelector('#share-device-note').textContent, noteHidden: document.querySelector('#share-device-note').hidden })`);
  assert(switched.name === '书房打印机', '切换后设备名应更新，实际 ' + switched.name);
  assert(switched.status === '离线', '离线设备状态标签应为「离线」，实际 ' + switched.status);
  assert(switched.noteHidden === false && switched.note.indexOf('仍可创建邀请码') !== -1, '离线时应有「仍可创建邀请」的说明');
  assert((await evaluate(cdp, `!document.querySelector('#share-invite').disabled`)) === true, '打印机离线时仍应允许创建邀请');
  assert(switched.code !== 'K7MP 4821', '换打印机后邀请码应重新生成，实际仍为 ' + switched.code);

  /* ---------- 7 · 成员管理 + 移除成员 ---------- */
  await clickSelector(cdp, '#share-manage-members');
  assert(String(await visibleScreens(cdp)) === 'member-manage-screen', '点「管理共享成员」应进入成员管理页，实际 ' + JSON.stringify(await visibleScreens(cdp)));
  const manage = await evaluate(cdp, `({ count: document.querySelector('#member-manage-count').textContent, rows: document.querySelectorAll('.member-row').length, removes: document.querySelectorAll('.member-remove').length })`);
  assert(manage.count === '2/5' && manage.rows === 2 && manage.removes === 2, '成员管理页应展示 2 位成员且各带移除按钮');
  await screenshot(cdp, 'prototype-share-printer-members.png');
  await clickSelector(cdp, '.member-remove[data-remove="m2"]');
  await waitUntil(cdp, `document.querySelector('#share-confirm-dialog').open`, '移除成员二次确认弹窗打开');
  await clickSelector(cdp, '#share-confirm-ok');
  await waitUntil(cdp, `document.querySelector('#member-manage-count').textContent === '1/5'`, '成员数量变为 1/5');
  assert((await evaluate(cdp, `document.querySelector('#member-manage-count').textContent`)) === '1/5', '移除后成员数量应变为 1/5');
  await clickSelector(cdp, '#member-manage-back');
  assert(String(await visibleScreens(cdp)) === 'share-printer-screen', '从成员管理页返回应回到分享页');
  assert((await evaluate(cdp, `document.querySelector('#share-members-count').textContent`)) === '1/5', '分享页成员数量应同步为 1/5');
  await clickSelector(cdp, '#share-printer-back');
  assert(String(await visibleScreens(cdp)) === 'add-printer-screen', '从分享页返回应回到添加打印机页');

  /* 重新进分享页，后面几个状态都要在可见页面上做真实点击 */
  await clickSelector(cdp, '.add-printer-share-entry-pill');
  assert(String(await visibleScreens(cdp)) === 'share-printer-screen', '二次进入分享页失败');
  await evaluate(cdp, `window.__sharePrinter.scenario('expired')`);
  const expired = await evaluate(cdp, `({
    state: document.querySelector('#share-credential').dataset.state,
    expiry: document.querySelector('#share-expiry').textContent,
    note: document.querySelector('#share-note').textContent,
    inviteDisabled: document.querySelector('#share-invite').disabled,
    copyDisabled: document.querySelector('#share-copy').disabled
  })`);
  assert(expired.state === 'expired', '过期态 data-state 应为 expired');
  assert(expired.expiry === '邀请码已过期', '过期文案应为「邀请码已过期」');
  assert(expired.inviteDisabled && expired.copyDisabled, '过期后分享与复制都应不可用');
  assert(expired.note.indexOf('已过期') !== -1, '过期后应给出重新生成的引导');

  /* ---------- 9 · 异常态：生成邀请码失败 ---------- */
  await evaluate(cdp, `window.__sharePrinter.scenario('gen-failed')`);
  await clickSelector(cdp, '#share-regenerate');
  await waitUntil(cdp, `document.querySelector('#share-confirm-dialog').open`, '二次确认弹窗打开');
  await clickSelector(cdp, '#share-confirm-ok');
  await waitUntil(cdp, `document.querySelector('#share-alert-dialog').open`, '生成失败提示弹窗打开');
  const failed = await evaluate(cdp, `({ open: document.querySelector('#share-alert-dialog').open, title: document.querySelector('#share-alert-title').textContent, copy: document.querySelector('#share-alert-copy').textContent, code: document.querySelector('#share-code').textContent })`);
  assert(failed.open === true, '生成失败应弹出提示弹窗');
  assert(failed.title === '生成邀请码失败', '失败弹窗标题应为「生成邀请码失败」，实际 ' + failed.title);
  assert(failed.code === 'ABCD 1234', '生成失败时原来的邀请码应保留');
  await screenshot(cdp, 'prototype-share-printer-generate-failed.png');
  await clickSelector(cdp, '#share-alert-cancel');
  await waitUntil(cdp, `!document.querySelector('#share-alert-dialog').open`, '失败提示弹窗关闭');

  /* ---------- 10 · 异常态：共享人数达上限 ---------- */
  await evaluate(cdp, `window.__sharePrinter.scenario('member-limit')`);
  const full = await evaluate(cdp, `({
    count: document.querySelector('#share-members-count').textContent,
    rows: document.querySelectorAll('#share-printer-screen .share-member').length,
    inviteDisabled: document.querySelector('#share-invite').disabled,
    note: document.querySelector('#share-note').textContent
  })`);
  assert(full.count === '5/5' && full.rows === 5, '上限态应为 5/5 且展示 5 位成员，实际 ' + full.count + ' / ' + full.rows);
  assert(full.inviteDisabled, '达上限后「分享邀请」应不可用');
  assert(full.note.indexOf('上限') !== -1, '达上限后应说明原因');
  await screenshot(cdp, 'prototype-share-printer-member-limit.png');

  /* ---------- 11 · 异常态：无可分享设备 ---------- */
  await evaluate(cdp, `window.__sharePrinter.scenario('no-device')`);
  const noDevice = await evaluate(cdp, `({
    cardHidden: document.querySelector('#share-device-card').hidden,
    cardDisplay: getComputedStyle(document.querySelector('#share-device-card')).display,
    emptyHidden: document.querySelector('#share-device-empty').hidden,
    emptyDisplay: getComputedStyle(document.querySelector('#share-device-empty')).display,
    emptyText: document.querySelector('#share-device-empty').textContent.replace(/\\s+/g, ' ').trim(),
    switchHidden: document.querySelector('#share-switch-printer').hidden,
    state: document.querySelector('#share-credential').dataset.state,
    inviteDisabled: document.querySelector('#share-invite').disabled,
    note: document.querySelector('#share-note').textContent,
    members: document.querySelector('#share-members-count').textContent
  })`);
  assert(noDevice.cardHidden && !noDevice.emptyHidden, '无设备时应换成空态卡片');
  assert(noDevice.cardDisplay === 'none' && noDevice.emptyDisplay === 'flex', '无设备时设备卡必须真的不渲染（不能只设 hidden）');
  assert(noDevice.emptyText.indexOf('暂无可分享的打印机') !== -1, '空态文案不正确：' + noDevice.emptyText);
  assert(noDevice.switchHidden === true, '无可切换设备时下拉箭头应隐藏');
  assert(noDevice.state === 'disabled' && noDevice.inviteDisabled, '无设备时分享邀请应不可用');
  assert(noDevice.note.indexOf('添加打印机') !== -1, '无设备时应引导去添加打印机');
  await screenshot(cdp, 'prototype-share-printer-no-device.png');
  await clickSelector(cdp, '#share-add-printer');
  assert(String(await visibleScreens(cdp)) === 'add-printer-screen', '空态「去添加打印机」应回到添加打印机页');

  /* ---------- 12 · 异常态：打印机离线（仍可创建邀请） ---------- */
  await clickSelector(cdp, '.add-printer-share-entry-pill');
  await evaluate(cdp, `window.__sharePrinter.scenario('offline')`);
  const offline = await evaluate(cdp, `({
    status: document.querySelector('#share-device-status-text').textContent,
    statusAttr: document.querySelector('#share-device-status').dataset.status,
    inviteDisabled: document.querySelector('#share-invite').disabled,
    copyDisabled: document.querySelector('#share-copy').disabled,
    state: document.querySelector('#share-credential').dataset.state,
    note: document.querySelector('#share-device-note').textContent,
    color: getComputedStyle(document.querySelector('#share-device-status')).color
  })`);
  assert(offline.status === '离线' && offline.statusAttr === 'offline', '离线态标签应为「离线」');
  assert(!offline.inviteDisabled && !offline.copyDisabled && offline.state === 'active', '离线时仍应允许创建与分享邀请');
  assert(offline.note.indexOf('仍可创建邀请码') !== -1, '离线时应说明仍可创建邀请');
  assert(offline.color === 'rgb(120, 129, 143)', '离线标签应为灰色，实际 ' + offline.color);
  await screenshot(cdp, 'prototype-share-printer-offline.png');

  /* ---------- 12b · 页面内的异常状态演示入口 ---------- */
  await clickSelector(cdp, '#share-demo-toggle');
  assert((await evaluate(cdp, `!document.querySelector('#share-demo-sheet').hidden`)) === true, '演示入口应打开异常状态面板');
  const demoItems = await evaluate(cdp, `[...document.querySelectorAll('.share-demo-item')].map(b => b.dataset.scenario)`);
  assert(String(demoItems) === 'normal,no-device,offline,expired,member-limit,gen-failed', '演示面板应覆盖全部 6 种状态，实际 ' + demoItems);
  await screenshot(cdp, 'prototype-share-printer-demo-panel.png');
  await clickSelector(cdp, '.share-demo-item[data-scenario="member-limit"]');
  assert((await evaluate(cdp, `window.__sharePrinter.state.scenario`)) === 'member-limit', '演示面板切换状态未生效');
  assert((await evaluate(cdp, `document.querySelector('#share-members-count').textContent`)) === '5/5', '演示面板切到上限态后应展示 5/5');
  await evaluate(cdp, `window.__sharePrinter.scenario('normal')`);
  assert((await evaluate(cdp, `document.querySelector('#share-members-count').textContent`)) === '2/5', '切回默认态应回到 2/5');

  /* ---------- 13 · 深链 ---------- */
  for (const key of ['no-device', 'offline', 'expired', 'member-limit', 'gen-failed']) {
    await cdp.send('Page.navigate', { url: `${pageUrl}?share=${key}&n=${Math.random().toString(36).slice(2)}` });
    await delay(700);
    const state = await evaluate(cdp, `({ screens: [...document.querySelectorAll('.reuse-screen')].filter(s => !s.hidden).map(s => s.id), scenario: window.__sharePrinter.state.scenario })`);
    assert(String(state.screens) === 'share-printer-screen', '深链 ?share=' + key + ' 应直接落在分享页，实际 ' + JSON.stringify(state.screens));
    assert(state.scenario === key, '深链 ?share=' + key + ' 未生效，实际 ' + state.scenario);
  }
  await cdp.send('Page.navigate', { url: `${pageUrl}?share=normal&n=${Math.random().toString(36).slice(2)}` });
  await delay(700);

  /* ---------- 14 · 无障碍与错误 ---------- */
  const unnamed = await evaluate(cdp, `[...document.querySelectorAll('button')].filter(b => !b.hidden && !b.closest('[hidden]') && !(b.getAttribute('aria-label') || b.textContent.trim())).map(b => b.id || b.className)`);
  assert(unnamed.length === 0, '存在没有可访问名称的按钮：' + JSON.stringify(unnamed));

  const axTree = await cdp.send('Accessibility.getFullAXTree');
  const axButtons = axTree.nodes.filter((node) => node.role && node.role.value === 'button');
  assert(axButtons.every((node) => node.name && node.name.value), '无障碍树里存在无名按钮');

  assert(cdp.consoleErrors.length === 0, '存在 console 报错：' + JSON.stringify(cdp.consoleErrors.slice(0, 4)));

  /* ---------- 15 · 原有链路回归 ---------- */
  await evaluate(cdp, `window.__sharePrinter.scenario('normal')`);
  await clickSelector(cdp, '#share-printer-back');
  await clickSelector(cdp, '#add-printer-back');
  assert(String(await visibleScreens(cdp)) === '', '两级返回后应回到打印页，实际 ' + JSON.stringify(await visibleScreens(cdp)));
  assert((await evaluate(cdp, `document.querySelector('#device-page').inert`)) === false, '返回后设备页不应仍处于 inert');

  /* 完整走一遍：打印页 → 添加打印机 → 分享打印机 → 逐级返回 */
  await clickSelector(cdp, '#printer-switch');
  assert(String(await visibleScreens(cdp)) === 'add-printer-screen', '回归：添加打印机页未能打开');
  await clickSelector(cdp, '#open-share-printer');
  assert(String(await visibleScreens(cdp)) === 'share-printer-screen', '回归：分享打印机页未能打开');
  await clickSelector(cdp, '#share-printer-back');
  assert(String(await visibleScreens(cdp)) === 'add-printer-screen', '回归：分享页返回落点应为添加打印机页');
  await clickSelector(cdp, '#add-printer-back');
  assert(String(await visibleScreens(cdp)) === '', '回归：两级返回后应回到打印页');
  assert((await evaluate(cdp, `document.querySelector('#device-page').inert`)) === false, '回归：返回后设备页不应仍处于 inert');

  cdp.close();
} finally {
  chrome.kill();
}

const summary = `\n分享打印机验收：通过 ${passed} 项，失败 ${failures.length} 项\n`;
if (failures.length) {
  console.log(summary);
  failures.forEach((message, index) => console.log(`  ${index + 1}. ${message}`));
  process.exitCode = 1;
} else {
  console.log(summary + '全部通过 ✅');
}
