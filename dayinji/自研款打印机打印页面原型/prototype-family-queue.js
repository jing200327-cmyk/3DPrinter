/* 多账号提交：当前打印和旧队列继续运行，新增模型整批按排序追加。 */
(() => {
  reuseScreenNames.familyPrepare = '#family-prepare-screen';
  const screen = document.querySelector('#family-prepare-screen');
  const tasks = ['girl-1', 'girl-2'].map(id => taskCatalog[id]);
  let order = tasks.map(task => task.id);
  let selected = order[0];
  /* 与打印旅程准备打印页一致：按盘勾选提交，默认全选所有盘 */
  const checked = new Set(tasks.map(task => task.id));
  let readonly = false;
  let submittedOptions = { leveling: false, timelapse: true };
  let drag = null;
  let suppressClick = false;
  const $ = selector => screen.querySelector(selector);
  screen.innerHTML = `<div class="reuse-screen-frame"><div id="family-prepare-stage" class="reuse-stage prepare-page family-prepare-page" style="--reuse-ratio:311 / 675">
    ${document.querySelector('#prepare-stage .prepare-statusbar').outerHTML}
    <header class="prepare-header"><button id="family-prepare-back" class="prepare-back" type="button" aria-label="退出准备打印，返回工作台">←</button><h1>准备打印</h1></header>
    <div class="prepare-printer"><img src="assets/准备打印-打印机.png" alt="Ugee Funbox 打印机"><div><strong>Ugee Funbox</strong><span class="prepare-idle"><i aria-hidden="true"></i>忙碌</span></div><button id="family-switch-printer" class="prepare-switch" type="button">切换</button></div>
    <h2 class="prepare-section-title">选择要打印的盘</h2>
    <label class="prepare-select-all"><span>全选</span><input id="family-select-all" type="checkbox" checked aria-label="全选打印盘"></label>
    <div id="family-plate-list" class="plate-list" role="group" aria-label="选择要打印的盘"></div>
    <div class="prepare-options"><h2>打印选项</h2><div class="prepare-option-list"><div class="prepare-timelapse"><span>延时摄影</span><button id="family-timelapse-toggle" class="timelapse-check" type="button" role="checkbox" aria-checked="true" aria-label="延时摄影"><span class="timelapse-check-box" aria-hidden="true"></span></button></div><div class="prepare-timelapse"><span>调平校准</span><button id="family-leveling-toggle" class="timelapse-check" type="button" role="checkbox" aria-checked="false" aria-label="调平校准"><span class="timelapse-check-box" aria-hidden="true"></span></button></div></div></div>
    <div class="prepare-footer"><button id="family-save-slice" class="prepare-save" type="button">保存</button><button id="family-submit" class="prepare-start" type="button">加入打印队列</button></div>
  </div></div>`;
  const rows = tasks.map((task, index) => {
    const row = document.querySelector('#prepare-plate-list .plate-row').cloneNode(true);
    row.setAttribute('role', 'option');
    row.classList.replace('plate-row', 'family-plate-row');
    row.dataset.plate = task.id;
    row.dataset.slot = index;
    const thumbnail = row.querySelector('.prepare-model img');
    thumbnail.src = task.queueAsset;
    thumbnail.alt = `${task.title} 模型缩略图`;
    thumbnail.className = 'family-model-thumb';
    row.querySelector('.prepare-plate-info strong').textContent = `盘 ${index + 1}`;
    row.querySelector('.prepare-model-name').textContent = task.title;
    const stats = row.querySelectorAll('.prepare-plate-stats span');
    stats[0].lastChild.textContent = task.duration;
    stats[1].lastChild.textContent = `${task.grams} g`;
    row.querySelector('.prepare-material').setAttribute('aria-label', `盘 ${index + 1}，模型颜色蓝色，料架颜色蓝色`);
    const hit = row.querySelector('.plate-row-hit');
    hit.setAttribute('aria-label', `调整盘 ${index + 1} ${task.title} 的打印顺序`);
    const check = row.querySelector('.prepare-plate-check');
    check.setAttribute('aria-label', `打印盘 ${index + 1}`);
    check.addEventListener('change', () => {
      if (readonly) return;
      if (check.checked) checked.add(task.id);
      else checked.delete(task.id);
      selected = task.id;
      render();
    });
    hit.addEventListener('click', () => {
      if (suppressClick) { suppressClick = false; return; }
      if (readonly && !familyQueueTasks.some(item => item.id === task.id)) return;
      selected = task.id;
      render();
    });
    hit.addEventListener('keydown', event => {
      if (readonly || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      move(task.id, event.key === 'ArrowUp' ? 0 : 1);
    });
    hit.addEventListener('pointerdown', event => {
      if (readonly || event.button !== 0) return;
      hit.setPointerCapture(event.pointerId);
      drag = { id: task.id, y: event.clientY, moved: false, target: order.indexOf(task.id) };
      row.classList.add('is-dragging');
    });
    hit.addEventListener('pointermove', event => {
      if (!drag || drag.id !== task.id) return;
      const dy = event.clientY - drag.y;
      if (Math.abs(dy) > 4) drag.moved = true;
      row.style.transform = `translateY(${dy}px)`;
      const gap = $('#family-prepare-stage').getBoundingClientRect().height * .17778;
      drag.target = Math.max(0, Math.min(1, order.indexOf(task.id) + Math.round(dy / gap)));
    });
    function stopDrag(event) {
      if (!drag || drag.id !== task.id) return;
      const finished = drag;
      drag = null;
      row.classList.remove('is-dragging');
      row.style.transform = '';
      if (event.type !== 'pointercancel' && finished.moved) move(task.id, finished.target);
      suppressClick = event.type !== 'pointercancel' && finished.moved;
    }
    hit.addEventListener('pointerup', stopDrag);
    hit.addEventListener('pointercancel', stopDrag);
    const preview = row.querySelector('.plate-3d-btn');
    preview.setAttribute('aria-label', `3D 预览：盘 ${index + 1} ${task.title}`);
    preview.addEventListener('click', () => openPreview3D({ plateLabel: `盘 ${index + 1}`, name: task.title, duration: task.duration, grams: String(task.grams) }));
    $('#family-plate-list').append(row);
    return row;
  });
  function move(id, slot) {
    const others = order.filter(item => item !== id);
    order = [...others.slice(0, slot), id, ...others.slice(slot)];
    render();
  }
  function render() {
    rows.forEach(row => {
      const id = row.dataset.plate;
      const pending = familyQueueTasks.some(task => task.id === id);
      const result = taskResults.get(id) || (id === activeTaskId && currentStatus !== 'ready' ? resolvePrepareStateKey() : null);
      row.querySelector('.plate-row-hit').disabled = readonly && !pending;
      row.querySelector('.plate-3d-btn').disabled = Boolean(readonly && result);
      row.querySelector('.family-result-stamp')?.remove();
      row.classList.toggle('is-stamped', Boolean(readonly && result));
      if (readonly && result) {
        const stamp = document.createElement('img');
        stamp.className = 'family-result-stamp';
        stamp.src = PREPARE_STATE_STAMPS[result].src;
        stamp.alt = PREPARE_STATE_STAMPS[result].alt;
        row.append(stamp);
      }
      row.dataset.slot = order.indexOf(id);
      row.setAttribute('aria-selected', String(row.dataset.plate === selected));
      row.querySelector('.plate-row-hit').style.touchAction = readonly ? 'auto' : 'none';
      /* 队列详情（只读）下勾选项固定反映队列里已有的盘，不可再改 */
      const box = row.querySelector('.prepare-plate-check');
      box.checked = readonly ? pending : checked.has(id);
      box.disabled = readonly;
    });
    const chosen = selectedPrintOrder();
    const selectAll = $('#family-select-all');
    selectAll.checked = !readonly && chosen.length === tasks.length;
    selectAll.indeterminate = !readonly && chosen.length > 0 && chosen.length < tasks.length;
    selectAll.disabled = readonly;
    selectAll.closest('.prepare-select-all').hidden = readonly;
    $('#family-prepare-stage').dataset.readonly = String(readonly);
    $('#family-switch-printer').hidden = readonly;
    $('#family-submit').disabled = readonly ? !canStartQueueTask(taskCatalog[selected]) : chosen.length === 0;
    $('#family-submit').textContent = readonly ? '开始打印' : '加入打印队列';
    $('#family-submit').setAttribute('aria-label', readonly ? '开始打印' : `将 ${chosen.length} 盘模型加入打印队列`);
  }
  function selectedPrintOrder() { return order.filter(id => checked.has(id)); }
  function bindQueueLimitNotices() {
    $('#family-select-all').addEventListener('change', event => {
      if (readonly) return;
      checked.clear();
      if (event.target.checked) tasks.forEach(task => checked.add(task.id));
      render();
    });
    /* 两个限制提示只有「我知道了」，关闭后仍停留在准备打印页 */
    const fullDialog = document.querySelector('#queue-full-dialog');
    const accountDialog = document.querySelector('#account-limit-dialog');
    document.querySelector('#queue-full-ok').addEventListener('click', () => fullDialog.close());
    document.querySelector('#account-limit-ok').addEventListener('click', () => accountDialog.close());
  }
  function rememberPage(name, taskId) {
    const url = taskSessionUrl();
    url.searchParams.set('simulation', 'family');
    url.searchParams.set('family', 'multi');
    if (name) url.searchParams.set('screen', name);
    else url.searchParams.delete('screen');
    if (taskId) url.searchParams.set('queueTask', taskId);
    else url.searchParams.delete('queueTask');
    history.replaceState(null, '', url);
  }
  function openSubmission() {
    // 从空闲、终态或单盘演示进入时，建立一组含两条旧队列的忙碌模拟。
    if (isSinglePlateModel || (!isFamilyQueue && !familyQueueTasks.length) || !['preparing', 'printing', 'paused'].includes(currentStatus)) {
      const url = new URL(location.href);
      for (const key of ['plates', 'activeTask', 'source', 'completed', 'results', 'connection', 'queueTask']) url.searchParams.delete(key);
      url.searchParams.set('plate', '1');
      url.searchParams.set('status', 'printing');
      url.searchParams.set('queue', 'plate-2,plate-3');
      url.searchParams.set('simulation', 'family');
      url.searchParams.set('family', 'multi');
      url.searchParams.set('screen', 'family-prepare');
      location.href = url.href;
      return;
    }
    const submitted = familyQueueTasks.find(task => task.owner === 'girl');
    if (submitted) return openQueuedTask(submitted);
    if (tasks.some(task => taskResults.has(task.id) || task.id === activeTaskId)) {
      showToast('本次模型已提交，请切换模拟后开始新演示');
      return;
    }
    readonly = false;
    order = tasks.map(task => task.id);
    selected = order[0];
    /* 每次进入新的提交，勾选回到「默认全选所有盘」 */
    checked.clear();
    tasks.forEach(task => checked.add(task.id));
    rememberPage('family-prepare');
    render();
    openReuseScreen('familyPrepare');
  }
  function openQueuedTask(task) {
    if (!canControlQueueTask(task)) return;
    readonly = true;
    for (const key of ['leveling', 'timelapse']) $('#family-' + key + '-toggle').setAttribute('aria-checked', String(submittedOptions[key]));
    const pending = familyQueueTasks.filter(item => item.owner === 'girl').map(item => item.id);
    order = [...pending, ...tasks.map(item => item.id).filter(id => !pending.includes(id))];
    selected = task.id;
    rememberPage('family-queue-detail', task.id);
    render();
    openReuseScreen('familyPrepare');
  }
  $('#family-prepare-back').addEventListener('click', () => {
    rememberPage(null);
    closeReuseScreens();
    taskPanel.scrollIntoView({ block: 'start', behavior: 'instant' });
  });
  $('#family-switch-printer').addEventListener('click', () => openReuseScreen('addPrinter'));
  bindTimelapseToggle($('#family-timelapse-toggle'));
  $('#family-submit').addEventListener('click', () => {
    if (readonly) {
      if (canStartQueueTask(taskCatalog[selected]) && validatePrintFilament()) {
        startQueuedTask(taskCatalog[selected], {
          leveling: $('#family-leveling-toggle').getAttribute('aria-checked') === 'true',
          timelapse: $('#family-timelapse-toggle').getAttribute('aria-checked') === 'true'
        });
      }
      return;
    }
    if (tasks.some(task => familyQueueTasks.some(queued => queued.id === task.id) || taskResults.has(task.id) || task.id === activeTaskId)) return;
    const chosen = selectedPrintOrder();
    if (!chosen.length) { showToast('请先勾选要加入打印队列的盘'); return; }
    /* 控制台模拟的两种限制：勾选后优先弹对应提示，不真正提交 */
    if (document.querySelector('#simulate-queue-full')?.checked) {
      document.querySelector('#queue-full-dialog').showModal();
      return;
    }
    if (document.querySelector('#simulate-account-limit')?.checked) {
      document.querySelector('#account-limit-dialog').showModal();
      return;
    }
    if (ownedPendingBatchCount('girl') >= 2) { showToast('每人最多保留 2 个未完成模型任务，请先完成或取消已有任务'); return; }
    submittedOptions = {
      leveling: $('#family-leveling-toggle').getAttribute('aria-checked') === 'true',
      timelapse: $('#family-timelapse-toggle').getAttribute('aria-checked') === 'true'
    };
    familyQueueTasks.push(...chosen.map(id => taskCatalog[id]));
    rememberPage(null);
    renderPlateTaskAndQueue();
    queueToggle.hidden = false;
    queueToggle.setAttribute('aria-expanded', 'true');
    printQueue.hidden = false;
    closeReuseScreens();
    taskPanel.scrollIntoView({ block: 'start', behavior: 'instant' });
    showToast(`已将 ${chosen.length} 个打印任务加入打印队列`);
  });
  bindQueueLimitNotices();
  window.__FAMILY_QUEUE = {
    openSubmission, openQueuedTask,
    owns: task => task.owner === 'girl'
  };
  document.addEventListener('printer-status-change', () => { if (readonly && !screen.hidden) render(); });
  render();
  const initial = new URLSearchParams(location.search);
  if (initial.get('simulation') === 'family' && initial.get('screen') === 'family-prepare') openSubmission();
  if (initial.get('simulation') === 'family' && initial.get('screen') === 'family-queue-detail') {
    const task = familyQueueTasks.find(item => item.id === initial.get('queueTask'));
    if (task) openQueuedTask(task);
  }
})();
