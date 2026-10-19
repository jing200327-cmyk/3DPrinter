/** 临时线上验证：确认已部署版本携带 r006 资源，且「齿轮往返不吞提醒条」的修复在线上生效。 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const base = (process.argv[2] || '').replace(/\/$/, '');
const pageUrl = base + '/' + encodeURI('dayinji/自研款打印机打印页面原型/index.html');
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ziyan-fwonline-'));
const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--remote-debugging-port=0', `--user-data-dir=${profileDir}`,
  '--window-size=375,812', pageUrl,
], { stdio: 'ignore' });

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
let port = '';
for (let i = 0; i < 150; i += 1) {
  const f = path.join(profileDir, 'DevToolsActivePort');
  if (fs.existsSync(f)) { port = fs.readFileSync(f, 'utf8').split(/\r?\n/)[0]; break; }
  await delay(100);
}
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const target = list.find((t) => t.type === 'page');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => socket.addEventListener('open', r));
let id = 0;
const pend = new Map();
socket.addEventListener('message', ({ data }) => {
  const m = JSON.parse(data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
});
const send = (method, params = {}) => new Promise((res) => {
  id += 1; pend.set(id, res);
  socket.send(JSON.stringify({ id, method, params }));
});
await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
await delay(3200);
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, returnByValue: true })).result.value;

const results = [];
const check = (ok, message) => results.push({ ok, message });

const boot = await ev(`JSON.stringify({
  hasNewState: typeof setFirmwareSettingsHasUpdate === 'function' && typeof setFirmwareUpdateAvailable === 'function',
  hasOldState: typeof setFirmwarePending === 'function',
  scriptSrc: [...document.querySelectorAll('script')].map(s => s.getAttribute('src')).filter(Boolean),
  linkHref: [...document.querySelectorAll('link[rel=stylesheet]')].map(l => l.getAttribute('href'))
})`);
const bootInfo = JSON.parse(boot);
console.log('启动信息：' + boot);
check(bootInfo.hasNewState && !bootInfo.hasOldState, '线上 JS 已是拆分后的新版本（无旧 setFirmwarePending）');
check(bootInfo.scriptSrc.every((s) => s.includes('?v=r006')) && bootInfo.linkHref.every((h) => h.includes('?v=r006')), '线上静态资源都带 ?v=r006');

const banner = () => ev(`(() => { const n = document.querySelector('#firmware-banner'); const cs = getComputedStyle(n); const r = n.getBoundingClientRect(); return JSON.stringify({ hidden: n.hidden, display: cs.display, width: Math.round(r.width), height: Math.round(r.height) }); })()`);
const before = JSON.parse(await banner());
check(!before.hidden && before.display === 'flex' && before.width >= 343 && before.height >= 44, '首页固件提醒条初始可见');

await ev(`document.querySelector('#printer-settings').click()`);
await delay(500);
const inSettings = JSON.parse(await ev(`JSON.stringify({ screen: [...document.querySelectorAll('.reuse-screen')].filter(s => !s.hidden).map(s => s.id), badgeHidden: document.querySelector('#firmware-status-badge').hidden })`));
check(inSettings.screen.length === 1 && inSettings.screen[0] === 'device-settings-screen', '齿轮已进设备设置页');
check(inSettings.badgeHidden, '从齿轮进来时不显示橙色「新的固件版本可用」');
await ev(`document.querySelector('#open-firmware-version').click()`);
await delay(500);
const rowTarget = await ev(`JSON.stringify([...document.querySelectorAll('.reuse-screen')].filter(s => !s.hidden).map(s => s.id))`);
check(rowTarget.includes('firmware-version-screen'), '从齿轮进来时「固件版本」行落在固件版本页');
await ev(`document.querySelector('#firmware-version-back').click()`);
await delay(400);
await ev(`document.querySelector('#device-settings-back').click()`);
await delay(500);
const after = JSON.parse(await banner());
console.log('齿轮往返后提醒条：' + JSON.stringify(after));
check(!after.hidden && after.display === 'flex' && after.width >= 343 && after.height >= 44, '【本次修复】只进一次设备设置后，首页提醒条依然在');

await ev(`document.querySelector('#firmware-banner').click()`);
await delay(500);
const fromBanner = JSON.parse(await ev(`JSON.stringify({ screen: [...document.querySelectorAll('.reuse-screen')].filter(s => !s.hidden).map(s => s.id), badgeHidden: document.querySelector('#firmware-status-badge').hidden })`));
check(!fromBanner.badgeHidden, '从提醒条进来时橙色文案恢复显示');

const failed = results.filter((r) => !r.ok);
console.log('\n线上固件入口校验：通过 ' + (results.length - failed.length) + ' 项，失败 ' + failed.length + ' 项');
failed.forEach((r) => console.log('  ✗ ' + r.message));

socket.close();
chrome.kill();
if (failed.length) process.exit(1);
