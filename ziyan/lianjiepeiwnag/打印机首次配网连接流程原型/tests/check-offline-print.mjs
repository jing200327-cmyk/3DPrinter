import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

// 使用独立无头 Chrome 和真实鼠标/键盘事件验证整条原型链路。
const root = path.resolve(import.meta.dirname, '..');
const url = process.argv[2] || pathToFileURL(path.join(root, 'index.html')).href;
const shots = process.env.OFFLINE_SHOTS || path.join(os.tmpdir(), 'offline-print-shots');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'offline-print-chrome-'));
fs.mkdirSync(shots, { recursive: true });
const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=0',
  `--user-data-dir=${profile}`, '--window-size=390,844', 'about:blank'
], { stdio: 'ignore' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;
let count = 0;
const errors = [];
try {
  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await sleep(100);
  const port = fs.readFileSync(portFile, 'utf8').split(/\r?\n/)[0];
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  const pending = new Map();
  let sequence = 0;
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (pending.has(message.id)) {
      const task = pending.get(message.id);
      pending.delete(message.id);
      message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') errors.push(message.params.entry.text);
  };
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const read = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true });
    assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const check = async (expression, message) => { assert.ok(await read(expression), message); count++; };
  const wait = async (expression, timeout = 8000) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) { if (await read(expression)) return; await sleep(80); }
    assert.fail(`等待超时: ${expression}`);
  };
  const click = async selector => {
    await sleep(320); // 等待现有页面/底部弹层入场动画稳定，再发送真实鼠标事件。
    const point = await read(`(() => { const e=document.querySelector(${JSON.stringify(selector)}); if(!e)return null; const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
    assert.ok(point, `缺少可点击元素 ${selector}`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
    await sleep(100);
  };
  const shot = async name => {
    await sleep(220);
    const result = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(shots, `${name}.png`), Buffer.from(result.data, 'base64'));
  };
  const active = name => `!document.querySelector('[data-screen="${name}"]').hidden`;
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url });
  await wait('Boolean(window.__joinShare)');
  await check('Boolean(document.querySelector(".offline-start-entry"))', '首页必须有无网打印入口');
  await shot('01-home');
  await click('#screen-start .offline-start-entry');
  await wait(active('offline-guide'));
  await check('document.querySelector("#offline-guide-title").textContent === "连接打印机热点页"', '引导页名称');
  await check('document.querySelector("#screen-offline-guide").textContent.includes("长按打印机蓝色按钮开启打印机热点")', '蓝色按钮指引');
  await shot('02-guide');
  await click('#offline-connect');
  await check('document.querySelector("#offline-connecting").open', '点击连接显示等待态');
  await shot('03-connecting');
  await wait(active('offline-success'));
  await shot('04-connected');
  await wait(active('offline-library'));
  await check('document.querySelectorAll(".offline-model").length >= 9', '至少三行模型');
  await check('getComputedStyle(document.querySelector("#offline-model-grid")).gridTemplateColumns.split(" ").length === 3', '三列展示');
  await shot('05-library-ai');
  await click('.offline-model');
  await check('document.querySelector("#offline-upload").open && !document.querySelector("#screen-offline-library").hidden', '上传保留原页并显示遮罩');
  await check('document.querySelector("#offline-upload-copy").textContent === "正在将模型上传云端完成切片"', 'AI上传文案');
  await shot('06-upload-ai');
  await wait('!document.querySelector("#offline-upload").open');
  await check('document.querySelector("#toast").textContent === "上传成功，打印机准备开始打印"', '成功Toast');
  await click('#offline-tab-slices');
  await check('document.querySelector("#offline-tab-slices").getAttribute("aria-selected") === "true"', '右侧切片分区可切换');
  await shot('07-library-slices');
  await click('.offline-model');
  await check('document.querySelector("#offline-upload-copy").textContent === "正在将切片文件传给打印机"', '切片上传文案');
  await shot('08-upload-slice');
  await wait('!document.querySelector("#offline-upload").open');
  await click('#offline-import-local');
  await wait(active('offline-files'));
  await shot('09-system-files');
  await check('document.querySelector("#offline-print-local").disabled', '未选文件时不可打印');
  await click('[data-offline-file="3"]');
  await check('document.querySelector("#offline-print-local").disabled', 'STL不可选择');
  await check('document.querySelector("#toast").textContent.includes("仅支持 gcode")', '非gcode点击拦截');
  await click('[data-offline-file="2"]');
  await check('document.querySelector("#offline-print-local").disabled', '超过100MB的gcode不可选择');
  await click('[data-offline-file="0"]');
  await check('!document.querySelector("#offline-print-local").disabled', 'gcode可选择');
  await shot('10-gcode-selected');
  await click('#offline-print-local');
  await check('document.querySelector("#offline-upload").open', '本地gcode进入传输');
  await wait('!document.querySelector("#offline-upload").open');
  await wait(active('offline-library'));
  await click('#offline-library-back');
  await wait(active('offline-guide'));
  await click('#offline-connect');
  await click('#offline-demo-timeout');
  await check('document.querySelector("#offline-timeout").open', '模拟超时异常');
  await shot('11-timeout');
  await click('#offline-retry');
  await check('document.querySelector("#offline-connecting").open', '重试重新连接');
  await click('#offline-demo-success');
  await wait(active('offline-library'));
  await click('#offline-library-back');
  await click('#offline-guide-back');
  await wait(active('start'));
  await click('#screen-start .offline-start-entry');
  await click('#offline-connect');
  await click('#offline-cancel-connect');
  await sleep(5200);
  await check(`${active('offline-guide')} && !document.querySelector('#offline-connecting').open`, '取消连接后不被残留计时器跳转');
  await click('#screen-offline-guide summary');
  await click('#offline-connect-result');
  for (const key of ['ArrowDown', 'Enter']) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode: key === 'Enter' ? 13 : 40 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: key === 'Enter' ? 13 : 40 });
  }
  await click('#offline-connect');
  await wait('document.querySelector("#offline-timeout").open');
  await check(active('offline-guide'), '按所选结果自动超时并保留引导页');
  await click('#offline-timeout-back');
  await click('#offline-guide-back');
  // 保留原有添加打印机链路。
  await click('#add-printer');
  await wait(active('printer-select'));
  await check('document.querySelectorAll("img").length > 0 && [...document.querySelectorAll("#offline-model-grid img")].every(i => i.complete && i.naturalWidth > 0)', '模型图片均有效');
  for (const width of [320, 430]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 740, deviceScaleFactor: 1, mobile: true });
    const deepLink = new URL(url);
    deepLink.searchParams.set('screen', 'offline-library');
    await send('Page.navigate', { url: deepLink.href });
    await wait('Boolean(document.querySelector(".offline-model"))');
    await check('document.documentElement.scrollWidth <= innerWidth', `${width}px视口没有横向溢出`);
    await check('document.querySelector("#offline-import-local").getBoundingClientRect().bottom <= innerHeight', `${width}px视口底部按钮可见`);
    await shot(`12-library-${width}`);
  }
  assert.deepEqual(errors, [], '浏览器无错误');
  console.log(JSON.stringify({ passed: count, errors, screenshots: shots }, null, 2));
} finally {
  socket?.close();
  chrome.kill();
}
