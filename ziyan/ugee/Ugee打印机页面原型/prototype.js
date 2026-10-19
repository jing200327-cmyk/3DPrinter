const queueToggle = document.querySelector('#queue-toggle');
const printQueue = document.querySelector('#print-queue');
const pauseButton = document.querySelector('#pause-print');
const cancelButton = document.querySelector('#cancel-print');
const taskState = document.querySelector('#task-state');
const carousel = document.querySelector('#control-carousel');
const carouselDots = [...document.querySelectorAll('.carousel-dots span')];
const toast = document.querySelector('#toast');
const dialog = document.querySelector('#action-dialog');
const dialogTitle = document.querySelector('#dialog-title');
const dialogCopy = document.querySelector('#dialog-copy');
const dialogConfirm = document.querySelector('#dialog-confirm');

let toastTimer;
let pendingAction = null;

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('is-visible');
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 1800);
}

function openDialog({ title, copy, confirmText = '确认', action = null, destructive = false }) {
  dialogTitle.textContent = title;
  dialogCopy.textContent = copy;
  dialogConfirm.textContent = confirmText;
  dialogConfirm.style.background = destructive ? 'var(--danger)' : 'var(--blue)';
  pendingAction = action;
  dialog.showModal();
}

queueToggle.addEventListener('click', () => {
  const expanded = queueToggle.getAttribute('aria-expanded') === 'true';
  queueToggle.setAttribute('aria-expanded', String(!expanded));
  printQueue.hidden = expanded;
});

pauseButton.addEventListener('click', () => {
  const paused = pauseButton.dataset.paused === 'true';
  pauseButton.dataset.paused = String(!paused);
  pauseButton.querySelector('span:last-child').textContent = paused ? '暂停' : '继续';
  taskState.textContent = paused ? '打印中' : '已暂停';
  showToast(paused ? '打印任务已继续' : '打印任务已暂停');
});

cancelButton.addEventListener('click', () => {
  openDialog({
    title: '取消打印任务？',
    copy: '取消后当前打印将停止，已完成的进度无法恢复。',
    confirmText: '取消任务',
    action: 'cancel-print',
    destructive: true
  });
});

document.querySelector('#printer-switch').addEventListener('click', () => {
  openDialog({
    title: '切换打印机',
    copy: '当前设备为 UG-07，暂无其他在线打印机。',
    confirmText: '知道了'
  });
});

document.querySelector('#printer-settings').addEventListener('click', () => {
  showToast('已进入 UG-07 打印机设置');
});

document.querySelector('#feed-filament').addEventListener('click', () => {
  showToast('开始进料，请确认喷嘴已预热');
});

document.querySelector('#retract-filament').addEventListener('click', () => {
  showToast('开始退料，请确认喷嘴已预热');
});

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
  if (!isDragging) return;
  carousel.scrollLeft = dragStartScroll - (event.clientX - dragStartX);
});

carousel.addEventListener('pointerup', (event) => {
  if (!isDragging) return;
  isDragging = false;
  carousel.releasePointerCapture(event.pointerId);
  const target = carousel.scrollLeft > 54 ? carousel.scrollWidth - carousel.clientWidth : 0;
  carousel.scrollTo({ left: target, behavior: 'smooth' });
});

dialog.addEventListener('close', () => {
  if (dialog.returnValue !== 'confirm' || !pendingAction) {
    pendingAction = null;
    return;
  }

  if (pendingAction === 'cancel-print') {
    taskState.textContent = '已取消';
    pauseButton.disabled = true;
    cancelButton.disabled = true;
    showToast('打印任务已取消');
  }
  pendingAction = null;
});
