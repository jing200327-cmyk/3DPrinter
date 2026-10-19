/* ==========================================================================
   3D 预览页 · 三维视图（复用 R001「模型编辑与切片」原型的三维模块）
   --------------------------------------------------------------------------
   与 R001 模型编辑页同源：真 Three.js 渲染 + 打印空间 180³ 示意 + 打印平台
   + 单指拖动旋转 / 双指捏合与滚轮缩放 / 视角缩放按钮。
   按本次需求**未**移植的部分：零件选中、底部缩放·复制·删除工具区、去打印 CTA、
   打印参数与云切片链路 —— 这里只做「看」的预览。
   ========================================================================== */
(function () {
  'use strict';

  var BUILD = { x: 180, y: 180, z: 180 };       // 打印空间 mm（180×180×180）
  var MODEL_SCRIPT = 'vendor/three.min.js';
  var MODEL_DATA = 'assets/model-3d.js';
  var COL = { model: 0x7c899e, plateEdge: 0x9aa3b8, grid: 0xdfe3ec, gridCenter: 0xc3c9d8 };
  var D2R = Math.PI / 180;

  var screen = document.querySelector('#preview-3d-screen');
  var canvas = document.querySelector('#pv3d-gl');
  var nameEl = document.querySelector('#pv3d-model-name');
  var metaEl = document.querySelector('#pv3d-meta');
  if (!screen || !canvas) return;

  /* ---------- 依赖按需加载 ----------
     three.js 与减面后的内嵌模型一共约 1.2 MB，只有在真的要看 3D 时才拉，
     准备打印页的首屏不受影响。file:// 下用 <script> 注入而不是 fetch，
     不会踩本地文件读取的 CORS 限制。 */
  var depsPromise = null;
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var el = document.createElement('script');
      el.src = src;
      el.onload = function () { resolve(); };
      el.onerror = function () { reject(new Error('3D 资源加载失败：' + src)); };
      document.head.appendChild(el);
    });
  }
  function loadDeps() {
    if (depsPromise) return depsPromise;
    depsPromise = loadScript(MODEL_SCRIPT)
      .then(function () { return loadScript(MODEL_DATA); })
      .catch(function (error) { depsPromise = null; throw error; });
    return depsPromise;
  }
  function asset() { return window.__MODEL_ASSET; }

  /* ---------- 状态 ---------- */

  var active = false;
  var inited = false;
  var mesh = null;

  /* 编辑页的镜头注视点原本抬到 z=40，是为了给底部「缩放/复制/删除 + 去打印」让位；
     这里那两块都删掉了，注视点相应降到模型附近，让模型落在视图区正中。 */
  var ORBIT_HOME = { az: -58 * D2R, el: 32 * D2R, dist: 252, tz: 14 };
  var MAX_DIST = 1100, MIN_DIST = 150;

  var orbit = { az: ORBIT_HOME.az, el: ORBIT_HOME.el, dist: ORBIT_HOME.dist, target: { x: 0, y: 0, z: ORBIT_HOME.tz } };

  var renderer, scene, camera;
  var baseGeometry = null;
  var glSize = { w: 0, h: 0 };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ---------- 几何：base64 → BufferGeometry（与 R001 完全一致） ---------- */

  function b64Bytes(b64) {
    var bin = atob(b64), n = bin.length, out = new Uint8Array(n);
    for (var i = 0; i < n; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function getGeometry() {
    if (baseGeometry) return baseGeometry;
    var a = asset();
    if (!a) return null;
    var posBytes = b64Bytes(a.pos);
    var idxBytes = b64Bytes(a.idx);
    var pos = new Float32Array(posBytes.buffer, posBytes.byteOffset, posBytes.byteLength / 4);
    var idx = a.idxDtype === 'Uint16'
      ? new Uint16Array(idxBytes.buffer, idxBytes.byteOffset, idxBytes.byteLength / 2)
      : new Uint32Array(idxBytes.buffer, idxBytes.byteOffset, idxBytes.byteLength / 4);
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeVertexNormals();
    g.computeBoundingBox();
    baseGeometry = g;
    return g;
  }

  /* ---------- 场景 ---------- */

  function axisLine(o, dir, color) {
    var g = new THREE.BufferGeometry().setFromPoints([o, o.clone().add(dir)]);
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color: color }));
  }

  function initScene() {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(38, 1, 1, 4000);
    camera.up.set(0, 0, 1);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xb9c2d4, 0.62));
    var d1 = new THREE.DirectionalLight(0xffffff, 0.82); d1.position.set(150, -180, 300); scene.add(d1);
    var d2 = new THREE.DirectionalLight(0xffffff, 0.26); d2.position.set(-200, 150, 120); scene.add(d2);

    // 打印空间示意框（180×180×180）
    var boxEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(BUILD.x, BUILD.y, BUILD.z));
    var boxLine = new THREE.LineSegments(boxEdges, new THREE.LineBasicMaterial({ color: COL.plateEdge, transparent: true, opacity: 0.42 }));
    boxLine.position.set(0, 0, BUILD.z / 2);
    scene.add(boxLine);

    // 打印平台
    var plateMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(BUILD.x, BUILD.y),
      new THREE.MeshStandardMaterial({ color: 0xf3f5fa, roughness: 0.98, metalness: 0 })
    );
    plateMesh.position.set(0, 0, -0.35);
    scene.add(plateMesh);

    // 网格
    var grid = new THREE.GridHelper(BUILD.x, 18, COL.gridCenter, COL.grid);
    grid.rotation.x = Math.PI / 2;
    grid.position.z = 0;
    grid.material.transparent = true;
    grid.material.opacity = 0.75;
    scene.add(grid);

    // 角点坐标轴提示（X 红 / Y 绿 / Z 蓝）
    var o = new THREE.Vector3(-BUILD.x / 2, -BUILD.y / 2, 0);
    scene.add(axisLine(o, new THREE.Vector3(34, 0, 0), 0xe11d48));
    scene.add(axisLine(o, new THREE.Vector3(0, 34, 0), 0x16a34a));
    scene.add(axisLine(o, new THREE.Vector3(0, 0, 34), 0x2563eb));
  }

  /** 当前盘只有一个零件，摆盘结果就是「居中」 */
  function buildModel() {
    var geo = getGeometry();
    if (!geo) return;
    if (mesh) { scene.remove(mesh); mesh.material.dispose(); mesh = null; }
    mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: COL.model, roughness: 0.6, metalness: 0.05
    }));
    scene.add(mesh);
  }

  /* ---------- 相机 ---------- */

  function updateCamera() {
    var d = orbit.dist, el = orbit.el, az = orbit.az;
    camera.position.set(
      orbit.target.x + d * Math.cos(el) * Math.cos(az),
      orbit.target.y + d * Math.cos(el) * Math.sin(az),
      orbit.target.z + d * Math.sin(el)
    );
    camera.lookAt(orbit.target.x, orbit.target.y, orbit.target.z);
  }

  function resizeGL() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    if (w === glSize.w && h === glSize.h) return;
    glSize = { w: w, h: h };
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function renderLoop() {
    requestAnimationFrame(renderLoop);
    if (!active || !renderer) return;
    resizeGL();
    updateCamera();
    renderer.render(scene, camera);
  }

  function zoomBy(k) {
    orbit.dist = clamp(orbit.dist * k, MIN_DIST, MAX_DIST);
  }

  function resetView() {
    orbit.az = ORBIT_HOME.az;
    orbit.el = ORBIT_HOME.el;
    orbit.dist = ORBIT_HOME.dist;
    orbit.target.x = 0;
    orbit.target.y = 0;
    orbit.target.z = ORBIT_HOME.tz;
  }

  /* ---------- 交互：拖动旋转 + 捏合 / 滚轮缩放 ---------- */

  function initControls() {
    var ptrs = new Map();
    var pinchStart = 0, distStart = 0;

    canvas.addEventListener('pointerdown', function (e) {
      canvas.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 2) {
        var ks = Array.from(ptrs.keys());
        var a = ptrs.get(ks[0]), b = ptrs.get(ks[1]);
        pinchStart = Math.hypot(a.x - b.x, a.y - b.y);
        distStart = orbit.dist;
      }
    });

    canvas.addEventListener('pointermove', function (e) {
      if (!ptrs.has(e.pointerId)) return;
      var prev = ptrs.get(e.pointerId);
      var dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (ptrs.size >= 2) {
        var ks = Array.from(ptrs.keys());
        var a = ptrs.get(ks[0]), b = ptrs.get(ks[1]);
        var d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchStart > 0 && d > 0) orbit.dist = clamp(distStart * (pinchStart / d), MIN_DIST, MAX_DIST);
        return;
      }
      orbit.az -= dx * 0.42 * D2R;
      orbit.el = clamp(orbit.el + dy * 0.34 * D2R, 4 * D2R, 86 * D2R);
    });

    function up(e) {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.delete(e.pointerId);
      if (ptrs.size < 2) pinchStart = 0;
    }
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('pointerleave', function (e) { if (ptrs.has(e.pointerId)) up(e); });

    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      zoomBy(1 + Math.sign(e.deltaY) * 0.09);
    }, { passive: false });

    document.querySelector('#pv3d-zoom-in').addEventListener('click', function () { zoomBy(0.82); });
    document.querySelector('#pv3d-zoom-out').addEventListener('click', function () { zoomBy(1.22); });
    document.querySelector('#pv3d-zoom-reset').addEventListener('click', resetView);
  }

  /* ---------- 对外接口 ---------- */

  var HUD_PLATE = document.querySelector('#pv3d-hud-plate');

  function renderHead(payload) {
    if (nameEl) {
      nameEl.textContent = payload.name || (asset() && asset().name) || '3D 模型';
      var suffix = document.createElement('span');
      suffix.textContent = ' · 1盘';
      nameEl.appendChild(suffix);
    }
    if (metaEl) {
      metaEl.innerHTML = '';
      if (payload.plateLabel) {
        var chip = document.createElement('span');
        chip.className = 'pv3d-meta__chip';
        chip.textContent = payload.plateLabel;
        metaEl.appendChild(chip);
      }
      [payload.duration, payload.grams ? payload.grams + ' g' : ''].filter(Boolean).forEach(function (text) {
        var dot = document.createElement('span');
        dot.className = 'pv3d-meta__dot';
        dot.setAttribute('aria-hidden', 'true');
        metaEl.appendChild(dot);
        var span = document.createElement('span');
        span.textContent = text;
        metaEl.appendChild(span);
      });
    }
  }

  function boot3d() {
    if (inited) return;
    initScene();
    buildModel();
    initControls();
    inited = true;
    requestAnimationFrame(renderLoop);
  }

  /** 打开预览：先把盘信息铺上、显示出来，3D 资源到了再建场景 */
  function open(payload) {
    payload = payload || {};
    renderHead(payload);
    if (HUD_PLATE) HUD_PLATE.textContent = '打印空间 ' + BUILD.x + ' × ' + BUILD.y + ' × ' + BUILD.z + ' mm';
    resetView();
    glSize = { w: 0, h: 0 };     // 屏幕刚显示出来时画布尺寸还是 0，强制下一帧重新量
    active = true;
    loadDeps().then(function () {
      if (inited) return;
      boot3d();
      glSize = { w: 0, h: 0 };
    }).catch(function (error) {
      if (window.console && console.warn) console.warn(error);
    });
  }

  function close() { active = false; }

  /* 屏幕的显示 / 隐藏由 .reuse-screen 的 hidden 属性切换，
     这里盯住它，保证隐藏后停掉渲染、再次打开时重新量画布 */
  new MutationObserver(function () {
    var visible = !screen.hidden;
    if (visible) { glSize = { w: 0, h: 0 }; active = true; }
    else { active = false; }
  }).observe(screen, { attributes: true, attributeFilter: ['hidden'] });

  window.__PREVIEW3D = {
    open: open,
    close: close,
    isActive: function () { return active; },
    zoomBy: zoomBy,
    resetView: resetView,
    orbit: orbit,
    diag: function () {
      return { inited: inited, active: active, hasMesh: !!mesh, orbit: { az: +orbit.az.toFixed(3), el: +orbit.el.toFixed(3), dist: orbit.dist } };
    }
  };
})();
