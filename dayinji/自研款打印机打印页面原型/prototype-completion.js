/* Full-screen completion experience. Kept independent of printer task controls. */
(() => {
 'use strict';
 const panel = document.querySelector('#task-panel');
 if (!panel) return;
 const media = matchMedia('(prefers-reduced-motion: reduce)');
 let reduced = media.matches, lastStatus, previousFocus, generation = 0, frame = 0, renderer, scene, camera, toy, started = 0, drag = null;
 const dialog = document.createElement('dialog');
 dialog.id = 'completion-celebration';
 dialog.setAttribute('aria-labelledby', 'cc-title');
 const eye = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
 const plus = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 19 11-11M14 4v4m-2-2h4M5 4v4M3 6h4m12 8v4m-2-2h4"/></svg>';
 dialog.innerHTML = `<div class="cc-shell">
  <div class="cc-cloud" aria-hidden="true"></div><div class="cc-cloud c2" aria-hidden="true"></div>
  <header class="cc-top"><div class="cc-brand"><span class="cc-printer" aria-hidden="true"></span><div>趣造工坊<small>FUNBOX · CREATE & PLAY</small></div></div><div class="cc-tools"><button class="cc-quiet" type="button" aria-pressed="false">✧ 减弱动画</button><button class="cc-close" type="button">我知道了 <span aria-hidden="true">×</span></button></div></header>
  <div class="cc-heading"><p class="cc-kicker"><span class="cc-check" aria-hidden="true">✓</span> PRINT COMPLETED!</p><h1 id="cc-title">打印完成<span>啦！</span></h1><p class="cc-subtitle">从一个小想法，到一个真的小作品</p></div>
  <div class="cc-stage"><div class="cc-orbit" aria-hidden="true"></div><div class="cc-ground" aria-hidden="true"></div><div class="cc-ring" aria-hidden="true"></div>
   <span class="cc-star s1" aria-hidden="true">★</span><span class="cc-star s2" aria-hidden="true">✦</span><span class="cc-star s3" aria-hidden="true">✦</span><span class="cc-star s4" aria-hidden="true">★</span>
   <div class="cc-note"><b>100% 完成</b>小小创造家，大大成就感</div><div class="cc-note right"><b>创意，变成真的啦！</b><span class="cc-model-name">我的打印作品</span></div>
   <button class="cc-model" type="button" aria-label="旋转查看打印作品，点击召唤星星"><canvas aria-label="打印作品的三维展示"></canvas><span class="cc-model-hint">轻点收获星星 · 拖动转一转</span></button>
  </div>
  <section class="cc-reward" aria-label="创作奖励"><span class="cc-reward-icon" aria-hidden="true">★</span><div><h2>太棒啦！你成功创造了一个新作品！</h2><p>你的 3D 创作已经完成，快来看看吧！</p></div><div class="cc-points"><strong>+<span id="cc-count" style="font:inherit">0</span></strong><span>创作积分<br>继续保持好奇心</span></div></section>
  <div class="cc-actions"><button class="cc-action cc-primary" type="button">${eye}<span>看看我的作品</span></button><button class="cc-action cc-secondary" type="button">${plus}<span>再创造一个</span></button></div>
  <p class="cc-safety"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 12V5a2 2 0 0 1 4 0v6-8a2 2 0 0 1 4 0v9-5a2 2 0 0 1 4 0v8c0 5-3 7-7 7h-2c-3 0-4-1-6-4l-3-4a2 2 0 0 1 3-3l3 3"/></svg>作品可能还有点烫，请叫大人帮忙取下来哦！</p>
  <div class="cc-footer"><i></i>打印已结束 <span>·</span> 安全取件后，再和作品打个招呼吧</div>
  <div class="cc-particles" aria-hidden="true"></div>
 </div>`;
 document.body.append(dialog);
 const $ = s => dialog.querySelector(s);
 const particles = $('.cc-particles');
 function applyMotion() {
  dialog.classList.toggle('cc-reduced', reduced);
  $('.cc-quiet').setAttribute('aria-pressed', String(reduced));
  if (reduced) { particles.replaceChildren(); $('#cc-count').textContent = '10'; }
 }
 $('.cc-quiet').addEventListener('click', () => { reduced = !reduced; applyMotion(); });
 media.addEventListener('change', e => { reduced = e.matches; applyMotion(); });
 function burst(extra = false) {
  if (reduced || !dialog.open) return;
  // One bounded particle group: repeated taps replace the prior burst.
  particles.replaceChildren();
  const colors = ['#ffd05b','#ffe497','#ffffff','#f8a5b9','#75d6bf','#86b8f6'];
  const total = extra ? 24 : 64;
  for (let i = 0; i < total; i++) {
   const el = document.createElement('i');
   const angle = (i / total) * Math.PI * 2;
   const distance = 180 + Math.random() * 220;
   const falling = !extra && i > 49;
   el.className = 'cc-particle ' + (falling ? 'paper falling' : i % 4 === 0 ? 'dot' : i % 4 === 1 ? 'paper' : 'star');
   el.textContent = el.classList.contains('star') ? (i % 7 ? '★' : '♥') : '';
   el.style.cssText = `--color:${colors[i%colors.length]};--size:${8+Math.random()*24}px;--x:${Math.cos(angle)*distance}px;--y:${Math.sin(angle)*distance*.66}px;--z:${-100+Math.random()*220}px;--spin:${Math.random()*500-250}deg;--duration:${extra?1.3:1.3+Math.random()*.6}s;--delay:${extra?0:.3+Math.random()*.12}s`;
   if (falling) el.style.left = `${10+Math.random()*80}%`;
   el.addEventListener('animationend', () => el.remove(), {once:true});
   particles.append(el);
  }
 }
 function countPoints(token) {
  const begin = performance.now();
  function update(now) {
   if (token !== generation || !dialog.open) return;
   const progress = reduced ? 1 : Math.min(1, Math.max(0,(now-begin-1200)/850));
   $('#cc-count').textContent = String(Math.round(progress*10));
   if(progress<1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
 }
 function close() {
  generation++;
  cancelAnimationFrame(frame);
  particles.replaceChildren();
  dialog.close();
  document.body.style.overflow = oldOverflow;
  if(previousFocus?.isConnected && !previousFocus.hidden && !previousFocus.disabled) previousFocus.focus();
  else document.querySelector('#restart-print')?.focus();
 }
 let oldOverflow = '';
 $('.cc-close').addEventListener('click', close);
 dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });
 $('.cc-primary').addEventListener('click', () => {
  const viewing = dialog.classList.toggle('cc-view');
  $('#cc-title').textContent = viewing ? '我的新作品' : '打印完成啦！';
  $('.cc-subtitle').textContent = viewing ? '拖动转一转，看看每一个角度' : '从一个小想法，到一个真的小作品';
  $('.cc-primary span').textContent = viewing ? '返回庆祝页' : '看看我的作品';
 });
 $('.cc-secondary').addEventListener('click', () => { close(); document.querySelector('#explore-toys')?.click(); });
 const modelButton = $('.cc-model');
 modelButton.addEventListener('pointerdown', e => { drag = {x:e.clientX, moved:false}; modelButton.setPointerCapture(e.pointerId); });
 modelButton.addEventListener('pointermove', e => { if(!drag)return;const dx=e.clientX-drag.x;if(Math.abs(dx)>2)drag.moved=true;if(toy)toy.rotation.y+=dx*.012;drag.x=e.clientX; });
 modelButton.addEventListener('pointerup', () => { const moved=drag?.moved;drag=null;if(!moved)burst(true); });
 modelButton.addEventListener('pointercancel',()=>{drag=null});
 modelButton.addEventListener('click', e => {if(e.detail===0)burst(true)});
 async function init3D() {
  if(renderer)return;
  if(!window.THREE) await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='vendor/three.min.js';script.onload=resolve;script.onerror=reject;document.head.append(script)});
  const T = window.THREE;
  renderer=new T.WebGLRenderer({canvas:$('canvas'),alpha:true,antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.88;
  scene=new T.Scene();camera=new T.PerspectiveCamera(32,1,.1,100);camera.position.set(0,2.9,7.8);camera.lookAt(0,1.55,0);
  scene.add(new T.HemisphereLight(0xffffff,0x9ebdcb,.65));
  const light=new T.DirectionalLight(0xfff4db,.85);light.position.set(-3,7,5);light.castShadow=true;light.shadow.mapSize.set(1024,1024);scene.add(light);
  const fill=new T.DirectionalLight(0xccedff,.55);fill.position.set(4,3,-3);scene.add(fill);
  toy=new T.Group();scene.add(toy);toy.rotation.y=-.35;
  // Rounded cuboid construction keeps the current Steve character recognisable.
  function box(w,h,d,color,x,y,z,r=.055){
   const shape=new T.Shape(),a=-w/2,b=-h/2;
   shape.moveTo(a+r,b);shape.lineTo(a+w-r,b);shape.quadraticCurveTo(a+w,b,a+w,b+r);shape.lineTo(a+w,b+h-r);shape.quadraticCurveTo(a+w,b+h,a+w-r,b+h);shape.lineTo(a+r,b+h);shape.quadraticCurveTo(a,b+h,a,b+h-r);shape.lineTo(a,b+r);shape.quadraticCurveTo(a,b,a+r,b);
   const geometry=new T.ExtrudeGeometry(shape,{depth:d-2*r,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:r,bevelThickness:r,curveSegments:5});geometry.translate(0,0,-(d-2*r)/2);
   const m=new T.Mesh(geometry,new T.MeshStandardMaterial({color,roughness:.38,metalness:0}));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;toy.add(m);return m;
  }
  box(.47,.88,.57,0x627ed4,-.27,.55,0);box(.47,.88,.57,0x6988dd,.27,.55,0);
  box(.49,.22,.65,0x3b557b,-.27,.16,.04);box(.49,.22,.65,0x3b557b,.27,.16,.04);
  box(1.04,1.05,.62,0x45c4c2,0,1.48,0);
  box(.4,.55,.6,0x3fc1c0,-.78,1.72,0);box(.4,.55,.6,0x45c4c2,.78,1.72,0);
  box(.39,.52,.54,0xe7af86,-.78,1.2,0);box(.39,.52,.54,0xf0be94,.78,1.2,0);
  box(1.3,1.15,1.05,0xf1c49d,0,2.63,0,.09);
  box(1.34,.28,1.1,0x654635,0,3.13,0,.045);
  box(.28,.4,.07,0x654635,-.49,2.87,.53,.015);box(.25,.32,.07,0x654635,.5,2.91,.53,.015);
  box(.31,.19,.045,0xffffff,-.3,2.65,.554,.012);box(.31,.19,.045,0xffffff,.3,2.65,.554,.012);
  box(.12,.17,.04,0x455c83,-.25,2.65,.588,.01);box(.12,.17,.04,0x455c83,.25,2.65,.588,.01);
  box(.19,.16,.12,0xd99d75,0,2.45,.57,.025);box(.4,.075,.04,0x805943,0,2.28,.57,.02);
  const platform=new T.Mesh(new T.CylinderGeometry(1.25,1.35,.18,64),new T.MeshStandardMaterial({color:0xe5f7ee,roughness:.5}));platform.position.y=-.02;platform.receiveShadow=true;scene.add(platform);
 }
 function render(now) {
  if(!dialog.open)return;
  if(renderer){const c=$('canvas'),w=c.clientWidth,h=c.clientHeight;if(c.width!==Math.round(w*renderer.getPixelRatio())||c.height!==Math.round(h*renderer.getPixelRatio())){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
   if(!reduced&&!drag){toy.rotation.y+=Math.min(now-(started||now),40)*.00018;}started=now;renderer.render(scene,camera);
  }
  frame=requestAnimationFrame(render);
 }
 async function open() {
  const token=++generation;previousFocus=document.activeElement;
  dialog.classList.remove('cc-view');$('#cc-title').innerHTML='打印完成<span>啦！</span>';$('.cc-subtitle').textContent='从一个小想法，到一个真的小作品';$('.cc-primary span').textContent='看看我的作品';
  const name=document.querySelector('#task-title')?.textContent?.trim()||'我的打印作品';$('.cc-model-name').textContent=name;
  $('#cc-count').textContent='0';applyMotion();oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.showModal();$('.cc-close').focus({preventScroll:true});burst();countPoints(token);
  try{await init3D()}catch(error){modelButton.style.background='center/contain no-repeat url("'+document.querySelector('#active-task-image').getAttribute('src')+'")';$('.cc-model-hint').textContent='我的打印作品';}
  if(token===generation&&dialog.open){started=0;frame=requestAnimationFrame(render)}
 }
 function sync(){const status=panel.dataset.status;if(status===lastStatus)return;lastStatus=status;if(status==='completed')open();else if(dialog.open)close();}
 new MutationObserver(sync).observe(panel,{attributes:true,attributeFilter:['data-status']});sync();
})();
