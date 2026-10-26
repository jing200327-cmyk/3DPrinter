/* 原型控制台独立于 APP 设备框；切换模拟会开始一组新的演示任务。 */
const simulationConsole = document.querySelector('#simulation-console');
const simulationMedia = window.matchMedia('(min-width: 961px)');
const syncSimulationConsole = () => { simulationConsole.open = simulationMedia.matches; };
syncSimulationConsole();
simulationMedia.addEventListener('change', syncSimulationConsole);
const simulationMode = params.get('simulation') === 'family' ? 'family' : params.get('plates') === 'single' ? 'single' : 'multi';
simulationConsole.querySelectorAll('[data-simulation-mode]').forEach(button => {
  button.setAttribute('aria-checked', String(button.dataset.simulationMode === simulationMode));
  button.addEventListener('click', () => {
    if (button.dataset.simulationMode === 'family') {
      simulationConsole.querySelectorAll('[data-simulation-mode]').forEach(option => option.setAttribute('aria-checked', String(option === button)));
      if (!simulationMedia.matches) simulationConsole.open = false;
      window.__FAMILY_QUEUE.openSubmission();
      return;
    }
    const next = new URL(window.location.href);
    for (const key of ['plate', 'plates', 'activeTask', 'family', 'source', 'completed', 'queue', 'results', 'screen', 'connection', 'simulation', 'queueTask']) next.searchParams.delete(key);
    if (button.dataset.simulationMode === 'single') next.searchParams.set('plates', 'single');
    next.searchParams.set('status', 'printing');
    next.searchParams.set('plate', '1');
    window.location.href = next.href;
  });
});

/* 耗材模拟只切换面板，不重建打印任务或修改任务 URL。 */
function simulateFilamentPresence(present) {
  if (foState.operation) foAbort();
  closeReuseScreens();
  closeFilamentGuide();
  filamentSpoolSelected = false;
  filamentPanel.dataset.filamentState = 'idle';
  filamentPanel.dataset.filamentPresence = present ? 'present' : 'empty';
  renderFilamentPanel();
  document.querySelector('#simulation-filament-status').textContent = present ? '当前：已检测到耗材' : '当前：未检测到耗材';
  filamentPanel.scrollIntoView({ block: 'center', behavior: 'instant' });
}
document.querySelector('#simulate-filament-empty').addEventListener('click', () => simulateFilamentPresence(false));
document.querySelector('#simulate-filament-detected').addEventListener('click', () => {
  simulateFilamentPresence(true);
  document.querySelector('#filament-detected-dialog').showModal();
});
