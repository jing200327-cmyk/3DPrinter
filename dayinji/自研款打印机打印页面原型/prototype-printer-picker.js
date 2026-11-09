/* 添加页、工作台和准备打印页共用当前连接的打印机。 */
(() => {
  const $ = selector => document.querySelector(selector);
  const screen = $('#add-printer-screen');
  const mine = $('#my-printers-list');
  const nearby = $('#other-printers-list');
  const layer = $('#printer-bind-layer');
  const confirm = $('#printer-bind-confirm');
  const network = $('#phone-network-simulation');
  let candidate = null;
  let switching = null;
  let switchTimer;

  function renderList() {
    mine.replaceChildren(...printerCatalog.all.map((printer, index) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'printer-card';
      card.dataset.printerId = printer.id;
      card.setAttribute('aria-pressed', String(switching ? switching === printer.id : index === 0));
      card.innerHTML = '<span class="printer-card-icon" aria-hidden="true"></span><span class="printer-card-copy"><span class="printer-name"></span><span class="printer-status"></span></span><span class="printer-selected" aria-hidden="true">✓</span>';
      card.querySelector('.printer-name').textContent = printer.name;
      const status = index === 0 ? printerConnectionState.dataset.connectionStatus : printer.status || 'idle';
      const label = card.querySelector('.printer-status');
      label.dataset.printerState = status;
      label.textContent = PREPARE_PRINTER_LABELS[status];
      return card;
    }));
    $('#my-printers-empty').hidden = !!printerCatalog.current;
    for (const card of nearby.children) {
      card.hidden = card.dataset.ownerStatus !== 'unowned' || printerCatalog.all.some(printer => printer.id === card.id);
    }
  }

  function closePrompt() {
    layer.hidden = true;
    screen.inert = false;
    candidate?.focus();
    candidate = null;
  }

  function activate(id) {
    if (printerCatalog.current) printerCatalog.setStatus(printerConnectionState.dataset.connectionStatus);
    printerCatalog.connect(id);
    switching = null;
    const url = new URL(location.href);
    for (const key of ['screen', 'from', 'preparePrinter']) url.searchParams.delete(key);
    history.replaceState(null, '', url);
    renderPrinterConnectionState(currentStatus);
    renderList();
    closeReuseScreens();
    devicePage.scrollTop = 0;
    $('#printer-switch').focus({ preventScroll: true });
  }

  function finishSwitch() {
    if (!switching || network.value === 'offline' || screen.hidden) return;
    activate(switching);
  }

  mine.addEventListener('click', event => {
    const card = event.target.closest('[data-printer-id]');
    if (!card) return;
    clearTimeout(switchTimer);
    switching = card.dataset.printerId;
    for (const row of mine.children) row.setAttribute('aria-pressed', String(row === card));
    switchTimer = setTimeout(finishSwitch, 160);
  });
  nearby.addEventListener('click', event => {
    const card = event.target.closest('.printer-card');
    if (!card || card.hidden || screen.dataset.account === 'child') return;
    switching = null;
    renderList();
    candidate = card;
    $('#printer-bind-target').textContent = card.querySelector('.printer-name').textContent;
    screen.inert = true;
    layer.hidden = false;
    $('#printer-bind-cancel').focus();
  });
  $('#printer-bind-cancel').addEventListener('click', closePrompt);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !layer.hidden) { event.preventDefault(); closePrompt(); }
  });
  confirm.addEventListener('click', () => {
    if (!candidate || network.value === 'offline') return;
    const card = candidate;
    closePrompt();
    if (screen.dataset.account === 'child') return;
    if (params.get('claimConflict') === card.id || card.dataset.ownerStatus !== 'unowned') {
      card.dataset.ownerStatus = 'claimed';
      renderList();
      $('#printer-bound-dialog').showModal();
      return;
    }
    activate(card.id);
  });

  function renderNetwork() {
    const offline = network.value === 'offline';
    $('#picker-network-banner').hidden = !offline;
    confirm.disabled = offline;
    confirm.setAttribute('aria-busy', String(offline));
    if (!offline) finishSwitch();
  }
  document.addEventListener('phone-network-change', renderNetwork);
  network.addEventListener('change', () => {
    if (!simulationMedia.matches) simulationConsole.open = false;
  });
  window.addEventListener('printer-account-change', () => {
    if (screen.dataset.account === 'child' && candidate) closePrompt();
  });
  new MutationObserver(() => {
    if (!screen.hidden) return;
    clearTimeout(switchTimer);
    switching = null;
    if (candidate) closePrompt();
  }).observe(screen, { attributes: true, attributeFilter: ['hidden'] });
  document.addEventListener('printer-picker-open', renderList);
  document.addEventListener('printer-status-change', () => { if (!screen.hidden) renderList(); });
  renderPrinterConnectionState(currentStatus);
  renderList();
  renderNetwork();
})();
