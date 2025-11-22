import { state } from './state.js';
import { trace } from './config.js';
import { idbGet, idbPut, idbDelete } from '/db.js'; // your existing helpers

const FALLBACK_KEYS = { progress: 'sf_userProgress_fallback', guestId: 'sf_guestId_fallback' };

export async function getGuestIdFromStorage(){
  try { const rec = await idbGet('meta', 'skillflexGuestId'); if (rec && rec.value) return rec.value; } catch {}
  try { const v = localStorage.getItem(FALLBACK_KEYS.guestId); if (v) return v; } catch {}
  return null;
}
export async function setGuestIdPersisted(value){
  try { await idbPut('meta', { key: 'skillflexGuestId', value }); } catch {}
  try { localStorage.setItem(FALLBACK_KEYS.guestId, value); } catch {}
}
export async function getProgressFromStorage(){
  try { const rec = await idbGet('progress', 'userProgress'); if (rec && rec.data) return rec.data; } catch {}
  try { const raw = localStorage.getItem(FALLBACK_KEYS.progress); if (raw) return JSON.parse(raw); } catch {}
  return null;
}
export async function saveLocalGuestProgress(){
  try { await idbPut('progress', { key: 'userProgress', data: state }); }
  catch (e) { trace('IDB write failed, falling back to localStorage:', e); }
  try { localStorage.setItem(FALLBACK_KEYS.progress, JSON.stringify(state)); } catch {}
}
export async function idbClearJwt(){ try { await idbDelete('meta','jwt'); } catch {} }

export function persistOnBackground(){
  window.addEventListener('pagehide', () => { try { window.dispatchEvent(new Event('sf:persist')); } catch {} });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { try { window.dispatchEvent(new Event('sf:persist')); } catch {} }
  });
}

export { idbGet, idbPut, idbDelete };
