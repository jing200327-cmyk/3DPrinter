/* 调平校准演示：进度以20倍速度播放，不向真实打印机发送指令。 */
(() => {
  reuseScreenNames.calibration = '#calibration-screen';
  const screen = document.querySelector('#calibration-screen');
  const $ = selector => screen.querySelector(selector);
  const storageKey = 'funbox-calibration-7022782816D8AB-v2';
  const projects = [
    {id:'bed',name:'打印板调平',minutes:5,copy:'自动检测打印板各位置的高度差，补偿首层间距，让模型平稳贴合打印板。'},
    {id:'tuning',name:'校准',minutes:3,copy:'自动检查并校准设备运行参数，提升打印稳定性与成型一致性。'},
  ];
  const diagram = `<svg viewBox="0 0 320 180" role="img" aria-label="打印板与喷头调平校准示意图"><path d="M67 33h186v99H67z" fill="none" stroke="#c5cddd" stroke-width="7" stroke-linejoin="round"/><path d="M67 63h186" stroke="#acb8d0" stroke-width="6"/><path d="M160 57v23" stroke="#6276a4" stroke-width="12"/><path d="M147 78h26v17l-13 10-13-10z" fill="#6577b9"/><path d="m43 137 117-35 117 35-117 34z" fill="#dcdfff" stroke="#8093d4" stroke-width="2"/><path d="m80 137 80-24 80 24-80 23z" fill="none" stroke="#a5b5e0" stroke-dasharray="4 5"/><g fill="#6a76dc"><circle cx="80" cy="137" r="4"/><circle cx="160" cy="113" r="4"/><circle cx="240" cy="137" r="4"/><circle cx="160" cy="160" r="4"/><circle cx="160" cy="137" r="5"/></g><path d="M160 108v21m-7-5 7 7 7-7" fill="none" stroke="#8d7ce0" stroke-width="2"/><circle cx="258" cy="44" r="16" fill="#e9f2ff"/><path d="m250 44 6 6 10-12" fill="none" stroke="#5584df" stroke-width="3" stroke-linecap="round"/></svg>`;
  screen.innerHTML = `<div class="reuse-screen-frame"><div class="calibration-page">
    <div class="cal-status" aria-hidden="true"><span>9:41</span><span>▂▄▆　◉　▰</span></div>
    <header class="cal-nav"><button id="calibration-exit" type="button" aria-label="返回">‹</button><h2>调平校准</h2></header>
    <div id="calibration-selection">
      <figure class="cal-illustration">${diagram}<figcaption>自动调平校准示意图</figcaption></figure>
      <div class="cal-section-heading"><h3>选择校准项目</h3><span>可多选</span></div>
      <div class="cal-projects">${projects.map(p=>`<label class="cal-project"><input id="calibration-${p.id}" type="checkbox" value="${p.id}" checked><span class="cal-project-copy"><span class="cal-project-heading"><strong>${p.name}</strong><small>约 ${p.minutes} 分钟</small></span><span>${p.copy}</span></span></label>`).join('')}</div>
      <p class="cal-preparation">开始前请清空打印板，并保持喷头清洁。执行期间请勿触碰打印板与喷头。</p>
      <footer class="cal-footer"><p id="calibration-estimate" aria-live="polite"></p><small>预计时长仅供参考，以设备实际执行为准</small><button id="calibration-start" type="button">开始调平校准</button></footer>
    </div>
    <div id="calibration-running" hidden>
      <figure class="cal-illustration cal-wait-illustration">${diagram}</figure>
      <h3 id="calibration-state-title">调平校准中</h3><p id="calibration-current-project"></p>
      <div class="cal-progress-info"><span>总体进度</span><strong id="calibration-percent">0%</strong></div>
      <div id="calibration-progress-bar" class="cal-progress-bar" role="progressbar" aria-label="调平校准进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div>
      <div id="calibration-project-statuses"></div>
      <p id="calibration-leave-hint" class="cal-leave-hint">可离开此页面，校准会继续进行。<br>校准期间，工作台设备控制功能暂不可用。</p>
      <footer class="cal-footer"><button id="calibration-leave" class="cal-secondary" type="button">返回工作台</button><button id="calibration-confirm" type="button" hidden>确定</button></footer>
    </div><div class="cal-home-indicator" aria-hidden="true"></div>
  </div></div>`;
  const banner = document.createElement('button');
  banner.id='calibration-workbench-status';banner.type='button';banner.hidden=true;
  document.querySelector('#task-panel').before(banner);
  const note=document.createElement('p');note.className='simulation-filament-status';
  note.textContent='调平校准：原型进度以20倍速度演示，不发送真实设备指令。';
  document.querySelector('#simulation-console .simulation-content').append(note);
  let job=null, timer=null;
  const lockSelector=['#printer-switch','#camera-toggle','#camera-view-limit','#pause-print','#cancel-print','#restart-print','#next-plate','#finish-now','#firmware-banner','#load-filament','#unload-filament','#open-material-settings','#filament-spool','.bp-slot','.bp-edit','#start-print','#prepare-state-start','#open-device-control','#open-print-options','#open-firmware-version','#open-remove-printer','#open-factory-reset','#filament-guide-start','.di-model-print','#family-submit','#family-start-print'].join(',');
  const lockedControls=new Map();
  const selectedProjects=()=>projects.filter(p=>$(`#calibration-${p.id}`).checked);
  const isRunning=()=>Boolean(job && Date.now()<job.endsAt);
  function updateSelection(){
    const minutes=selectedProjects().reduce((sum,p)=>sum+p.minutes,0);
    $('#calibration-start').disabled=minutes===0;
    $('#calibration-estimate').textContent=minutes?`预计时长：约 ${minutes} 分钟`:'请至少选择一个项目';
  }
  function syncLock(){
    if(isRunning()) document.querySelectorAll(lockSelector).forEach(button=>{
      if(!lockedControls.has(button))lockedControls.set(button,button.getAttribute('aria-disabled'));
      button.setAttribute('aria-disabled','true');button.classList.add('cal-device-locked');
    });
    else{
      lockedControls.forEach((previous,button)=>{
        if(previous===null)button.removeAttribute('aria-disabled');else button.setAttribute('aria-disabled',previous);
        button.classList.remove('cal-device-locked');
      });lockedControls.clear();
    }
  }
  function persist(){
    try{if(job)sessionStorage.setItem(storageKey,JSON.stringify(job));else sessionStorage.removeItem(storageKey);}
    catch{/* 禁止存储时，当前页面仍继续校准。 */}
  }
  function render(){
    $('#calibration-selection').hidden=Boolean(job);$('#calibration-running').hidden=!job;banner.hidden=!job;
    if(!job){syncLock();window.PrinterBusy?.end('calibration');return;}
    const running=isRunning(), progress=running?Math.min(99,Math.floor((Date.now()-job.startedAt)/(job.endsAt-job.startedAt)*100)):100;
    /* 调平校准进行中：工作台打印机状态按忙碌展示；结束或清空任务后回到空闲 */
    if(running)window.PrinterBusy?.begin('calibration');else window.PrinterBusy?.end('calibration');
    const chosen=projects.filter(p=>job.projects.includes(p.id)), elapsed=Math.max(0,(Date.now()-job.startedAt)*20/60000);
    let cumulative=0,currentName='';
    $('#calibration-project-statuses').replaceChildren(...chosen.map(project=>{
      const started=elapsed>=cumulative;cumulative+=project.minutes;
      const done=!running||elapsed>=cumulative;
      if(started&&!done)currentName=project.name;
      const row=document.createElement('div');row.className='cal-project-status';
      const name=document.createElement('span');name.textContent=project.name;
      const state=document.createElement('strong');state.textContent=done?'已完成':started?'进行中':'等待中';state.dataset.state=done?'done':started?'running':'pending';
      row.append(name,state);return row;
    }));
    $('#calibration-state-title').textContent=running?'调平校准中':'调平校准完成';
    $('#calibration-current-project').textContent=running?`正在进行：${currentName}`:'所选项目已全部完成，可以开始使用打印机';
    $('#calibration-percent').textContent=`${progress}%`;
    $('#calibration-progress-bar').setAttribute('aria-valuenow',String(progress));$('#calibration-progress-bar span').style.width=`${progress}%`;
    $('#calibration-leave-hint').hidden=!running;$('#calibration-confirm').hidden=running;$('#calibration-leave').hidden=!running;
    screen.dataset.stage=running?'running':'complete';
    banner.textContent=running?`调平校准中 · ${progress}%　查看进度 ›`:'调平校准已完成　查看结果 ›';
    syncLock();if(!running){window.clearInterval(timer);timer=null;}
  }
  function startTimer(){window.clearInterval(timer);render();if(isRunning())timer=window.setInterval(render,250);}
  function openCalibration(){render();if(reuseStack.at(-1)!=='calibration')openReuseScreen('calibration');}
  function leave(){if(job)closeReuseScreens();else goBackInReuseScreens();}
  document.querySelector('#open-level-calibration').addEventListener('click',openCalibration);banner.addEventListener('click',openCalibration);
  projects.forEach(p=>$(`#calibration-${p.id}`).addEventListener('change',updateSelection));
  $('#calibration-start').addEventListener('click',()=>{
    if(job||!selectedProjects().length)return;
    const selected=selectedProjects(),startedAt=Date.now();
    job={projects:selected.map(p=>p.id),startedAt,endsAt:startedAt+selected.reduce((sum,p)=>sum+p.minutes,0)*60000/20};
    persist();startTimer();
  });
  $('#calibration-exit').addEventListener('click',leave);$('#calibration-leave').addEventListener('click',leave);
  $('#calibration-confirm').addEventListener('click',()=>{if(isRunning())return;job=null;persist();render();closeReuseScreens();updateSelection();});
  // 捕获鼠标、触摸和键盘生成的 click，阻止设备操作，保留只读查看和返回。
  document.addEventListener('click',event=>{
    if(!isRunning()||!event.target.closest(lockSelector))return;
    event.preventDefault();event.stopImmediatePropagation();showToast('调平校准中，设备控制暂不可用');
  },true);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
  try{
    const stored=JSON.parse(sessionStorage.getItem(storageKey));
    if(stored&&Array.isArray(stored.projects)&&stored.projects.length&&new Set(stored.projects).size===stored.projects.length&&stored.projects.every(id=>projects.some(p=>p.id===id))&&Number.isFinite(stored.startedAt)&&Number.isFinite(stored.endsAt)&&stored.endsAt>stored.startedAt)job=stored;
  }catch{/* 无有效演示任务时从项目选择开始。 */}
  updateSelection();startTimer();
})();
