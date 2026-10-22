/* 原型控制台独立于 APP 设备框；切换模拟会开始一组新的演示任务。 */
const simulationConsole = document.querySelector('#simulation-console');
const simulationMedia = window.matchMedia('(min-width: 961px)');
const syncSimulationConsole = () => { simulationConsole.open = simulationMedia.matches; };
syncSimulationConsole();
simulationMedia.addEventListener('change', syncSimulationConsole);
const simulationMode = new URLSearchParams(window.location.search).get('plates') === 'single' ? 'single' : 'multi';
simulationConsole.querySelectorAll('[data-simulation-mode]').forEach(button => {
  button.setAttribute('aria-checked', String(button.dataset.simulationMode === simulationMode));
  button.addEventListener('click', () => {
    const next = new URL(window.location.href);
    for (const key of ['plate', 'plates', 'activeTask', 'family', 'source', 'completed', 'queue', 'results', 'screen', 'connection']) next.searchParams.delete(key);
    if (button.dataset.simulationMode === 'single') next.searchParams.set('plates', 'single');
    next.searchParams.set('status', 'printing');
    next.searchParams.set('plate', '1');
    window.location.href = next.href;
  });
});
