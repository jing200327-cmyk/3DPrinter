/* 离线设置复用在线设备信息页；仅展示缓存，设备读写在入口处阻断。 */
const reuseScreenNames = { deviceSettings: '#device-settings-screen', logicDemo: '#logic-demo-screen' };
const reuseStack = [];
function showToast(copy) { window.__OFFLINE_SCREENS.showToast(copy); }
function openReuseScreen(name) {
  reuseStack.push(name);
  window.__OFFLINE_SCREENS.openScreen(reuseScreenNames[name].slice(1));
}
function goBackInReuseScreens() {
  const previous = reuseStack.pop();
  const next = reuseStack.at(-1);
  if (next) {
    window.__OFFLINE_SCREENS.openScreen(reuseScreenNames[next].slice(1));
    const trigger = { deviceInfo: '#open-device-info', removePrinter: '#open-remove-printer', logicDemo: '#open-remove-printer' }[previous];
    if (trigger) document.querySelector(trigger).focus({ preventScroll: true });
  } else window.__OFFLINE_SCREENS.closeScreens();
}
(() => {
  const $ = selector => document.querySelector(selector);
  $('#printer-settings').addEventListener('click', () => { reuseStack.splice(0, reuseStack.length, 'deviceSettings'); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !document.querySelector('dialog[open]')) {
      event.stopImmediatePropagation();goBackInReuseScreens();
    }
  }, true);
  $('#remove-printer-confirm').addEventListener('click', () => {
    $('#remove-printer-dialog').close();
    openReuseScreen('logicDemo');
  });
  $('#logic-demo-back').addEventListener('click', () => { reuseStack.splice(0, reuseStack.length, 'deviceSettings');window.__OFFLINE_SCREENS.openScreen('device-settings-screen'); });
  $('#logic-demo-existing').addEventListener('click', () => { location.href = new URL('index.html', location.href).href; });
  $('#logic-demo-none').addEventListener('click', () => { location.href = new URL('../../lianjiepeiwnag/打印机首次配网连接流程原型/index.html', location.href).href; });
})();
