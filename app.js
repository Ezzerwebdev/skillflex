/**
* SkillFlex PWA — app.js
* Core application logic, routing, and lesson engine.
* Coins can be earned unlimited times per day; streak increments at most once per day.
*/


// --- MODULE IMPORTS ---
import { showCompletionModal, showSaveNudge } from './ui.js';
import { idbGet, idbPut, idbDelete } from './db.js';
import { installUnitsFeature } from './js/features/units.js?v=1762242680';
import './js/theme.js'; // side-effect import; it auto-inits on DOM ready




// ===== Debug toggle & lightweight logger =====
const DEBUG = /[?&]debug=1/.test(location.search) || localStorage.sf_debug === '1';
const LOGBUF_MAX = 200;
const LOGBUF = [];
function trace(...args){
 try {
   const line = { t: new Date().toISOString(), m: args };
   LOGBUF.push(line); if (LOGBUF.length > LOGBUF_MAX) LOGBUF.shift();
   if (DEBUG) console.log('[SF]', ...args);
 } catch {}
}
window.sfDump = () => JSON.stringify(LOGBUF, null, 2);
// ✅ ADD THIS LINE HERE (DEBUG is defined now)


if (DEBUG) console.log('APP BUILD TAG >>> vMP-2');


// Show quick environment snapshot
const isStandalone =
 (!!window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
 (window.navigator && window.navigator.standalone === true);


trace('env', {
 ua: navigator.userAgent,
 online: navigator.onLine,
 standalone: isStandalone,
 origin: location.origin
});


// ===== Safe fetch wrapper (auto logs + masks token) =====
(function(){
 const _fetch = window.fetch.bind(window);
 window.fetch = async function(input, init = {}) {
   try {
     let url = (typeof input === 'string') ? input : input.url;
      // 🔒 rewrite any absolute API calls to the same-origin proxy
      if (/^https:\/\/skillflex\.education\/api\//.test(url)) {
        url = url.replace(/^https:\/\/skillflex\.education\/api\//, '/api/');
        input = url; // keep Request simple; we only pass string inputs in this app
     }





     const headers = Object.assign({}, init.headers || {});
     if (headers.Authorization) {
       headers.Authorization = headers.Authorization.replace(/Bearer\s+.+/i, 'Bearer ***');
     }
     trace('fetch→', { url, method: (init.method || 'GET'), headers });


     const res = await _fetch(input, init);
     const clone = res.clone();
     let bodyText = '';
     try { bodyText = await clone.text(); } catch {}
     if (bodyText && bodyText.length > 500) bodyText = bodyText.slice(0, 500) + '…';
     trace('fetch←', { url, status: res.status, ok: res.ok, body: bodyText });
     return res;
   } catch (e) {
     trace('fetch✖', { error: String(e) });
     throw e;
   }
 };
})();
// ===== END Debug wrapper =====


// === App Configuration ===
const API_BASE = 'https://skillflex.education/api';
let JWT_TOKEN = null;

// Authoritative window shim (always try to define the accessor)
if (typeof window !== 'undefined') {
  try {
    Object.defineProperty(window, 'JWT_TOKEN', {
      get(){ return JWT_TOKEN; },
      set(v){ JWT_TOKEN = v; },
      configurable: true
    });
  } catch {
    // If a non-configurable data property already exists, initialize from it
    if (typeof window.JWT_TOKEN !== 'undefined') JWT_TOKEN = window.JWT_TOKEN;
  }
// (optional globals if you want)
window.API_BASE = API_BASE;
window.JWT_TOKEN = JWT_TOKEN;

}


// === Auth Redirect (same-tab only) =============================
// No popup. Always go to /login and come back here with ?token=...

async function gotoLoginSameTab(extra = {}) {
  try {
    // Stash guest progress before leaving (safe, fire-and-forget-ish)
    if (!JWT_TOKEN) {
      if (!GUEST_ID) GUEST_ID = await getOrSetGuestId();
      await saveLocalGuestProgress();
      try {
        const markers = (state.completedToday || []).map(id =>
          `lesson:${id}|${state.selections?.subject||'any'}|${state.selections?.year||'any'}|${state.selections?.topic||'any'}`
        );
        localStorage.setItem('sf_guest_markers', JSON.stringify({ date: todayLocalStr(), markers }));
      } catch {}
    }
  } catch {}

  // Reuse your existing deep link builder
  location.assign(getLoginDeepLink());
}

if (typeof window !== 'undefined') window.gotoLoginSameTab = gotoLoginSameTab;

// One delegated handler for all login entry points
document.addEventListener('click', (e) => {
  const btn = e.target.closest('#login-button,[data-action="login"],[data-action="login-email"]');
  if (!btn) return;
  e.preventDefault();
  gotoLoginSameTab();
});


// User timezone for server-side local-day logic
const USER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const DAILY_TARGET = 3;   // require 3 completions per day for streak, but allow more play

// === Auth init (single source of truth for headers/credentials) ===
function authInit(method, body){
 const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
 const init = { method, mode: 'cors', headers };
 if (JWT_TOKEN && JWT_TOKEN.includes('.')) {
   headers.Authorization = `Bearer ${JWT_TOKEN}`;
 } else {
   init.credentials = 'include';
 }
 if (body) init.body = JSON.stringify(body);
 return init;
}


// === Globals & State ===
const $ = s => document.querySelector(s);
let app, coinsEl, streakEl, allActivities = [];
let GUEST_ID;


// --- Safe storage fallbacks for mobile (iOS/Chrome on iOS) ---
const FALLBACK_KEYS = {
 progress: 'sf_userProgress_fallback',
 guestId: 'sf_guestId_fallback',
};


async function getGuestIdFromStorage() {
 try {
   const rec = await idbGet('meta', 'skillflexGuestId');
   if (rec && rec.value) return rec.value;
 } catch {}
 try {
   const v = localStorage.getItem(FALLBACK_KEYS.guestId);
   if (v) return v;
 } catch {}
 return null;
}


async function setGuestIdPersisted(value) {
 try { await idbPut('meta', { key: 'skillflexGuestId', value }); } catch {}
 try { localStorage.setItem(FALLBACK_KEYS.guestId, value); } catch {}
}


async function getProgressFromStorage() {
 try {
   const rec = await idbGet('progress', 'userProgress');
   if (rec && rec.data) return rec.data;
 } catch {}
 try {
   const raw = localStorage.getItem(FALLBACK_KEYS.progress);
   if (raw) return JSON.parse(raw);
 } catch {}
 return null;
}


// ── Daily gating storage keys ───────────────────────────────────────────────
const DAILY_KEYS = {
 date: 'sf_dailyDate',
 index: 'sf_dailyIndex',
 plan: 'sf_dailyPlan',
 meta: 'sf_dailyMeta',
};


// === Daily date helpers ===
function todayLocalStr(){
const d = new Date();
d.setHours(0,0,0,0);
return d.toDateString(); // same format used elsewhere in your app
}




function getDayOfYear(d){
const start = new Date(d.getFullYear(), 0, 0);
return Math.floor((d - start) / 86400000);
}


// === In-memory UI state (source of truth for UI) ===
const state = {
 coins: 0,
 streak: 0,
 completedToday: [],
 selections: {},
 lesson: null,
 idx: 0,
 score: 0,
 answered: false,
 retries: 0,
 select: null,
 order: [],
 stepStart: 0,
 lessonStart: 0,
 text: '',        // for fill_blank typed answer
pairs: [],       // for match_pairs built matches


 // Live preview coins during lesson
 lessonCoinsPending: 0,
 lessonLocked: false,
 // Baseline used to compute deltas for safe server sync
 lastSyncedCoins: 0,
 // Server-provided daily coin cap remaining (null = unknown)
 coinsCapRemaining: null,
 // add inside the state object
dailyPlan: [], // ordered list of today’s lesson objects (id, title, icon)
dailyIndex: 0, // pointer to the CURRENT item in dailyPlan
dailyDate: null, // local day string the plan was generated for
_dailyMeta: null, // {subject,year,topic} snapshot used when the plan was built
};






// Always expose the live state so feature modules share one object
window.state = state;



// ADD ↓↓↓ right after `window.state = state;`


function persistDaily(){
 try {
   localStorage.setItem(DAILY_KEYS.date, state.dailyDate || '');
   localStorage.setItem(DAILY_KEYS.index, String(state.dailyIndex || 0));
   localStorage.setItem(DAILY_KEYS.plan, JSON.stringify(state.dailyPlan || []));
   localStorage.setItem(DAILY_KEYS.meta, JSON.stringify(state._dailyMeta || {}));
 } catch {}
}


function hydrateDaily(){
 try {
   const date = localStorage.getItem(DAILY_KEYS.date);
   const idx = Number(localStorage.getItem(DAILY_KEYS.index) || 0);
   const plan = JSON.parse(localStorage.getItem(DAILY_KEYS.plan) || '[]');
   const meta = JSON.parse(localStorage.getItem(DAILY_KEYS.meta) || '{}');
   state.dailyDate  = date || null;
   state.dailyIndex = Number.isFinite(idx) ? idx : 0;
   state.dailyPlan  = Array.isArray(plan) ? plan : [];
   state._dailyMeta = meta && Object.keys(meta).length ? meta : null;
 } catch {
   state.dailyDate = null;
   state.dailyIndex = 0;
   state.dailyPlan = [];
   state._dailyMeta = null;
 }
}

// ---- Continue card helpers (place right after hydrateDaily) ----
function _keyForSel(sel){ return `${sel?.subject||''}:${sel?.year||''}:${sel?.topic||''}:${sel?.level||''}`; }
function _unitKeys(sel){ const b=_keyForSel(sel); return { plan:`sf_unit_plan:${b}`, uIdx:`sf_unit_index:${b}`, lIdx:`sf_unit_lesson_index:${b}` }; }
function _slug(sel, id){
  const s = String(id || '');
  if (s.includes('/')) return s; // already a full path
  if (!sel?.subject || !sel?.year) return s;
  if (sel.subject === 'maths' && !sel.topic) return `year${sel.year}/maths/${s}`;
  return `year${sel.year}/${sel.subject}/${sel.topic}/${s}`;
}



function renderContinueCard(){
  try{
    const slot = document.getElementById('continueCard');
    const btn  = document.getElementById('continueBtn');
    const meta = document.getElementById('continueMeta');
    if (!slot || !btn || !meta) { return; }

    const sel = JSON.parse(localStorage.getItem('sf_selections_persist') || 'null');
    if (!sel) { slot.hidden = true; return; }

    const K     = _unitKeys(sel);
    const plan  = JSON.parse(localStorage.getItem(K.plan)  || '[]');
    const u     = Number(localStorage.getItem(K.uIdx) || 0);
    const l     = Number(localStorage.getItem(K.lIdx) || 0);
    const unit  = plan[u];
    const lesson = unit?.lessons?.[l];

    // only show if there is meaningful progress
    const hasUnitProgress  = (u > 0) || (l > 0);
    const hasDailyProgress = (Number(state.dailyIndex || 0) > 0);
    const playedToday = (() => {
      try {
        const last = localStorage.getItem('sf_lastDone');
        if (!last) return false;
        const d = new Date(last); d.setHours(0,0,0,0);
        const t = new Date();     t.setHours(0,0,0,0);
        return d.getTime() === t.getTime();
      } catch { return false; }
    })();

    if (!lesson || !(hasUnitProgress || hasDailyProgress || playedToday)) {
      slot.hidden = true;
      return;
    }

    // kid-facing level label from units.js (no duplication)
    const lvl = sel.level ? (window.sfHooks?.levelLabelFor?.(sel.level) || '') : '';
    const parts = [
      (sel.subject||'').toUpperCase(),
      sel.year ? `Y${sel.year}` : '',
      sel.topic || '',
      lvl
    ].filter(Boolean);

    // Prefer the daily plan for guests, so Continue always works
    let nextHref = null;
    if (!JWT_TOKEN && Array.isArray(state.dailyPlan) && state.dailyPlan.length) {
      const idx  = Math.min(Number(state.dailyIndex || 0), state.dailyPlan.length - 1);
      const next = state.dailyPlan[idx];
      if (next?.id) nextHref = `/lesson/${_slug(sel, next.id)}`;
    }
    if (!nextHref && lesson?.id) {
      nextHref = `/lesson/${_slug(sel, lesson.id)}`;
    }
    if (!nextHref) { slot.hidden = true; return; }

   // --- wire the Continue button (replace your old block with this) ---
  btn.href = nextHref;
  // important: do NOT let the global a[data-link] delegate handle this one
  btn.removeAttribute('data-link');

  const go = (e) => {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  if (location.pathname !== nextHref) {
    history.pushState({}, '', nextHref);
  }
  router();
 };

 btn.onclick   = go;                         // single, idempotent handler
 btn.onkeydown = (e) => {                    // keyboard: Enter/Space
  if (e.key === 'Enter' || e.key === ' ') go(e);
 };


    meta.textContent = parts.join(' · ');
    slot.hidden = false;
  } catch {
    try { document.getElementById('continueCard').hidden = true; } catch {}
  }
}





// --- Progress persistence (guest & logged-in) ---
async function getOrSetGuestId() {
 if (JWT_TOKEN) return null;
 const existing = await getGuestIdFromStorage();
 if (existing) return existing;
 const newGuestId = crypto.randomUUID();
 await setGuestIdPersisted(newGuestId);
 return newGuestId;
}

// Keep this near saveLocalGuestProgress
function buildGuestProgressPayload(s) {
  return {
    selections: s?.selections
      ? { subject: s.selections.subject, year: s.selections.year, topic: s.selections.topic }
      : null,
    completedToday: Array.isArray(s?.completedToday) ? [...s.completedToday] : [],
    unitIndex: Number(s?.unitIndex || 0),
    lessonIndex: Number(s?.lessonIndex || 0),
    coinsEarned: Number(s?.coinsEarned || s?.coins || 0),
    updatedAt: Date.now(),
  };
}

async function saveLocalGuestProgress() {
  const s = window.state || {};

  // Logged-in users sync via API; no guest persistence needed.
  if (window.JWT_TOKEN) { updateUiCounters?.(); return; }

  const payload = buildGuestProgressPayload(s);

  // Try IDB first
  try {
    if (typeof idbPut === 'function') {
      if (idbPut.length >= 3) {
        // idbPut(store, key, value)
        await idbPut('progress', 'userProgress', payload);
      } else {
        // idbPut(store, { key, data })
        await idbPut('progress', { key: 'userProgress', data: payload });
      }
    }
  } catch (e) {
    console.warn('IDB write failed, falling back to localStorage:', e);
    try {
      const k = (typeof FALLBACK_KEYS === 'object' && FALLBACK_KEYS?.progress) ? FALLBACK_KEYS.progress : 'sf_guest_progress';
      localStorage.setItem(k, JSON.stringify(payload));
    } catch { /* ignore */ }
  }

  updateUiCounters?.();
}



function updateUiCounters() {
 if (coinsEl && streakEl) {
   const previewCoins = state.coins + (state.lessonCoinsPending || 0);
   coinsEl.textContent  = `🪙 ${previewCoins}`;
   streakEl.textContent = `🔥 ${state.streak}`;
 }
}


async function getLocalGuestProgress() {
 const stored = await getProgressFromStorage();
 if (stored) Object.assign(state, stored);
}


async function fetchUserProgress() {
 if (!JWT_TOKEN) return; // don't gate on navigator.onLine
 try {
   const res = await fetch(`${API_BASE}/game/my-progress`, authInit('GET'));
   if (!res.ok) throw new Error(`my-progress ${res.status}`);
   const { coins = 0, streak = 0 } = await res.json();


   const serverCoins  = Number(coins);
   const serverStreak = Number(streak);


   // never drop local UI below server
   state.coins  = Math.max(state.coins  || 0, serverCoins);
   state.streak = Math.max(state.streak || 0, serverStreak);
   state.lastSyncedCoins = Math.max(state.lastSyncedCoins || 0, serverCoins);


   updateUiCounters();
 } catch (err) {
   console.error('Could not fetch user progress:', err);
 }
}




async function mergeGuestProgressWithAccount() {
  if (!JWT_TOKEN) return; // only run when authenticated

  // Try to load a guest id if we have one (ok if we don't)
  if (!GUEST_ID) GUEST_ID = await getGuestIdFromStorage();

  // Load guest progress (IDB or fallback) — may be null
  const localData = await getProgressFromStorage();

  // Do we have anything worth merging?
  const hasAny =
    (localData && (Number(localData.coins) > 0 ||
      Number(localData.streak) > 0 ||
      (Array.isArray(localData.completedToday) && localData.completedToday.length > 0)));

  if (!hasAny) {
    // Last-resort: use the stash the header writes when clicking “Save my coins!”
    try {
      const stash = JSON.parse(localStorage.getItem('sf_guest_markers') || 'null');
      if (!stash || stash.date !== todayLocalStr() || !Array.isArray(stash.markers) || !stash.markers.length) {
        console.warn('Skip merge: no local progress or markers');
        return;
      }
    } catch { return; }
  }

  try {
    // ✅ Send deltas (additive, never overwrite)
    const deltas = {
      coins_earned: Math.max(0, Number(localData?.coins || 0)),
      ...(Number(localData?.streak) > 0 ? { streak_earned: 1 } : {}),
    };

    // Build activity markers
    const meta = (localData && (localData._dailyMeta)) || state._dailyMeta || {};
    const fromLocal = Array.isArray(localData?.completedToday)
      ? localData.completedToday.map(id =>
          `lesson:${id}|${meta.subject || 'any'}|${meta.year || 'any'}|${meta.topic || 'any'}`
        )
      : [];

    let fromStash = [];
    try {
      const stash = JSON.parse(localStorage.getItem('sf_guest_markers') || 'null');
      if (stash?.date === todayLocalStr() && Array.isArray(stash.markers)) fromStash = stash.markers;
    } catch {}

    const uniq = (arr) => Array.from(new Set(arr));
    const markers = uniq([...fromLocal, ...fromStash]).slice(0, 50); // safety cap

    const sent = {
      tz: USER_TZ,
      guest_activity_markers: markers,
      progress: deltas,
    };
    if (GUEST_ID) sent.guestId = GUEST_ID;

    trace?.('merge:payload', sent);

    const res  = await fetch(`${API_BASE}/game/merge-progress`, authInit('POST', sent));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`merge-progress ${res.status}: ${JSON.stringify(data)}`);

    trace('merge', { sent, data });

    // Prefer server truth
    if (typeof data.coins  === 'number') state.coins  = data.coins;
    if (typeof data.streak === 'number') state.streak = data.streak;
    state.lastSyncedCoins = Math.max(state.lastSyncedCoins || 0, state.coins);
    updateUiCounters();

    // Daily cap echo (if provided)
    if (Object.prototype.hasOwnProperty.call(data, 'remaining_today')) {
      state.coinsCapRemaining = Number.isFinite(data.remaining_today) ? data.remaining_today : null;
    }

    // Clean up guest caches
    try { await idbDelete('progress', 'userProgress'); } catch {}
    try { await idbDelete('meta', 'skillflexGuestId'); } catch {}
    try { localStorage.removeItem('sf_userProgress_fallback'); } catch {}
    try { localStorage.removeItem('sf_guestId_fallback'); } catch {}
    try { localStorage.removeItem('sf_guest_markers'); } catch {}
    GUEST_ID = null;
  } catch (error) {
    console.error('Failed to merge guest progress:', error);
  }
}







async function logout() {
 trace('auth', 'Logging out...');


 await idbDelete('meta', 'jwt');
 try { localStorage.removeItem('sf_jwt'); } catch {}
 JWT_TOKEN = null;
 GUEST_ID = null;
 Object.assign(state, { coins: 0, streak: 0, completedToday: [], coinsCapRemaining: null });
 initializeApp();
}


function updateLoginButton() {
 const loginButton  = document.getElementById('login-button');
 const logoutButton = document.getElementById('logout-button');
 const authPill     = document.getElementById('auth-pill');
 if (!loginButton || !logoutButton || !authPill) return;


 if (JWT_TOKEN) {
   // Logged in
   loginButton.hidden  = true;
   logoutButton.hidden = false;
   authPill.hidden     = false;
   loginButton.removeAttribute('href');
   loginButton.removeAttribute('aria-label');
   loginButton.onclick = null;
   loginButton.dataset.notready = '0';
   loginButton.title = '';
   return;
 }



// Guest (always allow login from header)
authPill.hidden     = true;
logoutButton.hidden = true;
loginButton.hidden  = false;

loginButton.className = 'btn ghost';
loginButton.textContent = 'Log in / Sign up';
loginButton.removeAttribute('href');
loginButton.setAttribute('data-action', 'login');
loginButton.setAttribute('aria-label', 'Log in to save your progress');
loginButton.onclick = null;

loginButton.dataset.notready = '0';
loginButton.title = 'Log in to save your progress';

}


// --- Core Application Logic ---
function checkDate() {
 const today = new Date().toDateString();
 const lastVisited = localStorage.getItem('sf_lastVisited');


 if (lastVisited !== today) {
   state.completedToday = [];            // reset daily completions only
   state.coinsCapRemaining = null;       // unknown until server tells us again
   state.dailyDate = today;              // keep sequence; just stamp today
   localStorage.setItem('sf_lastVisited', today);
   persistDaily();                       // write dailyDate to storage
 }
}




function checkStreak() {
 // Guests only — when logged in, the server is canonical
 if (JWT_TOKEN) return;


 const today = new Date(); today.setHours(0,0,0,0);
 const lastStr = localStorage.getItem('sf_lastStreakDay'); // <- when we last AWARDED a streak
 if (!lastStr) return;


 const last = new Date(lastStr); last.setHours(0,0,0,0);
 const diffDays = Math.floor((today - last) / 86400000);


 if (diffDays > 1) {
   state.streak = 0; // reset locally for guests only
   updateUiCounters();
   saveLocalGuestProgress().catch(() => {});
 }
}


async function router() {
 if (!app) return;
 checkDate();
 checkStreak();


 const path = location.pathname;


 if (/^\/lesson\//.test(path)) {
  const lessonId = decodeURIComponent(path.substring('/lesson/'.length));

  // Ensure we have a plan for today for the current selection set
  try {
    if (state.selections?.subject && state.selections?.year && state.selections?.topic) {
      const potential = allActivities.filter(
        a =>
          a.subject == state.selections.subject &&
          a.year == state.selections.year &&
          a.topic == state.selections.topic
      );
      ensurePlanForToday(potential);
    }
  } catch (e) { /* noop */ }

   // --- NEW: bonus lessons require login (protect deep-links)
  // --- NEW: later steps in the path require login for guests (protect deep-links)
  const planIdx = Array.isArray(state.dailyPlan)
  ? state.dailyPlan.findIndex(x => normalizeId(x.id) === normalizeId(lessonId))
  : -1;

  if (planIdx >= DAILY_TARGET && !JWT_TOKEN) {
  showSaveNudge?.({
    variant: 'post',
    title: 'Next steps need a login',
    message: 'Log in to continue your learning path and keep your coins across devices.',
    onLogin: gotoLoginSameTab,
    onLater: () => {
      history.replaceState({}, '', '/');
      document.body.classList.remove('in-lesson');
      app.classList.remove('lesson-active');
      router();
    }
  });
  history.replaceState({}, '', '/');
  document.body.classList.remove('in-lesson');
  app.classList.remove('lesson-active');
  router();   
  return; // stop routing into the lesson
}



  // 🔒 Units feature gate (if installed):
  //   - false  → block & bounce home with a friendly nudge
  //   - true   → allow (skip daily gate)
  //   - undefined → Units not installed; fall back to daily gate
  const unitsGate = window.sfHooks?.canOpenLessonOverride?.(lessonId);

  if (unitsGate === false) {
    feedback('Finish the previous step in this unit to unlock this one. 🎯', false);
    history.replaceState({}, '', '/');
    document.body.classList.remove('in-lesson');
    app.classList.remove('lesson-active');
    return router();
  }

  // Default daily-path gate only runs when Units isn’t handling gating
  if (unitsGate === undefined && !allowedToOpenLesson(lessonId)) {
    feedback('Finish today’s current challenge to unlock this one. You’ve got this! 🎯', false);
    history.replaceState({}, '', '/');
    document.body.classList.remove('in-lesson');
    app.classList.remove('lesson-active');
    return router();
  }

  document.body.classList.add('in-lesson');
  app.classList.add('lesson-active');
  return renderLesson(lessonId);
}



 /// Home route
document.body.classList.remove('in-lesson');
app.classList.remove('lesson-active');

const homeTplEl = document.getElementById('homeTpl');
if (homeTplEl) {
  app.innerHTML = homeTplEl.innerHTML;

  // reveal the Continue card if we have a saved plan/selection
  try { renderContinueCard(); } catch {}

  // then build the subject/year/topic UI
  renderChallengeHub();
} else {
  console.error('CRITICAL: Home template not found!');
}
}


 function goHome() {
  state.lessonLocked = false;
  state.selections = {};
  try {
    sessionStorage.removeItem('sf_selections');
    localStorage.removeItem('sf_selections_persist'); // << add this
  } catch {}
  history.pushState({}, '', '/');
  router();
 }



async function loadActivities() {
 try {
   if (allActivities.length === 0) {
     const response = await fetch('/custom_activities.json');
     if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
     allActivities = await response.json();
   }
 } catch (error) {
   console.error('Could not load activities:', error);
 }
}


function renderChallengeHub() {
 const hubContainer = document.querySelector('#challengeHubContainer');
 if (!hubContainer) { console.warn('#challengeHubContainer missing'); return; }


 
 // Restore choices (sessionStorage first, then persistent localStorage)
try {
  const raw = sessionStorage.getItem('sf_selections');
  if (raw) {
    state.selections = JSON.parse(raw);
  } else {
    const raw2 = localStorage.getItem('sf_selections_persist');
    if (raw2) state.selections = JSON.parse(raw2);
  }
} catch {}



 const { subject, year, topic } = state.selections || {};


 if (!subject) return renderSelectionStep('subject');
 if (!year)    return renderSelectionStep('year');
 if (!topic)   return renderSelectionStep('topic');

 // ✅ INSERT THIS BLOCK — let a feature take over the hub if it wants
  if (window.sfHooks?.renderHubOverride?.()) {
    updateLoginButton();   // keep header/auth UI in sync
  
    return;                // bail so we don't also render the default hub
  }


 // We have a full selection — draw the daily path UI
 renderDailyChallenges();
 // Keep the header button text/state fresh
 updateLoginButton();


}




function saveSelections() {
  const json = JSON.stringify(state.selections);
  sessionStorage.setItem('sf_selections', json);              // existing
  try { localStorage.setItem('sf_selections_persist', json); } catch {}
}



// Show/hide home-only sections (hero, grown-ups card, trust strip)
function setHomeInfoVisible(show) {
 document.querySelectorAll('.home-hero, .grownups.section, .trust-strip')
   .forEach(el => { if (el) el.hidden = !show; });
}




function renderSelectionStep(step) {
 const hubContainer = $('#challengeHubContainer');
 if (!hubContainer) return;


  let title, options, gridClass = 'selection-grid';
 switch (step) {
   case 'subject':
 title = 'Pick Your Adventure!';
 gridClass = 'selection-grid subject-grid';
   options = {
   english: { label: 'Word & Story Lab', emoji: '📖' },
   maths:   { label: 'Number Quest',     emoji: '🔢' }
 };


 break;


   case 'year':
     title = 'Pick Your Class!';
     options = { '3': '🎒 Year 3 Explorers', '4': '🗺️ Year 4 Adventurers', '5': '🏆 Year 5 Champions', '6': '🚀 Year 6 Trailblazers (Coming Soon!)' };
     break;
   case 'topic':
     title = 'Pick a quest!';
     if (state.selections.subject === 'english') {
           options = { 'spelling': '✍️ Spelling Wizards', 'grammar': '📚 Grammar Heroes' };
         } else {
            options = { 'addition': '➕ Adding Adventurers', 'subtraction': '➖ Subtraction Squad', 'place-value': '🧭 Place Value Pals', 'number-line': '📏 Number Line Hoppers', 'thousands': '⛰️ Thousand Trekkers', 'shapes': '🔺 Shape Explorers', 'roman-numerals': '🏛️ Roman Numeral Rangers' };
         }
          break;
    }
 let backButtonHTML = '';
 if (step !== 'subject') backButtonHTML = `<button id="backBtn" class="btn btn-back">← Go Back</button>`;


 const gridContent = Object.entries(options).map(([key, value]) => {
   if (step === 'subject') {
  return `
    <button
      class="selection-card large-card"
      data-key="${key}"
      type="button"
      aria-label="${value.label}"
    >
      <span class="selection-card-title">${value.label}</span>
      <span class="selection-card-emoji" aria-hidden="true">${value.emoji}</span>
    </button>
  `;
}



   const isComingSoon = typeof value === 'string' && value.includes('Coming Soon');
   return `<button class="selection-card ${isComingSoon ? 'disabled' : ''}" data-key="${key}">${value}</button>`;
 }).join('');


 hubContainer.innerHTML = `
   <div class="selection-step">
     <div class="selection-step-header">${backButtonHTML}<h1>${title}</h1></div>
     <div class="${gridClass}">${gridContent}</div>
   </div>
 `;


 if ($('#backBtn')) {
   $('#backBtn').onclick = () => {
     if (step === 'year') delete state.selections.subject;
     if (step === 'topic') delete state.selections.year;
     saveSelections();
     renderChallengeHub();
   };
 }
 hubContainer.querySelectorAll('.selection-card').forEach(card => {
   card.onclick = () => {
     if (card.classList.contains('disabled')) return;
     state.selections[step] = card.dataset.key;
     saveSelections();
     renderChallengeHub();
   };
 });
 // Home-only sections are visible only on the subject picker
 setHomeInfoVisible(step === 'subject');
}


function simpleHash(str) {
 let hash = 0;
 if (!str) return hash;
 for (let i = 0; i < str.length; i++) {
   const char = str.charCodeAt(i);
   hash = ((hash << 5) - hash) + char;
   hash |= 0;
 }
 return hash;
}


function shuffleArrayCrypto(arr) {
 const a = [...arr];
 for (let i = a.length - 1; i > 0; i--) {
   const u = new Uint32Array(1);
   crypto.getRandomValues(u);
   const j = Math.floor((u[0] / 2**32) * (i + 1));
   [a[i], a[j]] = [a[j], a[i]];
 }
 return a;
}


// ── Duolingo-style daily plan helpers ───────────────────────────────────────
function computeDeterministicPlan(potential){
const d = new Date();
const seed = getDayOfYear(d) + simpleHash((state.selections?.subject||'') + (state.selections?.year||'') + (state.selections?.topic||''));
const ordered = [...potential].sort((a,b) => simpleHash(a.id + seed) - simpleHash(b.id + seed));
// first 3 are the daily core; show up to 5 more as bonus
return ordered.slice(0, Math.min(20, ordered.length));
}




function ensurePlanForToday(potential){
 const today = todayLocalStr();
 const meta = {
   subject: state.selections?.subject,
   year:    state.selections?.year,
   topic:   state.selections?.topic
 };


 const metaChanged = JSON.stringify(meta) !== JSON.stringify(state._dailyMeta || {});
 const needsPlan   = !Array.isArray(state.dailyPlan) || state.dailyPlan.length === 0;


 // Rebuild the full sequence only if meta changed or we have no plan.
 if (metaChanged || needsPlan) {
   state.dailyPlan  = computeDeterministicPlan(potential);
   state.dailyIndex = Number.isFinite(state.dailyIndex) ? state.dailyIndex : 0; // keep progress if set
   state._dailyMeta = meta;
 }


 // New day resets "completedToday" (streak counting), but we DO NOT reset sequence.
 state.dailyDate = today;
 persistDaily();
}






function allowedToOpenLesson(lessonId){
 if (!Array.isArray(state.dailyPlan) || state.dailyPlan.length === 0) return true;
 const idx = state.dailyPlan.findIndex(x => normalizeId(x.id) === normalizeId(lessonId));
 if (idx === -1) return false; // lesson not part of today’s plan
 const curr = Number(state.dailyIndex) || 0;
 return idx <= curr; // can open completed or current, not future
}




// Fun feedback
const PRAISE = [
 'Great job! 🚀',
 'You’re on fire! 🔥',
 'Super star! 🌟',
 'High five! 🙌',
 'Nailed it! 💪'
];
function randomPraise() { return PRAISE[Math.floor(Math.random() * PRAISE.length)]; }
function burstConfetti() {
 const count = window.innerWidth < 420 ? 40 : 80;
 for (let i = 0; i < count; i++) {
   const p = document.createElement('div');
   p.className = 'confetti';
   p.style.left = Math.random() * 100 + 'vw';
   p.style.animationDelay = Math.random() * .3 + 's';
   document.body.appendChild(p);
   setTimeout(() => p.remove(), 1500);
 }
}


async function fetchPack(short) {
 try {
   const r = await fetch(`/packs/${short}.json`, { cache:'no-cache' });
   if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
   return await r.json();
 } catch (e) {
   console.error(`Failed to fetch pack: /packs/${short}.json`, e);
   throw e;
 }
}


function setProgress(i, t) {
 const fill = $('#progressFill');
 if (fill) fill.style.width = Math.round((i/t)*100) + '%';
}


function createOptionGrid(options, onSelect) {
  const grid = document.createElement('div');
  grid.className = 'option-grid';
  options.forEach((opt, i) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'option-card';

    // 🔒 text-only card (no images)
    const text = document.createElement('span');
    text.className = 'option-text';
    text.textContent = String(opt.text);
    card.appendChild(text);

    card.onclick = () => onSelect(i, card);
    grid.appendChild(card);
  });
  return grid;
}



// ===== NEW HELPERS + RENDERERS (place above renderStep) =====
function normalizeText(s) {
 return String(s || '')
   .toLowerCase()
   .normalize('NFKD')
   .replace(/\p{Diacritic}/gu, '')
   .replace(/\s+/g, ' ')
   .trim();
}


function normalizeId(s) {
  return String(s || '').trim().toLowerCase().split('/').pop();
}


function enableNextWhenReady(ready) {
 const btn = document.querySelector('#btnNext');
 if (btn) btn.disabled = !ready;
}



// a) FILL_BLANK — single text field; step.answer: string or string[]
function renderFillBlank(step, host) {
 const wrap = document.createElement('div');
 wrap.className = 'fill-blank';


 const input = document.createElement('input');
 input.type = 'text';
 input.className = 'text-input';
 input.placeholder = 'Type your answer…';
 input.autocomplete = 'off';
 input.spellcheck = true;


 input.addEventListener('input', () => {
   state.text = input.value;
   enableNextWhenReady(state.text.trim().length > 0);
 });


 wrap.appendChild(input);
 host.appendChild(wrap);
 enableNextWhenReady(false);
}


// b) MATCH_PAIRS — simple two columns; build pairs by clicking Left then Right




function renderMatchPairs(step, host) {
 // Enable Next/Check only when all pairs are matched (set to 'any' to enable after first pair)
 const PAIRS_NEXT_MODE = 'complete'; // or 'any'


 // 1) Validate data first (so basePairs exists before anything touches it)
 const basePairs = Array.isArray(step?.pairs) ? step.pairs : [];
 if (!basePairs.length) { try { enableNextWhenReady(false); } catch {} ; return; }


 // 2) Columns + labels
 const leftCol  = document.createElement('div');
 const rightCol = document.createElement('div');
 leftCol.className  = 'match-col left';
 rightCol.className = 'match-col right';


 const leftLabel  = document.createElement('h3');
 const rightLabel = document.createElement('h3');
 leftLabel.className  = 'col-label';
 rightLabel.className = 'col-label';
 leftLabel.textContent  = step.leftLabel  || 'Prefixes';
 rightLabel.textContent = step.rightLabel || 'Base words';
 leftCol.appendChild(leftLabel);
 rightCol.appendChild(rightLabel);


 // 3) Stable items (avoid duplicate-text collisions)
 const leftItems  = basePairs.map((p, i) => ({ id: `L${i}`, text: String(p.left)  }));
 const rightItems = basePairs.map((p, i) => ({ id: `R${i}`, text: String(p.right) }));


 // 4) Shuffle for display only
 function fy(a){ const x=[...a]; for(let i=x.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [x[i],x[j]]=[x[j],x[i]]; } return x; }
 const L = fy(leftItems);
 const R = fy(rightItems);


 // 5) Local state
 const leftBtns  = new Map();
 const rightBtns = new Map();
 const leftToRight = new Map(); // Lid -> Rid
 const rightToLeft = new Map(); // Rid -> Lid
 let pendingLeftId = null;


 // 6) Status + reset
 const status = document.createElement('div');  status.className = 'match-status';
 const actions = document.createElement('div'); actions.className = 'match-actions';
 const btnReset = document.createElement('button');
 btnReset.className = 'link-reset';
 btnReset.type = 'button';
 btnReset.textContent = 'Reset pairs';


 const hardReset = () => {
   leftToRight.clear(); rightToLeft.clear(); pendingLeftId = null;
   updateStatePairs(); refreshUI();
 };
 btnReset.onclick = hardReset;
 actions.appendChild(btnReset);


 // Expose reset so handleNextClick() can clear on redo
 state._resetMatchPairs = hardReset;


 // 7) Helpers
 const safeEnable = (b) => { try { enableNextWhenReady(!!b); } catch {} };


 function makeBtn(text, onClick) {
   const b = document.createElement('button');
   b.type = 'button';
   b.className = 'option-card';
   b.textContent = text;
   b.addEventListener('click', onClick, { passive: true });
   b.setAttribute('aria-pressed', 'false');
   return b;
 }


 function updateStatePairs() {
   state.pairs = Array.from(leftToRight.entries()).map(([lid, rid]) => {
     const l = leftItems.find(x => x.id === lid);
     const r = rightItems.find(x => x.id === rid);
     return (l && r) ? { left: l.text, right: r.text } : null;
   }).filter(Boolean);
 }


 function readyToProceed() {
   if (PAIRS_NEXT_MODE === 'any') return leftToRight.size > 0;
   return leftToRight.size === leftItems.length && leftItems.length > 0;
 }


 function refreshUI() {
   leftBtns.forEach((btn, id) => {
     const sel = pendingLeftId === id;
     const chosen = leftToRight.has(id);
     btn.classList.toggle('sel', sel);
     btn.classList.toggle('chosen', chosen);
     btn.setAttribute('aria-pressed', String(sel || chosen));
   });
   rightBtns.forEach((btn, id) => {
     const chosen = rightToLeft.has(id);
     btn.classList.toggle('chosen', chosen);
     btn.setAttribute('aria-pressed', String(chosen));
   });


   const matched = leftToRight.size, total = leftItems.length;
   status.innerHTML = `${matched}/${total} matched` + (pendingLeftId ? `<span class="hint"> — pick a base word</span>` : '');


   safeEnable(readyToProceed());
 }


 function unpairLeft(lid) {
   if (!leftToRight.has(lid)) return;
   const rid = leftToRight.get(lid);
   leftToRight.delete(lid);
   rightToLeft.delete(rid);
 }
 function unpairRight(rid) {
   if (!rightToLeft.has(rid)) return;
   const lid = rightToLeft.get(rid);
   rightToLeft.delete(rid);
   leftToRight.delete(lid);
 }


 function selectLeft(lid) {
   if (state.answered) return;
   pendingLeftId = (pendingLeftId === lid) ? null : lid;
   refreshUI();
 }
 function pairWithRight(rid) {
   if (state.answered || !pendingLeftId) return;
   const lid = pendingLeftId;
   unpairLeft(lid);
   unpairRight(rid);
   leftToRight.set(lid, rid);
   rightToLeft.set(rid, lid);
   pendingLeftId = null;
   updateStatePairs();
   refreshUI();
 }


 // 8) Build UI
 L.forEach(item => {
   const b = makeBtn(item.text, () => selectLeft(item.id));
   leftBtns.set(item.id, b);
   leftCol.appendChild(b);
 });
 R.forEach(item => {
   const b = makeBtn(item.text, () => pairWithRight(item.id));
   rightBtns.set(item.id, b);
   rightCol.appendChild(b);
 });


 // 9) Mount
 const wrap = document.createElement('div');
 wrap.className = 'match-pairs';
 wrap.appendChild(status);
 wrap.appendChild(actions);
 wrap.appendChild(leftCol);
 wrap.appendChild(rightCol);
 host.appendChild(wrap);


 // 10) Init
 state.pairs = [];
 refreshUI();
}








// c) SORT_ITEMS — click items into order
function renderSortItems(step, host) {
 // ✅ wrapper so the CSS hooks (spacing, sizes) apply
 const wrap = document.createElement('div');
 wrap.className = 'sort-items';


 const bank = document.createElement('div');
 const out  = document.createElement('div');
 const hint = document.createElement('div');


 bank.className = 'option-grid word-bank';
 out.className  = 'option-grid sentence-builder';
 hint.className = 'builder-hint';
 hint.textContent = 'Tap items to build the order. Tap again to remove.';


 const bankButtons = [];
 state.order = [];


 function sync() {
   state.order = Array.from(out.querySelectorAll('.option-card.word-card.chosen'))
     .map(el => el.textContent);
   enableNextWhenReady(step.answer && state.order.length === step.answer.length);
 }


 (step.items || []).forEach((it, i) => {
   const b = document.createElement('button');
   b.type = 'button';
   b.className = 'option-card word-card';
   b.textContent = String(it);
   b.onclick = () => {
     if (state.answered || b.disabled) return;
     const c = document.createElement('button');
     c.type = 'button';
     c.className = 'option-card word-card chosen';
     c.textContent = String(it);
     c.dataset.srcIndex = String(i);
     c.onclick = () => {
       if (state.answered) return;
       out.removeChild(c);
       const src = bankButtons[Number(c.dataset.srcIndex)];
       if (src) src.disabled = false;
       sync();
     };
     out.appendChild(c);
     b.disabled = true;
     sync();
   };
   bankButtons[i] = b;
   bank.appendChild(b);
 });


 // 👇 append into the wrapper (not directly to host)
 wrap.appendChild(hint);
 wrap.appendChild(out);
 wrap.appendChild(bank);
 host.appendChild(wrap);


 enableNextWhenReady(false);
}




// d) TRUE/FALSE — two big buttons; step.answer: boolean
function renderTrueFalse(step, host) {
 const wrap = document.createElement('div');
 wrap.className = 'true-false';          // ✅ wrapper for CSS hooks


 const grid = createOptionGrid(
   [{ text: 'True ✅' }, { text: 'False ❌' }],
   (i, card) => {
     if (state.answered) return;
     document.querySelectorAll('.option-card').forEach(c => c.classList.remove('sel'));
     card.classList.add('sel');
     state.select = i; // 0 = True, 1 = False
     enableNextWhenReady(true);
   }
 );


 wrap.appendChild(grid);
 host.appendChild(wrap);
 enableNextWhenReady(false);
}

// ===== END: new helpers + renderers =====




function renderStep(step, host) {
 if (!host || !step) return;
 host.innerHTML = '';


 if (step.prompt){
   const p = document.createElement('p');
   p.textContent = step.prompt;
   host.appendChild(p);
 }


 const handleOptionSelect = (index, cardEl) => {
   if (state.answered) return;
   document.querySelectorAll('.option-card').forEach(c => c.classList.remove('sel'));
   cardEl.classList.add('sel');
   state.select = index;
   $('#btnNext').disabled = false;
 };


 if (step.type === 'select_option') {
   host.appendChild(createOptionGrid(step.options, handleOptionSelect));


 } else if (step.type === 'order_words') {
 // --- Click-to-build word ordering UI that matches option cards ---
 const bank = document.createElement('div');
 const out  = document.createElement('div');
 const hint = document.createElement('div');


 // reuse your option grid/card look
 bank.className = 'option-grid word-bank';
 out.className  = 'option-grid sentence-builder';
 hint.className = 'builder-hint';
 hint.textContent = 'Tap words to build your sentence. Tap a word again to remove it.';


 const bankButtons = [];
 const btnNext = $('#btnNext');
 if (btnNext) btnNext.disabled = true;


 function syncOrderAndToggleNext() {
   state.order = Array.from(out.querySelectorAll('.option-card.word-card.chosen'))
     .map(el => el.textContent);
   if (btnNext) btnNext.disabled = state.order.length !== (step.answer ? step.answer.length : 0);
 }


 (step.words || []).forEach((w, i) => {
   const b = document.createElement('button');
   b.type = 'button';
   b.className = 'option-card word-card';
   b.textContent = w;


   // make punctuation a little narrower
   if (/^[.,!?;:]$/.test(w)) b.classList.add('punc');


   b.onclick = () => {
     if (state.answered || b.disabled) return;


     const c = document.createElement('button');
     c.type = 'button';
     c.className = 'option-card word-card chosen';
     c.textContent = w;
     c.dataset.srcIndex = String(i);
     if (/^[.,!?;:]$/.test(w)) c.classList.add('punc');


     c.onclick = () => {
       if (state.answered) return;
       out.removeChild(c);
       const src = bankButtons[Number(c.dataset.srcIndex)];
       if (src) src.disabled = false;
       syncOrderAndToggleNext();
     };


     out.appendChild(c);
     b.disabled = true;
     syncOrderAndToggleNext();
   };


   bankButtons[i] = b;
   bank.appendChild(b);
 });


 host.appendChild(hint);
 host.appendChild(out);
 host.appendChild(bank);
}
else if (step.type === 'fill_blank') {
 renderFillBlank(step, host);
}
else if (step.type === 'match_pairs') {
 renderMatchPairs(step, host);
}
else if (step.type === 'sort_items') {
 renderSortItems(step, host);
}
else if (step.type === 'true_false') {
 renderTrueFalse(step, host);
}


}




function feedback(msg, isGood) {
 const f = $('#feedback');
 if (!f) return;
 f.textContent = msg;
 f.className = 'feedback-toast ' + (isGood ? 'good' : 'bad');
 f.hidden = false;
 setTimeout(() => f.hidden = true, 1200);
}


// Show correct answer in the same bottom-center toast as "Try once more"
function showCorrectToast(html, ms = 2200) {
  let host = document.getElementById('feedback');
  if (!host) {
    host = document.createElement('div');
    host.id = 'feedback';
    host.className = 'feedback-toast';
    host.hidden = true;
    document.body.appendChild(host);
  }
  host.className = 'feedback-toast bad'; // same placement/look bucket as your error toast
  host.innerHTML = `Correct solution:&nbsp;<strong><em>${html}</em></strong>`;
  host.hidden = false;

  const timer = setTimeout(() => {
    host.hidden = true;
    host.innerHTML = '';
  }, ms);

  return {
    close() {
      try { clearTimeout(timer); } catch {}
      try { host.hidden = true; host.innerHTML = ''; } catch {}
    }
  };
}


// Stick-to-bottom reveal bar for incorrect answers
// Small chip that sits inside the sticky lesson footer (left side)
// Small pill that sits inside the lesson footer (left side)




// Utility so we can nuke any leftover UI when moving on
function hideSolutionUI(){
  const fb = document.getElementById('feedback');
  if (fb) { fb.hidden = true; fb.innerHTML = ''; }
  // keep these as belt-and-suspenders for any lingering old UI:
  try { document.getElementById('sfSolutionPill')?.remove(); } catch {}
  try { document.getElementById('sfSolutionBar')?.remove(); } catch {}
}


// Build a readable “correct answer” snippet for the current step
function formatCorrectAnswer(step){
  if (!step) return '';
  if (step.type === 'select_option') {
    const opt = (step.options || [])[step.answer];
    return opt ? String(opt.text) : '';
  }
  if (step.type === 'fill_blank') {
    const a = Array.isArray(step.answer) ? step.answer[0] : step.answer;
    return a ? `The <em>${String(a)}</em>.` : '';
  }
  if (step.type === 'sort_items') {
    const a = Array.isArray(step.answer) ? step.answer.join(' ') : '';
    return a ? `<code>${a}</code>` : '';
  }
  if (step.type === 'true_false') {
    return step.answer ? 'True' : 'False';
  }
  if (step.type === 'match_pairs') {
    const pairs = (step.pairs || []).map(p => `${p.left} → ${p.right}`).join(' • ');
    return pairs || '';
  }
  return '';
}




function checkAnswer(step) {
 if (step.type === 'select_option') {
   return state.select === step.answer;
 }
 if (step.type === 'order_words') {
   const expected = Array.isArray(step.answer) ? step.answer : [];
   const got = Array.isArray(state.order) ? state.order : [];
   return expected.length === got.length && expected.every((w, i) => w === got[i]);
 }


 // --- BEGIN PATCH 4: checkAnswer cases ---
if (step.type === 'fill_blank') {
const answers = Array.isArray(step.answer) ? step.answer.map(normalizeText) : [normalizeText(step.answer)];
return answers.includes(normalizeText(state.text));
}
if (step.type === 'match_pairs') {
// compare as sets of strings "left::right" to ignore pairing order
const got = new Set((state.pairs || []).map(p => `${p.left}::${p.right}`));
const exp = new Set((step.pairs || []).map(p => `${p.left}::${p.right}`));
if (got.size !== exp.size) return false;
for (const k of exp) if (!got.has(k)) return false;
return true;
}
if (step.type === 'sort_items') {
const expected = Array.isArray(step.answer) ? step.answer.map(String) : [];
const got = Array.isArray(state.order) ? state.order.map(String) : [];
return expected.length === got.length && expected.every((w, i) => w === got[i]);
}
if (step.type === 'true_false') {
// state.select: 0 => true, 1 => false
if (typeof step.answer === 'boolean') return (state.select === 0) === step.answer;
return false;
}
// --- END PATCH 4 ---
 return false;
}
function buildActivityKeyForCurrentLesson() {
 const id = state?.lesson?.id || 'unknown';
 const s  = state?.selections || {};
 return (`lesson:${id}|${s.subject||'any'}|${s.year||'any'}|${s.topic||'any'}`).slice(0, 190);
}




async function advanceOrFinish() {
 const pack = state.lesson;
 if (!pack) return;


 // More steps left in this lesson → just advance the step
 if (state.idx < pack.steps.length - 1) {
   state.idx++;
   showNextStep();
   return;
 }


 // ── Lesson complete ─────────────────────────────────────────────
 let streakEarnedThisLesson = false;


 // Mark lesson done today (used for UI ticks)
 if (!state.completedToday.includes(pack.id)) {
   state.completedToday.push(pack.id);
 }


   // Decide if this counts for streak:
 // - lesson >=50%
 // - after this completion, you've done at least DAILY_TARGET today
 // - and you haven't been awarded a streak yet today
 const today = new Date();
 const todayStr = today.toDateString();
 const scorePct = (state.score / pack.steps.length) * 100;
  // Notify optional feature (Units) so it can advance/persist its pointer
  try { window.sfHooks?.onLessonComplete?.({ pack, scorePct }); } catch {}
  // 👇 record that a lesson finished today (used by the Continue banner)
  if (scorePct >= 50) {
  try { localStorage.setItem('sf_lastDone', new Date().toISOString()); } catch {}
}

 const lastStreakDay = localStorage.getItem('sf_lastStreakDay') || '';
 if (scorePct >= 50 && state.completedToday.length >= DAILY_TARGET && lastStreakDay !== todayStr) {
   streakEarnedThisLesson = true;
   localStorage.setItem('sf_lastStreakDay', todayStr);
 }




 // Lock lesson so user can’t keep tapping next
 state.lessonLocked = true;


 // 🟣 Apply coins: pending per-step coins + completion bonus (respect cap if known)
 let completionBonus = 10;
 if (typeof state.coinsCapRemaining === 'number') {
   completionBonus = Math.min(completionBonus, Math.max(0, state.coinsCapRemaining));
   state.coinsCapRemaining -= completionBonus;
 }
 state.coins += (state.lessonCoinsPending || 0) + completionBonus;
 state.lessonCoinsPending = 0;


 // Guests manage streak locally; logged-in relies on server truth
 if (!JWT_TOKEN && streakEarnedThisLesson) state.streak++;
 updateUiCounters();


 // ── DAILY PATH: advance the gate if this lesson is in today's plan and user "passed"
 if (Array.isArray(state.dailyPlan) && state.dailyPlan.length) {
  const i = state.dailyPlan.findIndex(x => normalizeId(x.id) === normalizeId(pack.id));


  if (i !== -1 && scorePct >= 50) {
  const next = i + 1;
   if (!Number.isFinite(state.dailyIndex) || state.dailyIndex < next) {
  state.dailyIndex = next; // unlock next step
   if (typeof persistDaily === 'function') persistDaily();  
   }
 }
 }


 // Best-effort immediate sync so coins aren’t lost if the modal is closed
 if (JWT_TOKEN) {
   const activityKey = buildActivityKeyForCurrentLesson();
   updateUserProgress({ streakEarned: streakEarnedThisLesson, activityKey }).catch(() => {});
  
 } else {
   // keep local guest progress fresh
   saveLocalGuestProgress().catch(() => {});
 }


 // Figure out the next action for the Continue button
 const hasPlan = Array.isArray(state.dailyPlan) && state.dailyPlan.length > 0;
 const nextStep = hasPlan ? state.dailyPlan[state.dailyIndex] : null;


 const onContinue = async () => {
   if (JWT_TOKEN) {
     const activityKey = buildActivityKeyForCurrentLesson();
     await updateUserProgress({ streakEarned: streakEarnedThisLesson, activityKey });
   } else {
     await saveLocalGuestProgress();
   }


   // Prefer Units feature next; else Daily plan; else Home
  const nextFromUnits = (() => { try { return window.sfHooks?.getNextHref?.() || null; } catch { return null; } })();
  if (nextFromUnits) {
    history.pushState({}, '', nextFromUnits);
    router();
    return;
  }
  if (nextStep) {
    history.pushState({}, '', `/lesson/${nextStep.id}`);
    router();
    return;
  }
  history.pushState({}, '', '/');
  router();
 };


 // Only upsell after the first three steps are done (guest)
const showLoginUpsell = !JWT_TOKEN && (Number(state.dailyIndex || 0) >= DAILY_TARGET);

const extra = showLoginUpsell
  ? {
      onSave: async () => {
        if (!GUEST_ID) GUEST_ID = await getOrSetGuestId();
        await saveLocalGuestProgress();
        await new Promise(r => setTimeout(r, 50));
        gotoLoginSameTab();
      }
    }
  : undefined;

showCompletionModal(state.score, pack.steps.length, onContinue, extra);

}





/**
* Sends progress to the server and immediately re-fetches the official state.
*/


async function updateUserProgress({ streakEarned = false, activityKey = '' } = {}) {
 if (!JWT_TOKEN) return;


 // Compute deltas since last successful sync
 const deltaCoins = Math.max(0, (state.coins || 0) - (state.lastSyncedCoins || 0));


 // Optional daily progress snapshot (send only if we currently have a plan)
 const hasPlan = Array.isArray(state.dailyPlan) && state.dailyPlan.length > 0;
 const dailyIndex = Number.isFinite(state.dailyIndex) ? state.dailyIndex : 0;
 const dailyDate  = state.dailyDate || new Date().toDateString();
 const planIds    = hasPlan ? state.dailyPlan.map(x => x.id) : null;


 // Send full snapshot + deltas (server can choose what to use)
 const payload = {
   tz: USER_TZ,
     ...(activityKey ? { activity_key: activityKey } : {}),
   progress: {
     coins: state.coins,
     streak: state.streak,
     ...(deltaCoins > 0 ? { coins_earned: deltaCoins } : {}),
     ...(streakEarned ? { streak_earned: 1 } : {}),


     // Daily gating echo to server (optional but helpful)
     ...(hasPlan ? { daily_index: dailyIndex, daily_date: dailyDate, plan_ids: planIds } : {}),
   }
 };


 try {
   const res = await fetch(`${API_BASE}/game/merge-progress`, {
     ...authInit('POST', payload),
     keepalive: true,
     cache: 'no-store',
   });


   // Parse body safely (handles 204 or non-JSON)
   let data = {};
   try { data = await res.clone().json(); } catch {}


   if (!res.ok) {
     throw new Error(`merge-progress ${res.status}: ${JSON.stringify(data)}`);
   }


   // Coins/streak echo
   if (typeof data.coins  === 'number') state.coins  = data.coins;
   if (typeof data.streak === 'number') state.streak = data.streak;
   updateUiCounters();   // show the new totals immediately


   // DAILY GATE ECHOS — DO NOT LET SERVER PUSH US BACKWARDS
   if (Object.prototype.hasOwnProperty.call(data, 'daily_index')) {
     const incomingIdx = Number(data.daily_index);
     if (Number.isFinite(incomingIdx)) {
       state.dailyIndex = Math.max(state.dailyIndex || 0, incomingIdx);
     }
   }
   if (typeof data.daily_date === 'string' && data.daily_date.trim()) {
     state.dailyDate = data.daily_date;
   }
   // Only adopt server plan_ids if we currently have none (avoid stomping deterministic local plan)
   if (Array.isArray(data.plan_ids) && (!Array.isArray(state.dailyPlan) || state.dailyPlan.length === 0)) {
     state.dailyPlan = data.plan_ids.map(id => ({ id }));
   }


   if (typeof persistDaily === 'function') persistDaily();


   // Cap info / notices (best-effort)
   try {
     if (Object.prototype.hasOwnProperty.call(data, 'remaining_today')) {
       const left = Number.isFinite(data.remaining_today) ? data.remaining_today : null;
       state.coinsCapRemaining = left;
       if (typeof left === 'number') {
         if (left <= 0 || data.cap_reached) {
           feedback("You've reached today's coin limit. Awesome effort! Come back tomorrow!", false);
         } else if (left <= 20) {
           feedback(`You're close to today's coin limit. ${left} more coins to go!`, false);
         }
       }
     }
   } catch {}


   // Always reconcile with the server’s authoritative coins/streak
   await fetchUserProgress();


   // Baseline for next delta calculation and UI refresh
   state.lastSyncedCoins = Math.max(state.lastSyncedCoins || 0, state.coins);
   updateUiCounters();


 } catch (err) {
   console.error('Failed to update user progress:', err);
 }
}








// === Step handling ===
async function handleNextClick() {
  // 🔒 bail out if the lesson is locked (already finished)
  if (state.lessonLocked) return;

  const step = state.lesson.steps[state.idx];

  // If we already marked this step answered, Next/Enter means “advance”
  if (state.answered) { advanceOrFinish(); return; }

  const isCorrect = checkAnswer(step);

  if (isCorrect) {
    feedback(randomPraise(), true);
    burstConfetti();
    state.answered = true;
    state.score++;
    const _btn = document.getElementById('btnNext');
    if (_btn) _btn.textContent = 'Continue';

    // 🟣 live preview with cap respect
    const perStep = 2;
    let award = perStep;
    if (typeof state.coinsCapRemaining === 'number') {
      award = Math.min(perStep, Math.max(0, state.coinsCapRemaining));
      state.coinsCapRemaining -= award;
    }
    if (award <= 0) {
      feedback('Daily coin limit reached. Progress saved, no more coins today.', false);
    } else {
      state.lessonCoinsPending += award;
    }

    updateUiCounters();
    setTimeout(advanceOrFinish, 1200);
  } else {
    // first miss → redo
    if (state.retries < 1) {
      state.retries++;
      feedback('✋ Try once more', false);

      if (step.type === 'match_pairs' && typeof state._resetMatchPairs === 'function') {
        state._resetMatchPairs();
      } else {
        state.select = null;
        state.order  = [];
        state.text   = '';
        state.pairs  = [];
        const btnNext = $('#btnNext');
        if (btnNext) btnNext.disabled = true;
        renderStep(step, $('#stepHost')); // re-render same step
      }
      return;
    }

    // second miss → show correct answer, keep your existing sticky footer/button
    state.answered = true;

const btnNext = document.getElementById('btnNext');
if (btnNext) {
  btnNext.disabled = false;
  btnNext.textContent = 'Continue';
}

const t = showCorrectToast(formatCorrectAnswer(step));
state._solutionCleanup = t.close;
return;
  }
}
 



function showNextStep() {
  hideSolutionUI();  
  state._solutionCleanup = null;
 const btnNext = $('#btnNext');
 if (btnNext) btnNext.disabled = true;
 state.answered = false;
 state.retries = 0;
 state.select = null;
 state.order  = [];
 state.text = '';
 state.pairs = [];
 state._resetMatchPairs = null;
 const step = state.lesson.steps[state.idx];
 setProgress(state.idx, state.lesson.steps.length);
 renderStep(step, $('#stepHost'));
 state.stepStart = Date.now();
}


async function renderLesson(short) {
  const lessonTpl = document.getElementById('lessonTpl');
  if (!lessonTpl) {
    app.innerHTML = `<div class="error-container"><h2>Error</h2><p>Could not load the lesson template.</p></div>`;
    return;
  }

  // Paint template and ensure DOM nodes exist
  app.innerHTML = lessonTpl.innerHTML;
  await new Promise(r => setTimeout(r, 0));

  

  try {
    // ✅ Load pack FIRST
    const pack = await fetchPack(short);
    if (!pack || !Array.isArray(pack.steps)) throw new Error(`Lesson pack invalid: ${short}`);

    // Force ID to match route
    pack.id = short;

    // Init state
    state.lesson = pack;
    state.idx = 0;
    state.score = 0;
    state.lessonCoinsPending = 0;
    state.lessonLocked = false;
    state.lessonStart = Date.now();

    // Title
    const lessonTitleEl = document.getElementById('lessonTitle');
    if (lessonTitleEl) lessonTitleEl.textContent = pack.title || 'Lesson';


    // Buttons
    const btnBack = document.getElementById('btnBack');
    if (btnBack) btnBack.onclick = () => { history.pushState({}, '', '/'); router(); };
    const btnNext = document.getElementById('btnNext');
    if (btnNext) btnNext.onclick = handleNextClick;

    // First step
    showNextStep();
  } catch (error) {
    console.error('Failed to load lesson:', error);
    app.innerHTML = `<div class="error-container"><h2>Oops!</h2><p>Could not load this lesson.</p></div>`;
  }
}



// --- Selection UI + Challenge Hub ---
function hasAnyProgress() {
 return (state.coins > 0) || (Array.isArray(state.completedToday) && state.completedToday.length > 0);
}


function getLoginDeepLink() {
 const current = location.origin + location.pathname + location.search + location.hash;
 // remember where to return if server doesn't echo ?redirect back
 try { sessionStorage.setItem('sf_postLoginPath', location.pathname + location.search + location.hash); } catch {}


 const base = 'https://skillflex.education/login';
 const redirect = encodeURIComponent(current);
 return GUEST_ID
   ? `${base}?guestGameId=${GUEST_ID}&redirect=${redirect}`
   : `${base}?redirect=${redirect}`;
}

// ——— Sticky CTA for hub ———



function renderDailyChallenges() {
 setHomeInfoVisible(false);
 const hubContainer = document.querySelector('#challengeHubContainer');
 if (!hubContainer) return;


 // Skeleton while we load
 hubContainer.setAttribute('aria-busy', 'true');
 hubContainer.innerHTML = `
   <div class="activity-list-header">
     <h2 id="dailyTitle">Today's Path</h2>
   </div>
   <div class="activity-grid">
     <div class="skel"></div><div class="skel"></div><div class="skel"></div>
   </div>`;


 const { subject, year, topic } = state.selections || {};
 const potential = allActivities.filter(
   a => a.subject == subject && a.year == year && a.topic == topic
 );


 if (potential.length === 0) {
   hubContainer.innerHTML = `
     <div class="activity-list-header">
       <h2>Today's Path</h2>
       <button id="changeSelectionsBtn" class="btn btn-change">Change Selection</button>
     </div>
     <div class="activity-grid"><p>No activities found for these selections. More are coming soon!</p></div>`;
   const changeBtn = document.querySelector('#changeSelectionsBtn');
   if (changeBtn) changeBtn.onclick = () => {
     state.selections = {};
     saveSelections();
     renderChallengeHub();
   };
   
   return;
 }


 // Build/refresh the full sequence (doesn't reset progress on a new day)
 ensurePlanForToday(potential);


 const plan = Array.isArray(state.dailyPlan) ? state.dailyPlan : [];
 const idx  = Math.max(0, Math.min(Number(state.dailyIndex || 0), plan.length)); // pointer to NEXT to play


 const core  = plan.slice(0, DAILY_TARGET);
 const bonus = plan.slice(DAILY_TARGET);


 // ---- helpers ------------------------------------------------------
 const legend = (done, total) => `(${Math.min(done, DAILY_TARGET)}/${DAILY_TARGET})`;


 function renderTrack(list, offset, track) {
  // ── Track-level lock rules ───────────────────────────────────────────────
  const lockedByProgress = (track === 'bonus') && (idx < DAILY_TARGET);
  const lockedByLogin    = (track === 'bonus') && !JWT_TOKEN;   // require login for bonus
  const sectionLocked    = lockedByProgress || lockedByLogin;

  // ── Header ───────────────────────────────────────────────────────────────
  const header = document.createElement('div');
  header.className = 'activity-list-header' + (track === 'bonus' ? ' sub' : '');

  const coreTotal = (track === 'core') ? Math.max(1, list.length || DAILY_TARGET) : 1;
  const coreDone  = (track === 'core') ? Math.min(idx, coreTotal) : 0;
  const pct       = Math.round((coreDone / coreTotal) * 100);

  if (track === 'core') {
    header.innerHTML = `
      <h2 id="dailyTitle">Today's Path <span class="path-progress">(${coreDone}/${coreTotal})</span></h2>
      <div class="progress-bar" role="progressbar" aria-label="Daily progress"
           aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"
           style="height: 6px; border-radius: 999px; max-width: 420px;">
        <div class="progress-fill" style="width:${pct}%;"></div>
      </div>
      <div class="header-actions">
        <button id="changeSelectionsBtn" class="btn btn-change">Change Selection</button>
      </div>`;
  } else {
    const bannerMsg = sectionLocked
      ? (lockedByLogin ? '🔒 Log in to unlock Bonus Quests' : '🔒 Unlocks after Today’s 3 steps')
      : '';
    header.innerHTML = `
      <h3>Bonus Quests <small class="subcopy">🪙 extra coins</small></h3>
      ${bannerMsg ? `<div class="bonus-lock-banner">${bannerMsg}</div>` : ''}`;
  }

  // ── Grid ─────────────────────────────────────────────────────────────────
  const grid = document.createElement('div');
  grid.className = 'activity-grid ' + (track === 'bonus' ? 'bonus-grid' : 'core-grid');

  // Build once per track: which lessons are already completed today
  const completedSet = new Set((state.completedToday || []).map(normalizeId));

  const html = list.map((act, i) => {
    const globalIndex     = offset + i;
    const isSectionLocked = sectionLocked;

    // Done/current/locked logic (index + history)
    const idNorm           = normalizeId(act.id);
    const isDoneByIndex    = (globalIndex < idx);
    const isDoneByHistory  = completedSet.has(idNorm);
    const isDone           = isDoneByIndex || isDoneByHistory;

    const isCurrent = !isDone && (globalIndex === idx) && !isSectionLocked;
    const isLocked  = !isDone && (isSectionLocked || globalIndex > idx);

    const title = (act.title || '').replace(/-/g, '\u2011');
    const badge = isDone ? '😊' : isCurrent ? (track === 'core' ? '🎯' : '🪙') : '🔒';

    const classes = [
      'activity-card',
      track === 'bonus' ? 'bonus-card' : 'core-card',
      isDone ? 'completed' : '',
      isCurrent ? 'current' : '',
      isLocked ? 'locked' : '',
    ].filter(Boolean).join(' ');

    const stepText = track === 'core' ? `Step ${i + 1}` : `Bonus ${i + 1}`;

   if (isLocked) {
  const overlayMsg = lockedByLogin
    ? 'Log in to unlock the next steps'
    : 'Finish the earlier steps to unlock';
  return `
    <div class="${classes}" role="button" tabindex="0" aria-disabled="true"
         title="${overlayMsg}" data-step="${globalIndex + 1}">
      <div class="activity-step">${stepText}</div>
      <div class="activity-icon">${badge}</div>
      <div class="activity-title">${title}</div>
      ${isSectionLocked ? `<div class="lock-overlay" aria-hidden="true">${overlayMsg}</div>` : ''}
    </div>
  `;
}


    return `
      <a href="/lesson/${act.id}" class="${classes}" data-link>
        <div class="activity-step">${stepText}</div>
        <div class="activity-icon">${badge}</div>
        <div class="activity-title">${title}</div>
      </a>
    `;
  }).join('');

  grid.innerHTML = html;

  const wrap = document.createElement('div');
  wrap.appendChild(header);
  wrap.appendChild(grid);
  return wrap;
}



 // ---- mount --------------------------------------------------------
 hubContainer.innerHTML = '';
 hubContainer.removeAttribute('aria-busy');


 // Core row (Steps 1–3)
 hubContainer.appendChild(renderTrack(core, 0, 'core'));


 // Bonus row (after the 3 core steps)
 if (bonus.length) {
   hubContainer.appendChild(renderTrack(bonus, core.length, 'bonus'));
 }


 // Actions
 const changeBtn = document.querySelector('#changeSelectionsBtn');
 if (changeBtn) changeBtn.onclick = () => {
   if (state.selections?.topic)      delete state.selections.topic;
   else if (state.selections?.year)  delete state.selections.year;
   else                              delete state.selections?.subject;
   saveSelections();
   renderChallengeHub();
 };


 // Friendly nudge for any locked card (incl. whole bonus row)
 const nudge = (el) => {
  const inLocked = !!el.closest('.activity-card.locked');
  const inUnits  = !!el.closest('.core-grid') || !!el.closest('.bonus-grid'); // covers either layout

  // If login is required for later steps (guest), show post-login nudge
  if (inUnits && !JWT_TOKEN) {
    showSaveNudge?.({
      variant: 'post',
      title: 'Next steps need a login',
      message: 'Log in to continue your learning path and keep your coins across devices.',
      onLogin: gotoLoginSameTab,
      onLater: () => {
        // just go back to hub (we are already on hub; this is a no-op but safe)
        history.replaceState({}, '', '/');
        router();
      }
    });
    return;
  }

  // Progress gate (earlier steps not done yet)
  if (inLocked) {
    const step = Number(el?.getAttribute('data-step') || 0);
    feedback(step > 1
      ? `Finish Step ${step - 1} first, superstar! ✨`
      : `Finish this one first, superstar! ✨`, false);
  }
};





 hubContainer.addEventListener('click', (e) => {
   const locked = e.target.closest('.activity-card.locked');
   if (!locked) return;
   e.preventDefault();
   e.stopPropagation();
   nudge(locked);
 });


 hubContainer.addEventListener('keydown', (e) => {
   if (e.key !== 'Enter' && e.key !== ' ') return;
   const locked = e.target.closest('.activity-card.locked');
   if (!locked) return;
   e.preventDefault();
   e.stopPropagation();
   nudge(locked);
 });
 // Keep a single primary CTA visible on the hub


}










// --- App Initialization ---
async function initializeApp() {
 trace('init:start');
 app = document.querySelector('#app');
 coinsEl = document.querySelector('#coins');
 streakEl = document.querySelector('#streak');


 if (!app) throw new Error('#app not found in DOM');
 if (!document.getElementById('homeTpl')) throw new Error('#homeTpl <template> missing');
 if (!document.getElementById('lessonTpl')) console.warn('lessonTpl missing (ok if not used yet)');


 // 1) Capture token from URL (login redirect), persist it
 const urlParams     = new URLSearchParams(window.location.search);
 const incomingToken = urlParams.get('token');
 if (incomingToken) {
  JWT_TOKEN = incomingToken;
await idbPut('meta', { key: 'jwt', value: JWT_TOKEN });
try { localStorage.setItem('sf_jwt', JWT_TOKEN); } catch {}


// Keep the exact page (lesson/hub), just remove auth params we used
const u = new URL(location.href);
u.searchParams.delete('token');
u.searchParams.delete('guestGameId');   // if you pass this
u.searchParams.delete('redirect');      // optional tidy-up


history.replaceState(
 null,
 '',
 u.pathname + (u.searchParams.toString() ? `?${u.searchParams}` : '') + (u.hash || '')
);


   try {
 const last = localStorage.getItem('sf_lastDone');
 if (last) {
   const d = new Date(last); d.setHours(0,0,0,0);
   const today = new Date(); today.setHours(0,0,0,0);
   if (d < today) localStorage.removeItem('sf_lastDone');
 }
} catch {}


 } else {
   // 2) Load token from storage (if any)
   const storedToken = await idbGet('meta', 'jwt');
   if (storedToken && storedToken.value) JWT_TOKEN = storedToken.value;
 }


 // 3) Update header buttons immediately (avoid flicker)
 updateLoginButton();


 // 4) Guest merge & progress hydrate
 if (JWT_TOKEN) {
  trace('auth', 'User is LOGGED IN.');
  GUEST_ID = await getGuestIdFromStorage();
  await mergeGuestProgressWithAccount();   // ← call even if there’s no guestId
  await new Promise(r => setTimeout(r, 50));
  await fetchUserProgress();

} else {
   trace('auth', 'User is a GUEST.');


   GUEST_ID = await getOrSetGuestId();
   const stored = await getProgressFromStorage();
   if (stored) Object.assign(state, stored);
 }


 // 5) One more safety toggle after async ops
 updateLoginButton();


 // 5.5) Restore daily gating state before rendering the hub
   hydrateDaily();


 // 6) Load activities, wire up SPA routing
 await loadActivities();


 document.body.addEventListener('click', e => {
   const a = e.target.closest('a[data-link]');
   if (!a) return;
   e.preventDefault();
   history.pushState({}, '', a.getAttribute('href'));
   router();
 });
 window.addEventListener('popstate', router);


 // 6.5) Home button → always show subject picker
const homeBtn = document.getElementById('btnHome');
if (homeBtn) {
 homeBtn.addEventListener('click', (e) => {
   e.preventDefault();
   e.stopPropagation();
   e.stopImmediatePropagation(); // beat the generic data-link handler


   // Clear saved selections so Home shows English/Maths
   state.selections = {};
   sessionStorage.removeItem('sf_selections');
   localStorage.removeItem('sf_selections_persist');



   history.pushState({}, '', '/');
   router();
 }, true); // capture phase
}




 // 7) Logout button
 const logoutButton = document.getElementById('logout-button');
 if (logoutButton) logoutButton.addEventListener('click', logout);


 // 8) Initial paint
 updateUiCounters();
 router();


 trace('init:done');


}


// Save progress if the page is backgrounded or closed (guest + logged‑in)
window.addEventListener('pagehide', () => {
 try {
   if (JWT_TOKEN) {
     updateUserProgress().catch(() => {});
   } else {
     saveLocalGuestProgress();
   }
 } catch (e) {}
});


document.addEventListener('visibilitychange', () => {
 if (document.visibilityState === 'hidden') {
   try {
     if (JWT_TOKEN) {
       updateUserProgress().catch(() => {});
     } else {
       saveLocalGuestProgress();
     }
   } catch (e) {}
 }
});


// Panic banner
function showPanic(msg){ const el=document.getElementById('panic'); if(el){ el.textContent='⚠️ '+msg; el.style.display='block'; } }
async function safeInitialize(){ try { await initializeApp(); } catch(e){ console.error('FATAL initializeApp error:', e); showPanic(e?.message||String(e)); } }
document.addEventListener('DOMContentLoaded', safeInitialize);
// Desktop keys in lesson: Enter = Check/Continue, Esc = Back
document.addEventListener('keydown', (e) => {
  if (!document.body.classList.contains('in-lesson')) return;
  if (e.key === 'Escape') { e.preventDefault(); document.getElementById('btnBack')?.click(); }
  if (e.key === 'Enter')  {
    const b = document.getElementById('btnNext');
    if (b && !b.disabled) { e.preventDefault(); b.click(); }
  }
});



// --- DEBUG: expose internals so MP probes can hook them (after definitions) ---
if (typeof DEBUG !== 'undefined' && DEBUG) {
window.enableNextWhenReady = enableNextWhenReady;
window.renderMatchPairs = renderMatchPairs;
}




// expose to window (works for both classic and module contexts)
if (typeof window !== 'undefined') {
 window.renderLesson = renderLesson;
 window.router = router;
 window.state = state;
 window.sfUpdateUserProgress = updateUserProgress;         // ← used by units.js
 window.sfBuildActivityKey  = buildActivityKeyForCurrentLesson; // ← used by units.js
 window.saveLocalGuestProgress = saveLocalGuestProgress;   // ← used by units.js
 installUnitsFeature();
 window.goHome = goHome;
 // Helpers for feature modules (e.g., units.js)
 window.sfUpdateUserProgress    = updateUserProgress;
  window.sfBuildActivityKey      = buildActivityKeyForCurrentLesson;
  window.saveLocalGuestProgress  = saveLocalGuestProgress;
  window.persistDaily            = persistDaily;
}


// --- Re-apply MP diagnostics AFTER exposing internals (so wrapper stays active) ---
if (DEBUG) {
  // 1) Minimal diag shim so logs actually print
  if (!window._sf_diag) {
    window._sf_diag = {
      log(msg, obj){ try { console.log('[MP-DIAG]', msg, obj ?? ''); } catch {} }
    };
  }

  // 2) Tap into enableNextWhenReady (only logs in debug)
  (function(){
    const prev = window.enableNextWhenReady;
    window.enableNextWhenReady = function(b){
      try { window._sf_diag.log('enableNextWhenReady', { ready: !!b }); } catch {}
      if (typeof prev === 'function') return prev(b);
    };
  })();

  // 3) Wrap renderMatchPairs to add probes (NO behavior changes)
  (function(){
    const _orig = window.renderMatchPairs;
    window.renderMatchPairs = function(step, host){
      window._sf_diag.log('renderMatchPairs:start', {
        pairsLen: Array.isArray(step?.pairs) ? step.pairs.length : 'NA',
        answered: window.state?.answered
      });

      const out = _orig?.(step, host);

      try {
        const L = host.querySelectorAll('.match-col.left .option-card');
        const R = host.querySelectorAll('.match-col.right .option-card');
        window._sf_diag.log('DOM buttons', { left: L.length, right: R.length });

        L.forEach((btn, i) => btn.addEventListener('click', () => {
          window._sf_diag.log('CLICK:left', { i, text: btn.textContent.trim(), answered: window.state?.answered });
          setTimeout(() => window._sf_diag.log('STATE after LEFT', { pairs: window.state?.pairs }), 0);
        }, { capture: true }));

        R.forEach((btn, i) => btn.addEventListener('click', () => {
          window._sf_diag.log('CLICK:right', { i, text: btn.textContent.trim(), answered: window.state?.answered });
          setTimeout(() => window._sf_diag.log('STATE after RIGHT', { pairs: window.state?.pairs }), 0);
        }, { capture: true }));
      } catch(e){ window._sf_diag.log('probe-install-error', String(e)); }

      return out;
    };
  })();
}

