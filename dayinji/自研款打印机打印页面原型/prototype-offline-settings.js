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
  document.addEventListener('DOMContentLoaded', () => {
    const note = document.createElement('p');
    note.className = 'di-card di-detail-row';
    note.textContent = '当前打印机离线，以下展示缓存信息，重新连接后更新。';
    $('#device-info-screen .di-content').prepend(note);
  });
  $('#printer-settings').addEventListener('click', () => { reuseStack.splice(0, reuseStack.length, 'deviceSettings'); });
  // 捕获阶段先拦截，避免共享信息页的处理器修改数据或打开设备管理子页。
  document.addEventListener('click', event => {
    if (!event.target.closest('#edit-device-name, #open-storage-management, #manage-gcode, #device-model-list [data-action], #model-save, #device-name-save')) return;
    event.preventDefault();event.stopImmediatePropagation();showToast('当前打印机离线');
  }, true);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !document.querySelector('dialog[open]')) {
      event.stopImmediatePropagation();goBackInReuseScreens();
    }
  }, true);
  $('#factory-reset-confirm').addEventListener('click', () => {
    $('#factory-reset-dialog').close();
    showToast('当前打印机离线，连接后可恢复出厂设置');
  });
  $('#remove-printer-confirm').addEventListener('click', () => {
    $('#remove-printer-dialog').close();
    openReuseScreen('logicDemo');
  });
  $('#logic-demo-back').addEventListener('click', () => { reuseStack.splice(0, reuseStack.length, 'deviceSettings');window.__OFFLINE_SCREENS.openScreen('device-settings-screen'); });
  $('#logic-demo-existing').addEventListener('click', () => { location.href = new URL('index.html', location.href).href; });
  $('#logic-demo-none').addEventListener('click', () => { location.href = new URL('../../lianjiepeiwnag/打印机首次配网连接流程原型/index.html', location.href).href; });
})();
