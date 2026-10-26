/* 九点调平演示：数值以 0.1 mm 的整数倍保存，不向真实打印机发送指令。 */
(() => {
  reuseScreenNames.calibration = '#calibration-screen';
  const screen = document.querySelector('#calibration-screen');
  const $ = selector => screen.querySelector(selector);
  // 从左下角向右开始，按逐行 S 形顺序经过九点。
  const path = [6, 7, 8, 5, 4, 3, 0, 1, 2];
  const initialOffsets = [-3, 2, 0, 0, 0, 0, 0, -1, 0];
  let offsets = [...initialOffsets];
  let current = 0;
  let selectedDirection = null;
  let busy = false;
  const arrow = direction => `<svg viewBox="0 0 32 32" aria-hidden="true"><g class="dc-arrow-${direction}"><path d="M16 25V7m-8 8 8-8 8 8"/></g></svg>`;
  screen.innerHTML = `<div class="reuse-screen-frame"><div class="dc-page calibration-page">
    <div class="dc-status" aria-hidden="true"><span>09:25</span><span class="dc-status-icons"><svg viewBox="0 0 24 20"><path d="M2 19h3v-5H2zm5 0h3v-9H7zm5 0h3V6h-3zm5 0h3V2h-3z"/></svg><svg viewBox="0 0 24 20"><path d="M1 6a17 17 0 0 1 22 0l-2 3a13 13 0 0 0-18 0zm4 5a11 11 0 0 1 14 0l-2 3a7 7 0 0 0-10 0zm4 5a4 4 0 0 1 6 0l-3 4z"/></svg><span class="dc-battery">39</span></span></div>
    <header class="dc-nav"><button id="calibration-exit" class="dc-back" type="button" aria-label="退出调平校准"><svg viewBox="0 0 20 28" aria-hidden="true"><path d="m14 4-9 10 9 10"/></svg></button><h2>调平</h2></header>
    <div class="calibration-progress" aria-label="第一步：清洁喷头；第二步：九点调平"><span class="calibration-progress-first"></span><span class="calibration-progress-line"></span><span class="calibration-progress-second"></span></div>
    <div id="calibration-clean-stage">
      <h3 class="calibration-clean-title">清洁喷头</h3>
      <p class="calibration-clean-copy">调平前，请保持喷头整洁，以保证调平效果</p>
      <div class="calibration-clean-photo" role="img" aria-label="清洁打印机喷头示意图"><img src="assets/calibration-clean-reference.jpg" alt=""></div>
      <button id="calibration-continue" class="calibration-continue dc-gradient-button" type="button">继续</button>
    </div>
    <div id="calibration-points-stage" hidden>
      <h3 class="calibration-count" aria-live="polite"><span id="calibration-step">1</span>/9</h3>
      <p class="calibration-guidance">使用↑或↓功能，使喷头刚好能接触到打印底板上，即可完成</p>
      <div class="calibration-grid" role="img" aria-label="九点校准位置"><span class="calibration-grid-outline" aria-hidden="true"></span>${Array.from({ length: 9 }, (_, position) => `<span class="calibration-point" data-position="${position}" data-state="pending" style="--point-column:${position % 3};--point-row:${Math.floor(position / 3)}"></span>`).join('')}</div>
      <div class="calibration-offset-card">
        <span class="calibration-offset-label">Z 轴偏移</span><output id="calibration-offset" aria-live="polite">-0.3 mm</output>
        <small>*每轻触一次，喷嘴移动 0.1 毫米。</small>
        <button id="calibration-up" class="dc-axis-arrow" type="button" aria-label="Z轴偏移增加0.1毫米" aria-pressed="false">${arrow('up')}</button>
        <button id="calibration-down" class="dc-axis-arrow" type="button" aria-label="Z轴偏移减少0.1毫米" aria-pressed="false">${arrow('down')}</button>
      </div>
      <div class="calibration-actions"><button id="calibration-retry" class="calibration-outline-button" type="button">重试</button><button id="calibration-next" class="dc-gradient-button" type="button">下一步</button></div>
    </div>
    <div class="dc-home-indicator" aria-hidden="true"></div>
  </div></div>`;
  document.body.insertAdjacentHTML('beforeend', `
    <dialog id="calibration-processing-dialog" class="calibration-processing-dialog" aria-labelledby="calibration-processing-label" aria-busy="true">
      <div class="transition-card"><img class="transition-mascot" src="assets/过渡-蓝色小人.png" alt=""><p id="calibration-processing-label" class="transition-label">任务处理中...</p></div>
    </dialog>
    <dialog id="calibration-exit-dialog" class="app-dialog" aria-labelledby="calibration-exit-title">
      <form method="dialog"><h2 id="calibration-exit-title">退出设置的参数将全部丢失</h2><div class="dialog-actions"><button id="calibration-exit-cancel" value="cancel">取消</button><button id="calibration-exit-confirm" type="button" data-tone="primary">确定</button></div></form>
    </dialog>`);
  const processing = document.querySelector('#calibration-processing-dialog');
  const exitDialog = document.querySelector('#calibration-exit-dialog');
  const points = [...screen.querySelectorAll('.calibration-point')];

  function render() {
    $('#calibration-step').textContent = current + 1;
    $('#calibration-offset').textContent = `${(offsets[current] / 10).toFixed(1)} mm`;
    $('#calibration-next').textContent = current === 8 ? '完成' : '下一步';
    $('#calibration-up').setAttribute('aria-pressed', String(selectedDirection === 1));
    $('#calibration-down').setAttribute('aria-pressed', String(selectedDirection === -1));
    points.forEach((point, position) => {
      const step = path.indexOf(position);
      point.dataset.state = step < current ? 'complete' : step === current ? 'current' : 'pending';
    });
    $('.calibration-grid').setAttribute('aria-label', `九点校准，第${current + 1}点，已完成${current}点`);
  }
  function reset() {
    current = 0;
    offsets = [...initialOffsets];
    selectedDirection = null;
    render();
  }
  function setStage(stage) {
    screen.dataset.stage = stage;
    $('#calibration-clean-stage').hidden = stage !== 'clean';
    $('#calibration-points-stage').hidden = stage !== 'points';
  }
  // 原生模态弹窗阻止鼠标、触摸及键盘操作背景；Esc 也不能跳过等待。
  function execute(action) {
    if (busy) return;
    busy = true;
    screen.inert = true;
    screen.setAttribute('aria-busy', 'true');
    processing.showModal();
    setTimeout(() => {
      processing.close();
      screen.inert = false;
      screen.removeAttribute('aria-busy');
      busy = false;
      action();
    }, 3000);
  }
  processing.addEventListener('cancel', event => event.preventDefault());
  document.querySelector('#open-level-calibration').addEventListener('click', () => {
    reset();
    setStage('clean');
    openReuseScreen('calibration');
  });
  $('#calibration-continue').addEventListener('click', () => execute(() => {
    setStage('points');
    screen.focus({ preventScroll: true });
  }));
  function adjust(direction) {
    if (busy) return;
    selectedDirection = direction;
    render();
    execute(() => { offsets[current] += direction; render(); });
  }
  $('#calibration-up').addEventListener('click', () => adjust(1));
  $('#calibration-down').addEventListener('click', () => adjust(-1));
  $('#calibration-retry').addEventListener('click', () => execute(reset));
  $('#calibration-next').addEventListener('click', () => execute(() => {
    if (current === 8) {
      // 仅作为本次演示的完成记录，退出确认时不保留未完成的草稿。
      screen.dataset.completedOffsets = JSON.stringify(offsets.map(value => value / 10));
      returnToReuseScreen('deviceControl');
      reset();
      setStage('clean');
      showToast('调平校准已完成');
      return;
    }
    current += 1;
    selectedDirection = null;
    render();
  }));
  $('#calibration-exit').addEventListener('click', () => { if (!busy) exitDialog.showModal(); });
  document.querySelector('#calibration-exit-confirm').addEventListener('click', () => {
    exitDialog.close();
    execute(() => {
      reset();
      setStage('clean');
      returnToReuseScreen('deviceControl');
    });
  });
  render();
})();
