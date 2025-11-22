export const API_BASE = 'https://skillflex.education/api';
export const DEBUG = /[?&]debug=1/.test(location.search) || localStorage.sf_debug === '1';
export const CONFIG = Object.freeze({
  BACKEND_PORTAL_URL: 'https://portal.example.com'
});

const LOGBUF_MAX = 200; const LOGBUF = [];
export function trace(...args){
  try {
    const line = { t: new Date().toISOString(), m: args };
    LOGBUF.push(line); if (LOGBUF.length > LOGBUF_MAX) LOGBUF.shift();
    if (DEBUG) console.log('[SF]', ...args);
  } catch {}
}
export function dumpLog(){ return JSON.stringify(LOGBUF, null, 2); }

export const USER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

if (DEBUG) {
  const isStandalone = (!!window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
    || (window.navigator && window.navigator.standalone === true);
  trace('env', { ua: navigator.userAgent, online: navigator.onLine, standalone: isStandalone, origin: location.origin });
  console.log('APP BUILD TAG >>> modular-split-v1');
}
