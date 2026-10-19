const modelScreen = document.querySelector('#screen-model');
const settingsScreen = document.querySelector('#screen-settings');
const settingsTitle = document.querySelector('#settings-title');
const printingNotice = document.querySelector('#printing-notice');
const plateStep = document.querySelector('#step-plate');
const materialStep = document.querySelector('#step-material');
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
const status = params.get('status') || 'idle';
const returnTarget = params.get('return');
const plateIds = ['1', '2', '3'];
const jobPlate = plateIds.includes(params.get('plate')) ? params.get('plate') : '1';
const selectedPlateParam = plateIds.includes(params.get('selected')) ? params.get('selected') : jobPlate;
const queueTaskEntry = params.get('entry') === 'queue' && returnTarget === 'printer' && plateIds.includes(params.get('selected'));
const initialSettingsStep = queueTaskEntry && params.get('step') === 'material' ? 'material' : 'plate';
const completedPlates = new Set((params.get('completed') || '').split(',').filter((plate) => plateIds.includes(plate)));
if (status === 'completed') completedPlates.add(jobPlate);
const MATERIAL_SETTINGS_KEY = 'ziyan-v2-builder-material-settings';
/* 从「可打印状态」版打印页进来时带回 printerVariant=ready，返回/开始打印要回到同一版本 */
const printerPagePath = params.get('printerVariant') === 'ready'
  ? '../../dayinji/自研款打印机打印页面原型_可打印状态/index.html'
  : '../../dayinji/自研款打印机打印页面原型/index.html';
const isPrintingConfiguration = status === 'printing' && returnTarget === 'printer';
const isFamilyQueue = params.get('family') === 'multi';
const isCompletedQueueConfiguration = queueTaskEntry && status === 'completed';
const activeGirlTaskId = ['girl-1', 'girl-2'].includes(params.get('activeTask')) ? params.get('activeTask') : null;
const filamentCatalog = {
  1: { slot: '1', color: 'black', label: 'PLA · 黑色' },
  2: { slot: '2', color: 'gray', label: 'PLA · 灰色' },
  4: { slot: '4', color: 'blue', label: 'PLA · 蓝色' }
};
const plateAssets = {
  1: '../../src/dayinji/选中要打印的盘1.jpg',
  2: '../../src/dayinji/选择要打印的盘2（修改）.jpg',
  3: '../../src/dayinji/选择要打印的盘3.jpg'
};

let selectedPlate = selectedPlateParam;
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
  if (showMaterial) loadMaterialSettings(selectedPlate);
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
  const activeStatus = status === 'printing' || status === 'completed' ? status : 'idle';
  settingsScreen.dataset.jobStatus = activeStatus;
  printingNotice.hidden = status !== 'printing';
  document.querySelectorAll('[data-plate]').forEach((card) => {
    const isPrinting = status === 'printing' && card.dataset.plate === jobPlate;
    const isCompleted = completedPlates.has(card.dataset.plate);
    card.classList.toggle('is-printing', isPrinting);
    card.classList.toggle('is-completed', isCompleted);
    card.classList.toggle('has-job-status', isPrinting || isCompleted);
    card.setAttribute('aria-disabled', String(isCompleted));
    card.querySelector('.plate-status-tag').textContent = isPrinting ? '正在打印' : (isCompleted ? '已打印' : '');
  });
}

function appendCompletedState(query) {
  if (completedPlates.size > 0) query.set('completed', [...completedPlates].sort().join(','));
}

function renderBuilderAction() {
  const selectedIsCompleted = completedPlates.has(selectedPlate);
  chooseColorButton.disabled = selectedIsCompleted;
  chooseColorButton.setAttribute('aria-disabled', String(selectedIsCompleted));
}

function selectPlate(plate) {
  selectedPlate = String(plate);
  let selectedCard;
  document.querySelectorAll('[data-plate]').forEach((card) => {
    const selected = card.dataset.plate === selectedPlate;
    card.classList.toggle('is-selected', selected);
    card.setAttribute('aria-selected', String(selected));
    if (selected) selectedCard = card;
  });
  selectedModelImage.src = plateAssets[selectedPlate];
  selectedModelImage.alt = `当前选择盘 ${selectedPlate} 的模型`;
  renderBuilderAction();
  if (!settingsScreen.hidden && !plateStep.hidden) selectedCard?.scrollIntoView({ block: 'center' });
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
  settings[selectedPlate] = { source, slot: selectedFilament.slot };
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

function loadMaterialSettings(plate) {
  const stored = readMaterialSettings()[plate];
  const slot = filamentCatalog[stored?.slot] ? stored.slot : '4';
  const source = ['cfs', 'external'].includes(stored?.source) ? stored.source : 'cfs';
  const option = document.querySelector(`[data-filament-slot="${slot}"]`);
  selectFilament(option);
  renderMaterialSource(source);
}

document.querySelector('#print-now').addEventListener('click', () => showScreen('settings'));
document.querySelector('#model-settings').addEventListener('click', () => showScreen('settings'));

function returnToPrinter() {
  const printerQuery = new URLSearchParams({ plate: jobPlate, source: 'journey-v2' });
  if (status === 'printing' || status === 'completed') printerQuery.set('status', status);
  if (isFamilyQueue) printerQuery.set('family', 'multi');
  if (activeGirlTaskId) printerQuery.set('activeTask', activeGirlTaskId);
  appendCompletedState(printerQuery);
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

document.querySelectorAll('[data-plate]').forEach((card) => {
  card.addEventListener('click', () => {
    if (completedPlates.has(card.dataset.plate)) {
      showToast('该盘已打印，请选择未打印的盘');
      return;
    }
    selectPlate(card.dataset.plate);
  });
});

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
    const query = new URLSearchParams({ plate: selectedPlate, copies: '1', source: 'journey-v2', status: completedPlates.size > 0 ? 'printing' : 'preparing' });
    if (isFamilyQueue) query.set('family', 'multi');
    if (activeGirlTaskId) query.set('activeTask', activeGirlTaskId);
    appendCompletedState(query);
    window.location.href = `${printerPagePath}?${query}`;
  }, 2000);
});

renderFilamentChoice();
startPrintButton.textContent = isCompletedQueueConfiguration ? 'Create it' : 'Start Creating';
startPrintButton.disabled = isPrintingConfiguration;
startPrintButton.setAttribute('aria-disabled', String(isPrintingConfiguration));
renderJobStatus();
showScreen(params.get('view') === 'settings' ? 'settings' : 'model', initialSettingsStep);
selectPlate(selectedPlate);
