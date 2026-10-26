/* 准备打印页：DOM 高保真、静态耗材、拖动、3D 与原有打印链路验收。 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const pageUrl = process.env.PRINTER_PAGE_URL || pathToFileURL(path.join(root, 'index.html')).href;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'printer-prepare-'));
const shots = process.env.PRINTER_SCREENSHOTS || profile;
const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=0',
  `--user-data-dir=${profile}`, '--window-size=375,812', 'about:blank'
], { stdio: 'ignore' });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;
try {
  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await delay(100);
  const port = fs.readFileSync(portFile, 'utf8').split(/\r?\n/)[0];
  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
  socket = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  const pending = new Map();
  const errors = [];
  let sequence = 0;
  let finishLoad;
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === 'Page.loadEventFired') finishLoad?.();
    if (message.id) {
      const item = pending.get(message.id);
      pending.delete(message.id);
      message.error ? item.reject(new Error(message.error.message)) : item.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown' ||
      (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error')) errors.push(message.params);
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++sequence, { resolve, reject });
    socket.send(JSON.stringify({ id: sequence, method, params }));
  });
  const waitForLoad = () => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('页面加载超时')), 60000);
    finishLoad = () => { clearTimeout(timer); finishLoad = null; resolve(); };
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const click = async selector => {
    const point = await evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      el.scrollIntoView({block:'center'});
      const r = el.getBoundingClientRect();
      const x = r.left + r.width*(el.matches('.plate-row-hit, .state-row-hit') ? .8 : .5), y = r.top + r.height/2;
      return {x,y,hit:el.contains(document.elementFromPoint(x,y))};
    })()`);
    assert(point?.hit, `控件缺失或被遮挡：${selector}`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button:'left', clickCount:1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button:'left', clickCount:1 });
    await delay(100);
  };
  const screenshot = async name => {
    const {data} = await send('Page.captureScreenshot', {format:'png'});
    fs.writeFileSync(path.join(shots, name), Buffer.from(data, 'base64'));
  };
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', {width:375,height:812,deviceScaleFactor:1,mobile:false});
  const initialLoad = waitForLoad();
  await send('Page.navigate', {url:pageUrl});
  await initialLoad;
  assert.equal(await evaluate(`(async () => {
    for (let i=0;i<120;i++) {
      if(document.readyState==='complete' && document.querySelector('#printer-ug01')) return true;
      await new Promise(resolve=>setTimeout(resolve,500));
    }
    return false;
  })()`), true, '页面与交互脚本加载完成');
  await evaluate('document.fonts.ready.then(() => true)');
  await click('#explore-toys');
  await click('#explore-toys-anywhere');
  await click('#open-prepare-print');
  assert.equal(await evaluate('document.querySelector("#prepare-artwork")'), null, '准备页不再使用整页截图');
  assert.deepEqual(await evaluate('[...document.querySelectorAll("#prepare-stage .plate-row")].map(row=>row.querySelectorAll(".prepare-material").length)'), [1,1,1]);
  assert.equal(await evaluate('document.querySelector("#prepare-stage").textContent.includes("耗材-料架")'), false);
  assert.equal(await evaluate('document.querySelector("#prepare-stage").textContent.includes("Ext PLA")'), false);
  await screenshot('prototype-prepare-print.png');
  for (const plate of [1,2,3]) {
    await click(`#prepare-stage [data-plate="${plate}"] .prepare-material`);
    assert.equal(await evaluate('document.querySelector("#prepare-material-screen").hidden && document.querySelector("#prepare-empty-screen").hidden'), true, '耗材单元不再打开弹层');
  }
  assert.equal(await evaluate(`document.querySelector('#prepare-stage [data-plate="3"] .prepare-material-color').textContent`), '绿色');
  assert.equal(await evaluate(`document.querySelector('#prepare-stage [data-plate="3"] .prepare-spool').getAttribute("alt")`), '蓝色耗材料盘');
  assert.equal(await evaluate('document.querySelector("#prepare-stage .prepare-mismatch").textContent'), '!');
  await click('#prepare-stage [data-plate="2"] .plate-row-hit');
  assert.equal(await evaluate(`document.querySelector('#prepare-stage [data-plate="2"]').getAttribute("aria-selected")`), 'true');
  await click('#timelapse-toggle');
  assert.equal(await evaluate('document.querySelector("#timelapse-toggle").getAttribute("aria-checked")'), 'false');
  await click('#timelapse-toggle');
  const drag = await evaluate(`(() => {
    const a=document.querySelector('#prepare-stage [data-plate="1"]').getBoundingClientRect();
    const b=document.querySelector('#prepare-stage [data-plate="3"]').getBoundingClientRect();
    return {x:a.left+a.width*.8,y:a.top+a.height*.8,to:b.top+b.height*.8};
  })()`);
  await send('Input.dispatchMouseEvent', {type:'mousePressed',x:drag.x,y:drag.y,button:'left',clickCount:1});
  for(let step=1;step<=8;step++) await send('Input.dispatchMouseEvent', {type:'mouseMoved',x:drag.x,y:drag.y+(drag.to-drag.y)*step/8,button:'left',buttons:1});
  await send('Input.dispatchMouseEvent', {type:'mouseReleased',x:drag.x,y:drag.to,button:'left',clickCount:1});
  await delay(250);
  assert.equal(await evaluate(`document.querySelector('#prepare-stage [data-plate="1"]').dataset.slot`), '2', '拖动后第一盘移到末尾');
  await screenshot('prototype-prepare-plate-drag.png');
  for (const plate of [1,2,3]) {
    await click(`#prepare-stage [data-plate="${plate}"] .plate-3d-btn`);
    assert.equal(await evaluate('document.querySelector("#preview-3d-screen").hidden'), false);
    await delay(200);
    assert.equal(await evaluate('document.querySelector("#preview-3d-screen canvas").width > 0'), true);
    await click('#preview-3d-back');
    assert.equal(await evaluate('document.querySelector("#prepare-print-screen").hidden'), false);
  }
  for (const [width,height] of [[320,568],[375,812],[768,1024],[1440,900]]) {
    await send('Emulation.setDeviceMetricsOverride', {width,height,deviceScaleFactor:1,mobile:false});
    assert.equal(await evaluate('document.querySelector("#prepare-print-screen").scrollWidth > document.querySelector("#prepare-print-screen").clientWidth'), false, `${width}宽无横向溢出`);
    await click('#timelapse-toggle');
    await screenshot(`prepare-${width}.png`);
  }
  await send('Emulation.setDeviceMetricsOverride', {width:375,height:812,deviceScaleFactor:1,mobile:false});
  // 等待桌面控制台收起和设备框响应式布局完成，再进行坐标命中检查。
  await delay(150);
  await click('#prepare-switch-printer');
  assert.equal(await evaluate('document.querySelector("#add-printer-screen").hidden'), false);
  await click('#add-printer-back');
  assert.equal(await evaluate('document.querySelector("#prepare-print-screen").hidden'), false);
  const printingLoad=waitForLoad();
  await click('#start-print');
  await printingLoad;
  const submitted = new URLSearchParams(await evaluate('location.search'));
  assert.equal(submitted.get('plate'), '2');
  assert.equal(submitted.get('status'), 'preparing');
  const stateLoad = waitForLoad();
  await send('Page.navigate', {url: pageUrl+'?plate=1&status=printing'});
  await stateLoad;
  await click('#queue-toggle');
  await click('#queued-task');
  assert.equal(await evaluate('document.querySelector("#prepare-state-screen").hidden'), false);
  assert.equal(await evaluate('document.querySelector("#prepare-state-artwork")'), null);
  assert.deepEqual(await evaluate('[...document.querySelectorAll("#prepare-state-stage .state-row")].map(row=>row.querySelectorAll(".prepare-material").length)'), [1,1,1]);
  assert.equal(await evaluate('document.querySelector("#prepare-state-start").disabled'), true);
  assert.equal(await evaluate('document.querySelector("#printer-busy-patch").hidden'), false);
  assert.equal(await evaluate('document.querySelector("#state-stamp").hidden'), false);
  await click('#prepare-state-stage [data-row="3"] .state-row-hit');
  assert.equal(await evaluate('document.querySelector(\'#prepare-state-stage [data-row="3"]\').getAttribute("aria-selected")'), 'true');
  await screenshot('prototype-prepare-state-printing.png');
  await click('#prepare-state-back');
  assert.equal(await evaluate('document.querySelector("#prepare-state-screen").hidden'), true);
  const readyLoad=waitForLoad();
  await send('Page.navigate', {url:pageUrl});
  await readyLoad;
  await click('#explore-toys');
  await click('#explore-toys-anywhere');
  await click('#open-prepare-print');
  await click('#prepare-print-back');
  assert.equal(await evaluate('document.querySelector("#model-detail-screen").hidden'), false);
  assert.deepEqual(errors, [], '浏览器无脚本异常');
  console.log('PASS: HTML高保真、单耗材、颜色不匹配、无耗材弹层交互、选择、拖动、三盘3D预览和返回、延时摄影、切换打印机、开始打印、四视口；截图：'+shots);
} finally {
  socket?.close();
  chrome.kill();
}
