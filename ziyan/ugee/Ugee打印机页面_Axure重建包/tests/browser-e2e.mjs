import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const prototypeRoot = path.resolve(import.meta.dirname, '..');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ugee-prototype-'));
const previewPath = path.join(prototypeRoot, 'prototype-preview.png');
const pageUrl = pathToFileURL(path.join(prototypeRoot, 'index.html')).href;

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--remote-debugging-port=0',
  `--user-data-dir=${profileDir}`,
  '--window-size=390,844',
  pageUrl
], { stdio: 'ignore' });

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

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
  const events = [];
  let sequence = 0;

  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
      return;
    }
    events.push(message);
  });

  return {
    events,
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  const port = await waitForDevToolsPort();
  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
  const target = targets.find((item) => item.type === 'page');
  assert(target, 'No browser page target was found.');

  const cdp = connectCdp(target.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  await cdp.send('Log.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true
  });
  await cdp.send('Page.reload');
  await delay(700);

  const evaluation = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const queueToggle = document.querySelector('#queue-toggle');
      const queue = document.querySelector('#print-queue');
      queueToggle.click();
      const queueOpened = !queue.hidden && queueToggle.getAttribute('aria-expanded') === 'true';

      const pause = document.querySelector('#pause-print');
      pause.click();
      const pauseWorked = pause.textContent.includes('继续') && document.querySelector('#task-state').textContent === '已暂停';

      const soundSwitch = document.querySelector('[data-control="sound"] .switch');
      soundSwitch.click();
      const switchWorked = soundSwitch.getAttribute('aria-pressed') === 'false';

      const carousel = document.querySelector('#control-carousel');
      carousel.scrollLeft = carousel.scrollWidth;
      carousel.dispatchEvent(new Event('scroll'));
      await new Promise(resolve => setTimeout(resolve, 40));
      const carouselWorked = document.querySelectorAll('.carousel-dots span')[1].classList.contains('is-active');
      const carouselMetrics = {
        scrollLeft: carousel.scrollLeft,
        scrollWidth: carousel.scrollWidth,
        clientWidth: carousel.clientWidth,
        dotClasses: [...document.querySelectorAll('.carousel-dots span')].map(dot => dot.className)
      };

      pause.click();
      queueToggle.click();
      soundSwitch.click();
      carousel.scrollLeft = 0;
      carousel.dispatchEvent(new Event('scroll'));
      await new Promise(resolve => setTimeout(resolve, 1900));

      return {
        viewport: { width: document.documentElement.clientWidth, height: innerHeight },
        controls: document.querySelectorAll('.control-item').length,
        queueOpened,
        pauseWorked,
        switchWorked,
        carouselWorked,
        carouselMetrics,
        pageHeight: document.documentElement.scrollHeight
      };
    })()`
  });

  const result = evaluation.result.value;
  assert(result.viewport.width === 390, `Expected a 390px viewport, got ${result.viewport.width}px.`);
  assert(result.controls === 4, `Expected four controls, got ${result.controls}.`);
  assert(result.queueOpened, 'Queue dropdown did not open.');
  assert(result.pauseWorked, 'Pause control did not update state.');
  assert(result.switchWorked, 'Control switch did not toggle.');
  assert(result.carouselWorked, 'Carousel pagination did not update.');

  const layout = await cdp.send('Page.getLayoutMetrics');
  const screenshot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: {
      x: 0,
      y: 0,
      width: 390,
      height: Math.ceil(layout.cssContentSize.height),
      scale: 1
    }
  });
  fs.writeFileSync(previewPath, Buffer.from(screenshot.data, 'base64'));

  const browserErrors = cdp.events.filter((event) =>
    event.method === 'Runtime.exceptionThrown' ||
    (event.method === 'Log.entryAdded' && ['error', 'warning'].includes(event.params.entry.level))
  );
  assert(browserErrors.length === 0, `Browser emitted ${browserErrors.length} error/warning event(s).`);

  console.log(JSON.stringify({ ...result, browserErrors: 0, previewPath }, null, 2));
  cdp.close();
} finally {
  chrome.kill();
  await new Promise((resolve) => {
    if (chrome.exitCode !== null) resolve();
    else chrome.once('exit', resolve);
    setTimeout(resolve, 1000);
  });
  if (path.resolve(profileDir).startsWith(path.resolve(os.tmpdir()))) {
    try {
      fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    } catch {
      // Chrome can briefly retain Windows profile locks; the OS temp directory remains the safe fallback.
    }
  }
}
