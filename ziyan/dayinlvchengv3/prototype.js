const modelScreen = document.querySelector('#screen-model');
const settingsScreen = document.querySelector('#screen-settings');
const settingsTitle = document.querySelector('#settings-title');
const printingNotice = document.querySelector('#printing-notice');
const plateStep = document.querySelector('#step-plate');
const materialStep = document.querySelector('#step-material');
const plateCarousel = document.querySelector('#plate-carousel');
const chooseColorButton = document.querySelector('#choose-color');
const selectedModelImage = document.querySelector('#selected-model-image');
const filamentPicker = document.querySelector('#filament-picker');
const filamentChoice = document.querySelector('#open-filament-picker');
const filamentSlotNumber = document.querySelector('#filament-slot-number');
const filamentLabel = document.querySelector('#filament-label');
const filamentSwatch = document.querySelector('#filament-swatch');
const uploadDialog = document.querySelector('#upload-dialog');
const uploadProgress = document.querySelector('#upload-progress');
const uploadProgressFill = uploadProgress.querySelector('span');
const uploadPercent = document.querySelector('#upload-percent');
const startPrintButton = document.querySelector('#start-print');
const toast = document.querySelector('#toast');

const params = new URLSearchParams(window.location.search);
const status = params.get('status') || 'printing';
const returnTarget = params.get('return');
const girlTaskIds = ['girl-1', 'girl-2'];
const activePlate = ['1', '2', '3'].includes(params.get('active')) ? params.get('active') : '1';
const selectedTaskParam = girlTaskIds.includes(params.get('task')) ? params.get('task') : 'girl-1';
const queueTaskEntry = params.get('entry') === 'queue' && returnTarget === 'printer' && girlTaskIds.includes(params.get('task'));
const initialSettingsStep = queueTaskEntry && params.get('step') === 'material' ? 'material' : 'plate';
const MATERIAL_SETTINGS_KEY = 'ziyan-v3-girl-material-settings';
/* 从「可打印状态」版打印页进来时带回 printerVariant=ready，返回/开始打印要回到同一版本 */
const printerPagePath = params.get('printerVariant') === 'ready'
  ? '../dayinji/自研款打印机打印页面原型_可打印状态/index.html'
  : '../dayinji/自研款打印机打印页面原型/index.html';
const isPrintingQueueConfiguration = queueTaskEntry && status === 'printing';
const isCompletedQueueConfiguration = queueTaskEntry && status === 'completed';
const activeGirlTaskId = girlTaskIds.includes(params.get('activeTask')) ? params.get('activeTask') : null;
const filamentCatalog = {
  1: { slot: '1', color: 'black', label: 'PLA · 黑色' },
  2: { slot: '2', color: 'gray', label: 'PLA · 灰色' },
  4: { slot: '4', color: 'blue', label: 'PLA · 蓝色' }
};
const girlTaskAssets = {
  'girl-1': '../src/dayinjirenwukongzhi/女孩的打印任务_1.jpg',
  'girl-2': '../src/dayinjirenwukongzhi/女孩的打印任务_2.jpg'
};

let selectedTask = selectedTaskParam;
let selectedFilament = { slot: '4', color: 'blue', label: 'PLA · 蓝色' };
let currentSettingsStep = 'plate';
let toastTimer;
let uploadInterval;

function showSettingsStep(step) {
  currentSettingsStep = step === 'material' ? 'material' : 'plate';
  const showMaterial = currentSettingsStep === 'material';
  plateStep.hidden = showMaterial;
  materialStep.hidden = !showMaterial;
  settingsTitle.textContent = showMaterial ? 'Choose  your  color' : 'Choose your builder';
  if (showMaterial) loadMaterialSettings(selectedTask);
  settingsScreen.scrollTop = 0;
  window.setTimeout(() => settingsTitle.focus({ preventScroll: true }), 0);
}

function showScreen(name, settingsStep = 'plate') {
  const showSettings = name === 'settings';
  modelScreen.hidden = showSettings;
  modelScreen.classList.toggle('is-active', !showSettings);
  settingsScreen.hidden = !showSettings;
  settingsScreen.classList.toggle('is-active', showSettings);
  if (showSettings) {
    showSettingsStep(settingsStep);
  }
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('is-visible');
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 1800);
}

function renderJobStatus() {
  const activeStatus = status === 'printing' ? 'printing' : 'idle';
  settingsScreen.dataset.jobStatus = activeStatus;
  printingNotice.hidden = status !== 'printing';
  document.querySelectorAll('[data-task]').forEach((card) => {
    card.classList.remove('is-printing', 'is-completed', 'has-job-status');
    card.setAttribute('aria-disabled', 'false');
    card.querySelector('.plate-status-tag').textContent = '';
  });
}

function renderBuilderAction() {
  chooseColorButton.disabled = false;
  chooseColorButton.setAttribute('aria-disabled', 'false');
}

function selectTask(task) {
  selectedTask = String(task);
  let selectedCard;
  document.querySelectorAll('[data-task]').forEach((card) => {
    const selected = card.dataset.task === selectedTask;
    card.classList.toggle('is-selected', selected);
    card.setAttribute('aria-selected', String(selected));
    if (selected) selectedCard = card;
  });
  selectedModelImage.src = girlTaskAssets[selectedTask];
  selectedModelImage.alt = `当前选择女孩的待打印任务 ${selectedTask.slice(-1)}`;
  renderBuilderAction();
  if (!settingsScreen.hidden && !plateStep.hidden) selectedCard?.scrollIntoView({ block: 'nearest', inline: 'center' });
}

function selectFilament(button) {
  if (button.disabled) return;
  document.querySelectorAll('[data-filament-slot]').forEach((option) => {
    const selected = option === button;
    option.classList.toggle('is-selected', selected);
    option.setAttribute('aria-checked', String(selected));
  });
  selectedFilament = {
    slot: button.dataset.filamentSlot,
    color: button.dataset.color,
    label: button.dataset.label
  };
}

function renderFilamentChoice() {
  filamentSlotNumber.textContent = selectedFilament.slot;
  filamentLabel.textContent = selectedFilament.label;
  filamentSwatch.className = `filament-swatch is-${selectedFilament.color}`;
}

function readMaterialSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(MATERIAL_SETTINGS_KEY) || '{}');
    return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
  } catch {
    return {};
  }
}

function saveMaterialSettings() {
  const source = document.querySelector('input[name="feed-source"]:checked')?.value;
  if (!['cfs', 'external'].includes(source) || !filamentCatalog[selectedFilament.slot]) return;
  const settings = readMaterialSettings();
  settings[selectedTask] = { source, slot: selectedFilament.slot };
  try {
    localStorage.setItem(MATERIAL_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    showToast('当前浏览器无法保存耗材设置');
  }
}

function renderMaterialSource(source) {
  const safeSource = source === 'external' ? 'external' : 'cfs';
  document.querySelectorAll('input[name="feed-source"]').forEach((radio) => {
    radio.checked = radio.value === safeSource;
    radio.closest('.source-option').classList.toggle('is-selected', radio.checked);
  });
  const external = safeSource === 'external';
  filamentChoice.disabled = external;
  if (external) {
    filamentSlotNumber.textContent = '料架';
    filamentLabel.textContent = 'PLA · 外挂料盘';
    filamentSwatch.className = 'filament-swatch is-external';
  } else {
    renderFilamentChoice();
  }
}

function loadMaterialSettings(task) {
  const stored = readMaterialSettings()[task];
  const slot = filamentCatalog[stored?.slot] ? stored.slot : '4';
  const source = ['cfs', 'external'].includes(stored?.source) ? stored.source : 'cfs';
  const option = document.querySelector(`[data-filament-slot="${slot}"]`);
  selectFilament(option);
  renderMaterialSource(source);
}

document.querySelector('#print-now').addEventListener('click', () => showScreen('settings'));
document.querySelector('#model-settings').addEventListener('click', () => showScreen('settings'));

function returnToPrinter() {
  const printerQuery = new URLSearchParams({ plate: activePlate, source: 'journey-v3', status: status === 'completed' ? 'completed' : 'printing', family: 'multi' });
  if (activeGirlTaskId) printerQuery.set('activeTask', activeGirlTaskId);
  if (params.get('completed')) printerQuery.set('completed', params.get('completed'));
  window.location.href = `${printerPagePath}?${printerQuery}`;
}

document.querySelector('#settings-back').addEventListener('click', () => {
  if (queueTaskEntry && currentSettingsStep === 'material') {
    returnToPrinter();
    return;
  }
  if (currentSettingsStep === 'material') {
    showSettingsStep('plate');
    return;
  }
  if (returnTarget === 'printer') {
    returnToPrinter();
  } else {
    showScreen('model');
    document.querySelector('#print-now').focus();
  }
});

chooseColorButton.addEventListener('click', () => showSettingsStep('material'));

document.querySelectorAll('[data-task]').forEach((card) => {
  card.addEventListener('click', () => {
    selectTask(card.dataset.task);
  });
});

let plateDragStartX = 0;
let plateDragStartScroll = 0;
let plateDragDistance = 0;
let plateDragging = false;
let plateDragActive = false;
let suppressPlateClick = false;

plateCarousel.addEventListener('pointerdown', (event) => {
  if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
  plateDragging = true;
  plateDragActive = false;
  plateDragStartX = event.clientX;
  plateDragStartScroll = plateCarousel.scrollLeft;
  plateDragDistance = 0;
});
plateCarousel.addEventListener('pointermove', (event) => {
  if (!plateDragging) return;
  plateDragDistance = event.clientX - plateDragStartX;
  if (!plateDragActive && Math.abs(plateDragDistance) <= 6) return;
  if (!plateDragActive) {
    plateDragActive = true;
    plateCarousel.classList.add('is-dragging');
    plateCarousel.setPointerCapture(event.pointerId);
  }
  event.preventDefault();
  plateCarousel.scrollLeft = plateDragStartScroll - plateDragDistance;
});
function finishPlateDrag(event) {
  if (!plateDragging) return;
  plateDragging = false;
  if (plateDragActive) {
    suppressPlateClick = true;
    window.setTimeout(() => { suppressPlateClick = false; }, 0);
  }
  plateDragActive = false;
  plateCarousel.classList.remove('is-dragging');
  if (plateCarousel.hasPointerCapture(event.pointerId)) plateCarousel.releasePointerCapture(event.pointerId);
}
plateCarousel.addEventListener('pointerup', finishPlateDrag);
plateCarousel.addEventListener('pointercancel', finishPlateDrag);
plateCarousel.addEventListener('click', (event) => {
  if (!suppressPlateClick) return;
  event.preventDefault();
  event.stopPropagation();
  suppressPlateClick = false;
}, true);

document.querySelector('#open-preview').addEventListener('click', () => showToast('已打开预览'));

document.querySelectorAll('input[name="feed-source"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    renderMaterialSource(radio.value);
    saveMaterialSettings();
  });
});

filamentChoice.addEventListener('click', () => {
  filamentPicker.showModal();
  document.querySelector('[data-filament-slot].is-selected')?.focus();
});
document.querySelector('#close-filament-picker').addEventListener('click', () => filamentPicker.close());
document.querySelectorAll('[data-filament-slot]').forEach((button) => button.addEventListener('click', () => selectFilament(button)));
document.querySelector('#confirm-filament').addEventListener('click', () => {
  renderFilamentChoice();
  saveMaterialSettings();
  filamentPicker.close();
  filamentChoice.focus();
});

startPrintButton.addEventListener('click', () => {
  if (startPrintButton.disabled) return;
  uploadDialog.showModal();
  const startedAt = performance.now();
  window.clearInterval(uploadInterval);
  uploadInterval = window.setInterval(() => {
    const progress = Math.min(99, Math.round((performance.now() - startedAt) / 20));
    uploadPercent.textContent = `${progress}%`;
    uploadProgress.setAttribute('aria-valuenow', String(progress));
    uploadProgressFill.style.width = `${progress}%`;
  }, 80);

  window.setTimeout(() => {
    window.clearInterval(uploadInterval);
    uploadPercent.textContent = '100%';
    uploadProgress.setAttribute('aria-valuenow', '100');
    uploadProgressFill.style.width = '100%';
    const query = new URLSearchParams({ plate: activePlate, copies: '1', source: 'journey-v3', status: 'printing', family: 'multi' });
    if (isCompletedQueueConfiguration) query.set('activeTask', selectedTask);
    else query.set('task', selectedTask);
    if (params.get('completed')) query.set('completed', params.get('completed'));
    window.location.href = `${printerPagePath}?${query}`;
  }, 2000);
});

renderFilamentChoice();
startPrintButton.textContent = queueTaskEntry ? 'Create it' : 'Add it';
startPrintButton.disabled = isPrintingQueueConfiguration;
startPrintButton.setAttribute('aria-disabled', String(isPrintingQueueConfiguration));
renderJobStatus();
showScreen(params.get('view') === 'settings' ? 'settings' : 'model', initialSettingsStep);
selectTask(selectedTask);
