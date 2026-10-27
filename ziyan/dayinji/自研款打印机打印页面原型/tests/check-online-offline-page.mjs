/* 用法：node tests/check-online-offline-page.mjs <站点根 URL> */
import { createRequire } from 'node:module';
const base = (process.argv[2] || 'http://127.0.0.1:8714').replace(/\/+$/, '') + '/';
process.env.PRINTER_OFFLINE_URL = new URL(encodeURI('dayinji/自研款打印机打印页面原型/index-offline.html'), base).href;
createRequire(import.meta.url)('./offline-reconnect-e2e.cjs');
