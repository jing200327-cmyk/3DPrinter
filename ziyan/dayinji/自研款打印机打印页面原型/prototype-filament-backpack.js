/* 小书包料盘独立记录状态；操作动画复用现有进退料流程。 */
const filamentBackpack = {
  active: false,
  selected: null,
  operationSlot: null,
  previousPhase: null,
  rack: null,
  slots: ['blue', 'yellow', 'green', 'pink'].map(color => ({ present: false, phase: 'ready', color })),
  palette: {
    blue: { name: '蓝色', hex: '#5796f3' }, yellow: { name: '黄色', hex: '#ecb657' },
    green: { name: '绿色', hex: '#75b8a2' }, pink: { name: '粉色', hex: '#ed96ad' },
    indigo: { name: '蓝紫色', hex: '#5868ce' }, red: { name: '红色', hex: '#e96969' },
    white: { name: '白色', hex: '#f1f2f4' }, black: { name: '黑色', hex: '#343b43' }
  },
  labels: { ready: '待进料', feeding: '进料中', loaded: '进料完成', retracting: '退料中', retracted: '退料完成' },
  colors: ['#5796f3', '#ecb657', '#75b8a2', '#ed96ad'],
  canOperate(operation) {
    const slot = this.slots[this.selected];
    if (!slot?.present) return false;
    if (foState.running) return this.operationSlot === this.selected && foState.operation === operation;
    return operation === 'feed' ? ['ready', 'retracted'].includes(slot.phase) : slot.phase === 'loaded';
  },
  begin(operation) {
    this.operationSlot = this.selected;
    const slot = this.slots[this.selected];
    this.previousPhase = slot.phase;
    slot.phase = operation === 'feed' ? 'feeding' : 'retracting';
  },
  complete(operation) {
    const slot = this.slots[this.operationSlot];
    if (slot) slot.phase = operation === 'feed' ? 'loaded' : 'retracted';
  },
  abort() {
    const slot = this.slots[this.operationSlot];
    if (slot) slot.phase = this.previousPhase;
    setFilamentFed(slot?.phase === 'loaded');
    this.operationSlot = null;
  },
  render() {
    document.querySelectorAll('.bp-slot').forEach((button, index) => {
      const slot = this.slots[index];
      const selected = index === this.selected;
      button.disabled = !slot.present || (foState.running && index !== this.operationSlot);
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-label', `${index + 1}号料盘，${slot.present ? this.labels[slot.phase] : '空'}${selected ? '，已选中' : ''}`);
      button.classList.toggle('is-selected', selected);
      button.classList.toggle('has-material', slot.present);
      button.parentElement.style.setProperty('--spool-color', this.palette[slot.color].hex);
      button.parentElement.querySelector('.bp-slot-label').textContent = slot.present ? 'PLA' : '空';
    });
    const slot = this.slots[this.selected];
    const status = slot?.present && slot.phase !== 'ready' ? `${this.selected + 1}号料盘${this.labels[slot.phase]}` : '';
    filamentStatus.hidden = !status;
    filamentStatus.textContent = status;
    for (const [operation, button] of [['feed', loadFilamentButton], ['retract', unloadFilamentButton]]) {
      const busy = slot?.phase === (operation === 'feed' ? 'feeding' : 'retracting');
      const text = operation === 'feed' ? '进料' : '退料';
      button.disabled = !this.canOperate(operation);
      button.classList.toggle('is-active', !button.disabled);
      button.classList.toggle('is-busy', busy);
      button.textContent = busy ? `${text}中...` : text;
      button.setAttribute('aria-label', busy ? `${text}中，点击查看${text}进度` : text);
    }
  },
  switchSource(source) {
    if (foState.running || !filamentGuide.hidden || !filamentOperationScreen.hidden) {
      showToast('请完成或退出当前耗材操作后再切换来源');
      document.querySelector('#simulation-filament-source').value = this.active ? 'backpack' : 'rack';
      return;
    }
    const next = source === 'backpack';
    if (next === this.active) return;
    const keepPreparation = ['preparePrint', 'prepareState'].includes(reuseStack.at(-1));
    if (!keepPreparation) closeReuseScreens();
    if (next) {
      this.rack = { ...filamentPanel.dataset };
      this.selected = null;
      filamentPanel.dataset.filamentState = 'idle';
      filamentPanel.dataset.filamentSensor = 'absent';
      filamentPanel.dataset.filamentFed = 'no';
    } else {
      Object.assign(filamentPanel.dataset, this.rack);
    }
    this.active = next;
    const url = new URL(window.location.href);
    if (next) url.searchParams.set('filamentSource', 'backpack');
    else url.searchParams.delete('filamentSource');
    window.history.replaceState(null, '', url);
    filamentPanel.classList.toggle('is-backpack', next);
    document.querySelector('#backpack-panel').hidden = !next;
    document.querySelector('#simulation-backpack-slot-control').hidden = !next;
    document.querySelector('#simulation-backpack-color-control').hidden = !next;
    document.querySelector('#simulation-filament-sensor').value = filamentPanel.dataset.filamentSensor;
    document.querySelector('#simulation-filament-fed').value = filamentPanel.dataset.filamentFed;
    this.updateSimulationStatus();
    renderFilamentPanel();
    if (!keepPreparation) filamentPanel.scrollIntoView({ block: 'center', behavior: 'instant' });
  },
  simulatePresence(present) {
    if (foState.running) return showToast('请完成或取消当前操作后再修改料槽');
    const index = Number(document.querySelector('#simulation-backpack-slot').value);
    this.slots[index] = { present, phase: 'ready', color: this.slots[index].color };
    this.selected = null;
    filamentPanel.dataset.filamentSensor = present ? 'present' : 'absent';
    document.querySelector('#simulation-filament-sensor').value = filamentPanel.dataset.filamentSensor;
    setFilamentFed(false);
    this.updateSimulationStatus();
    renderFilamentPanel();
    if (!reuseStack.length) filamentPanel.scrollIntoView({ block: 'center', behavior: 'instant' });
  },
  updateSimulationStatus() {
    document.querySelector('#simulation-filament-status').textContent = this.active
      ? `当前：小书包 · ${this.slots.filter(slot => slot.present).length}/4 个料槽有耗材`
      : '当前：料架';
  }
};

const bpSpool = index => `<svg viewBox="0 0 72 72" aria-hidden="true"><circle class="bp-winding" cx="36" cy="36" r="26"/><g fill="none" stroke="currentColor" stroke-width="4.4"><circle cx="36" cy="36" r="29"/><circle cx="36" cy="36" r="13"/>${Array.from({ length: 6 }, (_, n) => `<path transform="rotate(${n * 60} 36 36)" d="M31 8v15m10-15v15"/>`).join('')}</g><circle cx="36" cy="36" r="8.5" fill="white" stroke="currentColor" stroke-width="2"/><text x="36" y="39.5" text-anchor="middle" fill="currentColor" font-size="10" font-weight="700">${index + 1}</text></svg>`;
document.querySelector('.filament-panel-canvas').insertAdjacentHTML('beforeend', `<div id="backpack-panel" hidden><h2 class="bp-title">耗材-小书包</h2><div class="bp-slots">${filamentBackpack.slots.map((_, index) => `<div class="bp-slot-item" style="--spool-color:${filamentBackpack.colors[index]}"><span class="bp-slot-label">空</span><button class="bp-slot" type="button" data-slot="${index}" disabled aria-pressed="false" aria-label="${index + 1}号料盘，空">${bpSpool(index)}</button><button class="bp-edit" type="button" data-slot="${index}" aria-label="编辑${index + 1}号料盘"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 15-1 5 5-1L20 8l-4-4zM14 6l4 4M13 21h8"/></svg></button></div>`).join('')}</div></div>`);
document.querySelectorAll('.bp-slot').forEach(button => button.addEventListener('click', () => {
  const index = Number(button.dataset.slot);
  if (!filamentBackpack.slots[index].present) return;
  filamentBackpack.selected = filamentBackpack.selected === index ? null : index;
  if (foState.running) filamentBackpack.selected = filamentBackpack.operationSlot;
  if (!foState.running) setFilamentFed(filamentBackpack.slots[index].phase === 'loaded');
  renderFilamentPanel();
}));
document.querySelectorAll('.bp-edit').forEach(button => button.addEventListener('click', () => {
  const index = Number(button.dataset.slot);
  if (!filamentBackpack.slots[index].present) return showToast('当前无耗材');
  if (foState.running) return showToast('耗材操作中，请完成后再编辑');
  filamentBackpack.selected = index;
  renderFilamentPanel();
  openReuseScreen('materialSettings');
}));

document.querySelector('#simulation-backpack-slot').addEventListener('change', event => {
  document.querySelector('#simulation-backpack-color').value = filamentBackpack.slots[Number(event.target.value)].color;
});
document.querySelector('#simulation-backpack-color').addEventListener('change', event => {
  const index = Number(document.querySelector('#simulation-backpack-slot').value);
  if (foState.running) {
    event.target.value = filamentBackpack.slots[index].color;
    return showToast('耗材操作中，请完成后再修改颜色');
  }
  filamentBackpack.slots[index].color = event.target.value;
  renderFilamentPanel();
});
