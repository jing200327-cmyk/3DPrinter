/* 设备控制：仅模拟界面与数值，不向真实打印机发送指令。 */
(() => {
  Object.assign(reuseScreenNames, {
    deviceControl: '#device-control-screen',
    motionControl: '#motion-control-screen',
    temperatureControl: '#temperature-screen',
  });
  const $ = selector => document.querySelector(selector);
  const arrow = (direction, plate = false) => `<svg viewBox="0 0 32 32" aria-hidden="true"><g class="dc-arrow-${direction}"><path d="M16 25V7m-8 8 8-8 8 8"/></g>${plate ? '<path d="M5 29h22"/>' : ''}</svg>`;
  const status = time => `<div class="dc-status" aria-hidden="true"><span>${time}</span><span class="dc-status-icons"><svg viewBox="0 0 24 20"><path d="M2 19h3v-5H2zm5 0h3v-9H7zm5 0h3V6h-3zm5 0h3V2h-3z"/></svg><svg viewBox="0 0 24 20"><path d="M1 6a17 17 0 0 1 22 0l-2 3a13 13 0 0 0-18 0zm4 5a11 11 0 0 1 14 0l-2 3a7 7 0 0 0-10 0zm4 5a4 4 0 0 1 6 0l-3 4z"/></svg><span class="dc-battery">99</span></span></div>`;
  const header = (title, back, time = '16:32') => `${status(time)}<header class="dc-nav"><button id="${back}" class="dc-back" type="button" aria-label="返回${title === '设备控制' ? '设备设置' : '设备控制'}"><svg viewBox="0 0 20 28" aria-hidden="true"><path d="m14 4-9 10 9 10"/></svg></button><h2>${title}</h2></header>`;
  const home = '<div class="dc-home-indicator" aria-hidden="true"></div>';
  const row = (id, title, copy) => `<button id="${id}" class="dc-menu-row" type="button"><span><strong>${title}</strong><small>${copy}</small></span><span class="dc-menu-chevron" aria-hidden="true">›</span></button>`;
  $('#device-control-screen').innerHTML = `<div class="reuse-screen-frame"><div class="dc-page dc-menu-page">
    ${header('设备控制', 'device-control-back')}
    <div class="dc-menu-list">
      ${row('open-motion-control', '运动控制', 'X/Y/Z轴移动')}
      ${row('open-temperature-control', '温度控制', '喷嘴目标温度设置与加热控制')}
      <div class="dc-menu-row"><span><strong>舱外灯</strong><small>灯光开关</small></span><button id="exterior-light" class="dc-switch" type="button" role="switch" aria-label="舱外灯" aria-checked="false"></button></div>
      ${row('open-level-calibration', '调平校准', '启动调平校准流程')}
    </div>${home}
  </div></div>`;

  const axes = ['x', 'y', 'z'];
  const axisRows = axes.map(axis => `<div class="dc-axis-row dc-axis-row--${axis}">
    <label for="axis-value-${axis}">${axis.toUpperCase()}轴</label><div class="dc-axis-controls">
      <button class="dc-axis-arrow" type="button" data-axis="${axis}" data-direction="${axis === 'x' ? '-1' : '1'}" aria-label="${axis.toUpperCase()}轴${axis === 'x' ? '向左减少' : '向上增加'}">${arrow(axis === 'x' ? 'left' : 'up', axis === 'z')}</button>
      <output id="axis-value-${axis}" data-axis-value="${axis}" aria-live="polite">${axis === 'x' ? 0 : 180}</output>
      <button class="dc-axis-arrow" type="button" data-axis="${axis}" data-direction="${axis === 'x' ? '1' : '-1'}" aria-label="${axis.toUpperCase()}轴${axis === 'x' ? '向右增加' : '向下减少'}">${arrow(axis === 'x' ? 'right' : 'down', axis === 'z')}</button>
    </div></div>`).join('');
  $('#motion-control-screen').innerHTML = `<div class="reuse-screen-frame"><div class="dc-page">
    ${header('移动', 'motion-control-back')}
    <fieldset class="dc-distance"><legend>设置移动距离</legend><div class="dc-distance-options" role="radiogroup" aria-label="移动距离">${[1, 5, 10].map(step => `<button type="button" role="radio" data-move-step="${step}" aria-checked="${step === 1}" tabindex="${step === 1 ? 0 : -1}">${step}mm</button>`).join('')}</div></fieldset>
    ${axisRows}
    <div class="dc-motor"><span class="dc-motor-label"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 8h21a3 3 0 0 1 3 3v14H3V11a3 3 0 0 1 2-3zm3-5h8v4H8zm11 0h7v3h-7zM0 14h3v8H0zm29 0h3v8h-3z"/><path d="m11 10-5 9h5l-2 6 9-11h-6l2-4" fill="#fff"/><circle cx="23" cy="16" r="4" fill="#fff"/></svg>电机释放</span><button id="motor-release" class="dc-switch" type="button" role="switch" aria-label="电机释放" aria-checked="false"></button></div>
    <p class="dc-motor-hint">电机释放后关闭电机保持力矩，可手动移动打印头。</p>
    <button id="motion-reset" class="dc-reset dc-gradient-button" type="button">重置</button>${home}
  </div></div>`;

  $('#temperature-screen').innerHTML = `<div class="reuse-screen-frame"><div class="dc-page dc-temperature-page">
    ${header('预热', 'temperature-back', '17:10')}
    <div class="dc-nozzle-label"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1 3h22v3H1zm4 4h14v7H5zm4 8h6l-3 7z"/></svg>喷头温度</div>
    <button id="edit-nozzle-target" class="dc-temperature-orb" type="button" aria-label="调整喷嘴目标温度">
      <span class="dc-temperature-numbers"><span class="dc-current"><span id="nozzle-current">110</span>℃</span><span class="dc-temperature-divider">/</span><span class="dc-target"><span id="nozzle-target">200</span>℃</span></span>
      <span class="dc-edit-target"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16-1 5 5-1L21 7a2 2 0 0 0-4-4zm11-11 4 4M15 22h7"/></svg>调整目标温度</span>
    </button>
    <p id="temperature-operation-status" class="dc-temperature-state" role="status"></p>
    <p id="temperature-warning" class="dc-temperature-warning"><span aria-hidden="true">⚠</span>请先调整喷头目标温度，再开始加热</p>
    <div class="dc-temperature-actions"><button id="temperature-cool" class="dc-cool-button" type="button">降温</button><button id="temperature-heat" class="dc-gradient-button" type="button">升温</button></div>${home}
  </div></div>`;
  document.body.insertAdjacentHTML('beforeend', `
    <dialog id="temperature-target-dialog" class="dc-target-drawer" aria-labelledby="temperature-target-title">
      <form id="temperature-target-form" novalidate>
        <button id="close-temperature-target" class="app-dialog-close" type="button" aria-label="关闭目标温度设置">×</button>
        <h2 id="temperature-target-title">设置目标温度</h2>
        <label for="nozzle-target-input">喷嘴目标温度</label>
        <div class="dc-target-input-wrap"><input id="nozzle-target-input" type="number" min="190" max="260" step="any" inputmode="decimal" required aria-describedby="temperature-target-range temperature-target-error"><span>℃</span></div>
        <p id="temperature-target-range" class="dc-target-range">* 目标温度范围为190℃–260℃</p>
        <p id="temperature-target-error" class="dc-target-error" role="alert" hidden>请输入190℃到260℃之间的目标温度</p>
        <button id="save-nozzle-target" class="dc-target-save" type="submit">保存</button>
      </form>
    </dialog>
    <dialog id="temperature-cancel-dialog" class="app-dialog" aria-labelledby="temperature-cancel-title">
      <form method="dialog"><h2 id="temperature-cancel-title">确认取消后将不再保留当前操作</h2><div class="dialog-actions"><button id="temperature-keep-operation" value="keep">取消</button><button id="temperature-confirm-cancel" value="confirm" data-tone="primary">确定</button></div></form>
    </dialog>`);

  $('#open-device-control').addEventListener('click', () => openReuseScreen('deviceControl'));
  $('#open-motion-control').addEventListener('click', () => openReuseScreen('motionControl'));
  $('#open-temperature-control').addEventListener('click', () => openReuseScreen('temperatureControl'));
  $('#device-control-back').addEventListener('click', goBackInReuseScreens);
  $('#motion-control-back').addEventListener('click', goBackInReuseScreens);
  $('#temperature-back').addEventListener('click', goBackInReuseScreens);
  $('#open-level-calibration').addEventListener('click', () => showToast('调平校准页面暂未开放'));
  const toggle = button => {
    const checked = button.getAttribute('aria-checked') !== 'true';
    button.setAttribute('aria-checked', String(checked));
    return checked;
  };
  $('#exterior-light').addEventListener('click', event => toggle(event.currentTarget));
  $('#motor-release').addEventListener('click', event => {
    showToast(toggle(event.currentTarget) ? '电机已释放，可手动移动打印头' : '电机保持力矩已恢复');
  });
  let moveStep = 1;
  const positions = { x: 0, y: 180, z: 180 };
  const stepButtons = [...document.querySelectorAll('[data-move-step]')];
  function selectStep(button) {
    moveStep = Number(button.dataset.moveStep);
    stepButtons.forEach(item => {
      const selected = item === button;
      item.setAttribute('aria-checked', String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
  }
  stepButtons.forEach((button, index) => {
    button.addEventListener('click', () => selectStep(button));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const next = stepButtons[(index + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? 2 : 1)) % 3];
      selectStep(next);
      next.focus();
    });
  });
  document.querySelectorAll('[data-axis][data-direction]').forEach(button => button.addEventListener('click', () => {
    const axis = button.dataset.axis;
    const next = positions[axis] + Number(button.dataset.direction) * moveStep;
    if (next < 0 || next > 180) return showToast('可调节范围是0-180mm');
    positions[axis] = next;
    $(`[data-axis-value="${axis}"]`).textContent = String(next);
  }));
  $('#motion-reset').addEventListener('click', () => {
    Object.assign(positions, { x: 0, y: 180, z: 180 });
    axes.forEach(axis => { $(`[data-axis-value="${axis}"]`).textContent = String(positions[axis]); });
    $('#motor-release').setAttribute('aria-checked', 'false');
    showToast('已重置为 X:0 / Y:180 / Z:180');
  });

  const temperatureScreen = $('#temperature-screen');
  const targetDialog = $('#temperature-target-dialog');
  const cancelDialog = $('#temperature-cancel-dialog');
  let targetTemperature = 200;
  let currentTemperature = 110;
  let targetSaved = false;
  let operation = 'idle';
  let temperatureTimer = null;
  function renderTemperature(message = '') {
    temperatureScreen.dataset.operation = operation;
    $('#nozzle-current').textContent = String(currentTemperature);
    $('#nozzle-target').textContent = String(targetTemperature);
    $('#temperature-operation-status').textContent = message;
    $('#temperature-warning').hidden = targetSaved;
    $('#edit-nozzle-target').disabled = operation !== 'idle';
    for (const name of ['heat', 'cool']) {
      $(`#temperature-${name}`).textContent = operation === name ? '取消' : name === 'heat' ? '升温' : '降温';
      $(`#temperature-${name}`).disabled = operation !== 'idle' && operation !== name;
    }
  }
  function stopTemperature(message = '') {
    window.clearInterval(temperatureTimer);
    temperatureTimer = null;
    operation = 'idle';
    renderTemperature(message);
  }
  $('#edit-nozzle-target').addEventListener('click', () => {
    $('#nozzle-target-input').value = String(targetTemperature);
    $('#temperature-target-error').hidden = true;
    $('#nozzle-target-input').removeAttribute('aria-invalid');
    targetDialog.showModal();
    $('#nozzle-target-input').focus();
    $('#nozzle-target-input').select();
  });
  $('#close-temperature-target').addEventListener('click', () => targetDialog.close());
  $('#temperature-target-form').addEventListener('submit', event => {
    event.preventDefault();
    const input = $('#nozzle-target-input');
    const value = input.valueAsNumber;
    if (!Number.isFinite(value) || value < 190 || value > 260) {
      $('#temperature-target-error').hidden = false;
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }
    targetTemperature = value;
    targetSaved = true;
    renderTemperature('目标温度已设置');
    targetDialog.close();
  });
  function startTemperature(name) {
    if (operation === name) return cancelDialog.showModal();
    if (operation !== 'idle') return;
    if (!targetSaved) return showToast('请先设置190℃–260℃的目标温度');
    const goal = name === 'heat' ? targetTemperature : 25;
    if (name === 'heat' && currentTemperature >= goal) return renderTemperature('当前温度已达到目标温度');
    if (name === 'cool' && currentTemperature <= goal) return renderTemperature('已降至室温');
    operation = name;
    const message = name === 'heat' ? '升温中…' : '降温中…';
    renderTemperature(message);
    temperatureTimer = window.setInterval(() => {
      // 每300ms模拟变化3℃；目标为小数时也精确收敛，不越过终点。
      currentTemperature = name === 'heat' ? Math.min(goal, currentTemperature + 3) : Math.max(goal, currentTemperature - 3);
      renderTemperature(message);
      if (currentTemperature === goal) stopTemperature(name === 'heat' ? '已达到目标温度' : '已降至室温');
    }, 300);
  }
  $('#temperature-heat').addEventListener('click', () => startTemperature('heat'));
  $('#temperature-cool').addEventListener('click', () => startTemperature('cool'));
  // 确认框显示期间操作继续；点“取消”或Esc保留，点“确定”才停止。
  $('#temperature-confirm-cancel').addEventListener('click', () => stopTemperature('操作已取消'));
  // 页面退出时停止模拟，避免隐藏页面的温度继续变化。
  new MutationObserver(() => {
    if (temperatureScreen.hidden) {
      stopTemperature();
      if (targetDialog.open) targetDialog.close();
      if (cancelDialog.open) cancelDialog.close();
    }
  }).observe(temperatureScreen, { attributes: true, attributeFilter: ['hidden'] });
  renderTemperature();
})();
