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
  const account = query.get('addPrinterAccount') || (query.get('deviceAccount') === 'child' || query.get('connectionAccount') === 'restricted' ? 'child' : 'parent');
  render(account);
})();
