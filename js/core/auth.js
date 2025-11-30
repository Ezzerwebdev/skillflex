import { API_BASE, USER_TZ } from './config.js';
import { state, getToken, setToken, hasAnyProgress } from './state.js';
import { sfetch, authInit } from './api.js';
import { idbGet, idbPut, idbDelete, getGuestIdFromStorage, setGuestIdPersisted, getProgressFromStorage, saveLocalGuestProgress } from './storage.js';


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
  const marketingNav = document.getElementById('marketing-nav');
  if (!loginButton || !logoutButton || !authPill) return;

  if (getToken()) {
    loginButton.hidden  = true; logoutButton.hidden = false; authPill.hidden = false;
    loginButton.removeAttribute('href'); loginButton.removeAttribute('aria-label');
    loginButton.onclick = null; loginButton.dataset.notready = '0'; loginButton.title = '';
    if (marketingNav) marketingNav.hidden = true;
    return;
  }

  authPill.hidden = true; logoutButton.hidden = true; loginButton.hidden = false;
  if (marketingNav) marketingNav.hidden = false;
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
