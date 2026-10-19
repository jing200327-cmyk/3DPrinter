import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const prototypeRoot = path.resolve(import.meta.dirname, '..');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ziyan-pairing-prototype-'));
const previewPath = path.join(prototypeRoot, 'prototype-preview.png');
const wlanErrorPreviewPath = path.join(prototypeRoot, 'prototype-wlan-error.png');
const passwordErrorPreviewPath = path.join(prototypeRoot, 'prototype-password-error.png');
const finalPreviewPath = path.join(prototypeRoot, 'prototype-final.png');
const readyPreviewPath = path.join(prototypeRoot, 'prototype-ready.png');
const printerSelectPreviewPath = path.join(prototypeRoot, 'prototype-printer-select.png');
const homeWifiPreviewPath = path.join(prototypeRoot, 'prototype-home-wifi.png');
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

async function evaluate(cdp, expression) {
  const response = await cdp.send('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression });
  return response.result.value;
}

async function saveScreenshot(cdp, targetPath) {
  const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(targetPath, Buffer.from(screenshot.data, 'base64'));
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
  await cdp.send('Accessibility.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await cdp.send('Page.reload');
  await delay(600);

  const journey = await evaluate(cdp, `(async () => {
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const activeScreen = () => document.querySelector('.app-screen.is-active')?.dataset.screen;

    const startAssetLoaded = document.querySelector('#start-reference').complete && document.querySelector('#start-reference').naturalWidth > 0;
    document.querySelector('#add-printer').click();
    const locationPrompt = document.querySelector('#location-dialog').open;
    const locationPromptCopy = document.querySelector('#location-dialog p').textContent;
    document.querySelector('#location-cancel').click();
    await wait(0);
    const cancelStayedOnSelect = activeScreen() === 'printer-select' && !document.querySelector('#location-dialog').open;

    document.querySelector('.reference-back').click();
    document.querySelector('#add-printer').click();
    document.querySelector('#location-settings').click();
    await wait(0);
    const locationSettingsOpened = activeScreen() === 'system-settings' && !document.querySelector('#settings-location-view').hidden;
    document.querySelector('#settings-back').click();

    const selectScreen = document.querySelector('#screen-printer-select');
    const selectShell = selectScreen.getBoundingClientRect();
    const selectCover = document.querySelector('#printer-select-cover');
    const coverRect = selectCover?.getBoundingClientRect();
    const printerSelectCovered = Boolean(coverRect) &&
      Math.round(coverRect.width) === Math.round(selectShell.width) &&
      Math.round(coverRect.bottom) === Math.round(selectShell.bottom) &&
      coverRect.top > selectShell.top + selectShell.height * 0.85 &&
      getComputedStyle(selectCover).backgroundColor === 'rgb(255, 255, 255)';

    document.querySelector('#printer-type').click();
    const readyAssetsLoaded = ['#power-reference', '#network-reference'].every(selector => {
      const image = document.querySelector(selector);
      return image.complete && image.naturalWidth > 0;
    });
    document.querySelector('#ready-next').click();
    const hotspotNextRemoved = !document.querySelector('#hotspot-next');
    const hotspotActions = [...document.querySelectorAll('#screen-hotspot .sticky-action button')];
    const openWlanLabel = document.querySelector('#open-wlan').textContent.trim();
    const hotspotExampleImage = document.querySelector('#wifi-example-reference');
    const hotspotExampleLoaded = hotspotExampleImage.complete && hotspotExampleImage.naturalWidth > 0 &&
      decodeURI(hotspotExampleImage.currentSrc).endsWith('WiFi设置示意图.jpg');
    const hotspotReturnHint = document.querySelector('#screen-hotspot .return-hint').textContent.trim();

    document.querySelector('#open-wlan').click();
    const wlanSettingsOpened = activeScreen() === 'system-settings' && !document.querySelector('#settings-wlan-view').hidden;
    const defaultConnectedNetwork = document.querySelector('.system-network.is-connected strong')?.textContent;
    document.querySelector('#settings-back').click();
    const directReturnActive = activeScreen();
    const directReturnBlocked = document.querySelector('#notice-dialog').open;
    const directReturnMessage = document.querySelector('#notice-message').textContent;

    return { startAssetLoaded, locationPrompt, locationPromptCopy, cancelStayedOnSelect, locationSettingsOpened, readyAssetsLoaded, printerSelectCovered, hotspotNextRemoved, hotspotActionCount: hotspotActions.length, openWlanLabel, hotspotExampleLoaded, hotspotReturnHint, wlanSettingsOpened, defaultConnectedNetwork, directReturnActive, directReturnBlocked, directReturnMessage, active: activeScreen() };
  })()`);

  assert(journey.startAssetLoaded, 'Start-page reference image did not load.');
  assert(journey.locationPrompt, 'Location permission prompt did not open.');
  assert(journey.locationPromptCopy === '连接打印机前需要开启APP位置权限', 'Location permission prompt copy is incorrect.');
  assert(journey.cancelStayedOnSelect, 'Cancelling location prompt did not remain on printer selection.');
  assert(journey.locationSettingsOpened, 'Location settings simulation did not open.');
  assert(journey.readyAssetsLoaded, 'Printer preparation reference images did not load.');
  assert(journey.printerSelectCovered, 'Printer selection page must hide the "not now" row behind a white block.');
  assert(journey.hotspotNextRemoved && journey.hotspotActionCount === 1, 'Hotspot page must keep only the WLAN action button.');
  assert(journey.openWlanLabel === '前往设置 WLAN', 'Hotspot page WLAN action label changed unexpectedly.');
  assert(journey.hotspotExampleLoaded, 'Hotspot page must reuse the WiFi settings illustration image.');
  assert(journey.hotspotReturnHint === 'i设置好后返回，将自动进入网络配置', 'Hotspot return hint must describe the automatic jump to network configuration.');
  assert(journey.wlanSettingsOpened, 'WLAN settings simulation did not open.');
  assert(journey.defaultConnectedNetwork === 'Home_5G', 'WLAN settings must initially remain connected to Home_5G.');
  assert(journey.directReturnBlocked && journey.directReturnActive === 'hotspot', 'Returning without selecting the printer hotspot must show the block notice on the hotspot page.');
  assert(journey.directReturnMessage === '你还没有连接到打印机WiFi，请返回设置连接打印机WiFi热点', 'Missing-printer-hotspot message is incorrect.');
  await saveScreenshot(cdp, wlanErrorPreviewPath);

  const hotspotConnection = await evaluate(cdp, `(() => {
    document.querySelector('#notice-confirm').click();
    document.querySelector('#open-wlan').click();
    document.querySelector('#wlan-other').click();
    document.querySelector('#settings-back').click();
    const otherWifiBlocked = document.querySelector('#notice-dialog').open;
    const otherWifiActive = document.querySelector('.app-screen.is-active')?.dataset.screen;
    const otherWifiMessage = document.querySelector('#notice-message').textContent;
    document.querySelector('#notice-confirm').click();
    document.querySelector('#open-wlan').click();
    document.querySelector('#wlan-printer').click();
    const printerSelected = document.querySelector('#wlan-printer').classList.contains('is-connected');
    document.querySelector('#settings-back').click();
    return {
      otherWifiBlocked,
      otherWifiActive,
      otherWifiMessage,
      printerSelected,
      successMessage: document.querySelector('#toast').textContent,
      active: document.querySelector('.app-screen.is-active')?.dataset.screen
    };
  })()`);

  assert(hotspotConnection.otherWifiBlocked && hotspotConnection.otherWifiActive === 'hotspot', 'Connecting another WiFi must return to the hotspot page with the block notice.');
  assert(hotspotConnection.otherWifiMessage === '你还没有连接到打印机WiFi，请返回设置连接打印机WiFi热点', 'Other-WiFi blocking message is incorrect.');
  assert(hotspotConnection.printerSelected && hotspotConnection.active === 'home-wifi', 'Selecting Ugee Funbox-AP must jump straight to the network configuration page.');
  assert(hotspotConnection.successMessage === '已连接 Ugee Funbox-AP，可为打印机配置家庭 WiFi', 'Printer-hotspot success message is incorrect.');

  await delay(100);
  await saveScreenshot(cdp, homeWifiPreviewPath);

  const passwordFailure = await evaluate(cdp, `(() => {
    const wifiExample = document.querySelector('#wifi-example-reference');
    const wifiContent = document.querySelector('.wifi-content');
    const onHomeWifi = document.querySelector('.app-screen.is-active')?.dataset.screen === 'home-wifi';
    document.querySelector('#screen-home-wifi .flow-header [data-back]').click();
    const backToHotspot = document.querySelector('.app-screen.is-active')?.dataset.screen === 'hotspot';
    document.querySelector('#open-wlan').click();
    document.querySelector('#settings-back').click();
    const rejoinedHomeWifi = document.querySelector('.app-screen.is-active')?.dataset.screen === 'home-wifi';
    const password = document.querySelector('#home-wifi-password');
    password.value = '87654321';
    password.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#connect-home-wifi').click();
    return {
      dialogOpen: document.querySelector('#notice-dialog').open,
      message: document.querySelector('#notice-message').textContent,
      markedInvalid: password.getAttribute('aria-invalid') === 'true',
      connectingStarted: document.querySelector('#connecting-dialog').open,
      wifiExampleLoaded: wifiExample.complete && wifiExample.naturalWidth > 0 && decodeURI(wifiExample.currentSrc).endsWith('WiFi设置示意图.jpg'),
      networkHeroRemoved: !document.querySelector('.wifi-hero'),
      titleAtTop: document.querySelector('.wifi-content .copy-section').getBoundingClientRect().top < wifiContent.getBoundingClientRect().top + 30,
      primaryBackground: getComputedStyle(document.querySelector('#connect-home-wifi')).backgroundColor,
      onHomeWifi,
      backToHotspot,
      rejoinedHomeWifi
    };
  })()`);

  assert(passwordFailure.onHomeWifi && passwordFailure.backToHotspot, 'Leaving the network configuration page must return to the hotspot page.');
  assert(passwordFailure.rejoinedHomeWifi, 'Re-entering WLAN with the printer hotspot selected must jump back to the network configuration page.');
  assert(passwordFailure.dialogOpen && passwordFailure.markedInvalid && !passwordFailure.connectingStarted, 'Incorrect Home_5G password must fail before configuration starts.');
  assert(passwordFailure.message === '连接失败：请检查：1.WiFi密码是否正确；2.在点击连接前手机是否连接上打印机WiFi热点', 'Home WiFi failure message is incorrect.');
  assert(passwordFailure.wifiExampleLoaded, 'Hotspot page must load the WiFi settings example image.');
  assert(passwordFailure.networkHeroRemoved && passwordFailure.titleAtTop, 'Home WiFi heading and form must start at the top with no hero block.');
  assert(passwordFailure.primaryBackground === 'rgb(103, 91, 230)', 'The pairing flow primary action must use the blue-purple theme.');
  await saveScreenshot(cdp, passwordErrorPreviewPath);

  const connection = await evaluate(cdp, `(async () => {
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    document.querySelector('#notice-confirm').click();
    const password = document.querySelector('#home-wifi-password');
    password.value = '12345678';
    password.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#connect-home-wifi').click();
    const waitingDialogOpened = document.querySelector('#connecting-dialog').open;
    await wait(3150);
    const successPromptVisible = !document.querySelector('#connection-success').hidden;
    await wait(1000);
    const finalScreenVisible = document.querySelector('#screen-print-ready').classList.contains('is-active');
    /* 终页已改为真实 DOM：标题 + 打印机已连接图标文案 + 三步耗材图文 + 底部双按钮 */
    const backButton = document.querySelector('#print-ready-back');
    const backRect = backButton.getBoundingClientRect();
    const steps = [...document.querySelectorAll('.filament-step')];
    const gotoFeed = document.querySelector('#goto-filament');
    const gotoPrint = document.querySelector('#goto-print');
    const feedRect = gotoFeed.getBoundingClientRect();
    const printRect = gotoPrint.getBoundingClientRect();
    return {
      waitingDialogOpened,
      successPromptVisible,
      finalScreenVisible,
      finalTitle: document.querySelector('#print-ready-title').textContent,
      connectedTitle: document.querySelector('.connected-banner h2').textContent,
      hasCheckIcon: Boolean(document.querySelector('.connected-check svg')),
      stepTitles: steps.map((step) => step.querySelector('h3').textContent),
      mediaCount: document.querySelectorAll('.filament-media-placeholder').length,
      mediaTags: [...document.querySelectorAll('.filament-media-tag')].map((node) => node.textContent),
      backButton: {
        label: backButton.getAttribute('aria-label'),
        width: Math.round(backRect.width),
        height: Math.round(backRect.height),
        inViewport: backRect.top >= 0 && backRect.bottom <= innerHeight
      },
      actions: {
        feedText: gotoFeed.textContent,
        printText: gotoPrint.textContent,
        feedIsLeft: feedRect.left < printRect.left,
        feedHeight: Math.round(feedRect.height),
        printHeight: Math.round(printRect.height),
        inViewport: feedRect.top >= 0 && printRect.bottom <= innerHeight
      }
    };
  })()`);

  assert(connection.waitingDialogOpened, 'Network configuration waiting dialog did not open.');
  assert(connection.successPromptVisible, 'Connection success prompt did not appear after three seconds.');
  assert(connection.finalScreenVisible, 'Flow did not advance to print preparation.');
  assert(connection.finalTitle === '打印前准备', `The print-preparation title must stay 打印前准备: ${connection.finalTitle}`);
  assert(connection.connectedTitle === '打印机已连接', `The connected copy must stay 打印机已连接: ${connection.connectedTitle}`);
  assert(connection.hasCheckIcon, 'The connected check icon is missing.');
  assert(JSON.stringify(connection.stepTitles) === JSON.stringify(['插入耗材', '进料', '观察喷嘴']), `The three filament steps are wrong: ${JSON.stringify(connection.stepTitles)}`);
  assert(connection.mediaCount === 6 && JSON.stringify(connection.mediaTags) === JSON.stringify(['图片1', '图片2', '图片3', '图片4', '图片5', '图片6']), `The six filament placeholders are wrong: ${JSON.stringify(connection.mediaTags)}`);
  assert(connection.backButton.label === '返回打印机打印页面' && connection.backButton.width >= 44 && connection.backButton.height >= 44 && connection.backButton.inViewport, `The back button is not usable: ${JSON.stringify(connection.backButton)}`);
  assert(connection.actions.feedText === '去进料' && connection.actions.printText === '去打印' && connection.actions.feedIsLeft, `The bottom actions are wrong: ${JSON.stringify(connection.actions)}`);
  assert(connection.actions.feedHeight >= 44 && connection.actions.printHeight >= 44 && connection.actions.inViewport, `The bottom actions must be reachable: ${JSON.stringify(connection.actions)}`);
  await saveScreenshot(cdp, finalPreviewPath);

  // 左上角回退：真实跳转到自研款打印机打印页面，导航时执行上下文会被销毁，忽略该次求值结果。
  await evaluate(cdp, `(() => { document.querySelector('#print-ready-back').click(); return true; })()`).catch(() => {});
  await delay(1200);
  const finishNavigation = await evaluate(cdp, `({ title: document.title, path: decodeURI(location.pathname), search: location.search })`);
  assert(finishNavigation.title === '自研款打印机打印页面原型' && finishNavigation.path.endsWith('dayinji/自研款打印机打印页面原型/index.html'), `The back button did not open the self-developed printer page: ${JSON.stringify(finishNavigation)}`);
  await cdp.send('Page.navigate', { url: pageUrl });
  await delay(600);

  await evaluate(cdp, `(() => { showScreen('printer-ready'); return true; })()`);
  await delay(80);
  await saveScreenshot(cdp, readyPreviewPath);

  await evaluate(cdp, `(() => { showScreen('printer-select'); return true; })()`);
  await delay(80);
  await saveScreenshot(cdp, printerSelectPreviewPath);

  await evaluate(cdp, `(() => { showScreen('hotspot'); return true; })()`);
  await delay(80);
  await saveScreenshot(cdp, previewPath);

  const responsiveLayouts = [];
  for (const width of [320, 768, 1024, 1440]) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: width <= 390 });
    const metrics = await evaluate(cdp, `(() => ({
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      shellWidth: Math.round(document.querySelector('.phone-shell').getBoundingClientRect().width)
    }))()`);
    responsiveLayouts.push(metrics);
  }
  responsiveLayouts.forEach((layout) => {
    assert(layout.documentWidth === layout.viewportWidth, `Horizontal overflow detected at ${layout.viewportWidth}px.`);
    assert(layout.shellWidth === Math.min(layout.viewportWidth, 390), `Unexpected phone shell width at ${layout.viewportWidth}px.`);
  });

  // 深链：从打印页原型的「配置新的打印机」进入时携带 ?screen=printer-select
  await cdp.send('Page.navigate', { url: `${pageUrl}?screen=printer-select` });
  await delay(700);
  const deepLink = await evaluate(cdp, `({
    active: document.querySelector('.app-screen.is-active')?.dataset.screen,
    title: document.querySelector('#printer-select-title')?.textContent,
    startHidden: document.querySelector('#screen-start').hidden
  })`);
  assert(deepLink.active === 'printer-select' && deepLink.title === '选择要设置的打印机' && deepLink.startHidden, `Deep link into the pairing flow did not open 选择要设置的打印机: ${JSON.stringify(deepLink)}`);

  const accessibilityTree = await cdp.send('Accessibility.getFullAXTree');
  const unnamedButtons = accessibilityTree.nodes.filter((node) => node.role?.value === 'button' && !node.name?.value?.trim());
  assert(unnamedButtons.length === 0, `Found ${unnamedButtons.length} button(s) without accessible names.`);

  const browserErrors = cdp.events.filter((event) =>
    event.method === 'Runtime.exceptionThrown' ||
    (event.method === 'Log.entryAdded' && ['error', 'warning'].includes(event.params.entry.level))
  );
  assert(browserErrors.length === 0, `Browser emitted ${browserErrors.length} error/warning event(s).`);

  console.log(JSON.stringify({ journey, hotspotConnection, passwordFailure, connection, responsiveLayouts, unnamedButtons: 0, browserErrors: 0, previewPath, wlanErrorPreviewPath, passwordErrorPreviewPath, readyPreviewPath, finalPreviewPath, printerSelectPreviewPath, homeWifiPreviewPath }, null, 2));
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
      // The OS temp directory remains the safe fallback if Chrome briefly retains a lock.
    }
  }
}
