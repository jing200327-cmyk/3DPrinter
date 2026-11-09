/* 儿童设置仅提供设备信息与延时摄影，在线、离线共用账号显示规则。 */
(() => {
  const screen = document.querySelector('#device-settings-screen');
  const query = new URLSearchParams(location.search);
  const surface = document.createElement('div');
  surface.className = 'settings-child-surface';
  surface.setAttribute('aria-hidden', 'true');
  screen.querySelector('.reuse-stage').prepend(surface);
  const restricted = ['#open-firmware-version', '#open-print-options', '#open-device-control', '#open-remove-printer', '#open-factory-reset'];
  for (const action of ['factory-reset', 'remove-printer']) {
    screen.querySelector(`#open-${action}`).addEventListener('click', () => document.querySelector(`#${action}-dialog`).showModal());
  }
  function render(account) {
    const child = account === 'child';
    screen.dataset.account = child ? 'child' : 'owner';
    if (typeof renderPlateTaskAndQueue === 'function') renderPlateTaskAndQueue();
    restricted.forEach(selector => { screen.querySelector(selector).hidden = child; });
    const badge = document.querySelector('#device-account-badge');
    badge.textContent = child ? '已授权' : '机主';
    badge.classList.toggle('di-authorized', child);
  }
  window.addEventListener('printer-account-change', event => render(event.detail.account));
  document.querySelectorAll('[data-device-account]').forEach(button => button.addEventListener('click', () => render(button.dataset.deviceAccount)));
  document.querySelectorAll('[data-connection-account]').forEach(button => button.addEventListener('click', () => render(button.dataset.connectionAccount === 'restricted' ? 'child' : 'parent')));
  screen.addEventListener('click', event => {
    if (screen.dataset.account !== 'child' || !event.target.closest(restricted.join(','))) return;
    event.preventDefault();event.stopImmediatePropagation();
  }, true);
  const onlineOnly = [
    '#open-firmware-version', '#open-print-options', '#open-device-control', '#open-timelapse-settings',
    '#open-factory-reset', '#factory-reset-confirm', '#edit-device-name', '#open-storage-management',
    '#manage-gcode', '#device-model-list [data-action]', '#model-save', '#device-name-save'
  ].join(',');
  function isOffline() {
    return document.body.dataset.connectionPage === 'offline' ||
      document.querySelector('#printer-connection-state')?.dataset.connectionStatus === 'offline';
  }
  const cacheNotice = document.createElement('aside');
  cacheNotice.className = 'di-offline-notice';
  cacheNotice.setAttribute('role', 'status');
  cacheNotice.innerHTML = `<span class="di-offline-symbol" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 3l18 18M3 9a14 14 0 0 1 2-1.5M9 5.8a14 14 0 0 1 12 3.3M6 12.5a9 9 0 0 1 4-2M15 11a9 9 0 0 1 3 1.5M9 16a5 5 0 0 1 4-1"/>
      <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/>
    </svg></span>
    <div><strong>打印机离线</strong><p>当前显示本机缓存资料，重连后自动更新。</p></div>`;
  document.querySelector('#device-info-screen .di-content').prepend(cacheNotice);
  const updateNotice = () => { cacheNotice.hidden = !isOffline(); };
  updateNotice();
  document.addEventListener('printer-status-change', updateNotice);
  document.addEventListener('click', event => {
    if (!isOffline() || !event.target.closest(onlineOnly)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.target.closest('#factory-reset-confirm')) document.querySelector('#factory-reset-dialog').close();
    showToast('当前打印机离线');
  }, true);
  const account = query.get('addPrinterAccount') || (query.get('deviceAccount') === 'child' || query.get('connectionAccount') === 'restricted' ? 'child' : 'parent');
  render(account);
})();
