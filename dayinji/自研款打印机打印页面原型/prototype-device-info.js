/* 设备文件为演示数据，仅保存在当前浏览器，不连接真实设备。 */
(() => {
  const $ = selector => document.querySelector(selector);
  Object.assign(reuseScreenNames, { deviceInfo: '#device-info-screen', storageManagement: '#storage-management-screen', deviceModels: '#device-models-screen' });
  const header = (title, id, parent) => `<div class="di-status" aria-hidden="true"><span>18:04</span><span>▂▄▆　◉　▰</span></div><header class="di-nav"><button class="di-back" id="${id}" type="button" aria-label="返回${parent}"><svg viewBox="0 0 20 28" aria-hidden="true"><path d="m14 4-9 10 9 10"/></svg></button><h2>${title}</h2></header>`;
  const wrap = content => `<div class="reuse-screen-frame di-page">${content}<div class="di-home" aria-hidden="true"></div></div>`;
  const row = (label, value) => `<div class="di-detail-row"><span>${label}</span><span class="di-detail-value">${value}</span></div>`;
  $('#device-info-screen').innerHTML = wrap(`${header('设备信息', 'device-info-back', '设备设置')}<div class="di-content">
    <section class="di-card di-identity"><img src="assets/分享打印机-打印机.png" alt="Ugee Funbox 打印机实物图"><div><div class="di-device-title"><span class="di-owner">机主</span><strong>ugee funbox</strong></div><p>成型尺寸：180 × 180 × 180mm</p></div></section>
    <section class="di-card di-detail-list" aria-label="设备规格">${row('机型型号', 'Ugee Funbox')}${row('固件版本', '2.01_7.0.9')}<button id="open-storage-management" class="di-detail-row" type="button"><span>存储空间</span><span class="di-detail-value"><span id="device-storage-value"></span><span class="di-chevron" aria-hidden="true">›</span></span></button></section>
    <section class="di-card di-detail-list" aria-label="设备标识">${row('ID', '7022782816D8AB<button class="di-copy" data-copy="7022782816D8AB" aria-label="复制 ID">▢</button>')}${row('SN', 'FB202610300001<button class="di-copy" data-copy="FB202610300001" aria-label="复制 SN">▢</button>')}${row('IP', '192.168.1.105<button class="di-copy" data-copy="192.168.1.105" aria-label="复制 IP">▢</button>')}${row('Mac地址', 'FC:EE:28:16:D8:AB')}</section></div>`);
  $('#storage-management-screen').innerHTML = wrap(`${header('存储管理', 'storage-management-back', '设备信息')}<div class="di-content">
    <section class="di-card di-capacity" aria-label="存储空间概览"><div class="di-ring"><svg viewBox="0 0 160 160" aria-hidden="true"><circle cx="80" cy="80" r="69"/><circle id="storage-arc" cx="80" cy="80" r="69" pathLength="100"/></svg><div class="di-ring-label"><span>可用空间</span><span id="storage-free"></span></div></div><div class="di-capacity-summary"><span>总空间: 7.30G</span><span>已使用: <span id="storage-used"></span></span></div></section>
    <section class="di-card di-file-type"><header><div><h3>gcode文件</h3><div class="di-file-size" id="storage-gcode-size"></div></div><button id="manage-gcode" class="di-primary" type="button">去管理</button></header><p>包括设备中的gcode模型文件，可在设备模型页重命名或删除。</p></section>
    <section class="di-card di-file-type"><h3>其它文件</h3><div class="di-file-size">1.01GB</div><p>包括系统文件、固件、缓存及日志等数据，由设备自动管理。</p></section></div>`);
  $('#device-models-screen').innerHTML = wrap(`${header('设备模型', 'device-models-back', '存储管理')}<div class="di-content" id="device-model-list"></div>`);
  document.body.insertAdjacentHTML('beforeend', `<dialog id="model-action-dialog" class="di-dialog" aria-labelledby="model-action-title"><form id="model-action-form" novalidate><h2 id="model-action-title"></h2><p id="model-action-copy"></p><div id="model-name-field"><label for="model-name-input">文件名称</label><input id="model-name-input" maxlength="50" autocomplete="off" aria-describedby="model-name-hint model-name-error"><p id="model-name-hint">最多50个字符，自动保留 .gcode 后缀</p><p id="model-name-error" class="di-error" role="alert"></p></div><div class="di-dialog-actions"><button id="model-action-cancel" type="button">取消</button><button id="model-save" class="di-primary" type="submit">保存</button></div></form></dialog>`);
  const defaults = [
    { id: 'toy', name: '解压玩具_10300256.gcode', time: '48m 8s', weight: '12.9g', size: 32.45 },
    { id: 'earth', name: '地球_10300110.gcode', time: '42m 25s', weight: '7.3g', size: 21.76 },
    { id: 'robot', name: '小机器人挂件_102910.gcode', time: '1h 22m', weight: '16.2g', size: 27.83 },
    { id: 'field', name: '田野肌理画_10261339.gcode', time: '3h 52m', weight: '24.8g', size: 34.54 },
  ];
  const storageKey = 'funbox-device-models-v1';
  let models = defaults.map(item => ({ ...item }));
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(stored) && stored.every(item => defaults.some(d => d.id === item.id) && typeof item.name === 'string' && item.name.length <= 56) && new Set(stored.map(item => item.id)).size === stored.length) {
      models = stored.map(item => ({ ...defaults.find(d => d.id === item.id), name: item.name }));
    }
  } catch { /* 无可用存档时显示初始演示文件。 */ }
  const escape = value => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const fileIcon = '<svg viewBox="0 0 60 74" aria-hidden="true"><path fill="#329ce9" d="M7 0h30l20 20v49a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V5a5 5 0 0 1 5-5"/><path fill="#1688dd" d="M37 0v16a4 4 0 0 0 4 4h16"/><path fill="#ffffff88" d="m30 44 13 7-13 8-13-8z"/><path fill="#ffffffbb" d="m30 38 13 7-13 8-13-8z"/><path fill="white" d="m30 32 13 7-13 8-13-8z"/></svg>';
  const timeIcon = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 16H2V2h13v7"/><circle cx="13" cy="13" r="5"/><path d="M13 10v3h3"/></svg>';
  const weightIcon = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="7"/><circle cx="9" cy="9" r="3"/><path d="M12 15h6"/></svg>';
  function updateStorage() {
    const gcode = models.reduce((sum, model) => sum + model.size, 0);
    const used = 1.01 + gcode / 1000;
    $('#device-storage-value').textContent = `${used.toFixed(2)}GB/7.30GB`;
    $('#storage-used').textContent = `${used.toFixed(2)}G`;
    $('#storage-free').textContent = `${(7.30 - used).toFixed(2)}G`;
    $('#storage-gcode-size').textContent = `${gcode.toFixed(2)}MB`;
    $('#storage-arc').setAttribute('stroke-dasharray', `${used / 7.30 * 100} 100`);
  }
  function render() {
    $('#device-model-list').innerHTML = models.length ? models.map(model => `<article class="di-card di-model-card" data-model="${model.id}"><div class="di-model-main"><div class="di-model-thumb">${fileIcon}</div><div class="di-model-meta"><h3 class="di-model-name" title="${escape(model.name)}">${escape(model.name)}</h3><div class="di-model-stat">${timeIcon}${model.time}</div><div class="di-model-stat">${weightIcon}${model.weight}</div></div></div><button class="di-more" type="button" aria-label="${escape(model.name)}的更多操作" aria-haspopup="menu" aria-expanded="false"><span aria-hidden="true">•••</span></button><div class="di-model-menu" role="menu" aria-label="模型操作" hidden><button role="menuitem" type="button" data-action="rename">重命名</button><button role="menuitem" type="button" data-action="delete">删除</button></div><button class="di-model-print" type="button" data-action="print">打印</button></article>`).join('') : '<div class="di-empty" role="status">暂无设备模型<p>设备中的gcode文件将在这里展示</p></div>';
    updateStorage();
  }
  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(models.map(({id, name}) => ({id, name})))); }
    catch { showToast('修改已生效，当前浏览器无法保存，刷新后将恢复'); }
  }
  function closeMenus() {
    document.querySelectorAll('.di-model-menu').forEach(menu => { menu.hidden = true; });
    document.querySelectorAll('.di-more').forEach(button => button.setAttribute('aria-expanded', 'false'));
  }
  let action, selectedId;
  const dialog = $('#model-action-dialog');
  function openAction(kind, model) {
    closeMenus(); action = kind; selectedId = model.id;
    $('#model-action-title').textContent = {rename:'重命名',delete:'删除模型',print:'打印模型'}[kind];
    $('#model-action-copy').textContent = kind === 'delete' ? `确定删除“${model.name}”？删除后将释放 ${model.size.toFixed(2)}MB 空间，此操作无法撤销。` : kind === 'print' ? `确认打印“${model.name}”？预计用时 ${model.time}，耗材 ${model.weight}。` : '';
    $('#model-action-copy').hidden = kind === 'rename';
    $('#model-name-field').hidden = kind !== 'rename';
    $('#model-save').textContent = {rename:'保存',delete:'删除',print:'确认打印'}[kind];
    $('#model-name-error').textContent = '';
    $('#model-name-input').removeAttribute('aria-invalid');
    $('#model-name-input').value = model.name.replace(/\.gcode$/i, '');
    dialog.showModal();
    if (kind === 'rename') { $('#model-name-input').focus(); $('#model-name-input').select(); }
    else $('#model-action-cancel').focus();
  }
  $('#device-model-list').addEventListener('click', event => {
    const card = event.target.closest('[data-model]');
    if (!card) return;
    const model = models.find(item => item.id === card.dataset.model);
    const more = event.target.closest('.di-more');
    if (more) {
      const opening = more.getAttribute('aria-expanded') !== 'true';
      closeMenus(); card.querySelector('.di-model-menu').hidden = !opening;
      more.setAttribute('aria-expanded', String(opening));
      if (opening) card.querySelector('[role="menuitem"]').focus();
      return;
    }
    const button = event.target.closest('[data-action]');
    if (button) openAction(button.dataset.action, model);
  });
  document.addEventListener('click', event => { if (!event.target.closest('.di-more,.di-model-menu')) closeMenus(); });
  document.addEventListener('keydown', event => {
    const menu = event.target.closest('.di-model-menu');
    if (event.key === 'Escape' && menu) { menu.closest('.di-model-card').querySelector('.di-more').focus(); closeMenus(); }
    if (menu && ['ArrowDown','ArrowUp'].includes(event.key)) { event.preventDefault(); const items = [...menu.querySelectorAll('button')];items[(items.indexOf(document.activeElement) + 1) % items.length].focus(); }
    if (event.key === 'Tab') closeMenus();
  });
  $('#model-action-cancel').addEventListener('click', () => dialog.close());
  $('#model-action-form').addEventListener('submit', event => {
    event.preventDefault();
    const model = models.find(item => item.id === selectedId);
    if (!model) return;
    if (action === 'rename') {
      const name = $('#model-name-input').value.trim().replace(/\.gcode$/i, '').trim();
      const error = !name ? '请输入文件名称' : /[\\/:*?"|\u0000-\u001f]/.test(name) ? '文件名称不能包含 \\ / : * ? " | 等特殊字符' : name.length > 50 ? '文件名称最多50个字符' : models.some(item => item.id !== model.id && item.name.toLowerCase() === `${name}.gcode`.toLowerCase()) ? '已存在同名文件，请修改名称' : '';
      if (error) { $('#model-name-error').textContent = error; $('#model-name-input').setAttribute('aria-invalid', 'true'); $('#model-name-input').focus(); return; }
      model.name = `${name}.gcode`;
    } else if (action === 'delete') models = models.filter(item => item.id !== selectedId);
    else { dialog.close(); showToast('已确认打印模型（原型演示）'); return; }
    persist(); dialog.close(); render();
    showToast(action === 'rename' ? '重命名成功' : '模型已删除，存储空间已释放');
    const focusTarget = $(`[data-model="${selectedId}"] .di-more`) || $('.di-more') || $('#device-models-back');
    focusTarget.focus({preventScroll:true});
  });
  $('#open-device-info').addEventListener('click', () => { closeMenus();updateStorage();openReuseScreen('deviceInfo'); });
  $('#open-storage-management').addEventListener('click', () => openReuseScreen('storageManagement'));
  $('#manage-gcode').addEventListener('click', () => openReuseScreen('deviceModels'));
  ['device-info-back', 'storage-management-back', 'device-models-back'].forEach(id => $(`#${id}`).addEventListener('click', () => { closeMenus();goBackInReuseScreens(); }));
  document.querySelectorAll('.di-copy').forEach(button => button.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(button.dataset.copy);showToast('已复制'); } catch { showToast('当前浏览器不支持复制'); }
  }));
  render();
})();
