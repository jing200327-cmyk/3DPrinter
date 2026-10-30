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
const modelNavigation = document.querySelector('#model-navigation');
const exploreToysButton = document.querySelector('#explore-toys');
const myModelsButton = document.querySelector('#my-models');
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
const cancelledModelActions = document.querySelector('#cancelled-model-actions');
const queueEmpty = document.querySelector('#queue-empty');
const restartPrintButton = document.querySelector('#restart-print');
const nextPlateButton = document.querySelector('#next-plate');
const localFileButton = document.querySelector('#local-file');
const queueToggle = document.querySelector('#queue-toggle');
const printQueue = document.querySelector('#print-queue');
const devicePage = document.querySelector('#device-page');
const filamentOperationScreen = document.querySelector('#filament-operation-screen');
const filamentOperationTitle = document.querySelector('#filament-operation-title');
const filamentOperationSteps = document.querySelector('#filament-operation-steps');
const filamentOperationHint = document.querySelector('#filament-operation-hint');
const filamentOperationPercent = document.querySelector('#filament-operation-percent');
const filamentOperationRing = document.querySelector('#filament-operation-ring');
const filamentOperationArc = document.querySelector('#filament-operation-arc');
const filamentOperationArt = document.querySelector('#filament-operation-art');
const filamentOperationTemp = document.querySelector('#filament-operation-temp');
const filamentOperationDegree = document.querySelector('#filament-operation-degree');
const filamentOperationTip = document.querySelector('#filament-operation-tip');
const filamentOperationLabel = document.querySelector('#filament-operation-label');
const filamentOperationBanner = document.querySelector('#filament-operation-banner');
const filamentOperationPrimary = document.querySelector('#filament-operation-primary');
const filamentOperationBack = document.querySelector('#filament-operation-back');
const filamentCancelDialog = document.querySelector('#filament-cancel-dialog');
const filamentCancelTitle = document.querySelector('#filament-cancel-title');
const filamentCancelCopy = document.querySelector('#filament-cancel-copy');
const filamentPanel = document.querySelector('.filament-panel');
const filamentStatus = document.querySelector('#filament-status');
const filamentSpoolButton = document.querySelector('#filament-spool');
const loadFilamentButton = document.querySelector('#load-filament');
const unloadFilamentButton = document.querySelector('#unload-filament');
const fanFilterBanner = document.querySelector('#fan-filter-banner');
const fanFilterHours = document.querySelector('#fan-filter-hours');
const fanFilterReplacedButton = document.querySelector('#fan-filter-replaced');
const openFanAlertButton = document.querySelector('#open-fan-alert');
const cameraViewLimitButton = document.querySelector('#camera-view-limit');
const timelapseActionButton = document.querySelector('#timelapse-action');
const firmwareBanner = document.querySelector('#firmware-banner');
const firmwareStatusBadge = document.querySelector('#firmware-status-badge');
const firmwareDialog = document.querySelector('#firmware-dialog');
const firmwareDialogTitle = document.querySelector('#firmware-dialog-title');
const firmwareProgressPercent = document.querySelector('#firmware-progress-percent');
const firmwareProgressScreen = document.querySelector('#firmware-progress-screen');
const firmwareNetworkWarning = document.querySelector('#firmware-network-warning');
const firmwareProgressDemo = document.querySelector('#simulation-firmware-branches');
const firmwareNetworkErrorButton = document.querySelector('#simulate-firmware-network-error');
const prepareStage = document.querySelector('#prepare-stage');
const plateList = document.querySelector('#prepare-plate-list');
const prepareStateScreen = document.querySelector('#prepare-state-screen');
const prepareStateStage = document.querySelector('#prepare-state-stage');
const prepareStateStart = document.querySelector('#prepare-state-start');
const prepareStateDim = document.querySelector('#prepare-state-dim');
const stateStampImage = document.querySelector('#state-stamp');
const printerBusyPatch = document.querySelector('#printer-busy-patch');
const stateRows = [...document.querySelectorAll('#prepare-state-stage .state-row')];
const reuseScreenList = [...document.querySelectorAll('.reuse-screen')];
const referenceScreen = document.querySelector('#reference-screen');
const referenceImage = document.querySelector('#reference-image');
const referenceTitle = document.querySelector('#reference-title');
const scrollIndicator = document.querySelector('#scroll-indicator');
const scrollIndicatorThumb = scrollIndicator.querySelector('span');
const toast = document.querySelector('#toast');
const dialog = document.querySelector('#action-dialog');
const dialogTitle = document.querySelector('#dialog-title');
const dialogCopy = document.querySelector('#dialog-copy');
const dialogDismiss = document.querySelector('#dialog-dismiss');
const dialogConfirm = document.querySelector('#dialog-confirm');
const dialogClose = document.querySelector('#dialog-close');
const transitionOverlay = document.querySelector('#transition-overlay');
const transitionLabel = document.querySelector('#transition-label');
const transitionCloseButton = document.querySelector('#transition-close');
const activeTaskImage = document.querySelector('#active-task-image');
const activeTaskOwnerCard = document.querySelector('#active-task-owner-card');
const activeTaskOwnerAvatar = document.querySelector('#active-task-owner-avatar');
const taskTitle = document.querySelector('#task-title');
const taskMeta = document.querySelector('.task-meta');
const queueTaskButtons = [...document.querySelectorAll('[data-queue-task]')];

const params = new URLSearchParams(window.location.search);
const connectionStatusOverride = params.get('connection') === 'offline' ? 'offline' : null;
const plateIds = ['1', '2', '3'];
/* 单盘模型演示（?plates=single）：模型只有一盘，无打印队列；取消弹窗走单盘版（暂不/取消任务） */
const isSinglePlateModel = params.get('plates') === 'single';
const modelPlateIds = isSinglePlateModel ? ['1'] : plateIds;
const activePlate = modelPlateIds.includes(params.get('plate')) ? params.get('plate') : '1';
const completedPlates = new Set((params.get('completed') || '').split(',').filter((plate) => plateIds.includes(plate)));
const plateCatalog = {
  1: { taskAsset: '../../src/dayinji/选中要打印的盘1.jpg', queueAsset: '../../src/dayinji/打印队列1.jpg', title: '史蒂夫_01_012214', duration: '5 h 15 min', grams: 62, seconds: 5 * 60 * 60 + 15 * 60 },
  2: { taskAsset: '../../src/dayinji/选择要打印的盘2（修改）.jpg', queueAsset: '../../src/dayinji/打印队列2.jpg', title: '史蒂夫_02_012209', duration: '3 h 48 min', grams: 50, seconds: 3 * 60 * 60 + 48 * 60 },
  3: { taskAsset: '../../src/dayinji/选择要打印的盘3.jpg', queueAsset: '../../src/dayinji/打印队列3.jpg', title: '史蒂夫_03_012207', duration: '1 h 35 min', grams: 20, seconds: 1 * 60 * 60 + 35 * 60 }
};
const girlTaskCatalog = {
  'girl-1': { id: 'girl-1', owner: 'girl', journey: 'v3', task: 'girl-1', taskAsset: '../../src/dayinjirenwukongzhi/女孩的打印任务_1.jpg', queueAsset: '../../src/dayinjirenwukongzhi/女孩的待打印任务__1.jpg', title: '骨架沧龙_01_011409', duration: '5 h 37 min', grams: 40, seconds: 5 * 60 * 60 + 37 * 60 },
  'girl-2': { id: 'girl-2', owner: 'girl', journey: 'v3', task: 'girl-2', taskAsset: '../../src/dayinjirenwukongzhi/女孩的打印任务_2.jpg', queueAsset: '../../src/dayinjirenwukongzhi/女孩的待打印任务_2.jpg', title: '骨架沧龙_02_011405', duration: '48 min', grams: 5, seconds: 48 * 60 }
};
/* 新模型在设备忙碌时作为独立批次排队，不能复用当前正在执行的任务 ID。 */
const preparedTaskCatalog = Object.fromEntries(modelPlateIds.map(plate => {
  const id = `prepared-${plate}`;
  return [id, { id, owner: 'boy', submission: 'prepared-model', plate, ...plateCatalog[plate] }];
}));
const activePreparedTaskId = Object.hasOwn(preparedTaskCatalog, params.get('activeTask')) ? params.get('activeTask') : null;
const activeGirlTaskId = Object.hasOwn(girlTaskCatalog, params.get('activeTask')) ? params.get('activeTask') : null;
const activeTask = activeGirlTaskId ? girlTaskCatalog[activeGirlTaskId] : activePreparedTaskId ? preparedTaskCatalog[activePreparedTaskId] : plateCatalog[activePlate];
const activeTaskId = activeGirlTaskId || activePreparedTaskId || `plate-${activePlate}`;
const isFamilyQueue = params.get('family') === 'multi' || params.get('source') === 'journey-v3';
const taskCatalog = Object.fromEntries([
  ...modelPlateIds.map(plate => ({ id: `plate-${plate}`, owner: 'boy', submission: 'steve', journey: 'v2', plate, ...plateCatalog[plate] })),
  ...Object.values(girlTaskCatalog).map(task => ({ ...task, submission: 'girl-model' })),
  ...Object.values(preparedTaskCatalog)
].map(task => [task.id, task]));
const taskResults = new Map([...completedPlates].map(plate => [`plate-${plate}`, 'completed']));
try {
  const savedResults = JSON.parse(params.get('results') || '{}');
  for (const [id, result] of Object.entries(savedResults || {})) {
    if (Object.hasOwn(taskCatalog, id) && ['completed', 'cancelled'].includes(result)) taskResults.set(id, result);
  }
} catch { /* 无效的演示链接按未保存状态加载。 */ }
const initialQueueIds = params.has('queue') ? params.get('queue').split(',') : Object.keys(taskCatalog).filter(id => taskCatalog[id].submission !== 'prepared-model' && (taskCatalog[id].owner === 'boy' || (isFamilyQueue && !isSinglePlateModel)));
let familyQueueTasks = [...new Set(initialQueueIds)].filter(id => Object.hasOwn(taskCatalog, id) && id !== activeTaskId && !taskResults.has(id)).map(id => taskCatalog[id]);
const TOTAL_SECONDS = activeTask.seconds;
const PREPARATION_DURATION_SECONDS = 26;
const PREPARATION_STAGES = [
  { label: '正在分析模型', startsAt: 0 },
  { label: '升温中', startsAt: 10 }
];
const ANALYSIS_PROGRESS_STEPS = [0, 6, 14, 27, 39, 53, 68, 82, 93, 100];
let secondsRemaining = TOTAL_SECONDS;
let preparationElapsedSeconds = 0;
let currentStatus = 'ready';
/* 重新打印触发的准备中：按文档只承接喷嘴升温（renderPreparation 固定“升温中”） */
let reprintPreparation = false;
/* 有料与已完成进料分别判断；URL 保留跨页演示状态。 */
filamentPanel.dataset.filamentSensor = params.get('filamentSensor') === 'absent' ? 'absent' : 'present';
filamentPanel.dataset.filamentFed = params.get('filamentFed') === 'no' ? 'no' : 'yes';
if (filamentPanel.dataset.filamentSensor === 'absent') filamentPanel.dataset.filamentPresence = 'empty';
let filamentGuideReturnStack = null;
let filamentSpoolSelected = false;
let cameraLimitTimer;
let pendingAction = null;
let toastTimer;
let referenceReturnTarget = null;
const cameraLiveImageSrc = cameraMonitorImage.getAttribute('src');
const FILAMENT_STATUS_LABELS = { idle: '', feeding: '进料中', loaded: '进料完成', retracting: '退料中', retracted: '退料完成' };
const CAMERA_VIEW_LIMIT_DELAY_MS = 7000;
/* 打印机首次配网连接流程原型（配网首页 / 选择要设置的打印机） */
const PAIRING_FLOW_PATH = '../../lianjiepeiwnag/打印机首次配网连接流程原型/index.html';

/* ---------- 摄像头实时监控区域 ---------- */
function renderCameraMonitor() {
  const state = cameraMonitor.dataset.cameraState;
  const sources = { on: cameraLiveImageSrc, off: cameraMonitorImage.dataset.offSrc, limit: cameraMonitorImage.dataset.limitSrc };
  const labels = { on: '打印机摄像头实时监控画面', off: '摄像头已关闭', limit: '已达到观看时长限制，摄像头已自动关闭' };
  cameraMonitorImage.src = sources[state];
  cameraMonitorImage.alt = labels[state];
  cameraToggleButton.setAttribute('aria-pressed', String(state === 'on'));
  cameraToggleButton.setAttribute('aria-label', state === 'on' ? '关闭摄像头' : '打开摄像头');
}

function toggleCamera() {
  window.clearTimeout(cameraLimitTimer);
  cameraMonitor.dataset.cameraState = cameraMonitor.dataset.cameraState === 'on' ? 'off' : 'on';
  renderCameraMonitor();
}

/* 左上角透明按钮：7 秒后把监控画面换成“达到观看时长后自动关闭摄像头” */
cameraViewLimitButton.addEventListener('click', () => {
  if (cameraMonitor.dataset.cameraState === 'limit') return;
  window.clearTimeout(cameraLimitTimer);
  showToast('已开始观看计时，7 秒后达到观看时长限制');
  cameraLimitTimer = window.setTimeout(() => {
    cameraMonitor.dataset.cameraState = 'limit';
    renderCameraMonitor();
    showToast('已达到观看时长限制，摄像头已自动关闭');
  }, CAMERA_VIEW_LIMIT_DELAY_MS);
});

/* ---------- 复用整张大图的整屏页面 ---------- */
const reuseScreenNames = { deviceSettings: '#device-settings-screen', printOptions: '#print-options-screen', timelapse: '#timelapse-screen', fanFilter: '#fan-filter-screen', fanAlert: '#fan-alert-screen', addPrinter: '#add-printer-screen', sharePrinter: '#share-printer-screen', memberManage: '#member-manage-screen', removePrinter: '#remove-printer-screen', logicDemo: '#logic-demo-screen', materialSettings: '#material-settings-screen', materialName: '#material-name-screen', materialType: '#material-type-screen', materialColor: '#material-color-screen', exploreToys: '#explore-toys-screen', modelDetail: '#model-detail-screen', preparePrint: '#prepare-print-screen', prepareMaterial: '#prepare-material-screen', prepareEmpty: '#prepare-empty-screen', prepareState: '#prepare-state-screen', preview3d: '#preview-3d-screen', firmwareUpgrade: '#firmware-upgrade-screen', firmwareVersion: '#firmware-version-screen', firmwareProgress: '#firmware-progress-screen', firmwareDone: '#firmware-done-screen' };
let reuseStack = [];

function openReuseScreen(name) {
  const target = document.querySelector(reuseScreenNames[name]);
  if (!target) return;
  if (name !== 'firmwareProgress' && !firmwareProgressScreen.hidden) leaveFirmwareProgress();
  renderPrepareFilamentState();
  reuseStack.push(name);
  reuseScreenList.forEach((screen) => { screen.hidden = screen !== target; });
  devicePage.inert = true;
  document.body.classList.add('operation-open');
  const frame = target.querySelector('.reuse-screen-frame');
  if (frame) {
    frame.scrollLeft = 0;
    frame.scrollTop = 0;
  }
  target.focus({ preventScroll: true });
}

function closeReuseScreens() {
  if (!firmwareProgressScreen.hidden) leaveFirmwareProgress();
  reuseStack = [];
  reuseScreenList.forEach((screen) => { screen.hidden = true; });
  devicePage.inert = false;
  document.body.classList.remove('operation-open');
}

function goBackInReuseScreens() {
  reuseStack.pop();
  const previous = reuseStack[reuseStack.length - 1];
  if (!previous) {
    closeReuseScreens();
    return;
  }
  const target = document.querySelector(reuseScreenNames[previous]);
  reuseScreenList.forEach((screen) => { screen.hidden = screen !== target; });
  const frame = target.querySelector('.reuse-screen-frame');
  if (frame) {
    frame.scrollLeft = 0;
    frame.scrollTop = 0;
  }
  target.focus({ preventScroll: true });
}

/* 直接回到栈里已存在的某一层（用于“回到准备打印页”这类跨层返回），不存在则打开 */
function returnToReuseScreen(name) {
  const index = reuseStack.lastIndexOf(name);
  if (index === -1) {
    openReuseScreen(name);
    return;
  }
  reuseStack.length = index + 1;
  const target = document.querySelector(reuseScreenNames[name]);
  reuseScreenList.forEach((screen) => { screen.hidden = screen !== target; });
  const frame = target.querySelector('.reuse-screen-frame');
  if (frame) {
    frame.scrollLeft = 0;
    frame.scrollTop = 0;
  }
  target.focus({ preventScroll: true });
}

/* ---------- 3D 预览页 ---------- */
/* 打开 3D 预览：先把屏幕显示出来（画布才量得到尺寸），再把盘信息交给三维模块 */
function openPreview3D(payload) {
  openReuseScreen('preview3d');
  if (window.__PREVIEW3D) window.__PREVIEW3D.open(payload);
}

function getVisibleQueueTasks() {
  return familyQueueTasks;
}

function getActiveTaskOwner() {
  return activeGirlTaskId ? 'girl' : 'boy';
}

/* URL 保存本次演示的队列快照和终态，切盘、刷新和返回均沿用同一批任务。 */
function taskSessionUrl(status = currentStatus) {
  const next = new URL(window.location.href);
  next.searchParams.set('status', status);
  next.searchParams.set('queue', familyQueueTasks.map(task => task.id).join(','));
  next.searchParams.set('results', JSON.stringify(Object.fromEntries(taskResults)));
  const completed = plateIds.filter(plate => taskResults.get(`plate-${plate}`) === 'completed');
  if (completed.length) next.searchParams.set('completed', completed.join(','));
  else next.searchParams.delete('completed');
  next.searchParams.set('filamentSensor', filamentPanel.dataset.filamentSensor);
  next.searchParams.set('filamentFed', filamentPanel.dataset.filamentFed);
  next.searchParams.delete('prePrintFeed');
  return next;
}

function cancelTasksForActiveRole() {
  const submission = taskCatalog[activeTaskId].submission;
  for (const task of familyQueueTasks) {
    if (task.submission === submission) taskResults.set(task.id, 'cancelled');
  }
  familyQueueTasks = familyQueueTasks.filter(task => task.submission !== submission);
}

function shouldShowEmptyQueue(status = currentStatus) {
  return familyQueueTasks.length === 0 && (status === 'cancelled-all' || (isSinglePlateModel && !['ready', 'preparing'].includes(status)));
}

function renderPlateTaskAndQueue() {
  const activeTaskIsGirl = activeGirlTaskId !== null;
  const visibleQueueTasks = getVisibleQueueTasks();
  activeTaskImage.src = activeTask.taskAsset;
  activeTaskImage.alt = `正在打印的${activeTask.title}模型`;
  activeTaskOwnerCard.dataset.owner = activeTaskIsGirl ? 'girl' : 'boy';
  activeTaskOwnerCard.classList.toggle('owner-task-card--boy', !activeTaskIsGirl);
  activeTaskOwnerCard.classList.toggle('owner-task-card--girl', activeTaskIsGirl);
  activeTaskOwnerAvatar.src = `../../src/dayinjirenwukongzhi/人物头像-${activeTaskIsGirl ? '女孩' : '男孩'}.png`;
  activeTaskOwnerAvatar.alt = `${activeTaskIsGirl ? '女孩' : '男孩'}发起的任务`;
  taskTitle.textContent = activeTask.title;
  taskMeta.textContent = `${activeTask.duration} · PLA · ${activeTask.grams} g`;

  while (queueTaskButtons.length < visibleQueueTasks.length) {
    const button = queueTaskButtons[0].cloneNode(true);
    button.removeAttribute('id');
    button.dataset.dynamicQueue = 'true';
    button.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    button.addEventListener('click', () => openQueueTaskSettings(button.dataset.queueId));
    printQueue.querySelector('.queue-list').append(button);
    queueTaskButtons.push(button);
  }
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
      button.setAttribute('aria-label', `女孩发起的${queueTask.title}，打开打印设置`);
      image.src = queueTask.queueAsset;
      image.alt = `${queueTask.title}，等待打印`;
      avatar.src = '../../src/dayinjirenwukongzhi/人物头像-女孩.png';
    } else {
      button.dataset.plate = queueTask.plate;
      button.removeAttribute('data-task');
      button.setAttribute('aria-label', `男孩发起的盘 ${queueTask.plate}，打开打印设置`);
      image.src = queueTask.queueAsset;
      image.alt = `盘 ${queueTask.plate}，${queueTask.title}，等待打印`;
      avatar.src = '../../src/dayinjirenwukongzhi/人物头像-男孩.png';
    }
  });
  queueToggle.querySelector('small').textContent = `${visibleQueueTasks.length} 个待打印任务`;
  const showEmpty = shouldShowEmptyQueue();
  queueEmpty.hidden = !showEmpty;
  queueToggle.disabled = showEmpty;
  queueToggle.hidden = visibleQueueTasks.length === 0 && !showEmpty;
  if (visibleQueueTasks.length === 0) printQueue.hidden = !showEmpty;
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

function showToast(message, position = 'default') {
  toast.classList.toggle('toast--prepare', position === 'prepare');
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('is-visible');
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 1800);
}

/* ---------- 设备框内的细滚动指示条 ---------- */
/* 原型适配到 375×812 后，比 812 高的页面改成在设备框内部上下滚动。
   原生滚动条会占掉 6~15px 布局宽度、把等比缩放的整图页面压出底部空白，
   所以改用一条不占宽度的浮层指示条（和 iOS 一样只在滚动时浮现）。 */
let scrollIndicatorTimer;
let scrollIndicatorOwner = null;

function currentScroller() {
  const activeScreen = reuseScreenList.find((screen) => !screen.hidden);
  if (activeScreen) return activeScreen;
  return referenceScreen.hidden ? devicePage : referenceScreen;
}

function renderScrollIndicator() {
  const scroller = scrollIndicatorOwner || (scrollIndicatorOwner = currentScroller());
  /* 阈值留 4px：整图复用页按宽度等比排版时可能只差 1~2px，那种“微溢出”不值得弹指示条 */
  const overflowing = scroller.scrollHeight - scroller.clientHeight > 4;
  scrollIndicator.hidden = !overflowing;
  if (!overflowing) return;
  const trackHeight = scroller.clientHeight;
  const thumbHeight = Math.max(28, Math.round((trackHeight / scroller.scrollHeight) * trackHeight));
  const maxScroll = scroller.scrollHeight - trackHeight;
  const offset = maxScroll > 0 ? (scroller.scrollTop / maxScroll) * (trackHeight - thumbHeight) : 0;
  scrollIndicatorThumb.style.height = `${thumbHeight}px`;
  scrollIndicatorThumb.style.transform = `translateY(${offset}px)`;
  scrollIndicator.classList.add('is-visible');
  window.clearTimeout(scrollIndicatorTimer);
  /* 刚进页面时多停一会儿，让评审看得见“这一页可以上下滚” */
  scrollIndicatorTimer = window.setTimeout(() => scrollIndicator.classList.remove('is-visible'), scroller.scrollTop > 0 ? 900 : 2200);
}

/* 切换页面时把指示条挂到当前可见的那一层上 */
function bindScrollIndicator() {
  scrollIndicatorOwner = currentScroller();
  renderScrollIndicator();
}

[devicePage, referenceScreen, ...reuseScreenList].forEach((scroller) => {
  scroller.addEventListener('scroll', () => {
    scrollIndicatorOwner = scroller;
    renderScrollIndicator();
  }, { passive: true });
});
window.addEventListener('resize', renderScrollIndicator);
window.addEventListener('load', bindScrollIndicator);
/* 任何一层整屏页显示 / 隐藏时，把指示条切到当前那一层 */
[...reuseScreenList, referenceScreen].forEach((screen) => {
  new MutationObserver(bindScrollIndicator).observe(screen, { attributes: true, attributeFilter: ['hidden'] });
});

function renderPreparation() {
  /* 重新打印后的准备中只承接喷嘴升温，不重复分析模型。 */
  if (reprintPreparation) {
    preparationLabel.textContent = '升温中';
    preparationPercent.hidden = true;
    return;
  }
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
    reprintPreparation = false;
    setTaskStatus('printing');
    return;
  }
  renderPreparation();
}

function renderPrinterConnectionState(taskStatus) {
  const connectionStatus = printerConnectionState.dataset.recoveryState || connectionStatusOverride || (['ready', 'cancelled', 'cancelled-all', 'completed'].includes(taskStatus) ? 'idle' : 'busy');
  const labels = { idle: '空闲', busy: '忙碌', offline: '离线', connecting: '连接中...' };
  printerConnectionState.dataset.connectionStatus = connectionStatus;
  printerConnectionStateLabel.textContent = labels[connectionStatus];
  printerConnectionStateImage.hidden = ['busy', 'connecting'].includes(connectionStatus);
  if (!printerConnectionStateImage.hidden) {
    printerConnectionStateImage.src = printerConnectionStateImage.dataset[`${connectionStatus}Src`];
    printerConnectionStateImage.alt = `${labels[connectionStatus]}状态`;
  }
}

document.addEventListener('prototype-connection-change', () => renderPrinterConnectionState(currentStatus));
document.addEventListener('prototype-connection-camera-off', () => {
  window.clearTimeout(cameraLimitTimer);
  cameraMonitor.dataset.cameraState = 'off';
  renderCameraMonitor();
});

function setTaskStatus(status) {
  if (isSinglePlateModel && status === 'cancelled') status = 'cancelled-all';
  if (status === 'cancelled-all') cancelTasksForActiveRole();
  if (status === 'completed') {
    taskResults.set(activeTaskId, 'completed');
    if (!activeGirlTaskId) completedPlates.add(activePlate);
  } else if (status === 'cancelled' || status === 'cancelled-all') {
    taskResults.set(activeTaskId, 'cancelled');
  }
  familyQueueTasks = familyQueueTasks.filter(task => task.id !== activeTaskId && !taskResults.has(task.id));
  currentStatus = status;
  window.history.replaceState(null, '', taskSessionUrl());
  renderPlateTaskAndQueue();
  taskPanel.dataset.status = status;
  const labels = { ready: '可打印', preparing: '准备中', printing: '打印中', paused: '已暂停', cancelled: '已取消打印任务', 'cancelled-all': '已取消打印任务', completed: '打印完成' };
  taskState.textContent = labels[status];
  renderPrinterConnectionState(status);
  progressState.textContent = status === 'preparing' ? '准备打印' : (status === 'printing' ? '剩余时间' : labels[status]);

  const isReady = status === 'ready';
  const isPreparing = status === 'preparing';
  const isRunning = status === 'printing';
  const isPaused = status === 'paused';
  const isCancelled = status === 'cancelled' || status === 'cancelled-all';
  const isTerminal = isCancelled || status === 'completed';
  modelNavigation.hidden = !isReady;
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
  completionActions.hidden = status !== 'completed' && status !== 'cancelled';
  cancelledModelActions.hidden = status !== 'cancelled-all';
  completionActions.setAttribute('aria-label', status === 'cancelled' ? '已取消任务后续操作' : '打印完成操作');
  const allCompleted = modelPlateIds.every(plate => taskResults.get(`plate-${plate}`) === 'completed') && familyQueueTasks.length === 0;
  nextPlateButton.hidden = status === 'completed' && allCompleted;
  nextPlateButton.disabled = familyQueueTasks.length === 0;
  localFileButton.hidden = status !== 'completed' || !allCompleted;
  completionActions.classList.remove('is-single');
  const showEmpty = shouldShowEmptyQueue(status);
  queueToggle.hidden = (isReady && !familyQueueTasks.some(task => task.submission === 'prepared-model')) || isPreparing || (familyQueueTasks.length === 0 && !showEmpty);
  if (isCancelled && !queueToggle.hidden) {
    queueToggle.setAttribute('aria-expanded', 'true');
    printQueue.hidden = false;
  } else if (showEmpty) {
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
  if (printerConnectionState.dataset.recoveryState) return;
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

function openDialog({ title, copy = '', dismissText = '暂不', dismissTone = 'neutral', confirmText = '确认', confirmTone = 'primary', action = null }) {
  dialogTitle.textContent = title;
  dialogCopy.textContent = copy;
  dialogDismiss.textContent = dismissText;
  dialogDismiss.dataset.tone = dismissTone;
  dialogConfirm.textContent = confirmText;
  dialogConfirm.dataset.tone = confirmTone;
  pendingAction = action;
  dialog.showModal();
}

/* ---------- 暂停中 / 继续打印中 / 取消中 过渡弹窗 ---------- */
/* 文档：点击暂停/继续/取消后立刻弹出过渡弹窗，用户可关闭弹窗，对应按钮转为“…中”，
   等待指令执行完成后任务控制面板才切换状态；过渡期间不可取消。原型用 2s 模拟指令执行。 */
let transitionTimer;
function openTransition(text, buttonSwap) {
  transitionLabel.textContent = text;
  transitionOverlay.hidden = false;
  if (buttonSwap) buttonSwap();
  pauseButton.disabled = true;
  cancelButton.disabled = true;
}
function closeTransition() {
  window.clearTimeout(transitionTimer);
  transitionOverlay.hidden = true;
}
function runTransition(text, buttonSwap, done) {
  openTransition(text, buttonSwap);
  transitionTimer = window.setTimeout(() => {
    transitionOverlay.hidden = true;
    done();
  }, 2000);
}

function openReference(fileName, title, returnTarget = queueToggle) {
  referenceImage.src = `../../src/dayinji/${fileName}`;
  referenceImage.alt = `${title}页面参考图`;
  referenceTitle.textContent = title;
  referenceReturnTarget = returnTarget;
  referenceScreen.hidden = false;
  devicePage.inert = true;
  referenceScreen.scrollTop = 0;
  document.querySelector('#reference-back').focus();
}

/* ---------- 任务状态版的准备打印页 ---------- */
/* 与新版准备打印页复用同一套 HTML 结构与模型、耗材素材，
   正在打印 / 已取消 / 已完成的状态戳放入“当前任务盘”的真实行容器：
   无论哪一盘在打印，队列里其它盘（含盘 1）点进来都能正确复用。 */
const PREPARE_STATE_STAMPS = {
  printing: { src: 'assets/状态戳-正在打印.png', alt: '正在打印' },
  cancelled: { src: 'assets/状态戳-已取消.svg', alt: '已取消' },
  completed: { src: 'assets/状态戳-已完成.svg', alt: '已完成' }
};
let selectedStateRow = '2';
let stampedPlate = null;
let prepareQueueTaskId = null;

function resolvePrepareStateKey() {
  if (currentStatus === 'completed') return 'completed';
  if (currentStatus === 'cancelled' || currentStatus === 'cancelled-all') return 'cancelled';
  return 'printing';
}

function selectStateRow(plate) {
  const candidate = String(plate);
  const available = stateRows.filter(row => row.getAttribute('aria-disabled') !== 'true').map(row => row.dataset.row);
  selectedStateRow = available.includes(candidate) ? candidate : available[0];
  prepareStateStage.querySelectorAll('.state-row[role="option"]').forEach((row) => {
    row.setAttribute('aria-selected', String(row.dataset.row === selectedStateRow));
  });
  updatePrepareStart();
}

/* 被状态戳覆盖的盘不可再选，其余盘与 3D 预览保持可用。 */
function renderStateRows() {
  stateStampImage.hidden = true;
  stateRows.forEach((row) => {
    const plate = row.dataset.row;
    const prepared = taskCatalog[prepareQueueTaskId]?.submission === 'prepared-model';
    const result = taskResults.get(`${prepared ? 'prepared' : 'plate'}-${plate}`) || (plate === stampedPlate ? resolvePrepareStateKey() : null);
    const stamped = Boolean(result);
    row.classList.toggle('is-stamped', stamped);
    row.setAttribute('aria-disabled', String(stamped));
    row.querySelector('.state-row-hit').hidden = stamped;
    row.querySelector('.plate-3d-btn').disabled = stamped;
    row.querySelectorAll('.state-stamp:not(#state-stamp)').forEach(image => image.remove());
    if (result) {
      const stamp = PREPARE_STATE_STAMPS[result];
      const image = plate === stampedPlate ? stateStampImage : document.createElement('img');
      image.className = 'state-stamp';
      image.src = stamp.src;
      image.alt = `${plateCatalog[plate].title}，${stamp.alt}`;
      image.hidden = false;
      row.append(image);
    }
  });
}

function selectedQueuedTask() {
  const openedTask = familyQueueTasks.find(task => task.id === prepareQueueTaskId);
  if (openedTask?.owner === 'girl') return openedTask;
  return familyQueueTasks.find(task => task.plate === selectedStateRow && (!openedTask || task.submission === openedTask.submission));
}

function updatePrepareStart() {
  const task = selectedQueuedTask();
  const busy = ['preparing', 'printing', 'paused'].includes(currentStatus);
  const startDisabled = busy || !task || task.id !== familyQueueTasks[0]?.id;
  prepareStateStart.disabled = startDisabled;
  prepareStateStart.setAttribute('aria-label', busy ? '开始打印（当前任务正在打印或已暂停，暂不可用）' : (startDisabled ? '开始打印（请按打印队列顺序执行）' : '开始打印'));
  prepareStateDim.hidden = !startDisabled;
}

function openPrepareStateScreen(preferredPlate, queueTaskId) {
  prepareQueueTaskId = queueTaskId;
  const key = resolvePrepareStateKey();
  prepareStateStage.dataset.state = key;
  /* 男孩任务：当前任务盘盖戳；女孩任务：三个盘都可复用，不盖戳 */
  const prepared = taskCatalog[queueTaskId]?.submission === 'prepared-model';
  stampedPlate = activeGirlTaskId || (prepared && !activePreparedTaskId) ? null : String(activePlate);
  /* 打印中 / 暂停中打印机忙碌，其余状态空闲（与底图一致，补丁隐藏） */
  printerBusyPatch.hidden = key !== 'printing';
  renderStateRows();
  selectStateRow(preferredPlate);
  openReuseScreen('prepareState');
}

/* 打印队列里的待打印任务：按当前任务状态打开对应的准备打印页，不再跳转打印旅程的配色页 */
function openQueueTaskSettings(queueId) {
  const queueTask = getVisibleQueueTasks().find((task) => task.id === queueId);
  if (!queueTask) return;
  if (window.__FAMILY_QUEUE?.owns(queueTask)) return window.__FAMILY_QUEUE.openQueuedTask(queueTask);
  const plate = queueTask && plateCatalog[queueTask.plate] ? queueTask.plate : '2';
  openPrepareStateScreen(plate, queueTask.id);
}

/* ---------- “下一盘”：直接把队列里下一个顺位的任务拉进“准备中” ---------- */
/* 只推进队首，不从已结束的盘重建任务。 */
function pickNextQueuedTask() {
  return getVisibleQueueTasks()[0] || null;
}

function startNextPlate() {
  const nextTask = pickNextQueuedTask();
  if (!nextTask) {
    showToast('打印队列里已经没有待打印任务了');
    return;
  }
  startQueuedTask(nextTask, 'preparing');
}

function startQueuedTask(nextTask, status) {
  if (!nextTask || nextTask.id !== familyQueueTasks[0]?.id || ['preparing', 'printing', 'paused'].includes(currentStatus)) return;
  familyQueueTasks = familyQueueTasks.filter(task => task.id !== nextTask.id);
  const next = taskSessionUrl(status);
  next.searchParams.delete('screen');
  if (nextTask.owner === 'girl') {
    next.searchParams.set('family', 'multi');
    next.searchParams.set('activeTask', nextTask.task);
    next.searchParams.delete('plate');
  } else {
    next.searchParams.set('plate', nextTask.plate);
    if (nextTask.submission === 'prepared-model') next.searchParams.set('activeTask', nextTask.id);
    else next.searchParams.delete('activeTask');
  }
  window.location.href = next.href;
}

function restartPrint() {
  completedPlates.delete(activePlate);
  taskResults.delete(activeTaskId);
  secondsRemaining = TOTAL_SECONDS;
  preparationElapsedSeconds = 0;
  /* 文档：点击重新打印后进入准备中状态，且此时准备中只承接喷嘴升温的等待时间 */
  reprintPreparation = true;
  setTaskStatus('preparing');
  showToast('已重新开始打印');
}

queueToggle.addEventListener('click', () => {
  const expanded = queueToggle.getAttribute('aria-expanded') === 'true';
  queueToggle.setAttribute('aria-expanded', String(!expanded));
  printQueue.hidden = expanded;
});

pauseButton.addEventListener('click', () => {
  if (pauseButton.disabled) return;
  if (currentStatus === 'printing') {
    runTransition(
      '暂停中...',
      () => { pauseButton.querySelector('span:last-child').textContent = '暂停中...'; },
      () => setTaskStatus('paused')
    );
  } else if (currentStatus === 'paused') {
    runTransition(
      '继续打印中...',
      () => { pauseButton.querySelector('span:last-child').textContent = '继续中...'; },
      () => setTaskStatus('printing')
    );
  }
});

transitionCloseButton.addEventListener('click', () => {
  /* 文档：过渡弹窗可关闭，但指令继续执行，状态仍在计时结束后切换 */
  window.clearTimeout(transitionTimer);
  transitionOverlay.hidden = true;
});

cameraToggleButton.addEventListener('click', toggleCamera);

cancelButton.addEventListener('click', () => {
  /* 单盘模型：弹窗提供「暂不 / 取消任务」；多盘模型：提供「取消当前任务 / 取消全部任务」+ 右上角关闭 */
  openDialog(isSinglePlateModel
    ? { title: '是否要取消任务', dismissText: '暂不', dismissTone: 'danger-ghost', confirmText: '取消任务', confirmTone: 'danger', action: 'cancel-print' }
    : { title: '是否要取消任务', dismissText: '取消当前任务', dismissTone: 'danger-ghost', confirmText: '取消全部任务', confirmTone: 'danger', action: 'cancel-print' });
});

finishButton.addEventListener('click', () => {
  setTaskStatus('completed');
  showToast('已进入打印完成状态');
});

document.querySelectorAll('[data-queue-task]:not([data-dynamic-queue])').forEach((task) => task.addEventListener('click', () => openQueueTaskSettings(task.dataset.queueId)));
nextPlateButton.addEventListener('click', startNextPlate);
restartPrintButton.addEventListener('click', restartPrint);
localFileButton.addEventListener('click', () => showToast('已打开本地文件'));
/* 探索玩具：改为复用整图页面（探索玩具页.png），点击任意位置进入模型详情页 */
exploreToysButton.addEventListener('click', () => openReuseScreen('exploreToys'));
myModelsButton.addEventListener('click', () => openReference('我的模型.jpg', '我的模型', myModelsButton));
document.querySelector('#cancelled-explore-toys').addEventListener('click', () => openReuseScreen('exploreToys'));
document.querySelector('#cancelled-my-models').addEventListener('click', event => openReference('我的模型.jpg', '我的模型', event.currentTarget));
document.querySelector('#reference-back').addEventListener('click', () => {
  referenceScreen.hidden = true;
  devicePage.inert = false;
  referenceReturnTarget?.focus();
  referenceReturnTarget = null;
});

/* 顶栏“添加打印机”：直接进入添加打印机页，不再经过“切换或添加打印机”弹窗 */
document.querySelector('#printer-switch').addEventListener('click', () => openReuseScreen('addPrinter'));
document.querySelector('#printer-settings').addEventListener('click', () => {
  /* 从顶栏齿轮进来 = 普通设备设置。这里只把“设备设置页的展示上下文”落回「已是最新版本」，
     不动首页提醒条——提醒条反映的是设备上到底有没有待安装的新版本，不该因为从哪个入口进设置页而消失。 */
  setFirmwareSettingsHasUpdate(false);
  openReuseScreen('deviceSettings');
});

/* ---------- 固件升级：首页提醒条 → 设备设置 → 固件升级 → 确认升级 → 进度 → 更新完成 ---------- */
/* 固件状态拆成三个彼此独立的标志，别让「从哪个入口进的设置页」误伤首页提醒条：
   ① firmwareUpdateAvailable —— 设备上**是否真的有待安装的新版本**（设备事实）。
      只有“更新完成页 → 我知道了”会把它置为 false。
   ② firmwareSettingsHasUpdate —— **本次进入设备设置页是否带「有更新」上下文**（展示上下文）。
      只由入口决定：点提醒条进来为 true，点顶栏齿轮进来为 false。
      控制设备设置页的橙色文案 #firmware-status-badge 与「固件版本」行的落点（升级页 / 已是最新版页）。
   ③ firmwareBannerHandled —— **本次页面是否已点过这条提醒**（仅内存状态）。
      点过提醒条就置 true，返回首页时隐藏；刷新或重新打开原型后恢复显示。
      不读取旧版 localStorage 的已处理记录，避免演示入口被历史操作永久隐藏。
      只有“更新完成页 → 我知道了”会把 ① 也置 false（设备真的升到最新）。 */
const FIRMWARE_LATEST_VERSION = '2.02';
/* 原图烘焙了 50% 那三个字，这里用同色圆片盖住，进度完全由前端模拟 */
/* 留出操作控制台异常分支的时间，正常演示约 15 秒完成。 */
const FIRMWARE_PROGRESS_STEP_MS = 300;
const FIRMWARE_PROGRESS_STEP = 2;
const FIRMWARE_NETWORK_RECOVERY_MS = 5000;
let firmwareUpdateAvailable = true;
let firmwareBannerHandled = false;
let firmwareSettingsHasUpdate = true;
let firmwareProgress = 0;
let firmwareProgressTimer = null;
let firmwareCompletionTimer = null;
let firmwareNetworkRecoveryTimer = null;
let firmwareNetworkPaused = false;
const firmwareNetworkDialog = document.querySelector('#firmware-network-dialog');

function renderFirmwareState() {
  /* 首页提醒条要同时满足：设备确实有新版本 **且** 这条提醒还没被处理过 */
  firmwareBanner.hidden = !(firmwareUpdateAvailable && !firmwareBannerHandled);
  /* 橙色文案要同时满足「有新版本」且「本次确实带着更新上下文进来」 */
  firmwareStatusBadge.hidden = !(firmwareUpdateAvailable && firmwareSettingsHasUpdate);
}

/* 设备事实：是否有待安装的新版本。升级完成后置为 false，提醒条随之消失（此后不再出现） */
function setFirmwareUpdateAvailable(available) {
  firmwareUpdateAvailable = Boolean(available);
  if (!firmwareUpdateAvailable) firmwareSettingsHasUpdate = false;
  renderFirmwareState();
}

/* 提醒条已处理：仅本次页面隐藏，刷新或重新打开后复位。不影响设备事实与升级入口 */
function setFirmwareBannerHandled(handled) {
  firmwareBannerHandled = Boolean(handled);
  renderFirmwareState();
}

/* 展示上下文：本次进设备设置页算不算“从更新提醒进来” */
function setFirmwareSettingsHasUpdate(hasUpdate) {
  firmwareSettingsHasUpdate = Boolean(hasUpdate);
  renderFirmwareState();
}

function firmwareHasUpdateContext() {
  return firmwareUpdateAvailable && firmwareSettingsHasUpdate;
}

function stopFirmwareProgress() {
  window.clearInterval(firmwareProgressTimer);
  firmwareProgressTimer = null;
  window.clearTimeout(firmwareCompletionTimer);
  firmwareCompletionTimer = null;
}

function renderFirmwareProgress(value) {
  firmwareProgress = value;
  firmwareProgressPercent.textContent = `${value}%`;
  firmwareProgressPercent.setAttribute('aria-valuenow', String(value));
  firmwareProgressPercent.setAttribute('aria-valuetext', firmwareNetworkPaused ? `${value}%，下载已暂停` : `${value}%`);
  firmwareNetworkErrorButton.disabled = firmwareNetworkPaused || value >= 100;
}

function renderFirmwareNetwork(state) {
  firmwareNetworkPaused = state !== 'online';
  firmwareProgressScreen.dataset.networkState = state;
  firmwareNetworkWarning.hidden = state !== 'recovering';
  document.querySelector('#simulation-firmware-network-status').textContent = {
    online: '正常下载中，可模拟网络异常',
    interrupted: '下载已暂停，等待确认提示',
    recovering: '网络异常，确认后 5 秒模拟恢复'
  }[state];
  renderFirmwareProgress(firmwareProgress);
}

function clearFirmwareNetwork() {
  window.clearTimeout(firmwareNetworkRecoveryTimer);
  firmwareNetworkRecoveryTimer = null;
  if (firmwareNetworkDialog.open) firmwareNetworkDialog.close();
  renderFirmwareNetwork('online');
}

function leaveFirmwareProgress() {
  stopFirmwareProgress();
  clearFirmwareNetwork();
  firmwareProgressDemo.hidden = true;
}

firmwareNetworkErrorButton.addEventListener('click', () => {
  if (firmwareProgressScreen.hidden || !firmwareProgressTimer || firmwareNetworkPaused || firmwareProgress >= 100) return;
  renderFirmwareNetwork('interrupted');
  firmwareNetworkDialog.showModal();
});
firmwareNetworkDialog.addEventListener('cancel', event => event.preventDefault());
document.querySelector('#firmware-network-confirm').addEventListener('click', () => {
  if (!firmwareNetworkDialog.open) return;
  firmwareNetworkDialog.close();
  renderFirmwareNetwork('recovering');
  window.clearTimeout(firmwareNetworkRecoveryTimer);
  firmwareNetworkRecoveryTimer = window.setTimeout(() => {
    firmwareNetworkRecoveryTimer = null;
    if (firmwareProgressScreen.hidden || !firmwareProgressTimer) return;
    renderFirmwareNetwork('online');
  }, FIRMWARE_NETWORK_RECOVERY_MS);
});

function startFirmwareProgress() {
  stopFirmwareProgress();
  clearFirmwareNetwork();
  renderFirmwareProgress(0);
  firmwareProgressDemo.hidden = false;
  firmwareProgressTimer = window.setInterval(() => {
    if (firmwareNetworkPaused) return;
    const next = Math.min(100, firmwareProgress + FIRMWARE_PROGRESS_STEP);
    renderFirmwareProgress(next);
    if (next < 100) return;
    /* 满 100% 自动进“更新完成”，并停掉定时器，避免回到首页还在跑 */
    stopFirmwareProgress();
    firmwareCompletionTimer = window.setTimeout(() => openReuseScreen('firmwareDone'), 320);
  }, FIRMWARE_PROGRESS_STEP_MS);
}

/* 首页任务控制面板下方的提醒条 → 带固件更新上下文进设备设置页。
   点过即视为「本次提醒已处理」：返回打印页后隐藏，刷新/重进时恢复。
   设备事实与设置页展示上下文保持独立。 */
firmwareBanner.addEventListener('click', () => {
  setFirmwareBannerHandled(true);
  setFirmwareSettingsHasUpdate(true);
  openReuseScreen('deviceSettings');
});
/* 固件版本行：带上下文进来才落在固件升级页，平时只是看看当前版本 */
document.querySelector('#open-firmware-version').addEventListener('click', () => {
  openReuseScreen(firmwareHasUpdateContext() ? 'firmwareUpgrade' : 'firmwareVersion');
});
document.querySelector('#firmware-upgrade-back').addEventListener('click', goBackInReuseScreens);
document.querySelector('#firmware-version-back').addEventListener('click', goBackInReuseScreens);
/* 立即升级 → 确认弹窗（左侧“取消”白底黑边框，右侧“确认升级”实心） → 升级进度页 */
document.querySelector('#firmware-upgrade-now').addEventListener('click', () => {
  firmwareDialogTitle.textContent = `最新版本：${FIRMWARE_LATEST_VERSION}，是否确认升级`;
  firmwareDialog.showModal();
});
document.querySelector('#firmware-dialog-cancel').addEventListener('click', () => firmwareDialog.close());
document.querySelector('#firmware-dialog-confirm').addEventListener('click', () => {
  firmwareDialog.close();
  openReuseScreen('firmwareProgress');
  startFirmwareProgress();
});
/* 更新完成页“我知道了”：收起全部浮层回到打印页首页，并把固件标记为已更新 */
document.querySelector('#firmware-done-ok').addEventListener('click', () => {
  stopFirmwareProgress();
  closeReuseScreens();
  setFirmwareUpdateAvailable(false);
  showToast('固件已更新到最新版本');
});

/* ---------- 设备设置 / 打印选项 / 延时摄影 / 风扇滤芯 复用页面跳转 ---------- */
document.querySelector('#open-print-options').addEventListener('click', () => openReuseScreen('printOptions'));
document.querySelector('#open-timelapse-settings').addEventListener('click', () => openReuseScreen('timelapse'));
document.querySelector('#open-fan-alert').addEventListener('click', () => openReuseScreen('fanAlert'));
document.querySelector('#device-settings-back').addEventListener('click', goBackInReuseScreens);
document.querySelector('#print-options-back').addEventListener('click', goBackInReuseScreens);
document.querySelector('#fan-filter-back').addEventListener('click', goBackInReuseScreens);
document.querySelector('#fan-alert-back').addEventListener('click', goBackInReuseScreens);

/* ---------- 延时摄影模型列表页（真实 DOM） ----------
   原先这里是整图铺满的「延时摄影页.png」三联图，只能点热区、状态切不动；
   现按原图量取的坐标用真实 DOM 复现，三屏对应同一页面的三个状态：
     未下载 → 点「下载」→ 缩略图上出现进度环 + 按钮变「下载中…」→ 跑满 → 变「播放」且缩略图中央出现 ▶
   顶栏右侧删除进入多选态，可勾选多个模型批量删除，未选中的保留。
   模型数据（名称 / 时长 / 克重 / 缩略图）与原图完全一致。 */
const TIMELAPSE_DOWNLOAD_STEP_MS = 90;
const TIMELAPSE_DOWNLOAD_STEP = 4;
const timelapseList = document.querySelector('#timelapse-list');
const timelapseEmpty = document.querySelector('#timelapse-empty');
const timelapseDeleteBar = document.querySelector('#timelapse-delete-bar');
const timelapseDeleteButton = document.querySelector('#open-timelapse-delete');
const timelapseDeleteConfirm = document.querySelector('#timelapse-delete-confirm');
const timelapseDeleteCancel = document.querySelector('#timelapse-delete-cancel');
/* 缩略图裁自 原型修改复用图片资源/延时摄影页.png，见 assets/_tools_make_timelapse_assets.py */
const timelapseCatalog = [
  { id: 'tl-1', name: '史蒂夫_01', duration: '5 h 15 min', grams: '62g', thumb: 'assets/延时摄影-模型1.png' },
  { id: 'tl-2', name: '史蒂夫_02_012209', duration: '3 h 48 min', grams: '50g', thumb: 'assets/延时摄影-模型2.png' },
  { id: 'tl-3', name: '史蒂夫_03_012207', duration: '1 h 35 min', grams: '20g', thumb: 'assets/延时摄影-模型3.png' }
];
/* status: idle（未下载）→ downloading（下载中）→ ready（可播放）；deleted 的项直接从列表移除 */
const timelapseItems = new Map();
let timelapsePicking = false;
const timelapsePicked = new Set();

const ICON_CLOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.4"/><path d="M12 7.4V12l3 1.8"/></svg>';
const ICON_WEIGHT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.4 9.2h11.2l1.6 9.4a1.4 1.4 0 0 1-1.4 1.6H6.2a1.4 1.4 0 0 1-1.4-1.6z"/><path d="M9.4 9.2a2.6 2.6 0 0 1 5.2 0"/></svg>';

function buildTimelapseItem(model) {
  const item = document.createElement('li');
  item.className = 'timelapse-item';
  item.dataset.timelapseId = model.id;
  item.innerHTML = `
    <div class="timelapse-card">
      <div class="timelapse-thumb">
        <img src="${model.thumb}" alt="${model.name} 模型缩略图">
        <span class="timelapse-ring" hidden aria-hidden="true">
          <span class="timelapse-ring-text"><span data-role="percent">0%</span><small>下载中</small></span>
        </span>
        <span class="timelapse-play-badge" hidden aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M8.5 5.2 19 12l-10.5 6.8z"/></svg>
        </span>
        <span class="timelapse-checkmark" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M5 12.5 10 17.5 19 7"/></svg>
        </span>
      </div>
      <div class="timelapse-meta">
        <p class="timelapse-name">${model.name}</p>
        <ul class="timelapse-sub">
          <li>${ICON_CLOCK}<span>${model.duration}</span></li>
          <li>${ICON_WEIGHT}<span>${model.grams}</span></li>
        </ul>
      </div>
    </div>
    <button class="timelapse-cta" type="button">
      <span class="timelapse-progress" data-role="bar" aria-hidden="true"></span>
      <span class="timelapse-cta-label" data-role="label">下载</span>
    </button>`;

  const state = { model, el: item, status: 'idle', progress: 0, timer: null };
  timelapseItems.set(model.id, state);

  item.querySelector('.timelapse-cta').addEventListener('click', () => {
    /* 多选删除态下点按钮不下载，避免误触 */
    if (timelapsePicking) return;
    if (state.status === 'idle') startTimelapseDownload(state);
    else if (state.status === 'ready') showToast(`开始播放「${model.name}」的延时摄影`);
  });
  /* 多选态：点卡片切换勾选 */
  item.querySelector('.timelapse-card').addEventListener('click', () => {
    if (!timelapsePicking) return;
    toggleTimelapsePick(model.id);
  });
  /* 初始态也走一次渲染，保证 data-status 等状态属性从一开始就存在（不只靠 HTML 里的静态文案） */
  renderTimelapseItem(state);
  return state;
}

function renderTimelapseItem(state) {
  const cta = state.el.querySelector('.timelapse-cta');
  const label = state.el.querySelector('[data-role="label"]');
  const bar = state.el.querySelector('[data-role="bar"]');
  const ring = state.el.querySelector('.timelapse-ring');
  const badge = state.el.querySelector('.timelapse-play-badge');
  const percent = state.el.querySelector('[data-role="percent"]');

  if (state.status === 'idle') {
    label.textContent = '下载';
    cta.disabled = false;
    bar.style.width = '0%';
    ring.hidden = true;
    badge.hidden = true;
  } else if (state.status === 'downloading') {
    label.textContent = '下载中…';
    cta.disabled = true;
    bar.style.width = `${state.progress}%`;
    ring.hidden = false;
    ring.style.setProperty('--tl-progress', String(state.progress));
    percent.textContent = `${state.progress}%`;
    badge.hidden = true;
  } else {
    label.textContent = '播放';
    cta.disabled = false;
    /* 原图第三屏的「播放」是白底绿描边，不带下载中的那条浅绿进度底，所以这里收成 0 */
    bar.style.width = '0%';
    ring.hidden = true;
    badge.hidden = false;
  }
  state.el.dataset.status = state.status;
}

function stopTimelapseDownload(state) {
  window.clearInterval(state.timer);
  state.timer = null;
}

function startTimelapseDownload(state) {
  stopTimelapseDownload(state);
  state.status = 'downloading';
  state.progress = 0;
  renderTimelapseItem(state);
  state.timer = window.setInterval(() => {
    state.progress = Math.min(100, state.progress + TIMELAPSE_DOWNLOAD_STEP);
    if (state.progress >= 100) {
      stopTimelapseDownload(state);
      state.status = 'ready';
      renderTimelapseItem(state);
      return;
    }
    renderTimelapseItem(state);
  }, TIMELAPSE_DOWNLOAD_STEP_MS);
}

function toggleTimelapsePick(id) {
  if (timelapsePicked.has(id)) timelapsePicked.delete(id);
  else timelapsePicked.add(id);
  const state = timelapseItems.get(id);
  state.el.classList.toggle('is-picked', timelapsePicked.has(id));
  renderTimelapseDeleteBar();
}

function renderTimelapseDeleteBar() {
  const count = timelapsePicked.size;
  timelapseDeleteConfirm.disabled = count === 0;
  timelapseDeleteConfirm.textContent = count ? `删除（${count}）` : '删除';
  timelapseDeleteBar.hidden = !timelapsePicking;
}

function setTimelapsePicking(picking) {
  timelapsePicking = picking;
  if (!picking) {
    timelapsePicked.clear();
    timelapseItems.forEach((state) => state.el.classList.remove('is-picking', 'is-picked'));
  } else {
    timelapseItems.forEach((state) => { if (!state.el.hidden) state.el.classList.add('is-picking'); });
  }
  timelapseDeleteButton.setAttribute('aria-pressed', String(picking));
  renderTimelapseDeleteBar();
}

function deletePickedTimelapse() {
  const count = timelapsePicked.size;
  timelapsePicked.forEach((id) => {
    const state = timelapseItems.get(id);
    stopTimelapseDownload(state);
    state.el.hidden = true;
    state.el.classList.remove('is-picked', 'is-picking');
  });
  timelapsePicked.clear();
  setTimelapsePicking(false);
  /* 全部删完时给一句空态说明 */
  timelapseEmpty.hidden = [...timelapseItems.values()].some((state) => !state.el.hidden);
  showToast(count > 1 ? `已删除 ${count} 个延时摄影文件` : '已删除 1 个延时摄影文件');
}

timelapseCatalog.forEach((model) => timelapseList.appendChild(buildTimelapseItem(model).el));
document.querySelector('#timelapse-screen-back').addEventListener('click', goBackInReuseScreens);
timelapseDeleteButton.addEventListener('click', () => {
  /* 全部删完就没有可删的了，直接退出多选态 */
  const hasItems = [...timelapseItems.values()].some((state) => !state.el.hidden);
  if (!hasItems) return;
  setTimelapsePicking(!timelapsePicking);
});
timelapseDeleteCancel.addEventListener('click', () => setTimelapsePicking(false));
timelapseDeleteConfirm.addEventListener('click', deletePickedTimelapse);

/* 摄像头区域右上角“延时摄影”按钮：跳转延时摄影模型列表页 */
timelapseActionButton.addEventListener('click', () => openReuseScreen('timelapse'));


/* ---------- 添加打印机 → 配置新的打印机 ---------- */
/* 仅为当前页面的发现/绑定演示数据；已有 Owner 的设备必须通过分享使用。 */
const myPrintersList = document.querySelector('#my-printers-list');
const printerBoundDialog = document.querySelector('#printer-bound-dialog');
document.querySelector('#printer-ug01').addEventListener('click', () => printerBoundDialog.showModal());
myPrintersList.addEventListener('click', (event) => {
  const card = event.target.closest('.printer-card');
  if (!card) return;
  myPrintersList.querySelectorAll('.printer-card').forEach(item => item.setAttribute('aria-pressed', String(item === card)));
});
document.querySelector('#printer-ug02').addEventListener('click', (event) => {
  const card = event.currentTarget;
  if (card.parentElement === myPrintersList) return;
  const status = document.createElement('span');
  status.className = 'printer-status';
  status.textContent = '已连接';
  card.querySelector('.printer-card-copy').append(status);
  myPrintersList.append(card);
  myPrintersList.querySelectorAll('.printer-card').forEach(item => item.setAttribute('aria-pressed', String(item === card)));
  document.querySelector('#printer-add-announcement').textContent = 'UG-02 已连接，已加入我的打印机。';
});
document.querySelector('#add-printer-back').addEventListener('click', goBackInReuseScreens);
document.querySelector('#configure-new-printer').addEventListener('click', () => {
  /* 真实跳转到首次配网连接流程原型的第二页「选择要设置的打印机」 */
  window.location.href = `${PAIRING_FLOW_PATH}?screen=printer-select`;
});

/* ---------- 移除打印机 → 确认后的跳转逻辑演示 ---------- */
document.querySelector('#open-remove-printer').addEventListener('click', () => openReuseScreen('removePrinter'));
document.querySelector('#remove-printer-back').addEventListener('click', goBackInReuseScreens);
document.querySelector('#remove-printer-cancel').addEventListener('click', goBackInReuseScreens);
document.querySelector('#remove-printer-confirm').addEventListener('click', () => openReuseScreen('logicDemo'));
document.querySelector('#logic-demo-back').addEventListener('click', goBackInReuseScreens);
/* IF 已有其他打印机：直接回到打印页，等于自动连接到「我的打印机」第一台 */
document.querySelector('#logic-demo-existing').addEventListener('click', () => {
  closeReuseScreens();
  showToast('已自动连接「我的打印机」第一台：Ugee Funbox');
});
/* ELSE 没有其他打印机：回到首次配网连接流程原型首页 */
document.querySelector('#logic-demo-none').addEventListener('click', () => {
  window.location.href = PAIRING_FLOW_PATH;
});

/* ---------- 耗材设置与三个子页面 ---------- */
document.querySelector('#open-material-settings').addEventListener('click', () => openReuseScreen('materialSettings'));
document.querySelector('#filament-detected-settings').addEventListener('click', () => {
  document.querySelector('#filament-detected-dialog').close();
  openReuseScreen('materialSettings');
});
document.querySelector('#material-settings-back').addEventListener('click', goBackInReuseScreens);
document.querySelector('#open-material-name').addEventListener('click', () => openReuseScreen('materialName'));
document.querySelector('#open-material-type').addEventListener('click', () => openReuseScreen('materialType'));
document.querySelector('#open-material-color').addEventListener('click', () => openReuseScreen('materialColor'));
document.querySelector('#material-name-cancel').addEventListener('click', goBackInReuseScreens);
document.querySelector('#material-name-confirm').addEventListener('click', goBackInReuseScreens);
document.querySelector('#material-name-return').addEventListener('click', goBackInReuseScreens);
/* 类型页 / 颜色页：点击页面任意位置返回耗材设置 */
document.querySelector('#material-type-anywhere').addEventListener('click', goBackInReuseScreens);
document.querySelector('#material-color-anywhere').addEventListener('click', goBackInReuseScreens);

/* ---------- 探索玩具 → 模型详情 → 准备打印 → 选择耗材 / 无耗材 ---------- */
document.querySelector('#explore-toys-anywhere').addEventListener('click', () => openReuseScreen('modelDetail'));
document.querySelector('#explore-toys-back').addEventListener('click', closeReuseScreens);
document.querySelector('#open-prepare-print').addEventListener('click', () => {
  openReuseScreen('preparePrint');
});
/* HTML 盘行保留原来的槽位几何，拖动直接更新整张 DOM 卡片的位置。 */
const plateSlotCenters = [0.28148, 0.45926, 0.63852].map(top => top + 0.08);
const plateRows = [...plateList.querySelectorAll('.plate-row')];
let plateOrder = plateRows.filter(row => modelPlateIds.includes(row.dataset.plate)).map(row => row.dataset.plate);
plateRows.forEach(row => { row.hidden = !modelPlateIds.includes(row.dataset.plate); });
let selectedPlate = '1';
let plateDrag = null;
let suppressPlateClick = false;
function renderPlateSelection() {
  plateRows.forEach((row) => row.setAttribute('aria-selected', String(row.dataset.plate === selectedPlate)));
}

function applyPlateOrder(order) {
  plateOrder = order;
  plateOrder.forEach((plate, slot) => {
    const row = plateRows.find((item) => item.dataset.plate === plate);
    if (row) row.dataset.slot = String(slot);
  });
}

function selectPlate(plate) {
  selectedPlate = plate;
  renderPlateSelection();
}

function startPlateDrag(event, row) {
  if (event.button !== undefined && event.button !== 0) return;
  const stageRect = prepareStage.getBoundingClientRect();
  const rowRect = row.getBoundingClientRect();
  plateDrag = {
    row,
    startY: event.clientY,
    baseTop: rowRect.top - stageRect.top,
    stageHeight: stageRect.height,
    rowHeight: rowRect.height,
    startSlot: Number(row.dataset.slot),
    previewOrder: [...plateOrder],
    moved: false
  };
  row.classList.add('is-dragging');
}

function updatePlateDrag(event) {
  if (!plateDrag) return;
  const dy = event.clientY - plateDrag.startY;
  if (Math.abs(dy) > 4) plateDrag.moved = true;
  plateDrag.row.style.transform = `translateY(${dy}px)`;
  const centerFraction = (plateDrag.baseTop + dy + plateDrag.rowHeight / 2) / plateDrag.stageHeight;
  let target = 0;
  let bestDistance = Infinity;
  plateSlotCenters.forEach((slotCenter, index) => {
    const distance = Math.abs(slotCenter - centerFraction);
    if (distance < bestDistance) { bestDistance = distance; target = index; }
  });
  const draggedPlate = plateDrag.row.dataset.plate;
  const withoutDragged = plateOrder.filter((plate) => plate !== draggedPlate);
  const nextOrder = [...withoutDragged.slice(0, target), draggedPlate, ...withoutDragged.slice(target)];
  if (nextOrder.join() !== plateDrag.previewOrder.join()) {
    plateDrag.previewOrder = nextOrder;
    nextOrder.forEach((plate, slot) => {
      if (plate === draggedPlate) return;
      const row = plateRows.find((item) => item.dataset.plate === plate);
      if (row) row.dataset.slot = String(slot);
    });
  }
}

function endPlateDrag() {
  if (!plateDrag) return;
  const { row, moved, previewOrder } = plateDrag;
  row.classList.remove('is-dragging');
  row.style.transform = '';
  if (moved) applyPlateOrder(previewOrder);
  suppressPlateClick = moved;
  plateDrag = null;
}

plateRows.forEach((row) => {
  row.querySelector('.plate-row-hit').addEventListener('pointerdown', (event) => startPlateDrag(event, row));
  row.querySelector('.plate-row-hit').addEventListener('click', () => {
    if (suppressPlateClick) { suppressPlateClick = false; return; }
    selectPlate(row.dataset.plate);
  });
});
window.addEventListener('pointermove', updatePlateDrag);
window.addEventListener('pointerup', endPlateDrag);
window.addEventListener('pointercancel', endPlateDrag);

/* 任务状态版保留未盖戳盘的选择，耗材为静态信息。 */
stateRows.forEach((row) => {
  row.querySelector('.state-row-hit').addEventListener('click', () => selectStateRow(row.dataset.row));
});
document.querySelector('#prepare-state-back').addEventListener('click', closeReuseScreens);
document.querySelector('#prepare-state-start').addEventListener('click', () => {
  if (prepareStateStart.disabled) return;
  if (!validatePrintFilament()) return;
  startQueuedTask(selectedQueuedTask(), 'printing');
});

/* 带参数回到打印页：切换当前任务盘并落到指定状态 */
function goToPrinterState(plate, status) {
  /* 模型入口提交新批次；旧执行结果不会被重建为等待任务。 */
  for (const id of modelPlateIds.map(item => `plate-${item}`)) taskResults.delete(id);
  completedPlates.clear();
  familyQueueTasks = [
    ...plateOrder.filter(item => item !== plate && modelPlateIds.includes(item)).map(item => taskCatalog[`plate-${item}`]),
    ...familyQueueTasks.filter(task => task.owner === 'girl')
  ];
  const next = taskSessionUrl(status);
  next.searchParams.set('plate', plate);
  next.searchParams.set('status', status);
  next.searchParams.delete('activeTask');
  next.searchParams.delete('screen');
  window.location.href = next.href;
}

renderPlateSelection();
/* 首屏固件是有新版本的：提醒条与设备设置页的橙色文案都按 firmwareUpdateAvailable 显示 */
setFirmwareUpdateAvailable(true);
/* 准备打印页打印机卡片右侧的“切换” → 添加打印机页 */
document.querySelector('#prepare-switch-printer').addEventListener('click', () => openReuseScreen('addPrinter'));
document.querySelector('#prepare-state-switch-printer').addEventListener('click', () => openReuseScreen('addPrinter'));
document.querySelector('#model-detail-back').addEventListener('click', goBackInReuseScreens);
document.querySelector('#prepare-print-back').addEventListener('click', goBackInReuseScreens);

/* ---------- 盘缩略图左上角的 3D 图标 → 3D 预览页 ---------- */
/* 空闲版（.plate-row）与任务状态版（.state-row）共用同一颗图标；
   点它只做「看」的预览，不改变盘的选择态与耗材状态，所以不冒泡到盘行热区 */
document.querySelectorAll('.plate-3d-btn').forEach((button) => {
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    if (button.disabled) return;
    const row = button.closest('.plate-row, .state-row');
    const index = row ? (row.dataset.plate || row.dataset.row) : null;
    openPreview3D({
      plateLabel: button.dataset.previewPlate || (index ? `盘 ${index}` : ''),
      name: button.dataset.previewName || '',
      duration: button.dataset.previewDuration || '',
      grams: button.dataset.previewGrams || ''
    });
  });
});
/* 左上角回退：出栈回到进来时的准备打印页（空闲版或任务状态版） */
document.querySelector('#preview-3d-back').addEventListener('click', goBackInReuseScreens);

/* ---------- 准备打印页：延时摄影勾选 + 开始打印 ---------- */
/* 勾选状态由 aria-checked 驱动真实 HTML 勾选框。 */
function bindTimelapseToggle(button) {
  button.addEventListener('click', () => {
    const nextChecked = button.getAttribute('aria-checked') !== 'true';
    button.setAttribute('aria-checked', String(nextChecked));
    showToast(nextChecked ? '已勾选延时摄影，本次打印将同步录制' : '已取消勾选延时摄影');
  });
}
bindTimelapseToggle(document.querySelector('#timelapse-toggle'));
bindTimelapseToggle(document.querySelector('#prepare-state-toggle'));

/* 底部“开始打印”：带着当前选中的盘回到打印页，并把任务面板切到“准备中” */
document.querySelector('#start-print').addEventListener('click', () => {
  if (document.querySelector('#start-print').disabled || !handlePreparePrinterState()) return;
  if (!validatePrintFilament()) return;
  goToPrinterState(selectedPlate, 'preparing');
});

/* 准备页设备状态独立于工作台当前执行任务；切换演示状态不改写执行任务。 */
const PREPARE_PRINTER_LABELS = { idle: '空闲', offline: '离线', busy: '忙碌', connecting: '连接中' };
let preparePrinterStatus = Object.hasOwn(PREPARE_PRINTER_LABELS, params.get('preparePrinter')) ? params.get('preparePrinter') : 'idle';
let prepareBatchSubmitted = params.get('prepareSubmitted') === 'yes';
const preparePrinterControl = document.querySelector('#simulation-prepare-printer');
function renderPreparePrinterState() {
  const label = prepareStage.querySelector('.prepare-idle');
  label.dataset.printerState = preparePrinterStatus;
  label.innerHTML = `<i aria-hidden="true"></i>${PREPARE_PRINTER_LABELS[preparePrinterStatus]}`;
  preparePrinterControl.value = preparePrinterStatus;
  const start = document.querySelector('#start-print');
  start.disabled = prepareBatchSubmitted;
  start.setAttribute('aria-label', prepareBatchSubmitted ? '开始打印（本次任务已加入队列）' : '开始打印');
}
preparePrinterControl.addEventListener('change', event => {
  preparePrinterStatus = event.target.value;
  toast.classList.remove('is-visible');
  renderPreparePrinterState();
  const next = taskSessionUrl();
  next.searchParams.set('preparePrinter', preparePrinterStatus);
  history.replaceState(null, '', next);
});
function handlePreparePrinterState() {
  if (preparePrinterStatus === 'offline' || preparePrinterStatus === 'connecting') {
    showToast(preparePrinterStatus === 'offline' ? '打印机已离线' : '打印机连接中', 'prepare');
    return false;
  }
  if (preparePrinterStatus !== 'busy') return true;
  const order = [selectedPlate, ...plateOrder.filter(plate => plate !== selectedPlate)].filter(plate => modelPlateIds.includes(plate));
  const tasks = order.map(plate => preparedTaskCatalog[`prepared-${plate}`]);
  if (tasks.some(task => familyQueueTasks.some(queued => queued.id === task.id) || task.id === activeTaskId || taskResults.has(task.id))) return false;
  familyQueueTasks.push(...tasks);
  prepareBatchSubmitted = true;
  renderPlateTaskAndQueue();
  renderPreparePrinterState();
  const next = taskSessionUrl();
  next.searchParams.set('screen', 'prepare-print');
  next.searchParams.set('preparePrinter', 'busy');
  next.searchParams.set('prepareSubmitted', 'yes');
  history.replaceState(null, '', next);
  showToast('打印机正忙碌，打印任务已添加至打印队列', 'prepare');
  return false;
}
renderPreparePrinterState();

function setFilamentFed(fed) {
  filamentPanel.dataset.filamentFed = fed ? 'yes' : 'no';
  const control = document.querySelector('#simulation-filament-fed');
  if (control) control.value = filamentPanel.dataset.filamentFed;
  window.history.replaceState(null, '', taskSessionUrl());
}

function validatePrintFilament() {
  if (filamentPanel.dataset.filamentSensor !== 'present') {
    document.querySelector('#print-filament-required-dialog').showModal();
    return false;
  }
  return true;
}

function returnToPrintPreparation() {
  if (!filamentGuideReturnStack?.length) return;
  const stack = filamentGuideReturnStack;
  filamentGuideReturnStack = null;
  const name = stack.pop();
  reuseStack = stack;
  openReuseScreen(name);
}

/* 模型颜色保持不变，下方使用独立空料盘图标和原有红色警示符号。 */
function renderPrepareFilamentState() {
  const empty = filamentPanel.dataset.filamentSensor !== 'present';
  document.querySelectorAll('.prepare-material').forEach(material => {
    const image = material.querySelector('.prepare-spool');
    if (!image) return;
    if (material.dataset.materialRenderedLabel && material.getAttribute('aria-label') !== material.dataset.materialRenderedLabel) {
      material.dataset.materialDefaultLabel = material.getAttribute('aria-label');
    }
    if (!material.dataset.materialDefaultLabel) {
      material.dataset.materialDefaultLabel = material.getAttribute('aria-label');
      material.dataset.materialDefaultWarning = String(material.classList.contains('prepare-material--mismatch'));
      image.dataset.loadedSrc = image.getAttribute('src');
      image.dataset.loadedAlt = image.alt;
    }
    let warning = material.querySelector('.prepare-mismatch');
    if (!warning) {
      warning = document.createElement('span');
      warning.className = 'prepare-mismatch';
      warning.setAttribute('role', 'img');
      warning.textContent = '!';
      material.querySelector('.prepare-material-body').append(warning);
    }
    material.classList.toggle('prepare-material--empty', empty);
    image.src = empty ? 'assets/prepare-empty-spool.svg' : image.dataset.loadedSrc;
    image.alt = empty ? '未安装耗材' : image.dataset.loadedAlt;
    const color = material.querySelector('.prepare-loaded-color');
    if (color) color.hidden = empty;
    warning.hidden = !empty && material.dataset.materialDefaultWarning !== 'true';
    warning.setAttribute('aria-label', empty ? '未检测到耗材' : '颜色不匹配');
    warning.title = empty ? '未安装耗材，请先安装并进料' : '模型颜色与耗材颜色不匹配';
    material.setAttribute('aria-label', empty ? `${material.querySelector('.prepare-material-color').textContent}模型，未检测到耗材，请先安装并进料` : material.dataset.materialDefaultLabel);
    if (filamentBackpack.active) prepareBackpack.renderMaterial(material, warning);
    else prepareBackpack.restoreMaterial(material);
    material.dataset.materialRenderedLabel = material.getAttribute('aria-label');
  });
  if (prepareBackpack.dialog.open) prepareBackpack.renderPicker();
}

document.querySelector('#print-filament-go-feed').addEventListener('click', () => {
  document.querySelector('#print-filament-required-dialog').close();
  filamentGuideReturnStack = [...reuseStack];
  closeReuseScreens();
  openFilamentGuide('feed');
});

/* ---------- 风扇滤芯更换标签 ---------- */
fanFilterBanner.addEventListener('click', () => openReuseScreen('fanFilter'));
fanFilterReplacedButton.addEventListener('click', () => {
  closeReuseScreens();
  fanFilterHours.textContent = '400h';
  fanFilterBanner.setAttribute('aria-label', '当前风扇剩余400h需要更换滤芯，前往风扇滤芯更换');
  showToast('已更换滤芯，风扇剩余 400h');
});

/* ---------- 耗材面板：进退料入口始终可用，料盘选择仅用于展示 ---------- */
function renderFilamentPanel() {
  renderPrepareFilamentState();
  if (filamentBackpack.active) return filamentBackpack.render();
  const hasFilament = filamentPanel.dataset.filamentPresence !== 'empty';
  const state = filamentPanel.dataset.filamentState || 'idle';
  const statusLabel = hasFilament ? FILAMENT_STATUS_LABELS[state] || '' : '';
  const loadBusy = state === 'feeding';
  const unloadBusy = state === 'retracting';
  filamentPanel.dataset.filamentInstallation = hasFilament ? 'installed' : 'first-install';
  filamentPanel.setAttribute('aria-label', hasFilament ? '耗材控制面板' : '耗材控制面板，首次安装耗材');

  document.querySelector('#filament-empty-message').hidden = hasFilament;
  document.querySelector('#filament-empty-title').hidden = hasFilament;
  filamentSpoolButton.hidden = !hasFilament;
  document.querySelector('#open-material-settings').hidden = !hasFilament;
  document.querySelector('#filament-panel-image').alt = hasFilament ? '耗材-料架面板，包含蓝色耗材料盘以及进料、退料按钮' : '耗材-无，当前未检测到耗材';

  filamentStatus.hidden = !statusLabel;
  filamentStatus.textContent = statusLabel;

  filamentSpoolButton.classList.toggle('is-selected', filamentSpoolSelected);
  filamentSpoolButton.setAttribute('aria-pressed', String(filamentSpoolSelected));
  filamentSpoolButton.setAttribute('aria-label', filamentSpoolSelected ? '料架上的蓝色耗材料盘，已选择' : '选择料架上的蓝色耗材料盘');

  /* 入口不依赖料盘选中、耗材有无或当前操作状态。 */
  loadFilamentButton.disabled = false;
  loadFilamentButton.classList.add('is-active');
  loadFilamentButton.classList.toggle('is-busy', loadBusy);
  loadFilamentButton.textContent = loadBusy ? '进料中...' : '进料';
  loadFilamentButton.setAttribute('aria-label', loadBusy ? '进料中，点击查看进料进度' : '进料');

  unloadFilamentButton.disabled = false;
  unloadFilamentButton.classList.add('is-active');
  unloadFilamentButton.classList.toggle('is-busy', unloadBusy);
  unloadFilamentButton.textContent = unloadBusy ? '退料中...' : '退料';
  unloadFilamentButton.setAttribute('aria-label', unloadBusy ? '退料中，点击查看退料进度' : '退料');
}

/* 点击料盘仅记录选中状态，不添加圆圈高光。 */
filamentSpoolButton.addEventListener('click', () => {
  filamentSpoolSelected = true;
  renderFilamentPanel();
});

/* ==========================================================================
   进料中 / 退料中：真实页面 + 时间轴状态机（R005）
   - 进料 2 步 = 加热喷嘴温度 → 吐出耗材丝；
     退料 2 步 = 加热喷嘴温度 → 退出当前耗材（步骤条第 3 点是「退料完成」完成态）
   - 「回退」只离开页面、进程继续（可随时点回面板按钮回到进度页）；
     点「取消」二次确认后中止进程并回到打印页
   ========================================================================== */
const FO_START_DEGREE = 28;
const FO_TARGET_DEGREE = 200;
const FO_ARC_LENGTH = 681.1;   /* 2πr，r = 108.4 */
/* 页面/步骤配置：文案与插画都取自设计稿（原型修改复用图片资源/进料中.png、退料中.png） */
const FO_CONFIG = {
  feed: {
    title: '进料中',
    hint: '可退出页面，进料将继续进行',
    steps: [
      { key: 'heat', label: '加热喷嘴温度' },
      { key: 'push', label: '吐出耗材丝', art: 'assets/耗材操作-进料-送出新耗材.png' }
    ],
    done: { label: '进料完成', art: 'assets/耗材操作-进料-送出新耗材.png' }
  },
  retract: {
    completionNode: true,
    title: '退料中',
    hint: '可退出页面，退料将继续进行',
    steps: [
      { key: 'heat', label: '加热喷嘴温度' },
      { key: 'pull', label: '退出当前耗材', art: 'assets/耗材操作-退料-退出当前耗材.png' }
    ],
    done: { label: '退料完成，请将耗材从料管中抽出', art: 'assets/耗材操作-退料-退料完成.png' }
  }
};
const foConfig = {
  tick: 100,
  heat: 10000,      /* 加热喷嘴温度：耗时较长 */
  move: 5000,       /* 吐出耗材丝 / 退出耗材 */
  tipAt: 6000,      /* 进入页面后 6s 弹「加热时间较长，请耐心等待」（需求要求 5~10s 内） */
  tipHide: 4000
};
const foState = {
  operation: null,          /* 'feed' | 'retract' | null */
  step: 1,
  elapsed: 0,
  degree: FO_START_DEGREE,
  progress: 0,
  running: false,
  done: false,
  tipShown: false,
  panelStateBefore: 'idle'
};
let foTimer = 0;
let foTipTimer = 0;

function foNodeLabels(config) {
  const labels = config.steps.map((step) => step.label);
  if (config.completionNode) labels.push(config.done.label);
  return labels;
}

function foActiveStep() {
  const config = FO_CONFIG[foState.operation];
  if (!config) return null;
  return foState.done ? config.done : config.steps[foState.step - 1];
}

function foActiveNode() {
  if (!foState.operation) return 0;
  const count = foNodeLabels(FO_CONFIG[foState.operation]).length;
  return foState.done ? count : Math.min(count, foState.step);
}

function foRender() {
  const config = FO_CONFIG[foState.operation];
  if (!config) return;
  const step = foActiveStep();
  const heating = foState.step === 1 && !foState.done;
  const progress = foState.done ? 1 : foState.progress;
  const activeNode = foActiveNode();
  const labels = foNodeLabels(config);
  filamentOperationScreen.dataset.operation = foState.operation;
  filamentOperationScreen.dataset.step = String(foState.step);
  filamentOperationScreen.dataset.phase = foState.done ? 'done' : 'running';

  /* 步骤条：当前点及之前的圆点与连接线都为橙色 */
  [...filamentOperationSteps.children].forEach((node, index) => {
    const order = index + 1;
    node.hidden = order > labels.length;
    const line = node.querySelector('.fo-step-line');
    if (line) line.hidden = order >= labels.length;
    node.dataset.state = foState.done || order < activeNode ? 'done' : order === activeNode ? 'active' : 'todo';
    node.setAttribute('aria-label', `${order}. ${labels[index] || ''}`);
  });

  /* 标题与提示胶囊 */
  filamentOperationTitle.textContent = config.title;
  filamentOperationHint.textContent = config.hint;
  const operationName = foState.operation === 'feed' ? '进料' : '退料';
  filamentOperationScreen.setAttribute('aria-label', config.title);
  filamentOperationBack.setAttribute('aria-label', `返回打印机页面，${operationName}将继续进行`);

  /* 圆环：加热步是整圈橙色环（脉冲表示进行中），其余按进度画弧 */
  filamentOperationRing.classList.toggle('is-heating', heating);
  filamentOperationArc.style.strokeDashoffset = String(-FO_ARC_LENGTH * (1 - (heating ? 1 : progress)));
  filamentOperationPercent.classList.toggle('is-hidden', heating);
  filamentOperationPercent.textContent = `${Math.round(progress * 100)}%`;

  /* 中心内容：加热步显示温度，其余显示插画 */
  filamentOperationTemp.hidden = !heating;
  filamentOperationArt.hidden = heating;
  if (!heating && step.art) {
    if (!filamentOperationArt.getAttribute('src').endsWith(step.art)) filamentOperationArt.src = step.art;
    filamentOperationArt.alt = `耗材操作示意：${step.label}`;
  }
  filamentOperationDegree.textContent = String(Math.round(foState.degree));

  /* 当前步骤胶囊 */
  filamentOperationLabel.textContent = step.label;

  /* 底部提示条：进料最后一步换成“观察是否有耗材丝送出”，其余是喷头高温提醒 */
  const infoPhase = foState.operation === 'feed' && (foState.done || foState.step >= 2);
  filamentOperationBanner.dataset.tone = infoPhase ? 'info' : 'warn';
  filamentOperationBanner.textContent = infoPhase ? '观察是否有耗材丝送出，如果有则进料完成' : '喷头温度高，请勿触碰';

  /* 主按钮：进行中为「取消」，结束后为「完成」 */
  filamentOperationPrimary.textContent = foState.done ? '完成' : '取消';
  filamentOperationPrimary.dataset.action = foState.done ? 'finish' : 'cancel';
}

function foShowTip() {
  window.clearTimeout(foTipTimer);
  filamentOperationTip.hidden = false;
  foTipTimer = window.setTimeout(() => { filamentOperationTip.hidden = true; }, foConfig.tipHide);
}

function foHideTip() {
  window.clearTimeout(foTipTimer);
  filamentOperationTip.hidden = true;
}

function foStart(operation) {
  window.clearInterval(foTimer);
  if (operation === 'retract') setFilamentFed(false);
  foState.operation = operation;
  foState.step = 1;
  foState.elapsed = 0;
  foState.degree = FO_START_DEGREE;
  foState.progress = 0;
  foState.running = true;
  foState.done = false;
  foState.tipShown = false;
  foHideTip();
  foRender();
  foTimer = window.setInterval(foTick, foConfig.tick);
}

function foTick() {
  if (!foState.running || foState.done) return;
  const config = FO_CONFIG[foState.operation];
  if (!config) return;
  const step = config.steps[foState.step - 1];
  const duration = step.key === 'heat' ? foConfig.heat : foConfig.move;
  foState.elapsed += foConfig.tick;
  foState.progress = duration > 0 ? Math.min(1, foState.elapsed / duration) : 1;

  if (step.key === 'heat') {
    foState.degree = FO_START_DEGREE + (FO_TARGET_DEGREE - FO_START_DEGREE) * foState.progress;
    if (!foState.tipShown && foState.elapsed >= foConfig.tipAt) {
      foState.tipShown = true;
      foShowTip();
    }
  }

  if (foState.progress >= 1) {
    if (foState.step < config.steps.length) {
      foState.step += 1;
      foState.elapsed = 0;
      foState.progress = 0;
    } else {
      foComplete();
      return;
    }
  }
  foRender();
}

/* 进程跑完：页面开着就停在「完成」态等用户点「完成」；已经回退了就直接落到面板 */
function foComplete() {
  window.clearInterval(foTimer);
  foTimer = 0;
  foState.running = false;
  foState.done = true;
  foState.progress = 1;
  foHideTip();
  foRender();
  setFilamentFed(foState.operation === 'feed');
  if (filamentBackpack.active) {
    filamentBackpack.complete(foState.operation);
    renderFilamentPanel();
  }
  if (!filamentOperationScreen.hidden) return;
  foSettlePanel();
  showToast(foState.operation === 'feed' ? '进料完成' : '退料完成');
}

/* 把面板切到结束态：进料 → 进料完成（可退料），退料 → 退料完成（可再次进料） */
function foSettlePanel() {
  if (!foState.operation) return;
  filamentPanel.dataset.filamentState = foState.operation === 'feed' ? 'loaded' : 'retracted';
  renderFilamentPanel();
}

function foOpenScreen() {
  filamentOperationScreen.hidden = false;
  devicePage.inert = true;
  document.body.classList.add('operation-open');
  filamentOperationScreen.scrollTop = 0;
  filamentOperationScreen.focus({ preventScroll: true });
}

function foEnter(operation) {
  if (filamentBackpack.active && !filamentBackpack.canOperate(operation)) return false;
  /* 两个入口都可点击，但不能用相反指令覆盖正在执行的进程。 */
  if (foState.running && foState.operation !== operation) {
    showToast(`当前正在${foState.operation === 'feed' ? '进料' : '退料'}，请完成或取消后再操作`);
    return false;
  }
  /* 同一条进程还在跑：直接回到进度页继续看，不重开计时 */
  const resuming = foState.running && foState.operation === operation;
  if (!resuming) {
    foState.panelStateBefore = filamentPanel.dataset.filamentState;
    if (filamentBackpack.active) filamentBackpack.begin(operation);
    filamentPanel.dataset.filamentState = operation === 'feed' ? 'feeding' : 'retracting';
    renderFilamentPanel();
    foStart(operation);
    if (filamentBackpack.active) renderFilamentPanel();
  }
  foOpenScreen();
  return true;
}

/* 回退：只离开页面，进程继续在后台跑 */
function foLeave() {
  filamentOperationScreen.hidden = true;
  devicePage.inert = false;
  document.body.classList.remove('operation-open');
  foHideTip();
  if (foState.done) foSettlePanel();
}

/* 取消：中止进程，回到打印页并把面板还原成发起前的状态 */
function foAbort() {
  window.clearInterval(foTimer);
  foTimer = 0;
  const operation = foState.operation;
  foState.running = false;
  foState.done = false;
  foState.progress = 0;
  foHideTip();
  filamentOperationScreen.hidden = true;
  devicePage.inert = false;
  document.body.classList.remove('operation-open');
  filamentPanel.dataset.filamentState = foState.panelStateBefore || 'idle';
  if (filamentBackpack.active) filamentBackpack.abort();
  foState.operation = null;
  renderFilamentPanel();
  showToast(operation === 'feed' ? '已取消进料' : '已取消退料');
  returnToPrintPreparation();
}

/* 完成：回到打印页并把面板切到结束态 */
function foFinish() {
  window.clearInterval(foTimer);
  foTimer = 0;
  const operation = foState.operation;
  filamentOperationScreen.hidden = true;
  devicePage.inert = false;
  document.body.classList.remove('operation-open');
  foHideTip();
  foSettlePanel();
  showToast(operation === 'feed' ? '进料完成' : '退料完成');
  returnToPrintPreparation();
}

/* 点击入口不校验耗材；传感器校验位于安装引导的进料动作中。 */
loadFilamentButton.addEventListener('click', () => {
  if (filamentBackpack.active && !filamentBackpack.canOperate('feed')) return;
  if (filamentPanel.dataset.filamentState === 'feeding') {
    foEnter('feed');
    return;
  }
  openFilamentGuide('feed');
});

/* 退料同样不依赖耗材选择。 */
unloadFilamentButton.addEventListener('click', () => {
  if (filamentBackpack.active && !filamentBackpack.canOperate('retract')) return;
  if (filamentPanel.dataset.filamentState === 'retracting') {
    foEnter('retract');
    return;
  }
  openFilamentGuide('retract');
});

/* 回退：不中断进程 */
filamentOperationBack.addEventListener('click', foLeave);

/* 主按钮：进行中 = 取消（二次确认后中止）；结束 = 完成（回打印页） */
filamentOperationPrimary.addEventListener('click', () => {
  if (foState.done) {
    foFinish();
    return;
  }
  const operationName = foState.operation === 'feed' ? '进料' : '退料';
  filamentCancelTitle.textContent = `取消${operationName}？`;
  filamentCancelCopy.textContent = `取消后将停止当前${operationName}流程。喷嘴可能仍处于高温状态，请注意安全。`;
  filamentCancelDialog.querySelector('#filament-cancel-dismiss').textContent = `继续${operationName}`;
  filamentCancelDialog.querySelector('#filament-cancel-confirm').textContent = `取消${operationName}`;
  filamentCancelDialog.showModal();
});

filamentCancelDialog.addEventListener('close', () => {
  if (filamentCancelDialog.returnValue === 'confirm') foAbort();
});
filamentCancelDialog.querySelector('#filament-cancel-close').addEventListener('click', () => filamentCancelDialog.close('cancel'));
filamentCancelDialog.querySelector('#filament-cancel-dismiss').addEventListener('click', () => filamentCancelDialog.close('cancel'));

/* 无头验收用的调试句柄：可缩短各步时长，让真实点击链路跑得快一些 */
window.__filamentOperation = {
  state: foState,
  config: foConfig,
  durations: (patch) => Object.assign(foConfig, patch),
  activeStep: foActiveStep,
  activeNode: foActiveNode,
  nodeLabels: () => foNodeLabels(FO_CONFIG[foState.operation] || FO_CONFIG.feed),
  tipVisible: () => !filamentOperationTip.hidden,
  percent: () => filamentOperationPercent.textContent,
  artSrc: () => decodeURI(filamentOperationArt.getAttribute('src') || ''),
  banner: () => filamentOperationBanner.textContent,
  bannerTone: () => filamentOperationBanner.dataset.tone,
  primary: () => filamentOperationPrimary.textContent,
  finish: () => { if (!foState.done && foState.operation) foComplete(); }
};

/* 桌面端可用鼠标拖动横向浏览拼接原图的各个步骤 */
/* 大图看板：支持鼠标拖动同时横向与纵向平移 */
function enableDragToPan(frame) {
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startScrollLeft = 0;
  let startScrollTop = 0;
  frame.addEventListener('pointerdown', (event) => {
    dragging = true;
    startX = event.clientX;
    startY = event.clientY;
    startScrollLeft = frame.scrollLeft;
    startScrollTop = frame.scrollTop;
  });
  frame.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    frame.scrollLeft = startScrollLeft - (event.clientX - startX);
    frame.scrollTop = startScrollTop - (event.clientY - startY);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => {
    frame.addEventListener(type, () => {
      dragging = false;
    });
  });
}

[...document.querySelectorAll('.reuse-screen-frame.is-pannable')].forEach(enableDragToPan);

dialogClose.addEventListener('click', () => dialog.close('close'));

dialog.addEventListener('close', () => {
  if (pendingAction === 'cancel-print') {
    const swapCancelling = () => { cancelButton.querySelector('span:last-child').textContent = '取消中...'; };
    if (dialog.returnValue === 'confirm') {
      if (isSinglePlateModel) {
        /* 单盘模型：取消任务即整个任务结束，进入已取消打印任务状态 */
        runTransition('取消中...', swapCancelling, () => {
          setTaskStatus('cancelled-all');
          showToast('已取消打印任务');
        });
      } else {
        runTransition('取消中...', swapCancelling, () => {
          cancelTasksForActiveRole();
          setTaskStatus('cancelled-all');
          showToast(`已取消${getActiveTaskOwner() === 'girl' ? '女孩' : '男孩'}的全部打印任务`);
        });
      }
    } else if (dialog.returnValue === 'cancel' && !isSinglePlateModel) {
      runTransition('取消中...', swapCancelling, () => {
        setTaskStatus('cancelled');
        showToast('已取消当前打印任务');
      });
    }
  }
  pendingAction = null;
});

renderPlateTaskAndQueue();
renderProgress();
renderFilamentPanel();
renderCameraMonitor();
if (params.get('status') === 'completed') setTaskStatus('completed');
else if (params.get('status') === 'printing') setTaskStatus('printing');
else if (params.get('status') === 'paused') setTaskStatus('paused');
else if (params.get('status') === 'cancelled') setTaskStatus('cancelled');
else if (params.get('status') === 'cancelled-all') setTaskStatus('cancelled-all');
else if (params.get('status') === 'preparing') setTaskStatus('preparing');
else setTaskStatus('ready');
bindScrollIndicator();

/* ==========================================================================
   分享打印机（本轮新增 · R003）
   —— 入口：「添加打印机」页顶部右侧的「分享打印机」按钮
   —— 页面：分享页（真实 DOM）+ 共享成员管理页 + 3 个底部面板 + 2 个通用弹窗
   —— 异常态：无可分享设备 / 打印机离线 / 邀请码过期 / 生成邀请码失败 / 共享人数达上限
   ========================================================================== */
const SHARE_MAX_MEMBERS = 5;
const SHARE_EXPIRY_SECONDS = 600;          /* 邀请码有效期 10 分钟，首屏显示 09:59 */
const SHARE_GENERATE_DELAY_MS = 900;       /* 生成邀请码的模拟耗时 */

const shareScreen = document.querySelector('#share-printer-screen');
const shareMemberScreen = document.querySelector('#member-manage-screen');
const shareDemoToggle = document.querySelector('#share-demo-toggle');
const shareDeviceCard = document.querySelector('#share-device-card');
const shareDeviceEmpty = document.querySelector('#share-device-empty');
const shareDeviceArt = shareDeviceCard.querySelector('.share-device-art img');
const shareDeviceName = document.querySelector('#share-device-name');
const shareDeviceStatus = document.querySelector('#share-device-status');
const shareDeviceStatusText = document.querySelector('#share-device-status-text');
const shareDeviceSn = document.querySelector('#share-device-sn');
const shareDeviceNote = document.querySelector('#share-device-note');
const shareSwitchPrinterButton = document.querySelector('#share-switch-printer');
const shareCredential = document.querySelector('#share-credential');
const shareQrImage = document.querySelector('#share-qr-image');
const shareCodeText = document.querySelector('#share-code');
const shareCopyButton = document.querySelector('#share-copy');
const shareExpiryText = document.querySelector('#share-expiry');
const shareNote = document.querySelector('#share-note');
const shareInviteButton = document.querySelector('#share-invite');
const shareRegenerateButton = document.querySelector('#share-regenerate');
const shareMembersList = document.querySelector('#share-members-list');
const shareMembersCount = document.querySelector('#share-members-count');
const shareMembersEmpty = document.querySelector('#share-members-empty');
const memberManageList = document.querySelector('#member-manage-list');
const memberManageCount = document.querySelector('#member-manage-count');
const memberManageNote = document.querySelector('#member-manage-note');
const memberManageInvite = document.querySelector('#member-manage-invite');
const shareDeviceSheet = document.querySelector('#share-device-sheet');
const shareDeviceSheetList = document.querySelector('#share-device-sheet-list');
const shareTargetSheet = document.querySelector('#share-target-sheet');
const shareTargetsBox = document.querySelector('#share-targets');
const sharePanelTitle = document.querySelector('#share-panel-title');
const sharePanelSub = document.querySelector('#share-panel-sub');
const shareDemoSheet = document.querySelector('#share-demo-sheet');
const shareDemoList = document.querySelector('#share-demo-list');
const shareConfirmDialog = document.querySelector('#share-confirm-dialog');
const shareConfirmTitle = document.querySelector('#share-confirm-title');
const shareConfirmCopy = document.querySelector('#share-confirm-copy');
const shareConfirmOk = document.querySelector('#share-confirm-ok');
const shareAlertDialog = document.querySelector('#share-alert-dialog');
const shareAlertTitle = document.querySelector('#share-alert-title');
const shareAlertCopy = document.querySelector('#share-alert-copy');
const shareAlertOk = document.querySelector('#share-alert-ok');

/* Owner 名下的打印机（设备选择面板的数据源） */
const SHARE_PRINTERS = [
  { id: 'funbox', name: 'My Printer', model: 'Ugee Funbox', status: 'online', sn: '****1234' },
  { id: 'ufun', name: '小明的打印机', model: 'Ugee Ufun', status: 'busy', sn: '****5678' },
  { id: 'study', name: '书房打印机', model: 'Ugee Funbox', status: 'offline', sn: '****9012' }
];
const SHARE_STATUS_TEXT = { online: '已连接', busy: '忙碌', offline: '离线' };

const SHARE_MEMBERS_BASE = [
  { id: 'm1', name: '小明', role: '受限成员', state: 'joined', avatar: '../../src/dayinjirenwukongzhi/人物头像-男孩.png' },
  { id: 'm2', name: '小红', role: '受限成员', state: 'joined', avatar: '../../src/dayinjirenwukongzhi/人物头像-女孩.png' }
];
const SHARE_MEMBERS_EXTRA = [
  { id: 'm3', name: '妈妈', role: '受限成员', state: 'joined', avatar: '../../src/dayinjirenwukongzhi/人物头像家长.png' },
  { id: 'm4', name: '小刚', role: '受限成员', state: 'pending', avatar: '', tint: '#7ba7f0' },
  { id: 'm5', name: '奶奶', role: '受限成员', state: 'joined', avatar: '', tint: '#f0a97b' }
];

/* 异常状态演示清单（同时用于演示面板与 ?share= 深链白名单） */
const SHARE_DEMO_SCENARIOS = [
  { key: 'normal', title: '恢复正常', copy: '设备在线 · 邀请码可分享 · 成员 2/5' },
  { key: 'no-device', title: '无可分享设备', copy: 'Owner 名下没有打印机，分享能力不可用' },
  { key: 'offline', title: '打印机离线', copy: '状态标签变「离线」，仍可创建邀请码' },
  { key: 'expired', title: '邀请码过期', copy: '二维码与邀请码失效，需重新生成' },
  { key: 'member-limit', title: '共享人数达上限', copy: '已满 5/5，「分享邀请」不可用' },
  { key: 'gen-failed', title: '生成邀请码失败', copy: '点「重新生成邀请码」时返回失败' }
];

/* 系统分享面板里的目标应用（示意） */
const SHARE_TARGETS = [
  { key: 'wechat', label: '微信', color: '#07c160' },
  { key: 'wecom', label: '企业微信', color: '#2e7be6' },
  { key: 'qq', label: 'QQ', color: '#12b7f5' },
  { key: 'sms', label: '短信', color: '#34c759' },
  { key: 'link', label: '复制链接', color: '#8a94a6' },
  { key: 'more', label: '更多', color: '#6e7a8a' }
];
const SHARE_TARGET_GLYPHS = {
  wechat: '<path d="M4.2 5.4h11.6a2.4 2.4 0 0 1 2.4 2.4v5.6a2.4 2.4 0 0 1-2.4 2.4h-1.6l-2.6 2.2v-2.2H4.2A2.4 2.4 0 0 1 1.8 13.4V7.8a2.4 2.4 0 0 1 2.4-2.4Z"></path><circle cx="7.4" cy="10.6" r="0.9" fill="currentColor" stroke="none"></circle><circle cx="12.6" cy="10.6" r="0.9" fill="currentColor" stroke="none"></circle>',
  wecom: '<path d="M9.4 3.2h5.2a2.2 2.2 0 0 1 2.2 2.2v4.2a2.2 2.2 0 0 1-2.2 2.2H11l-2.6 2.1v-2.1H9.4"></path><path d="M6.6 7.4H4.6a2.2 2.2 0 0 0-2.2 2.2v4.2a2.2 2.2 0 0 0 2.2 2.2h6.6a2.2 2.2 0 0 0 2.2-2.2"></path>',
  qq: '<path d="M12 3.6c2.6 0 4.4 2.1 4.4 4.7 0 .9-.2 1.7-.5 2.4.5 1 .9 2.1 1 3 .1.7-.2 1.1-.8 1.1-.5 0-.9-.3-1.3-.8-.6.4-1.4.7-2.3.8l-.5 1.5h-.6l-.4-1.4h-.4l-.4 1.4h-.6l-.5-1.5c-.9-.1-1.7-.4-2.3-.8-.4.5-.8.8-1.3.8-.6 0-.9-.4-.8-1.1.1-.9.5-2 1-3-.3-.7-.5-1.5-.5-2.4 0-2.6 1.8-4.7 4.4-4.7Z"></path>',
  sms: '<path d="M3.4 4.4h17.2a1.8 1.8 0 0 1 1.8 1.8v8.4a1.8 1.8 0 0 1-1.8 1.8H9.6l-4.4 3.4v-3.4H3.4a1.8 1.8 0 0 1-1.8-1.8V6.2a1.8 1.8 0 0 1 1.8-1.8Z"></path>',
  link: '<path d="M10.2 13.8a3.4 3.4 0 0 1 0-4.8l2.6-2.6a3.4 3.4 0 0 1 4.8 4.8l-1.3 1.3"></path><path d="M13.8 10.2a3.4 3.4 0 0 1 0 4.8l-2.6 2.6a3.4 3.4 0 0 1-4.8-4.8l1.3-1.3"></path>',
  more: '<circle cx="5" cy="12" r="1.7" fill="currentColor" stroke="none"></circle><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"></circle><circle cx="19" cy="12" r="1.7" fill="currentColor" stroke="none"></circle>'
};

const SHARE_CODE_POOL_FALLBACK = [{ code: 'ABCD 1234', link: 'https://app.ugee.com/i/ABCD1234', qr: 'assets/分享打印机-二维码-1.svg' }];
const shareCodePool = (window.SHARE_CODE_POOL && window.SHARE_CODE_POOL.length) ? window.SHARE_CODE_POOL : SHARE_CODE_POOL_FALLBACK;

const shareState = {
  scenario: 'normal',
  deviceId: SHARE_PRINTERS[0].id,
  members: SHARE_MEMBERS_BASE.map((member) => ({ ...member })),
  poolIndex: 0,
  secondsLeft: SHARE_EXPIRY_SECONDS - 1,
  generating: false,
  expired: false,
  copiedPayload: '',
  confirmAction: null,
  alertAction: null
};
let shareGenerateTimer = 0;

/* ---------- 派生状态 ---------- */
function shareDevices() {
  return shareState.scenario === 'no-device' ? [] : SHARE_PRINTERS;
}

function shareActiveDevice() {
  const devices = shareDevices();
  if (!devices.length) return null;
  const device = devices.find((item) => item.id === shareState.deviceId) || devices[0];
  /* 离线演示态：仍用当前设备，只把状态改成离线，用来验证「离线也能创建邀请」 */
  if (shareState.scenario === 'offline') return { ...device, status: 'offline' };
  return device;
}

function sharePoolEntry() {
  return shareCodePool[shareState.poolIndex % shareCodePool.length];
}

function shareMemberLimitReached() {
  return shareState.members.length >= SHARE_MAX_MEMBERS;
}

function shareCredentialExpired() {
  return shareState.expired || shareState.secondsLeft <= 0;
}

function shareCredentialState() {
  if (!shareActiveDevice()) return 'disabled';
  if (shareState.generating) return 'generating';
  if (shareCredentialExpired()) return 'expired';
  return 'active';
}

function shareInviteEnabled() {
  return shareCredentialState() === 'active' && !shareMemberLimitReached();
}

function shareCredentialNote() {
  if (!shareActiveDevice()) return '添加打印机后即可生成邀请码。';
  if (shareCredentialExpired()) return '邀请码已过期，点下方「重新生成邀请码」获取新的邀请码。';
  if (shareMemberLimitReached()) return '共享人数已达上限（' + SHARE_MAX_MEMBERS + '/' + SHARE_MAX_MEMBERS + '），移除成员后才能继续邀请。';
  return '';
}

function formatShareCountdown(seconds) {
  const safe = Math.max(0, seconds);
  return String(Math.floor(safe / 60)).padStart(2, '0') + ':' + String(safe % 60).padStart(2, '0');
}

/* ---------- 渲染 ---------- */
function renderShareDevice() {
  const device = shareActiveDevice();
  const hasDevice = Boolean(device);
  shareDeviceCard.hidden = !hasDevice;
  shareDeviceEmpty.hidden = hasDevice;
  shareSwitchPrinterButton.hidden = shareDevices().length <= 1;
  if (!hasDevice) {
    shareDeviceNote.hidden = true;
    return;
  }
  shareDeviceName.textContent = device.name;
  shareDeviceStatus.dataset.status = device.status;
  shareDeviceStatusText.textContent = SHARE_STATUS_TEXT[device.status] || '已连接';
  shareDeviceSn.textContent = 'SN ' + device.sn;
  const offline = device.status === 'offline';
  shareDeviceNote.hidden = !offline;
  shareDeviceNote.textContent = offline
    ? '打印机当前离线。仍可创建邀请码，家人先加入，打印机上线后即可打印。'
    : '';
}

function renderShareCredential() {
  const state = shareCredentialState();
  const entry = sharePoolEntry();
  const device = shareActiveDevice();
  shareCredential.dataset.state = state;
  if (shareCodeText.textContent !== entry.code) shareCodeText.textContent = entry.code;
  if (!shareQrImage.getAttribute('src').endsWith(entry.qr)) shareQrImage.src = entry.qr;
  shareQrImage.alt = '邀请码 ' + entry.code + ' 的二维码，家人扫码即可加入' + (device ? device.name : '这台打印机');

  if (!device) {
    shareExpiryText.textContent = '暂不可用';
  } else if (state === 'generating') {
    shareExpiryText.textContent = '正在生成邀请码…';
  } else if (shareCredentialExpired()) {
    shareExpiryText.textContent = '邀请码已过期';
  } else {
    shareExpiryText.textContent = '有效期剩余 ' + formatShareCountdown(shareState.secondsLeft);
  }

  const note = shareCredentialNote();
  shareNote.hidden = !note;
  shareNote.textContent = note;

  shareInviteButton.disabled = !shareInviteEnabled();
  shareRegenerateButton.disabled = !device || state === 'generating';
  shareCopyButton.disabled = state !== 'active';
}

function renderShareExpiryOnly() {
  if (shareCredentialState() !== 'active') return;
  shareExpiryText.textContent = '有效期剩余 ' + formatShareCountdown(shareState.secondsLeft);
}

function shareMemberAvatarHtml(member) {
  if (member.avatar) return '<img src="' + member.avatar + '" alt="">';
  return '<span class="share-member-fallback" style="background:' + (member.tint || '#9db4d8') + '">' + member.name.slice(0, 1) + '</span>';
}

function renderShareMembers() {
  shareMembersList.innerHTML = shareState.members.map((member) => ''
    + '<li class="share-member" data-member="' + member.id + '">'
    + '<span class="share-member-avatar">' + shareMemberAvatarHtml(member) + '</span>'
    + '<span class="share-member-main">'
    + '<strong class="share-member-name">' + member.name + '</strong>'
    + '<span class="share-member-role">' + member.role + '</span>'
    + '</span>'
    + '<span class="share-member-state" data-state="' + member.state + '">' + (member.state === 'joined' ? '已加入' : '待加入') + '</span>'
    + '</li>').join('');
  shareMembersCount.textContent = shareState.members.length + '/' + SHARE_MAX_MEMBERS;
  shareMembersEmpty.hidden = shareState.members.length > 0;
}

function renderMemberManage() {
  if (!shareState.members.length) {
    memberManageList.innerHTML = '<p class="member-empty">暂未共享给任何成员。生成邀请码并分享给家人即可加入。</p>';
  } else {
    memberManageList.innerHTML = shareState.members.map((member) => ''
      + '<div class="member-row" data-member="' + member.id + '">'
      + '<span class="share-member-avatar">' + shareMemberAvatarHtml(member) + '</span>'
      + '<span class="share-member-main">'
      + '<strong class="share-member-name">' + member.name + '</strong>'
      + '<span class="share-member-role">' + member.role + ' · ' + (member.state === 'joined' ? '已加入' : '待加入') + '</span>'
      + '</span>'
      + '<button class="member-remove" type="button" data-remove="' + member.id + '" aria-label="移除成员 ' + member.name + '">移除</button>'
      + '</div>').join('');
  }
  memberManageCount.textContent = shareState.members.length + '/' + SHARE_MAX_MEMBERS;
  const full = shareMemberLimitReached();
  memberManageInvite.disabled = full;
  memberManageNote.textContent = full
    ? '已共享 ' + SHARE_MAX_MEMBERS + '/' + SHARE_MAX_MEMBERS + '，达到上限。移除成员后名额会立即释放。'
    : '最多可共享给 ' + SHARE_MAX_MEMBERS + ' 位家庭成员，移除成员后名额会立即释放。';
}

function renderShareDemo() {
  shareDemoList.innerHTML = SHARE_DEMO_SCENARIOS.map((item) => ''
    + '<button class="share-demo-item" type="button" data-scenario="' + item.key + '" aria-pressed="' + (item.key === shareState.scenario) + '">'
    + '<span class="share-demo-item-dot" aria-hidden="true"></span>'
    + '<span class="share-demo-item-main"><strong>' + item.title + '</strong><span>' + item.copy + '</span></span>'
    + '</button>').join('');
}

function renderShareAll() {
  renderShareDevice();
  renderShareCredential();
  renderShareMembers();
  renderMemberManage();
  renderShareDemo();
}

/* ---------- 底部面板 ---------- */
const shareSheetLayers = () => [shareDeviceSheet, shareTargetSheet, shareDemoSheet];

function closeShareSheets() {
  shareSheetLayers().forEach((layer) => { layer.hidden = true; });
  shareSwitchPrinterButton.setAttribute('aria-expanded', 'false');
  shareDemoToggle.classList.remove('is-active');
}

function openShareSheet(layer) {
  closeShareSheets();
  layer.hidden = false;
  if (layer === shareDeviceSheet) shareSwitchPrinterButton.setAttribute('aria-expanded', 'true');
  if (layer === shareDemoSheet) shareDemoToggle.classList.add('is-active');
}

function renderShareDeviceSheet() {
  const active = shareActiveDevice();
  const options = shareDevices().map((device) => ''
    + '<button class="share-device-option" type="button" role="option" data-device="' + device.id + '" aria-selected="' + Boolean(active && device.id === active.id) + '">'
    + '<img src="assets/分享打印机-打印机.png" alt="">'
    + '<span class="share-device-option-main">'
    + '<span class="share-device-option-name">' + device.name + '</span>'
    + '<span class="share-device-option-sub">'
    + '<span class="share-status-pill" data-status="' + device.status + '"><i aria-hidden="true"></i>' + SHARE_STATUS_TEXT[device.status] + '</span>'
    + '<span>' + device.model + ' · SN ' + device.sn + '</span>'
    + '</span></span>'
    + '<span class="share-device-option-tick" aria-hidden="true"></span>'
    + '</button>').join('');
  shareDeviceSheetList.innerHTML = options || '<p class="member-empty">暂无可分享的打印机。</p>';
}

function renderShareTargetSheet() {
  const device = shareActiveDevice();
  const entry = sharePoolEntry();
  sharePanelTitle.textContent = '邀请你一起使用 ' + (device ? device.name : '这台打印机') + ' 打印';
  sharePanelSub.textContent = '邀请码 ' + entry.code + ' · ' + entry.link;
  shareTargetsBox.innerHTML = SHARE_TARGETS.map((target) => ''
    + '<button class="share-target" type="button" data-target="' + target.key + '" aria-label="分享到' + target.label + '">'
    + '<span class="share-target-icon" style="background:' + target.color + '" aria-hidden="true">'
    + '<svg viewBox="0 0 24 24">' + (SHARE_TARGET_GLYPHS[target.key] || '') + '</svg>'
    + '</span><span>' + target.label + '</span>'
    + '</button>').join('');
}

/* ---------- 通用弹窗 ---------- */
function openShareConfirm(options) {
  shareConfirmTitle.textContent = options.title;
  shareConfirmCopy.textContent = options.copy || '';
  shareConfirmOk.textContent = options.okText || '确认';
  shareConfirmOk.dataset.tone = options.okTone || 'primary';
  shareState.confirmAction = options.action || null;
  shareConfirmDialog.showModal();
}

function openShareAlert(options) {
  shareAlertTitle.textContent = options.title;
  shareAlertCopy.textContent = options.copy || '';
  shareAlertOk.textContent = options.okText || '重试';
  shareAlertOk.dataset.tone = options.okTone || 'primary';
  shareState.alertAction = options.action || null;
  shareAlertDialog.showModal();
}

shareConfirmDialog.addEventListener('close', () => {
  const action = shareState.confirmAction;
  shareState.confirmAction = null;
  if (shareConfirmDialog.returnValue === 'confirm' && typeof action === 'function') action();
});
document.querySelector('#share-confirm-close').addEventListener('click', () => shareConfirmDialog.close('cancel'));

shareAlertDialog.addEventListener('close', () => {
  const action = shareState.alertAction;
  shareState.alertAction = null;
  if (shareAlertDialog.returnValue === 'confirm' && typeof action === 'function') action();
});

/* ---------- 邀请码生成 ---------- */
function regenerateShareCredential(options) {
  const settings = Object.assign({ advance: true, announce: true }, options || {});
  if (!shareActiveDevice()) {
    openShareAlert({
      title: '暂无可分享的打印机',
      copy: '请先在「我的打印机」里添加一台打印机，再来邀请家人。',
      okText: '知道了',
      action: null
    });
    return;
  }
  shareState.generating = true;
  renderShareCredential();
  window.clearTimeout(shareGenerateTimer);
  shareGenerateTimer = window.setTimeout(() => {
    shareState.generating = false;
    if (shareState.scenario === 'gen-failed') {
      renderShareCredential();
      openShareAlert({
        title: '生成邀请码失败',
        copy: '网络似乎不太顺畅。原来的邀请码仍然有效，请稍后重试。',
        okText: '重试',
        action: () => regenerateShareCredential(settings)
      });
      return;
    }
    if (settings.advance) shareState.poolIndex = (shareState.poolIndex + 1) % shareCodePool.length;
    shareState.secondsLeft = SHARE_EXPIRY_SECONDS - 1;
    shareState.expired = false;
    renderShareCredential();
    if (settings.announce) showToast('已生成新的邀请码');
  }, SHARE_GENERATE_DELAY_MS);
}

/* ---------- 复制邀请码 ---------- */
function legacyCopyText(text) {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.top = '-1000px';
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (error) { ok = false; }
  area.remove();
  return ok;
}

function copyShareCode() {
  if (shareCopyButton.disabled) return;
  const text = sharePoolEntry().code;
  shareState.copiedPayload = text;
  const done = () => showToast('邀请码已复制');
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    navigator.clipboard.writeText(text).then(done, () => { legacyCopyText(text); done(); });
  } else {
    legacyCopyText(text);
    done();
  }
}

/* ---------- 分享邀请 ---------- */
function isMobileShareEnvironment() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function openShareTargetSheet() {
  renderShareTargetSheet();
  openShareSheet(shareTargetSheet);
}

function shareInvite() {
  if (!shareInviteEnabled()) {
    if (shareMemberLimitReached()) {
      openShareAlert({
        title: '共享人数已达上限',
        copy: '一台打印机最多共享给 ' + SHARE_MAX_MEMBERS + ' 位家庭成员。请先移除成员，或让他们退出后再邀请。',
        okText: '去管理成员',
        action: () => openReuseScreen('memberManage')
      });
    }
    return;
  }
  const device = shareActiveDevice();
  const entry = sharePoolEntry();
  const payload = {
    title: '邀请你一起使用 ' + device.name + ' 打印',
    text: '邀请码 ' + entry.code + '，打开链接即可加入：' + entry.link,
    url: entry.link
  };
  /* 真机（移动端 UA）优先调系统分享面板；桌面浏览器给可视化的分享面板示意 */
  if (isMobileShareEnvironment() && typeof navigator.share === 'function') {
    navigator.share(payload).then(
      () => showToast('已发起系统分享'),
      (error) => { if (!error || error.name !== 'AbortError') openShareTargetSheet(); }
    );
    return;
  }
  openShareTargetSheet();
}

/* ---------- 异常状态演示 ---------- */
function applyShareScenario(key) {
  const known = SHARE_DEMO_SCENARIOS.some((item) => item.key === key);
  shareState.scenario = known ? key : 'normal';
  shareState.generating = false;
  window.clearTimeout(shareGenerateTimer);
  shareState.deviceId = SHARE_PRINTERS[0].id;
  shareState.members = SHARE_MEMBERS_BASE.map((member) => Object.assign({}, member));
  shareState.poolIndex = 0;
  shareState.secondsLeft = SHARE_EXPIRY_SECONDS - 1;
  shareState.expired = false;

  if (shareState.scenario === 'member-limit') {
    shareState.members = SHARE_MEMBERS_BASE.concat(SHARE_MEMBERS_EXTRA).map((member) => Object.assign({}, member));
  }
  if (shareState.scenario === 'expired') {
    shareState.secondsLeft = 0;
    shareState.expired = true;
  }
  renderShareAll();
}

/* ---------- 事件绑定 ---------- */
/* 入口：添加打印机页顶部右侧「分享打印机」 */
document.querySelector('#open-share-printer').addEventListener('click', () => {
  openReuseScreen('sharePrinter');
  shareScreen.scrollTop = 0;
});

document.querySelector('#share-printer-back').addEventListener('click', () => {
  closeShareSheets();
  goBackInReuseScreens();
});

/* 空态：回添加打印机页 */
document.querySelector('#share-add-printer').addEventListener('click', () => goBackInReuseScreens());

/* 设备卡片右侧箭头 → 设备选择面板 */
shareSwitchPrinterButton.addEventListener('click', () => {
  if (shareDevices().length <= 1) return;
  renderShareDeviceSheet();
  openShareSheet(shareDeviceSheet);
});

shareDeviceSheetList.addEventListener('click', (event) => {
  const option = event.target.closest('[data-device]');
  if (!option) return;
  const deviceId = option.dataset.device;
  if (deviceId === shareState.deviceId) { closeShareSheets(); return; }
  const device = SHARE_PRINTERS.find((item) => item.id === deviceId);
  shareState.deviceId = deviceId;
  closeShareSheets();
  renderShareDevice();
  /* 换打印机 = 换一份邀请凭证，二维码与邀请码一起换，避免扫出上一台的链接 */
  regenerateShareCredential({ advance: true, announce: false });
  showToast('已切换为「' + (device ? device.name : '打印机') + '」，邀请码已重新生成');
});

/* 复制邀请码 */
shareCopyButton.addEventListener('click', copyShareCode);

/* 分享邀请 */
shareInviteButton.addEventListener('click', shareInvite);

/* 重新生成邀请码：先二次确认，说明原邀请码将失效 */
shareRegenerateButton.addEventListener('click', () => {
  if (shareRegenerateButton.disabled) return;
  const entry = sharePoolEntry();
  openShareConfirm({
    title: '重新生成邀请码？',
    copy: '生成后，当前邀请码 ' + entry.code + ' 将立即失效，已经发出的邀请链接也无法再使用。',
    okText: '重新生成',
    action: () => regenerateShareCredential({ advance: true, announce: true })
  });
});

/* 系统分享面板里的目标应用 */
shareTargetsBox.addEventListener('click', (event) => {
  const target = event.target.closest('[data-target]');
  if (!target) return;
  const entry = sharePoolEntry();
  const label = target.textContent.trim();
  closeShareSheets();
  if (target.dataset.target === 'link') {
    shareState.copiedPayload = entry.link;
    legacyCopyText(entry.link);
    showToast('邀请链接已复制');
    return;
  }
  showToast('已通过「' + label + '」发送邀请 · 邀请码 ' + entry.code);
});

/* 成员管理入口 */
document.querySelector('#share-manage-members').addEventListener('click', () => openReuseScreen('memberManage'));
document.querySelector('#member-manage-back').addEventListener('click', () => goBackInReuseScreens());

memberManageInvite.addEventListener('click', () => {
  if (memberManageInvite.disabled) return;
  goBackInReuseScreens();
  openShareTargetSheet();
});

memberManageList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove]');
  if (!button) return;
  const member = shareState.members.find((item) => item.id === button.dataset.remove);
  if (!member) return;
  openShareConfirm({
    title: '移除「' + member.name + '」？',
    copy: '移除后 ' + member.name + ' 将无法再使用这台打印机，名额会立即释放。',
    okText: '移除',
    okTone: 'danger',
    action: () => {
      shareState.members = shareState.members.filter((item) => item.id !== member.id);
      renderShareAll();
      showToast('已移除成员「' + member.name + '」');
    }
  });
});

/* 演示开关与场景选择 */
shareDemoToggle.addEventListener('click', () => openShareSheet(shareDemoSheet));
shareDemoList.addEventListener('click', (event) => {
  const item = event.target.closest('[data-scenario]');
  if (!item) return;
  applyShareScenario(item.dataset.scenario);
  closeShareSheets();
  const scenario = SHARE_DEMO_SCENARIOS.find((entry) => entry.key === item.dataset.scenario);
  showToast('已切换到「' + (scenario ? scenario.title : '默认') + '」');
});

document.querySelector('#share-demo-close').addEventListener('click', closeShareSheets);
document.querySelector('#share-device-sheet-cancel').addEventListener('click', closeShareSheets);
document.querySelector('#share-target-sheet-cancel').addEventListener('click', closeShareSheets);
shareSheetLayers().forEach((layer) => {
  layer.addEventListener('click', (event) => { if (event.target === layer) closeShareSheets(); });
});

/* 演示入口就在分享页内部，随页面一起显隐；离开分享页时顺手收起可能开着的面板 */
new MutationObserver(() => {
  if (shareScreen.hidden) closeShareSheets();
}).observe(shareScreen, { attributes: true, attributeFilter: ['hidden'] });

/* 邀请码有效期倒计时 */
window.setInterval(() => {
  if (shareState.generating || shareCredentialExpired()) return;
  shareState.secondsLeft = Math.max(0, shareState.secondsLeft - 1);
  if (shareState.secondsLeft === 0) {
    shareState.expired = true;
    renderShareCredential();
    showToast('邀请码已过期，请重新生成');
    return;
  }
  renderShareExpiryOnly();
}, 1000);

/* ---------- 初始化 ---------- */
const shareScenarioFromUrl = params.get('share');
if (shareScenarioFromUrl && SHARE_DEMO_SCENARIOS.some((item) => item.key === shareScenarioFromUrl)) {
  openReuseScreen('addPrinter');
  openReuseScreen('sharePrinter');
  applyShareScenario(shareScenarioFromUrl);
} else {
  applyShareScenario('normal');
}

/* ---------- 跨原型深链：配网流程「打印前准备」页的底部两个按钮 ---------- */
/* ?screen=explore-toys：直接打开模型库首页（探索玩具页），复用 探索玩具页.png */
if (params.get('screen') === 'explore-toys') {
  openReuseScreen('exploreToys');
}

/* ?highlight=filament：滚到耗材控制面板并短暂高光，吸引用户去操作进料
   等 load 事件后再开始，避免网络较慢时高光在用户看到页面之前就结束 */
if (params.get('highlight') === 'filament') {
  const startFilamentGuide = () => {
    filamentPanel.scrollIntoView({ block: 'center' });
    filamentPanel.classList.add('is-guide-flash');
    window.setTimeout(() => filamentPanel.classList.remove('is-guide-flash'), 8000);
  };
  if (document.readyState === 'complete') startFilamentGuide();
  else window.addEventListener('load', startFilamentGuide, { once: true });
}

/* 无头验收用的调试句柄 */
window.__sharePrinter = {
  state: shareState,
  scenario: applyShareScenario,
  devices: shareDevices,
  activeDevice: shareActiveDevice,
  credentialState: shareCredentialState,
  inviteEnabled: shareInviteEnabled,
  entry: sharePoolEntry,
  copied: () => shareState.copiedPayload,
  memberLimitReached: shareMemberLimitReached,
  poolSize: shareCodePool.length,
  scenarioKeys: SHARE_DEMO_SCENARIOS.map((item) => item.key)
};

/* Manual preparation precedes the existing filament-operation state machine. */
const filamentGuide = document.querySelector('#filament-guide-screen');
const filamentVideo = document.querySelector('#filament-video-dialog');
let filamentGuideOperation = 'feed';
function openFilamentGuide(operation) {
  filamentGuideOperation = operation;
  const installing = operation === 'feed';
  const title = installing ? '安装耗材' : '退出耗材';
  const art = installing ? 'assets/filament-install-guide.svg' : 'assets/filament-remove-guide.svg';
  document.querySelector('#filament-guide-title').textContent = title;
  document.querySelector('#filament-guide-subtitle').textContent = installing ? '安装耗材步骤' : '退出耗材说明';
  document.querySelector('#filament-guide-art').src = art;
  document.querySelector('#filament-guide-art').alt = installing ? '手动将料盘耗材推入料管的示意图' : '耗材送出后用手将耗材完整抽出的示意图';
  document.querySelector('#filament-video-art').src = art;
  document.querySelector('.fg-video-animation span').textContent = installing ? '↑' : '←';
  document.querySelector('#filament-video-title').textContent = title + ' · 动画演示';
  document.querySelector('#filament-video-caption').textContent = installing ? '向上挤压橙色把手，持续推入耗材，直至到达打印头。' : '点击开始退料，等待料管中的耗材送出，再手动完整抽出。';
  document.querySelector('#filament-guide-steps').hidden = !installing;
  document.querySelector('#filament-remove-copy').hidden = installing;
  document.querySelector('#filament-guide-start').textContent = installing ? '进料' : '开始退料';
  filamentGuide.hidden = false;
  devicePage.inert = true;
  filamentGuide.querySelector('.fg-body').scrollTop = 0;
  filamentGuide.focus({ preventScroll: true });
}
function closeFilamentGuide() {
  filamentGuide.hidden = true;
  devicePage.inert = false;
}
document.querySelector('#filament-guide-back').addEventListener('click', () => {
  closeFilamentGuide();
  returnToPrintPreparation();
});
document.querySelector('#filament-guide-start').addEventListener('click', () => {
  if (filamentBackpack.active && !filamentBackpack.canOperate(filamentGuideOperation)) {
    showToast('请先选择可操作的料盘');
    return;
  }
  /* 原型由控制台模拟打印机断料传感器信号，与料盘选中状态无关。 */
  if (filamentGuideOperation === 'feed' && filamentPanel.dataset.filamentSensor !== 'present') {
    document.querySelector('#filament-not-detected-dialog').showModal();
    return;
  }
  if (filamentGuideOperation === 'feed') filamentPanel.dataset.filamentPresence = 'present';
  if (foEnter(filamentGuideOperation)) {
    closeFilamentGuide();
    devicePage.inert = true;
  }
});
document.querySelector('#filament-guide-video').addEventListener('click', () => filamentVideo.showModal());
document.querySelector('#filament-video-close').addEventListener('click', () => filamentVideo.close());
if (params.get('screen') === 'install-filament') openFilamentGuide('feed');
if (params.get('screen') === 'remove-filament') openFilamentGuide('retract');
if (params.get('screen') === 'prepare-print') openReuseScreen('preparePrint');
