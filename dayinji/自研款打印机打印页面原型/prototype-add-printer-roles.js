/* 添加设备账号演示：儿童只查看已授权的“我的打印机”。 */
(() => {
  const screen = document.querySelector('#add-printer-screen');
  const query = new URLSearchParams(location.search);
  const defaultAccount = query.get('from') === 'pairing-start' ? 'base' : 'parent';
  const inferred = query.get('deviceAccount') === 'child' || query.get('connectionAccount') === 'restricted' ? 'child' : defaultAccount;
  let account = query.get('addPrinterAccount') || inferred;
  const controls = document.createElement('section');
  controls.innerHTML = '<h3 class="simulation-section-title">添加设备账号</h3><div class="simulation-options" role="radiogroup" aria-label="添加设备账号"><button type="button" role="radio" data-add-printer-account="parent">家长账号</button><button type="button" role="radio" data-add-printer-account="base">基础账号</button><button type="button" role="radio" data-add-printer-account="child">儿童账号</button></div>';
  document.querySelector('#simulation-console .simulation-content').append(controls);
  function render(next) {
    account = ['parent', 'base', 'child'].includes(next) ? next : 'parent';
    screen.dataset.account = account;
    screen.querySelector('#other-printers-list').closest('section').hidden = account === 'child';
    screen.querySelector('#configure-new-printer').hidden = account === 'child';
    screen.querySelector('#open-share-printer').hidden = account !== 'parent';
    controls.querySelectorAll('[data-add-printer-account]').forEach(button => button.setAttribute('aria-checked', String(button.dataset.addPrinterAccount === account)));
    window.dispatchEvent(new CustomEvent('printer-account-change', { detail: { account } }));
  }
  controls.querySelectorAll('[data-add-printer-account]').forEach(button => button.addEventListener('click', () => {
    render(button.dataset.addPrinterAccount);
    const url = new URL(location.href);url.searchParams.set('addPrinterAccount', account);history.replaceState(null, '', url);
    if (screen.hidden) openReuseScreen('addPrinter');
    if (!window.matchMedia('(min-width: 961px)').matches) document.querySelector('#simulation-console').open = false;
  }));
  document.querySelectorAll('[data-connection-account]').forEach(button => button.addEventListener('click', () => render(button.dataset.connectionAccount === 'restricted' ? 'child' : 'parent')));
  document.querySelectorAll('[data-device-account]').forEach(button => button.addEventListener('click', () => render(button.dataset.deviceAccount === 'child' ? 'child' : 'parent')));
  // 即使从旧入口触发，也不能打开儿童账号不具备的配置、分享或发现设备操作。
  screen.addEventListener('click', event => {
    if (account !== 'child' || !event.target.closest('#configure-new-printer, #open-share-printer, #other-printers-list')) return;
    event.preventDefault();event.stopImmediatePropagation();
  }, true);
  render(account);
  if (query.get('screen') === 'add-printer') openReuseScreen('addPrinter');
})();
