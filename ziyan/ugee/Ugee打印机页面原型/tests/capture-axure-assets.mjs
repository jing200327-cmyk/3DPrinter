import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'axure-assets');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ugee-axure-assets-'));
const pageUrl = pathToFileURL(path.join(root, 'index.html')).href;
fs.mkdirSync(outDir, { recursive: true });

const chrome = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=0',
  `--user-data-dir=${profileDir}`, '--window-size=390,1400', pageUrl
], { stdio: 'ignore' });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function port() {
  const file = path.join(profileDir, 'DevToolsActivePort');
  for (let i = 0; i < 80; i += 1) {
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').split(/\r?\n/)[0];
    await delay(100);
  }
  throw new Error('Chrome DevTools port was not created.');
}

function connect(url) {
  const ws = new WebSocket(url);
  const pending = new Map();
  let id = 0;
  ws.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id || !pending.has(message.id)) return;
    const pair = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) pair.reject(new Error(message.error.message));
    else pair.resolve(message.result);
  });
  return {
    ready: new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    }),
    send(method, params = {}) {
      id += 1;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    },
    close() { ws.close(); }
  };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  return result.result.value;
}

async function capture(cdp, selector, name) {
  const rect = await evaluate(cdp, `(() => {
    const node = document.querySelector(${JSON.stringify(selector)});
    const r = node.getBoundingClientRect();
    return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height };
  })()`);
  const shot = await cdp.send('Page.captureScreenshot', {
    format: 'png', captureBeyondViewport: true,
    clip: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, scale: 1 }
  });
  fs.writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(shot.data, 'base64'));
  return { name, ...rect };
}

try {
  const debugPort = await port();
  const targets = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then((r) => r.json());
  const cdp = connect(targets.find((item) => item.type === 'page').webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 1400, deviceScaleFactor: 1, mobile: true });
  await cdp.send('Page.reload');
  await delay(800);

  const assets = [];
  assets.push(await capture(cdp, '.ugee-header', '01-header'));
  assets.push(await capture(cdp, '#timelapse-placeholder', '02-timelapse'));
  assets.push(await capture(cdp, '#task-panel', '03-task-default'));

  await evaluate(cdp, `document.querySelector('#queue-toggle').click()`);
  await delay(250);
  assets.push(await capture(cdp, '#task-panel', '04-task-queue-open'));
  await evaluate(cdp, `document.querySelector('#queue-toggle').click(); document.querySelector('#pause-print').click()`);
  await delay(100);
  assets.push(await capture(cdp, '#task-panel', '05-task-paused'));
  await evaluate(cdp, `document.querySelector('#pause-print').click()`);

  assets.push(await capture(cdp, '.filament-actions', '06-filament'));
  assets.push(await capture(cdp, '.controls-section', '07-controls-page-1'));
  await evaluate(cdp, `(() => { const n = document.querySelector('#control-carousel'); n.scrollLeft = n.scrollWidth; n.dispatchEvent(new Event('scroll')); })()`);
  await delay(300);
  assets.push(await capture(cdp, '.controls-section', '08-controls-page-2'));
  assets.push(await capture(cdp, '.bottom-nav', '09-bottom-nav'));

  fs.writeFileSync(path.join(outDir, 'layout.json'), `${JSON.stringify(assets, null, 2)}\n`);
  console.log(JSON.stringify({ outDir, assets }, null, 2));
  cdp.close();
} finally {
  chrome.kill();
  await delay(500);
  try { fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch {}
}
