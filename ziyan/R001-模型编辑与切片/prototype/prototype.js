/* ==========================================================================
   R001 模型编辑与切片 · 原型逻辑 v1.0
   真 Three.js 渲染 + 自动摆盘 + 越界/碰撞校验 + 云切片流程模拟
   ========================================================================== */
(function () {
  'use strict';

  /* ============================ 常量 ============================ */

  var BUILD = { x: 180, y: 180, z: 180 };          // 打印空间 mm
  var ASSET = window.__MODEL_ASSET;
  var BASE = { x: ASSET.bbox.x, y: ASSET.bbox.y, z: ASSET.bbox.z }; // 原始包围盒
  var GAP = 6;        // 模型间最小间距
  var MARGIN = 6;     // 距盘边内缩
  var USABLE = BUILD.x - MARGIN * 2;
  var D2R = Math.PI / 180;
  var COL = {
    model: 0x7c899e, sel: 0xf16326, bad: 0xe11d48,
    plateEdge: 0x9aa3b8, grid: 0xdfe3ec, gridCenter: 0xc3c9d8
  };

  /* ============================ 状态 ============================ */

  var state = {
    demoPlates: 1,
    plates: [],
    currentPlate: 0,
    selectedId: null,
    scaleMode: 'percent',
    uniform: true,
    applyAll: false,
    params: {
      mode: 'standard',
      base: 'with',
      temp: 220,
      infill: 15,
      support: { enabled: true, type: 'tree', userModified: false }
    },
    timelapse: true,
    sliceFail: false,
    outOfBounds: false,
    collision: false,
    slicing: false,
    lastSlice: null,
    savedTo: null,
    scopeChoice: null,
    paramsSnapshot: null,
    saving: false,
    saveProgress: 0,
    optInfo: null,
    optToastShown: false,
    saveNameTouched: false,
    savedSliceName: null
  };

  var uid = 0;
  function nextId() { return 'm' + (++uid); }

  /* ============================ 工具 ============================ */

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  var toastEl = $('#toast');
  var toastTimer = null;
  function toast(msg) {
    if (!msg) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-open');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-open'); }, 2200);
  }

  function fmtDur(sec) {
    sec = Math.max(0, Math.round(sec));
    var h = Math.floor(sec / 3600);
    var m = Math.round((sec % 3600) / 60);
    if (h && m) return h + ' h ' + m + ' min';
    if (h) return h + ' h';
    if (m) return m + ' min';
    return sec + ' s';
  }
  function fmtG(g) { return (g >= 100 ? g.toFixed(0) : g.toFixed(1)) + ' g'; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ============================ 几何工具 ============================ */

  function fp(m) {
    return { w: BASE.x * m.sx, d: BASE.y * m.sy, h: BASE.z * m.sz };
  }
  function inBounds(m) {
    var f = fp(m);
    return Math.abs(m.x) + f.w / 2 <= BUILD.x / 2 + 1e-6 &&
      Math.abs(m.y) + f.d / 2 <= BUILD.y / 2 + 1e-6 &&
      f.h <= BUILD.z + 1e-6;
  }
  function overlaps(a, b) {
    var fa = fp(a), fb = fp(b);
    var pad = -1e-6; // 允许恰好贴合
    return Math.abs(a.x - b.x) < (fa.w + fb.w) / 2 + pad &&
      Math.abs(a.y - b.y) < (fa.d + fb.d) / 2 + pad;
  }

  /** 货架式摆盘：按面积降序分行，整体居中。 */
  function pack(plate) {
    var items = plate.models.map(function (m) {
      var f = fp(m); return { m: m, w: f.w, d: f.d };
    }).sort(function (a, b) { return b.w * b.d - a.w * a.d; });

    var rows = [], cur = [], curW = 0;
    items.forEach(function (it) {
      var add = cur.length ? it.w + GAP : it.w;
      if (curW + add <= USABLE) { cur.push(it); curW += add; }
      else { if (cur.length) rows.push({ items: cur, w: curW }); cur = [it]; curW = it.w; }
    });
    if (cur.length) rows.push({ items: cur, w: curW });

    var rowH = rows.map(function (r) {
      return Math.max.apply(null, r.items.map(function (i) { return i.d; }));
    });
    var totalH = rowH.reduce(function (s, h) { return s + h; }, 0) + GAP * Math.max(0, rows.length - 1);

    var y = -totalH / 2;
    rows.forEach(function (r, ri) {
      var x = -r.w / 2;
      r.items.forEach(function (it) {
        it.m.x = x + it.w / 2;
        it.m.y = y + rowH[ri] / 2;
        x += it.w + GAP;
      });
      y += rowH[ri] + GAP;
    });
  }

  /** 在盘内寻找第一个可放置的合法位置（自参考点由近及远扫描）。 */
  function placeFree(plate, model, near) {
    var f = fp(model);
    var limX = BUILD.x / 2 - MARGIN - f.w / 2;
    var limY = BUILD.y / 2 - MARGIN - f.d / 2;
    if (limX < -1e-6 || limY < -1e-6) return false; // 单个模型已放不下

    var step = 4;
    var cands = [];
    for (var x = -limX; x <= limX + 1e-6; x += step) {
      for (var y = -limY; y <= limY + 1e-6; y += step) {
        cands.push([x, y]);
      }
    }
    var nx = (near && near.x) || 0, ny = (near && near.y) || 0;
    cands.sort(function (a, b) {
      var da = (a[0] - nx) * (a[0] - nx) + (a[1] - ny) * (a[1] - ny);
      var db = (b[0] - nx) * (b[0] - nx) + (b[1] - ny) * (b[1] - ny);
      return da - db;
    });

    for (var i = 0; i < cands.length; i++) {
      var m = { x: cands[i][0], y: cands[i][1] };
      var ok = true;
      for (var j = 0; j < plate.models.length; j++) {
        var o = plate.models[j];
        if (o === model) continue;
        // 额外留出 GAP 间距
        var fa = fp(model), fb = fp(o);
        if (Math.abs(m.x - o.x) < (fa.w + fb.w) / 2 + GAP &&
          Math.abs(m.y - o.y) < (fa.d + fb.d) / 2 + GAP) { ok = false; break; }
      }
      if (ok) { model.x = m.x; model.y = m.y; return true; }
    }
    return false;
  }

  function validatePlate(plate) {
    var bad = [], cols = [];
    plate.models.forEach(function (m) {
      if (!inBounds(m)) bad.push(m.id);
    });
    for (var i = 0; i < plate.models.length; i++) {
      for (var j = i + 1; j < plate.models.length; j++) {
        if (overlaps(plate.models[i], plate.models[j])) cols.push([plate.models[i].id, plate.models[j].id]);
      }
    }
    return { bad: bad, cols: cols, ok: !bad.length && !cols.length };
  }

  /** 自动摆盘（BR-014）：优先保留现有布局，仅在必要时重排。 */
  function autoArrange(plate) {
    var v = validatePlate(plate);
    if (v.ok) return v;
    pack(plate);
    return validatePlate(plate);
  }

  /* ============================ 演示数据 ============================ */

  function demoCounts(n) {
    if (n === 1) return [1];
    var out = [];
    for (var i = 0; i < n; i++) out.push(i % 2 === 0 ? 2 : 1);  // 100% 缩放下 2 个/盘仍不越界
    return out;
  }
  function demoSup(n) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(true);
    if (n > 1) out[Math.min(4, n - 1)] = false;   // 其中一盘算法判定「无需支撑」
    return out;
  }

  function buildDemo(n) {
    n = Math.max(1, Math.min(8, n | 0));          // 打印盘上限 8（BR-009）
    state.demoPlates = n;
    state.plates = [];
    state.currentPlate = 0;
    state.selectedId = null;
    state.outOfBounds = false;
    state.collision = false;
    state.optInfo = null;                         // 普通演示数据不带「已优化摆盘」标记
    state.optToastShown = false;
    var counts = demoCounts(n);
    var sup = demoSup(n);
    for (var i = 0; i < n; i++) {
      var plate = { supportNeeded: sup[i], models: [] };
      for (var k = 0; k < counts[i]; k++) {
        plate.models.push({ id: nextId(), sx: 1, sy: 1, sz: 1, x: 0, y: 0 });
      }
      pack(plate);
      state.plates.push(plate);
    }
  }

  /* ---------- 自动摆盘智能优化（BR-057） ----------
     场景：模型师上传的模型含多个 STL 文件，若每个文件单独成盘会导致盘数过多（本例 10 个文件 → 10 盘，超过 8 盘上限）。
     初步方案：在不超过打印空间范围的前提下，**同色模型文件自动摆置一盘**。
     本例：10 个同色文件 → 每盘 2 件 → 5 盘。 */
  var OPT_DEMO = { files: 10, perPlate: 2, colors: 1 };

  function buildOptimizedDemo() {
    var files = OPT_DEMO.files;
    var perPlate = OPT_DEMO.perPlate;
    var plates = Math.ceil(files / perPlate);     // 10 / 2 = 5
    state.demoPlates = plates;
    state.plates = [];
    state.currentPlate = 0;
    state.selectedId = null;
    state.outOfBounds = false;
    state.collision = false;
    for (var i = 0; i < plates; i++) {
      var plate = { supportNeeded: true, models: [], color: '同色' };
      for (var k = 0; k < perPlate; k++) {
        if (i * perPlate + k >= files) break;
        plate.models.push({ id: nextId(), sx: 1, sy: 1, sz: 1, x: 0, y: 0 });
      }
      pack(plate);
      state.plates.push(plate);
    }
    state.optInfo = { files: files, plates: plates, colors: OPT_DEMO.colors, perPlate: perPlate };
    state.optToastShown = false;
  }

  /** 进入模型编辑页时，若本次任务发生过自动摆盘优化，提示优化结果（每次任务只提示一次） */
  function maybeToastOptimized() {
    var o = state.optInfo;
    if (!o || state.optToastShown) return;
    state.optToastShown = true;
    toast('当前已优化摆盘，同色模型摆置同一盘，目前盘数为' + o.plates);
  }

  function currentPlate() { return state.plates[state.currentPlate]; }

  function findModel(id) {
    for (var i = 0; i < state.plates.length; i++) {
      var m = state.plates[i].models.filter(function (x) { return x.id === id; })[0];
      if (m) return { plate: state.plates[i], model: m };
    }
    return null;
  }

  function totalModels() {
    return state.plates.reduce(function (s, p) { return s + p.models.length; }, 0);
  }

  /** 当前盘的有效支撑推荐（BR-002：用户手改后不再被算法覆盖）。 */
  function supportEnabled() {
    if (state.params.support.userModified) return state.params.support.enabled;
    var p = currentPlate();
    return p ? p.supportNeeded : false;
  }

  /* ============================ 三维场景 ============================ */

  var renderer, scene, camera, plateGroup, thumbRenderer, thumbCam;
  var orbit = { az: -58 * D2R, el: 34 * D2R, dist: 272, target: new THREE.Vector3(0, 0, 40) };
  // 镜头目标：打开缩放面板时自动上抬并后退，避免模型被面板遮挡
  var orbitGoal = { el: 34 * D2R, dist: 272, tz: 40 };
  var ORBIT_EDIT = { el: 34 * D2R, dist: 272, tz: 40 };
  // 面板展开时：抬高俯角 + 降低注视点，把模型顶到面板上方的可视区
  var ORBIT_SHEET = { el: 47 * D2R, dist: 292, tz: -34 };

  function setOrbitGoal(g) { orbitGoal.el = g.el; orbitGoal.dist = g.dist; orbitGoal.tz = g.tz; }
  /** 视角缩放（只改相机距离，不改变模型实际尺寸 —— BR-010） */
  function zoomBy(k) {
    orbit.dist = clamp(orbit.dist * k, 150, 1100);
    orbitGoal.dist = orbit.dist;
  }
  function resetView() {
    var g = isScaleOpen() ? ORBIT_SHEET : ORBIT_EDIT;
    orbit.az = -58 * D2R;
    orbit.el = g.el;
    orbit.dist = g.dist;
    orbit.target.z = g.tz;
    setOrbitGoal(g);
  }
  function stepOrbit() {
    var k = 0.14;
    orbit.el += (orbitGoal.el - orbit.el) * k;
    orbit.dist += (orbitGoal.dist - orbit.dist) * k;
    orbit.target.z += (orbitGoal.tz - orbit.target.z) * k;
  }
  var baseGeometry = null;
  var meshIndex = [];   // [{mesh, model}]
  var raycaster = new THREE.Raycaster();
  var ndc = new THREE.Vector2();
  var glSize = { w: 0, h: 0 };

  function b64Bytes(b64) {
    var bin = atob(b64), n = bin.length, out = new Uint8Array(n);
    for (var i = 0; i < n; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function getGeometry() {
    if (baseGeometry) return baseGeometry;
    var posBytes = b64Bytes(ASSET.pos);
    var idxBytes = b64Bytes(ASSET.idx);
    var pos = new Float32Array(posBytes.buffer, posBytes.byteOffset, posBytes.byteLength / 4);
    var idx = ASSET.idxDtype === 'Uint16'
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

  function initScene() {
    var canvas = $('#gl');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(38, 1, 1, 4000);
    camera.up.set(0, 0, 1);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xb9c2d4, 0.62));
    var d1 = new THREE.DirectionalLight(0xffffff, 0.82); d1.position.set(150, -180, 300); scene.add(d1);
    var d2 = new THREE.DirectionalLight(0xffffff, 0.26); d2.position.set(-200, 150, 120); scene.add(d2);

    // 打印空间示意框
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
    grid.material.transparent = true; grid.material.opacity = 0.75;
    scene.add(grid);

    // 角点坐标轴提示（X 红 / Y 绿 / Z 蓝）
    var o = new THREE.Vector3(-BUILD.x / 2, -BUILD.y / 2, 0);
    scene.add(axisLine(o, new THREE.Vector3(34, 0, 0), 0xe11d48));
    scene.add(axisLine(o, new THREE.Vector3(0, 34, 0), 0x16a34a));
    scene.add(axisLine(o, new THREE.Vector3(0, 0, 34), 0x2563eb));

    plateGroup = new THREE.Group();
    scene.add(plateGroup);

    thumbRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    thumbRenderer.setPixelRatio(2);
    thumbRenderer.setSize(160, 132, false);
    thumbRenderer.setClearColor(0xffffff, 0);
    thumbCam = new THREE.PerspectiveCamera(34, 160 / 132, 1, 4000);
    thumbCam.up.set(0, 0, 1);
    thumbCam.position.set(150, -260, 240);
    thumbCam.lookAt(0, 0, 34);
  }

  function axisLine(o, dir, color) {
    var g = new THREE.BufferGeometry().setFromPoints([o, o.clone().add(dir)]);
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color: color }));
  }

  function buildPlateMeshes(plate) {
    while (plateGroup.children.length) {
      var c = plateGroup.children.pop();
      if (c.geometry && c.geometry !== baseGeometry) c.geometry.dispose();
      if (c.material) { if (c.material.map) c.material.map.dispose(); c.material.dispose(); }
    }
    meshIndex = [];
    if (!plate) return;

    var geo = getGeometry();
    plate.models.forEach(function (m) {
      var selected = m.id === state.selectedId;
      var bad = state.outOfBounds || !inBounds(m);

      // 选中态靠橙色包围框表达，模型本体保持中性色以保留浮雕细节
      var mat = new THREE.MeshStandardMaterial({
        color: bad ? COL.bad : (selected ? 0xa9b3c4 : COL.model),
        roughness: 0.6, metalness: 0.05,
        emissive: bad ? 0x3d0512 : selected ? 0x140b06 : 0x000000
      });
      var mesh = new THREE.Mesh(geo, mat);
      mesh.scale.set(m.sx, m.sy, m.sz);
      mesh.position.set(m.x, m.y, 0);
      plateGroup.add(mesh);
      meshIndex.push({ mesh: mesh, model: m });

      if (selected || bad) {
        var f = fp(m);
        var bb = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.BoxGeometry(f.w + 2, f.d + 2, f.h + 2)),
          new THREE.LineBasicMaterial({ color: bad ? COL.bad : COL.sel, transparent: true, opacity: 0.95 })
        );
        bb.position.set(m.x, m.y, f.h / 2);
        plateGroup.add(bb);
      }
    });
  }

  function updateCamera() {
    var d = orbit.dist, el = orbit.el, az = orbit.az;
    camera.position.set(
      orbit.target.x + d * Math.cos(el) * Math.cos(az),
      orbit.target.y + d * Math.cos(el) * Math.sin(az),
      orbit.target.z + d * Math.sin(el)
    );
    camera.lookAt(orbit.target);
  }

  function resizeGL() {
    var canvas = $('#gl');
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
    var ed = $('#screen-model-editor');
    if (ed.classList.contains('is-active')) {
      resizeGL();
      stepOrbit();
      updateCamera();
      renderer.render(scene, camera);
    }
  }

  /* ============================ 交互（旋转 / 缩放 / 选中） ============================ */

  function initControls() {
    var canvas = $('#gl');
    var ptrs = new Map();
    var moved = 0, downAt = 0, pinchStart = 0, distStart = 0, multi = false;

    function localPt(e) {
      var r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
    }

    canvas.addEventListener('pointerdown', function (e) {
      canvas.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) { moved = 0; downAt = Date.now(); multi = false; }
      if (ptrs.size === 2) {
        multi = true;
        var a = ptrs.get(Array.from(ptrs.keys())[0]), b = ptrs.get(Array.from(ptrs.keys())[1]);
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
        if (pinchStart > 0 && d > 0) {
          orbit.dist = clamp(distStart * (pinchStart / d), 150, 1100);
          orbitGoal.dist = orbit.dist;   // 用户操作后同步镜头目标，避免被动画拉回
        }
        return;
      }
      moved += Math.abs(dx) + Math.abs(dy);
      orbit.az -= dx * 0.42 * D2R;
      orbit.el = clamp(orbit.el + dy * 0.34 * D2R, 4 * D2R, 86 * D2R);
      orbitGoal.el = orbit.el;
    });

    function up(e) {
      if (!ptrs.has(e.pointerId)) return;
      var pt = ptrs.get(e.pointerId);
      ptrs.delete(e.pointerId);
      if (ptrs.size === 0 && !multi && moved < 7 && Date.now() - downAt < 600) {
        handleTap(localPt({ clientX: pt.x, clientY: pt.y }));
      }
      if (ptrs.size < 2) pinchStart = 0;
    }
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('pointerleave', function (e) { if (ptrs.has(e.pointerId)) up(e); });

    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      zoomBy(1 + Math.sign(e.deltaY) * 0.09);   // 必须同步 orbitGoal，否则被每帧插值拉回
    }, { passive: false });

    function handleTap(p) {
      if (state.slicing) return;
      var r = canvas.getBoundingClientRect();
      if (p.x < 0 || p.y < 0 || p.x > r.width || p.y > r.height) return;
      ndc.x = (p.x / r.width) * 2 - 1;
      ndc.y = -(p.y / r.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      var hits = raycaster.intersectObjects(meshIndex.map(function (x) { return x.mesh; }), false);
      if (hits.length) {
        var rec = meshIndex.filter(function (x) { return x.mesh === hits[0].object; })[0];
        if (rec) { selectModel(rec.model.id); return; }
      }
      selectModel(null); // 点空白取消选中
    }
  }

  function selectModel(id) {
    state.selectedId = id;
    buildPlateMeshes(currentPlate());
    if (!id && isScaleOpen()) closeScaleSheet();
  }

  /* ============================ 界面渲染 ============================ */

  function renderPlateChips() {
    var box = $('#plateChips');
    var multi = state.plates.length > 1;
    box.classList.toggle('is-hidden', !multi);
    box.innerHTML = '';
    if (!multi) return;
    state.plates.forEach(function (p, i) {
      var v = validatePlate(p);
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'plate-chip' + (i === state.currentPlate ? ' is-sel' : '') + (v.ok ? '' : ' is-bad');
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', i === state.currentPlate ? 'true' : 'false');
      b.textContent = String(i + 1);
      b.dataset.plate = String(i);
      b.addEventListener('click', function () { switchPlate(i); });
      box.appendChild(b);
    });
    var sel = box.querySelector('.is-sel');
    if (sel) {
      // 手动滚动，避免 scrollIntoView 连带滚动整页
      var target = sel.offsetLeft - box.clientWidth / 2 + sel.offsetWidth / 2;
      box.scrollLeft = Math.max(0, target);
    }
  }

  function switchPlate(i) {
    if (i === state.currentPlate || state.slicing) return;
    state.currentPlate = i;
    state.selectedId = null;
    closeScaleSheet();          // §3.2 切换打印盘时缩放面板自动关闭
    buildPlateMeshes(currentPlate());
    refreshEditorUI();
    toast('已切换至盘 ' + (i + 1));
  }

  function activeParams() {
    var p = state.params;
    var sup = { enabled: supportEnabled(), type: p.support.type };
    return {
      mode: p.mode, base: p.base, temp: p.temp, infill: p.infill,
      support: sup,
      supportIsRecommend: !p.support.userModified
    };
  }

  function blockReason() {
    if (state.slicing) return null;
    if (state.outOfBounds) return '零件超出打印区域';
    if (state.collision) return '零件之间存在重叠';
    if (totalModels() === 0) return '当前无可打印零件';
    var empty = state.plates.some(function (p) { return p.models.length === 0; });
    if (empty) return '存在不可打印的打印盘';
    var bad = state.plates.some(function (p) { return !validatePlate(p).ok; });
    if (bad) return '零件超出打印区域';
    return null;
  }

  function refreshEditorUI() {
    var p = currentPlate();
    var n = state.plates.length;
    var nameEl = $('#edModelName');
    nameEl.innerHTML = '电击小子_3D浮雕 <span class="ed-title__plates">· ' + n + '盘</span>';

    var info = $('#hudPlateInfo');
    if (p) {
      info.textContent = '盘 ' + (state.currentPlate + 1) + ' · ' + p.models.length + ' 个零件';
    }
    var v = p ? validatePlate(p) : { ok: true };
    $('#hudAlert').hidden = !(state.outOfBounds || (p && !v.ok));

    renderPlateChips();

    var reason = blockReason();
    var btn = $('#btnSlice');
    btn.disabled = state.slicing || !!reason;   // Loading 期间禁止重复提交
    btn.textContent = state.slicing ? '正在生成打印方案…' : '去打印';
    var br = $('#blockReason');
    if (reason && !state.slicing) { br.hidden = false; $('#blockReasonText').textContent = reason; }
    else { br.hidden = true; }

    $$('.tool').forEach(function (el) { });
    ['#toolScale', '#toolCopy', '#toolDelete'].forEach(function (s) {
      $(s).classList.toggle('is-locked', state.slicing);
    });
    $('#toolScale').classList.toggle('is-on', isScaleOpen());
  }

  /* ============================ 缩放面板 ============================ */

  function isScaleOpen() { return $('#scaleSheet').classList.contains('is-open'); }

  function openScaleSheet() {
    if (!state.selectedId) { toast('请先选择一个零件'); return; }
    $('#scaleSheet').classList.add('is-open');
    $('#editorScrim').classList.add('is-open');
    $('#toolScale').classList.add('is-on');
    setOrbitGoal(ORBIT_SHEET);
    syncScalePanel();
  }
  function closeScaleSheet() {
    $('#scaleSheet').classList.remove('is-open');
    $('#editorScrim').classList.remove('is-open');
    $('#toolScale').classList.remove('is-on');
    setOrbitGoal(ORBIT_EDIT);
    finalizeLayout();   // §7.8 关闭缩放面板时确保完成最终自动摆盘
  }
  function toggleScaleSheet() { if (isScaleOpen()) closeScaleSheet(); else openScaleSheet(); }

  function syncScalePanel() {
    var found = state.selectedId ? findModel(state.selectedId) : null;
    if (!found) return;
    var m = found.model;
    var isPct = state.scaleMode === 'percent';
    $$('[data-scale-mode]').forEach(function (b) {
      b.classList.toggle('is-on', b.dataset.scaleMode === state.scaleMode);
    });
    $('#scaleSizePane').hidden = isPct;
    $('#scalePercentPane').hidden = !isPct;

    // 「应用至所有盘的零件」在单盘与多盘下都展示（单盘时作用于该盘的全部零件）
    var multi = state.plates.length > 1;
    $('#rowApplyAll').classList.remove('is-hidden');
    $('#applyAllSub').textContent = multi
      ? '关闭时只缩放选中的这一个零件；开启后全部打印盘的零件一起缩放'
      : '关闭时只缩放选中的这一个零件；开启后当前盘的全部零件一起缩放';

    $('#toggleUniform').setAttribute('aria-checked', state.uniform ? 'true' : 'false');
    $('#toggleApplyAll').setAttribute('aria-checked', state.applyAll ? 'true' : 'false');

    if (isPct) {
      var pct = Math.round(m.sx * 100);
      $('#percentVal').textContent = String(pct);
      $('#percentSlider').value = String(clamp(pct, 10, 300));
    } else {
      $$('#scaleSizePane .num').forEach(function (box) {
        var ax = box.dataset.axis;
        var mm = BASE[ax] * m['s' + ax];
        box.querySelector('input').value = mm.toFixed(1);
        box.classList.remove('is-invalid');
      });
    }
    $('#sizeHint').hidden = true;
  }

  function targetsFor(model) {
    // 缩放的作用范围：
    //   默认（「应用至所有盘的零件」关闭）→ **只缩放选中的这一个零件**
    //   开关开启                          → 全部打印盘上的零件按同一比例一起缩放
    if (!state.applyAll) return [model];
    var all = [];
    state.plates.forEach(function (p) {
      p.models.forEach(function (m) { all.push(m); });
    });
    return all;
  }

  function applyScale(model, sx, sy, sz) {
    var list = targetsFor(model);
    list.forEach(function (m) { m.sx = sx; m.sy = sy; m.sz = sz; });
    afterScale();
  }

  function afterScale() {
    var p = currentPlate();
    if (p) autoArrange(p);
    if (state.applyAll) {
      state.plates.forEach(function (q) { if (q !== p) autoArrange(q); });
    }
    buildPlateMeshes(currentPlate());
    refreshEditorUI();
    if (isScaleOpen()) syncScalePanel();
  }

  function finalizeLayout() {
    var p = currentPlate();
    if (p) autoArrange(p);
    buildPlateMeshes(currentPlate());
    refreshEditorUI();
  }

  function setPercent(v) {
    var found = findModel(state.selectedId); if (!found) return;
    v = clamp(Math.round(v), 10, 300);
    applyScale(found.model, v / 100, v / 100, v / 100);
  }

  function setAxis(ax, mm) {
    var found = findModel(state.selectedId); if (!found) return;
    var m = found.model;
    var sx = mm / BASE.x, sy = mm / BASE.y, sz = mm / BASE.z;
    if (state.uniform) {
      var k = sx; // 以被改动的轴为基准
      applyScale(m, k, k, k);
    } else {
      var ns = { x: m.sx, y: m.sy, z: m.sz };
      ns[ax] = (mm / BASE[ax]);
      applyScale(m, ns.x, ns.y, ns.z);
    }
  }

  /* ============================ 工具栏 ============================ */

  function doCopy() {
    if (!state.selectedId) { toast('请先选择一个零件'); return; }
    var found = findModel(state.selectedId);
    var plate = currentPlate();
    var src = found.model;
    if (!plate || plate.models.indexOf(src) < 0) { toast('请先选择一个零件'); return; }

    // 副本继承原模型的尺寸 / 缩放比例 / 方向
    var copy = { id: nextId(), sx: src.sx, sy: src.sy, sz: src.sz, x: src.x, y: src.y };

    var placed = placeFree(plate, copy, src);
    if (placed) {
      plate.models.push(copy);
    } else {
      // 就近找不到空位时，尝试整体重排（自动摆盘）后是否可容纳
      var snapshot = plate.models.map(function (m) { return { m: m, x: m.x, y: m.y }; });
      plate.models.push(copy);
      pack(plate);
      if (!validatePlate(plate).ok) {
        plate.models.pop();                       // 回滚模型列表
        snapshot.forEach(function (s) { s.m.x = s.x; s.m.y = s.y; });  // 回滚布局，绝不破坏现有排布
        buildPlateMeshes(currentPlate());
        refreshEditorUI();
        toast('当前打印盘空间不足，无法复制');   // 不自动新建打印盘（BR-004）
        return;
      }
    }

    state.selectedId = copy.id;   // 副本默认进入选中状态
    if (!validatePlate(plate).ok) autoArrange(plate);
    buildPlateMeshes(plate);
    refreshEditorUI();
    toast('已复制零件');
  }

  /** 删除入口：若删掉后整个任务将没有任何零件，先二次确认（§9 修订） */
  function doDelete() {
    if (!state.selectedId) { toast('请先选择一个零件'); return; }
    var plate = currentPlate();
    var idx = -1;
    plate.models.forEach(function (m, i) { if (m.id === state.selectedId) idx = i; });
    if (idx < 0) { toast('请先选择一个零件'); return; }

    if (totalModels() === 1) {          // 这是整个任务的最后一个零件
      $('#modalDeleteLast').classList.add('is-open');
      return;                           // 取消 → 留在模型编辑页，不执行删除
    }
    performDelete(plate, idx);
  }

  /** 真正执行删除 */
  function performDelete(plate, idx) {
    plate.models.splice(idx, 1);
    state.selectedId = null;            // 删除后取消选中
    closeScaleSheetSilent();

    if (totalModels() === 0) {
      // 任务自动移除，不可恢复 → 退出编辑页
      buildPlateMeshes(currentPlate());
      refreshEditorUI();
      go('model-detail');
      toast('本次打印任务已移除，不可恢复');
      return;
    }

    if (plate.models.length === 0) {
      // 该盘已无零件：自动删除空盘，后续盘号前移（BR-005）
      state.plates.splice(state.currentPlate, 1);
      state.currentPlate = Math.min(state.currentPlate, state.plates.length - 1);
      toast('已删除空打印盘，盘号已重新编号');
    } else {
      autoArrange(plate);
      toast('已删除零件');
    }
    buildPlateMeshes(currentPlate());
    refreshEditorUI();
  }

  function closeScaleSheetSilent() {
    $('#scaleSheet').classList.remove('is-open');
    $('#editorScrim').classList.remove('is-open');
    $('#toolScale').classList.remove('is-on');
    setOrbitGoal(ORBIT_EDIT);
  }

  /* ============================ 打印设置页 ============================ */

  var MODE_LABEL = { fast: '快速', standard: '标准', fine: '精细' };
  var BASE_LABEL = { with: '带底座', without: '不带底座' };
  var SUP_LABEL = { tree: '树状支撑', linear: '线性支撑', off: '关闭支撑' };

  function refreshSettingsUI() {
    $$('[data-opt="mode"]').forEach(function (b) { b.classList.toggle('is-on', b.dataset.value === state.params.mode); });
    $$('[data-opt="base"]').forEach(function (b) { b.classList.toggle('is-on', b.dataset.value === state.params.base); });
    $$('[data-opt="supportType"]').forEach(function (b) { b.classList.toggle('is-on', b.dataset.value === state.params.support.type); });

    var on = supportEnabled();
    $('#toggleSupport').setAttribute('aria-checked', on ? 'true' : 'false');
    $('#supportTypeWrap').style.opacity = on ? '1' : '0.42';
    $('#supportTypeWrap').style.pointerEvents = on ? 'auto' : 'none';
    $$('[data-opt="supportType"]').forEach(function (b) { b.classList.toggle('is-disabled', !on); });
    $('#supportOffHint').hidden = on;
    $('#supportHint').textContent = state.params.support.userModified
      ? '已按你的设置生效，不再自动覆盖'
      : '已根据模型自动推荐';

    $('#tempVal').textContent = String(state.params.temp);
    $('#infillVal').textContent = String(state.params.infill);
    $('#infillSlider').value = String(state.params.infill);
  }

  /* ============================ 切片与估算 ============================ */

  function estimates() {
    var P = activeParams();
    var flow = { fast: 12, standard: 8, fine: 4.5 }[P.mode];        // mm³/s 有效挤出
    var layer = { fast: 0.28, standard: 0.2, fine: 0.12 }[P.mode];  // mm
    var infillK = 1 - (100 - P.infill) / 100 * 0.35;                // 填充对实体量的折算
    var baseK = P.base === 'with' ? 1.06 : 1.0;
    var supK = P.support.enabled ? 1.12 : 1.0;

    var plates = state.plates.map(function (p) {
      var vol = 0, layers = 0;
      p.models.forEach(function (m) {
        var f = fp(m);
        var v = f.w * f.d * (f.h * 0.5) * infillK * baseK * supK;   // 浮雕等效实体量
        vol += v;
        layers = Math.max(layers, f.h / layer);
      });
      var tSec = vol / flow + layers * 4 + (P.base === 'with' ? 3 : 0);
      return {
        index: plates_indexOf(p),
        models: p.models.length,
        volume: vol,
        grams: vol * 0.00124,     // PLA 1.24 g/cm³
        seconds: tSec
      };
    });

    var totalVol = plates.reduce(function (s, x) { return s + x.volume; }, 0);
    var totalSec = plates.reduce(function (s, x) { return s + x.seconds; }, 0);
    return { plates: plates, grams: totalVol * 0.00124, seconds: totalSec };
  }
  function plates_indexOf(p) { return state.plates.indexOf(p); }

  function openLoading() {
    state.slicing = true;
    var el = $('#sliceLoading');
    el.classList.add('is-open');
    $$('#loadingSteps .loading__step').forEach(function (s) {
      s.classList.remove('is-done', 'is-active');
      s.querySelector('.loading__mark').textContent = '○';
    });
    refreshEditorUI();
  }
  function closeLoading() {
    state.slicing = false;
    $('#sliceLoading').classList.remove('is-open');
    refreshEditorUI();
  }

  async function runSlice() {
    var reason = blockReason();
    if (reason) { toast(reason); return; }
    openLoading();
    var steps = $$('#loadingSteps .loading__step');
    var per = 380;
    for (var i = 0; i < steps.length; i++) {
      steps[i].classList.add('is-active');
      steps[i].querySelector('.loading__mark').textContent = '◐';
      await sleep(per);
      steps[i].classList.remove('is-active');
      steps[i].classList.add('is-done');
      steps[i].querySelector('.loading__mark').textContent = '●';
    }
    await sleep(200);
    closeLoading();

    if (state.sliceFail) { showSliceFailed(); return; }

    var est = estimates();
    state.lastSlice = { est: est, thumbs: captureThumbs(), params: activeParams(), at: Date.now() };
    renderPreparePage();
    go('prepare-print');
  }

  function captureThumbs() {
    var saved = state.currentPlate;
    var out = [];
    state.plates.forEach(function (p, i) {
      state.currentPlate = i;
      buildPlateMeshes(p);
      thumbRenderer.render(scene, thumbCam);
      try { out.push(thumbRenderer.domElement.toDataURL('image/png')); }
      catch (e) { out.push(''); }
    });
    state.currentPlate = saved;
    buildPlateMeshes(currentPlate());
    return out;
  }

  var SLICE_ERRORS = [
    { title: '网络异常，请检查网络后重试', desc: '未能与云端切片服务建立连接。', code: 'NET_TIMEOUT' },
    { title: '切片服务暂不可用，请稍后重试', desc: '云端切片服务当前繁忙或正在升级。', code: 'SVC_UNAVAILABLE' },
    { title: '模型存在无法处理的结构，请调整后重试', desc: '检测到非流形边或零厚度面等无法切片的结构。', code: 'MESH_INVALID' },
    { title: '切片失败，请重试', desc: '云端切片未能完成本次计算。', code: 'SLICE_FAILED' }
  ];
  var errIdx = 0;

  function showSliceFailed() {
    var e = SLICE_ERRORS[errIdx % SLICE_ERRORS.length]; errIdx++;
    $('#failTitle').textContent = e.title;
    $('#failDesc').textContent = e.desc;
    $('#failMeta').innerHTML =
      '错误类型：' + e.code + '<br>' +
      '打印盘数：' + state.plates.length + '<br>' +
      '已编辑模型：' + totalModels() + ' 个（编辑结果已保留）';
    go('slice-failed');
  }

  function renderPreparePage() {
    var s = state.lastSlice;
    if (!s) return;
    var est = s.est;

    var list = $('#ppPlateList');
    list.innerHTML = '';
    state.plates.forEach(function (p, i) {
      var pe = est.plates[i];
      var row = document.createElement('div');
      row.className = 'pp-plate';
      row.innerHTML =
        '<div class="pp-plate__thumb">' + (s.thumbs[i] ? '<img alt="盘 ' + (i + 1) + ' 布局缩略图" src="' + s.thumbs[i] + '">' : '') + '</div>' +
        '<div class="pp-plate__body">' +
        '<div class="pp-plate__name">电击小子_3D浮雕 · 盘' + (i + 1) + '</div>' +
        '<div class="pp-plate__stats"><span>⏱ <b>' + fmtDur(pe.seconds) + '</b></span><span>⚖ <b>' + fmtG(pe.grams) + '</b></span><span><b>' + pe.models + '</b> 个零件</span></div>' +
        '</div>';
      list.appendChild(row);
    });
  }

  /* ============================ 保存切片（准备打印页） ============================ */

  var DEFAULT_SLICE_NAME = '电击小子_3D浮雕';
  var saveTimer = null;

  function sliceNameValue() {
    return ($('#saveNameInput').value || '').trim();
  }

  function syncSaveNameUI() {
    var v = sliceNameValue();
    $('#saveNameCount').textContent = v.length + '/40';
    var empty = v.length === 0;
    $('#btnSaveNameOk').disabled = empty;
    $('#saveNameInput').classList.toggle('is-invalid', empty && state.saveNameTouched);
    $('#saveNameHint').hidden = !(empty && state.saveNameTouched);
  }

  function openSaveName() {
    if (state.saving) return;
    state.saveNameTouched = false;
    $('#saveNameInput').value = state.savedSliceName || DEFAULT_SLICE_NAME;
    syncSaveNameUI();
    $('#modalSaveDone').classList.remove('is-open');
    $('#modalSaveName').classList.add('is-open');
    setTimeout(function () { try { $('#saveNameInput').focus(); } catch (e) { /* ignore */ } }, 60);
  }

  function renderSaveProgress() {
    var p = Math.round(state.saveProgress);
    $('#saveProgressBar').style.width = p + '%';
    $('#saveProgressPct').textContent = p + '%';
  }

  /** 保存进度：freeze=true 用于深链演示（停在固定进度不动） */
  function openSaving(name, freeze) {
    $('#saveProgressName').textContent = name || DEFAULT_SLICE_NAME;
    state.saveProgress = freeze ? 64 : 0;
    renderSaveProgress();
    $('#modalSaving').classList.add('is-open');
    if (freeze) return;
    state.saving = true;
    if (saveTimer) { clearInterval(saveTimer); saveTimer = null; }
    saveTimer = setInterval(function () {
      state.saveProgress = Math.min(100, state.saveProgress + 4 + Math.random() * 7);
      renderSaveProgress();
      if (state.saveProgress >= 100) {
        clearInterval(saveTimer); saveTimer = null;
        setTimeout(finishSaving, 280);
      }
    }, 110);
  }

  function startSaving() {
    var name = sliceNameValue();
    if (!name) { state.saveNameTouched = true; syncSaveNameUI(); return; }
    state.savedSliceName = name;
    $('#modalSaveName').classList.remove('is-open');
    openSaving(name, false);
  }

  function finishSaving() {
    state.saving = false;
    state.saveProgress = 100;
    renderSaveProgress();
    $('#modalSaving').classList.remove('is-open');
    $('#saveDoneName').textContent = state.savedSliceName || DEFAULT_SLICE_NAME;
    $('#modalSaveDone').classList.add('is-open');
  }

  function abortSaving() {
    if (saveTimer) { clearInterval(saveTimer); saveTimer = null; }
    state.saving = false;
    $('#modalSaving').classList.remove('is-open');
  }

  /* ============================ 保存范围弹窗（打印设置页） ============================ */

  /** 记录进入打印设置页时的参数快照（用于退出时判断「用户是否有实际修改」） */
  function snapshotParams() {
    var p = state.params;
    state.paramsSnapshot = {
      mode: p.mode, base: p.base, temp: p.temp, infill: p.infill,
      support: { enabled: p.support.enabled, type: p.support.type }
    };
  }

  /** 当前参数与进入时的快照是否有差异：有实际修改 → 退出时弹保存范围弹窗；无 → 直接返回模型编辑页（BR-056） */
  function paramsChanged() {
    var s = state.paramsSnapshot;
    if (!s) return true;   // 无快照（如深链直达）时保守视为有修改，仍弹窗
    var p = state.params;
    return p.mode !== s.mode || p.base !== s.base || p.temp !== s.temp || p.infill !== s.infill ||
      p.support.enabled !== s.support.enabled || p.support.type !== s.support.type;
  }

  /** 打开保存范围弹窗：每次进入都重置为未选择状态（底部按钮回到「取消」） */
  function openSaveScope() {
    state.scopeChoice = null;
    syncSaveScopeUI();
    $('#modalSaveScope').classList.add('is-open');
  }

  /** 同步选中态与底部按钮：未选范围 = 「取消」，已选范围 = 「确定」 */
  function syncSaveScopeUI() {
    $$('#modalSaveScope [data-save-scope]').forEach(function (b) {
      var on = b.dataset.saveScope === state.scopeChoice;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var btn = $('#btnSaveScopeAction');
    var chosen = !!state.scopeChoice;
    btn.textContent = chosen ? '确定' : '取消';
    btn.dataset.scopeAction = chosen ? 'confirm' : 'cancel';
    btn.className = chosen ? 'btn-primary' : 'btn-ghost';
  }

  /* ============================ 屏幕路由 ============================ */

  var SCREENS = ['model-detail', 'model-editor', 'print-settings', 'prepare-print', 'slice-failed'];
  var lastApplied = null;

  function showScreen(name) {
    SCREENS.forEach(function (n) {
      var el = $('#screen-' + n);
      if (el) el.classList.toggle('is-active', n === name);
    });
    // 整图复用页自带烘焙状态栏，隐藏手机的伪状态栏避免重影
    $('.phone').classList.toggle('is-artwork', name === 'model-detail' || name === 'prepare-print');
    if (name !== 'model-editor') closeScaleSheetSilent();
    if (name === 'model-editor') { glSize = { w: 0, h: 0 }; setTimeout(resizeGL, 0); }
  }

  function go(name) {
    var target = '#' + name;
    if (location.hash !== target) {
      try { location.hash = target; } catch (e) { /* ignore */ }
    }
    applyHash(true);
  }

  function applyHash(force) {
    var h = (location.hash || '#model-detail').replace(/^#/, '');
    if (!force && h === lastApplied) return;   // 幂等：避免与 hashchange 重复执行
    lastApplied = h;
    var parts = h.split('/');
    var name = parts[0], overlay = parts[1];

    var base = SCREENS.indexOf(name) >= 0 ? name : 'model-detail';
    // 叠加层别名（供 PRD 深链直达弹窗 / 面板 / 状态）
    if (name === 'scale-panel') { base = 'model-editor'; overlay = 'scale-panel'; }
    if (name === 'save-scope-dialog') { base = 'print-settings'; overlay = 'save-scope-dialog'; }
    if (name === 'delete-last-dialog') { base = 'model-editor'; overlay = 'delete-last-dialog'; }
    if (name === 'restore-default-dialog') { base = 'print-settings'; overlay = 'restore-default-dialog'; }
    if (name === 'slicing-loading') { base = 'model-editor'; overlay = 'slicing-loading'; }
    if (name === 'out-of-bounds') { base = 'model-editor'; overlay = 'out-of-bounds'; }
    if (name === 'save-name-dialog') { base = 'prepare-print'; overlay = 'save-name-dialog'; }
    if (name === 'saving-progress') { base = 'prepare-print'; overlay = 'saving-progress'; }
    if (name === 'save-done-dialog') { base = 'prepare-print'; overlay = 'save-done-dialog'; }

    showScreen(base);

    // 先收起所有叠加层
    if (overlay !== 'scale-panel') closeScaleSheetSilent();
    $$('.modal').forEach(function (m) { m.classList.remove('is-open'); });
    if (overlay !== 'slicing-loading') { state.slicing = false; $('#sliceLoading').classList.remove('is-open'); }
    if (overlay !== 'saving-progress') abortSaving();

    if (overlay === 'scale-panel') openScaleSheet();
    if (overlay === 'save-scope-dialog') { state.scopeChoice = null; syncSaveScopeUI(); $('#modalSaveScope').classList.add('is-open'); }
    if (overlay === 'restore-default-dialog') $('#modalRestoreDefault').classList.add('is-open');
    if (overlay === 'delete-last-dialog') $('#modalDeleteLast').classList.add('is-open');
    if (overlay === 'slicing-loading') openLoading();
    if (overlay === 'out-of-bounds') { state.outOfBounds = true; finalizeLayout(); }

    // 保存链路深链：需先有一份切片结果，否则准备打印页是空的
    if (overlay === 'save-name-dialog' || overlay === 'saving-progress' || overlay === 'save-done-dialog') {
      ensureSlice();
      if (overlay === 'save-name-dialog') openSaveName();
      if (overlay === 'saving-progress') openSaving(state.savedSliceName || DEFAULT_SLICE_NAME, true);
      if (overlay === 'save-done-dialog') {
        state.savedSliceName = state.savedSliceName || DEFAULT_SLICE_NAME;
        $('#saveDoneName').textContent = state.savedSliceName;
        $('#modalSaveDone').classList.add('is-open');
      }
    }

    if (base === 'model-editor') refreshEditorUI();
    if (base === 'print-settings') { snapshotParams(); refreshSettingsUI(); }
    if (base === 'prepare-print') renderPreparePage();
  }

  /** 深链直达准备打印页时，若尚无切片结果则补一份（不跑 Loading 动画） */
  function ensureSlice() {
    if (state.lastSlice) return;
    state.lastSlice = { est: estimates(), thumbs: captureThumbs(), params: activeParams(), at: Date.now() };
  }

  window.addEventListener('hashchange', function () { applyHash(); });

  /* ============================ 事件绑定 ============================ */

  function bind() {
    // 入口
    $('#btnOpenEditor').addEventListener('click', function () { go('model-editor'); maybeToastOptimized(); });
    $('#btnModelDetailPrint').addEventListener('click', function () {
      toast('本次需求范围为「打印设置」链路，直接打印不在范围内');
    });

    // 模型编辑页导航
    $('#btnEditorBack').addEventListener('click', function () {
      go('model-detail');   // 保留编辑结果，不做退出确认（BR-016）
    });
    $('#btnEditorMore').addEventListener('click', function () { go('print-settings'); });

    // 工具栏
    $('#toolScale').addEventListener('click', toggleScaleSheet);
    $('#toolCopy').addEventListener('click', doCopy);
    $('#toolDelete').addEventListener('click', doDelete);

    // 缩放面板
    $('#editorScrim').addEventListener('click', closeScaleSheet);
    $$('[data-scale-mode]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.scaleMode = b.dataset.scaleMode;
        syncScalePanel();
      });
    });
    $('#percentSlider').addEventListener('input', function () {
      setPercent(Number(this.value));
      $('#percentSlider').value = this.value;
    });
    $$('#scaleSizePane .num input').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var box = inp.closest('.num');
        var ax = box.dataset.axis;
        var raw = inp.value.trim();
        var num = Number(raw);
        var valid = raw !== '' && /^\d*\.?\d*$/.test(raw) && isFinite(num) && num > 0;
        if (!valid) {
          box.classList.add('is-invalid');
          showSizeHint('请输入大于 0 的有效数值，非法输入不会生效');
          return;
        }
        var maxMM = BUILD.x;   // 上限不写死 180，超出会由碰撞检测接管；此处给软提示
        if (num > maxMM) {
          box.classList.add('is-invalid');
          showSizeHint('尺寸超出允许范围，已自动调整（以实际包围盒与打印空间碰撞检测为准）');
          num = maxMM;
        } else {
          box.classList.remove('is-invalid');
          $('#sizeHint').hidden = true;
        }
        setAxis(ax, num);
        var f = findModel(state.selectedId);
        if (f) inp.value = (BASE[ax] * f.model['s' + ax]).toFixed(1);
      });
      inp.addEventListener('blur', function () { syncScalePanel(); });
    });
    $('#toggleUniform').addEventListener('click', function () {
      state.uniform = !state.uniform;
      this.setAttribute('aria-checked', state.uniform ? 'true' : 'false');
    });
    $('#toggleApplyAll').addEventListener('click', function () {
      state.applyAll = !state.applyAll;
      this.setAttribute('aria-checked', state.applyAll ? 'true' : 'false');
    });
    $('#btnScaleReset').addEventListener('click', function () {
      var f = findModel(state.selectedId); if (!f) return;
      // 重置为原始尺寸 100%，等比例状态不变（BR-017）
      targetsFor(f.model).forEach(function (m) { m.sx = 1; m.sy = 1; m.sz = 1; });
      afterScale();
      toast('已重置为原始尺寸 100%');
    });

    // 去打印
    $('#btnSlice').addEventListener('click', function () {
      var r = blockReason();
      if (r) { toast(r); return; }
      runSlice();
    });

    // 打印设置页：顶部左侧「退出」→ 有实际修改才弹保存范围选择；无实际修改直接返回模型编辑页（BR-056）
    // （顶部右侧原有的「保存」已删除）
    $('#btnSettingsBack').addEventListener('click', function () {
      if (paramsChanged()) openSaveScope();
      else go('model-editor');
    });

    $$('#modalSaveScope [data-save-scope]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.scopeChoice = b.dataset.saveScope;
        syncSaveScopeUI();
      });
    });

    // 弹窗底部按钮：取消 → 返回打印设置页；确定 → 保存并返回模型编辑页
    $('#btnSaveScopeAction').addEventListener('click', function () {
      var action = this.dataset.scopeAction;
      $('#modalSaveScope').classList.remove('is-open');
      if (action === 'confirm') {
        state.savedTo = state.scopeChoice;
        go('model-editor');
        toast('打印设置已保存');
      }
      // action === 'cancel'：关闭弹窗，停留在打印设置页
    });

    // 弹窗右上角关闭 → 返回打印设置页
    $('#btnSaveScopeClose').addEventListener('click', function () {
      $('#modalSaveScope').classList.remove('is-open');
    });
    $$('[data-opt="mode"]').forEach(function (b) {
      b.addEventListener('click', function () { state.params.mode = b.dataset.value; refreshSettingsUI(); });
    });
    $$('[data-opt="base"]').forEach(function (b) {
      b.addEventListener('click', function () { state.params.base = b.dataset.value; refreshSettingsUI(); });
    });
    $$('[data-opt="supportType"]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!supportEnabled()) return;
        state.params.support.type = b.dataset.value;   // 关闭时保留上次选择
        state.params.support.userModified = true;
        refreshSettingsUI();
      });
    });
    $('#toggleSupport').addEventListener('click', function () {
      var on = supportEnabled();
      state.params.support.enabled = !on;
      state.params.support.userModified = true;
      refreshSettingsUI();
    });
    $$('[data-step="temp"]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.params.temp = clamp(state.params.temp + Number(b.dataset.delta), 150, 300);
        refreshSettingsUI();
      });
    });
    $('#infillSlider').addEventListener('input', function () {
      state.params.infill = Number(this.value);
      refreshSettingsUI();
    });
    $('#btnRestoreDefault').addEventListener('click', function () {
      $('#modalRestoreDefault').classList.add('is-open');
    });
    $('#btnConfirmRestore').addEventListener('click', function () {
      state.params.mode = 'standard';
      state.params.base = 'with';
      state.params.temp = 220;
      state.params.infill = 15;
      state.params.support.enabled = false;
      state.params.support.type = 'tree';
      state.params.support.userModified = false;   // 支撑重新走一次模型自动推荐
      $('#modalRestoreDefault').classList.remove('is-open');
      refreshSettingsUI();
      toast('已恢复默认打印参数，支撑已按模型重新推荐');
    });

    // 保存范围：列表选中 → 底部「确定」（旧的顶部「保存」入口已删除）
    $$('[data-close-modal]').forEach(function (b) {
      b.addEventListener('click', function () {
        b.closest('.modal').classList.remove('is-open');
      });
    });

    // 准备打印页
    $('#btnPrepareBack').addEventListener('click', function () { go('model-editor'); });
    $('#toggleTimelapse').addEventListener('click', function () {
      state.timelapse = !state.timelapse;
      this.setAttribute('aria-checked', state.timelapse ? 'true' : 'false');
    });
    $('#btnStartPrint').addEventListener('click', function () {
      toast('原型演示：开始打印后的流程不在本次范围内');
    });

    // 保存切片：命名 → 进度 → 成功
    $('#btnSaveSlice').addEventListener('click', openSaveName);
    $('#saveNameInput').addEventListener('input', function () {
      state.saveNameTouched = true;
      syncSaveNameUI();
    });
    $('#saveNameInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !$('#btnSaveNameOk').disabled) startSaving();
    });
    $('#btnSaveNameOk').addEventListener('click', startSaving);
    $('#btnSaveDoneView').addEventListener('click', function () {
      $('#modalSaveDone').classList.remove('is-open');
      toast('原型演示：跳转「我的 - 我的切片」不在本次范围内');
    });
    $$('[data-toast]').forEach(function (b) {
      b.addEventListener('click', function () { toast(b.dataset.toast); });
    });

    // 切片失败页
    $('#btnFailBack').addEventListener('click', function () { go('model-editor'); });
    $('#btnFailToEditor').addEventListener('click', function () { go('model-editor'); });
    $('#btnFailRetry').addEventListener('click', function () { go('model-editor'); setTimeout(runSlice, 260); });

    // 视角缩放
    $('#zoomIn').addEventListener('click', function () { zoomBy(0.85); });
    $('#zoomOut').addEventListener('click', function () { zoomBy(1.18); });
    $('#zoomReset').addEventListener('click', resetView);

    // 删除最后一个零件 → 确认后执行
    $('#btnConfirmDeleteLast').addEventListener('click', function () {
      $('#modalDeleteLast').classList.remove('is-open');
      if (!state.selectedId) return;
      var plate = currentPlate();
      var idx = -1;
      plate.models.forEach(function (m, i) { if (m.id === state.selectedId) idx = i; });
      if (idx >= 0) performDelete(plate, idx);
    });

    // 准备打印页：切换打印机
    $('#ppSwitch').addEventListener('click', function () {
      toast('原型演示：切换打印机不在本次范围内');
    });

    // 演示控制台
    $$('[data-demo-plates]').forEach(function (b) {
      b.addEventListener('click', function () {
        var n = Number(b.dataset.demoPlates);
        buildDemo(n);
        state.outOfBounds = false; state.collision = false;
        $('#demoOutOfBounds').checked = false;
        $('#demoCollision').checked = false;
        $$('[data-demo-plates], [data-demo-opt]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
        buildPlateMeshes(currentPlate());
        refreshEditorUI();
        toast('已切换演示数据：' + n + ' 盘');
      });
    });
    $('#demoSliceFail').addEventListener('change', function () {
      state.sliceFail = this.checked;
      toast(this.checked ? '已开启：下次「去打印」将返回切片失败' : '已关闭切片失败演示');
    });
    $('#demoOutOfBounds').addEventListener('change', function () {
      state.outOfBounds = this.checked;
      if (this.checked) {
        // 放大到超出打印空间，并跳过自动摆盘以便肉眼可见越界
        state.plates.forEach(function (p) {
          var n = p.models.length;
          p.models.forEach(function (m, i) {
            m.sx = m.sy = m.sz = 2.2;
            var w = BASE.x * m.sx;
            m.x = n > 1 ? (i - (n - 1) / 2) * (w + 20) : 0;
            m.y = 0;
          });
        });
      } else {
        state.plates.forEach(function (p) { pack(p); });
      }
      buildPlateMeshes(currentPlate());
      refreshEditorUI();
    });
    $('#demoCollision').addEventListener('change', function () {
      state.collision = this.checked;
      var p = currentPlate();
      if (this.checked) {
        while (p.models.length < 2) {
          p.models.push({ id: nextId(), sx: 1, sy: 1, sz: 1, x: 0, y: 0 });
        }
        pack(p);
        // 人为制造重叠
        p.models[1].x = p.models[0].x + 12;
        p.models[1].y = p.models[0].y + 6;
      } else {
        pack(p);
      }
      state.selectedId = null;
      buildPlateMeshes(p);
      refreshEditorUI();
    });
    // 自动摆盘优化演示分支
    var optBtn = $('[data-demo-opt]');
    optBtn.addEventListener('click', function () {
      buildOptimizedDemo();
      $$('[data-demo-plates], [data-demo-opt]').forEach(function (x) { x.classList.toggle('is-on', x === optBtn); });
      $('#demoSliceFail').checked = false;
      $('#demoOutOfBounds').checked = false;
      $('#demoCollision').checked = false;
      buildPlateMeshes(currentPlate());
      refreshEditorUI();
      go('model-editor');
      maybeToastOptimized();
    });

    $$('[data-demo-goto]').forEach(function (b) {
      b.addEventListener('click', function () { go(b.dataset.demoGoto); });
    });
    var resetBtn = $('[data-demo-reset]');
    resetBtn.addEventListener('click', function () { hardReset(); });
    resetBtn.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') hardReset(); });

    function hardReset() {
      state.params = {
        mode: 'standard', base: 'with', temp: 220, infill: 15,
        support: { enabled: true, type: 'tree', userModified: false }
      };
      state.timelapse = true;
      state.sliceFail = false; state.outOfBounds = false; state.collision = false;
      state.applyAll = false;
      $('#toggleApplyAll').setAttribute('aria-checked', 'false');
      state.savedTo = null; state.lastSlice = null;
      state.scopeChoice = null; state.paramsSnapshot = null; syncSaveScopeUI();
      state.optInfo = null; state.optToastShown = false;
      abortSaving();
      state.saveProgress = 0; state.saveNameTouched = false; state.savedSliceName = null;
      $('#saveNameInput').value = '';
      $('#modalSaveDone').classList.remove('is-open');
      $('#modalSaveName').classList.remove('is-open');
      $('#demoSliceFail').checked = false;
      $('#demoOutOfBounds').checked = false;
      $('#demoCollision').checked = false;
      $('#toggleTimelapse').setAttribute('aria-checked', 'true');
      buildDemo(1);
      $$('[data-demo-plates]').forEach(function (x) { x.classList.toggle('is-on', x.dataset.demoPlates === '1'); });
      buildPlateMeshes(currentPlate());
      refreshSettingsUI();
      refreshEditorUI();
      toast('演示数据已重置');
    }

    window.addEventListener('resize', function () { glSize = { w: 0, h: 0 }; });
  }

  function showSizeHint(text) {
    $('#sizeHint').hidden = false;
    $('#sizeHintText').textContent = text;
  }

  /* ============================ 调试句柄（供自动化验证 / 评审时手动调用） ============================ */

  window.__R001 = {
    state: state,
    BASE: BASE,
    BUILD: BUILD,
    go: go,
    demo: buildDemo,
    demoOptimized: buildOptimizedDemo,
    maybeToastOptimized: maybeToastOptimized,
    rebuild: function () { buildPlateMeshes(currentPlate()); refreshEditorUI(); },
    currentPlate: currentPlate,
    findModel: findModel,
    totalModels: totalModels,
    validatePlate: validatePlate,
    supportEnabled: supportEnabled,
    blockReason: blockReason,
    activeParams: activeParams,
    estimates: estimates,
    selectModel: selectModel,
    setPercent: setPercent,
    setAxis: setAxis,
    copy: doCopy,
    remove: doDelete,
    performDelete: performDelete,
    openScaleSheet: openScaleSheet,
    closeScaleSheet: closeScaleSheet,
    isScaleOpen: isScaleOpen,
    runSlice: runSlice,
    renderPreparePage: renderPreparePage,
    openSaveScope: openSaveScope,
    syncSaveScopeUI: syncSaveScopeUI,
    snapshotParams: snapshotParams,
    paramsChanged: paramsChanged,
    openSaveName: openSaveName,
    startSaving: startSaving,
    finishSaving: finishSaving,
    abortSaving: abortSaving,
    refreshEditorUI: refreshEditorUI,
    refreshSettingsUI: refreshSettingsUI,
    meshCount: function () { return meshIndex.length; },
    zoomBy: zoomBy,
    resetView: resetView,
    diag: function () {
      return {
        meshCount: meshIndex.length,
        orbit: { az: +orbit.az.toFixed(3), el: +orbit.el.toFixed(3), dist: orbit.dist }
      };
    },
    orbit: orbit
  };

  /* ============================ 启动 ============================ */

  function boot() {
    buildDemo(1);
    initScene();
    initControls();
    bind();
    // 生成当前盘的模型网格（共享同一份 STL 几何体，仅变换与材质不同）
    buildPlateMeshes(currentPlate());
    refreshSettingsUI();
    applyHash();
    refreshEditorUI();
    requestAnimationFrame(renderLoop);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
