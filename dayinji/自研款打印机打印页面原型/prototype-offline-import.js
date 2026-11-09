/* 两个入口复用同一无网 G-code 链路；仅模拟连接，不向设备发送指令。 */
(() => {
  const query = new URLSearchParams(location.search);
  const workbench = document.querySelector('#device-page');
  if (!workbench) return;
  function importUrl(origin) {
    const url = new URL('../../model-import/prototype_v1.1.html', location.href);
    ['connectionAccount','offlineVersion','ownerName','serverStatus','status','queue','results','plate','filamentSensor','filamentFed','phoneNetwork'].forEach(key => {
      if (query.has(key)) url.searchParams.set(key, query.get(key));
    });
    url.searchParams.set('origin', origin);url.hash = 'offline-guide';return url.href;
  }
  const banner = document.createElement('div');banner.id = 'phone-network-banner';banner.className = 'phone-network-banner';banner.hidden = true;
  const copy = document.createElement('span');copy.id = 'phone-network-copy';
  const link = document.createElement('a');link.id = 'phone-offline-print';link.textContent = '无网打印 ›';link.href = importUrl('phone-banner');
  banner.append(copy, link);workbench.prepend(banner);
  document.body.insertAdjacentHTML('beforeend', '<dialog id="phone-network-dialog" class="app-dialog" aria-labelledby="phone-network-title"><h2 id="phone-network-title">当前网络差或无网络</h2><p>是否进行无网打印？连接打印机热点后可在局域网内直接传输 gcode 文件。</p><div class="dialog-actions"><button id="phone-network-dismiss" type="button">暂不</button><a id="phone-network-go">无网打印</a></div></dialog>');
  document.querySelector('#phone-network-go').href = link.href;
  const dialog = document.querySelector('#phone-network-dialog');
  document.querySelector('#phone-network-dismiss').addEventListener('click', () => dialog.close());
  let network = ['offline','weak','online'].includes(query.get('phoneNetwork')) ? query.get('phoneNetwork') : navigator.onLine ? 'online' : 'offline';
  let asked = false;
  try { asked = sessionStorage.getItem('funbox-offline-import-asked') === 'yes'; } catch { /* 无存储时当前页面仍只提示一次。 */ }
  function render() {
    const unavailable = network !== 'online';banner.hidden = !unavailable;
    copy.textContent = network === 'weak' ? '当前网络信号较弱，部分功能可能不可用' : '当前手机无网络，请联网';
    const select = document.querySelector('#phone-network-simulation');
    if (select) select.value = network;
    document.dispatchEvent(new Event('phone-network-change'));
    if (!unavailable) { if (dialog.open) dialog.close();return; }
    if (document.body.classList.contains('operation-open')) return;
    if (!asked) { asked = true;try { sessionStorage.setItem('funbox-offline-import-asked','yes'); } catch {} dialog.showModal(); }
  }
  window.addEventListener('online', () => { network = 'online';render(); });
  window.addEventListener('offline', () => { network = 'offline';render(); });
  const host = document.querySelector('#simulation-console .simulation-content');
  if (host) {
    const label = document.createElement('label');label.className = 'simulation-sensor-control';label.textContent = '手机网络';
    const select = document.createElement('select');select.id = 'phone-network-simulation';
    [['online','正常联网'],['offline','手机无网'],['weak','网络较弱']].forEach(([value,text]) => { const option = document.createElement('option');option.value = value;option.textContent = text;select.append(option); });
    select.value = network;
    select.addEventListener('change', () => {
      network = select.value;query.set('phoneNetwork',network);const next = new URL(location.href);next.searchParams.set('phoneNetwork',network);history.replaceState(null,'',next);
      link.href = importUrl('phone-banner');document.querySelector('#phone-network-go').href = link.href;render();
    });
    label.append(select);host.prepend(label);
  }
  render();
})();
