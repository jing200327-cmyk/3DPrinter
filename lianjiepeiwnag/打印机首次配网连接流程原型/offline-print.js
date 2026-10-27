/* 可演示的无网打印支线。所有连接与传输均为本地模拟。 */
(() => {
  const $ = selector => document.querySelector(selector);
  const connecting = $('#offline-connecting');
  const timeout = $('#offline-timeout');
  const upload = $('#offline-upload');
  const tabs = [$('#offline-tab-ai'), $('#offline-tab-slices')];
  const thumbs = [
    '../../dayinji/自研款打印机打印页面原型/assets/延时摄影-模型1.png',
    '../../dayinji/自研款打印机打印页面原型/assets/延时摄影-模型2.png',
    '../../dayinji/自研款打印机打印页面原型/assets/延时摄影-模型3.png'
  ];
  const models = ['圆筒收纳盒', '拼装小盒', '桌面支架', '笔筒组合', '积木收纳盒', '多功能支架', '创意储物罐', '我的拼装盒', '桌面整理架'];
  const files = [
    { name: '桌面支架.gcode', size: 12.8 },
    { name: '圆筒收纳盒.GCODE', size: 8.6 },
    { name: '超大组合模型.gcode', size: 128 },
    { name: '小兔摆件.stl', size: 4.2 },
    { name: '创意积木.3mf', size: 6.8 },
    { name: '模型预览.png', size: 1.2 }
  ];
  let source = 'ai';
  let origin = 'start';
  let selectedFile = null;
  let connectionTimer;
  let successTimer;
  let uploadTimer;

  function navigate(name) {
    window.clearTimeout(toastTimer);
    toast.classList.remove('is-visible');
    showScreen(name);
  }

  function positionEntries() {
    document.querySelectorAll('.offline-start-entry').forEach(button => {
      const image = button.parentElement.querySelector('.full-reference');
      const rect = image.getBoundingClientRect();
      if (!rect.width) return;
      const scale = Math.max(rect.width / 686, rect.height / 1530);
      button.style.left = `${image.offsetLeft + rect.width / 2}px`;
      button.style.top = `${image.offsetTop + 1140 * scale}px`;
      button.style.height = `${Math.max(44, 65 * scale)}px`;
      button.style.fontSize = `${26 * scale}px`;
    });
  }

  function renderModels() {
    const ai = source === 'ai';
    tabs.forEach((tab, index) => {
      const selected = ai === (index === 0);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    $('#offline-model-panel').setAttribute('aria-labelledby', ai ? tabs[0].id : tabs[1].id);
    $('#offline-grid-title').textContent = ai ? '我的AI创作' : '我的切片';
    $('#offline-model-grid').replaceChildren(...models.map((name, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'offline-model';
      button.setAttribute('aria-label', `上传${ai ? '模型' : '切片'}：${name}`);
      const frame = document.createElement('span');
      frame.className = 'offline-model-image';
      const image = document.createElement('img');
      image.src = thumbs[index % thumbs.length];
      image.alt = `${name}模型缩略图`;
      frame.append(image);
      const title = document.createElement('span');
      title.className = 'offline-model-name';
      title.textContent = name;
      const meta = document.createElement('small');
      meta.textContent = ai ? `2026.10.${27 - index}` : `${(8.6 + index * 1.4).toFixed(1)} MB · gcode`;
      button.append(frame, title, meta);
      button.addEventListener('click', () => startUpload(ai ? `${name}.stl` : `${name}.gcode`, source, button));
      return button;
    }));
  }

  function selectSource(index, focus = false) {
    source = index === 0 ? 'ai' : 'slices';
    renderModels();
    if (focus) tabs[index].focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectSource(index));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      selectSource(event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index, true);
    });
  });

  function clearConnection() {
    window.clearTimeout(connectionTimer);
    connectionTimer = null;
  }
  function enterLibrary() {
    window.clearTimeout(successTimer);
    navigate('offline-library');
  }
  function finishConnection(result) {
    if (!connecting.open) return;
    clearConnection();
    connecting.close();
    if (result === 'timeout') {
      timeout.showModal();
      $('#offline-retry').focus();
      return;
    }
    navigate('offline-success');
    successTimer = window.setTimeout(enterLibrary, 1400);
  }
  function startConnection() {
    clearConnection();
    timeout.close();
    connecting.showModal();
    connectionTimer = window.setTimeout(() => finishConnection($('#offline-connect-result').value), 5000);
  }
  function cancelConnection() {
    clearConnection();
    connecting.close();
    $('#offline-connect').focus();
  }

  function renderFiles() {
    $('#offline-file-list').replaceChildren(...files.map((file, index) => {
      const gcode = /\.gcode$/i.test(file.name);
      const allowed = gcode && file.size <= 100;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'offline-file-row';
      button.dataset.offlineFile = String(index);
      button.setAttribute('aria-pressed', String(selectedFile === index));
      if (!allowed) button.setAttribute('aria-disabled', 'true');
      const icon = document.createElement('span');
      icon.className = 'offline-file-icon';
      icon.textContent = file.name.split('.').pop().toUpperCase();
      const info = document.createElement('span');
      info.className = 'offline-file-info';
      const name = document.createElement('strong');
      name.textContent = file.name;
      const detail = document.createElement('small');
      detail.textContent = `${file.size} MB · ${allowed ? '今天 10:26' : gcode ? '超过100MB' : '无网不支持'}`;
      info.append(name, detail);
      const check = document.createElement('span');
      check.className = 'offline-file-check';
      check.textContent = '✓';
      check.setAttribute('aria-hidden', 'true');
      button.append(icon, info, check);
      button.addEventListener('click', () => {
        if (!allowed) {
          showToast(gcode ? '文件超过100MB，请选择其他 gcode 文件' : '无网打印仅支持 gcode 文件');
          return;
        }
        selectedFile = selectedFile === index ? null : index;
        renderFiles();
        $(`[data-offline-file="${index}"]`).focus();
      });
      return button;
    }));
    $('#offline-print-local').disabled = selectedFile === null;
    $('#offline-print-local').textContent = selectedFile === null ? '打印' : '打印所选文件';
  }

  function startUpload(filename, kind, trigger) {
    if (upload.open) return;
    $('#offline-upload-copy').textContent = kind === 'ai' ? '正在将模型上传云端完成切片' : '正在将切片文件传给打印机';
    $('#offline-upload-filename').textContent = filename;
    const progress = $('#offline-upload-progress');
    const percent = $('#offline-upload-percent');
    progress.value = 0;
    percent.textContent = '0%';
    upload.showModal();
    const started = Date.now();
    uploadTimer = window.setInterval(() => {
      const value = Math.min(100, Math.floor((Date.now() - started) / 35));
      progress.value = value;
      percent.textContent = `${value}%`;
      if (value !== 100) return;
      window.clearInterval(uploadTimer);
      upload.close();
      if (kind === 'local') enterLibrary();
      else trigger.focus({ preventScroll: true });
      showToast('上传成功，打印机准备开始打印');
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 3200);
    }, 100);
  }

  document.querySelectorAll('.offline-start-entry').forEach(button => {
    button.addEventListener('click', () => {
      origin = button.parentElement.dataset.screen;
      navigate('offline-guide');
    });
    button.parentElement.querySelector('img').addEventListener('load', positionEntries);
  });
  $('#offline-guide-back').addEventListener('click', () => navigate(origin));
  $('#offline-connect').addEventListener('click', startConnection);
  $('#offline-retry').addEventListener('click', startConnection);
  $('#offline-demo-success').addEventListener('click', () => finishConnection('success'));
  $('#offline-demo-timeout').addEventListener('click', () => finishConnection('timeout'));
  $('#offline-cancel-connect').addEventListener('click', cancelConnection);
  connecting.addEventListener('cancel', event => { event.preventDefault(); cancelConnection(); });
  $('#offline-timeout-back').addEventListener('click', () => timeout.close());
  $('#offline-enter-library').addEventListener('click', enterLibrary);
  $('#offline-library-back').addEventListener('click', () => navigate('offline-guide'));
  $('#offline-import-local').addEventListener('click', () => { selectedFile = null; renderFiles(); navigate('offline-files'); });
  $('#offline-files-back').addEventListener('click', enterLibrary);
  $('#offline-print-local').addEventListener('click', () => {
    if (selectedFile !== null) startUpload(files[selectedFile].name, 'local');
  });
  upload.addEventListener('cancel', event => event.preventDefault());
  document.addEventListener('prototype:screenchange', positionEntries);
  window.addEventListener('resize', positionEntries);
  renderModels();
  renderFiles();
  positionEntries();
})();
