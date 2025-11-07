#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"

# 1) Make folders
mkdir -p "$ROOT/js/core" \
         "$ROOT/js/features" \
         "$ROOT/js/features/lesson" \
         "$ROOT/js/features/lesson/steps"

# 2) Write files (heredocs; literal content, no expansion)

# ---------------- js/main.js ----------------
cat > "$ROOT/js/main.js" <<'JS'
import { safeInitialize } from './core/init.js';
import { persistOnBackground } from './core/storage.js';

document.addEventListener('DOMContentLoaded', safeInitialize);
persistOnBackground();
JS

# ---------------- js/core/config.js ----------------
cat > "$ROOT/js/core/config.js" <<'JS'
export const API_BASE = 'https://skillflex.education/api';
export const DEBUG = /[?&]debug=1/.test(location.search) || localStorage.sf_debug === '1';

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
JS

# ---------------- js/core/state.js ----------------
cat > "$ROOT/js/core/state.js" <<'JS'
export const state = {
  coins: 0, streak: 0, completedToday: [], selections: {},
  lesson: null, idx: 0, score: 0, answered: false, retries: 0,
  select: null, order: [], stepStart: 0, lessonStart: 0,
  text: '', pairs: [], lessonCoinsPending: 0, lessonLocked: false,
  lastSyncedCoins: 0, coinsCapRemaining: null, _resetMatchPairs: null
};
let _JWT = null; export function getToken(){ return _JWT; } export function setToken(t){ _JWT = t; }
if (typeof window !== 'undefined') { Object.defineProperty(window, 'state', { get: () => state }); }
export function hasAnyProgress(){ return (state.coins > 0) || (Array.isArray(state.completedToday) && state.completedToday.length > 0); }
JS

# ---------------- js/core/api.js ----------------
cat > "$ROOT/js/core/api.js" <<'JS'
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
JS

# ---------------- js/core/storage.js ----------------
cat > "$ROOT/js/core/storage.js" <<'JS'
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
JS

# ---------------- js/core/auth.js ----------------
cat > "$ROOT/js/core/auth.js" <<'JS'
import { API_BASE, USER_TZ } from './config.js';
import { state, getToken, setToken, hasAnyProgress } from './state.js';
import { sfetch, authInit } from './api.js';
import { idbGet, idbPut, idbDelete, getGuestIdFromStorage, setGuestIdPersisted, getProgressFromStorage, saveLocalGuestProgress } from './storage.js';
import { showSaveNudge } from '/ui.js';

let GUEST_ID = null; export function getGuestId(){ return GUEST_ID; }
export async function getOrSetGuestId(){ if (getToken()) return null; const existing = await getGuestIdFromStorage(); if (existing) return (GUEST_ID = existing); const newId = crypto.randomUUID(); await setGuestIdPersisted(newId); return (GUEST_ID = newId); }

export function updateUiCounters(){
  const coinsEl = document.querySelector('#coins'); const streakEl = document.querySelector('#streak');
  if (coinsEl && streakEl) { const previewCoins = state.coins + (state.lessonCoinsPending || 0); coinsEl.textContent = `🪙 ${previewCoins}`; streakEl.textContent = `🔥 ${state.streak}`; }
}

export async function fetchUserProgress(){
  if (!getToken()) return;
  try {
    const res = await sfetch(`${API_BASE}/game/my-progress`, authInit('GET'));
    if (!res.ok) throw new Error(`my-progress ${res.status}`);
    const { coins = 0, streak = 0 } = await res.json();
    const serverCoins  = Number(coins); const serverStreak = Number(streak);
    state.coins  = Math.max(state.coins  || 0, serverCoins);
    state.streak = Math.max(state.streak || 0, serverStreak);
    state.lastSyncedCoins = Math.max(state.lastSyncedCoins || 0, serverCoins);
    updateUiCounters();
  } catch (err) { console.error('Could not fetch user progress:', err); }
}

export async function mergeGuestProgressWithAccount(){
  if (!getToken()) return;
  if (!GUEST_ID) GUEST_ID = await getGuestIdFromStorage();
  if (!GUEST_ID) { console.warn('No guest ID found; skipping merge.'); return; }
  const localData = await getProgressFromStorage();
  if (!localData) { console.warn('No local guest progress found; skipping merge.'); return; }
  const hasAny = Number(localData.coins) > 0 || Number(localData.streak) > 0 || (Array.isArray(localData.completedToday) && localData.completedToday.length > 0);
  if (!hasAny) { console.warn('Skip merge: no local progress'); return; }

  const deltas = { coins_earned: Math.max(0, Number(localData.coins || 0)) };
  if (Number(localData.streak) > 0) deltas.streak_earned = 1;
  const sent = { guestId: GUEST_ID, tz: USER_TZ, progress: deltas };

  try {
    const res  = await sfetch(`${API_BASE}/game/merge-progress`, authInit('POST', sent));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`merge-progress ${res.status}: ${JSON.stringify(data)}`);

    if (typeof data.coins  === 'number') state.coins  = data.coins;
    if (typeof data.streak === 'number') state.streak = data.streak;
    state.lastSyncedCoins = Math.max(state.lastSyncedCoins || 0, state.coins);
    updateUiCounters();

    if (Object.prototype.hasOwnProperty.call(data, 'remaining_today')) {
      state.coinsCapRemaining = Number.isFinite(data.remaining_today) ? data.remaining_today : null;
    }

    try { await idbDelete('progress', 'userProgress'); } catch {}
    try { await idbDelete('meta', 'skillflexGuestId'); } catch {}
    try { localStorage.removeItem('sf_userProgress_fallback'); } catch {}
    try { localStorage.removeItem('sf_guestId_fallback'); } catch {}
    GUEST_ID = null;
  } catch (error) { console.error('Failed to merge guest progress:', error); }
}

export async function updateUserProgress({ streakEarned = false } = {}){
  if (!getToken()) return;
  const deltaCoins = Math.max(0, (state.coins || 0) - (state.lastSyncedCoins || 0));
  const payload = { tz: USER_TZ, progress: { coins: state.coins, streak: state.streak } };
  if (deltaCoins > 0) payload.progress.coins_earned = deltaCoins;
  if (streakEarned)   payload.progress.streak_earned = 1;

  try {
    const res  = await sfetch(`${API_BASE}/game/merge-progress`, authInit('POST', payload));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`merge-progress ${res.status}: ${JSON.stringify(data)}`);

    if (typeof data.coins  === 'number') state.coins  = data.coins;
    if (typeof data.streak === 'number') state.streak = data.streak;
    state.lastSyncedCoins = Math.max(state.lastSyncedCoins || 0, state.coins);
    updateUiCounters();

    try {
      if (data && typeof data.remaining_today === 'number') {
        const left = data.remaining_today;
        const f = document.querySelector('#feedback'); if (!f) return;
        if (left <= 0 || data.cap_reached) {
          f.textContent = 'Daily coin limit reached. Come back tomorrow!'; f.className='feedback-toast bad'; f.hidden=false; setTimeout(()=>f.hidden=true,1200);
        } else if (left <= 20) {
          f.textContent = `You’re close to the daily coin limit. ${left} more today.`; f.className='feedback-toast bad'; f.hidden=false; setTimeout(()=>f.hidden=true,1200);
        }
      }
    } catch {}
  } catch (err) { console.error('Failed to update user progress:', err); }
}

export async function logout(){ await idbDelete('meta', 'jwt'); setToken(null); GUEST_ID = null; Object.assign(state, { coins: 0, streak: 0, completedToday: [], coinsCapRemaining: null }); }

export function getLoginDeepLink(){
  const redirect = encodeURIComponent(location.origin);
  const base = 'https://skillflex.education/login';
  return GUEST_ID ? `${base}?guestGameId=${GUEST_ID}&redirect=${redirect}` : `${base}?redirect=${redirect}`;
}

export function updateLoginButton(){
  const loginButton  = document.getElementById('login-button');
  const logoutButton = document.getElementById('logout-button');
  const authPill     = document.getElementById('auth-pill');
  if (!loginButton || !logoutButton || !authPill) return;

  if (getToken()) {
    loginButton.hidden  = true; logoutButton.hidden = false; authPill.hidden = false;
    loginButton.removeAttribute('href'); loginButton.removeAttribute('aria-label');
    loginButton.onclick = null; loginButton.dataset.notready = '0'; loginButton.title = '';
    return;
  }

  authPill.hidden = true; logoutButton.hidden = true; loginButton.hidden = false;
  loginButton.textContent = 'Save my coins! 🪙';
  loginButton.href = getLoginDeepLink();
  loginButton.setAttribute('aria-label', 'Sign up or log in to save your coins');

  const notReady = !hasAnyProgress();
  loginButton.dataset.notready = notReady ? '1' : '0';
  loginButton.title = notReady ? 'Do one quick challenge first, then save your coins!' : 'Save my coins! 🪙';

  loginButton.onclick = async (e) => {
    if (getToken()) return;
    if (!hasAnyProgress()) {
      e.preventDefault();
      showSaveNudge(() => { const hub = document.querySelector('#challengeHubContainer'); if (hub) hub.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      return;
    }
    e.preventDefault();
    if (!GUEST_ID) GUEST_ID = await getOrSetGuestId();
    await saveLocalGuestProgress();
    await new Promise(r => setTimeout(r, 50));
    location.href = getLoginDeepLink();
  };
}
JS

# ---------------- js/core/router.js ----------------
cat > "$ROOT/js/core/router.js" <<'JS'
import { renderLesson } from '../features/lesson/index.js';
import { renderChallengeHub } from '../features/activities.js';

export function router(){
  const app = document.querySelector('#app'); if (!app) return;
  const path = location.pathname;
  if (/^\/lesson\//.test(path)) {
    document.body.classList.add('in-lesson'); app.classList.add('lesson-active');
    const lessonPath = path.substring('/lesson/'.length); return renderLesson(lessonPath);
  }
  document.body.classList.remove('in-lesson'); app.classList.remove('lesson-active');
  const homeTpl = document.getElementById('homeTpl');
  if (homeTpl) { app.innerHTML = homeTpl.innerHTML; renderChallengeHub(); }
  else { app.innerHTML = '<div class="error-container"><h2>Error</h2><p>Home template missing.</p></div>'; }
}
export function goHome(){ history.pushState({}, '', '/'); router(); }
JS

# ---------------- js/core/init.js ----------------
cat > "$ROOT/js/core/init.js" <<'JS'
import { trace } from './config.js';
import { state, setToken, getToken } from './state.js';
import { router } from './router.js';
import { idbGet, getGuestIdFromStorage, getProgressFromStorage } from './storage.js';
import { updateLoginButton, fetchUserProgress, mergeGuestProgressWithAccount } from './auth.js';

function checkDate(){
  const today = new Date().toDateString();
  const lastVisited = localStorage.getItem('sf_lastVisited');
  if (lastVisited !== today) {
    state.completedToday = []; state.coinsCapRemaining = null; localStorage.setItem('sf_lastVisited', today);
  }
}
function checkStreak(){
  if (getToken()) return;
  const today = new Date(); today.setHours(0,0,0,0);
  const lastDoneStr = localStorage.getItem('sf_lastDone'); if (!lastDoneStr) return;
  const lastDone = new Date(lastDoneStr); lastDone.setHours(0,0,0,0);
  const diffDays = Math.floor((today - lastDone) / 86400000);
  if (diffDays > 1) { state.streak = 0; }
}

export async function initializeApp(){
  trace('init:start');
  if (!document.querySelector('#app')) throw new Error('#app not found in DOM');
  if (!document.getElementById('homeTpl')) throw new Error('#homeTpl <template> missing');

  const urlParams = new URLSearchParams(window.location.search);
  const incomingToken = urlParams.get('token');
  if (incomingToken) {
    setToken(incomingToken);
    await (await import('./storage.js')).idbPut('meta', { key: 'jwt', value: incomingToken });
    history.replaceState(null, '', '/');
    try {
      const last = localStorage.getItem('sf_lastDone');
      if (last) { const d = new Date(last); d.setHours(0,0,0,0); const today = new Date(); today.setHours(0,0,0,0); if (d < today) localStorage.removeItem('sf_lastDone'); }
    } catch {}
  } else {
    const storedToken = await idbGet('meta', 'jwt');
    if (storedToken && storedToken.value) setToken(storedToken.value);
  }

  updateLoginButton();

  if (getToken()) {
    trace('auth', 'User is LOGGED IN.');
    const gid = await getGuestIdFromStorage();
    if (gid) { await mergeGuestProgressWithAccount(); await new Promise(r => setTimeout(r, 50)); }
    await fetchUserProgress();
  } else {
    trace('auth', 'User is a GUEST.');
    const stored = await getProgressFromStorage();
    if (stored) Object.assign(state, stored);
  }

  updateLoginButton();

  document.body.addEventListener('click', e => {
    const a = e.target.closest('a[data-link]'); if (!a) return;
    e.preventDefault(); history.pushState({}, '', a.getAttribute('href')); router();
  });
  window.addEventListener('popstate', router);

  checkDate(); checkStreak(); router();
  trace('init:done');
}

export async function safeInitialize(){
  try { await initializeApp(); }
  catch(e){ console.error('FATAL initializeApp error:', e);
    const el=document.getElementById('panic'); if(el){ el.textContent='⚠️ '+(e?.message||String(e)); el.style.display='block'; }
  }
}
JS

# ---------------- js/features/lesson/ui.js ----------------
cat > "$ROOT/js/features/lesson/ui.js" <<'JS'
export function setProgress(i, t){ const fill = document.querySelector('#progressFill'); if (fill) fill.style.width = Math.round((i/t)*100) + '%'; }
export function enableNextWhenReady(ready){ const btn = document.querySelector('#btnNext'); if (btn) btn.disabled = !ready; }
export function feedback(msg, isGood){ const f = document.querySelector('#feedback'); if (!f) return; f.textContent = msg; f.className = 'feedback-toast ' + (isGood ? 'good' : 'bad'); f.hidden = false; setTimeout(() => f.hidden = true, 1200); }
export const PRAISE = ['Great job! 🚀','You’re on fire! 🔥','Super star! 🌟','High five! 🙌','Nailed it! 💪'];
export function randomPraise(){ return PRAISE[Math.floor(Math.random() * PRAISE.length)]; }
export function burstConfetti(){ const count = window.innerWidth < 420 ? 40 : 80; for (let i = 0; i < count; i++) { const p = document.createElement('div'); p.className = 'confetti'; p.style.left = Math.random() * 100 + 'vw'; p.style.animationDelay = Math.random() * .3 + 's'; document.body.appendChild(p); setTimeout(() => p.remove(), 1500); } }
export function normalizeText(s){ return String(s || '').toLowerCase().normalize('NFKD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ').trim(); }
JS

# ---------------- js/features/lesson/steps/fillBlank.js ----------------
cat > "$ROOT/js/features/lesson/steps/fillBlank.js" <<'JS'
import { enableNextWhenReady } from '../ui.js';
import { state } from '../../../core/state.js';
export function renderFillBlank(step, host){
  const wrap = document.createElement('div'); wrap.className = 'fill-blank';
  const input = document.createElement('input');
  input.type = 'text'; input.className = 'text-input'; input.placeholder = 'Type your answer…';
  input.autocomplete = 'off'; input.spellcheck = true;
  input.addEventListener('input', () => { state.text = input.value; enableNextWhenReady(state.text.trim().length > 0); });
  wrap.appendChild(input); host.appendChild(wrap); enableNextWhenReady(false);
}
JS

# ---------------- js/features/lesson/steps/matchPairs.js ----------------
cat > "$ROOT/js/features/lesson/steps/matchPairs.js" <<'JS'
import { state } from '../../../core/state.js';
import { enableNextWhenReady } from '../ui.js';
export function renderMatchPairs(step, host){
  const PAIRS_NEXT_MODE = 'complete';
  const basePairs = Array.isArray(step?.pairs) ? step.pairs : [];
  if (!basePairs.length) { try { enableNextWhenReady(false); } catch {} ; return; }
  const leftCol  = document.createElement('div'); const rightCol = document.createElement('div');
  leftCol.className  = 'match-col left'; rightCol.className = 'match-col right';
  const leftLabel  = document.createElement('h3'); const rightLabel = document.createElement('h3');
  leftLabel.className  = 'col-label'; rightLabel.className = 'col-label';
  leftLabel.textContent  = step.leftLabel  || 'Prefixes'; rightLabel.textContent = step.rightLabel || 'Base words';
  leftCol.appendChild(leftLabel); rightCol.appendChild(rightLabel);
  const leftItems  = basePairs.map((p, i) => ({ id: `L${i}`, text: String(p.left)  }));
  const rightItems = basePairs.map((p, i) => ({ id: `R${i}`, text: String(p.right) }));
  const fy = (a)=>{ const x=[...a]; for(let i=x.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [x[i],x[j]]=[x[j],x[i]]; } return x; };
  const L = fy(leftItems); const R = fy(rightItems);
  const leftBtns  = new Map(); const rightBtns = new Map();
  const leftToRight = new Map(); const rightToLeft = new Map(); let pendingLeftId = null;
  const status = document.createElement('div'); status.className = 'match-status';
  const actions = document.createElement('div'); actions.className = 'match-actions';
  const btnReset = document.createElement('button'); btnReset.className='link-reset'; btnReset.type='button'; btnReset.textContent='Reset pairs';
  const hardReset = () => { leftToRight.clear(); rightToLeft.clear(); pendingLeftId = null; updateStatePairs(); refreshUI(); };
  btnReset.onclick = hardReset; actions.appendChild(btnReset); state._resetMatchPairs = hardReset;
  const safeEnable = (b) => { try { enableNextWhenReady(!!b); } catch {} };
  function makeBtn(text, onClick){ const b=document.createElement('button'); b.type='button'; b.className='option-card'; b.textContent=text; b.addEventListener('click', onClick, { passive:true }); b.setAttribute('aria-pressed','false'); return b; }
  function updateStatePairs(){ state.pairs = Array.from(leftToRight.entries()).map(([lid, rid]) => { const l = leftItems.find(x => x.id === lid); const r = rightItems.find(x => x.id === rid); return (l && r) ? { left: l.text, right: r.text } : null; }).filter(Boolean); }
  function readyToProceed(){ return (PAIRS_NEXT_MODE === 'any') ? leftToRight.size > 0 : (leftToRight.size === leftItems.length && leftItems.length > 0); }
  function refreshUI(){
    leftBtns.forEach((btn, id) => { const sel = pendingLeftId === id; const chosen = leftToRight.has(id); btn.classList.toggle('sel', sel); btn.classList.toggle('chosen', chosen); btn.setAttribute('aria-pressed', String(sel || chosen)); });
    rightBtns.forEach((btn, id) => { const chosen = rightToLeft.has(id); btn.classList.toggle('chosen', chosen); btn.setAttribute('aria-pressed', String(chosen)); });
    const matched = leftToRight.size, total = leftItems.length; status.innerHTML = `${matched}/${total} matched` + (pendingLeftId ? `<span class="hint"> — pick a base word</span>` : ''); safeEnable(readyToProceed());
  }
  function unpairLeft(lid){ if (!leftToRight.has(lid)) return; const rid = leftToRight.get(lid); leftToRight.delete(lid); rightToLeft.delete(rid); }
  function unpairRight(rid){ if (!rightToLeft.has(rid)) return; const lid = rightToLeft.get(rid); rightToLeft.delete(rid); leftToRight.delete(lid); }
  function selectLeft(lid){ if (state.answered) return; pendingLeftId = (pendingLeftId === lid) ? null : lid; refreshUI(); }
  function pairWithRight(rid){ if (state.answered || !pendingLeftId) return; const lid = pendingLeftId; unpairLeft(lid); unpairRight(rid); leftToRight.set(lid, rid); rightToLeft.set(rid, lid); pendingLeftId = null; updateStatePairs(); refreshUI(); }
  L.forEach(item => { const b = makeBtn(item.text, () => selectLeft(item.id)); leftBtns.set(item.id, b); leftCol.appendChild(b); });
  R.forEach(item => { const b = makeBtn(item.text, () => pairWithRight(item.id)); rightBtns.set(item.id, b); rightCol.appendChild(b); });
  const wrap = document.createElement('div'); wrap.className = 'match-pairs'; wrap.appendChild(status); wrap.appendChild(actions); wrap.appendChild(leftCol); wrap.appendChild(rightCol); host.appendChild(wrap);
  state.pairs = []; refreshUI();
}
JS

# ---------------- js/features/lesson/steps/sortItems.js ----------------
cat > "$ROOT/js/features/lesson/steps/sortItems.js" <<'JS'
import { enableNextWhenReady } from '../ui.js';
import { state } from '../../../core/state.js';
export function renderSortItems(step, host){
  const wrap = document.createElement('div'); wrap.className = 'sort-items';
  const bank = document.createElement('div'); const out  = document.createElement('div'); const hint = document.createElement('div');
  bank.className = 'option-grid word-bank'; out.className  = 'option-grid sentence-builder'; hint.className = 'builder-hint'; hint.textContent = 'Tap items to build the order. Tap again to remove.';
  const bankButtons = []; state.order = [];
  function sync(){ state.order = Array.from(out.querySelectorAll('.option-card.word-card.chosen')).map(el => el.textContent); enableNextWhenReady(step.answer && state.order.length === step.answer.length); }
  (step.items || []).forEach((it, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'option-card word-card'; b.textContent = String(it);
    b.onclick = () => { if (state.answered || b.disabled) return; const c = document.createElement('button'); c.type = 'button'; c.className = 'option-card word-card chosen'; c.textContent = String(it); c.dataset.srcIndex = String(i); c.onclick = () => { if (state.answered) return; out.removeChild(c); const src = bankButtons[Number(c.dataset.srcIndex)]; if (src) src.disabled = false; sync(); }; out.appendChild(c); b.disabled = true; sync(); };
    bankButtons[i] = b; bank.appendChild(b);
  });
  wrap.appendChild(hint); wrap.appendChild(out); wrap.appendChild(bank); host.appendChild(wrap); enableNextWhenReady(false);
}
JS

# ---------------- js/features/lesson/steps/trueFalse.js ----------------
cat > "$ROOT/js/features/lesson/steps/trueFalse.js" <<'JS'
import { enableNextWhenReady } from '../ui.js';
import { state } from '../../../core/state.js';
export function renderTrueFalse(step, host){
  const wrap = document.createElement('div'); wrap.className = 'true-false';
  const grid = document.createElement('div'); grid.className = 'option-grid';
  ['True ✅','False ❌'].forEach((label, i) => {
    const card=document.createElement('button'); card.className='option-card'; card.textContent=label;
    card.onclick=()=>{ if (state.answered) return; document.querySelectorAll('.option-card').forEach(c=>c.classList.remove('sel')); card.classList.add('sel'); state.select=i; enableNextWhenReady(true); };
    grid.appendChild(card);
  });
  wrap.appendChild(grid); host.appendChild(wrap); enableNextWhenReady(false);
}
JS

# ---------------- js/features/lesson/index.js ----------------
cat > "$ROOT/js/features/lesson/index.js" <<'JS'
import { state, getToken } from '../../core/state.js';
import { setProgress, feedback, randomPraise, burstConfetti, normalizeText } from './ui.js';
import { updateUserProgress, getOrSetGuestId, updateUiCounters, getLoginDeepLink } from '../../core/auth.js';
import { saveLocalGuestProgress } from '../../core/storage.js';
import { router } from '../../core/router.js';
import { showCompletionModal } from '/ui.js';

async function fetchPack(short){
  const r = await fetch(`/packs/${short}.json`, { cache:'no-cache' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`); return await r.json();
}
function enableNextWhenReady(b){ const btn=document.querySelector('#btnNext'); if (btn) btn.disabled=!b; }

function checkAnswer(step){
  if (step.type === 'select_option') return state.select === step.answer;
  if (step.type === 'order_words') { const exp = Array.isArray(step.answer) ? step.answer : []; const got = Array.isArray(state.order) ? state.order : []; return exp.length === got.length && exp.every((w,i)=>w===got[i]); }
  if (step.type === 'fill_blank') { const answers = Array.isArray(step.answer) ? step.answer.map(normalizeText) : [normalizeText(step.answer)]; return answers.includes(normalizeText(state.text)); }
  if (step.type === 'match_pairs') { const got = new Set((state.pairs||[]).map(p=>`${p.left}::${p.right}`)); const exp = new Set((step.pairs||[]).map(p=>`${p.left}::${p.right}`)); if (got.size !== exp.size) return false; for (const k of exp) if (!got.has(k)) return false; return true; }
  if (step.type === 'sort_items') { const exp = Array.isArray(step.answer) ? step.answer.map(String) : []; const got = Array.isArray(state.order) ? state.order.map(String) : []; return exp.length === got.length && exp.every((w,i)=>w===got[i]); }
  if (step.type === 'true_false') { if (typeof step.answer === 'boolean') return (state.select === 0) === step.answer; return false; }
  return false;
}

function renderStep(step, host){
  if (!host || !step) return; host.innerHTML='';
  if (step.prompt){ const p=document.createElement('p'); p.textContent=step.prompt; host.appendChild(p); }
  if (step.type==='fill_blank') import('./steps/fillBlank.js').then(m=>m.renderFillBlank(step, host));
  else if (step.type==='match_pairs') import('./steps/matchPairs.js').then(m=>m.renderMatchPairs(step, host));
  else if (step.type==='sort_items') import('./steps/sortItems.js').then(m=>m.renderSortItems(step, host));
  else if (step.type==='true_false') import('./steps/trueFalse.js').then(m=>m.renderTrueFalse(step, host));
}

function showNextStep(){
  const btnNext=document.querySelector('#btnNext'); if (btnNext) btnNext.disabled=true;
  state.answered=false; state.retries=0; state.select=null; state.order=[]; state.text=''; state.pairs=[]; state._resetMatchPairs=null;
  const step = state.lesson.steps[state.idx]; setProgress(state.idx, state.lesson.steps.length);
  renderStep(step, document.querySelector('#stepHost')); state.stepStart=Date.now();
}

async function advanceOrFinish(){
  const pack = state.lesson;
  if (state.idx < pack.steps.length - 1) { state.idx++; showNextStep(); return; }
  let streakEarnedThisLesson = false;
  if (!state.completedToday.includes(pack.id)) state.completedToday.push(pack.id);
  const today = new Date(); const lastDoneStr = localStorage.getItem('sf_lastDone');
  const scorePercentage = (state.score / pack.steps.length) * 100;
  if (scorePercentage >= 50 && (!lastDoneStr || new Date(lastDoneStr).toDateString() !== today.toDateString())) { streakEarnedThisLesson = true; }
  localStorage.setItem('sf_lastDone', today.toISOString());
  state.lessonLocked = true;
  let completionBonus = 10;
  if (typeof state.coinsCapRemaining === 'number') { completionBonus = Math.min(completionBonus, Math.max(0, state.coinsCapRemaining)); state.coinsCapRemaining -= completionBonus; }
  state.coins += (state.lessonCoinsPending || 0) + completionBonus; state.lessonCoinsPending = 0;
  if (!getToken() && streakEarnedThisLesson) state.streak++; updateUiCounters();
  if (getToken()) { updateUserProgress({ streakEarned: streakEarnedThisLesson }).catch(()=>{}); }

  const onContinue = async () => {
    if (getToken()) { await updateUserProgress({ streakEarned: streakEarnedThisLesson }); }
    else { await saveLocalGuestProgress(); }
    history.pushState({}, '', '/'); router();
  };
  const extra = !getToken() ? {
    onSave: async () => {
      let gid = await getOrSetGuestId();
      await saveLocalGuestProgress();
      await new Promise(r => setTimeout(r, 50));
      location.href = getLoginDeepLink();
    }
  } : undefined;
  showCompletionModal(state.score, pack.steps.length, onContinue, extra);
}

export async function handleNextClick(){
  if (state.lessonLocked) return;
  const step = state.lesson.steps[state.idx];
  if (state.answered) { advanceOrFinish(); return; }
  const isCorrect = checkAnswer(step);
  if (isCorrect) {
    feedback(randomPraise(), true); burstConfetti(); state.answered = true; state.score++;
    const perStep = 2; let award = perStep;
    if (typeof state.coinsCapRemaining === 'number') { award = Math.min(perStep, Math.max(0, state.coinsCapRemaining)); state.coinsCapRemaining -= award; }
    if (award <= 0) {
      const f=document.querySelector('#feedback'); if (f){ f.textContent='Daily coin limit reached. Progress saved, no more coins today.'; f.className='feedback-toast bad'; f.hidden=false; setTimeout(()=>f.hidden=true,1200); }
    } else { state.lessonCoinsPending += award; }
    updateUiCounters(); setTimeout(advanceOrFinish, 1200);
  } else {
    if (state.retries < 1) {
      state.retries++; feedback('✋ Try once more', false);
      if (step.type === 'match_pairs' && typeof state._resetMatchPairs === 'function') { state._resetMatchPairs(); }
      else { state.select=null; state.order=[]; state.text=''; state.pairs=[]; const btnNext=document.querySelector('#btnNext'); if (btnNext) btnNext.disabled=true; renderStep(step, document.querySelector('#stepHost')); }
      return;
    } else { feedback('❌ Keep going', false); state.answered = true; setTimeout(advanceOrFinish, 1200); }
  }
}

export async function renderLesson(short){
  const lessonTpl = document.getElementById('lessonTpl'); const app = document.querySelector('#app');
  if (!lessonTpl) { app.innerHTML = `<div class="error-container"><h2>Error</h2><p>Could not load the lesson template.</p></div>`; return; }
  app.innerHTML = lessonTpl.innerHTML; await new Promise(resolve => setTimeout(resolve, 0));
  try {
    const pack = await fetchPack(short);
    if (!pack || !pack.steps) throw new Error(`Lesson pack invalid: ${short}`);
    state.lesson = pack; state.idx = 0; state.score = 0; state.lessonCoinsPending = 0; state.lessonLocked = false; state.lessonStart = Date.now();
    const lessonTitleEl = document.querySelector('#lessonTitle'); if (lessonTitleEl) lessonTitleEl.textContent = pack.title || '';
    document.querySelector('#btnBack').onclick = () => { history.pushState({}, '', '/'); router(); };
    document.querySelector('#btnNext').onclick = handleNextClick;
    showNextStep();
  } catch (error) { console.error('Failed to load lesson:', error); app.innerHTML = `<div class="error-container"><h2>Oops!</h2><p>Could not load this lesson.</p></div>`; }
}
JS

echo "Scaffold complete in $ROOT/js"
