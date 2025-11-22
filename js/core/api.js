import { DEBUG, trace } from './config.js';
import { getToken } from './state.js';

export async function sfetch(input, init = {}){
  const _fetch = window.fetch.bind(window);
  try {
    const url = (typeof input === 'string') ? input : input.url;
    const headers = Object.assign({}, init.headers || {});
    if (headers.Authorization) headers.Authorization = headers.Authorization.replace(/Bearer\s+.+/i, 'Bearer ***');
    trace('fetch→', { url, method: (init.method || 'GET'), headers });
    const res = await _fetch(input, init);
    if (DEBUG) { try { const body = await res.clone().text(); trace('fetch←', { url, status: res.status, ok: res.ok, body: body.slice(0, 500) }); } catch {} }
    return res;
  } catch (e) { trace('fetch✖', { error: String(e) }); throw e; }
}
export function authInit(method, body){
  const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
  const init = { method, mode: 'cors', headers };
  const JWT = getToken();
  if (JWT && JWT.includes('.')) headers.Authorization = `Bearer ${JWT}`; else init.credentials = 'include';
  if (body) init.body = JSON.stringify(body);
  return init;
}
