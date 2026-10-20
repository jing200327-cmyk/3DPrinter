/* ==========================================================================
   check-3d-preview.mjs
   --------------------------------------------------------------------------
   验收「准备打印页 → 盘缩略图左上角 3D 图标 → 3D 预览页 → 回退」这条链路。

   覆盖点：
     1. 空闲版准备打印页（3 行）与任务状态版准备打印页（3 行）各有 3 颗 3D 图标
     2. 每颗图标都贴在所属行「模型缩略图」的左上角（按切片原图像素反算的容差内）
     3. 图标是它中心点的最顶层元素（不会被盘行热区 / 色卡热区盖住）
     4. 点击后进入 3D 预览页，画布有尺寸、Three.js 真的建出了模型网格
     5. 耗材单元为静态 HTML 信息，不再打开选择耗材或不匹配弹层
     6. 3D 预览页里已按需求删掉的控件确实不存在（更多 / 缩放 / 复制 / 删除 / 去打印）
     7. 左上角回退按钮回到准备打印页
     8. 任务状态版进 3D 预览后回退也能回到任务状态版

   用法：node tests/check-3d-preview.mjs
   ========================================================================== */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const prototypeRoot = path.resolve(import.meta.dirname, '..');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ziyan-3d-preview-'));
const pageUrl = pathToFileURL(path.join(prototypeRoot, 'index.html')).href;
const previewShot = path.join(prototypeRoot, 'prototype-3d-preview.png');
const badgeShot = path.join(prototypeRoot, 'prototype-plate-3d-badge.png');

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--enable-unsafe-swiftshader',
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  '--remote-debugging-port=0',
  `--user-data-dir=${profileDir}`,
  '--window-size=375,812',
  pageUrl
], { stdio: 'ignore' });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForDevToolsPort() {
  const portFile = path.join(profileDir, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (fs.existsSync(portFile)) return fs.readFileSync(portFile, 'utf8').split(/\r?\n/)[0];
    await delay(100);
  }
  throw new Error('Chrome DevTools port was not created.');
}

function connectCdp(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  let sequence = 0;
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    }
  });
  return {
    ready: new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    }),
    send(method, params = {}) {
      sequence += 1;
      return new Promise((resolve, reject) => {
        pending.set(sequence, { resolve, reject });
        socket.send(JSON.stringify({ id: sequence, method, params }));
      });
    },
    close() { socket.close(); }
  };
}

let passed = 0;
function check(condition, message) {
  if (condition) { passed += 1; return; }
  throw new Error(`FAIL: ${message}`);
}

async function evaluate(cdp, expression, awaitPromise = false) {
  const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
  if (result.exceptionDetails) throw new Error(`Runtime error: ${result.exceptionDetails.text} :: ${expression.slice(0, 160)}`);
  return result.result.value;
}

async function waitFor(cdp, expression, message, timeout = 8000) {
  const deadline = Date.now() + timeout;
  for (;;) {
    if (await evaluate(cdp, expression)) return;
    if (Date.now() > deadline) throw new Error(`Timed out: ${message}`);
    await delay(80);
  }
}

async function clickAt(cdp, x, y) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

async function shot(cdp, file) {
  const image = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(file, Buffer.from(image.data, 'base64'));
}

/* 直接测量真实 HTML 模型缩略图，3D 图标应内缩 2px 且位于最上层。 */
function badgeGeometry(rowSelector) {
  return `(() => {
    return [...document.querySelectorAll(${JSON.stringify(rowSelector)})].map((row) => {
      const badge = row.querySelector('.plate-3d-btn');
      const r = row.getBoundingClientRect();
      const b = badge.getBoundingClientRect();
      const style = getComputedStyle(badge);
      const thumb = row.querySelector('.prepare-model').getBoundingClientRect();
      const cardLeft = thumb.left - r.left;
      const cardTop = thumb.top - r.top;
      const cardRight = thumb.right - r.left;
      const cardBottom = thumb.bottom - r.top;
      const topmost = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      return {
        plate: row.dataset.plate || row.dataset.row,
        text: badge.textContent.trim(),
        visible: b.width > 0 && b.height > 0 && !badge.hidden && style.display !== 'none' && style.visibility !== 'hidden',
        width: Math.round(b.width),
        height: Math.round(b.height),
        left: +((b.left - r.left) / r.width).toFixed(4),
        top: +((b.top - r.top) / r.height).toFixed(4),
        /* 图标左上角相对缩略图卡片的偏移（px），应为很小的正数（贴角内缩 2px） */
        dxFromCard: +((b.left - r.left) - cardLeft).toFixed(1),
        dyFromCard: +((b.top - r.top) - cardTop).toFixed(1),
        insideRight: b.right <= r.left + cardRight + 0.5,
        insideBottom: b.bottom <= r.top + cardBottom + 0.5,
        hitTest: topmost ? (topmost.closest('.plate-3d-btn') === badge) : false,
        cursor: style.cursor,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight
      };
    });
  })()`;
}

const BADGE_GEOMETRY = badgeGeometry('.plate-row');

function assertBadges(items, label) {
  items.forEach((item) => {
    check(item.visible, `${label}盘 ${item.plate} 的 3D 图标不可见：${JSON.stringify(item)}`);
    check(item.text === '3D', `${label}盘 ${item.plate} 的图标文字应为 3D，实际「${item.text}」`);
    check(item.hitTest, `${label}盘 ${item.plate} 的 3D 图标中心点被其它元素盖住（点不到）`);
    check(item.cursor === 'pointer', `${label}盘 ${item.plate} 的 3D 图标不是可点光标`);
    check(item.fontWeight === '800' && parseFloat(item.fontSize) >= 10, `${label}盘 ${item.plate} 的图标字形过弱：${item.fontWeight}/${item.fontSize}`);
    check(Math.abs(item.dxFromCard) <= 3 && Math.abs(item.dyFromCard) <= 3,
      `${label}盘 ${item.plate} 的图标没有贴在缩略图左上角：dx=${item.dxFromCard} dy=${item.dyFromCard}`);
    check(item.insideRight && item.insideBottom, `${label}盘 ${item.plate} 的图标超出了缩略图范围`);
    check(item.width >= 18 && item.height >= 16, `${label}盘 ${item.plate} 的图标过小：${item.width}×${item.height}`);
  });
}

async function main() {
  const port = await waitForDevToolsPort();
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find((t) => t.type === 'page');
  const cdp = connectCdp(page.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });

  /* ---------- 进入准备打印页 ---------- */
  /* prototype.js 是最后一个脚本，DOM 里能查到按钮不代表监听已绑好，
     所以先等整页加载完成再开始点。 */
  await waitFor(cdp, `document.readyState === 'complete'`, 'Page did not finish loading.');
  await waitFor(cdp, `!!document.querySelector('#explore-toys')`, 'Printer page did not boot.');
  await delay(200);
  await evaluate(cdp, `document.querySelector('#explore-toys').click()`);
  await waitFor(cdp, `!document.querySelector('#explore-toys-screen').hidden`, 'Explore page did not open.');
  await clickAt(cdp, 187, 500);
  await waitFor(cdp, `!document.querySelector('#model-detail-screen').hidden`, 'Model detail page did not open.');
  await evaluate(cdp, `document.querySelector('#open-prepare-print').click()`);
  await waitFor(cdp, `!document.querySelector('#prepare-print-screen').hidden`, 'Prepare print page did not open.');
  await delay(400);

  /* ---------- 1. 图标存在且位置正确 ---------- */
  const normal = await evaluate(cdp, BADGE_GEOMETRY);
  check(normal.length === 3, `空闲版准备打印页应有 3 颗 3D 图标，实际 ${normal.length}`);
  assertBadges(normal, '空闲版 ');
  const first = normal[0];
  console.log(`✓ 3 颗 3D 图标就位（示例：盘 ${first.plate} ${first.width}×${first.height}px，距卡片左上角 ${first.dxFromCard}/${first.dyFromCard}px）`);

  /* ---------- 2. 耗材信息为静态展示 ---------- */
  const staticMaterial = await evaluate(cdp, `(() => {
    const rows = [...document.querySelectorAll('.plate-row')];
    return rows.every(row => row.querySelectorAll('.prepare-material').length === 1)
      && !document.querySelector('#prepare-stage .plate-material-hit')
      && !!document.querySelector('#prepare-stage .prepare-mismatch');
  })()`);
  check(staticMaterial, '每盘应仅保留一个静态耗材单元，第三盘带不匹配感叹号');
  await shot(cdp, badgeShot);

  /* ---------- 3. 点图标进 3D 预览页 ---------- */
  const badgePoint = await evaluate(cdp, `(() => {
    const b = document.querySelector('.plate-row[data-plate="2"] .plate-3d-btn').getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  })()`);
  await clickAt(cdp, badgePoint.x, badgePoint.y);
  await waitFor(cdp, `!document.querySelector('#preview-3d-screen').hidden`, '3D preview page did not open.');
  await waitFor(cdp, `window.__PREVIEW3D && window.__PREVIEW3D.diag().inited`, '3D module did not initialise.');
  await delay(600);

  const preview = await evaluate(cdp, `(() => {
    const canvas = document.querySelector('#pv3d-gl');
    const r = canvas.getBoundingClientRect();
    const screens = [...document.querySelectorAll('.reuse-screen')].filter((s) => !s.hidden).map((s) => s.id);
    return {
      screens,
      canvas: { w: Math.round(r.width), h: Math.round(r.height) },
      title: document.querySelector('.pv3d-nav-title').textContent.trim(),
      name: document.querySelector('#pv3d-model-name').textContent.trim(),
      meta: document.querySelector('#pv3d-meta').textContent.trim(),
      diag: window.__PREVIEW3D.diag(),
      /* 已按需求删除的控件 */
      removed: {
        more: !!document.querySelector('#btnEditorMore'),
        toolScale: !!document.querySelector('#toolScale'),
        toolCopy: !!document.querySelector('#toolCopy'),
        toolDelete: !!document.querySelector('#toolDelete'),
        toolsBox: !!document.querySelector('.ed-tools'),
        sliceCta: !!document.querySelector('#btnSlice'),
        ctaBox: !!document.querySelector('.ed-cta'),
        scaleSheet: !!document.querySelector('#scaleSheet')
      },
      backBox: (() => { const b = document.querySelector('#preview-3d-back').getBoundingClientRect(); return { left: Math.round(b.left), top: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }; })()
    };
  })()`);
  check(preview.screens.length === 1 && preview.screens[0] === 'preview-3d-screen', `同时显示的页面不止 3D 预览：${JSON.stringify(preview.screens)}`);
  check(preview.canvas.w > 300 && preview.canvas.h > 300, `3D 画布没有撑开：${JSON.stringify(preview.canvas)}`);
  check(preview.diag.hasMesh && preview.diag.active, `Three.js 场景没有就绪：${JSON.stringify(preview.diag)}`);
  check(preview.title === '3D 预览', `导航标题应为「3D 预览」，实际「${preview.title}」`);
  check(preview.name.startsWith('史蒂夫_02_012209'), `模型名应取被点击那一盘，实际「${preview.name}」`);
  check(preview.meta.includes('盘 2') && preview.meta.includes('1 h 42 min') && preview.meta.includes('54 g'), `盘信息不完整：「${preview.meta}」`);
  check(preview.backBox.left <= 20 && preview.backBox.top <= 60 && preview.backBox.w >= 44 && preview.backBox.h >= 44,
    `左上角回退按钮位置/命中盒不合适：${JSON.stringify(preview.backBox)}`);
  Object.entries(preview.removed).forEach(([key, present]) => {
    check(!present, `按要求删除的控件仍然存在：${key}`);
  });
  console.log(`✓ 3D 预览页打开：画布 ${preview.canvas.w}×${preview.canvas.h}，模型网格 ${preview.diag.hasMesh ? '已建立' : '缺失'}，被删控件均不存在`);
  await shot(cdp, previewShot);

  /* ---------- 4. 视角缩放按钮 ---------- */
  const beforeZoom = await evaluate(cdp, `window.__PREVIEW3D.orbit.dist`);
  await evaluate(cdp, `document.querySelector('#pv3d-zoom-in').click()`);
  const afterZoom = await evaluate(cdp, `window.__PREVIEW3D.orbit.dist`);
  check(afterZoom < beforeZoom, `放大按钮没有拉近镜头：${beforeZoom} → ${afterZoom}`);
  await evaluate(cdp, `document.querySelector('#pv3d-zoom-reset').click()`);
  const afterReset = await evaluate(cdp, `window.__PREVIEW3D.orbit.dist`);
  check(Math.abs(afterReset - 252) < 1, `复位视角没有回到默认距离：${afterReset}`);
  console.log('✓ 视角缩放 / 复位可用');

  /* ---------- 5. 左上角回退 → 准备打印页 ---------- */
  await evaluate(cdp, `document.querySelector('#preview-3d-back').click()`);
  await waitFor(cdp, `document.querySelector('#preview-3d-screen').hidden && !document.querySelector('#prepare-print-screen').hidden`, '回退没有回到准备打印页');
  await delay(200);
  const backTo = await evaluate(cdp, `(() => ({
    canvasStopped: !window.__PREVIEW3D.isActive(),
    screens: [...document.querySelectorAll('.reuse-screen')].filter((s) => !s.hidden).map((s) => s.id)
  }))()`);
  check(backTo.screens.length === 1 && backTo.screens[0] === 'prepare-print-screen', `回退后停留的页面不对：${JSON.stringify(backTo.screens)}`);
  check(backTo.canvasStopped, '回退后 3D 渲染循环没有停下');
  console.log('✓ 左上角回退回到准备打印页，渲染循环已停');

  /* ---------- 6. 任务状态版进 / 出 3D 预览 ---------- */
  /* 打印队列里的待打印任务 → 任务状态版准备打印页
     （队列在设备页里，被复用页盖住时只影响真实点击，这里直接派发 click 即可） */
  const stateOpened = await evaluate(cdp, `(() => {
    const target = document.querySelector('#queued-task');
    if (!target || target.hidden) return false;
    target.click();
    return true;
  })()`);
  check(stateOpened, '打印队列里的待打印任务不可用，无法进入任务状态版准备打印页');
  await waitFor(cdp, `!document.querySelector('#prepare-state-screen').hidden`, '任务状态版准备打印页没有打开');
  await delay(400);

  const stateBadges = await evaluate(cdp, badgeGeometry('.state-row'));
  check(stateBadges.length === 3, `任务状态版准备打印页应有 3 颗 3D 图标，实际 ${stateBadges.length}`);
  assertBadges(stateBadges, '任务状态版 ');
  console.log('✓ 任务状态版准备打印页的 3 颗 3D 图标同样贴在缩略图左上角');

  const stateBadgePoint = await evaluate(cdp, `(() => {
    const b = document.querySelector('.state-row[data-row="3"] .plate-3d-btn').getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  })()`);
  await clickAt(cdp, stateBadgePoint.x, stateBadgePoint.y);
  await waitFor(cdp, `!document.querySelector('#preview-3d-screen').hidden`, '任务状态版的 3D 图标没有打开预览页');
  await delay(300);
  const stateName = await evaluate(cdp, `document.querySelector('#pv3d-model-name').textContent.trim()`);
  check(stateName.startsWith('史蒂夫_03_012207'), `任务状态版取错了盘：${stateName}`);
  await evaluate(cdp, `document.querySelector('#preview-3d-back').click()`);
  await waitFor(cdp, `document.querySelector('#preview-3d-screen').hidden && !document.querySelector('#prepare-state-screen').hidden`,
    '任务状态版回退没有回到任务状态版准备打印页');
  console.log('✓ 任务状态版准备打印页同样可进 3D 预览并能回退');

  console.log(`\n全部通过：${passed} 项断言`);
  cdp.close();
  chrome.kill();
}

main().catch((error) => {
  console.error(error.message);
  chrome.kill();
  process.exitCode = 1;
});
