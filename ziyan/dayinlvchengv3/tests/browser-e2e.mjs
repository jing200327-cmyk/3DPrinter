import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ziyan-v3-journey-'));
const pageUrl = pathToFileURL(path.join(root, 'index.html')).href;
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function waitForPort() {
  const portFile = path.join(profileDir, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (fs.existsSync(portFile)) return fs.readFileSync(portFile, 'utf8').split(/\r?\n/)[0];
    await delay(100);
  }
  throw new Error('Chrome DevTools port was not created.');
}

function connect(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  let sequence = 0;
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    message.error ? reject(new Error(message.error.message)) : resolve(message.result);
  });
  return {
    ready: new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); }),
    send(method, params = {}) {
      sequence += 1;
      return new Promise((resolve, reject) => { pending.set(sequence, { resolve, reject }); socket.send(JSON.stringify({ id: sequence, method, params })); });
    },
    close() { socket.close(); }
  };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression });
  return result.result.value;
}

async function waitFor(cdp, expression, message) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { if (await evaluate(cdp, expression)) return; } catch {}
    await delay(100);
  }
  throw new Error(message);
}

const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=0', `--user-data-dir=${profileDir}`, '--window-size=390,844', pageUrl], { stdio: 'ignore' });

try {
  const port = await waitForPort();
  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
  const target = targets.find((item) => item.type === 'page');
  assert(target, 'No browser page target was found.');
  const cdp = connect(target.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  await cdp.send('Page.reload');
  await delay(350);

  await evaluate(cdp, `document.querySelector('#print-now').click()`);
  await waitFor(cdp, `!document.querySelector('#screen-settings').hidden`, 'Create it did not open the girls builder page.');
  const builder = await evaluate(cdp, `(() => {
    const cards = [...document.querySelectorAll('[data-task]')];
    return { title: document.querySelector('#settings-title').textContent, notice: !document.querySelector('#printing-notice').hidden, ids: cards.map(card => card.dataset.task), sources: cards.map(card => decodeURI(card.querySelector('img').currentSrc)), loaded: cards.every(card => card.querySelector('img').naturalWidth > 0) };
  })()`);
  assert(builder.title === 'Choose your builder' && builder.notice, `Girls builder page is missing the printing notice: ${JSON.stringify(builder)}`);
  assert(JSON.stringify(builder.ids) === JSON.stringify(['girl-1', 'girl-2']) && builder.loaded, `Girls builder cards did not load: ${JSON.stringify(builder)}`);
  assert(builder.sources[0].endsWith('女孩的打印任务_1.jpg') && builder.sources[1].endsWith('女孩的打印任务_2.jpg'), `Girls builder uses the wrong artwork: ${JSON.stringify(builder)}`);

  await evaluate(cdp, `document.querySelector('[data-task="girl-2"]').click(); document.querySelector('#choose-color').click()`);
  const color = await evaluate(cdp, `(() => ({ title: document.querySelector('#settings-title').textContent, action: document.querySelector('#start-print').textContent, notice: !document.querySelector('#printing-notice').hidden, preview: decodeURI(document.querySelector('#selected-model-image').currentSrc) }))()`);
  assert(color.title === 'Choose  your  color' && color.action === 'Add it' && color.notice && color.preview.endsWith('女孩的打印任务_2.jpg'), `Girls color page is incorrect: ${JSON.stringify(color)}`);

  await evaluate(cdp, `document.querySelector('#start-print').click()`);
  await waitFor(cdp, `document.title === '自研款打印机打印页面原型' && new URLSearchParams(location.search).get('family') === 'multi'`, 'Add it did not return to the multi-account printer queue.');
  const printer = await evaluate(cdp, `(() => ({ status: document.querySelector('#task-panel').dataset.status, count: document.querySelectorAll('[data-queue-task]:not([hidden])').length, girls: [...document.querySelectorAll('[data-owner="girl"]')].length }))()`);
  assert(printer.status === 'printing' && printer.count === 4 && printer.girls === 2, `Add it did not create the expected multi-account queue: ${JSON.stringify(printer)}`);
  cdp.close();
  console.log(JSON.stringify({ builder, color, printer }, null, 2));
} finally {
  chrome.kill();
  await new Promise((resolve) => { if (chrome.exitCode !== null) resolve(); else chrome.once('exit', resolve); setTimeout(resolve, 1000); });
  if (path.resolve(profileDir).startsWith(path.resolve(os.tmpdir()))) { try { fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch {} }
}
