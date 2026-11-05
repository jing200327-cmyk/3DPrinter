/* M15 保存切片：仅模拟交互与保存进度，不接入本地或云端落库。 */
(() => {
  const saveButton = document.querySelector('#save-slice');
  let activeSaveButton = saveButton;
  const nameDialog = document.querySelector('#slice-name-dialog');
  const savingDialog = document.querySelector('#slice-saving-dialog');
  const successDialog = document.querySelector('#slice-success-dialog');
  const input = document.querySelector('#slice-name');
  const confirm = document.querySelector('#slice-name-confirm');
  const error = document.querySelector('#slice-name-error');
  const progress = document.querySelector('#slice-save-progress');
  const percentLabel = document.querySelector('#slice-save-percent');
  document.querySelectorAll('#leveling-toggle, #family-leveling-toggle').forEach(calibration => {
    calibration.addEventListener('click', () => {
      calibration.setAttribute('aria-checked', String(calibration.getAttribute('aria-checked') !== 'true'));
    });
  });

  function validateName() {
    const empty = !input.value.trim();
    confirm.disabled = empty;
    error.textContent = empty ? '名称不能为空' : '';
    input.setAttribute('aria-invalid', String(empty));
    document.querySelector('#slice-name-limit').textContent = `${input.value.length} / 40 字`;
    return !empty;
  }

  document.querySelectorAll('#save-slice, #family-save-slice').forEach(button => button.addEventListener('click', () => {
    activeSaveButton = button;
    const page = button.closest('.prepare-page');
    const row = button === saveButton ? plateRows.find(row => row.dataset.plate === (selectedPrintOrder()[0] || plateOrder[0])) : page.querySelector('.plate-list [aria-selected="true"]');
    const modelName = row?.querySelector('.prepare-model-name');
    input.value = (modelName?.textContent.trim() || '').slice(0, 40);
    validateName();
    nameDialog.showModal();
    input.select();
  }));
  input.addEventListener('input', validateName);
  document.querySelector('#slice-name-cancel').addEventListener('click', () => nameDialog.close());
  savingDialog.addEventListener('cancel', event => event.preventDefault());

  document.querySelector('#slice-name-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!validateName()) return;
    const name = input.value.trim();
    document.querySelector('#slice-saving-name').textContent = name;
    document.querySelector('#slice-saved-name').textContent = name;
    let percent = 0;
    function renderProgress() {
      progress.setAttribute('aria-valuenow', String(percent));
      progress.firstElementChild.style.width = `${percent}%`;
      percentLabel.textContent = `${percent}%`;
    }
    renderProgress();
    nameDialog.close();
    savingDialog.showModal();
    const timer = window.setInterval(() => {
      percent = Math.min(100, percent + 5);
      renderProgress();
      if (percent === 100) {
        window.clearInterval(timer);
        savingDialog.close();
        successDialog.returnValue = '';
        successDialog.showModal();
      }
    }, 120);
  });

  successDialog.addEventListener('close', () => {
    activeSaveButton.focus();
    if (successDialog.returnValue === 'view') {
      showToast('「我的 - 我的切片」页面不在本期原型范围内');
    }
  });
})();
