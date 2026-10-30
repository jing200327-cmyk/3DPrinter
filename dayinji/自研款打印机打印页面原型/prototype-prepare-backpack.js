/* 准备打印页与耗材面板共享 slots；手动映射按模型盘保存，弹窗取消不提交。 */
const prepareBackpack = {
  manualSlots: new Map(),
  material: null,
  pendingSlot: null,
  warningAtOpen: false,
  get dialog() { return document.querySelector('#backpack-material-picker'); },
  modelColor(material) {
    const name = material.querySelector('.prepare-material-color').textContent.trim();
    return Object.values(filamentBackpack.palette).find(color => color.name === name) || filamentBackpack.palette.blue;
  },
  key(material) {
    const row = material.closest('.prepare-plate');
    return `${row?.dataset.plate || row?.dataset.row}:${this.modelColor(material).name}`;
  },
  match(material) {
    const available = filamentBackpack.slots.map((slot, index) => ({ ...slot, index })).filter(slot => slot.present);
    const manual = this.manualSlots.get(this.key(material));
    if (available.some(slot => slot.index === manual?.index && slot.color === manual.color)) return manual.index;
    this.manualSlots.delete(this.key(material));
    const rgb = hex => hex.match(/[a-f0-9]{2}/gi).map(value => parseInt(value, 16));
    const model = rgb(this.modelColor(material).hex);
    const distance = slot => rgb(filamentBackpack.palette[slot.color].hex).reduce((sum, value, index) => sum + (value - model[index]) ** 2, 0);
    available.sort((a, b) => distance(a) - distance(b) || a.index - b.index);
    return available[0]?.index ?? null;
  },
  mismatched(material, index) {
    return index === null || this.modelColor(material).hex !== filamentBackpack.palette[filamentBackpack.slots[index].color].hex;
  },
  acknowledged(material, index) {
    const manual = this.manualSlots.get(this.key(material));
    return index !== null && manual?.index === index && manual.color === filamentBackpack.slots[index].color;
  },
  needsConfirmation(material, index) {
    return this.mismatched(material, index) && !this.acknowledged(material, index);
  },
  renderMaterial(material, warning) {
    material.classList.add('is-backpack-material');
    const index = this.match(material);
    const empty = index === null;
    const mismatch = this.needsConfirmation(material, index);
    material.dataset.backpackSlot = empty ? '' : String(index);
    material.dataset.backpackMismatch = String(mismatch);
    material.classList.toggle('prepare-material--empty', empty);
    material.classList.toggle('prepare-material--mismatch', mismatch);
    material.querySelector('.prepare-material-color').style.background = this.modelColor(material).hex;
    const body = material.querySelector('.prepare-material-body');
    let colorLabel = body.querySelector('.prepare-loaded-color');
    if (!colorLabel) {
      colorLabel = document.createElement('span');
      colorLabel.className = 'prepare-loaded-color';
      colorLabel.dataset.backpackAdded = 'true';
      body.append(colorLabel);
    }
    if (colorLabel.dataset.backpackOriginalText === undefined) colorLabel.dataset.backpackOriginalText = colorLabel.textContent;
    colorLabel.hidden = empty || mismatch;
    const colorName = empty ? '' : filamentBackpack.palette[filamentBackpack.slots[index].color].name;
    colorLabel.textContent = this.acknowledged(material, index) ? `${index + 1}号 ${colorName}` : colorName;
    let spool = body.querySelector('.prepare-backpack-spool');
    if (!spool) {
      spool = document.createElement('span');
      spool.className = 'prepare-backpack-spool';
      spool.setAttribute('aria-hidden', 'true');
      body.prepend(spool);
    }
    spool.hidden = empty || mismatch;
    if (!empty) {
      spool.innerHTML = bpSpool(index);
      spool.style.setProperty('--spool-color', filamentBackpack.palette[filamentBackpack.slots[index].color].hex);
    }
    const image = body.querySelector('.prepare-spool');
    image.hidden = !empty;
    if (empty) { image.src = 'assets/prepare-empty-spool.svg'; image.alt = '未安装耗材'; }
    warning.hidden = !mismatch;
    warning.setAttribute('aria-label', empty ? '未检测到耗材' : '颜色不匹配');
    material.setAttribute('aria-label', `${this.modelColor(material).name}模型，${empty ? '未安装耗材' : `${index + 1}号料槽${colorName}`}${mismatch ? '，耗材不匹配' : ''}`);
    let button = body.querySelector('.prepare-backpack-trigger');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'prepare-backpack-trigger';
      button.addEventListener('pointerdown', event => event.stopPropagation());
      button.addEventListener('click', event => { event.stopPropagation(); this.open(material); });
      body.append(button);
    }
    button.setAttribute('aria-label', `选择要打印的耗材，${material.getAttribute('aria-label')}`);
    button.disabled = material.closest('.state-row')?.classList.contains('is-stamped') || false;
  },
  restoreMaterial(material) {
    material.classList.remove('is-backpack-material');
    material.classList.toggle('prepare-material--mismatch', material.dataset.materialDefaultWarning === 'true');
    material.querySelector('.prepare-material-color').style.removeProperty('background');
    material.querySelector('.prepare-spool').hidden = false;
    material.querySelectorAll('.prepare-backpack-spool, .prepare-backpack-trigger').forEach(node => node.remove());
    const label = material.querySelector('.prepare-loaded-color');
    if (label?.dataset.backpackAdded) label.remove();
    else if (label?.dataset.backpackOriginalText !== undefined) label.textContent = label.dataset.backpackOriginalText;
  },
  open(material) {
    this.material = material;
    this.pendingSlot = this.match(material);
    this.warningAtOpen = material.dataset.backpackMismatch === 'true';
    this.renderPicker();
    this.dialog.showModal();
  },
  renderPicker() {
    if (!this.material) return;
    if (!filamentBackpack.slots[this.pendingSlot]?.present) this.pendingSlot = this.match(this.material);
    const anyMaterial = filamentBackpack.slots.some(slot => slot.present);
    const warning = this.warningAtOpen || this.needsConfirmation(this.material, this.pendingSlot);
    document.querySelector('#backpack-material-warning').hidden = !warning;
    document.querySelector('#backpack-material-empty').hidden = anyMaterial;
    document.querySelector('#backpack-material-model').textContent = `模型颜色：${this.modelColor(this.material).name}`;
    document.querySelectorAll('.bp-picker-slot').forEach((button, index) => {
      const slot = filamentBackpack.slots[index];
      const color = filamentBackpack.palette[slot.color];
      button.disabled = !slot.present;
      button.classList.toggle('has-material', slot.present);
      button.setAttribute('aria-checked', String(slot.present && this.pendingSlot === index));
      button.setAttribute('aria-label', `${index + 1}号料槽，${slot.present ? color.name : '空'}`);
      button.style.setProperty('--spool-color', color.hex);
      button.querySelector('.bp-picker-presence').textContent = slot.present ? color.name : '空';
    });
    document.querySelector('#backpack-material-confirm').disabled = !filamentBackpack.slots[this.pendingSlot]?.present;
  }
};
document.body.insertAdjacentHTML('beforeend', `<dialog id="backpack-material-picker" class="bp-picker" aria-labelledby="backpack-material-title">
  <div class="bp-picker-handle" aria-hidden="true"></div>
  <header><h2 id="backpack-material-title">选择要打印的耗材</h2><button id="backpack-material-close" type="button" aria-label="关闭耗材选择">×</button></header>
  <p id="backpack-material-warning" class="bp-picker-warning" role="alert" hidden>颜色差异会导致耗材不匹配，请手动选择耗材</p>
  <p id="backpack-material-model" class="bp-picker-model"></p>
  <p id="backpack-material-empty" class="bp-picker-empty" hidden>未安装耗材，请先安装并进料</p>
  <div class="bp-picker-slots" role="radiogroup" aria-label="小书包料槽">${filamentBackpack.slots.map((_, index) => `<button class="bp-picker-slot" type="button" role="radio" aria-checked="false" data-slot="${index}"><span>${index + 1}号料槽</span>${bpSpool(index)}<span class="bp-picker-presence">空</span><i aria-hidden="true">✓</i></button>`).join('')}</div>
  <button id="backpack-material-confirm" class="bp-picker-confirm" type="button">确定</button>
</dialog>`);
document.querySelectorAll('.bp-picker-slot').forEach(button => button.addEventListener('click', () => {
  prepareBackpack.pendingSlot = Number(button.dataset.slot);
  prepareBackpack.renderPicker();
}));
document.querySelector('#backpack-material-close').addEventListener('click', () => prepareBackpack.dialog.close());
prepareBackpack.dialog.addEventListener('click', event => {
  if (event.target !== prepareBackpack.dialog) return;
  const rect = prepareBackpack.dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) prepareBackpack.dialog.close();
});
document.querySelector('#backpack-material-confirm').addEventListener('click', () => {
  if (!filamentBackpack.slots[prepareBackpack.pendingSlot]?.present) return;
  prepareBackpack.manualSlots.set(prepareBackpack.key(prepareBackpack.material), {
    index: prepareBackpack.pendingSlot,
    color: filamentBackpack.slots[prepareBackpack.pendingSlot].color
  });
  prepareBackpack.dialog.close();
  renderPrepareFilamentState();
});
