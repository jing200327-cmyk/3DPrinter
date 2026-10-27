/* 3.3.2 离线重连回归入口；账号、10 秒超时、自动重试及页面恢复由同一浏览器用例校验。 */
import { createRequire } from 'node:module';
createRequire(import.meta.url)('./offline-reconnect-e2e.cjs');
