const taskPanel = document.querySelector('#task-panel');
const cameraMonitor = document.querySelector('#timelapse-placeholder');
const cameraMonitorImage = document.querySelector('#camera-monitor-image');
const cameraToggleButton = document.querySelector('#camera-toggle');
const printerConnectionState = document.querySelector('#printer-connection-state');
const printerConnectionStateImage = document.querySelector('#printer-connection-state-image');
const printerConnectionStateLabel = document.querySelector('#printer-connection-state-label');
const taskState = document.querySelector('#task-state');
const taskSummary = document.querySelector('.task-summary');
const taskCopy = document.querySelector('.task-copy');
const taskNavigation = document.querySelector('#task-navigation');
const startQueuedPrintButton = document.querySelector('#start-queued-print');
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
const nextPlateLabel = document.querySelector('#next-plate-label');
const localFileButton = document.querySelector('#local-file');
const queueToggle = document.querySelector('#queue-toggle');
const printQueue = document.querySelector('#print-queue');
const devicePage = document.querySelector('#device-page');
const filamentOperationScreen = document.querySelector('#filament-operation-screen');
const filamentOperationImage = document.querySelector('#filament-operation-image');
const filamentPointer = document.querySelector('#filament-pointer');
const loadFilamentButton = document.querySelector('#load-filament');
const unloadFilamentButton = document.querySelector('#unload-filament');
const closeFilamentOperationButton = document.querySelector('#close-filament-operation');
const cancelFilamentOperationButton = document.querySelector('#cancel-filament-operation');
const carousel = document.querySelector('#control-carousel');
const carouselDots = [...document.querySelectorAll('.carousel-dots span')];
const referenceScreen = document.querySelector('#reference-screen');
const referenceImage = document.querySelector('#reference-image');
const referenceTitle = document.querySelector('#reference-title');
const exploreJourneyHotspot = document.querySelector('#explore-journey-hotspot');
const toast = document.querySelector('#toast');
const dialog = document.querySelector('#action-dialog');
const dialogTitle = document.querySelector('#dialog-title');
const dialogCopy = document.querySelector('#dialog-copy');
const dialogConfirm = document.querySelector('#dialog-confirm');
const activeTaskImage = document.querySelector('#active-task-image');
const activeTaskOwnerCard = document.querySelector('#active-task-owner-card');
const activeTaskOwnerAvatar = document.querySelector('#active-task-owner-avatar');
const taskTitle = document.querySelector('#task-title');
const taskMeta = document.querySelector('.task-meta');
const queueTaskButtons = [...document.querySelectorAll('[data-queue-task]')];

const params = new URLSearchParams(window.location.search);
const connectionStatusOverride = params.get('connection') === 'offline' ? 'offline' : null;
const plateIds = ['1', '2', '3'];
const activePlate = plateIds.includes(params.get('plate')) ? params.get('plate') : '1';
const isReadyQueueScenario = !params.has('status') && !params.has('completed') && !params.has('family') && !params.has('source');
const initialCompletedPlates = params.get('completed') || (isReadyQueueScenario ? plateIds.join(',') : '');
const completedPlates = new Set(initialCompletedPlates.split(',').filter((plate) => plateIds.includes(plate)));
const v2PrintJourneyPath = '../../dayinlvchengv2/打印旅程原型/index.html';
const v3PrintJourneyPath = '../../dayinlvchengv3/index.html';
const printJourneyPath = params.get('source') === 'journey-v2'
  ? v2PrintJourneyPath
  : '../../dayinlvcheng/打印旅程原型/index.html';
const plateCatalog = {
  1: { taskAsset: '选中要打印的盘1.jpg', queueAsset: '打印队列1.jpg', title: '史蒂夫_01_012214', duration: '5 h 15 min', grams: 62, seconds: 5 * 60 * 60 + 15 * 60 },
  2: { taskAsset: '选择要打印的盘2（修改）.jpg', queueAsset: '打印队列2.jpg', title: '史蒂夫_02_012209', duration: '3 h 48 min', grams: 50, seconds: 3 * 60 * 60 + 48 * 60 },
  3: { taskAsset: '选择要打印的盘3.jpg', queueAsset: '打印队列3.jpg', title: '史蒂夫_03_012207', duration: '1 h 35 min', grams: 20, seconds: 1 * 60 * 60 + 35 * 60 }
};
const girlTaskCatalog = {
  'girl-1': { id: 'girl-1', owner: 'girl', journey: 'v3', task: 'girl-1', taskAsset: '女孩的打印任务_1.jpg', queueAsset: '女孩的待打印任务__1.jpg', title: '女孩的打印任务 1', duration: '5 h 37 min', grams: 40, seconds: 5 * 60 * 60 + 37 * 60 },
  'girl-2': { id: 'girl-2', owner: 'girl', journey: 'v3', task: 'girl-2', taskAsset: '女孩的打印任务_2.jpg', queueAsset: '女孩的待打印任务_2.jpg', title: '女孩的打印任务 2', duration: '48 min', grams: 5, seconds: 48 * 60 }
};
const activeGirlTaskId = Object.hasOwn(girlTaskCatalog, params.get('activeTask')) ? params.get('activeTask') : null;
const activeTask = activeGirlTaskId ? girlTaskCatalog[activeGirlTaskId] : plateCatalog[activePlate];
const activeTaskId = activeGirlTaskId || `plate-${activePlate}`;
const queuePlateIds = Object.keys(plateCatalog).filter((plate) => plate !== activePlate && !completedPlates.has(plate));
const isFamilyQueue = params.get('family') === 'multi' || params.get('source') === 'journey-v3' || isReadyQueueScenario;
const familyQueueTasks = [
  ...queuePlateIds.map((plate) => ({ id: `plate-${plate}`, owner: 'boy', journey: 'v2', plate, ...plateCatalog[plate] })),
  ...(isFamilyQueue ? Object.values(girlTaskCatalog).filter((task) => task.id !== activeTaskId) : [])
];
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
let currentStatus = 'ready';
let currentFilamentOperation = null;
let pendingAction = null;
let toastTimer;
let referenceReturnTarget = null;
const cameraLiveImageSrc = cameraMonitorImage.getAttribute('src');

function toggleCamera() {
  const cameraIsOn = cameraMonitor.dataset.cameraState !== 'off';
  cameraMonitor.dataset.cameraState = cameraIsOn ? 'off' : 'on';
  cameraMonitorImage.src = cameraIsOn ? cameraMonitorImage.dataset.offSrc : cameraLiveImageSrc;
  cameraMonitorImage.alt = cameraIsOn ? '摄像头已关闭' : '打印机摄像头实时监控画面';
  cameraToggleButton.setAttribute('aria-pressed', String(!cameraIsOn));
  cameraToggleButton.setAttribute('aria-label', cameraIsOn ? '打开摄像头' : '关闭摄像头');
}

function getActiveQueueTask() {
  return activeGirlTaskId
    ? { id: activeTaskId, owner: 'girl', journey: 'v3', task: activeGirlTaskId, ...activeTask }
    : { id: activeTaskId, owner: 'boy', journey: 'v2', plate: activePlate, ...activeTask };
}

function getVisibleQueueTasks() {
  return currentStatus === 'cancelled'
    ? [getActiveQueueTask(), ...familyQueueTasks]
    : familyQueueTasks;
}

function renderPlateTaskAndQueue() {
  const activeTaskIsGirl = activeGirlTaskId !== null;
  const visibleQueueTasks = getVisibleQueueTasks();
  activeTaskImage.src = `${activeTaskIsGirl ? '../../src/dayinjirenwukongzhi' : '../../src/dayinji'}/${activeTask.taskAsset}`;
  activeTaskImage.alt = `正在打印的${activeTask.title}模型`;
  activeTaskOwnerCard.dataset.owner = activeTaskIsGirl ? 'girl' : 'boy';
  activeTaskOwnerCard.classList.toggle('owner-task-card--boy', !activeTaskIsGirl);
  activeTaskOwnerCard.classList.toggle('owner-task-card--girl', activeTaskIsGirl);
  activeTaskOwnerAvatar.src = `../../src/dayinjirenwukongzhi/人物头像-${activeTaskIsGirl ? '女孩' : '男孩'}.png`;
  activeTaskOwnerAvatar.alt = `${activeTaskIsGirl ? '女孩' : '男孩'}发起的任务`;
  taskTitle.textContent = activeTask.title;
  taskMeta.textContent = `${activeTask.duration} · PLA · ${activeTask.grams} g`;

  queueTaskButtons.forEach((button, index) => {
    const queueTask = visibleQueueTasks[index];
    button.hidden = !queueTask;
    if (!queueTask) {
      button.removeAttribute('data-plate');
      button.removeAttribute('data-task');
      button.removeAttribute('data-queue-id');
      button.removeAttribute('aria-label');
      const image = button.querySelector('.queue-task-artwork');
      image.removeAttribute('src');
      image.alt = '';
      return;
    }
    const isGirlTask = queueTask.owner === 'girl';
    const image = button.querySelector('.queue-task-artwork');
    const avatar = button.querySelector('.task-owner-avatar');
    button.dataset.queueId = queueTask.id;
    button.dataset.owner = queueTask.owner;
    button.classList.toggle('owner-task-card--boy', !isGirlTask);
    button.classList.toggle('owner-task-card--girl', isGirlTask);
    if (isGirlTask) {
      button.removeAttribute('data-plate');
      button.dataset.task = queueTask.task;
      button.setAttribute('aria-label', `女孩发起的${queueTask.title}，等待打印，打开打印设置`);
      image.src = `../../src/dayinjirenwukongzhi/${queueTask.queueAsset}`;
      image.alt = `${queueTask.title}，等待打印`;
      avatar.src = '../../src/dayinjirenwukongzhi/人物头像-女孩.png';
    } else {
      button.dataset.plate = queueTask.plate;
      button.removeAttribute('data-task');
      button.setAttribute('aria-label', `男孩发起的盘 ${queueTask.plate}，打开打印设置`);
      image.src = `../../src/dayinji/${queueTask.queueAsset}`;
      image.alt = `盘 ${queueTask.plate}，${queueTask.title}，等待打印`;
      avatar.src = '../../src/dayinjirenwukongzhi/人物头像-男孩.png';
    }
  });
  queueToggle.querySelector('small').textContent = `${visibleQueueTasks.length} 个待打印任务`;
  queueToggle.hidden = visibleQueueTasks.length === 0;
  if (visibleQueueTasks.length === 0) printQueue.hidden = true;
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

function renderPrinterConnectionState(taskStatus) {
  const connectionStatus = connectionStatusOverride || (['ready', 'cancelled', 'completed'].includes(taskStatus) ? 'idle' : 'busy');
  const labels = { idle: '空闲', busy: '忙碌', offline: '离线' };
  printerConnectionState.dataset.connectionStatus = connectionStatus;
  printerConnectionStateLabel.textContent = labels[connectionStatus];
  printerConnectionStateImage.hidden = connectionStatus === 'busy';
  if (connectionStatus !== 'busy') {
    printerConnectionStateImage.src = printerConnectionStateImage.dataset[`${connectionStatus}Src`];
    printerConnectionStateImage.alt = `${labels[connectionStatus]}状态`;
  }
}

function setTaskStatus(status) {
  if (status === 'completed') completedPlates.add(activePlate);
  currentStatus = status;
  renderPlateTaskAndQueue();
  taskPanel.dataset.status = status;
  const labels = { ready: '可打印', preparing: '准备中', printing: '打印中', paused: '已暂停', cancelled: '已取消打印任务', completed: '打印完成' };
  taskState.textContent = labels[status];
  renderPrinterConnectionState(status);
  progressState.textContent = status === 'preparing' ? '准备打印' : (status === 'printing' ? '剩余时间' : labels[status]);

  const isReady = status === 'ready';
  const isPreparing = status === 'preparing';
  const isRunning = status === 'printing';
  const isPaused = status === 'paused';
  const isCancelled = status === 'cancelled';
  const isTerminal = status === 'cancelled' || status === 'completed';
  taskNavigation.hidden = !isReady;
  taskSummary.hidden = isReady;
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
  taskActions.hidden = isReady || status === 'completed' || isCancelled;
  completionActions.hidden = status !== 'completed';
  const boyTasksCompleted = completedPlates.size === plateIds.length;
  const shouldExploreToys = status === 'completed' && boyTasksCompleted;
  const allCompleted = boyTasksCompleted && familyQueueTasks.length === 0;
  nextPlateButton.hidden = status !== 'completed';
  localFileButton.hidden = status !== 'completed' || (!allCompleted && !shouldExploreToys);
  if (shouldExploreToys) {
    nextPlateLabel.textContent = '探索玩具';
    nextPlateButton.setAttribute('aria-label', '探索玩具');
    nextPlateButton.classList.add('is-explore-toys');
    localFileButton.hidden = true;
  } else {
    nextPlateLabel.textContent = '下一盘';
    nextPlateButton.setAttribute('aria-label', '下一盘');
    nextPlateButton.classList.remove('is-explore-toys');
  }
  completionActions.classList.remove('is-single');
  const shouldShowReadyQueue = isReady && isReadyQueueScenario && familyQueueTasks.length > 0;
  const queueShouldBeVisible = shouldShowReadyQueue || (!isReady && !isPreparing && getVisibleQueueTasks().length > 0);
  queueToggle.hidden = !queueShouldBeVisible;
  if ((isCancelled || shouldShowReadyQueue) && !queueToggle.hidden) {
    queueToggle.setAttribute('aria-expanded', 'true');
    printQueue.hidden = false;
  } else if (queueToggle.hidden) {
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

function openReference(fileName, title, returnTarget = queueToggle) {
  referenceImage.src = `../../src/dayinji/${fileName}`;
  referenceImage.alt = `${title}页面参考图`;
  referenceTitle.textContent = title;
  exploreJourneyHotspot.hidden = fileName !== '探索玩具.jpg';
  referenceReturnTarget = returnTarget;
  referenceScreen.hidden = false;
  devicePage.inert = true;
  referenceScreen.scrollTop = 0;
  document.querySelector('#reference-back').focus();
}

function appendMultiAccountContext(query) {
  if (isFamilyQueue) query.set('family', 'multi');
  if (activeGirlTaskId) query.set('activeTask', activeGirlTaskId);
}

function openPrintSettings() {
  const query = new URLSearchParams({
    view: 'settings',
    plate: activePlate,
    status: currentStatus === 'completed' ? 'completed' : 'printing',
    return: 'printer',
    /* 版本回跳标记：打印旅程返回/开始打印时要回到「可打印状态」版打印页 */
    printerVariant: 'ready'
  });
  appendMultiAccountContext(query);
  if (completedPlates.size > 0) query.set('completed', [...completedPlates].sort().join(','));
  const targetPath = currentStatus === 'completed' ? v2PrintJourneyPath : printJourneyPath;
  window.location.href = `${targetPath}?${query}`;
}

function openQueueTaskSettings(queueId) {
  const queueTask = getVisibleQueueTasks().find((task) => task.id === queueId);
  if (!queueTask) return;
  if (queueTask.journey === 'v3') {
    const girlQuery = new URLSearchParams({
      view: 'settings',
      step: 'material',
      entry: 'queue',
      task: queueTask.task,
      active: activePlate,
      status: currentStatus === 'completed' ? 'completed' : 'printing',
      return: 'printer',
      family: 'multi',
      printerVariant: 'ready'
    });
    if (activeGirlTaskId) girlQuery.set('activeTask', activeGirlTaskId);
    if (completedPlates.size > 0) girlQuery.set('completed', [...completedPlates].sort().join(','));
    window.location.href = `${v3PrintJourneyPath}?${girlQuery}`;
    return;
  }
  const query = new URLSearchParams({
    view: 'settings',
    step: 'material',
    entry: 'queue',
    plate: activePlate,
    selected: queueTask.plate,
    status: currentStatus === 'completed' ? 'completed' : 'printing',
    return: 'printer',
    printerVariant: 'ready'
  });
  appendMultiAccountContext(query);
  if (completedPlates.size > 0) query.set('completed', [...completedPlates].sort().join(','));
  window.location.href = `${v2PrintJourneyPath}?${query}`;
}

function openNextPlateSettings() {
  const boyTasksCompleted = completedPlates.size === plateIds.length;
  if (currentStatus === 'completed' && boyTasksCompleted) {
    openReference('探索玩具.jpg', '探索玩具', nextPlateButton);
    return;
  }
  openPrintSettings();
}

function openQueuedTaskBuilder() {
  const query = new URLSearchParams({
    view: 'settings',
    status: 'completed',
    return: 'printer',
    family: 'multi',
    completed: [...completedPlates].sort().join(','),
    printerVariant: 'ready'
  });
  window.location.href = `${v3PrintJourneyPath}?${query}`;
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

cameraToggleButton.addEventListener('click', toggleCamera);

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

document.querySelectorAll('[data-queue-task]').forEach((task) => task.addEventListener('click', () => openQueueTaskSettings(task.dataset.queueId)));
nextPlateButton.addEventListener('click', openNextPlateSettings);
restartPrintButton.addEventListener('click', restartPrint);
localFileButton.addEventListener('click', () => showToast('已打开本地文件'));
startQueuedPrintButton.addEventListener('click', openQueuedTaskBuilder);
exploreJourneyHotspot.addEventListener('click', () => {
  window.location.href = `${v2PrintJourneyPath}?printerVariant=ready`;
});
document.querySelector('#reference-back').addEventListener('click', () => {
  referenceScreen.hidden = true;
  devicePage.inert = false;
  referenceReturnTarget?.focus();
  referenceReturnTarget = null;
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
  filamentPointer.style.left = pointerPositions[selectedIndex];
  document.querySelectorAll('.filament-slot-hotspot').forEach((slot) => {
    const selected = slot.dataset.slotIndex === selectedIndex;
    slot.classList.toggle('is-selected', selected);
    slot.setAttribute('aria-pressed', String(selected));
    const label = slot.getAttribute('aria-label')?.replace(/，已选择$/, '') ?? '';
    slot.setAttribute('aria-label', `${label}${selected ? '，已选择' : ''}`);
  });
}

document.querySelectorAll('.filament-slot-hotspot').forEach((slot) => {
  slot.addEventListener('click', () => selectMaterialSlot(slot.dataset.slotIndex));
});

function openFilamentOperation(operation) {
  currentFilamentOperation = operation;
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
  (cancelledOperation === 'feed' ? loadFilamentButton : unloadFilamentButton).focus();
}

loadFilamentButton.addEventListener('click', () => openFilamentOperation('feed'));
unloadFilamentButton.addEventListener('click', () => openFilamentOperation('retract'));
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
else if (params.get('status') === 'preparing') setTaskStatus('preparing');
else setTaskStatus('ready');
