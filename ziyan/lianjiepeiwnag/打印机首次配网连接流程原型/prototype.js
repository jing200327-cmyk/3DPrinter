const screens = [...document.querySelectorAll('[data-screen]')];
const locationDialog = document.querySelector('#location-dialog');
const connectingDialog = document.querySelector('#connecting-dialog');
const faqDialog = document.querySelector('#faq-dialog');
const connectionSuccess = document.querySelector('#connection-success');
const wifiPassword = document.querySelector('#home-wifi-password');
const wifiError = document.querySelector('#wifi-error');
const toast = document.querySelector('#toast');
const settingsLocationView = document.querySelector('#settings-location-view');
const settingsWlanView = document.querySelector('#settings-wlan-view');
const noticeDialog = document.querySelector('#notice-dialog');
const noticeMessage = document.querySelector('#notice-message');
const noticeConfirm = document.querySelector('#notice-confirm');

const PRINTER_WLAN = 'Ugee Funbox-AP';
const EXPECTED_HOME_WIFI_PASSWORD = '12345678';
const MISSING_PRINTER_WIFI_MESSAGE = '你还没有连接到打印机WiFi，请返回设置连接打印机WiFi热点';
const WIFI_CONNECTION_ERROR = '连接失败：请检查：1.WiFi密码是否正确；2.在点击连接前手机是否连接上打印机WiFi热点';
/* 需求文档 2.2-5 第二点规定的 60s 超时提醒文案（注意：此处文档原文用「，」，与上方即时校验的「：」不同，此处按文档原文） */
const WIFI_TIMEOUT_ERROR = '连接失败，请检查：1.WiFi密码是否正确；2.在点击连接前手机是否连接上打印机WiFi热点';
/* 配网流程结束后进入自研款打印机打印页面原型 */
const PRINTER_HOME_PATH = '../../dayinji/自研款打印机打印页面原型/index.html';
/* 【连接等待】页的真实超时阈值：60s（与需求文档一致）
   演示时不可能真等 60s，故正常分支 3s 收、异常分支点击「模拟 60s 超时」立即收 */
const CONNECTING_TEXT = '正在连接打印机中...';
const CONNECTING_TIMEOUT_SECONDS = 60;
const CONNECTING_SUCCESS_DELAY = 3000;

let settingsReturnTarget = 'printer-select';
let selectedWlan = 'Home_5G';
let printerHotspotConnected = false;
let noticeFocusTarget = null;
let noticeConfirmAction = null;
let toastTimer;
let connectionTimer;
let successTimer;
let connectingTicker;
let connectingSeconds = 0;

function showScreen(name) {
  screens.forEach((screen) => {
    const active = screen.dataset.screen === name;
    screen.hidden = !active;
    screen.classList.toggle('is-active', active);
  });
  const activeScreen = screens.find((screen) => screen.dataset.screen === name);
  activeScreen?.scrollTo(0, 0);
  const heading = activeScreen?.querySelector('h1');
  window.setTimeout(() => heading?.focus({ preventScroll: true }), 0);
  /* 演示台入口显隐 + 起始页改写按钮的几何对齐（函数在后面声明，声明提升可用） */
  renderDemoChrome();
  positionStartOverlay();
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('is-visible');
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 1800);
}

/* showNotice(message, focusTarget, onConfirm)
   onConfirm 可选：点【确定】、按 Esc 或点遮罩关闭弹窗后额外执行的动作（如清空密码框）。 */
function showNotice(message, focusTarget, onConfirm) {
  noticeMessage.textContent = message;
  noticeFocusTarget = focusTarget;
  noticeConfirmAction = typeof onConfirm === 'function' ? onConfirm : null;
  noticeDialog.showModal();
  noticeConfirm.focus();
}

/* ==========================================================================
   可复用二次确认弹窗组件
   —— 统一「右上角关闭图标」这类破坏性/不可逆操作的二次确认，避免各页各写一套
   —— 用法：
        const ask = createConfirmDialog({ message: '…', confirmText: '确认', cancelText: '取消' });
        if (await ask.ask()) {
          // 确认：执行跳转等动作
        }
        // 取消：仅关闭弹窗，调用方状态原样保留
   —— 参数（全部可选，均有默认值）：
        message      正文文案；留空则只显示标题
        title        标题文案，默认「温馨提示」
        icon         标题上方的图标字符，默认「!」
        iconClass    图标配色修饰类，默认 dialog-icon--notice（蓝紫）
        confirmText  确认按钮文案，默认「确认」
        cancelText   取消按钮文案，默认「取消」
        dismissible  点遮罩 / 按 Esc 是否等同「取消」，默认 true
   —— 返回值：{ element, ask }；ask() 返回 Promise<boolean>，
      同一实例复用同一个 <dialog>，重复调用不会叠加弹窗；
      取消时把焦点还给触发按钮，保持键盘可达性。
   ========================================================================== */
function createConfirmDialog({
  message = '',
  title = '温馨提示',
  icon = '!',
  iconClass = 'dialog-icon--notice',
  confirmText = '确认',
  cancelText = '取消',
  dismissible = true
} = {}) {
  /* 用 createElement 拼装而不是写死 HTML：同一份组件要能创建多个互不干扰的实例 */
  const dialog = document.createElement('dialog');
  dialog.className = 'app-dialog';
  dialog.setAttribute('aria-label', title);

  const iconNode = document.createElement('div');
  iconNode.className = `dialog-icon ${iconClass}`;
  iconNode.setAttribute('aria-hidden', 'true');
  iconNode.textContent = icon;

  const titleNode = document.createElement('h2');
  titleNode.textContent = title;

  const messageNode = document.createElement('p');
  messageNode.textContent = message;

  const actions = document.createElement('div');
  actions.className = 'dialog-actions';

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.className = 'confirm-dialog__cancel';
  cancelButton.textContent = cancelText;

  const confirmButton = document.createElement('button');
  confirmButton.type = 'button';
  confirmButton.className = 'confirm-dialog__confirm';
  confirmButton.textContent = confirmText;

  actions.append(cancelButton, confirmButton);
  /* 文案为空时不留空 <p>，避免出现多余的行间距 */
  dialog.append(iconNode, titleNode, message ? messageNode : '', actions);
  document.body.append(dialog);

  /* pending 暂存本次 ask() 的 promise 与它的 resolve；
     settle 时取出并结束，确保同一次 ask 只会被结算一次 */
  let pending = null;
  let trigger = null;

  function settle(result) {
    const current = pending;
    pending = null;
    if (dialog.open) dialog.close();
    if (!result && trigger?.isConnected) trigger.focus({ preventScroll: true });
    trigger = null;
    current?.resolve(result);
  }

  cancelButton.addEventListener('click', () => settle(false));
  confirmButton.addEventListener('click', () => settle(true));
  /* 取消按钮为默认焦点，Esc / 点遮罩都走取消分支 */
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    if (dismissible) settle(false);
  });
  dialog.addEventListener('click', (event) => {
    if (!dismissible) return;
    /* <dialog> 元素本身铺满视口，点在它自己身上（而非按钮）= 点遮罩 */
    if (event.target === dialog) settle(false);
  });

  return {
    element: dialog,
    ask(event) {
      const opener = event?.currentTarget instanceof HTMLElement ? event.currentTarget : document.activeElement;
      /* 已在展示时复用同一个 Promise，连点关闭图标不会叠出多个弹窗 */
      if (pending) return pending.promise;
      trigger = opener;
      let resolveFn;
      const promise = new Promise((resolve) => { resolveFn = resolve; });
      pending = { promise, resolve: resolveFn };
      dialog.showModal();
      cancelButton.focus();
      return promise;
    }
  };
}

/* 本流程统一的「退出配网」二次确认弹窗：文案与全站保持一致 */
const EXIT_PAIRING_CONFIRM = createConfirmDialog({
  title: '温馨提示',
  message: '打印前，请务必完成打印机设置，只需几分钟即可完成',
  icon: '!',
  confirmText: '确认',
  cancelText: '取消'
});

function renderWlanNetworks() {
  document.querySelectorAll('[data-wlan]').forEach((network) => {
    const connected = network.dataset.wlan === selectedWlan;
    const printerNetwork = network.dataset.wlan === PRINTER_WLAN;
    network.classList.toggle('is-connected', connected);
    network.setAttribute('aria-pressed', String(connected));
    network.querySelector('small').textContent = connected ? (printerNetwork ? '已连接，无互联网连接' : '已连接') : (printerNetwork ? '打印机热点' : '已存储');
    network.querySelector('.checkmark').hidden = !connected;
  });
}

function openSystemSettings(mode, returnTarget) {
  settingsReturnTarget = returnTarget;
  settingsLocationView.hidden = mode !== 'location';
  settingsWlanView.hidden = mode !== 'wlan';
  document.querySelector('#system-settings-title').textContent = mode === 'location' ? '位置信息' : 'WLAN';
  if (mode === 'wlan') renderWlanNetworks();
  showScreen('system-settings');
}

document.querySelector('#add-printer').addEventListener('click', () => {
  showScreen('printer-select');
  locationDialog.showModal();
});

/* 起始页v2 的「添加打印机」与 v1 同路（家长账号视角） */
document.querySelector('#add-printer-v2').addEventListener('click', () => {
  showScreen('printer-select');
  locationDialog.showModal();
});

/* ==========================================================================
   「帮助」→ 连接配网常见问题解决方案弹窗
   —— 需求文档 2.2-1 逻辑第 4 点：点击帮助按钮弹出常见问题解决方案弹窗，
      并给出连接配网FAQ 网址跳转链接。
   —— 起始页（v1 / v2 共用同一张整图）右上角「帮助」热区 → 自下而上弹出底部弹层，
      底部文案【详情查看连接配网常见问题】，其中「连接配网常见问题」为蓝色带下划线，
      点击后模拟跳转至外部官方 FAQ 网址。
   ========================================================================== */
const FAQ_URL = 'https://www.ugee.com/pages/connect-network-faq';

function openFaqDialog() {
  if (faqDialog.open) return;
  faqDialog.showModal();
  document.querySelector('#faq-close').focus();
}

/* v1 / v2 两个起始页的「帮助」都走同一弹层 */
document.querySelector('#start-help').addEventListener('click', openFaqDialog);
document.querySelector('#start-help-v2').addEventListener('click', openFaqDialog);
document.querySelector('#faq-close').addEventListener('click', () => faqDialog.close());

/* 点遮罩 /按 Esc 关闭；关闭后把焦点还给「帮助」按钮，保持键盘可达性 */
faqDialog.addEventListener('click', (event) => {
  if (event.target === faqDialog) faqDialog.close();
});
faqDialog.addEventListener('close', () => {
  const active = screens.find((screen) => !screen.hidden && (screen.dataset.screen === 'start' || screen.dataset.screen === 'start-v2'));
  (active?.dataset.screen === 'start-v2' ? document.querySelector('#start-help-v2') : document.querySelector('#start-help'))?.focus({ preventScroll: true });
});

/* 「连接配网常见问题」蓝色下划线外链：模拟跳转至外部官方 FAQ 网址 */
function goToFaqLink(event) {
  if (event) event.preventDefault();
  showToast('正在跳转至官方连接配网FAQ页面（原型不离开当前页）');
  /* 真实实现走系统浏览器/内嵌WebView 打开该 URL；原型阶段只提示、不离开当前页，
     避免评审时跳出原型。若需真跳转，取消下一行注释即可。 */
  // window.open(FAQ_URL, '_blank', 'noopener');
}
const faqLink = document.querySelector('#faq-link');
faqLink.addEventListener('click', goToFaqLink);
faqLink.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') goToFaqLink(event);
});

document.querySelector('#location-cancel').addEventListener('click', () => locationDialog.close());
document.querySelector('#location-settings').addEventListener('click', () => {
  locationDialog.close();
  openSystemSettings('location', 'printer-select');
});

document.querySelector('#settings-back').addEventListener('click', () => {
  if (settingsReturnTarget !== 'hotspot') {
    showScreen(settingsReturnTarget);
    return;
  }
  printerHotspotConnected = selectedWlan === PRINTER_WLAN;
  if (printerHotspotConnected) {
    showScreen('home-wifi');
    showToast(`已连接 ${selectedWlan}，可为打印机配置家庭 WiFi`);
    return;
  }
  showScreen('hotspot');
  showNotice(MISSING_PRINTER_WIFI_MESSAGE, document.querySelector('#open-wlan'));
});

document.querySelectorAll('[data-wlan]').forEach((network) => {
  network.addEventListener('click', () => {
    selectedWlan = network.dataset.wlan;
    renderWlanNetworks();
  });
});

noticeConfirm.addEventListener('click', () => noticeDialog.close());
noticeDialog.addEventListener('close', () => {
  noticeFocusTarget?.focus();
  noticeFocusTarget = null;
  const action = noticeConfirmAction;
  noticeConfirmAction = null;
  action?.();
});

document.querySelector('.system-toggle').addEventListener('click', (event) => {
  const button = event.currentTarget;
  const enabled = button.classList.toggle('is-on');
  button.setAttribute('aria-pressed', String(enabled));
  button.setAttribute('aria-label', `${enabled ? '关闭' : '开启'}位置信息访问`);
});

document.querySelector('#printer-type').addEventListener('click', () => showScreen('printer-ready'));
document.querySelector('#ready-next').addEventListener('click', () => showScreen('hotspot'));
document.querySelector('#open-wlan').addEventListener('click', () => {
  openSystemSettings('wlan', 'hotspot');
});

document.querySelectorAll('[data-back]').forEach((button) => {
  button.addEventListener('click', () => showScreen(button.dataset.back));
});
/* 退出配网时复位所有流程内状态：计时器、弹层、WiFi 选择与已填写的密码 */
function resetPairingFlowState() {
  window.clearTimeout(connectionTimer);
  window.clearTimeout(successTimer);
  window.clearInterval(connectingTicker);
  connectingTicker = null;
  connectingSeconds = 0;
  if (connectingDialog.open) connectingDialog.close();
  if (faqDialog.open) faqDialog.close();
  noticeFocusTarget = null;
  noticeConfirmAction = null;
  if (noticeDialog.open) noticeDialog.close();
  connectionSuccess.hidden = true;
  selectedWlan = 'Home_5G';
  printerHotspotConnected = false;
  renderWlanNetworks();
  wifiPassword.value = '';
}

/* 关闭图标统一入口：
   - data-close="direct"：直接退出（仅终页「打印前准备」沿用原有行为）
   - data-close="confirm"：先弹二次确认；取消 = 留在当前页且状态/已填数据完全不动；
     确认 = 复位并跳转回工作台（打印机）页面 */
document.querySelectorAll('[data-close]').forEach((button) => {
  button.addEventListener('click', async (event) => {
    if (button.dataset.close === 'direct') {
      resetPairingFlowState();
      showScreen('start');
      return;
    }
    const confirmed = await EXIT_PAIRING_CONFIRM.ask(event);
    if (!confirmed) return;
    resetPairingFlowState();
    window.location.href = PRINTER_HOME_PATH;
  });
});

document.querySelector('#toggle-password').addEventListener('click', (event) => {
  const visible = wifiPassword.type === 'text';
  wifiPassword.type = visible ? 'password' : 'text';
  event.currentTarget.setAttribute('aria-label', visible ? '显示密码' : '隐藏密码');
});

/* ==========================================================================
   【连接等待】页
   —— 网络配置页点「连接」→ 自下而上弹出【连接等待】页：
      页面中心蓝色填充圆圈（圆心文案【正在连接打印机中...】），蓝色圆圈做「动态点击」
      脉冲，四周浅蓝色水波纹虚线圆圈依次向外扩散。
   —— 正常分支：连接成功 → 显示「连接成功」→ 进【打印前准备】。
   —— 异常分支：连接超过 60s → 关闭本页回到【网络配置】并弹提醒弹窗，
      文案【连接失败，请检查：1.WiFi密码是否正确；2.在点击连接前手机是否连接上打印机WiFi热点】，
      给【确定】按钮，点击后回到【网络配置】页且密码输入框内容自动清空。
   ========================================================================== */
function clearConnectingTimers() {
  window.clearTimeout(connectionTimer);
  window.clearInterval(connectingTicker);
  connectingTicker = null;
}

/* 打开【连接等待】页并启动计时；正常分支 3s 后自动成功（真实阈值 60s，演示压缩） */
function openConnectingSheet() {
  connectingSeconds = 0;
  document.querySelector('#connecting-seconds').textContent = '0';
  connectingDialog.showModal();
  connectingTicker = window.setInterval(() => {
    connectingSeconds += 1;
    document.querySelector('#connecting-seconds').textContent = String(connectingSeconds);
    if (connectingSeconds >= CONNECTING_TIMEOUT_SECONDS) finishConnectingAsTimeout();
  }, 1000);
  connectionTimer = window.setTimeout(finishConnectingAsSuccess, CONNECTING_SUCCESS_DELAY);
}

/* 正常分支：连接成功 → 【打印前准备】 */
function finishConnectingAsSuccess() {
  clearConnectingTimers();
  connectingDialog.close();
  connectionSuccess.hidden = false;
  successTimer = window.setTimeout(() => {
    connectionSuccess.hidden = true;
    showScreen('print-ready');
  }, 900);
}

/* 异常分支：60s 超时 → 回【网络配置】页弹提醒，确定后清空密码输入框 */
function finishConnectingAsTimeout() {
  clearConnectingTimers();
  connectingDialog.close();
  showScreen('home-wifi');
  showNotice(WIFI_TIMEOUT_ERROR, document.querySelector('#connect-home-wifi'), () => {
    /* 需求：点击【确定】后回到【网络配置】页，前端密码输入框内容自动清空 */
    wifiPassword.value = '';
    wifiPassword.removeAttribute('aria-invalid');
    wifiError.hidden = true;
    document.querySelector('#toggle-password').setAttribute('aria-label', '显示密码');
    wifiPassword.type = 'password';
    wifiPassword.focus({ preventScroll: true });
  });
}

document.querySelector('#connecting-done').addEventListener('click', finishConnectingAsSuccess);
document.querySelector('#connecting-timeout').addEventListener('click', finishConnectingAsTimeout);

document.querySelector('#connect-home-wifi').addEventListener('click', () => {
  const validCredentials = document.querySelector('#home-wifi-name').value === 'Home_5G' && wifiPassword.value === EXPECTED_HOME_WIFI_PASSWORD;
  if (!validCredentials || !printerHotspotConnected) {
    wifiError.hidden = false;
    wifiPassword.setAttribute('aria-invalid', 'true');
    showNotice(WIFI_CONNECTION_ERROR, wifiPassword);
    return;
  }

  wifiError.hidden = true;
  wifiPassword.removeAttribute('aria-invalid');
  openConnectingSheet();
});

wifiPassword.addEventListener('input', () => {
  if (wifiPassword.value.trim()) {
    wifiError.hidden = true;
    wifiPassword.removeAttribute('aria-invalid');
  }
});

/* 打印前准备页的三个出口：左上角回退到打印机打印页原型；底部「去进料」跳工作台页并高亮耗材控制面板；「去打印」跳模型库首页（探索玩具页） */
document.querySelector('#print-ready-back').addEventListener('click', () => {
  window.location.href = PRINTER_HOME_PATH;
});

document.querySelector('#goto-filament').addEventListener('click', () => {
  window.location.href = `${PRINTER_HOME_PATH}?highlight=filament`;
});

document.querySelector('#goto-print').addEventListener('click', () => {
  window.location.href = `${PRINTER_HOME_PATH}?screen=explore-toys`;
});

renderWlanNetworks();

/* ==========================================================================
   演示台 · 账号类型（家长不受限 / 儿童受限）+ 加入共享打印机
   —— 儿童受限账号：起始页「添加打印机」→「前往认证」、「购买打印机」→「家长授权」
   —— 家长授权 → 加入共享打印机 → 确认邀请 → 加入成功
   ========================================================================== */
/* 声明提升用的就绪标记：showScreen 可能在模块初始化前被调用，用 var 兜住 TDZ */
var joinModuleReady = false;

/* 邀请码池与「分享打印机」页保持一致；FGDR3728 预置为已过期 */
const INVITE_CODES_VALID = ['ABCD1234', 'K7MP4821', 'TRQ96135', 'WXHN2847', 'JLPZ9406'];
const INVITE_CODES_EXPIRED = ['FGDR3728'];
const INVITE_OUTCOMES = ['valid', 'invalid', 'expired', 'already-joined', 'family-conflict'];
const START_IMAGE = { w: 686, h: 1530 };
/* 起始页放空白区，其余 DOM 页面放进导航栏右侧；演示台与模拟扫码页不需要入口 */
const DEMO_CHIP_SCREENS = ['start', 'start-v2', 'auth-todo', 'join-scan', 'join-confirm', 'join-done', 'child-qr'];
/* v2 起始页「家长授权」：儿童账号已在家庭群组内时弹出的 Toast */
const FAMILY_AUTH_TOAST = '已向小明妈妈发起打印机授权申请';

const demoState = {
  account: 'parent',
  invite: 'valid',
  device: 'online',
  cameraAsked: false,
  cameraGranted: false,
  /* 儿童受限账号起始页版本：v1 = 原逻辑（家长授权 → 加入共享打印机）；
     v2 = 群组判断逻辑（家长授权 → 群组内 Toast / 群组外个人二维码页） */
  startVersion: 'v1',
  /* v2 家长授权判断用：当前儿童账号是否已在家庭群组内 */
  inFamilyGroup: false
};

const demoChip = document.querySelector('#demo-chip');
const demoChipMode = document.querySelector('#demo-chip-mode');
const demoChipExtra = document.querySelector('#demo-chip-extra');
const startReference = document.querySelector('#start-reference');
const startOverlay = document.querySelector('#start-account-overlay');
const addPrinterButton = document.querySelector('#add-printer');
/* 儿童受限账号起始页v2：同一张整图 + 同一组按钮，仅「家长授权」逻辑不同 */
const startReferenceV2 = document.querySelector('#start-reference-v2');
const startOverlayV2 = document.querySelector('#start-account-overlay-v2');
const addPrinterButtonV2 = document.querySelector('#add-printer-v2');
const joinCodeInput = document.querySelector('#join-code-input');
const joinCodeError = document.querySelector('#join-code-error');
const joinCodeNext = document.querySelector('#join-code-next');
const joinScanError = document.querySelector('#join-scan-error');
const cameraPermissionDialog = document.querySelector('#camera-permission-dialog');
const cameraDeniedDialog = document.querySelector('#camera-denied-dialog');
const alreadyJoinedDialog = document.querySelector('#already-joined-dialog');
const familyConflictDialog = document.querySelector('#family-conflict-dialog');

/* ---------- 演示状态渲染 ---------- */
function renderDemoChrome() {
  if (!joinModuleReady) return;
  const active = screens.find((screen) => !screen.hidden);
  const activeName = active?.dataset.screen;
  demoChip.hidden = !activeName || !DEMO_CHIP_SCREENS.includes(activeName);
  const placement = activeName === 'start' ? 'float' : 'top';
  demoChip.dataset.placement = placement;
  demoChip.dataset.account = demoState.account;
  demoChipMode.textContent = demoState.account === 'child' ? '儿童受限' : '家长';
  /* 放在导航栏右侧时收起「· 家长/儿童」后缀，避免和居中标题挤在一起（模式在起始页可见） */
  demoChipExtra.hidden = placement === 'top';
}

function renderDemoOptions() {
  document.querySelectorAll('[data-account]').forEach((option) => {
    option.setAttribute('aria-pressed', String(option.dataset.account === demoState.account));
  });
  document.querySelectorAll('[data-invite]').forEach((option) => {
    option.setAttribute('aria-pressed', String(option.dataset.invite === demoState.invite));
  });
  document.querySelectorAll('[data-device]').forEach((option) => {
    option.setAttribute('aria-pressed', String(option.dataset.device === demoState.device));
  });
  document.querySelectorAll('[data-version]').forEach((option) => {
    option.setAttribute('aria-pressed', String(option.dataset.version === demoState.startVersion));
  });
  document.querySelectorAll('[data-family]').forEach((option) => {
    option.setAttribute('aria-pressed', String((option.dataset.family === 'in') === demoState.inFamilyGroup));
  });
}

function renderDeviceCards() {
  const offline = demoState.device === 'offline';
  document.querySelectorAll('[data-jo="device-status"]').forEach((pill) => {
    pill.dataset.status = offline ? 'offline' : 'online';
  });
  document.querySelectorAll('[data-jo="device-status-text"]').forEach((text) => {
    text.textContent = offline ? '离线' : '已连接';
  });
}

function renderStartAccount() {
  const child = demoState.account === 'child';
  startOverlay.hidden = !child;
  startOverlayV2.hidden = !child;
  /* 儿童模式下隐藏原先的透明热区，避免和改写后的按钮抢点击 */
  addPrinterButton.hidden = child;
  addPrinterButton.setAttribute('aria-hidden', String(child));
  addPrinterButtonV2.hidden = child;
  addPrinterButtonV2.setAttribute('aria-hidden', String(child));
  positionStartOverlay();
}

/* 当前可见的起始页（v1 / v2 共用同一张整图）及其覆盖层；覆盖层隐藏时返回 null */
function activeStartContext() {
  const screen = screens.find((item) => (item.dataset.screen === 'start' || item.dataset.screen === 'start-v2') && !item.hidden);
  if (!screen) return null;
  const reference = screen.querySelector('.full-reference');
  const overlay = screen.querySelector('.start-overlay');
  if (!reference || !overlay || overlay.hidden) return null;
  return { screen, reference, overlay };
}

/* 起始页是整图复用页：图片按 object-fit: cover 绘制，所以覆盖层必须对齐到
   「真实绘制的图片矩形」，而不是元素盒子。object-position 是 top center。 */
function positionStartOverlay() {
  if (!joinModuleReady) return;
  const context = activeStartContext();
  if (!context) return;
  const { screen, reference, overlay } = context;
  const imageBox = reference.getBoundingClientRect();
  const screenBox = screen.getBoundingClientRect();
  if (!imageBox.width || !imageBox.height) return;
  const scale = Math.max(imageBox.width / START_IMAGE.w, imageBox.height / START_IMAGE.h);
  const drawnWidth = START_IMAGE.w * scale;
  const drawnHeight = START_IMAGE.h * scale;
  overlay.style.setProperty('--img-scale', String(scale));
  overlay.style.width = `${drawnWidth}px`;
  overlay.style.height = `${drawnHeight}px`;
  overlay.style.left = `${imageBox.left - screenBox.left + (imageBox.width - drawnWidth) / 2}px`;
  overlay.style.top = `${imageBox.top - screenBox.top}px`;
}

/* 儿童受限账号的起始页落点：v2 落在起始页v2，其余（家长 / v1）落在原起始页 */
function startScreenName() {
  return demoState.account === 'child' && demoState.startVersion === 'v2' ? 'start-v2' : 'start';
}

/* 账号或版本变化后，若当前停在某个起始页，则跳到该状态下对应的起始页 */
function routeStartScreen() {
  const active = screens.find((screen) => !screen.hidden);
  if (active && (active.dataset.screen === 'start' || active.dataset.screen === 'start-v2')) {
    showScreen(startScreenName());
  }
}

function renderDemoState() {
  renderDemoOptions();
  renderDeviceCards();
  renderStartAccount();
  renderDemoChrome();
}

function applyAccount(account) {
  demoState.account = account === 'child' ? 'child' : 'parent';
  renderDemoState();
  routeStartScreen();
}

/* ---------- 加入共享：邀请码校验 ---------- */
function normalizeInviteCode(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

function resolveInviteOutcome(code) {
  if (demoState.invite === 'invalid') return 'invalid';
  if (demoState.invite === 'expired') return 'expired';
  if (INVITE_CODES_EXPIRED.includes(code)) return 'expired';
  if (INVITE_CODES_VALID.includes(code)) return 'valid';
  return 'invalid';
}

const INVITE_MESSAGES = {
  invalid: '邀请码错误，请检查后重试',
  expired: '邀请已过期，请家人重新分享'
};

function clearJoinErrors() {
  joinCodeError.hidden = true;
  joinCodeError.textContent = '';
  joinScanError.hidden = true;
  joinScanError.textContent = '';
  joinCodeInput.removeAttribute('aria-invalid');
}

function showInviteError(outcome) {
  joinCodeError.textContent = INVITE_MESSAGES[outcome] || INVITE_MESSAGES.invalid;
  joinCodeError.hidden = false;
  joinCodeInput.setAttribute('aria-invalid', 'true');
}

/* ---------- 加入共享：流程 ---------- */
function openJoinConfirm() {
  showScreen('join-confirm');
  renderDeviceCards();
}

function openJoinCamera() {
  showScreen('join-camera');
}

document.querySelector('#join-scan-start').addEventListener('click', () => {
  /* 首次点击申请相机权限（原型用弹窗模拟系统询问） */
  if (!demoState.cameraAsked) {
    demoState.cameraAsked = true;
    cameraPermissionDialog.showModal();
    return;
  }
  if (demoState.cameraGranted) {
    openJoinCamera();
    return;
  }
  cameraDeniedDialog.showModal();
});

document.querySelector('#camera-permission-allow').addEventListener('click', () => {
  demoState.cameraGranted = true;
  cameraPermissionDialog.close();
  openJoinCamera();
});

document.querySelector('#camera-permission-deny').addEventListener('click', () => {
  cameraPermissionDialog.close();
  cameraDeniedDialog.showModal();
});

document.querySelector('#camera-denied-settings').addEventListener('click', () => {
  demoState.cameraGranted = true;
  cameraDeniedDialog.close();
  openJoinCamera();
  showToast('已在模拟设置中允许「趣打印」使用相机');
});

document.querySelector('#camera-denied-later').addEventListener('click', () => cameraDeniedDialog.close());

document.querySelector('#join-camera-back').addEventListener('click', () => showScreen('join-scan'));

document.querySelector('#join-camera-valid').addEventListener('click', () => {
  joinCodeInput.value = INVITE_CODES_VALID[0];
  joinCodeNext.disabled = false;
  clearJoinErrors();
  openJoinConfirm();
});

document.querySelector('#join-camera-invalid').addEventListener('click', () => {
  showScreen('join-scan');
  joinScanError.textContent = '二维码无效，请扫描家人分享的邀请二维码';
  joinScanError.hidden = false;
});

joinCodeInput.addEventListener('input', () => {
  const normalized = normalizeInviteCode(joinCodeInput.value);
  if (joinCodeInput.value !== normalized) joinCodeInput.value = normalized;
  joinCodeNext.disabled = normalized.length !== 8;
  if (normalized.length === 8) return;
  joinCodeError.hidden = true;
  joinCodeInput.removeAttribute('aria-invalid');
});

joinCodeNext.addEventListener('click', () => {
  const outcome = resolveInviteOutcome(normalizeInviteCode(joinCodeInput.value));
  if (outcome !== 'valid') {
    showInviteError(outcome);
    return;
  }
  clearJoinErrors();
  openJoinConfirm();
});

document.querySelector('#join-scan-back').addEventListener('click', () => showScreen('start'));
document.querySelector('#join-confirm-back').addEventListener('click', () => showScreen('join-scan'));
document.querySelector('#join-confirm-decline').addEventListener('click', () => {
  showToast('已取消本次加入，邀请仍然有效');
  showScreen('join-scan');
});

document.querySelector('#join-confirm-accept').addEventListener('click', () => {
  if (demoState.invite === 'already-joined') {
    alreadyJoinedDialog.showModal();
    return;
  }
  if (demoState.invite === 'family-conflict') {
    familyConflictDialog.showModal();
    return;
  }
  showScreen('join-done');
  renderDeviceCards();
  showToast('已加入「My Printer」，可在设备列表中查看');
});

document.querySelector('#already-joined-view').addEventListener('click', () => {
  alreadyJoinedDialog.close();
  window.location.href = PRINTER_HOME_PATH;
});
document.querySelector('#already-joined-dismiss').addEventListener('click', () => alreadyJoinedDialog.close());
document.querySelector('#family-conflict-dismiss').addEventListener('click', () => familyConflictDialog.close());
document.querySelector('#family-conflict-view').addEventListener('click', () => {
  familyConflictDialog.close();
  showToast('当前家庭：小明的家庭（家庭与权限页不在本期原型范围）');
});
document.querySelector('#join-done-view').addEventListener('click', () => {
  window.location.href = PRINTER_HOME_PATH;
});

/* ---------- 演示台与认证占位页 ---------- */
document.querySelectorAll('[data-account]').forEach((option) => {
  option.addEventListener('click', () => applyAccount(option.dataset.account));
});
document.querySelectorAll('[data-invite]').forEach((option) => {
  option.addEventListener('click', () => {
    demoState.invite = option.dataset.invite;
    renderDemoOptions();
  });
});
document.querySelectorAll('[data-device]').forEach((option) => {
  option.addEventListener('click', () => {
    demoState.device = option.dataset.device;
    renderDemoOptions();
    renderDeviceCards();
  });
});
/* 起始页版本（v1 / v2）：切换后若正停在起始页，立即跳到对应版本 */
document.querySelectorAll('[data-version]').forEach((option) => {
  option.addEventListener('click', () => {
    demoState.startVersion = option.dataset.version === 'v2' ? 'v2' : 'v1';
    renderDemoOptions();
    routeStartScreen();
  });
});
/* 家庭群组状态：只影响 v2「家长授权」的判断分支 */
document.querySelectorAll('[data-family]').forEach((option) => {
  option.addEventListener('click', () => {
    demoState.inFamilyGroup = option.dataset.family === 'in';
    renderDemoOptions();
  });
});

demoChip.addEventListener('click', () => showScreen('demo'));
document.querySelector('#demo-enter').addEventListener('click', () => {
  clearJoinErrors();
  showScreen(startScreenName());
});

/* 儿童受限账号：前往认证 → 认证占位页（本期不实现） */
document.querySelector('#start-cta-auth').addEventListener('click', () => showScreen('auth-todo'));
/* 儿童受限账号：家长授权 → 加入共享打印机 */
document.querySelector('#start-cta-authorize').addEventListener('click', () => {
  clearJoinErrors();
  showScreen('join-scan');
});
document.querySelector('#auth-todo-back').addEventListener('click', () => showScreen('start'));
document.querySelector('#auth-todo-back-cta').addEventListener('click', () => showScreen('start'));

/* ==========================================================================
   儿童受限账号起始页 v2
   —— 首页内容与 v1 相同（同一张整图 + 前往认证 / 家长授权），
      仅「家长授权」逻辑不同：先判断当前儿童账号是否在家庭群组内。
   —— 已在群组内：本页弹 Toast「已向小明妈妈发起打印机授权申请」，不跳转；
   —— 未加入群组：跳转儿童账号个人二维码页，家长扫码加入家庭群组。
   ========================================================================== */
/* v2 的「前往认证」与 v1 同路：认证占位页 */
document.querySelector('#start-cta-auth-v2').addEventListener('click', () => showScreen('auth-todo'));
/* v2 的「家长授权」：家庭群组判断 + 两个分支 */
document.querySelector('#start-cta-authorize-v2').addEventListener('click', () => {
  if (demoState.inFamilyGroup) {
    showToast(FAMILY_AUTH_TOAST);
    return;
  }
  showScreen('child-qr');
});
/* 二维码页返回：回到起始页v2（不是 v1） */
document.querySelector('#child-qr-back').addEventListener('click', () => showScreen('start-v2'));

/* ---------- 儿童账号个人二维码（演示图形） ---------- */
/* 用确定性伪随机（mulberry32，固定种子）生成类 QR 矩阵：三个定位图案 +
   定时图案 + 校正图案 + 约一半密度的数据模块，中心留空放头像徽章。
   每次加载结果一致，便于评审比对与自动化断言。 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function renderChildQr() {
  const svg = document.querySelector('#child-qr-svg');
  if (!svg) return;
  const NS = 'http://www.w3.org/2000/svg';
  const modules = 25;
  const offset = 8; /* 四边各 2 个模块的静区（4 单位） */
  const cell = 4;
  const black = '#1f242c';
  const random = mulberry32(20261012);
  /* 定位图案 / 定时图案 / 校正图案 / 中心头像区不填数据模块 */
  const reserved = (row, col) => {
    const finder = (row <= 7 && col <= 7) || (row <= 7 && col >= 17) || (row >= 17 && col <= 7);
    const timing = row === 6 || col === 6;
    const align = row >= 16 && row <= 20 && col >= 16 && col <= 20;
    const center = row >= 9 && row <= 15 && col >= 9 && col <= 15;
    return finder || timing || align || center;
  };
  const add = (x, y, w, h, fill) => {
    const node = document.createElementNS(NS, 'rect');
    node.setAttribute('x', x);
    node.setAttribute('y', y);
    node.setAttribute('width', w);
    node.setAttribute('height', h);
    node.setAttribute('fill', fill);
    svg.append(node);
  };
  add(0, 0, 116, 116, '#ffffff');
  for (let row = 0; row < modules; row += 1) {
    for (let col = 0; col < modules; col += 1) {
      if (reserved(row, col)) continue;
      if (random() < 0.52) add(offset + col * cell, offset + row * cell, cell, cell, black);
    }
  }
  /* 三个角的定位图案：外 7×7 黑、中 5×5 白、心 3×3 黑 */
  const finder = (row, col) => {
    add(offset + col * cell, offset + row * cell, cell * 7, cell * 7, black);
    add(offset + (col + 1) * cell, offset + (row + 1) * cell, cell * 5, cell * 5, '#ffffff');
    add(offset + (col + 2) * cell, offset + (row + 2) * cell, cell * 3, cell * 3, black);
  };
  finder(0, 0);
  finder(0, 18);
  finder(18, 0);
  /* 第 6 行 / 第 6 列定时图案：黑白相间 */
  for (let i = 8; i <= 16; i += 1) {
    if (i % 2 === 0) {
      add(offset + i * cell, offset + 6 * cell, cell, cell, black);
      add(offset + 6 * cell, offset + i * cell, cell, cell, black);
    }
  }
  /* 右下校正图案：5×5 黑、3×3 白、1×1 黑 */
  add(offset + 16 * cell, offset + 16 * cell, cell * 5, cell * 5, black);
  add(offset + 17 * cell, offset + 17 * cell, cell * 3, cell * 3, '#ffffff');
  add(offset + 18 * cell, offset + 18 * cell, cell, cell, black);
}

renderChildQr();

/* ---------- 初始化与深链 ---------- */
window.addEventListener('resize', positionStartOverlay);
startReference.addEventListener('load', positionStartOverlay);
startReferenceV2?.addEventListener('load', positionStartOverlay);

const joinDemoParams = new URLSearchParams(window.location.search);
const requestedAccount = joinDemoParams.get('account');
if (requestedAccount === 'parent' || requestedAccount === 'child') demoState.account = requestedAccount;
const requestedInvite = joinDemoParams.get('invite');
if (INVITE_OUTCOMES.includes(requestedInvite)) demoState.invite = requestedInvite;
const requestedDevice = joinDemoParams.get('device');
if (requestedDevice === 'online' || requestedDevice === 'offline') demoState.device = requestedDevice;
/* 儿童受限账号起始页版本：?version=v2 直接落到起始页v2 */
if (joinDemoParams.get('version') === 'v2') demoState.startVersion = 'v2';
/* v2 家长授权的群组判断：?family=in|out */
const requestedFamily = joinDemoParams.get('family');
if (requestedFamily === 'in') demoState.inFamilyGroup = true;
if (requestedFamily === 'out') demoState.inFamilyGroup = false;

joinModuleReady = true;
renderDemoState();

/* 无头验收用的调试句柄 */
window.__joinShare = {
  state: demoState,
  screens,
  account: applyAccount,
  setInvite: (value) => { demoState.invite = value; renderDemoOptions(); },
  setDevice: (value) => { demoState.device = value; renderDemoOptions(); renderDeviceCards(); },
  setVersion: (value) => {
    demoState.startVersion = value === 'v2' ? 'v2' : 'v1';
    renderDemoOptions();
    routeStartScreen();
  },
  setFamily: (value) => { demoState.inFamilyGroup = value === 'in'; renderDemoOptions(); },
  openFaq: openFaqDialog,
  faqUrl: FAQ_URL,
  connectingText: CONNECTING_TEXT,
  timeoutSeconds: CONNECTING_TIMEOUT_SECONDS,
  startScreen: startScreenName,
  outcome: resolveInviteOutcome,
  normalize: normalizeInviteCode,
  validCodes: INVITE_CODES_VALID,
  expiredCodes: INVITE_CODES_EXPIRED,
  overlayGeometry: () => {
    const context = activeStartContext() || { overlay: startOverlay, reference: startReference };
    const overlay = context.overlay.getBoundingClientRect();
    const image = context.reference.getBoundingClientRect();
    return {
      overlayWidth: overlay.width,
      overlayHeight: overlay.height,
      imageWidth: image.width,
      imageHeight: image.height,
      scale: Number(getComputedStyle(context.overlay).getPropertyValue('--img-scale'))
    };
  }
};

/* 支持从其他原型深链到指定页面，例如 ?screen=printer-select 直接打开“选择要设置的打印机” */
const requestedScreen = new URLSearchParams(window.location.search).get('screen');
if (requestedScreen && screens.some((screen) => screen.dataset.screen === requestedScreen)) {
  showScreen(requestedScreen);
} else {
  /* 未指定页面：儿童 v2 落到起始页v2，家长 / v1 保持默认起始页 */
  showScreen(startScreenName());
}

/* ?screen=help：直接落在起始页并弹出「连接配网常见问题」弹窗，供发布根页与评审直达
   （help 不是真实 data-screen，只作为深链别名处理） */
if (requestedScreen === 'help') {
  showScreen(startScreenName());
  window.setTimeout(openFaqDialog, 0);
}
