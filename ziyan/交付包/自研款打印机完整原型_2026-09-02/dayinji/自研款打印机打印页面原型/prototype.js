const taskPanel = document.querySelector('#task-panel');
const taskState = document.querySelector('#task-state');
const taskCopy = document.querySelector('.task-copy');
const progressState = document.querySelector('#progress-state');
const remainingTime = document.querySelector('#remaining-time');
const taskPercent = document.querySelector('#task-percent');
const taskProgress = document.querySelector('#task-progress');
const progressFill = taskProgress.querySelector('span');
const preparationProgress = document.querySelector('#preparation-progress');
const preparationLabel = document.querySelector('#preparation-label');
const preparationPercent = document.querySelector('#preparation-percent');
const finishButton = document.querySelector('#finish-now');
const pauseButton = document.querySelector('#pause-print');
const cancelButton = document.querySelector('#cancel-print');
const taskActions = document.querySelector('#task-actions');
const completionActions = document.querySelector('#completion-actions');
const restartPrintButton = document.querySelector('#restart-print');
const nextPlateButton = document.querySelector('#next-plate');
const localFileButton = document.querySelector('#local-file');
const queueToggle = document.querySelector('#queue-toggle');
const printQueue = document.querySelector('#print-queue');
const devicePage = document.querySelector('#device-page');
const filamentSheet = document.querySelector('#filament-sheet');
const sheetSlots = document.querySelector('.sheet-slots');
const filamentOperationScreen = document.querySelector('#filament-operation-screen');
const filamentOperationImage = document.querySelector('#filament-operation-image');
const filamentPointer = document.querySelector('#filament-pointer');
const closeFilamentOperationButton = document.querySelector('#close-filament-operation');
const cancelFilamentOperationButton = document.querySelector('#cancel-filament-operation');
const carousel = document.querySelector('#control-carousel');
const carouselDots = [...document.querySelectorAll('.carousel-dots span')];
const referenceScreen = document.querySelector('#reference-screen');
const referenceImage = document.querySelector('#reference-image');
const referenceTitle = document.querySelector('#reference-title');
const toast = document.querySelector('#toast');
const dialog = document.querySelector('#action-dialog');
const dialogTitle = document.querySelector('#dialog-title');
const dialogCopy = document.querySelector('#dialog-copy');
const dialogConfirm = document.querySelector('#dialog-confirm');
const activeTaskImage = document.querySelector('#active-task-image');
const taskTitle = document.querySelector('#task-title');
const taskMeta = document.querySelector('.task-meta');
const queueTaskButtons = [...document.querySelectorAll('[data-queue-task]')];

const params = new URLSearchParams(window.location.search);
const plateIds = ['1', '2', '3'];
const activePlate = plateIds.includes(params.get('plate')) ? params.get('plate') : '1';
const completedPlates = new Set((params.get('completed') || '').split(',').filter((plate) => plateIds.includes(plate)));
const v2PrintJourneyPath = '../../dayinlvchengv2/打印旅程原型/index.html';
const printJourneyPath = params.get('source') === 'journey-v2'
  ? v2PrintJourneyPath
  : '../../dayinlvcheng/打印旅程原型/index.html';
const plateCatalog = {
  1: { taskAsset: '选中要打印的盘1.jpg', queueAsset: '打印队列1.jpg', title: '史蒂夫_01_012214', duration: '5 h 15 min', grams: 62, seconds: 5 * 60 * 60 + 15 * 60 },
  2: { taskAsset: '选择要打印的盘2（修改）.jpg', queueAsset: '打印队列2.jpg', title: '史蒂夫_02_012209', duration: '3 h 48 min', grams: 50, seconds: 3 * 60 * 60 + 48 * 60 },
  3: { taskAsset: '选择要打印的盘3.jpg', queueAsset: '打印队列3.jpg', title: '史蒂夫_03_012207', duration: '1 h 35 min', grams: 20, seconds: 1 * 60 * 60 + 35 * 60 }
};
const activeTask = plateCatalog[activePlate];
const queuePlateIds = Object.keys(plateCatalog).filter((plate) => plate !== activePlate && !completedPlates.has(plate));
const TOTAL_SECONDS = activeTask.seconds;
const PREPARATION_DURATION_SECONDS = 30;
const PREPARATION_STAGES = [
  { label: '正在分析模型', startsAt: 0 },
  { label: '校准中', startsAt: 10 },
  { label: '擦嘴中', startsAt: 14 },
  { label: '归零中', startsAt: 18 },
  { label: '调平中', startsAt: 22 },
  { label: '升温中', startsAt: 26 }
];
const ANALYSIS_PROGRESS_STEPS = [0, 6, 14, 27, 39, 53, 68, 82, 93, 100];
let secondsRemaining = TOTAL_SECONDS;
let preparationElapsedSeconds = 0;
let currentStatus = 'preparing';
let currentFilamentOperation = null;
let pendingAction = null;
let toastTimer;

function renderPlateTaskAndQueue() {
  activeTaskImage.src = `../../src/dayinji/${activeTask.taskAsset}`;
  activeTaskImage.alt = `正在打印的${activeTask.title}模型`;
  taskTitle.textContent = activeTask.title;
  taskMeta.textContent = `${activeTask.duration} · PLA · ${activeTask.grams} g`;

  queueTaskButtons.forEach((button, index) => {
    const plate = queuePlateIds[index];
    button.hidden = !plate;
    if (!plate) {
      button.removeAttribute('data-plate');
      button.removeAttribute('aria-label');
      const image = button.querySelector('img');
      image.removeAttribute('src');
      image.alt = '';
      return;
    }
    const queueTask = plateCatalog[plate];
    const image = button.querySelector('img');
    button.dataset.plate = plate;
    button.setAttribute('aria-label', `打开盘 ${plate} 打印设置`);
    image.src = `../../src/dayinji/${queueTask.queueAsset}`;
    image.alt = `盘 ${plate}，${queueTask.title}，等待打印`;
  });
  queueToggle.querySelector('small').textContent = `${queuePlateIds.length} 个待打印任务`;
  queueToggle.hidden = queuePlateIds.length === 0;
  if (queuePlateIds.length === 0) printQueue.hidden = true;
}

function formatTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

function calculateProgress() {
  return Math.min(100, Math.max(0, Math.round((1 - secondsRemaining / TOTAL_SECONDS) * 100)));
}

function renderProgress() {
  const progress = currentStatus === 'completed' ? 100 : calculateProgress();
  remainingTime.textContent = formatTime(secondsRemaining);
  taskPercent.textContent = `${progress}%`;
  taskProgress.setAttribute('aria-valuenow', String(progress));
  progressFill.style.width = `${progress}%`;
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('is-visible');
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 1800);
}

function renderPreparation() {
  const stage = [...PREPARATION_STAGES].reverse().find(({ startsAt }) => preparationElapsedSeconds >= startsAt);
  const isAnalyzing = stage === PREPARATION_STAGES[0];
  preparationLabel.textContent = stage.label;
  preparationPercent.hidden = !isAnalyzing;
  if (isAnalyzing) preparationPercent.textContent = `${ANALYSIS_PROGRESS_STEPS[preparationElapsedSeconds]}%`;
}

function advancePreparation() {
  if (currentStatus !== 'preparing') return;
  preparationElapsedSeconds = Math.min(PREPARATION_DURATION_SECONDS, preparationElapsedSeconds + 1);
  if (preparationElapsedSeconds === PREPARATION_DURATION_SECONDS) {
    setTaskStatus('printing');
    return;
  }
  renderPreparation();
}

function setTaskStatus(status) {
  if (status === 'completed') completedPlates.add(activePlate);
  currentStatus = status;
  taskPanel.dataset.status = status;
  const labels = { preparing: '准备中', printing: '打印中', paused: '已暂停', cancelled: '已取消打印任务', completed: '打印完成' };
  taskState.textContent = labels[status];
  progressState.textContent = status === 'preparing' ? '准备打印' : (status === 'printing' ? '剩余时间' : labels[status]);

  const isPreparing = status === 'preparing';
  const isRunning = status === 'printing';
  const isPaused = status === 'paused';
  const isCancelled = status === 'cancelled';
  const isTerminal = status === 'cancelled' || status === 'completed';
  taskCopy.hidden = isCancelled;
  preparationProgress.hidden = !isPreparing || isCancelled;
  taskPercent.hidden = isPreparing || isCancelled;
  remainingTime.hidden = isPreparing || isCancelled;
  taskProgress.hidden = isPreparing || isCancelled;
  finishButton.hidden = isPreparing || isCancelled;
  pauseButton.hidden = isPreparing || isCancelled;
  pauseButton.dataset.paused = String(isPaused);
  pauseButton.querySelector('span:last-child').textContent = isPaused ? '继续' : '暂停';
  pauseButton.disabled = isTerminal;
  cancelButton.disabled = isTerminal;
  finishButton.disabled = isTerminal;
  taskActions.hidden = status === 'completed' || isCancelled;
  completionActions.hidden = status !== 'completed';
  const allCompleted = completedPlates.size === plateIds.length;
  nextPlateButton.hidden = status === 'completed' && allCompleted;
  localFileButton.hidden = status !== 'completed' || !allCompleted;
  completionActions.classList.remove('is-single');
  queueToggle.hidden = isPreparing || isCancelled || queuePlateIds.length === 0;
  if (queueToggle.hidden) {
    queueToggle.setAttribute('aria-expanded', 'false');
    printQueue.hidden = true;
  }

  if (status === 'completed') secondsRemaining = 0;
  if (isPreparing) renderPreparation();
  else if (isRunning || isPaused || status === 'completed') renderProgress();
}

function tick() {
  if (currentStatus === 'preparing') {
    advancePreparation();
    return;
  }
  if (currentStatus !== 'printing') return;
  secondsRemaining = Math.max(0, secondsRemaining - 1);
  if (secondsRemaining === 0) setTaskStatus('completed');
  else renderProgress();
}

setInterval(tick, 1000);

function openDialog({ title, copy, confirmText = '确认', action = null, destructive = false }) {
  dialogTitle.textContent = title;
  dialogCopy.textContent = copy;
  dialogConfirm.textContent = confirmText;
  dialogConfirm.style.background = destructive ? 'var(--danger)' : 'var(--blue)';
  pendingAction = action;
  dialog.showModal();
}

function openReference(fileName, title) {
  referenceImage.src = `../../src/dayinji/${fileName}`;
  referenceImage.alt = `${title}页面参考图`;
  referenceTitle.textContent = title;
  referenceScreen.hidden = false;
  devicePage.inert = true;
  referenceScreen.scrollTop = 0;
  document.querySelector('#reference-back').focus();
}

function openPrintSettings() {
  const query = new URLSearchParams({
    view: 'settings',
    plate: activePlate,
    status: currentStatus === 'completed' ? 'completed' : 'printing',
    return: 'printer'
  });
  if (completedPlates.size > 0) query.set('completed', [...completedPlates].sort().join(','));
  const targetPath = currentStatus === 'completed' ? v2PrintJourneyPath : printJourneyPath;
  window.location.href = `${targetPath}?${query}`;
}

function openQueueTaskSettings(queuePlate) {
  if (!queuePlateIds.includes(queuePlate)) return;
  const query = new URLSearchParams({
    view: 'settings',
    step: 'material',
    entry: 'queue',
    plate: activePlate,
    selected: queuePlate,
    status: currentStatus === 'completed' ? 'completed' : 'printing',
    return: 'printer'
  });
  if (completedPlates.size > 0) query.set('completed', [...completedPlates].sort().join(','));
  window.location.href = `${v2PrintJourneyPath}?${query}`;
}

function openNextPlateSettings() {
  openPrintSettings();
}

function restartPrint() {
  completedPlates.delete(activePlate);
  secondsRemaining = TOTAL_SECONDS;
  setTaskStatus('printing');
  showToast('已重新开始打印');
}

queueToggle.addEventListener('click', () => {
  const expanded = queueToggle.getAttribute('aria-expanded') === 'true';
  queueToggle.setAttribute('aria-expanded', String(!expanded));
  printQueue.hidden = expanded;
});

pauseButton.addEventListener('click', () => {
  if (currentStatus === 'printing') {
    setTaskStatus('paused');
    showToast('打印任务已暂停，倒计时停止');
  } else if (currentStatus === 'paused') {
    setTaskStatus('printing');
    showToast('打印任务已继续');
  }
});

cancelButton.addEventListener('click', () => {
  const isPreparing = currentStatus === 'preparing';
  openDialog({
    title: isPreparing ? '当前打印机正在准备，是否需要取消？' : '取消打印任务？',
    copy: isPreparing ? '' : '取消后当前打印将停止，已完成的进度无法恢复。',
    confirmText: '取消任务',
    action: 'cancel-print',
    destructive: true
  });
});

finishButton.addEventListener('click', () => {
  setTaskStatus('completed');
  showToast('已进入打印完成状态');
});

document.querySelectorAll('[data-queue-task]').forEach((task) => task.addEventListener('click', () => openQueueTaskSettings(task.dataset.plate)));
nextPlateButton.addEventListener('click', openNextPlateSettings);
restartPrintButton.addEventListener('click', restartPrint);
localFileButton.addEventListener('click', () => showToast('已打开本地文件'));
document.querySelector('#reference-back').addEventListener('click', () => {
  referenceScreen.hidden = true;
  devicePage.inert = false;
  queueToggle.focus();
});

document.querySelector('#printer-switch').addEventListener('click', () => {
  openDialog({ title: '切换或添加打印机', copy: '当前设备为 UG-07。你可以在设备列表中切换打印机，或添加一台新打印机。', confirmText: '添加打印机' });
});
document.querySelector('#printer-settings').addEventListener('click', () => showToast('已进入打印机设备设置'));
document.querySelector('#control-settings').addEventListener('click', () => showToast('已打开设备控制设置'));

function selectMaterialSlot(index) {
  const selectedIndex = String(index);
  const pointerPositions = { rack: '15.3%', 1: '35.6%', 2: '52.1%', 3: '68.6%', 4: '85.1%' };
  filamentPointer.dataset.slotIndex = selectedIndex;
  filamentPointer.style.setProperty('--pointer-x', pointerPositions[selectedIndex]);
  document.querySelectorAll('.material-slot').forEach((slot) => {
    const selected = (slot.dataset.slotIndex ?? slot.querySelector('.slot-index')?.textContent) === selectedIndex;
    slot.classList.toggle('is-selected', selected);
    slot.setAttribute('aria-pressed', String(selected));
    const label = slot.getAttribute('aria-label')?.replace(/，已选择$/, '') ?? '';
    slot.setAttribute('aria-label', `${label}${selected ? '，已选择' : ''}`);
  });
}

document.querySelectorAll('.material-slots .material-slot').forEach((slot) => {
  slot.dataset.slotIndex ||= slot.querySelector('.slot-index').textContent;
  slot.addEventListener('click', () => selectMaterialSlot(slot.dataset.slotIndex));
});

document.querySelector('#filament-settings').addEventListener('click', () => {
  sheetSlots.replaceChildren(...[...document.querySelectorAll('.material-slots .material-slot')].map((slot) => {
    const clone = slot.cloneNode(true);
    clone.dataset.slotIndex = slot.dataset.slotIndex;
    clone.addEventListener('click', () => selectMaterialSlot(clone.dataset.slotIndex));
    return clone;
  }));
  filamentSheet.showModal();
});
document.querySelector('#close-filament-sheet').addEventListener('click', () => filamentSheet.close());

function openFilamentOperation(operation) {
  currentFilamentOperation = operation;
  filamentSheet.close();
  const isFeed = operation === 'feed';
  filamentOperationImage.src = `../../src/dayinji/${isFeed ? '进料中.jpg' : '退料中.jpg'}`;
  filamentOperationImage.alt = `${isFeed ? '进料中' : '退料中'}操作步骤页面`;
  filamentOperationScreen.dataset.operation = operation;
  filamentOperationScreen.setAttribute('aria-label', isFeed ? '进料中' : '退料中');
  closeFilamentOperationButton.setAttribute('aria-label', `关闭${isFeed ? '进料' : '退料'}`);
  cancelFilamentOperationButton.setAttribute('aria-label', `取消${isFeed ? '进料' : '退料'}`);
  filamentOperationScreen.hidden = false;
  devicePage.inert = true;
  document.body.classList.add('operation-open');
  filamentOperationScreen.scrollTop = 0;
  filamentOperationScreen.focus({ preventScroll: true });
}

function cancelFilamentOperation() {
  const cancelledOperation = currentFilamentOperation;
  filamentOperationScreen.hidden = true;
  devicePage.inert = false;
  document.body.classList.remove('operation-open');
  currentFilamentOperation = null;
  showToast(`已取消${cancelledOperation === 'feed' ? '进料' : '退料'}`);
  document.querySelector('#filament-settings').focus();
}

document.querySelector('#feed-filament').addEventListener('click', () => openFilamentOperation('feed'));
document.querySelector('#retract-filament').addEventListener('click', () => openFilamentOperation('retract'));
closeFilamentOperationButton.addEventListener('click', cancelFilamentOperation);
cancelFilamentOperationButton.addEventListener('click', cancelFilamentOperation);

document.querySelectorAll('.switch').forEach((switchButton) => {
  switchButton.addEventListener('click', () => {
    const isOn = switchButton.classList.toggle('is-on');
    const controlName = switchButton.closest('.control-item').querySelector('strong').textContent;
    switchButton.setAttribute('aria-pressed', String(isOn));
    switchButton.setAttribute('aria-label', `${isOn ? '关闭' : '开启'}${controlName}`);
    showToast(`${controlName}已${isOn ? '开启' : '关闭'}`);
  });
});

function updateCarouselDots() {
  const activePage = carousel.scrollLeft > 54 ? 1 : 0;
  carouselDots.forEach((dot, index) => dot.classList.toggle('is-active', index === activePage));
}
carousel.addEventListener('scroll', updateCarouselDots, { passive: true });

let dragStartX = 0;
let dragStartScroll = 0;
let isDragging = false;
carousel.addEventListener('pointerdown', (event) => {
  isDragging = true;
  dragStartX = event.clientX;
  dragStartScroll = carousel.scrollLeft;
  carousel.setPointerCapture(event.pointerId);
});
carousel.addEventListener('pointermove', (event) => {
  if (isDragging) carousel.scrollLeft = dragStartScroll - (event.clientX - dragStartX);
});
carousel.addEventListener('pointerup', (event) => {
  if (!isDragging) return;
  isDragging = false;
  carousel.releasePointerCapture(event.pointerId);
  const target = carousel.scrollLeft > 54 ? carousel.scrollWidth - carousel.clientWidth : 0;
  carousel.scrollTo({ left: target, behavior: 'smooth' });
});

dialog.addEventListener('close', () => {
  if (dialog.returnValue === 'confirm' && pendingAction === 'cancel-print') {
    setTaskStatus('cancelled');
  } else if (dialog.returnValue === 'confirm' && dialogTitle.textContent === '切换或添加打印机') {
    showToast('已进入添加打印机流程');
  }
  pendingAction = null;
});

renderPlateTaskAndQueue();
renderProgress();
if (params.get('status') === 'completed') setTaskStatus('completed');
else if (params.get('status') === 'printing') setTaskStatus('printing');
else setTaskStatus('preparing');
