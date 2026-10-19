const modelScreen = document.querySelector('#screen-model');
const settingsScreen = document.querySelector('#screen-settings');
const settingsTitle = document.querySelector('#settings-title');
const printingNotice = document.querySelector('#printing-notice');
const plateCarousel = document.querySelector('#plate-carousel');
const selectedModelImage = document.querySelector('#selected-model-image');
const filamentPicker = document.querySelector('#filament-picker');
const filamentChoice = document.querySelector('#open-filament-picker');
const filamentSlotNumber = document.querySelector('#filament-slot-number');
const filamentLabel = document.querySelector('#filament-label');
const filamentSwatch = document.querySelector('#filament-swatch');
const copyCountOutput = document.querySelector('#copy-count');
const uploadDialog = document.querySelector('#upload-dialog');
const uploadProgress = document.querySelector('#upload-progress');
const uploadProgressFill = uploadProgress.querySelector('span');
const uploadPercent = document.querySelector('#upload-percent');
const toast = document.querySelector('#toast');

const params = new URLSearchParams(window.location.search);
const status = params.get('status') || 'idle';
const returnTarget = params.get('return');
/* 从「可打印状态」版打印页进来时带回 printerVariant=ready，返回/开始打印要回到同一版本 */
const printerPagePath = params.get('printerVariant') === 'ready'
  ? '../../dayinji/自研款打印机打印页面原型_可打印状态/index.html'
  : '../../dayinji/自研款打印机打印页面原型/index.html';
const jobPlate = ['1', '2', '3'].includes(params.get('plate')) ? params.get('plate') : '1';
const plateAssets = {
  1: '../../src/dayinji/选中要打印的盘1.jpg',
  2: '../../src/dayinji/选择要打印的盘2（修改）.jpg',
  3: '../../src/dayinji/选择要打印的盘3.jpg'
};

let selectedPlate = jobPlate;
let selectedFilament = { slot: '4', color: 'blue', label: 'PLA · 蓝色' };
let copyCount = 1;
let toastTimer;
let uploadInterval;

function showScreen(name) {
  const showSettings = name === 'settings';
  modelScreen.hidden = showSettings;
  modelScreen.classList.toggle('is-active', !showSettings);
  settingsScreen.hidden = !showSettings;
  settingsScreen.classList.toggle('is-active', showSettings);
  if (showSettings) {
    settingsScreen.scrollTop = 0;
    window.setTimeout(() => settingsTitle.focus({ preventScroll: true }), 0);
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
    const ownsJob = activeStatus !== 'idle' && card.dataset.plate === jobPlate;
    card.classList.toggle('has-job-status', ownsJob);
    card.querySelector('.plate-status-tag').textContent = ownsJob ? (status === 'printing' ? '正在打印' : '已打印') : '';
  });
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
  if (!settingsScreen.hidden) selectedCard?.scrollIntoView({ block: 'nearest', inline: 'center' });
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

document.querySelector('#print-now').addEventListener('click', () => showScreen('settings'));
document.querySelector('#settings-back').addEventListener('click', () => {
  if (returnTarget === 'printer') {
    const printerQuery = new URLSearchParams({ plate: selectedPlate });
    if (status === 'printing' || status === 'completed') printerQuery.set('status', status);
    window.location.href = `${printerPagePath}?${printerQuery}`;
  } else {
    showScreen('model');
    document.querySelector('#print-now').focus();
  }
});

document.querySelectorAll('[data-plate]').forEach((card) => {
  card.addEventListener('click', () => selectPlate(card.dataset.plate));
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
    document.querySelectorAll('.source-option').forEach((label) => label.classList.toggle('is-selected', label.contains(radio)));
    const external = radio.value === 'external';
    filamentChoice.disabled = external;
    if (external) {
      filamentSlotNumber.textContent = '料架';
      filamentLabel.textContent = 'PLA · 外挂料盘';
      filamentSwatch.className = 'filament-swatch is-external';
    } else {
      renderFilamentChoice();
    }
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
  filamentPicker.close();
  filamentChoice.focus();
});

function renderCopyCount() {
  copyCountOutput.value = String(copyCount);
  copyCountOutput.textContent = String(copyCount);
  document.querySelector('#copy-minus').disabled = copyCount === 1;
  document.querySelector('#copy-plus').disabled = copyCount === 9;
}

document.querySelector('#copy-minus').addEventListener('click', () => {
  copyCount = Math.max(1, copyCount - 1);
  renderCopyCount();
});
document.querySelector('#copy-plus').addEventListener('click', () => {
  copyCount = Math.min(9, copyCount + 1);
  renderCopyCount();
});

document.querySelectorAll('.option-control').forEach((button) => {
  button.addEventListener('click', () => {
    const selected = button.classList.toggle('is-selected');
    button.setAttribute('aria-pressed', String(selected));
  });
});

document.querySelector('#start-print').addEventListener('click', () => {
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
    const query = new URLSearchParams({ plate: selectedPlate, copies: String(copyCount), source: 'journey', status: 'preparing' });
    window.location.href = `${printerPagePath}?${query}`;
  }, 2000);
});

renderFilamentChoice();
renderCopyCount();
renderJobStatus();
showScreen(params.get('view') === 'settings' ? 'settings' : 'model');
selectPlate(selectedPlate);
