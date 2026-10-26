/* 多账号提交：当前打印和旧队列继续运行，新增模型整批按排序追加。 */
(() => {
  reuseScreenNames.familyPrepare = '#family-prepare-screen';
  const screen = document.querySelector('#family-prepare-screen');
  const tasks = ['girl-1', 'girl-2'].map(id => taskCatalog[id]);
  let order = tasks.map(task => task.id);
  let selected = order[0];
  let readonly = false;
  let drag = null;
  let suppressClick = false;
  const $ = selector => screen.querySelector(selector);
  screen.innerHTML = `<div class="reuse-screen-frame"><div id="family-prepare-stage" class="reuse-stage prepare-page family-prepare-page" style="--reuse-ratio:311 / 675">
    ${document.querySelector('#prepare-stage .prepare-statusbar').outerHTML}
    <header class="prepare-header"><button id="family-prepare-back" class="prepare-back" type="button" aria-label="退出准备打印，返回工作台">←</button><h1>准备打印</h1></header>
    <div class="prepare-printer"><img src="assets/准备打印-打印机.png" alt="Ugee Funbox 打印机"><div><strong>Ugee Funbox</strong><span class="prepare-idle"><i aria-hidden="true"></i>忙碌</span></div><button id="family-switch-printer" class="prepare-switch" type="button">切换</button></div>
    <h2 class="prepare-section-title">选择要打印的盘（共 2 盘）</h2>
    <div id="family-plate-list" class="plate-list" role="listbox" aria-label="两盘模型及打印顺序" aria-describedby="family-prepare-summary"></div>
    <div class="prepare-options"><h2>打印选项</h2><div class="prepare-timelapse"><span>延时摄影</span><button id="family-timelapse-toggle" class="timelapse-check" type="button" role="checkbox" aria-checked="true" aria-label="延时摄影"><span class="timelapse-check-box" aria-hidden="true"></span></button></div></div>
    <p id="family-prepare-summary" class="family-prepare-summary"></p>
    <button id="family-submit" class="prepare-start" type="button">加入打印队列</button>
  </div></div>`;
  const rows = tasks.map((task, index) => {
    const row = document.querySelector('#prepare-plate-list .plate-row').cloneNode(true);
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
    hit.setAttribute('aria-label', `选择盘 ${index + 1} ${task.title}，方向键调整顺序`);
    hit.addEventListener('click', () => {
      if (suppressClick) { suppressClick = false; return; }
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
      row.dataset.slot = order.indexOf(row.dataset.plate);
      row.setAttribute('aria-selected', String(row.dataset.plate === selected));
      row.querySelector('.plate-row-hit').style.touchAction = readonly ? 'auto' : 'none';
    });
    $('#family-prepare-stage').dataset.readonly = String(readonly);
    $('#family-submit').disabled = readonly;
    $('#family-submit').textContent = readonly ? '开始打印' : '加入打印队列';
    $('#family-submit').setAttribute('aria-label', readonly ? '开始打印（已加入队列，等待按序打印）' : '将两盘模型加入打印队列');
    $('#family-timelapse-toggle').disabled = readonly;
    $('#family-switch-printer').disabled = readonly;
    $('#family-prepare-summary').textContent = readonly ? '任务已加入打印队列，按提交顺序等待打印。' : '本次提交 2 盘，将按上方排序加入打印队列。';
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
    if (isSinglePlateModel || !['preparing', 'printing', 'paused'].includes(currentStatus)) {
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
    rememberPage('family-prepare');
    render();
    openReuseScreen('familyPrepare');
  }
  function openQueuedTask(task) {
    readonly = true;
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
    if (readonly || tasks.some(task => familyQueueTasks.some(queued => queued.id === task.id) || taskResults.has(task.id) || task.id === activeTaskId)) return;
    familyQueueTasks.push(...order.map(id => taskCatalog[id]));
    rememberPage(null);
    renderPlateTaskAndQueue();
    queueToggle.hidden = false;
    queueToggle.setAttribute('aria-expanded', 'true');
    printQueue.hidden = false;
    closeReuseScreens();
    taskPanel.scrollIntoView({ block: 'start', behavior: 'instant' });
    showToast('已将 2 个打印任务加入打印队列');
  });
  window.__FAMILY_QUEUE = {
    openSubmission, openQueuedTask,
    owns: task => new URLSearchParams(location.search).get('simulation') === 'family' && task.owner === 'girl'
  };
  render();
  const initial = new URLSearchParams(location.search);
  if (initial.get('simulation') === 'family' && initial.get('screen') === 'family-prepare') openSubmission();
  if (initial.get('simulation') === 'family' && initial.get('screen') === 'family-queue-detail') {
    const task = familyQueueTasks.find(item => item.id === initial.get('queueTask'));
    if (task) openQueuedTask(task);
  }
})();
