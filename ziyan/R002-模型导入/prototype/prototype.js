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
    saving: false,
    saveProgress: 0,
    saveNameTouched: false,
    savedSliceName: null,

    /* ---------------- R002 模型导入 ---------------- */
    editorEntry: 'creative-space',     // 'creative-space' | 'model-detail'（决定返回落点，DEC-038）
    taskEmpty: true,                   // 编辑页空态（尚未导入任何模型）
    importTab: 'ai-creation',          // 'ai-creation' | 'my-slice'
    importMode: 'normal',              // 'normal' | 'offline'
    pickerSelected: [],                // 已选文件名
    pendingFiles: [],                  // 待导入清单（用于「重试」）
    importing: false,
    importProgress: 0,
    importTotalBytes: 0,
    offlineBanner: false,
    offlineAskShown: false,            // 自动弹窗每次登录会话只弹一次（BR-027）
    offlineBind: 'bound'               // 'bound'|'unbound'|'invalid'|'guest'|'expired'
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
    var counts = demoCounts(n);
    var sup = demoSup(n);
    for (var i = 0; i < n; i++) {
      // 每盘独立盘名（BR-035）：演示数据统一用演示模型名
      var plate = { name: '电击小子_3D浮雕', supportNeeded: sup[i], models: [] };
      for (var k = 0; k < counts[i]; k++) {
        plate.models.push({ id: nextId(), sx: 1, sy: 1, sz: 1, x: 0, y: 0 });
      }
      pack(plate);
      state.plates.push(plate);
    }
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
      b.className = 'plate-chip plate-chip--named' + (i === state.currentPlate ? ' is-sel' : '') + (v.ok ? '' : ' is-bad');
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', i === state.currentPlate ? 'true' : 'false');
      // 盘号 + 盘名（BR-035：多文件导入后各盘命名不同，需能一眼看出对应关系）
      b.innerHTML = '<span class="plate-chip__no">' + (i + 1) + '</span>' +
        '<span class="plate-chip__nm">' + (p.name || '未命名') + '</span>';
      b.title = '盘 ' + (i + 1) + ' · ' + (p.name || '未命名');
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
    // 每盘独立命名（BR-035）：标题显示「当前盘的模型名 · 总盘数盘」
    var curName = (p && p.name) ? p.name : (state.taskName || '未命名模型');
    if (state.taskEmpty) {
      nameEl.innerHTML = '新的打印任务 <span class="ed-title__plates">· 空</span>';
    } else {
      nameEl.innerHTML = curName + ' <span class="ed-title__plates">· ' + n + '盘</span>';
    }

    /* ---- R002 空态与「添加」按钮 ---- */
    var emptyEl = $('#edEmpty');
    if (emptyEl) emptyEl.hidden = !state.taskEmpty;
    var addRow = $('#edAddRow');
    if (addRow) addRow.hidden = state.taskEmpty;

    var info = $('#hudPlateInfo');
    if (info) {
      info.hidden = state.taskEmpty;
      if (p && !state.taskEmpty) info.textContent = '盘 ' + (state.currentPlate + 1) + ' · ' + p.models.length + ' 个零件';
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
        '<div class="pp-plate__name">' + (p.name || '未命名模型') + ' · 盘' + (i + 1) + '</div>' +
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

  /* ==========================================================================
     R002 模型导入 —— 数据 / 校验 / 自动分盘 / 无网链路
     ========================================================================== */

  /* ---------- 常量（BR-021 / BR-022） ---------- */
  var SUPPORTED_EXT = ['stl', '3mf', 'obj', 'gcode', 'stp', 'zip'];
  var MAX_FILE_MB = 100;      // ① 单文件体积上限
  var MAX_TRI = 1000000;      // ② 三角面上限（压缩后判定）
  var MAX_FILES = 20;         // ③ 单次文件数上限
  var MAX_TOTAL_MB = 300;     // ③ 批量总量上限
  var PLATE_CAP = 8;          // 打印盘上限（GL-001 / BR-009）

  var COMPRESS_STRATEGY = {
    'stl': '转换为二进制格式（无损），必要时执行网格简化',
    'obj': '网格简化并优化冗余几何数据，默认保留材质及纹理引用',
    '3mf': '优先无损重打包，仍超限时执行网格简化',
    'gcode': '仅支持经兼容性验证的无损压缩（不修改坐标精度、挤出量及运动指令）',
    'stp': '将 CAD 曲面离散化为三角网格（默认弦高公差 0.05mm，必要时 0.10mm）',
    'zip': '安全解压后对内部文件分别执行对应格式策略'
  };

  var EXT_COLOR = {
    stl: '#5f74e8', '3mf': '#22a06b', obj: '#f59e0b', gcode: '#0891b2',
    stp: '#8b5cf6', zip: '#64748b', other: '#94a3b8'
  };

  /* ---------- 演示数据：我的 AI 创作（来源「我的」页面保存记录，BR-025） ---------- */
  var AI_CREATIONS = [
    { name: '电击小子_3D浮雕', glyph: '电', bg: 'linear-gradient(150deg,#9fb0ff,#5f74e8)' },
    { name: '恐龙小夜灯', glyph: '恐', bg: 'linear-gradient(150deg,#86dcae,#22a06b)' },
    { name: '卡通笔筒', glyph: '笔', bg: 'linear-gradient(150deg,#ffd08a,#f59e0b)' },
    { name: '齿轮联轴器', glyph: '齿', bg: 'linear-gradient(150deg,#aeb9cd,#64748b)' },
    { name: '星球存钱罐', glyph: '星', bg: 'linear-gradient(150deg,#cdb0ff,#8b5cf6)' },
    { name: '猫咪钥匙扣', glyph: '猫', bg: 'linear-gradient(150deg,#ffa89b,#ef4444)' },
    { name: '六棱花瓶', glyph: '花', bg: 'linear-gradient(150deg,#7ed8ec,#0891b2)' },
    { name: '机械臂关节', glyph: '臂', bg: 'linear-gradient(150deg,#f5b0dd,#db2777)' }
  ];

  /* ---------- 演示数据：我的切片（来源 R001 保存切片链路，DEC-024 / DEC-031） ---------- */
  var MY_SLICES = [
    { name: '电击小子_3D浮雕', glyph: '电', bg: 'linear-gradient(150deg,#9fb0ff,#5f74e8)' },
    { name: '恐龙小夜灯', glyph: '恐', bg: 'linear-gradient(150deg,#86dcae,#22a06b)' },
    { name: '卡通笔筒', glyph: '笔', bg: 'linear-gradient(150deg,#ffd08a,#f59e0b)' },
    { name: '齿轮联轴器', glyph: '齿', bg: 'linear-gradient(150deg,#aeb9cd,#64748b)' },
    { name: '星球存钱罐', glyph: '星', bg: 'linear-gradient(150deg,#cdb0ff,#8b5cf6)' },
    { name: '猫咪钥匙扣', glyph: '猫', bg: 'linear-gradient(150deg,#ffa89b,#ef4444)' }
  ];

  /* ---------- 演示数据：模拟手机系统文件目录 ---------- */
  var PHONE_FILES = [
    { name: '电击小子_3D浮雕.stl', mb: 4.2, tri: 79916, date: '今天 09:41', place: 'Download' },
    { name: '恐龙小夜灯.3mf', mb: 12.6, tri: 246000, date: '今天 09:12', place: 'Download' },
    { name: '卡通笔筒.obj', mb: 28.4, tri: 372000, date: '昨天 21:30', place: 'Download' },
    { name: 'keychain.stl', mb: 2.1, tri: 41200, date: '昨天 20:05', place: 'Download' },
    { name: 'bracket.stp', mb: 15.3, tri: 158000, date: '昨天 18:47', place: 'Documents' },
    { name: 'vase.3mf', mb: 46.5, tri: 604000, date: '09-27 11:20', place: 'Documents' },
    { name: 'batch_plate.gcode', mb: 34.8, tri: 0, date: '09-27 10:02', place: 'Documents' },
    { name: 'nozzle_test.gcode', mb: 12.4, tri: 0, date: '09-26 16:35', place: 'Documents' },
    { name: 'backup_pack.zip', mb: 62.0, tri: 0, date: '09-26 09:18', place: 'Download' },
    { name: 'dragon_statue.stl', mb: 168.4, tri: 1980000, date: '09-25 22:14', place: 'Download', compressible: true },
    { name: 'too_big_model.stl', mb: 240.0, tri: 2680000, date: '09-25 21:02', place: 'Download', compressible: false },
    { name: 'highpoly_bust.stl', mb: 86.4, tri: 1640000, date: '09-24 19:26', place: 'Download', compressible: true },
    { name: 'fake_photo.stl', mb: 1.2, tri: 0, date: '09-24 15:41', place: 'Download', fake: true },
    { name: 'old_printer.gcode', mb: 22.0, tri: 0, date: '09-23 14:08', place: 'Documents', incompatible: true },
    { name: 'robot_arm.fbx', mb: 8.2, tri: 0, date: '09-24 15:40', place: 'Download' }
  ];

  /* ---------- ZIP 内容（BR-025：解压后按实际文件逐个校验） ---------- */
  var ZIP_CONTENTS = {
    'backup_pack.zip': [
      { name: 'mini_dragon.stl', mb: 58.6, tri: 920000, date: '解压', place: 'backup_pack.zip' },
      { name: 'gear.obj', mb: 21.4, tri: 310000, date: '解压', place: 'backup_pack.zip' },
      { name: 'readme.txt', mb: 0.02, tri: 0, date: '解压', place: 'backup_pack.zip' }
    ]
  };

  /* ---------- 工具 ---------- */
  function fileExt(n) {
    var i = String(n).lastIndexOf('.');
    return i < 0 ? '' : String(n).slice(i + 1).toLowerCase();
  }
  function stripExt(n) {
    var i = String(n).lastIndexOf('.');
    return i < 0 ? String(n) : String(n).slice(0, i);
  }
  function byName(n) {
    for (var i = 0; i < PHONE_FILES.length; i++) if (PHONE_FILES[i].name === n) return PHONE_FILES[i];
    return null;
  }
  function fmtMB(mb) { return (mb >= 100 ? mb.toFixed(0) : mb.toFixed(1)) + ' MB'; }
  function extOfColor(e) { return EXT_COLOR[e] || EXT_COLOR.other; }

  /* ---------- 校验（BR-021：格式及安全 → 体积 → 解析 → 面数；gcode 跳过面数） ---------- */
  function validateFile(f) {
    var ext = fileExt(f.name);
    if (SUPPORTED_EXT.indexOf(ext) < 0) return { ok: false, reason: '当前文件格式不支持' };
    if (f.fake) return { ok: false, reason: '文件格式异常，无法识别' };          // 扩展名与实际内容不一致
    if (state.importMode === 'offline' && ext !== 'gcode') return { ok: false, reason: '无网打印仅支持 gcode 文件' };
    if (f.mb > MAX_FILE_MB) return { ok: false, reason: '文件超过 100MB', needOpt: 'size' };
    if (ext !== 'gcode' && f.tri && f.tri > MAX_TRI) return { ok: false, reason: '模型结构过于复杂', needOpt: 'tri' };
    if (f.incompatible) return { ok: false, reason: '当前打印文件与打印机不兼容' }; // gcode 兼容性校验
    return { ok: true };
  }

  /* ---------- 编辑页空态与「添加」 ---------- */
  function setTaskEmpty(v) {
    state.taskEmpty = !!v;
    if (v) {
      state.plates = [];
      state.currentPlate = 0;
      state.selectedId = null;
      state.outOfBounds = false;
      state.collision = false;
      state.taskName = null;
    }
    if (state.taskEmpty) {
      $('#edEmpty').hidden = false;
      $('#edAddRow').hidden = true;
      closeScaleSheetSilent();
    }
    // 显式重建网格：3D 场景不是响应式的，改了 state 必须重建，否则会看到上一次的残留（LL-010）
    if (state.taskEmpty) buildPlateMeshes(null);          // 仅清空零件，保留打印空间框与网格（BR-039）
    else if (state.plates.length) buildPlateMeshes(currentPlate());
    refreshEditorUI();
  }

  /* ---------- 导入选择弹窗 ---------- */
  function isImportSheetOpen() { return $('#importSheet').classList.contains('is-open'); }

  function openImportSheet() {
    setImportTab(state.importTab || 'ai-creation');
    $('#importScrim').classList.add('is-open');
    $('#importSheet').classList.add('is-open');
  }
  function closeImportSheet() {
    $('#importScrim').classList.remove('is-open');
    $('#importSheet').classList.remove('is-open');
  }
  function closeImportSheetSilent() {
    $('#importScrim').classList.remove('is-open');
    $('#importSheet').classList.remove('is-open');
  }
  function toggleImportSheet() { if (isImportSheetOpen()) closeImportSheet(); else openImportSheet(); }

  function setImportTab(tab) {
    state.importTab = (tab === 'my-slice') ? 'my-slice' : 'ai-creation';
    $$('[data-import-tab]').forEach(function (b) {
      var on = b.dataset.importTab === state.importTab;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    $('#importGridAI').hidden = state.importTab !== 'ai-creation';
    $('#importGridSlice').hidden = state.importTab !== 'my-slice';
  }

  function importCardHTML(item, kind) {
    return '<button class="import-card" type="button" role="listitem" data-import-card="' + kind + '" data-name="' + item.name + '">' +
      '<span class="import-card__thumb" style="background:' + item.bg + '">' + item.glyph + '</span>' +
      '<span class="import-card__name">' + item.name + '</span>' +
      '</button>';
  }

  function renderImportGrids() {
    $('#importGridAI').innerHTML = AI_CREATIONS.length
      ? AI_CREATIONS.map(function (x) { return importCardHTML(x, 'ai'); }).join('')
      : '<div class="import-grid__empty">还没有 AI 创作内容，<br>去创作或导入本地模型吧</div>';
    $('#importGridSlice').innerHTML = MY_SLICES.length
      ? MY_SLICES.map(function (x) { return importCardHTML(x, 'slice'); }).join('')
      : '<div class="import-grid__empty">还没有保存的切片，<br>在「准备打印页」点「保存」即可留在这里</div>';
    $$('[data-import-card]').forEach(function (b) {
      b.addEventListener('click', function () { pickFromLibrary(b.dataset.name, b.dataset.importCard); });
    });
  }

  /** 「我的 AI 创作 / 我的切片」点选即直接导入（BR-028 / DEC-034） */
  function pickFromLibrary(name, kind) {
    closeImportSheet();
    var src = kind === 'slice' ? '我的切片' : '我的 AI 创作';
    var f = byName(name + '.stl') || { name: name + '.stl', mb: 6.4, tri: 90000 };
    state.importCtx = { pass: [f], fail: [], dropped: 0, src: src, solo: true };
    state.optimizeQueue = [];
    state.pendingFiles = [f.name];
    finishImportPlan();
  }

  /* ---------- 手机系统文件目录（模拟） ---------- */
  function openPicker(mode, navigate) {
    state.importMode = (mode === 'offline') ? 'offline' : 'normal';
    state.pickerSelected = [];
    var offline = state.importMode === 'offline';
    $('#pickerTitle').textContent = offline ? '无网打印 · 选择文件' : '最近文件';
    $('#btnPickerConfirm').textContent = offline ? '打印' : '导入';   // BR-061：无网不支持云切片/模型编辑 → 直打
    var hint = $('#pickerHint');
    hint.classList.toggle('picker-hint--offline', offline);
    $('#pickerHintText').textContent = offline
      ? '无网打印仅支持 gcode 文件，单文件 ≤ 100MB（其他格式将无法选择）'
      : '支持 stl / 3mf / obj / gcode / stp / zip，单文件 ≤ 100MB，可多选';
    renderPicker();
    syncPickerFoot();
    // 无网模式落到专用锚点，保证深链语义与「正常模式」互不污染
    if (navigate !== false) go(state.importMode === 'offline' ? 'offline-picker' : 'system-picker');
  }

  function renderPicker() {
    var offline = state.importMode === 'offline';
    var places = [], seen = {};
    PHONE_FILES.forEach(function (f) { if (!seen[f.place]) { seen[f.place] = 1; places.push(f.place); } });
    var html = '';
    places.forEach(function (pl) {
      html += '<div class="picker-group">' + pl + '</div>';
      PHONE_FILES.filter(function (f) { return f.place === pl; }).forEach(function (f) {
        var ext = fileExt(f.name);
        var locked = offline && ext !== 'gcode';
        var on = state.pickerSelected.indexOf(f.name) >= 0;
        html += '<button class="picker-item' + (locked ? ' is-locked' : '') + (on ? ' is-on' : '') + '" type="button" ' +
          'role="option" aria-selected="' + (on ? 'true' : 'false') + '" data-file="' + f.name + '">' +
          '<span class="picker-item__check" aria-hidden="true"></span>' +
          '<span class="picker-item__icon" style="background:' + extOfColor(ext) + '">' + (ext || '?').toUpperCase() + '</span>' +
          '<span class="picker-item__main">' +
            '<span class="picker-item__name">' + f.name +
              (locked ? '<span class="picker-item__tag">无网不支持</span>' : '') +
              (f.mb > MAX_FILE_MB ? '<span class="picker-item__tag">超 100MB</span>' : '') +
            '</span>' +
            '<span class="picker-item__meta">' + fmtMB(f.mb) + ' · ' + f.date + '</span>' +
          '</span>' +
          '</button>';
      });
    });
    $('#pickerList').innerHTML = html;
    $$('[data-file]').forEach(function (b) {
      b.addEventListener('click', function () { togglePickerItem(b.dataset.file); });
    });
  }

  function togglePickerItem(name) {
    var f = byName(name);
    if (!f) return;
    if (state.importMode === 'offline' && fileExt(name) !== 'gcode') {
      toast('无网打印仅支持 gcode 文件');
      return;
    }
    var i = state.pickerSelected.indexOf(name);
    if (i >= 0) state.pickerSelected.splice(i, 1);
    else state.pickerSelected.push(name);
    var el = $('[data-file="' + name + '"]');
    if (el) {
      var on = state.pickerSelected.indexOf(name) >= 0;
      el.classList.toggle('is-on', on);
      el.setAttribute('aria-selected', on ? 'true' : 'false');
    }
    syncPickerFoot();
  }

  function syncPickerFoot() {
    var sel = state.pickerSelected;
    var totalMb = sel.reduce(function (s, n) { var f = byName(n); return s + (f ? f.mb : 0); }, 0);
    $('#pickerCount').textContent = String(sel.length);
    $('#btnPickerConfirm').disabled = sel.length === 0;
    var hint = '';
    if (sel.length > MAX_FILES) hint = '单次最多 ' + MAX_FILES + ' 个文件，超出上限将无法导入';
    else if (totalMb > MAX_TOTAL_MB) hint = '单次总量上限 ' + MAX_TOTAL_MB + 'MB（按优化后计），超出将无法导入';
    $('#pickerFootHint').textContent = hint;
  }

  function togglePickerAll() {
    var offline = state.importMode === 'offline';
    var pool = PHONE_FILES.filter(function (f) { return !(offline && fileExt(f.name) !== 'gcode'); });
    if (state.pickerSelected.length === pool.length) state.pickerSelected = [];
    else state.pickerSelected = pool.map(function (f) { return f.name; });
    renderPicker();
    syncPickerFoot();
  }

  /* ---------- 校验管线（BR-021 ~ BR-026，DEC-066） ----------
     文件选择 → 格式及安全校验 → 单文件体积校验 → 文件解析 → 三角面校验
     → 必要的自动优化 → 优化结果复核 → 批量数量及总量校验 → 导入打印盘 */
  function confirmPicker() {
    var sel = state.pickerSelected.slice();
    if (!sel.length) return;
    var files = sel.map(byName).filter(Boolean);
    var solo = files.length === 1;      // 单文件场景：失败用专门的异常提示弹窗

    var ctx = { pass: [], fail: [], dropped: 0, src: '本地文件', solo: solo };
    var review = [];                    // 进入体积/面数校验的文件（含 ZIP 解压产物）

    // ① 格式及安全校验（扩展名 + 实际内容；ZIP 解压后逐个校验）
    files.forEach(function (f) {
      var ext = fileExt(f.name);
      if (SUPPORTED_EXT.indexOf(ext) < 0) { ctx.fail.push({ name: f.name, why: '当前文件格式不支持' }); return; }
      if (f.fake) { ctx.fail.push({ name: f.name, why: '文件格式异常，无法识别' }); return; }
      if (state.importMode === 'offline' && ext !== 'gcode') { ctx.fail.push({ name: f.name, why: '无网打印仅支持 gcode 文件' }); return; }
      if (ext === 'zip') {
        (ZIP_CONTENTS[f.name] || []).forEach(function (inner) {
          var ie = fileExt(inner.name);
          if (SUPPORTED_EXT.indexOf(ie) < 0) { ctx.fail.push({ name: inner.name, why: '当前文件格式不支持' }); return; }
          review.push(inner);
        });
        return;
      }
      review.push(f);
    });

    // ② 单文件体积校验 → ③ 文件解析 + 三角面校验（gcode 跳过面数；gcode 做兼容性校验）
    var needOpt = [];
    review.forEach(function (f) {
      var ext = fileExt(f.name);
      if (f.mb > MAX_FILE_MB) {
        // 超 100MB：优先判断是否支持自动优化，不直接丢弃（BR-021）；不支持优化 → 直接拒绝（BR-023）
        if (f.compressible === false) { ctx.fail.push({ name: f.name, why: '文件过大，无法继续导入' }); ctx.noopt = true; return; }
        needOpt.push({ f: f, why: 'size' });
        return;
      }
      if (ext !== 'gcode' && f.tri && f.tri > MAX_TRI) { needOpt.push({ f: f, why: 'tri' }); return; } // 未超 100MB 但面数超限：仍触发简化
      if (f.incompatible) { ctx.fail.push({ name: f.name, why: '当前打印文件与打印机不兼容' }); return; }
      ctx.pass.push(f);
    });

    state.importCtx = ctx;
    state.optimizeQueue = needOpt;

    // ④ 需优化文件汇总确认（不逐个弹窗，BR-023）
    if (needOpt.length) { openOptimizeSheet(); return; }

    // 单文件失败 → 专门的异常提示弹窗（BR-023：不支持优化 → 「暂不支持自动优化」）
    if (solo && !ctx.pass.length && ctx.fail.length) {
      if (ctx.noopt) showError('文件过大，暂不支持自动优化，请重新选择模型。');
      else showError(ctx.fail[0].why);
      return;
    }
    // ⑤ 批量数量及总量校验（在自动优化之后，BR-026）
    proceedBatch();
  }

  /* ---------- 汇总优化确认弹窗（BR-023：单文件按触发原因切标题，多文件「共 N 个文件需要优化」） ---------- */
  function openOptimizeSheet() {
    var q = state.optimizeQueue || [];
    var ctx = state.importCtx || { fail: [] };
    var title = $('#compressTitle');
    var desc = $('#compressDesc');
    var list = $('#compressList');
    var step = $('#compressStep');

    if (q.length === 1) {
      var it = q[0];
      if (it.why === 'size') {
        title.textContent = '文件超过100MB';
        desc.textContent = '当前文件：' + it.f.name + '（' + fmtMB(it.f.mb) + '）。可尝试自动优化后导入，优化可能导致模型部分细节发生变化。';
      } else {
        title.textContent = '模型结构过于复杂';
        desc.textContent = '当前模型包含 ' + fmtTri(it.f.tri) + ' 个三角面，超过100万个三角面的导入限制。可尝试简化模型，但可能损失部分细节。';
      }
      list.hidden = true;
      step.textContent = '';
      $('#compressStrategy').textContent = COMPRESS_STRATEGY[fileExt(it.f.name)] || '减少三角面数量';
      $('#btnDoCompress').textContent = it.why === 'tri' ? '简化模型' : '自动优化';   // BR-023：面数超限按钮 =「简化模型」
    } else {
      title.textContent = '共 ' + q.length + ' 个文件需要优化';
      desc.textContent = '以下文件超出单文件限制，优化可能导致模型部分细节发生变化。统一确认后依次处理。';
      var rows = '';
      q.forEach(function (it) {
        rows += '<div class="import-res__row import-res__row--bad"><span class="import-res__mark">!</span>' +
          '<span class="import-res__name">' + it.f.name + '（' + fmtMB(it.f.mb) + (it.why === 'tri' ? ' · ' + fmtTri(it.f.tri) + ' 面' : '') + '）' +
          '<span class="import-res__why">' + (it.why === 'size' ? '超过 100MB' : '三角面超过 100 万') + '</span></span></div>';
      });
      list.innerHTML = rows;
      list.hidden = false;
      step.textContent = '每个文件独立记录优化结果，单个文件失败不会中断其余文件。';
      $('#btnDoCompress').textContent = '自动优化';
      $('#compressStrategy').textContent = '按文件类型分别执行：无损转换优先，必要时网格简化（偏差 ≤0.05mm）';
    }
    $('#modalCompress').classList.add('is-open');
  }

  function fmtTri(n) {
    return n >= 10000 ? Math.round(n / 10000) + ' 万' : String(n);
  }

  /* ---------- 逐个优化（进度「正在优化第 i / N 个文件」，BR-023） ---------- */
  var optimizeTimer = null;
  function runOptimize() {
    $('#modalCompress').classList.remove('is-open');
    var q = state.optimizeQueue || [];
    if (!q.length) { proceedBatch(); return; }
    $('#optimizeProgressFile').textContent = q[0].f.name;
    $('#optimizeProgressStep').textContent = '正在优化第 1 / ' + q.length + ' 个文件';
    $('#optimizeProgressBar').style.width = '0%';
    $('#modalOptimizeProgress').classList.add('is-open');
    if (optimizeTimer) { clearInterval(optimizeTimer); optimizeTimer = null; }
    var pct = 0;
    optimizeTimer = setInterval(function () {
      pct = Math.min(100, pct + 12 + Math.random() * 14);
      $('#optimizeProgressBar').style.width = pct + '%';
      if (pct >= 100) {
        clearInterval(optimizeTimer); optimizeTimer = null;
        settleOptimize(q[0]);
        state.optimizeQueue = q.slice(1);
        if (state.optimizeQueue.length) {
          setTimeout(runOptimize, 260);   // 下一个文件（第 i / N 由队列长度推导）
        } else {
          setTimeout(function () { $('#modalOptimizeProgress').classList.remove('is-open'); proceedBatch(); }, 260);
        }
      }
    }, 120);
  }

  /** 单个文件优化结果结算 + 复核（BR-024：体积/面数/几何偏差/完整性） */
  function settleOptimize(it) {
    var ctx = state.importCtx || { pass: [], fail: [], dropped: 0 };
    var f = it.f;
    var ext = fileExt(f.name);

    if (it.why === 'size' && f.compressible === false) {
      ctx.fail.push({ name: f.name, why: '文件过大，无法继续导入' });       // 不支持优化
      return;
    }
    if (f.optFail) { ctx.fail.push({ name: f.name, why: '模型优化失败，请尝试其他模型' }); return; }
    if (f.devFail) { ctx.fail.push({ name: f.name, why: '模型优化可能影响打印效果，无法继续导入' }); return; }
    if (f.parseFail) { ctx.fail.push({ name: f.name, why: '模型文件异常，无法解析' }); return; }

    // 原型：优化按约 42% 折算体积与面数
    var after = Math.round(f.mb * 42) / 100;
    var afterTri = Math.floor((f.tri || 0) * 0.42);
    // 复核
    if (after > MAX_FILE_MB) { ctx.fail.push({ name: f.name, why: '文件过大，无法继续导入' }); return; }
    if (ext !== 'gcode' && afterTri > MAX_TRI) { ctx.fail.push({ name: f.name, why: '模型结构过于复杂，无法继续导入' }); return; }
    if (f.incompatible) { ctx.fail.push({ name: f.name, why: '当前打印文件与打印机不兼容' }); return; }
    ctx.pass.push({ name: f.name, mb: after, tri: afterTri, compressed: true });
  }

  /* ---------- 批量数量及总量校验（BR-026：阻止写入而非丢弃） ---------- */
  function proceedBatch() {
    var ctx = state.importCtx || { pass: [], fail: [], dropped: 0 };
    var count = ctx.pass.length;
    var total = ctx.pass.reduce(function (s, f) { return s + f.mb; }, 0);
    if (count > MAX_FILES) {
      $('#batchLimitTitle').textContent = '文件数量超过上限';
      $('#batchLimitDesc').textContent = '当前已选 ' + count + ' 个有效文件，超过单次 20 个的上限。请返回文件列表移除部分文件后重试。';
      $('#modalBatchLimit').classList.add('is-open');
      return;
    }
    if (total > MAX_TOTAL_MB) {
      $('#batchLimitTitle').textContent = '文件总大小超过300MB';
      $('#batchLimitDesc').textContent = '当前已选 ' + count + ' 个有效文件，优化后总量 ' + Math.round(total) + 'MB，超过单次 300MB 上限。请返回文件列表移除部分文件后重试。';
      $('#modalBatchLimit').classList.add('is-open');
      return;
    }
    finishImportPlan();
  }

  /** 单文件场景的异常提示弹窗（BR-026：失败后返回文件选择） */
  function showError(why) {
    $('#errTitle').textContent = '无法导入';
    $('#tooLargeDesc').textContent = /请重新选择/.test(why) ? why : why + ' 请重新选择文件。';
    $('#modalTooLarge').classList.add('is-open');
  }

  function finishImportPlan() {
    var ctx = state.importCtx || { pass: [], fail: [], oversize: [], dropped: 0 };
    $$('.modal').forEach(function (m) { m.classList.remove('is-open'); });
    state.pendingFiles = ctx.pass.map(function (f) { return f.name; });
    if (!ctx.pass.length) { openImportResult('failed'); return; }
    // BR-061：无网不支持云切片 → 不做模型编辑，gcode 直接上传打印
    if (state.importMode === 'offline') {
      state.uploadQueue = ctx.pass.map(function (f) { return f.name; });
      state.uploadIdx = 0;
      state.uploadSkipped = ctx.fail.length || 0;
      openUploadProgress(false);
      return;
    }
    openImportProgress(0, ctx.pass.length, false);
  }

  /* ---------- 导入进度 ---------- */
  var importTimer = null;
  function openImportProgress(done, total, freeze) {
    state.importing = true;
    state.importProgress = freeze ? 64 : 0;
    $('#importProgressTitle').textContent = '正在导入模型…';
    $('#importProgressFile').textContent = (state.pendingFiles[0] || 'model.stl');
    $('#importProgressStep').textContent = '1 / ' + total;
    renderImportProgress();
    $('#modalImportProgress').classList.add('is-open');
    if (freeze) return;
    var step = 0;
    if (importTimer) { clearInterval(importTimer); importTimer = null; }
    importTimer = setInterval(function () {
      state.importProgress = Math.min(100, state.importProgress + 5 + Math.random() * 9);
      var frac = state.importProgress / 100;
      step = Math.min(state.pendingFiles.length, Math.floor(frac * state.pendingFiles.length) + 1);
      $('#importProgressFile').textContent = state.pendingFiles[step - 1] || state.pendingFiles[0] || 'model.stl';
      $('#importProgressStep').textContent = step + ' / ' + state.pendingFiles.length;
      renderImportProgress();
      if (state.importProgress >= 100) {
        clearInterval(importTimer); importTimer = null;
        setTimeout(applyImportedPlates, 260);
      }
    }, 110);
  }
  function renderImportProgress() {
    var p = Math.round(state.importProgress);
    $('#importProgressBar').style.width = p + '%';
    $('#importProgressPct').textContent = p + '%';
  }
  function abortImportProgress() {
    if (importTimer) { clearInterval(importTimer); importTimer = null; }
    state.importing = false;
    $('#modalImportProgress').classList.remove('is-open');
  }
  function abortOptimize() {
    if (optimizeTimer) { clearInterval(optimizeTimer); optimizeTimer = null; }
    $('#modalOptimizeProgress').classList.remove('is-open');
    $('#modalCompress').classList.remove('is-open');
  }

  /* ---------- 写入打印盘：追加新盘 + 8 盘上限（BR-031 / BR-026） ---------- */
  function applyImportedPlates() {
    if (importTimer) { clearInterval(importTimer); importTimer = null; }
    state.importing = false;
    $('#modalImportProgress').classList.remove('is-open');

    var ctx = state.importCtx || { pass: [], fail: [], dropped: 0 };

    // 批量总量上限已在 proceedBatch 阻断（BR-026：阻止写入而非丢弃），此处直接使用通过校验的文件
    var exist = state.taskEmpty ? 0 : state.plates.length;
    var free = Math.max(0, PLATE_CAP - exist);
    var added = Math.min(ctx.pass.length, free);
    var overflow = ctx.pass.length - added;

    if (state.taskEmpty) { state.plates = []; state.taskEmpty = false; }
    var firstNew = state.plates.length;
    for (var i = 0; i < added; i++) {
      var src = ctx.pass[i];
      // 每盘独立命名：取各自来源文件的文件名（BR-032 / BR-035 / DEC-040）
      var plate = {
        name: src ? stripExt(src.name) : '未命名模型',
        ext: src ? fileExt(src.name) : '',
        supportNeeded: true,
        models: [{ id: nextId(), sx: 1, sy: 1, sz: 1, x: 0, y: 0 }]
      };
      pack(plate);
      state.plates.push(plate);
    }
    state.currentPlate = state.plates.length ? Math.min(firstNew, state.plates.length - 1) : 0;

    state.taskName = ctx.pass.length ? stripExt(ctx.pass[0].name) : null;
    state.lastImportSummary = {
      ok: added, fail: ctx.fail.length, overflow: overflow, dropped: ctx.dropped || 0, src: ctx.src,
      failList: ctx.fail, okList: ctx.pass.slice(0, added).map(function (f) { return f.name; })
    };

    buildPlateMeshes(currentPlate());
    refreshEditorUI();
    // 导入已完成 → 直接落到编辑页（文件目录是"死路"）；结果弹窗浮在编辑页之上做信息确认
    go('model-editor');

    var bad = ctx.fail.length + overflow + (ctx.dropped || 0);
    if (!bad) {
      // 全部成功 → 不弹结果弹窗，仅 Toast 提示（BR-036）
      toast('已导入 ' + added + ' 个模型，自动分为 ' + added + ' 盘');
      return;
    }
    openImportResult('auto');
  }

  /** 演示用盘名序列（多选导入后每盘命名不同，BR-035） */
  function demoPlateNames() {
    return ['电击小子_3D浮雕', '恐龙小夜灯', '卡通笔筒', 'keychain', 'bracket', 'vase', 'batch_plate', 'dragon_statue'];
  }
  function makeNamedPlates(names) {
    return names.map(function (nm) {
      var pl = { name: nm, supportNeeded: true, models: [{ id: nextId(), sx: 1, sy: 1, sz: 1, x: 0, y: 0 }] };
      pack(pl);
      return pl;
    });
  }

  /* ---------- 导入结果 ---------- */
  function openImportResult(kind) {
    var s = state.lastImportSummary || { ok: 0, fail: 0, overflow: 0, dropped: 0, okList: [], failList: [] };
    if (kind === 'multi') {      // 深链演示：8 个文件 → 8 盘
      setTaskEmpty(false);
      state.plates = makeNamedPlates(demoPlateNames());
      state.currentPlate = 0; state.taskName = '多选导入';
      buildPlateMeshes(currentPlate()); refreshEditorUI();
      s = { ok: PLATE_CAP, fail: 0, overflow: 0, dropped: 0, okList: [], failList: [], src: '本地文件' };
      state.lastImportSummary = s;
    }
    if (kind === 'partial') {    // 深链演示：部分成功
      setTaskEmpty(false);
      state.plates = makeNamedPlates(['电击小子_3D浮雕', '恐龙小夜灯', '卡通笔筒']);
      state.currentPlate = 0; state.taskName = '电击小子_3D浮雕';
      buildPlateMeshes(currentPlate()); refreshEditorUI();
      s = {
        ok: 3, fail: 2, overflow: 0, dropped: 0, src: '本地文件',
        okList: ['电击小子_3D浮雕.stl', '恐龙小夜灯.3mf', '卡通笔筒.obj'],
        failList: [
          { name: 'robot_arm.fbx', why: '当前文件格式不支持' },
          { name: 'too_big_model.stl', why: '文件过大，无法继续导入' }
        ]
      };
    }

    var total = s.ok + s.fail + s.overflow;
    var bad = s.fail + s.overflow + s.dropped;
    var icon = $('#importResIcon');
    var title = $('#importResTitle');
    var desc = $('#importResDesc');

    if (kind === 'failed' || s.ok === 0) {
      icon.className = 'import-modal__icon import-modal__icon--err';
      icon.textContent = '×';
      title.textContent = '导入失败，请重试';
      desc.textContent = '所选文件均未能导入，请检查格式与大小后重新选择。';
    } else if (bad > 0) {
      icon.className = 'import-modal__icon import-modal__icon--warn';
      icon.textContent = '!';
      title.textContent = '部分文件导入成功';
      desc.textContent = '已成功处理 ' + s.ok + ' 个文件，' + bad + ' 个文件导入失败。成功的内容已自动分为 ' + s.ok + ' 盘。';
    } else {
      icon.className = 'import-modal__icon import-modal__icon--ok';
      icon.textContent = '✓';
      title.textContent = '导入完成';
      desc.textContent = '已导入 ' + s.ok + ' 个模型，自动分为 ' + s.ok + ' 盘' + (s.ok > 1 ? '' : '') + '。';
    }

    // 失败项优先展示（最重要信息不被折叠到滚动区下方），成功项紧随其后
    var rows = '';
    (s.failList || []).forEach(function (f) {
      rows += '<div class="import-res__row import-res__row--bad"><span class="import-res__mark">✕</span>' +
        '<span class="import-res__name">' + f.name + '<span class="import-res__why">' + f.why + '</span></span></div>';
    });
    if (s.overflow > 0) {
      rows += '<div class="import-res__row import-res__row--bad"><span class="import-res__mark">✕</span>' +
        '<span class="import-res__name">已达 ' + PLATE_CAP + ' 盘上限，' + s.overflow + ' 个文件未导入' +
        '<span class="import-res__why">打印盘最多 ' + PLATE_CAP + ' 盘</span></span></div>';
    }
    if (s.dropped > 0) {
      rows += '<div class="import-res__row import-res__row--bad"><span class="import-res__mark">✕</span>' +
        '<span class="import-res__name">已达单次批量上限，' + s.dropped + ' 个文件未导入' +
        '<span class="import-res__why">单次最多 ' + MAX_FILES + ' 个文件、总量 ' + MAX_TOTAL_MB + 'MB</span></span></div>';
    }
    (s.okList || []).forEach(function (n) {
      rows += '<div class="import-res__row import-res__row--good"><span class="import-res__mark">✓</span>' +
        '<span class="import-res__name">' + n + '</span></div>';
    });
    var list = $('#importResList');
    list.innerHTML = rows;
    list.hidden = !rows;

    // 有未导入项时提供「重试未导入项」——直接把上次失败的文件回填到文件目录的勾选态
    var retry = $('#btnImportResRetry');
    var retryNames = (s.failList || []).map(function (f) { return f.name; }).filter(function (n) { return !!byName(n); });
    retry.hidden = retryNames.length === 0;
    retry.dataset.names = retryNames.join('|');

    $('#modalImportResult').classList.add('is-open');
  }

  /** 重试未导入项：回到文件目录并预勾选上次失败的文件 */
  function retryFailedFiles() {
    var names = ($('#btnImportResRetry').dataset.names || '').split('|').filter(Boolean);
    $('#modalImportResult').classList.remove('is-open');
    var anchor = state.importMode === 'offline' ? 'offline-picker' : 'system-picker';
    openPicker(state.importMode, false);
    go(anchor);                 // 先切屏（applyHash 内部会重置勾选态）
    state.pickerSelected = names.slice();   // 再回填，避免被重置覆盖
    renderPicker();
    syncPickerFoot();
    if (names.length) setTimeout(function () { toast('已回填 ' + names.length + ' 个未导入的文件，可重新选择'); }, 320);
  }

  /* ---------- 无网链路 ---------- */
  function syncNetBanner() {
    // 准备打印页有自己的顶部无网标签，不再叠全局提醒条（避免两层提示 + 裁切整图页）
    var onPrep = $('#screen-prepare-print').classList.contains('is-active');
    var show = !!state.offlineBanner && !onPrep;
    $('#netBanner').hidden = !show;
    $('.phone').classList.toggle('has-banner', show);
    if (state.offlineBanner) {
      var weak = state.offlineBind === 'weak';
      $('#netBannerText').textContent = weak ? '当前网络信号较弱，部分功能可能不可用' : '当前无网络，部分功能不可用';
    }
    syncPpOfflineTag();
  }

  /** 准备打印页：无网时在顶部显示提示标签并覆盖设计稿烘焙的「准备打印」字样，整页下移 */
  function syncPpOfflineTag() {
    var on = !!state.offlineBanner;
    var tag = $('#ppOfflineTag');
    var sec = $('#screen-prepare-print');
    if (tag) tag.hidden = !on;
    if (sec) sec.classList.toggle('screen--ppoffline', on);
  }

  function setOffline(on) {
    state.offlineBanner = !!on;
    state.offlineAskShown = false;
    syncNetBanner();
    if (on) setTimeout(function () { askOffline(); }, 480);
  }

  /** 自动弹窗每个登录会话只弹一次（BR-027 / DEC-037） */
  function askOffline() {
    if (!state.offlineBanner || state.offlineAskShown) return;
    state.offlineAskShown = true;
    $('#modalOfflineAsk').classList.add('is-open');
  }

  function openOfflineBlock(kind) {
    var t = $('#offlineBlockTitle'), d = $('#offlineBlockDesc'), a = $('#btnOfflineBlockAction');
    var map = {
      unbound: { t: '该打印机尚未与当前账号绑定', d: '无网打印需要打印机与当前账号处于绑定状态，请先联网完成绑定。', a: '去绑定' },
      invalid: { t: '打印机绑定信息已失效', d: '该打印机可能已被解绑或绑定到其他账号，请联网后重新绑定。', a: '联网重新绑定' },
      guest: { t: '请先登录后再进行无网打印', d: '无网打印需要确认使用者身份，请联网登录后重试。', a: '去登录' },
      expired: { t: '建议联网校验绑定状态', d: '本地绑定凭证已超过 30 天未联网校验。可继续使用无网打印，建议联网确认一次。', a: '继续无网打印' }
    };
    var m = map[kind] || map.unbound;
    state.offlineBind = kind;
    t.textContent = m.t;
    d.textContent = m.d;
    a.textContent = m.a;
    $('#modalOfflineBlock').classList.add('is-open');
  }

  var xferTimer = null;
  /** 无网文件传输页（复用 SM-005 任务上传弹窗的视觉与进度交互，DEC-041） */
  function openOfflineTransfer(name, freeze) {
    if (xferTimer) { clearInterval(xferTimer); xferTimer = null; }
    var mb = (byName(name) && byName(name).mb) || 34.8;
    $('#xferName').textContent = name;
    var p = freeze ? 62 : 0;
    var el = $('#xferBar');
    el.style.width = p + '%';
    $('#xferPct').textContent = Math.round(p) + '%';
    $('#xferBytes').textContent = (mb * p / 100).toFixed(1) + ' MB / ' + mb.toFixed(1) + ' MB';
    if (freeze) return;
    xferTimer = setInterval(function () {
      p = Math.min(100, p + 3 + Math.random() * 6);
      el.style.width = p + '%';
      $('#xferPct').textContent = Math.round(p) + '%';
      $('#xferBytes').textContent = (mb * p / 100).toFixed(1) + ' MB / ' + mb.toFixed(1) + ' MB';
      if (p >= 100) {
        clearInterval(xferTimer); xferTimer = null;
        setTimeout(function () {
          toast('传输完成，已进入模型编辑');
          setTaskEmpty(false);
          state.plates = makeNamedPlates([stripExt(name)]);
          state.currentPlate = 0; state.taskName = stripExt(name);
          buildPlateMeshes(currentPlate()); refreshEditorUI();
          go('model-editor');
        }, 320);
      }
    }, 120);
  }

  /* ---------- 无网入口：两个入口殊途同归 → 手机系统文件目录 ---------- */
  function goOfflinePrint() {
    $$('.modal').forEach(function (m) { m.classList.remove('is-open'); });
    var act = document.querySelector('.screen.is-active');
    state.offlineFrom = act ? act.dataset.screen : 'creative-space';   // 打印完成后返回进入前的页面（BR-061）
    state.offlineBanner = true;
    syncNetBanner();
    openPicker('offline');
  }

  /* ---------- 演示控制台：R002 异常分支一键触发 ---------- */
  function runR002Demo(kind) {
    switch (kind) {
      case 'format':
        state.importMode = 'normal';
        state.pickerSelected = ['robot_arm.fbx'];
        openPicker('normal');
        $('#formatDesc').textContent = '「robot_arm.fbx」不在支持范围内。';
        $('#modalFormatUnsupported').classList.add('is-open');
        break;
      case 'compress':
        openPicker('normal');
        state.pickerSelected = ['dragon_statue.stl'];
        state.importCtx = { pass: [], fail: [], dropped: 0, src: '本地文件', solo: true };
        state.optimizeQueue = [{ f: byName('dragon_statue.stl'), why: 'size' }];
        openOptimizeSheet();
        break;
      case 'toolarge':
        openPicker('normal');
        state.pickerSelected = ['too_big_model.stl'];
        showError('文件过大，暂不支持自动优化，请重新选择模型。');
        break;
      case 'optimize-progress':
        openPicker('normal');
        state.pickerSelected = ['dragon_statue.stl', 'too_big_model.stl', 'highpoly_bust.stl'];
        state.importCtx = { pass: [], fail: [], dropped: 0, src: '本地文件', solo: false };
        state.optimizeQueue = [
          { f: byName('dragon_statue.stl'), why: 'size' },
          { f: byName('too_big_model.stl'), why: 'size' },
          { f: byName('highpoly_bust.stl'), why: 'tri' }
        ];
        runOptimize();
        break;
      case 'tri-dialog':
        state.importMode = 'normal';
        state.pickerSelected = ['highpoly_bust.stl'];
        state.importCtx = { pass: [], fail: [], dropped: 0, src: '本地文件', solo: true };
        state.optimizeQueue = [{ f: byName('highpoly_bust.stl'), why: 'tri' }];
        openOptimizeSheet();
        break;
      case 'batch-limit':
        openPicker('normal');
        state.importMode = 'normal';
        state.pickerSelected = PHONE_FILES.filter(function (f) { return fileExt(f.name) !== 'fbx'; }).map(function (f) { return f.name; });
        state.importCtx = { pass: [], fail: [], dropped: 0, src: '本地文件', solo: false };
        proceedBatchDemo();
        break;
      case 'partial': go('partial-result'); break;
      case 'overflow': openOverflowResult(); break;
      case 'failed':
        setTaskEmpty(false);
        state.plates = makeNamedPlates(['batch_plate']);
        state.currentPlate = 0;
        buildPlateMeshes(currentPlate()); refreshEditorUI();
        $('#importFailDesc').textContent = '传输过程中断，「batch_plate.gcode」等 3 个文件未完成，已选文件仍然保留。';
        $('#modalImportFailed').classList.add('is-open');
        break;
      case 'offline-picker': state.offlineBanner = true; syncNetBanner(); state.offlineFrom = (document.querySelector('.screen.is-active') || {}).dataset.screen || 'creative-space'; openPicker('offline'); break;
      case 'offline-unbound': state.offlineBanner = true; syncNetBanner(); state.offlineFrom = (document.querySelector('.screen.is-active') || {}).dataset.screen || 'creative-space'; openPicker('offline'); openOfflineBlock('unbound'); break;
      case 'offline-invalid': state.offlineBanner = true; syncNetBanner(); openPicker('offline'); openOfflineBlock('invalid'); break;
      case 'offline-guest': state.offlineBanner = true; syncNetBanner(); openPicker('offline'); openOfflineBlock('guest'); break;
      case 'offline-expired': state.offlineBanner = true; syncNetBanner(); openPicker('offline'); openOfflineBlock('expired'); break;
      case 'offline-xfer': state.offlineBanner = true; syncNetBanner(); go('offline-transfer'); break;
      case 'upload-progress': openUploadProgress(true); break;
      case 'upload-done': $('#modalUploadDone').classList.add('is-open'); break;
      case 'offline-prepare':
        state.offlineBanner = true;
        syncNetBanner();
        ensureSlice();
        go('prepare-print');
        break;
    }
  }

  /** 演示：批量总量超限（BR-026 阻止写入） */
  function proceedBatchDemo() {
    $('#batchLimitTitle').textContent = '文件总大小超过300MB';
    $('#batchLimitDesc').textContent = '当前已选 12 个有效文件，优化后总量 393MB，超过单次 300MB 上限。请返回文件列表移除部分文件后重试。';
    $('#modalBatchLimit').classList.add('is-open');
  }

  /** 触达 8 盘上限后剩余文件丢弃并提示（BR-060 / DEC-035） */
  function openOverflowResult() {
    setTaskEmpty(false);
    state.plates = makeNamedPlates(demoPlateNames());
    state.currentPlate = 0; state.taskName = '多选导入';
    buildPlateMeshes(currentPlate()); refreshEditorUI();
    state.lastImportSummary = {
      ok: PLATE_CAP, fail: 0, overflow: 4, dropped: 0, src: '本地文件',
      okList: [], failList: []
    };
    go('model-editor');
    setTimeout(function () { openImportResult('auto'); }, 60);
  }

  /* ---------- 无网「上传中」→「上传完成」（替代云切片 Loading） ---------- */
  var uploadTimer = null;
  function openUploadProgress(freeze) {
    if (uploadTimer) { clearInterval(uploadTimer); uploadTimer = null; }
    var p = freeze ? 58 : 0;
    state.uploadProgress = p;
    $('#uploadProgressFile').textContent = uploadFileName();
    renderUploadProgress();
    $('#modalUploadProgress').classList.add('is-open');
    if (freeze) return;
    uploadTimer = setInterval(function () {
      state.uploadProgress = Math.min(100, state.uploadProgress + 4 + Math.random() * 7);
      renderUploadProgress();
      if (state.uploadProgress >= 100) {
        clearInterval(uploadTimer); uploadTimer = null;
        // 多文件：逐个上传（i / N），全部完成才弹「上传完成」
        var q = state.uploadQueue || [];
        if (state.uploadIdx < q.length - 1) {
          state.uploadIdx++;
          setTimeout(function () { openUploadProgress(false); }, 260);
          return;
        }
        setTimeout(function () {
          $('#modalUploadProgress').classList.remove('is-open');
          if (state.uploadSkipped) toast(state.uploadSkipped + ' 个文件未上传（校验未通过）');
          $('#modalUploadDone').classList.add('is-open');   // 「当前已成功上传模型文件，请联网查看当前打印机状态。」
        }, 300);
      }
    }, 120);
  }
  function uploadFileName() {
    var q = state.uploadQueue || [];
    if (q.length) {
      var n = q[state.uploadIdx || 0];
      return q.length > 1 ? (n + '（' + ((state.uploadIdx || 0) + 1) + ' / ' + q.length + '）') : n;
    }
    return (state.taskName || '电击小子_3D浮雕') + '.gcode';   // 编辑页「去打印」场景（BR-037）
  }
  function renderUploadProgress() {
    var p = Math.round(state.uploadProgress || 0);
    $('#uploadProgressBar').style.width = p + '%';
    $('#uploadProgressPct').textContent = p + '%';
  }
  function abortUploadProgress() {
    if (uploadTimer) { clearInterval(uploadTimer); uploadTimer = null; }
    $('#modalUploadProgress').classList.remove('is-open');
  }

  /* ============================ 屏幕路由 ============================ */

  var SCREENS = ['creative-space', 'model-detail', 'model-editor', 'print-settings', 'prepare-print', 'slice-failed', 'system-picker', 'offline-transfer'];
  var lastApplied = null;

  function showScreen(name) {
    SCREENS.forEach(function (n) {
      var el = $('#screen-' + n);
      if (el) el.classList.toggle('is-active', n === name);
    });
    // 整图复用页自带烘焙状态栏，隐藏手机的伪状态栏避免重影
    $('.phone').classList.toggle('is-artwork', name === 'model-detail' || name === 'prepare-print' || name === 'creative-space');
    if (name !== 'model-editor') closeScaleSheetSilent();
    if (name !== 'model-editor') closeImportSheetSilent();
    if (name === 'model-editor') { glSize = { w: 0, h: 0 }; setTimeout(resizeGL, 0); }
    syncNetBanner();
  }

  function go(name) {
    var target = '#' + name;
    if (location.hash !== target) {
      try { location.hash = target; } catch (e) { /* ignore */ }
    }
    applyHash(true);
  }

  function applyHash(force) {
    var h = (location.hash || '#creative-space').replace(/^#/, '');
    if (!force && h === lastApplied) return;   // 幂等：避免与 hashchange 重复执行
    lastApplied = h;
    var parts = h.split('/');
    var name = parts[0], overlay = parts[1];

    var base = SCREENS.indexOf(name) >= 0 ? name : 'creative-space';
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

    /* ---- R002 叠加层别名 ---- */
    if (name === 'import-sheet') { base = 'model-editor'; overlay = 'import-sheet'; }
    if (name === 'import-sheet' && overlay === 'slice') { base = 'model-editor'; overlay = 'import-sheet'; state.importTab = 'my-slice'; }
    if (name === 'import-empty-editor') { base = 'model-editor'; overlay = null; }
    if (name === 'import-multi-result') { base = 'model-editor'; overlay = 'import-multi-result'; }
    if (name === 'format-unsupported') { base = 'system-picker'; overlay = 'format-unsupported'; }
    if (name === 'compress-dialog') { base = 'system-picker'; overlay = 'compress-dialog'; }
    if (name === 'too-large') { base = 'system-picker'; overlay = 'too-large'; }
    if (name === 'optimize-progress') { base = 'system-picker'; overlay = 'optimize-progress'; }
    if (name === 'batch-limit') { base = 'system-picker'; overlay = 'batch-limit'; }
    if (name === 'tri-dialog') { base = 'system-picker'; overlay = 'tri-dialog'; }
    if (name === 'import-progress') { base = 'model-editor'; overlay = 'import-progress'; }
    if (name === 'partial-result') { base = 'model-editor'; overlay = 'partial-result'; }
    if (name === 'import-failed') { base = 'model-editor'; overlay = 'import-failed'; }
    if (name === 'offline-picker') { base = 'system-picker'; overlay = null; state.importMode = 'offline'; if (!state.offlineFrom) state.offlineFrom = 'creative-space'; }   // 守卫：不覆盖 goOfflinePrint 已记录的来源页
    if (name === 'system-picker') { base = 'system-picker'; overlay = null; state.importMode = 'normal'; }
    if (name === 'offline-dialog') { base = 'model-editor'; overlay = 'offline-dialog'; }
    if (name === 'offline-unbound' || name === 'offline-invalid' || name === 'offline-guest' || name === 'offline-expired') {
      base = 'system-picker'; overlay = name; state.importMode = 'offline';
    }
    if (name === 'offline-transfer') { base = 'offline-transfer'; overlay = null; }
    if (name === 'upload-progress') { base = 'model-editor'; overlay = 'upload-progress'; }
    if (name === 'upload-done') { base = 'model-editor'; overlay = 'upload-done'; }
    if (name === 'offline-prepare') { base = 'prepare-print'; overlay = null; state.offlineBanner = true; }

    // 入口分支决定返回落点（DEC-038）+ 深链默认态：
    // · 手动改 hash / 深链进入（force 为空）→ 归位「创意空间」入口，并按 R001 演示数据填充编辑页；
    // · go() 调用（force=true）→ 由调用方决定空态或填充，此处不覆盖。
    if (base === 'model-editor' && name === 'model-editor' && !force) {
      state.editorEntry = 'creative-space';
      state.taskEmpty = false;
      if (!state.plates.length) buildDemo(1);
    }

    showScreen(base);

    // 先收起所有叠加层
    if (overlay !== 'scale-panel') closeScaleSheetSilent();
    if (overlay !== 'import-sheet') closeImportSheetSilent();
    $$('.modal').forEach(function (m) { m.classList.remove('is-open'); });
    if (overlay !== 'slicing-loading') { state.slicing = false; $('#sliceLoading').classList.remove('is-open'); }
    if (overlay !== 'saving-progress') abortSaving();
    if (overlay !== 'import-progress') abortImportProgress();
    if (overlay !== 'optimize-progress') abortOptimize();
    if (overlay !== 'upload-progress') abortUploadProgress();

    if (overlay === 'scale-panel') openScaleSheet();
    if (overlay === 'save-scope-dialog') $('#modalSaveScope').classList.add('is-open');
    if (overlay === 'restore-default-dialog') $('#modalRestoreDefault').classList.add('is-open');
    if (overlay === 'delete-last-dialog') $('#modalDeleteLast').classList.add('is-open');
    if (overlay === 'slicing-loading') openLoading();
    if (overlay === 'out-of-bounds') { state.outOfBounds = true; finalizeLayout(); }

    /* ---- R002 深链落点 ---- */
    if (base === 'system-picker') openPicker(state.importMode, false);
    if (name === 'import-empty-editor') setTaskEmpty(true);
    if (overlay === 'import-sheet') { setTaskEmpty(true); openImportSheet(); }
    if (overlay === 'import-multi-result') openImportResult('multi');
    if (overlay === 'partial-result') openImportResult('partial');
    if (overlay === 'import-progress') { setTaskEmpty(false); state.pendingFiles = ['电击小子_3D浮雕.stl', '恐龙小夜灯.3mf', '卡通笔筒.obj']; openImportProgress(3, 3, true); }
    if (overlay === 'import-failed') { setTaskEmpty(false); $('#importFailDesc').textContent = '传输过程中断，已选文件仍然保留。'; $('#modalImportFailed').classList.add('is-open'); }
    if (overlay === 'format-unsupported') { $('#formatDesc').textContent = '「robot_arm.fbx」不在支持范围内。'; $('#modalFormatUnsupported').classList.add('is-open'); }
    if (overlay === 'compress-dialog') { state.importMode = 'normal'; state.pickerSelected = ['dragon_statue.stl']; state.importCtx = { pass: [], fail: [], dropped: 0, src: '本地文件', solo: true }; state.optimizeQueue = [{ f: byName('dragon_statue.stl'), why: 'size' }]; openOptimizeSheet(); }
    if (overlay === 'too-large') { $('#errTitle').textContent = '无法导入'; $('#tooLargeDesc').textContent = '文件过大，暂不支持自动优化，请重新选择模型。'; $('#modalTooLarge').classList.add('is-open'); }
    if (overlay === 'optimize-progress') { state.importMode = 'normal'; state.pickerSelected = ['dragon_statue.stl', 'highpoly_bust.stl']; state.importCtx = { pass: [], fail: [], dropped: 0, src: '本地文件', solo: false }; state.optimizeQueue = [{ f: byName('dragon_statue.stl'), why: 'size' }, { f: byName('highpoly_bust.stl'), why: 'tri' }]; runOptimize(); }
    if (overlay === 'batch-limit') { state.importMode = 'normal'; openPicker('normal', false); state.pickerSelected = PHONE_FILES.filter(function (f) { return fileExt(f.name) !== 'fbx'; }).map(function (f) { return f.name; }); proceedBatchDemo(); }
    if (overlay === 'tri-dialog') { state.importMode = 'normal'; openPicker('normal', false); state.pickerSelected = ['highpoly_bust.stl']; state.importCtx = { pass: [], fail: [], dropped: 0, src: '本地文件', solo: true }; state.optimizeQueue = [{ f: byName('highpoly_bust.stl'), why: 'tri' }]; openOptimizeSheet(); }
    if (overlay === 'offline-dialog') { state.offlineBanner = true; state.offlineAskShown = true; syncNetBanner(); $('#modalOfflineAsk').classList.add('is-open'); }
    if (overlay === 'offline-unbound' || overlay === 'offline-invalid' || overlay === 'offline-guest' || overlay === 'offline-expired') {
      openOfflineBlock(overlay.replace('offline-', ''));
    }
    if (base === 'offline-transfer') openOfflineTransfer('xiaojidan_pendant.gcode', true);
    if (overlay === 'upload-progress') openUploadProgress(true);
    if (overlay === 'upload-done') { $('#modalUploadDone').classList.add('is-open'); }
    syncPpOfflineTag();

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
    if (base === 'print-settings') refreshSettingsUI();
    if (base === 'prepare-print') { ensureSlice(); renderPreparePage(); }
  }

  /** 深链直达准备打印页时，若尚无切片结果则补一份（不跑 Loading 动画） */
  function ensureSlice() {
    if (state.lastSlice) return;
    state.lastSlice = { est: estimates(), thumbs: captureThumbs(), params: activeParams(), at: Date.now() };
  }

  window.addEventListener('hashchange', function () { applyHash(); });

  /* ============================ 事件绑定 ============================ */

  function bind() {
    // 入口（R002：创意空间；R001：模型详情页）
    $('#btnImportEntry').addEventListener('click', function () {
      state.editorEntry = 'creative-space';
      setTaskEmpty(true);            // 3D 视图区为空的空态（DEC-032）
      go('model-editor');
      setTimeout(openImportSheet, 260);   // 再自动升起导入选择弹窗
    });
    $('#btnFreeCreate').addEventListener('click', function () { toast('原型演示：「自由创作」不在本次需求范围内'); });
    $('#btnNavModelLib').addEventListener('click', function () { toast('原型演示：「模型库」不在本次需求范围内'); });
    $('#btnNavMine').addEventListener('click', function () { toast('原型演示：「我的」页面不在本次需求范围内（本模块读取其中的创作与切片记录）'); });

    $('#btnOpenEditor').addEventListener('click', function () {
      state.editorEntry = 'model-detail';   // 从模型详情页进入 → 返回回详情页（DEC-006）
      if (!state.plates.length) buildDemo(1);
      state.taskEmpty = false;
      buildPlateMeshes(currentPlate());
      refreshEditorUI();
      go('model-editor');
    });
    $('#btnModelDetailPrint').addEventListener('click', function () {
      toast('本次需求范围为「打印设置」链路，直接打印不在范围内');
    });

    // 模型编辑页导航
    $('#btnEditorBack').addEventListener('click', function () {
      // 返回落点按入口分支（BR-030 / DEC-038）
      if (state.editorEntry === 'creative-space') { go('creative-space'); return; }
      go('model-detail');   // 保留编辑结果，不做退出确认（BR-016）
    });
    $('#btnEditorMore').addEventListener('click', function () { go('print-settings'); });

    /* ==================== R002 模型导入 ==================== */
    $('#btnEditorAdd').addEventListener('click', function () { openImportSheet(); });
    $('#btnEmptyImport').addEventListener('click', function () { openImportSheet(); });

    // 导入选择弹窗：右上角关闭 + 点遮罩拉下
    $('#btnImportClose').addEventListener('click', closeImportSheet);
    $('#importScrim').addEventListener('click', closeImportSheet);
    $$('[data-import-tab]').forEach(function (b) {
      b.addEventListener('click', function () { setImportTab(b.dataset.importTab); });
    });
    $('#btnImportLocal').addEventListener('click', function () { openPicker('normal'); });

    // 手机系统文件目录
    $('#btnPickerBack').addEventListener('click', function () {
      if (state.importMode === 'offline') { go('creative-space'); return; }
      go('model-editor');
      setTimeout(openImportSheet, 240);
    });
    $('#btnPickerAll').addEventListener('click', togglePickerAll);
    $('#btnPickerConfirm').addEventListener('click', confirmPicker);

    // 校验弹窗
    $('#btnFormatRepick').addEventListener('click', function () {
      $('#modalFormatUnsupported').classList.remove('is-open');
      setImportTab(state.importTab);
      if (state.importMode === 'offline') openPicker('offline'); else openPicker('normal');
    });
    $('#btnDoCompress').addEventListener('click', runOptimize);

    // 结果与失败
    $('#btnImportResGo').addEventListener('click', function () {
      $('#modalImportResult').classList.remove('is-open');
      go('model-editor');
    });
    $('#btnImportResRetry').addEventListener('click', retryFailedFiles);
    $('#btnBatchBack').addEventListener('click', function () {
      $('#modalBatchLimit').classList.remove('is-open');
      var anchor = state.importMode === 'offline' ? 'offline-picker' : 'system-picker';
      var keep = state.pickerSelected.slice();
      go(anchor);                 // 返回文件列表（BR-026：用户移除后重试）
      state.pickerSelected = keep;   // 勾选保留，避免被 applyHash 的 openPicker 重置
      renderPicker();
      syncPickerFoot();
    });
    $('#btnUploadDoneKnow').addEventListener('click', function () {
      $('#modalUploadDone').classList.remove('is-open');
      go(state.offlineFrom || 'creative-space');   // 返回进入无网文件目录之前的页面（BR-061）
    });
    $('#btnImportRetry').addEventListener('click', function () {
      $('#modalImportFailed').classList.remove('is-open');
      if (!state.pendingFiles.length) { openPicker(state.importMode); return; }
      state.importCtx = state.importCtx || { pass: [], fail: [], dropped: 0 };
      openImportProgress(0, state.pendingFiles.length, false);
    });

    // 无网链路：两个入口都直接进手机系统文件目录（BR-027 / DEC-037）
    $('#btnOfflinePrintBanner').addEventListener('click', goOfflinePrint);
    $('#btnGoOfflinePrint').addEventListener('click', goOfflinePrint);
    $('#btnOfflineBlockAction').addEventListener('click', function () {
      $('#modalOfflineBlock').classList.remove('is-open');
      if (state.offlineBind === 'expired') {
        // 超期不硬拦：允许继续，只是强提示
        openPicker('offline');
        toast('已继续无网打印，建议联网校验一次绑定状态');
        return;
      }
      toast('原型演示：' + $('#btnOfflineBlockAction').textContent + '（需联网，本模块不展开）');
    });
    $('#btnXferBack').addEventListener('click', function () {
      if (xferTimer) { clearInterval(xferTimer); xferTimer = null; }
      go('system-picker');
    });

    // 演示控制台：无网开关与 R002 异常分支
    $('#demoOffline').addEventListener('change', function () { setOffline(this.checked); });
    $$('[data-demo-r002]').forEach(function (b) {
      b.addEventListener('click', function () { runR002Demo(b.dataset.demoR002); });
    });

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

    // 去打印：联网走云切片；无网/弱网走「上传中 → 上传完成」链路（BR-037）
    $('#btnSlice').addEventListener('click', function () {
      var r = blockReason();
      if (r) { toast(r); return; }
      if (state.offlineBanner) { state.offlineFrom = 'model-editor'; openUploadProgress(false); return; }
      runSlice();
    });

    // 打印设置页
    $('#btnSettingsBack').addEventListener('click', function () {
      go('model-editor');   // 参数已即时生效，无需重新加载模型（§13.1）
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

    // 保存
    $('#btnSaveParams').addEventListener('click', function () {
      $('#modalSaveScope').classList.add('is-open');
    });
    $$('[data-save-scope]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.savedTo = b.dataset.saveScope;
        $('#modalSaveScope').classList.remove('is-open');
        toast(b.dataset.saveScope === 'model' ? '已保存为当前模型的打印参数' : '已设为后续模型的默认打印参数');
      });
    });
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
        $$('[data-demo-plates]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
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

      /* ---- R002 状态复位 ---- */
      state.importMode = 'normal';
      state.importTab = 'ai-creation';
      state.pickerSelected = [];
      state.pendingFiles = [];
      state.optimizeQueue = [];
      state.importCtx = null;
      state.currentCompress = null;
      state.taskName = null;
      state.offlineBanner = false;
      state.offlineAskShown = false;
      state.offlineBind = 'bound';
      state.editorEntry = 'creative-space';
      state.taskEmpty = false;
      abortImportProgress();
      abortUploadProgress();
      closeImportSheetSilent();
      $$('.modal').forEach(function (m) { m.classList.remove('is-open'); });
      syncNetBanner();
      if ($('#demoOffline')) $('#demoOffline').checked = false;
      setImportTab('ai-creation');

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

  /* ---------- R002 调试句柄（供自动化验证 / 评审时手动调用） ---------- */
  window.__R002 = {
    state: state,
    go: go,
    AI_CREATIONS: AI_CREATIONS,
    MY_SLICES: MY_SLICES,
    PHONE_FILES: PHONE_FILES,
    SUPPORTED_EXT: SUPPORTED_EXT,
    LIMITS: { fileMB: MAX_FILE_MB, tri: MAX_TRI, files: MAX_FILES, totalMB: MAX_TOTAL_MB, plates: PLATE_CAP },
    setTaskEmpty: setTaskEmpty,
    openImportSheet: openImportSheet,
    closeImportSheet: closeImportSheet,
    isImportSheetOpen: isImportSheetOpen,
    setImportTab: setImportTab,
    openPicker: openPicker,
    togglePickerItem: togglePickerItem,
    togglePickerAll: togglePickerAll,
    confirmPicker: confirmPicker,
    validateFile: validateFile,
    runOptimize: runOptimize,
    proceedBatch: proceedBatch,
    openOptimizeSheet: openOptimizeSheet,
    finishImportPlan: finishImportPlan,
    applyImportedPlates: applyImportedPlates,
    openImportResult: openImportResult,
    pickFromLibrary: pickFromLibrary,
    setOffline: setOffline,
    askOffline: askOffline,
    goOfflinePrint: goOfflinePrint,
    openOfflineBlock: openOfflineBlock,
    openOfflineTransfer: openOfflineTransfer,
    syncNetBanner: syncNetBanner,
    runDemo: runR002Demo,
    plateCount: function () { return state.plates.length; },
    totalModels: totalModels
  };

  /* ============================ 启动 ============================ */

  function boot() {
    buildDemo(1);
    initScene();
    initControls();
    bind();
    renderImportGrids();
    // 生成当前盘的模型网格（共享同一份 STL 几何体，仅变换与材质不同）
    buildPlateMeshes(currentPlate());
    refreshSettingsUI();
    syncNetBanner();
    applyHash();
    refreshEditorUI();
    requestAnimationFrame(renderLoop);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
