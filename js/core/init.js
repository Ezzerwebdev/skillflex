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
