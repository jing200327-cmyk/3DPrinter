/* 3.3.2 离线与重连演示；控制台在设备框外，设备操作只按当前账号权限执行。 */
(() => {
  'use strict';
  const query = new URLSearchParams(location.search);
  const offline = document.body.dataset.connectionPage === 'offline';
  const state = {
    offlineVersion: query.get('offlineVersion') === 'classic' ? 'classic' : 'new',
    account: query.get('connectionAccount') === 'restricted' ? 'restricted' : 'owner',
    result: query.get('reconnectResult') === 'success' ? 'success' : 'timeout',
    ownerName: query.get('ownerName')?.trim().slice(0, 24) || '家长',
    serverStatus: ['ready', 'printing', 'paused', 'completed'].includes(query.get('serverStatus')) ? query.get('serverStatus') : 'printing',
    checking: false, attempt: 0, missed: 0
  };
  const timings = { heartbeat: 5000, timeout: 10001, success: 2000 };
  const device = document.querySelector('#device-page');
  const connection = document.querySelector('#printer-connection-state');
  let deadlineTimer, successTimer, heartbeatTimer, toastTimer;
  let pendingCause = query.get('disconnect') || 'heartbeat';

  let host = document.querySelector('#simulation-console .simulation-content');
  if (!host) {
    const console = document.createElement('details');
    console.id = 'simulation-console';
    console.className = 'prototype-console';
    console.innerHTML = '<summary>模拟控制台</summary><div class="simulation-content"></div>';
    document.body.append(console);
    host = console.querySelector('.simulation-content');
    const media = matchMedia('(min-width: 961px)');
    const sync = () => { console.open = media.matches; };
    sync(); media.addEventListener('change', sync);
  }
  const controls = document.createElement('section');
  controls.id = 'connection-console';
  controls.innerHTML = `
    ${offline ? `<h3 class="simulation-section-title">离线页版本</h3>
    <div class="simulation-options" role="radiogroup" aria-label="离线页版本">
      <button type="button" role="radio" data-offline-version="classic">现有版</button>
      <button type="button" role="radio" data-offline-version="new">新版</button>
    </div>` : ''}
    <h3 class="simulation-section-title">账号与离线重连</h3>
    <div class="simulation-options" role="radiogroup" aria-label="重连账号类型">
      <button type="button" role="radio" data-connection-account="owner">超管账号</button>
      <button type="button" role="radio" data-connection-account="restricted">受限共享成员账号</button>
    </div>
    <label class="simulation-sensor-control">打印机超管账号名称<input id="connection-owner-name" maxlength="24" type="text"></label>
    <h4 class="connection-console-heading">本次重连结果</h4>
    <div class="simulation-options" role="radiogroup" aria-label="重连结果模拟">
      <button type="button" role="radio" data-reconnect-result="success">连接成功（2 秒）</button>
      <button type="button" role="radio" data-reconnect-result="timeout">重连超时失败（超过 10 秒）</button>
    </div>
    <label class="simulation-sensor-control">恢复后设备任务状态<select id="connection-server-status"><option value="printing">打印中</option><option value="paused">已暂停</option><option value="ready">可打印</option><option value="completed">打印完成</option></select></label>
    <label class="simulation-sensor-control">离线触发<select id="connection-offline-cause"><option value="heartbeat">连续丢失心跳（5 秒一次）</option><option value="network">APP 无法访问云端或局域网</option><option value="session">WebSocket / MQTT 会话断开</option></select></label>
    <div class="simulation-options simulation-actions connection-console-actions">
      <button id="simulate-connection-offline" type="button">模拟离线触发</button>
      <button id="simulate-connection-response" type="button">模拟收到有效响应（恢复成功）</button>
      <button id="reset-connection-demo" type="button">重置本次演示</button>
    </div>
    <p class="connection-console-note">心跳 5 秒一次；丢失 2 次判定连接异常，丢失 3 次且无有效响应进入离线并自动重试。重连超过 10 秒进入账号对应的失败分支。</p>
    <p id="connection-demo-status" class="connection-console-status" role="status"></p>`;
  host.append(controls);
  const ownerInput = controls.querySelector('#connection-owner-name');
  const serverSelect = controls.querySelector('#connection-server-status');
  const causeSelect = controls.querySelector('#connection-offline-cause');
  ownerInput.value = state.ownerName;
  serverSelect.value = state.serverStatus;
  causeSelect.value = ['heartbeat', 'network', 'session'].includes(pendingCause) ? pendingCause : 'heartbeat';
  const status = controls.querySelector('#connection-demo-status');
  const reconnect = document.querySelector('#reconnect-button');
  const refresh = document.querySelector('#connection-refresh');
  const dialog = document.querySelector('#reconnect-timeout-dialog');
  const reconfigure = document.querySelector('#reconnect-reconfigure');
  const toast = document.querySelector('#toast');
  const originalOfflineCopy = document.querySelector('.offline-notice-copy')?.textContent;

  function updateChoices() {
    controls.querySelectorAll('[data-connection-account]').forEach(button => button.setAttribute('aria-checked', String(button.dataset.connectionAccount === state.account)));
    controls.querySelectorAll('[data-reconnect-result]').forEach(button => button.setAttribute('aria-checked', String(button.dataset.reconnectResult === state.result)));
    const help = document.querySelector('#offline-troubleshooting');
    if (help) help.textContent = state.account === 'owner'
      ? '请检查打印机是否开机、网络是否正常。网络正常仍无法连接时，请重启打印机后重新配网；依然无效请联系售后。'
      : '请检查打印机是否开机、网络是否正常。仍无法连接时，请联系打印机超管处理；依然无效请联系售后。';
    if (offline) {
      const modern = state.offlineVersion === 'new';
      document.body.dataset.offlineLayout = state.offlineVersion;
      controls.querySelectorAll('[data-offline-version]').forEach(button => button.setAttribute('aria-checked', String(button.dataset.offlineVersion === state.offlineVersion)));
      document.querySelector('.offline-notice-copy').textContent = modern ? '无法进行打印，请确保设备正常开机和联网' : originalOfflineCopy;
      reconnect.hidden = modern;
      help.hidden = modern;
      refresh.setAttribute('aria-label', modern ? '刷新打印机连接状态' : '重新连接打印机');
    }
  }
  function showToast(copy) {
    toast.textContent = copy; toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2400);
  }
  function stopTimers() {
    clearTimeout(deadlineTimer); clearTimeout(successTimer); clearInterval(heartbeatTimer);
  }
  function lockConfig(locked) {
    controls.querySelectorAll('[data-offline-version], [data-connection-account], [data-reconnect-result], input, select, #simulate-connection-offline').forEach(el => { el.disabled = locked; });
  }
  function renderConnection(value) {
    if (!offline) {
      if (value === 'connecting') connection.dataset.recoveryState = value;
      else delete connection.dataset.recoveryState;
      document.dispatchEvent(new Event('prototype-connection-change'));
      return;
    }
    connection.dataset.connectionStatus = value;
    const label = value === 'connecting' ? '连接中...' : '离线';
    const image = document.querySelector('#printer-connection-state-image');
    image.hidden = value === 'connecting';
    if (!image.hidden) image.src = '../../src/lianjiezhuangtai/离线.png';
    image.alt = label;
    document.querySelector('#printer-connection-state-label').textContent = label;
  }
  function renderLoading(loading) {
    for (const button of [reconnect, refresh]) {
      if (!button) continue;
      button.disabled = loading;
      button.classList.toggle('is-loading', loading);
      button.setAttribute('aria-busy', String(loading));
    }
    if (reconnect) reconnect.textContent = loading ? '连接中...' : '重新连接';
    lockConfig(loading);
  }
  function withProfile(url) {
    url.searchParams.set('offlineVersion', state.offlineVersion);
    url.searchParams.set('connectionAccount', state.account);
    url.searchParams.set('reconnectResult', state.result);
    url.searchParams.set('ownerName', state.ownerName);
    url.searchParams.set('serverStatus', state.serverStatus);
    return url;
  }
  function recover() {
    stopTimers(); state.checking = false;
    // 用本次设备响应创建工作台上下文，不把离线前任务快照回写为设备状态。
    const url = withProfile(new URL('index.html', location.href));
    url.searchParams.set('status', state.serverStatus);
    location.href = url.href;
  }
  function enterOffline(cause) {
    stopTimers();
    const url = withProfile(new URL('index-offline.html', location.href));
    url.searchParams.set('disconnect', cause);
    url.searchParams.set('autoRetry', '1');
    location.href = url.href;
  }
  function timeout() {
    stopTimers(); state.checking = false;
    renderLoading(false); renderConnection('offline');
    const owner = state.account === 'owner';
    document.querySelector('#reconnect-timeout-copy').textContent = owner
      ? '无法连接打印机，可重新配网连接'
      : `无法连接打印机，请联系${state.ownerName}（打印机超管账号）重新配网连接`;
    reconfigure.hidden = !owner;
    document.querySelector('#reconnect-dismiss').textContent = owner ? '取消' : '我知道了';
    document.querySelector('#reconnect-dismiss').dataset.tone = owner ? 'neutral' : 'primary';
    dialog.dataset.account = state.account;
    status.textContent = owner ? '重连超时：超管可重新配网连接。' : '重连超时：联系超管，不开放配网入口。';
    dialog.showModal();
  }
  function beginReconnect() {
    if (!offline || state.checking) return;
    stopTimers(); state.checking = true; state.attempt += 1;
    renderLoading(true); renderConnection('connecting');
    status.textContent = '正在查询云端及局域网设备状态，并核验配网状态…';
    deadlineTimer = setTimeout(timeout, timings.timeout);
    if (state.result === 'success') successTimer = setTimeout(recover, timings.success);
  }
  function simulateDisconnect() {
    if (state.checking) return;
    stopTimers(); state.missed = 0;
    pendingCause = causeSelect.value;
    if (pendingCause !== 'heartbeat' || offline) { enterOffline(pendingCause); return; }
    lockConfig(true);
    status.textContent = '开始模拟心跳丢失：0 / 3。';
    heartbeatTimer = setInterval(() => {
      state.missed += 1;
      status.textContent = `心跳已连续丢失 ${state.missed} / 3 次。`;
      if (state.missed === 2) {
        renderConnection('connecting');
        for (const selector of ['#task-panel', '.filament-panel', '#firmware-banner', '#timelapse-placeholder']) {
          const block = document.querySelector(selector); if (block) block.inert = true;
        }
        document.dispatchEvent(new Event('prototype-connection-camera-off'));
        status.textContent += '连接异常，正在尝试恢复；任务与耗材暂不可操作。';
      }
      if (state.missed >= 3) enterOffline('heartbeat');
    }, timings.heartbeat);
  }
  controls.querySelectorAll('[data-offline-version]').forEach(button => button.addEventListener('click', () => {
    if (state.checking) return;
    state.offlineVersion = button.dataset.offlineVersion;
    const url = new URL(location.href);
    url.searchParams.set('offlineVersion', state.offlineVersion);
    history.replaceState(null, '', url);
    updateChoices();
    status.textContent = state.offlineVersion === 'new' ? '新版离线页：点击顶部蓝色刷新按钮检测连接状态。' : '现有离线页：可通过重新连接按钮或顶部刷新检测连接状态。';
  }));
  controls.querySelectorAll('[data-connection-account]').forEach(button => button.addEventListener('click', () => {
    state.account = button.dataset.connectionAccount; updateChoices();
  }));
  controls.querySelectorAll('[data-reconnect-result]').forEach(button => button.addEventListener('click', () => {
    state.result = button.dataset.reconnectResult; updateChoices();
  }));
  ownerInput.addEventListener('change', () => { state.ownerName = ownerInput.value.trim() || '家长'; ownerInput.value = state.ownerName; });
  serverSelect.addEventListener('change', () => { state.serverStatus = serverSelect.value; });
  controls.querySelector('#simulate-connection-offline').addEventListener('click', simulateDisconnect);
  controls.querySelector('#simulate-connection-response').addEventListener('click', recover);
  controls.querySelector('#reset-connection-demo').addEventListener('click', () => {
    stopTimers(); state.checking = false; state.missed = 0;
    if (!offline) { recover(); return; }
    if (dialog.open) dialog.close();
    renderLoading(false); renderConnection('offline');
    status.textContent = '已重置，当前打印机离线，可重新选择账号和重连结果。';
  });
  updateChoices();
  status.textContent = offline ? (state.offlineVersion === 'new' ? '新版离线页：点击顶部蓝色刷新按钮检测连接状态。' : '当前打印机离线；点击重新连接或顶部刷新，按选定结果演示。') : '当前已连接，可模拟离线触发与自动恢复。';

  if (offline) {
    reconnect.addEventListener('click', beginReconnect);
    refresh.addEventListener('click', beginReconnect);
    document.querySelector('#reconnect-dismiss').addEventListener('click', () => dialog.close());
    reconfigure.addEventListener('click', () => {
      if (state.account !== 'owner') return;
      location.href = new URL('../../lianjiepeiwnag/打印机首次配网连接流程原型/index.html?screen=printer-select&account=parent', location.href).href;
    });
    const screens = [...document.querySelectorAll('.reuse-screen')];
    const closeScreens = () => {
      screens.forEach(screen => { screen.hidden = true; }); device.inert = false;
      document.body.classList.remove('operation-open');
    };
    const openScreen = id => {
      screens.forEach(screen => { screen.hidden = screen.id !== id; });
      device.inert = true; document.body.classList.add('operation-open');
      document.getElementById(id).focus({ preventScroll: true });
    };
    document.querySelector('#printer-switch').addEventListener('click', () => openScreen('add-printer-screen'));
    document.querySelector('#printer-settings').addEventListener('click', () => openScreen('device-settings-screen'));
    document.querySelector('#add-printer-back').addEventListener('click', closeScreens);
    document.querySelector('#device-settings-back').addEventListener('click', closeScreens);
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !dialog.open) closeScreens(); });
    document.querySelector('#configure-new-printer').addEventListener('click', () => {
      if (state.account !== 'owner') { showToast('仅超管可修改打印机网络，请联系超管'); return; }
      location.href = new URL('../../lianjiepeiwnag/打印机首次配网连接流程原型/index.html?screen=printer-select&account=parent', location.href).href;
    });
    ['#open-firmware-version', '#open-print-options', '#open-timelapse-settings', '#open-remove-printer'].forEach(selector => {
      document.querySelector(selector).addEventListener('click', () => showToast('打印机离线，该功能暂不可用'));
    });
    if (query.get('autoRetry') === '1') beginReconnect();
  } else if (query.get('connection') === 'offline') {
    const url = withProfile(new URL('index-offline.html', location.href));
    location.replace(url.href);
  }
  window.__CONNECTION_DEMO = { state, timings };
})();
