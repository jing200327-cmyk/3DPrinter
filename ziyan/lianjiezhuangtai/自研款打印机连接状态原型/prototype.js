const STATE_CONFIG = {
  idle: {
    label: '空闲',
    title: '空闲 · 自研款打印机连接状态原型',
    statusImage: '../../src/dayinji/打印机状态空闲.png',
    statusAlt: '打印机 miao 当前为空闲状态',
    timelapseImage: '../../src/dayinji/空闲延时摄影.jpg',
    timelapseAlt: '打印机舱内实时画面',
    taskState: '准备打印',
    showIdleTask: true
  },
  connecting: {
    label: '连接中',
    title: '连接中 · 自研款打印机连接状态原型',
    statusImage: '../../src/dayinji/打印机状态连接中.png',
    statusAlt: '打印机 miao 正在连接',
    timelapseImage: '../../src/dayinji/连接中延时摄影.png',
    timelapseAlt: '延时摄影正在等待打印机连接',
    taskState: '待连接',
    showIdleTask: false
  },
  offline: {
    label: '离线',
    title: '离线 · 自研款打印机连接状态原型',
    statusImage: '../../src/dayinji/打印机状态离线.jpg',
    statusAlt: '打印机 miao 当前离线',
    timelapseImage: '../../src/dayinji/连接中延时摄影.png',
    timelapseAlt: '延时摄影正在等待打印机重连',
    taskState: '待重连',
    showIdleTask: false
  }
};

const params = new URLSearchParams(window.location.search);
const requestedState = params.get('state');
const currentState = Object.hasOwn(STATE_CONFIG, requestedState) ? requestedState : 'idle';
const currentConfig = STATE_CONFIG[currentState];

const devicePage = document.querySelector('#device-page');
const statusReference = document.querySelector('#status-reference');
const connectingSpinner = document.querySelector('#connecting-spinner');
const timelapsePanel = document.querySelector('#timelapse-panel');
const timelapseImage = document.querySelector('#timelapse-image');
const cameraLoading = document.querySelector('#camera-loading');
const idleTaskPanel = document.querySelector('#idle-task-panel');
const stateOnlyTask = document.querySelector('#state-only-task');
const taskState = document.querySelector('#task-state');
const stateAnnouncer = document.querySelector('#state-announcer');
const contentReferenceScreen = document.querySelector('#content-reference-screen');
const contentReferenceImage = document.querySelector('#content-reference-image');
const contentDeviceBack = document.querySelector('#content-device-back');
const toast = document.querySelector('#toast');
const filamentSheet = document.querySelector('#filament-sheet');
const filamentSettingsButton = document.querySelector('#filament-settings');
const filamentSheetClose = document.querySelector('#filament-sheet-close');
const sheetSlots = document.querySelector('.sheet-slots');
const filamentOperationScreen = document.querySelector('#filament-operation-screen');
const filamentOperationImage = document.querySelector('#filament-operation-image');
const closeFilamentOperationButton = document.querySelector('#close-filament-operation');
const cancelFilamentOperationButton = document.querySelector('#cancel-filament-operation');
const printerDialog = document.querySelector('#printer-dialog');
const carousel = document.querySelector('#control-carousel');
const carouselDots = [...document.querySelectorAll('.carousel-dots span')];
let contentReturnTarget = null;
let currentFilamentOperation = null;
let toastTimer;

function renderState() {
  document.title = currentConfig.title;
  devicePage.dataset.state = currentState;
  statusReference.src = currentConfig.statusImage;
  statusReference.alt = currentConfig.statusAlt;
  connectingSpinner.hidden = currentState !== 'connecting';

  timelapseImage.src = currentConfig.timelapseImage;
  timelapseImage.alt = currentConfig.timelapseAlt;
  timelapsePanel.classList.toggle('is-idle', currentState === 'idle');
  timelapsePanel.classList.toggle('is-loading', currentState !== 'idle');
  cameraLoading.hidden = currentState === 'idle';

  idleTaskPanel.hidden = !currentConfig.showIdleTask;
  stateOnlyTask.hidden = currentConfig.showIdleTask;
  taskState.textContent = currentConfig.taskState;
  stateAnnouncer.textContent = `打印机当前状态：${currentConfig.label}`;

  document.querySelectorAll('[data-preview-state]').forEach((link) => {
    if (link.dataset.previewState === currentState) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('is-visible');
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 1800);
}

function openContentReference(fileName, title, returnTarget) {
  contentReturnTarget = returnTarget;
  contentReferenceImage.src = `../../src/dayinji/${fileName}`;
  contentReferenceImage.alt = `${title}页面参考图`;
  contentReferenceScreen.setAttribute('aria-label', title);
  contentReferenceScreen.hidden = false;
  devicePage.inert = true;
  contentReferenceScreen.scrollTop = 0;
  contentDeviceBack.focus();
}

function closeContentReference() {
  contentReferenceScreen.hidden = true;
  devicePage.inert = false;
  contentReturnTarget?.focus();
  contentReturnTarget = null;
}

document.querySelector('#printer-switch').addEventListener('click', () => printerDialog.showModal());
document.querySelector('#printer-settings').addEventListener('click', () => showToast('已打开打印机设备设置'));
document.querySelector('#control-settings').addEventListener('click', () => showToast('已打开设备控制设置'));

function openFilamentSheet() {
  if (filamentSheet.open) return;
  syncSheetSlots();
  filamentSheet.showModal();
  document.body.classList.add('sheet-open');
}

function closeFilamentSheet() {
  if (filamentSheet.open) filamentSheet.close();
}

filamentSettingsButton.addEventListener('click', openFilamentSheet);
filamentSheetClose.addEventListener('click', closeFilamentSheet);
filamentSheet.addEventListener('click', (event) => {
  if (event.target === filamentSheet) closeFilamentSheet();
});
filamentSheet.addEventListener('close', () => {
  document.body.classList.remove('sheet-open');
  if (!currentFilamentOperation) filamentSettingsButton.focus();
});

document.querySelectorAll('.idle-task-actions button').forEach((button) => {
  button.addEventListener('click', () => {
    const isExplore = button.dataset.action === 'explore';
    openContentReference(isExplore ? '探索玩具.jpg' : '我的模型.jpg', isExplore ? '探索玩具' : '我的模型', button);
  });
});
contentDeviceBack.addEventListener('click', closeContentReference);

function selectMaterialSlot(selectedIndex) {
  document.querySelectorAll('.material-slot').forEach((candidate) => {
    const isSelected = Number(candidate.dataset.slot) === selectedIndex;
    candidate.classList.toggle('is-selected', isSelected);
    candidate.setAttribute('aria-pressed', String(isSelected));
    candidate.setAttribute('aria-label', candidate.getAttribute('aria-label').replace('，已选择', '') + (isSelected ? '，已选择' : ''));
  });
  showToast(`已选择 ${selectedIndex} 号耗材槽`);
}

function wireMaterialSlot(slot) {
  slot.addEventListener('click', () => {
    selectMaterialSlot(Number(slot.dataset.slot));
  });
}

document.querySelectorAll('.material-slots .material-slot').forEach(wireMaterialSlot);

function syncSheetSlots() {
  const clones = [...document.querySelectorAll('.material-slots .material-slot')].map((slot) => {
    const clone = slot.cloneNode(true);
    wireMaterialSlot(clone);
    return clone;
  });
  sheetSlots.replaceChildren(...clones);
}

function openFilamentOperation(operation) {
  currentFilamentOperation = operation;
  closeFilamentSheet();
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
  filamentSettingsButton.focus();
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
carousel.addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  const direction = event.key === 'ArrowRight' ? 1 : -1;
  carousel.scrollBy({ left: direction * carousel.clientWidth * 0.8, behavior: 'smooth' });
});

document.querySelectorAll('.bottom-nav-hotspots button').forEach((button) => {
  button.addEventListener('click', () => {
    if (button.dataset.nav === '设备') showToast('当前已在设备页');
    else showToast(`${button.dataset.nav}页面暂未展开`);
  });
});

document.querySelector('#add-printer').addEventListener('click', () => showToast('已进入添加打印机流程'));
renderState();
