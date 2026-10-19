/* 添加打印机：真实浏览器点击、归属拦截、连接状态及窄屏布局验收。 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'printer-add-'));
const shots = process.env.PRINTER_SCREENSHOTS || profile;
const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=0',
  `--user-data-dir=${profile}`, '--window-size=375,812', pathToFileURL(path.join(root, 'index.html')).href
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
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
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
      const x = r.left + r.width/2, y = r.top + r.height/2;
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
  await evaluate('document.fonts.ready.then(() => true)');
  await click('#printer-switch');
  assert.equal(await evaluate('document.querySelector("#other-printers-heading")?.textContent'), '其它打印机');
  assert.deepEqual(await evaluate('[...document.querySelectorAll("#other-printers-list .printer-name")].map(el=>el.textContent)'), ['UG-01','UG-02']);
  assert.equal(await evaluate('document.querySelector("#printer-ug01 .printer-status")'), null);
  await screenshot('prototype-add-printer.png');
  await click('#printer-ug01');
  assert.equal(await evaluate('document.querySelector("#printer-bound-dialog").open'), true);
  assert.match(await evaluate('document.querySelector("#printer-bound-dialog").textContent'), /当前该打印机已被其它用户绑定/);
  assert.equal(await evaluate('document.querySelector("#my-printers-list #printer-ug01")'), null);
  await screenshot('prototype-add-printer-bound.png');
  await click('#printer-bound-confirm');
  assert.equal(await evaluate('document.activeElement.id'), 'printer-ug01');
  await send('Input.dispatchKeyEvent', {type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
  await send('Input.dispatchKeyEvent', {type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  assert.equal(await evaluate('document.querySelector("#printer-bound-dialog").open'), true);
  await send('Input.dispatchKeyEvent', {type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await send('Input.dispatchKeyEvent', {type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await click('#printer-ug02');
  assert.equal(await evaluate('document.querySelector("#my-printers-list #printer-ug02 .printer-status").textContent'), '已连接');
  assert.equal(await evaluate('document.querySelectorAll("#my-printers-list .printer-card").length'), 3);
  assert.equal(await evaluate('document.querySelectorAll("#other-printers-list .printer-card").length'), 1);
  assert.equal(await evaluate('document.querySelectorAll(".printer-card[aria-pressed=true]").length'), 1);
  await screenshot('prototype-add-printer-connected.png');
  await click('#printer-ug02');
  await click('#add-printer-back');
  await click('#printer-switch');
  assert.equal(await evaluate('document.querySelectorAll("#my-printers-list #printer-ug02").length'), 1);
  for (const [width,height] of [[320,568],[375,812],[768,1024],[1440,900]]) {
    await send('Emulation.setDeviceMetricsOverride', {width,height,deviceScaleFactor:1,mobile:false});
    const geometry = await evaluate(`(() => {
      const page=document.querySelector('#add-printer-screen');
      const mine=document.querySelector('#my-printers-list .printer-card').getBoundingClientRect();
      const other=document.querySelector('#printer-ug01').getBoundingClientRect();
      const cta=document.querySelector('#configure-new-printer').getBoundingClientRect();
      return {overflow:page.scrollWidth>page.clientWidth,aligned:Math.abs(mine.width-other.width)<1,
        overlap:other.bottom>cta.top};
    })()`);
    assert.deepEqual(geometry, {overflow:false,aligned:true,overlap:false}, `${width}×${height}布局`);
    await click('#printer-ug01');
    await click('#printer-bound-confirm');
  }
  await click('#open-share-printer');
  assert.equal(await evaluate('document.querySelector("#share-printer-screen").hidden'), false);
  await click('#share-printer-back');
  assert.equal(await evaluate('document.querySelector("#other-printers-list #printer-ug01") !== null'), true);
  await click('#configure-new-printer');
  assert.match(await evaluate('location.href'), /打印机首次配网连接流程原型\/index\.html\?screen=printer-select|%E6%89%93%E5%8D%B0.*screen=printer-select/);
  assert.deepEqual(errors, [], '浏览器无异常');
  console.log('PASS: UG-01 归属拦截、UG-02 连接与去重、返回保留、键盘、四种视口、分享入口、首次配网跳转；截图：'+shots);
} finally {
  socket?.close();
  chrome.kill();
}
