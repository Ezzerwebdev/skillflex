// [2024-11-21] Added AI Placement Wizard & automatic differentiation (support/core/stretch).
/**
* SkillFlex PWA — app.js
* Core application logic, routing, and lesson engine.
* Coins can be earned unlimited times per day; streak increments at most once per day.
*/


// --- MODULE IMPORTS ---
import { showCompletionModal, showSaveNudge } from './ui.js?v=2';

import { idbGet, idbPut, idbDelete } from './db.js';
import { renderUnitsView } from './js/features/units.js?v=176224264';
import { setThemePreference, getThemePreference } from './js/theme.js'; // auto-inits on import
import { initProfileStore, nextMode } from './js/core/profile.js';
import { getTodayKey, calcStreak } from './js/core/streak.js';
import { awardCoins } from './js/core/coins.js';
import { maybeUnlockBadges } from './js/core/badges.js';
import { emitTelemetry } from './js/core/analytics.js';
import { getShopItems, purchaseItem } from './js/core/shop.js';
import { generateTimesTableSet } from './js/generators/timesTables.js';
import { generateComparativeSet } from './js/generators/englishComparatives.js';
import { generateTrueFalseSet } from './js/generators/trueFalse.js';
import { ensureModalHost, showSummaryModal, showShopModal } from './js/ui/modals.js';
import { CONFIG } from './js/core/config.js';
import { initAI } from '/js/features/ai.js?v=4';
import { renderManipulatives } from './js/features/lesson/manipulatives.js';
import { renderMediaBlocks } from './js/features/lesson/media.js';



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
const STORED_JWT_HINT = (() => {
  try { return localStorage.getItem('sf_jwt'); }
  catch { return null; }
})();
if (typeof document !== 'undefined' && document.body) {
  document.body.classList.toggle('logged-in', !!STORED_JWT_HINT);
}

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

// --- Units pointer sync helpers (server-side persistence for unit progress) ---

function buildSelectionKey(sel){
  // Normalize the selection used for pointers; freeze the band to the explicit selection if present,
  // otherwise fall back to the current baseline for the subject.
  const subject = sel?.subject || state?.selections?.subject || '';
  const year    = sel?.year    || state?.selections?.year    || '';
  const topic   = sel?.topic   || state?.selections?.topic   || '';

  const prof    = state?.skillProfile?.[subject] || {};
  const level   = sel?.level
    || state?.selections?.level
    || prof.baselineLevel
    || 'core';

  return `${subject}:${year}:${topic}:${level}`;
}


async function fetchUnitsPointer(selectionKey) {
  if (!window.JWT_TOKEN) return null;

  try {
    const url = `${window.API_BASE || '/api'}/game/units/pointer?key=${encodeURIComponent(selectionKey)}`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${window.JWT_TOKEN}`
      },
      cache: 'no-store'
    });
    if (!res.ok) return null;
    return await res.json(); // expect { selection_key, unit_index, lesson_index }
  } catch (e) {
    console.warn('[units] fetchUnitsPointer failed', e);
    return null;
  }
}

async function saveUnitsPointer(selectionKey, { unit_index, lesson_index = 0 }) {
  if (!window.JWT_TOKEN) return;

  try {
    const url = `${window.API_BASE || '/api'}/game/units/pointer`;
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${window.JWT_TOKEN}`
      },
      body: JSON.stringify({
        key: selectionKey,
        unit_index,
        lesson_index
      }),
      keepalive: true
    });
  } catch (e) {
    console.warn('[units] saveUnitsPointer failed', e);
  }
}

// Compare server vs local pointer, adopt the max, push ahead if local is newer.
async function reconcileUnitsPointer(sel) {
  try {
    if (!window.JWT_TOKEN) return;

    const selectionKey = buildSelectionKey(sel);
    const serverPtr    = await fetchUnitsPointer(selectionKey);
    const serverUnit   = Number(serverPtr?.unit_index || 0);
    const serverLesson = Number(serverPtr?.lesson_index || 0);

    // Local pointer stored as sf_unit_index:<subject>:<year>:<topic>:<level>
    const normalized = {
      ...sel,
      level:
        sel.level ||
        window.state?.skillProfile?.[sel.subject || '']?.baselineLevel ||
        'core'
    };

    const keys = (typeof window._unitKeys === 'function')
      ? window._unitKeys(normalized)
      : {
          uIdx: `sf_unit_index:${normalized.subject || ''}:${normalized.year || ''}:${normalized.topic || ''}:${normalized.level || ''}`,
          lIdx: `sf_unit_lesson_index:${normalized.subject || ''}:${normalized.year || ''}:${normalized.topic || ''}:${normalized.level || ''}`
        };

    const localUnit   = Number(localStorage.getItem(keys.uIdx) || 0);
    const localLesson = Number(localStorage.getItem(keys.lIdx) || 0);

    const mergedUnit   = Math.max(localUnit, serverUnit);
    const mergedLesson = Math.max(localLesson, serverLesson);

    // If server is ahead, update local
    if (serverUnit > localUnit || serverLesson > localLesson) {
      localStorage.setItem(keys.uIdx, String(mergedUnit));
      localStorage.setItem(keys.lIdx, String(mergedLesson));
    }

    // If local is ahead, push forward to server
    if (localUnit > serverUnit || localLesson > serverLesson) {
      await saveUnitsPointer(selectionKey, {
        unit_index: mergedUnit,
        lesson_index: mergedLesson
      });
    }
  } catch (e) {
    console.warn('[units] reconcileUnitsPointer failed', e);
  }
}

// expose for units.js
window.sfUnits = window.sfUnits || {};
window.sfUnits.reconcileUnitsPointer = reconcileUnitsPointer;
window.sfUnits.buildSelectionKey     = buildSelectionKey;
window.sfUnits.fetchUnitsPointer     = fetchUnitsPointer;
window.sfUnits.saveUnitsPointer      = saveUnitsPointer;


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

const DAILY_QUESTION_COUNT = 10;
const QUESTION_FACTORIES = {
  maths: generateTimesTableSet,
  english: generateComparativeSet,
  literacy: generateTrueFalseSet
};
const profileStore = initProfileStore();

const dailySessionCache = new Map();
const PROFILE_COPY = {
  gearTitle: 'Settings',
  theme: 'Theme',
  themeLight: 'Light',
  themeDark: 'Dark',
  changeLook: 'Change look',
  languageSoon: 'Language (coming soon)',
  grownups: 'Grown-ups & Account',
  parentsSoon: 'For parents (coming soon)',
  teachersSoon: 'For teachers (coming soon)',
  manageSoon: 'Manage account (coming soon)',
  findTutors: 'Find tutors',
  becomeTutor: 'Become a tutor',
  grownupGateTitle: 'Grown-ups only',
  grownupGateHint: 'Please solve to continue',
  pathTitle: 'Path',
  pathSubtitle: 'Jump back in where you left off.',
  pathContinue: 'Continue',
  pathViewAll: 'View all',
  pathEmpty: 'Start your path with a quick challenge.'
};

// --- Mobile tabs ---
const MOBILE_TABS = [
  { key: 'overview',   icon: '🏠', label: 'Overview',   href: '/profile?tab=overview' },
  { key: 'units',  icon: '🗺️', label: 'Units',  href: '/units' },
  { key: 'shop',   icon: '🛍️', label: 'Shop',   href: '/profile?tab=shop' },
  { key: 'quests', icon: '🎯', label: 'Quests', href: '/profile?tab=history' },
  { key: 'more',   icon: '⚙️', label: 'More',   action: 'more' }
];
let pendingGearOpen = false;
let gearCleanupFns = [];

function closeGearMenus() {
  if (typeof window._pfGearCleanup === 'function') {
    window._pfGearCleanup();
    window._pfGearCleanup = null;
  }
  pendingGearOpen = false;
  gearCleanupFns = [];
  const overlay = document.querySelector('.pf-gear-wrap.pf-gear-overlay');
  overlay?.remove();
}
window.closeGearMenus = closeGearMenus;

// --- Mobile tabs (exported on window to avoid hoisting surprises) ---
window.shouldShowMobileTabs = function shouldShowMobileTabs(){
  if (typeof window === 'undefined') return false;
  if (!JWT_TOKEN) return false;
  const path = location.pathname || '';
  const onProfile = path.startsWith('/profile');
  const onUnits = path === '/units' || path.startsWith('/units/');
  const onHome = path === '/' || path === '/home';
  const onLesson = path.startsWith('/lesson/');
  if (onHome || onLesson) return false;
  return (onProfile || onUnits) && window.innerWidth < 720;
};

window.mountMobileTabs = function mountMobileTabs(){
  const body = document.body;
  const should = window.shouldShowMobileTabs?.();
  const existing = document.getElementById('mbTabs');
  body.classList.toggle('has-mb-tabs', !!should);
  if (!should) { existing?.remove(); return; }
  if (existing) return;

  const nav = document.createElement('nav');
  nav.id = 'mbTabs';
  nav.setAttribute('role','navigation');
  nav.setAttribute('aria-label','Primary');
  nav.innerHTML = MOBILE_TABS.map(t => `
    <button type="button" data-key="${t.key}" ${t.href?`data-href="${t.href}"`:''} ${t.action?`data-action="${t.action}"`:''}>
      <span class="mb-tab-icon">${t.icon}</span>
      <span class="mb-tab-label">${t.label}</span>
    </button>`).join('');
  document.body.appendChild(nav);
  nav.addEventListener('click', onMobileTabClick);
  nav.addEventListener('touchend', onMobileTabClick, { passive:false });
};

function onMobileTabClick(e){
  const btn = e.target.closest('button[data-key]');
  if (!btn) return;

  if (btn.dataset.action === 'more'){
  e.preventDefault();
  e.stopImmediatePropagation();   // << key change

  // If we're not on /profile, navigate there and open after render.
  if (location.pathname !== '/profile'){
    pendingGearOpen = true;
    history.pushState({}, '', '/profile');
    router();

    // Failsafe: if something delays render, open a moment later.
    setTimeout(() => { 
      if (pendingGearOpen) window.openProfileGearMenu?.(); 
    }, 50);
    return;
  }

  // Already on /profile — open immediately (creates overlay if needed)
  window.openProfileGearMenu?.();
  return;
}

  closeGearMenus();


  const href = btn.dataset.href;
  if (!href) return;
  e.preventDefault();
  history.pushState({}, '', href);
  router();
}


window.updateMobileTabsVisibility = function updateMobileTabsVisibility(){ window.mountMobileTabs?.(); };

window.resolveMobileTabKey = function resolveMobileTabKey(path){
  const url = new URL(path, location.origin);
  const p   = url.pathname;
  const tab = (url.searchParams.get('tab') || '').toLowerCase();

  // Profile views:
  if (p === '/profile') {
    if (tab === 'shop')    return 'shop';
    if (tab === 'history') return 'quests'; // your "History" / "Quests" mapping
    // tab === 'path' (or overview/badges/etc.) → primary tab = Path
    return 'overview';
  }

  // Units / home
  if (p === '/' || p === '/units') return 'units';

  // If you ever have separate shop/quests routes:
  if (p === '/shop')   return 'shop';
  if (p === '/quests') return 'quests';

  return null;
};


window.updateMobileTabsActive = function updateMobileTabsActive(path){
  const nav = document.getElementById('mbTabs'); if (!nav) return;
  const key = window.resolveMobileTabKey?.(path);
  nav.querySelectorAll('button[data-key]').forEach(b => {
    if (b.dataset.key === key) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');
  });
};

window.openProfileGearMenu = function openProfileGearMenu() {
  let wrap = getVisibleGearWrap();
  if (!wrap) {
    wrap = document.querySelector('.pf-gear-wrap.pf-gear-overlay');
    if (!wrap) wrap = createGearOverlay();
  }
  if (wrap && typeof wrap._pfSetOpen === 'function') {
    wrap._pfSetOpen(true);
  }
};

function getVisibleGearWrap() {
  const wraps = Array.from(document.querySelectorAll('.pf-gear-wrap'));
  return wraps.find((el) => {
    if (!el) return false;
    if (el.classList.contains('pf-gear-overlay')) return true;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}

function createGearOverlay() {
  const themeMode = getThemePreference?.() || document.documentElement.dataset.theme || 'light';
  const temp = document.createElement('div');
  temp.innerHTML = buildProfileGearMenu(themeMode);
  const wrap = temp.querySelector('.pf-gear-wrap');
  if (!wrap) return null;

  wrap.classList.add('pf-gear-overlay');
  wrap.style.position = 'fixed';
  wrap.style.right = '16px';
  wrap.style.bottom = 'calc(90px + env(safe-area-inset-bottom, 0px))';
  wrap.style.zIndex = '220';

  const gearBtn = wrap.querySelector('.pf-gear');
  if (gearBtn) {
    gearBtn.style.display = 'none';
    gearBtn.setAttribute('aria-hidden', 'true');
  }

  document.body.appendChild(wrap);
  // ❗ important: wire JUST this wrap
  wireProfileSettingsMenu(wrap);
  return wrap;
}



// --- PWA install nudge (mobile only) ---
let _deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _deferredPrompt = e; // stash for later
});

function maybeShowInstallNudge(){
  // shouldShowMobileTabs() is defined below; it's fine to call here at runtime
  if (_deferredPrompt && shouldShowMobileTabs()){
    _deferredPrompt.prompt();
    _deferredPrompt.userChoice.finally(() => { _deferredPrompt = null; });
  }
}

// first gentle nudge a moment after load/route
setTimeout(maybeShowInstallNudge, 2000);



// Expose for devtools
window.profileStore = profileStore; // handy for devtools

// --- DEV: mock login so local builds behave like "signed in"
const DEV_MOCK_LOGIN =
  /[?&](devLogin|mockLogin|mock)=1/.test(location.search) ||
  localStorage.sf_mock_login === '1';

if (DEV_MOCK_LOGIN) {
  try { localStorage.setItem('sf_mock_login', '1'); } catch {}
  // Pretend we have a token so "logged-in" paths render
  if (!window.JWT_TOKEN) window.JWT_TOKEN = 'dev.mock.token';

  // Give yourself some test coins/streak so Shop/headers look alive
  const p = profileStore.get();
  if ((p.coins || 0) < 200) {
    profileStore.update(d => {
      d.coins = 200;
      d.streak.current = Math.max(d.streak?.current || 0, 5);
      d.streak.best = Math.max(d.streak?.best || 0, d.streak.current);
      d.streak.lastActiveISO = new Date().toISOString();
    });
  }
}

// Toggle from console: window.toggleMockLogin(true/false)
window.toggleMockLogin = function(on){
  try { localStorage.setItem('sf_mock_login', on ? '1' : '0'); } catch {}
  location.reload();
};


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

// Skill profile API helpers (server sync)
async function fetchServerSkillProfile(subject) {
  const resp = await fetch(`${API_BASE}/game/skill-profile?subject=${encodeURIComponent(subject)}`, authInit('GET'));
  if (!resp.ok) throw new Error(`skill-profile GET failed: ${resp.status}`);
  const data = await resp.json();
  return (data.profiles && data.profiles[0]) ? data.profiles[0] : null;
}

async function pushServerSkillProfile(subject, entry) {
  const resp = await fetch(`${API_BASE}/game/skill-profile`, authInit('POST', {
    subject,
    baseline_level: entry.baselineLevel,
    confidence: entry.confidence,
    placement_done: !!entry.placementDone,
    meta: entry.meta || null,
  }));
  if (!resp.ok) throw new Error(`skill-profile POST failed: ${resp.status}`);
  return resp.json();
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
currentAiChallenge: null, // Stores the answer for AI games
aiSession: {
  topic: null,
  level: null,
  difficulty: 'core',
  total: 0,
  asked: 0,
  correct: 0
},
skillProfile: {
  maths: {
    baselineLevel: 'core',
    confidence: 0.5,
    lastPlacementAt: null
  },
  english: {
    baselineLevel: 'core',
    confidence: 0.5,
    lastPlacementAt: null
  }
}
};

function loadSkillProfile() {
  try {
    const raw = localStorage.getItem('sf_skill_profile');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      state.skillProfile = parsed;
    }
  } catch {}
}

function saveSkillProfile() {
  try {
    localStorage.setItem('sf_skill_profile', JSON.stringify(state.skillProfile || {}));
  } catch {}
}

loadSkillProfile();

// Always expose the live state so feature modules share one object
(() => {
  const desc = Object.getOwnPropertyDescriptor(window, 'state');
  if (!desc || desc.writable || desc.set) {
    // No existing readonly descriptor – safe to assign
    window.state = state;
  } else if (window.state && typeof window.state === 'object') {
    // state is managed elsewhere as a readonly accessor: copy our fields onto it
    Object.assign(window.state, state);
  }
})();



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
  if (window.innerWidth < 720 && location.pathname === '/units') {
    const slot = document.getElementById('continueCard');
    if (slot) slot.hidden = true;
    return;
  }
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


function makeGuestId() {
  // Prefer strong randomness if available
  try {
    if (typeof crypto !== 'undefined') {
      if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
      if (typeof crypto.getRandomValues === 'function') {
        const buf = new Uint8Array(16);
        crypto.getRandomValues(buf);
        // RFC4122 v4-ish bits
        buf[6] = (buf[6] & 0x0f) | 0x40;
        buf[8] = (buf[8] & 0x3f) | 0x80;
        const hex = Array.from(buf, b => b.toString(16).padStart(2, '0')).join('');
        return (
          hex.slice(0, 8) + '-' +
          hex.slice(8, 12) + '-' +
          hex.slice(12, 16) + '-' +
          hex.slice(16, 20) + '-' +
          hex.slice(20)
        );
      }
    }
  } catch (e) {
    console.warn('makeGuestId: crypto failed, falling back:', e);
  }

  // If we have *no* crypto at all, just skip guest IDs in this env
  // so we don't pretend this is secure.
  return null;
}



// --- Progress persistence (guest & logged-in) ---
async function getOrSetGuestId() {
  // If they are logged in, they are NOT a guest
  if (JWT_TOKEN) return null;

  const existing = await getGuestIdFromStorage();
  if (existing) return existing;

  const newGuestId = makeGuestId();
  if (!newGuestId) return null;  // very old/locked-down browser: no guestId feature

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

// --- Shop/UI sync helpers (local only) ---
function refreshShopUi() {
  try {
    const coins = Number(
  (window.profileStore?.get()?.coins ??
   (state.coins + (state.lessonCoinsPending ?? 0))) ?? 0
);


    const hover = document.getElementById('shopHover');
    if (!hover) return;

    // big coin badge in the hover
    const coinsChip = hover.querySelector('.coins');
    if (coinsChip) coinsChip.textContent = `${coins} coin${coins === 1 ? '' : 's'}`;

    // enable/disable each item based on price
    hover.querySelectorAll('.shop-item').forEach(el => {
      const price = Number(
        el.dataset.price ??
        el.getAttribute('data-price') ??
        el.dataset.cost ?? 0
      );

      const owned =
        el.getAttribute('data-owned') === '1' ||
        el.dataset.owned === '1' ||
        el.classList.contains('owned');

      if (!owned) {
        if (price > coins) el.setAttribute('disabled', '');
        else el.removeAttribute('disabled');
      }

      const priceEl = el.querySelector('.price');
      if (priceEl && priceEl.textContent.trim() === '') {
        priceEl.textContent = `— ${price}`;
      }
    });
  } catch {}
}

function syncCoinsToProfileStore() {
  try {
    if (!window.profileStore) return;
    const preview = Number(state.coins || 0) + Number(state.lessonCoinsPending || 0);
    const current = Number(window.profileStore.get()?.coins || 0);
    if (preview !== current) {
      window.profileStore.update(d => { d.coins = preview; });
    }
  } catch {}
}
// (optional) expose for console debugging
window.syncCoinsToProfileStore = syncCoinsToProfileStore;


function updateUiCounters() {
  if (coinsEl && streakEl) {
    const previewCoins = state.coins + (state.lessonCoinsPending || 0);
    coinsEl.textContent  = `🪙 ${previewCoins}`;
    streakEl.textContent = `🔥 ${state.streak}`;
  }
  // NEW
  try { refreshShopUi(); } catch {}
  try { syncCoinsToProfileStore(); } catch {}
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
  try { localStorage.removeItem('sf_mock_login'); } catch {}
  JWT_TOKEN = null;
  window.DEV_MOCK_LOGIN = false;
  GUEST_ID = null;
  Object.assign(state, { coins: 0, streak: 0, completedToday: [], coinsCapRemaining: null });
  // Reset body flags so guest home shows
  document.body.classList.remove('logged-in', 'units-view', 'profile-focus', 'path-view', 'in-lesson', 'lesson-active');
  try { updateLoginButton(); } catch {}
  // 🔁 Send user to Home as a guest
  const HOME_PATH = '/';
  history.pushState({}, '', HOME_PATH);
  setTimeout(() => router(), 0);
}


function updateLoginButton() {
  const loginButton  = document.getElementById('login-button');
  if (!loginButton) return;

  const logoutButton = document.getElementById('logout-button');
  const authPill     = document.getElementById('auth-pill');
  const profileBtn   = document.getElementById('profile-button');
  const marketingNav = document.getElementById('marketing-nav');

  const hasJwt    = !!JWT_TOKEN;
  const hasDev    = !!window.DEV_MOCK_LOGIN;
  let storedHint = null;
  try { storedHint = localStorage.getItem('sf_jwt'); }
  catch { storedHint = null; }
  const hasStored = !!storedHint;
  const loggedIn  = hasJwt || hasDev || hasStored;

  loginButton.hidden = loggedIn;

  if (logoutButton) logoutButton.hidden = !loggedIn;
  if (authPill)     authPill.hidden     = !loggedIn;
  if (profileBtn)   profileBtn.hidden   = !loggedIn;
  if (marketingNav) marketingNav.hidden = loggedIn;

  if (!loggedIn) {
    loginButton.className = 'btn ghost';
    loginButton.textContent = 'Log in / Sign up';
    loginButton.removeAttribute('href');
    loginButton.setAttribute('data-action', 'login');
    loginButton.setAttribute('aria-label', 'Log in to save your progress');
    loginButton.onclick = null;
    loginButton.dataset.notready = '0';
    loginButton.title = 'Log in to save your progress';
  } else {
    loginButton.removeAttribute('href');
    loginButton.removeAttribute('aria-label');
    loginButton.onclick = null;
    loginButton.dataset.notready = '0';
    loginButton.title = '';
  }
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
  closeGearMenus();
  mountMainHeader();

  document.body.dataset.route = path;
  document.body.classList.toggle('logged-in', !!(JWT_TOKEN || window.DEV_MOCK_LOGIN));

  // If logged in, land on /profile or /units instead of Home
  if (JWT_TOKEN && (path === '/' || path === '/home')) {
    const dest = (window.innerWidth < 720) ? '/profile' : '/units';
    history.replaceState({}, '', dest);
    router();
    return;
  }

  document.body.classList.toggle('profile-focus', path === '/profile' && !!JWT_TOKEN);
  if (path !== '/profile' && window._pfGearCleanup) {
    window._pfGearCleanup();
    window._pfGearCleanup = null;
  }

  const fullPath = location.pathname + location.search;
  updateMobileTabsVisibility();
  updateMobileTabsActive(fullPath);
  maybeShowInstallNudge();

  
  // /profile route (cleaned — no more legacy /path)
if (path === '/profile') {
  document.body.classList.remove('in-lesson');
  app.classList.remove('lesson-active');

  const url = new URL(location.href);

  // Default tab for /profile → overview
  if (!url.searchParams.get('tab')) {
    url.searchParams.set('tab', 'overview');
    history.replaceState({}, '', url.pathname + '?' + url.searchParams + url.hash);
  }

  renderProfile();

  if (pendingGearOpen) {
    pendingGearOpen = false;
    window.openProfileGearMenu?.();
  }
  return;
}


  // Lessons
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

    // Daily target gate for guests
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

    // 🔒 Units feature gate (if installed)
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

  // ---------- Units route (desktop learning path) ----------
if (path === '/units') {
  const body = document.body;

  // mark this as the units view, and clear profile/path flags
  body.classList.add('units-view');
  body.classList.remove('in-lesson', 'path-view', 'profile-focus');

  app.classList.remove('lesson-active');

  const homeTplEl = document.getElementById('homeTpl');
  if (!homeTplEl) {
    console.error('CRITICAL: Home template not found!');
    return;
  }

  // Use the same base home template
  app.innerHTML = homeTplEl.innerHTML;

  try { renderContinueCard(); } catch {}

  // ⬇️ render the subject+year Learning Path into the hub
  const hub = document.getElementById('challengeHubContainer') || app;
  renderUnitsView(hub);

  return;
}


  /// ---------- Home route (/, /home, anything else) ----------
  document.body.classList.remove('in-lesson');
  app.classList.remove('lesson-active');

  const homeTplEl = document.getElementById('homeTpl');
  if (homeTplEl) {
    app.innerHTML = homeTplEl.innerHTML;

    try { renderContinueCard(); } catch {}
    try { updateLoginButton(); } catch {}

    // If you still like the units hero banner on home, keeping this is fine:
    injectUnitsDesktopHeader(location.pathname);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        injectUnitsDesktopHeader(location.pathname);
      });
    });

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
  if (hubContainer) hubContainer.innerHTML = '';
  console.warn('renderChallengeHub() is deprecated');
}

/* =========================================
   ✅ NEW: AI & CURRICULUM LOGIC (Paste at bottom)
   ========================================= */

// --- 1. CURRICULUM NAVIGATOR ---

window.selectSubject = function(subj) {
    state.selections.subject = subj;
    updateToggleUI('subject-group', `[data-subject="${subj}"]`);
    updateAiCard();
}

window.selectYear = function(year) {
    state.selections.year = year;
    updateToggleUI('year-group', `[data-year="${year}"]`);
    updateAiCard();
}

function updateToggleUI(groupId, activeSelector) {
    document.querySelectorAll(`#${groupId} .toggle-btn`).forEach(b => b.classList.remove('active'));
    document.querySelector(activeSelector)?.classList.add('active');
}

function updateAiCard() {
    const card = document.getElementById('ai-action-card');
    const title = document.getElementById('ai-card-title');
    const sub = document.getElementById('ai-card-sub');
    const { subject, year } = state.selections;

    if (subject && year) {
        card.classList.add('visible');
        const subjTitle = subject === 'maths' ? 'Maths' : 'English';
        title.textContent = `Year ${year} ${subjTitle} Challenge`;
        sub.textContent = "Tap to generate a question instantly!";
    }
}

function getBaselineLevelForSubject(subj) {
  const profile = state.skillProfile || {};
  return (profile?.[subj]?.baselineLevel) || 'core';
}

function ensureAiSessionDefaults(sel) {
  const subj = sel.subject || 'maths';
  const baseline = getBaselineLevelForSubject(subj);
  if (!state.aiSession) {
    state.aiSession = {
      topic: sel.topic || 'general',
      level: baseline,
      difficulty: baseline,
      total: 5,
      asked: 0,
      correct: 0
    };
  } else {
    if (!state.aiSession.topic) state.aiSession.topic = sel.topic || 'general';
    if (!state.aiSession.level) state.aiSession.level = baseline;
    if (!state.aiSession.difficulty) state.aiSession.difficulty = baseline;
    if (!state.aiSession.total) state.aiSession.total = 5;
    if ((state.aiSession.asked || 0) === 0) {
      state.aiSession.level = baseline;
      state.aiSession.difficulty = baseline;
    }
  }
}

// --- Placement Wizard helpers ---
let _placementRunning = false;

function ensurePlacementOverlay() {
  let root = document.getElementById('placement-overlay');
  if (root) return root;
  const host = document.getElementById('modal-host') || document.body;
  root = document.createElement('div');
  root.id = 'placement-overlay';
  root.className = 'placement-overlay';
  root.innerHTML = `
    <div class="placement-panel">
      <header class="placement-header">
        <h2>Let’s find your starting level!</h2>
        <p>We’ll play a few quick questions so everything feels just right.</p>
      </header>
      <div class="placement-body">
        <div id="placement-question"></div>
        <div id="placement-options"></div>
        <div id="placement-progress"></div>
      </div>
      <footer class="placement-footer">
        <button id="placement-skip" class="btn ghost" type="button">Skip for now</button>
      </footer>
    </div>
  `;
  host.appendChild(root);
  return root;
}

const PLACEMENT_FALLBACKS = [
  { question: 'What is 4 + 3?', answer: 7 },
  { question: 'What is 9 - 2?', answer: 7 },
  { question: 'What is 6 + 5?', answer: 11 },
  { question: 'What is 10 - 4?', answer: 6 },
  { question: 'What is 3 + 8?', answer: 11 },
  { question: 'What is 7 - 3?', answer: 4 },
  { question: 'What is 5 + 2?', answer: 7 },
  { question: 'What is 12 - 5?', answer: 7 }
];

async function fetchPlacementQuestion(subject, year) {
  let data = null;
  try {
    if (window.aiGame?.generateChallenge) {
      data = await window.aiGame.generateChallenge({
        subject,
        year: year || 3,
        topic: 'general',
        level: 'support',
        difficulty: 'support',
        mode: 'placement'
      });
      console.debug('[placement] using AI challenge', data);
    } else {
      console.debug('[placement] aiGame.generateChallenge not available');
    }
  } catch (e) {
    console.warn('[placement] AI fetch failed, using fallback', e);
  }
  if (data && (data.question || data.story)) {
    return data;
  }
  const fallback = PLACEMENT_FALLBACKS[Math.floor(Math.random() * PLACEMENT_FALLBACKS.length)];
  console.debug('[placement] using fallback', fallback);
  return {
    question: fallback.question,
    answer: fallback.answer,
    hint: 'Think carefully about adding or subtracting.'
  };
}


async function runPlacementWizardForSubject(subject, yearHint) {
  const profile = state.skillProfile || {};
  const entry = profile[subject];
  const ninetyDays = 90 * 24 * 60 * 60 * 1000;
  const recent = entry?.lastPlacementAt && (Date.now() - entry.lastPlacementAt < ninetyDays);

// ✅ if they've ever finished placement OR clicked "Keep my current level", skip wizard
if (entry && (entry.placementDone || (entry.confidence >= 0.7 && recent))) {
  return;
}

  if (_placementRunning) return;

  _placementRunning = true;
  const overlay = ensurePlacementOverlay();
  const questionEl = overlay.querySelector('#placement-question');
  const optionsEl = overlay.querySelector('#placement-options');
  const progressEl = overlay.querySelector('#placement-progress');
  const skipBtn = overlay.querySelector('#placement-skip');

  const total = 6;
  let asked = 0;
  let correct = 0;
  let aborted = false;

  function updateProgress() {
    if (progressEl) progressEl.textContent = `Q${asked + 1} of ${total}`;
  }

  function closeOverlay() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  async function poseNext() {
  if (!questionEl || !optionsEl) return;
  if (asked >= total) return finalize();

  optionsEl.innerHTML = '';

  const q = await fetchPlacementQuestion(subject, yearHint);
  questionEl.textContent = q.question || q.story || 'Ready for a quick question?';
  updateProgress();

  const card = document.createElement('div');
  card.className = 'ai-answer-card';

  const input = document.createElement('input');
  input.type = 'number';
  input.inputMode = 'numeric';
  input.placeholder = 'Type your answer';
  input.className = 'ai-input';

  card.appendChild(input);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn-primary';
  btn.textContent = 'Check';

  btn.addEventListener('click', () => {
    const val = Number(input.value);
    const target = Number(q.answer);
    if (Number.isFinite(val) && Number.isFinite(target) && val === target) {
      correct += 1;
    }
    asked += 1;
    poseNext();
  });

  optionsEl.appendChild(card);
  optionsEl.appendChild(btn);
}



  async function finalize() {
    const accuracy = total ? (correct / total) : 0;
    let baseline = 'core';
    if (accuracy < 0.4) baseline = 'support';
    else if (accuracy > 0.8) baseline = 'stretch';

    // Build meta payload for future analytics
    const prev = profile[subject] || {};
    const meta = {
      ...(prev.meta || {}),
      placements_run: ((prev.meta && prev.meta.placements_run) || 0) + 1,

      last_placement: {
        score: correct,
        out_of: total,
        accuracy,
        raw_seconds: (typeof totalSeconds !== 'undefined' ? totalSeconds : null),
        completed_at: new Date().toISOString(),
        mode: 'placement',
      },
    };

    const confidence = Math.min(1, Math.max(0.2, accuracy || 0.3));
    profile[subject] = {
     ...prev,
     baselineLevel: baseline,
     confidence,
     placementDone: true,
     lastPlacementAt: Date.now(),
     meta,
    };
    state.skillProfile = profile;
    if (state.selections?.subject === subject) {
      state.selections.level = baseline;
    }
    saveSkillProfile();
    // Fire-and-forget server sync; do not block UI
    pushServerSkillProfile(subject, profile[subject]).catch(console.error);
    closeOverlay();
    _placementRunning = false;
  }

      if (skipBtn) {
    if (entry) {
      // Returning user: keep existing baseline, don't force them to core
      skipBtn.textContent = 'Keep my current level';
      skipBtn.onclick = () => {
        aborted = true;

        const existing = profile[subject] || {};
        profile[subject] = {
         ...existing,
          baselineLevel: existing.baselineLevel || 'core',
         // Refresh placement timestamp so we don't nag immediately again
         lastPlacementAt: Date.now(),
          confidence: typeof existing.confidence === 'number'
          ? existing.confidence
         : 0.7,
         placementDone: true
        };

        state.skillProfile = profile;

        state.selections = state.selections || {};
        state.selections.subject = subject;
        state.selections.level   = profile[subject].baselineLevel || 'core';

        saveSkillProfile();
        closeOverlay();
        _placementRunning = false;
      };
    } else {
      // First-time user: hide skip completely so they actually do the quick check
      skipBtn.style.display = 'none';
    }
  }



  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  await poseNext();

  // guard: if loop ended without finalize call (e.g. missing question), finalize now
  if (!aborted && asked >= total) await finalize();
}

async function ensurePlacementBeforeAI(subject, year) {
  try {
    await runPlacementWizardForSubject(subject, year);
  } catch (e) {
    console.warn('[placement] failed to run, proceeding with default', e);
  }
}
window.ensurePlacementBeforeAI = ensurePlacementBeforeAI;

// --- 2. AI MODAL ACTIONS ---

function closeAiModal() {
  const modal = document.getElementById('ai-modal');
  if (!modal) return;
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

function ensureAiModal() {
  let modal = document.getElementById('ai-modal');
  if (modal) return modal;

  // Use your existing modal host if present
  const host = document.getElementById('modal-host') || document.body;

  modal = document.createElement('div');
  modal.id = 'ai-modal';
  modal.className = 'ai-modal-overlay';

  modal.innerHTML = `
    <div class="ai-modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <header class="ai-modal-header">
        <button type="button" id="ai-close-x" class="ai-close-btn" aria-label="Close">✕</button>
        <div class="ai-progress-bar" aria-hidden="true">
          <div id="ai-progress-fill" class="ai-progress-bar-fill"></div>
        </div>
        <span id="ai-progress" class="ai-progress-chip" aria-live="polite">Q1 of 5</span>
      </header>

      <main class="ai-step-host" id="ai-step-host">
        <div id="ai-question" class="ai-question-text"></div>
        <p id="ai-result-text" hidden></p>

        <!-- Generic answer card for fill-in style questions -->
        <div id="ai-answer-card" class="ai-answer-card" hidden>
          <input
            id="ai-user-input"
            type="number"
            inputmode="numeric"
            class="ai-input"
            placeholder="Type your answer"
          />
        </div>

        <!-- Dynamic per-step content (MCQ, pairs, etc.) goes here -->
        <div id="ai-interactive"></div>
      </main>

      <footer class="ai-modal-footer">
        <div id="ai-feedback" class="ai-feedback" hidden></div>
        <button id="ai-action-btn" class="ai-primary-btn" type="button">Generate ✨</button>
      </footer>
    </div>
  `;

  host.appendChild(modal);

  const closeBtn = modal.querySelector('#ai-close-x');
  if (closeBtn) closeBtn.addEventListener('click', closeAiModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeAiModal();
  });

  return modal;
}


function updateAiProgressChip() {
  const prog = document.getElementById('ai-progress');
  const fill = document.getElementById('ai-progress-fill');
  const session = state.aiSession;

  if (!prog || !session || !session.total) {
    if (prog) prog.textContent = '';
    if (fill) fill.style.transform = 'scaleX(0)';
    return;
  }

  const total = session.total;
  const answered = session.asked || 0;

  // For the label, show the current question (asked so far + 1), clamped to total.
  const labelIndex = total > 0
    ? Math.min(answered + (session.completed ? 0 : 1), total)
    : 1;

  // For the bar, fill based on how many have actually been asked.
  const pct = total > 0 ? Math.min(1, answered / total) : 0;

  if (session.completed) {
    prog.textContent = 'Session complete';
  } else {
    prog.textContent = `Q${labelIndex} of ${total}`;
  }

  if (fill) {
    fill.style.transform = `scaleX(${pct})`;
  }
}



function setAiButton(label, handler, disabled = false) {
  const btn = document.getElementById('ai-action-btn');
  if (!btn) return;
  btn.innerText = label;
  btn.onclick = handler;
  btn.disabled = !!disabled;
}

function resetAiStepState() {
  state.aiStepState = { answered: false };
  state.aiStep = {
    attempts: 0,
    answeredCorrectly: false,
    startedAt: Date.now()
  };
  const feedback = document.getElementById('ai-feedback');
  if (feedback) { feedback.hidden = true; feedback.innerText = ''; feedback.style.color = ''; }
}

function normalizeAiStep(data, subject) {
  const modeRaw = data?.mode || data?.type || '';
  const mode = String(modeRaw || '').toLowerCase();
  const basePrompt = data.prompt || data.question || data.story || '';

  const step = {
    type: 'fillBlank',
    prompt: basePrompt,
    audioUrl: data.audioUrl || null,
    imageUrl: data.imageUrl || null,
    imageAlt: data.imageAlt || null,
    manipulatives: data.manipulatives || null
  };

  if (mode.includes('multi') && mode.includes('choice')) {
    step.type = 'multiChoice';
    step.options = data.options || [];
    step.correct = data.correct ?? data.answer;
    step.hint = data.hint;

  } else if (mode === 'multiselect' || mode === 'multi_select') {
    step.type = 'multiSelect';
    step.options = data.options || [];
    step.correct = data.correct ?? data.answer ?? [];
    step.hint = data.hint;

  } else if (mode === 'truefalse' || mode === 'true_false') {
    step.type = 'trueFalse';
    step.prompt = basePrompt || data.statement || '';
    step.correct = typeof data.correct === 'boolean'
      ? data.correct
      : !!(String(data.answer || '').toLowerCase().startsWith('t'));
    step.hint = data.hint;

  } else if (mode === 'matchpairs' || mode === 'match_pairs') {
    step.type = 'matchPairs';
    step.pairs = data.pairs || data.options || [];
    step.hint = data.hint;

  } else if (mode === 'sortitems' || mode === 'sort_items') {
    step.type = 'sortItems';
    step.items = data.items || data.options || [];
    step.answer = data.correct || data.answer || [];
    step.hint = data.hint;

  } else if (mode === 'fillblank' || mode === 'fill_blank') {
    step.type = 'fillBlank';
    step.answer = data.correct ?? data.answer;
    step.hint = data.hint;

  } else if (subject === 'english' && data.story) {
    step.type = 'story';
    step.story = data.story;
    step.hint = data.hint;

  } else {
    step.type = 'fillBlank';
    step.answer = data.correct ?? data.answer;
    step.hint = data.hint;
  }

  step.audioUrl = step.audioUrl || null;
  step.imageUrl = step.imageUrl || null;
  step.imageAlt = step.imageAlt || null;
  step.manipulatives = step.manipulatives || null;
  step.prompt = step.prompt || basePrompt;
  return step;
}


function handleAiStepResult(isCorrect, hintText) {
  const feedback = document.getElementById('ai-feedback');
  const session = state.aiSession || {};
  const hasMore = ((session.asked || 0) + 1) < (session.total || 5);

  if (feedback) {
    feedback.hidden = false;
    feedback.classList.remove('good', 'bad');
    feedback.classList.add(isCorrect ? 'good' : 'bad');
    feedback.innerText = isCorrect
      ? 'Great job! 🎉'
      : (hintText ? `Not quite. ${hintText}` : 'Not quite. Try again!');
  }

  if (isCorrect && !state.aiStepState?.answered) {
    state.aiStepState = state.aiStepState || {};
    state.aiStepState.answered = true;
    awardLocalCoins(10);
  }

  if (isCorrect) {
    if (hasMore) {
      setAiButton('Next Question', () => nextAiQuestion());
    } else {
      setAiButton('Finish', () => finishAiSession());
    }
  } else {
    // default: allow another try – may be overridden by checkAiStepAnswer after 2 attempts
    setAiButton('Check Answer', () => checkAiStepAnswer());
  }
}


function renderAiStep(step) {
  const host        = document.getElementById('ai-step-host');
  const interactive = document.getElementById('ai-interactive') || host;
  const questionEl  = document.getElementById('ai-question');
  const result      = document.getElementById('ai-result-text');
  const input       = document.getElementById('ai-user-input');
  const answerCard  = document.getElementById('ai-answer-card');

  resetAiStepState();

  if (!host || !interactive || !questionEl || !result || !input || !answerCard) {
    console.warn('[ai] renderAiStep: missing modal elements');
    return;
  }

  // 🔄 Reset shell (but DO NOT wipe host container)
  interactive.innerHTML = '';
  input.hidden   = true;
  input.value    = '';
  input.disabled = false;
  answerCard.hidden = true;
  result.hidden  = true;
  result.innerText = '';

  // 📝 Question text
  questionEl.textContent =
    step.prompt || step.question || step.story || 'Ready?';

  // 📊 Media / manipulatives (render into interactive area, under question)
  const mediaStep = Object.assign({}, step, { prompt: null, question: null, story: null });

  if (step.manipulatives) {
    renderManipulatives(interactive, step.manipulatives);
  }

  renderMediaBlocks(interactive, mediaStep);

  // Helper to attach option grids into the interactive area
  const ensureOptionsWrapper = () => {
    const wrap = document.createElement('div');
    wrap.className = 'ai-options-grid';
    interactive.appendChild(wrap);
    return wrap;
  };

  // 📖 Story-only step: just show "Next"
  if (step.type === 'story') {
    setAiButton('Next', () => handleAiStepResult(true));
    return;
  }

  // 🔢 Multi-choice / multi-select
  if (step.type === 'multiChoice' || step.type === 'multiSelect') {
    const wrap = ensureOptionsWrapper();
    const opts = Array.from(step.options || []);
    state.aiStepState = state.aiStepState || {};

    if (opts.length) {
      opts
        .map((opt) => ({ text: typeof opt === 'string' ? opt : (opt.text ?? opt) }))
        .sort(() => Math.random() - 0.5)
        .forEach((opt) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'ai-option-card';
          b.textContent = String(opt.text);

          b.onclick = () => {
            const cards = Array.from(wrap.querySelectorAll('.ai-option-card'));

            if (step.type === 'multiSelect') {
              // 🔁 TOGGLE selection for multiSelect
              b.classList.toggle('selected');

              const selectedTexts = cards
                .filter(c => c.classList.contains('selected'))
                .map(c => (c.textContent || '').trim());

              // store for checkAiStepAnswer()
              state.aiStepState.selected = selectedTexts;
              // ❗ no auto-check here – user presses "Check Answer"
            } else {
              // 🎯 single-select for multiChoice
              cards.forEach(c => c.classList.remove('selected'));
              b.classList.add('selected');

              const isCorrect = String(opt.text) === String(step.correct);
              state.aiStep = state.aiStep || {
                attempts: 0,
                answeredCorrectly: false,
                startedAt: Date.now()
              };
              state.aiStep.answeredCorrectly = isCorrect;
              state.aiStep.attempts = (state.aiStep.attempts || 0) + 1;

              handleAiStepResult(isCorrect, step.hint);
            }
          };

          wrap.appendChild(b);
        });
    }

    if (step.type === 'multiSelect') {
      // For multiSelect we ONLY evaluate on Check Answer
      setAiButton('Check Answer', () => checkAiStepAnswer());
    } else {
      // multiChoice answers are handled on click
      setAiButton('Check Answer', () => {});
    }

    return;
  }

  // ✅ True / False
  if (step.type === 'trueFalse') {
    const wrap = ensureOptionsWrapper();

    ['True', 'False'].forEach((label, idx) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ai-option-card';
      b.textContent = label;

      b.onclick = () => {
        wrap.querySelectorAll('.ai-option-card').forEach(c => c.classList.remove('selected'));
        b.classList.add('selected');

        const isTrue = idx === 0;
        const isCorrect = (isTrue === !!step.correct);

        state.aiStep = state.aiStep || {
          attempts: 0,
          answeredCorrectly: false,
          startedAt: Date.now()
        };
        state.aiStep.answeredCorrectly = isCorrect;
        state.aiStep.attempts = (state.aiStep.attempts || 0) + 1;

        handleAiStepResult(isCorrect, step.hint);
      };

      wrap.appendChild(b);
    });

    setAiButton('Check Answer', () => {});
    return;
  }

  // ✏️ Fill-blank (number input card)
  if (step.type === 'fillBlank') {
    input.type = 'number';
    input.hidden = false;
    input.placeholder = 'Type your answer';
    answerCard.hidden = false;

    setAiButton('Check Answer', () => checkAiStepAnswer());
    return;
  }

  // 🧩 Match pairs
if (step.type === 'matchPairs') {
  const pairs = Array.isArray(step.pairs) ? step.pairs : [];
  const leftCol  = document.createElement('div');
  const rightCol = document.createElement('div');

  leftCol.className  = 'pair-col left';
  rightCol.className = 'pair-col right';

  const leftBtns = [];
  const rightBtns = [];
  let pendingLeft = null;
  let pairing     = false; // guard against re-entrant right-click storms

  state.aiStepState = { pairs: {} };

  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // build left in original order
  pairs.forEach((p, idx) => {
    const ltext = p.left  ?? p.prompt ?? p.q ?? p[0];
    if (!ltext) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ai-option-card pair-card pair-left';
    b.textContent = String(ltext);
    b.dataset.orig = String(idx);
    b.onclick = (e) => {
      if (e) e.stopPropagation();  // don't bubble out of the modal
      if (b.classList.contains('pair-locked')) return;
      pendingLeft = b;
      leftBtns.forEach(btn => btn.classList.remove('selected'));
      b.classList.add('selected');
    };
    leftBtns.push(b);
    leftCol.appendChild(b);
  });

  // build right shuffled
  const shuffledRight = shuffle(
    pairs.map((p, idx) => ({
      text: p.right ?? p.answer ?? p.a ?? p[1],
      orig: idx
    }))
  );

  shuffledRight.forEach(p => {
    if (!p.text) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ai-option-card pair-card pair-right';
    b.textContent = String(p.text);
    b.dataset.orig = String(p.orig);
    b.onclick = (e) => {
      if (e) e.stopPropagation();       // don't bubble out
      if (pairing) return;              // re-entrancy guard
      if (!pendingLeft || b.classList.contains('pair-locked')) return;

      pairing = true;
      try {
        const leftOrig  = pendingLeft.dataset.orig;
        const rightOrig = b.dataset.orig;

        if (leftOrig === rightOrig) {
          // ✅ Correct match: colour + lock both
          const colorIdx = Number(leftOrig) % 4;
          pendingLeft.classList.add('pair-locked', `pair-colour-${colorIdx}`);
          b.classList.add('pair-locked', `pair-colour-${colorIdx}`);

          pendingLeft.disabled = true;
          b.disabled = true;
          pendingLeft.classList.remove('selected');

          // store for checkAiStepAnswer
          state.aiStepState.pairs[leftOrig] = b.textContent;

          pendingLeft = null;
        } else {
          // ❌ wrong match – temporarily disable flash to avoid GPU / layout issues
          pendingLeft = null;
        }
      } finally {
        pairing = false;
      }
    };
    rightBtns.push(b);
    rightCol.appendChild(b);
  });

  const wrap = document.createElement('div');
  wrap.className = 'pair-wrap';
  wrap.appendChild(leftCol);
  wrap.appendChild(rightCol);
  interactive.appendChild(wrap);

  setAiButton('Check Answer', () => checkAiStepAnswer());
  return;
}


  // 🔗 Sort items
  if (step.type === 'sortItems') {
    const bank = document.createElement('div');
    const out  = document.createElement('div');

    bank.className = 'option-grid word-bank';
    out.className  = 'option-grid sentence-builder';

    state.aiStepState = { order: [] };

    (step.items || []).forEach((it, idx) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'option-card word-card';
      b.textContent = String(it);

      b.onclick = () => {
        if (b.disabled) return;

        const c = document.createElement('button');
        c.type = 'button';
        c.className = 'option-card word-card chosen';
        c.textContent = String(it);
        c.dataset.srcIndex = String(idx);
        c.onclick = () => {
          out.removeChild(c);
          b.disabled = false;
        };

        out.appendChild(c);
        b.disabled = true;
      };

      bank.appendChild(b);
    });

    interactive.appendChild(out);
    interactive.appendChild(bank);

    setAiButton('Check Answer', () => checkAiStepAnswer());
    return;
  }

  // Fallback
  setAiButton('Finish', () => finishAiSession());
}

function normaliseSortToken(raw) {
  if (!raw) return '';
  let s = String(raw).trim().toLowerCase();

  // strip thousands separators
  s = s.replace(/,/g, '');

  // map common words to digits where obvious
  const simpleWords = {
    'zero': '0',
    'one': '1',
    'two': '2',
    'three': '3',
    'four': '4',
    'five': '5',
    'six': '6',
    'seven': '7',
    'eight': '8',
    'nine': '9',
    'ten': '10'
  };
  if (simpleWords[s]) return simpleWords[s];

  // turn things like "4 hundreds + 2 tens" or "400 + 20 + 8" into a plain expression
  if (/[0-9]/.test(s)) {
    s = s
      .replace(/hundreds?/g, '*100')
      .replace(/tens?/g, '*10')
      .replace(/ones?|units?/g, '*1')
      .replace(/\s+/g, ''); // remove spaces
    try {
      // VERY light eval: only digits, +, -, *, /
      if (!/[^0-9+\-*/.]/.test(s)) {
        // eslint-disable-next-line no-eval
        const val = eval(s);
        if (typeof val === 'number' && isFinite(val)) {
          return String(val);
        }
      }
    } catch (_) {
      // ignore if it fails, fall through
    }
  }

  return s;
}



function checkAiStepAnswer() {
  const step = state.aiSession?.currentStep;
  if (!step) return;

  state.aiStep = state.aiStep || {
    attempts: 0,
    answeredCorrectly: false,
    startedAt: Date.now()
  };

  let ok = false;

  if (step.type === 'fillBlank') {
    const input = document.getElementById('ai-user-input');
    const val = normalizeText(input?.value || '');
    const target = Array.isArray(step.answer)
      ? step.answer.map(normalizeText)
      : [normalizeText(step.answer ?? step.correct ?? '')];
    ok = target.some(t => t && t === val);

  } else if (step.type === 'matchPairs') {
    const userPairs = state.aiStepState?.pairs || {};
    const pairs = Array.isArray(step.pairs) ? step.pairs : [];
    ok = pairs.length && pairs.every((p, i) => {
      const right = p.right ?? p.answer ?? p.a ?? p[1];
      return String(userPairs[i] || '').trim() === String(right || '').trim();
    });

  } else if (step.type === 'sortItems') {
  const out = document.querySelectorAll('#ai-step-host .sentence-builder .option-card');
  const chosenRaw = Array.from(out).map(el => el.textContent || '');

  // If the model forgot to send step.answer, fall back to the given items
  const expectedSource = Array.isArray(step.answer) && step.answer.length
    ? step.answer
    : (Array.isArray(step.items) ? step.items : []);

  const expectedRaw = expectedSource.map(String);

  const chosen   = chosenRaw.map(normaliseSortToken);
  const expected = expectedRaw.map(normaliseSortToken);

  ok =
    expected.length &&
    expected.length === chosen.length &&
    expected.every((v, idx) => v === chosen[idx]);
}

 else if (step.type === 'multiSelect') {
    const selected = (state.aiStepState?.selected || []).map(String);
    const expected = Array.isArray(step.correct)
      ? step.correct.map(String)
      : [String(step.correct)];

    // order-insensitive
    const sortNorm = arr => arr.map(v => v.trim()).sort();
    const sSel = sortNorm(selected);
    const sExp = sortNorm(expected);

    ok =
      sExp.length > 0 &&
      sSel.length === sExp.length &&
      sExp.every((v, idx) => v === sSel[idx]);
  }

  state.aiStep.attempts = (state.aiStep.attempts || 0) + 1;

  if (ok) {
    state.aiStep.answeredCorrectly = true;
    return handleAiStepResult(true, step.hint);
  }

  // ❌ incorrect
  if (state.aiStep.attempts < 2) {
    // first miss – encouragement + try again
    return handleAiStepResult(false, step.hint);
  }

  // second miss – move on
  state.aiStep.answeredCorrectly = false;
  handleAiStepResult(false, step.hint);
  setAiButton('Next Question', () => nextAiQuestion());
}



window.launchAI = function() {
  const sel = state.selections || {};
  const subject = sel.subject;
  const year = sel.year;

  console.log('[ai] launchAI called with', { subject, year });

  if (!subject || !year) {
    console.warn('[ai] Missing subject/year in state.selections');
    return;
  }

  const modal   = ensureAiModal();  // 👈 this creates it if needed
  const title   = document.getElementById('modal-title');
  const icon    = document.getElementById('modal-icon');
  const btn     = document.getElementById('ai-action-btn');
  const input   = document.getElementById('ai-user-input');
  const result  = document.getElementById('ai-result-text');
  const feedback= document.getElementById('ai-feedback');

  if (!modal) {
    console.error('[ai] Failed to create #ai-modal');
    return;
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Reset UI
  state.currentAiChallenge = null;
  state.currentAiHint = null;
  if (result)   { result.hidden = true; result.innerText = ''; }
  if (feedback) { feedback.hidden = true; feedback.innerText = ''; }
  if (input)    { input.hidden = true; input.value = ''; input.disabled = false; }

  if (btn) {
    btn.innerText = 'Generate ✨';
    btn.disabled = false;
    btn.onclick = callBackend;
  } else {
    console.error('[ai] #ai-action-btn not found');
  }

  // Customize Modal Style
  if (subject === 'maths') {
    if (title) title.innerText = 'Riddle Wizard 🧙‍♂️';
    if (icon) { icon.className = 'ph ph-calculator'; icon.style.color = '#06b6d4'; }
  } else {
    if (title) title.innerText = 'Story Spark ✨';
    if (icon) { icon.className = 'ph ph-book-open-text'; icon.style.color = '#ec4899'; }
  }

  ensureAiSessionDefaults(sel);
  updateAiProgressChip();

  if ((state.aiSession?.asked || 0) === 0) {
    callBackend();
  }
};



// This matches the onclick="handleAiAction()" in your HTML
window.handleAiAction = function() {
    callBackend();
}

async function callBackend(opts = {}) {
  const sel     = state.selections || {};
  const subject = sel.subject;
  const year    = sel.year;
  ensureAiSessionDefaults(sel);
  const session = state.aiSession || {};

  const btn      = document.getElementById('ai-action-btn');
  const result   = document.getElementById('ai-result-text');
  const input    = document.getElementById('ai-user-input');
  const feedback = document.getElementById('ai-feedback');

  const isLocal =
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.hostname === '[::1]';

  console.log('[ai] callBackend', { subject, year, isLocal });

  if (!subject || !year) {
    console.warn('[ai] Missing subject/year when calling backend');
    return;
  }

  if (btn) {
    btn.innerText = 'Thinking...';
    btn.disabled = true;
  }

  let data = null;

  try {
    if (isLocal) {
      // 🔹 LOCAL DEV: no network, just a fake challenge
      console.log('[ai] USING LOCAL MOCK challenge (no network)');
      data = {
        question:
          'Sarah has 3 apples and John has 7 apples. How many apples do they have altogether?',
        answer: 10,
        hint: 'Add the two numbers together.',
      };
    } else {
      // 🔹 REAL PATH: go via ai.js → Laravel proxy
      if (!window.aiGame || typeof window.aiGame.generateChallenge !== 'function') {
        console.error('[ai] window.aiGame.generateChallenge missing');
      } else {
        const payload = {
          subject,
          year,
          topic: sel.topic || session.topic || 'general',
          level: session.level || getBaselineLevelForSubject(subject),
          difficulty: session.difficulty || session.band || getBaselineLevelForSubject(subject),
          mode: opts.mode || session.mode || 'practice',
          session: { asked: session.asked || 0, correct: session.correct || 0 },
          step_result: opts.step_result || state.lastAiStepResult || null,
          objective_id: session.objectiveId || null
        };
        data = await window.aiGame.generateChallenge(payload);
      }
    }
  } catch (err) {
    console.error('[ai] Error talking to backend', err);
  }

  if (btn) btn.disabled = false;

  console.log('[ai] backend response', data);

  if (!data) {
    if (result) { result.hidden = false; result.innerText = '⚠️ Could not load a challenge. Try again!'; }
    setAiButton('Retry', () => callBackend(opts));
    return;
  }

  updateAiProgressChip();

  state.aiSession.currentStep = normalizeAiStep(data, subject);
  renderAiStep(state.aiSession.currentStep);
}





function checkAiAnswer() {
  const input    = document.getElementById('ai-user-input');
  const feedback = document.getElementById('ai-feedback');
  const btn      = document.getElementById('ai-action-btn');

  if (!input || !feedback) return;

  const userVal = Number(input.value);
  const correct = Number(state.currentAiChallenge);

  feedback.hidden = false;
  feedback.classList.remove('good', 'bad');

  if (!Number.isFinite(correct)) {
    feedback.classList.add('bad');
    feedback.innerText = 'We lost the correct answer. Try generating a new question!';
    return;
  }

  if (userVal === correct) {
    feedback.classList.add('good');
    feedback.innerText = '🎉 Correct! +10 Coins';
    awardLocalCoins(10);
    if (state.aiSession) {
      state.aiSession.correct = (state.aiSession.correct || 0) + 1;
    }
    if (input) input.disabled = true;

    const session = state.aiSession;
    const hasMore = session && (session.asked || 0) < (session.total || 0);

    if (btn) {
      btn.disabled = false;
      if (hasMore) {
        btn.innerText = 'Next Question';
        btn.onclick = nextAiQuestion;
      } else {
        btn.innerText = 'Finish';
        btn.onclick = finishAiSession;
      }
    }
  } else {
    feedback.classList.add('bad');
    // Optional: use the hint you got from backend
    if (state.currentAiHint) {
      feedback.innerText = `Not quite. Try again! 💡 Hint: ${state.currentAiHint}`;
    } else {
      feedback.innerText = 'Not quite. Try again!';
    }
  }
}

function nextAiQuestion() {
  const input    = document.getElementById('ai-user-input');
  const feedback = document.getElementById('ai-feedback');
  const btn      = document.getElementById('ai-action-btn');

  const stepResult = {
    correct: !!state.aiStep?.answeredCorrectly,
    attempts: state.aiStep?.attempts || 0,
    seconds: Math.max(
      1,
      Math.round((Date.now() - (state.aiStep?.startedAt || Date.now())) / 1000)
    ),
    difficulty: state.aiSession?.difficulty || state.aiSession?.band || null,
    objective_id: state.aiSession?.objectiveId || null
  };

  state.lastAiStepResult = stepResult;
  if (state.aiStep) state.aiStep.committed = true;

  if (state.aiSession) {
    state.aiSession.asked = (state.aiSession.asked || 0) + 1;
    if (stepResult.correct) {
      state.aiSession.correct = (state.aiSession.correct || 0) + 1;
    }
    updateAiProgressChip();
  }

  const asked = state.aiSession?.asked || 0;
  const total = state.aiSession?.total || 0;
  if (asked >= total) {
    finishAiSession();
    return;
  }

  if (input) {
    input.disabled = false;
    input.value = '';
  }
  if (feedback) {
    feedback.hidden = true;
    feedback.innerText = '';
  }
  if (btn) {
    btn.disabled = false;
    btn.innerText = 'Thinking...';
  }

  callBackend({ step_result: stepResult });
}


function completeAiUnitSession({
  subject,
  year,
  topic,
  aiUnitId,
  aiStepId,
  asked,
  correct,
  accuracy,
  targetQuestions,
  coinsSuggested
}) {
  const hasEnoughQuestions = typeof asked === 'number' && asked > 0;
  const hasAccuracy        = typeof accuracy === 'number';
  if (!hasEnoughQuestions || !hasAccuracy) {
    console.warn('[ai] completeAiUnitSession called without asked/accuracy', {
      asked,
      accuracy,
      subject,
      year,
      topic,
      aiUnitId,
      aiStepId
    });
    return;
  }

  try {
    const sel   = state.selections || {};

    const subj  = subject || sel.subject || state.subject;
    const yr    = (typeof year === 'number' && !Number.isNaN(year))
      ? year
      : (sel.year || state.year);
    const top   = topic || sel.topic || state.topic;

    const profileForSubject = state.skillProfile?.[subj || ''] || {};
    const level = sel.level
      || profileForSubject.baselineLevel
      || 'core';

    const normalized = { subject: subj, year: yr, topic: top, level };

    const K = (typeof _unitKeys === 'function') ? _unitKeys(normalized) : null;
    const idxKey = K?.uIdx;
    if (!idxKey) {
      console.warn('[ai] no idxKey for normalized selection', normalized);
      return;
    }

    const current = Number(localStorage.getItem(idxKey) || 0);
    const next = current + 1;

    localStorage.setItem(idxKey, next);

    console.debug('[ai] unit progress advanced', {
      subject: subj,
      year: yr,
      topic: top,
      level,
      idxKey,
      from: current,
      to: next
    });

    // mirror to server (fire-and-forget)
    try {
      const key = buildSelectionKey(normalized);
      if (key && window.sfUnits?.saveUnitsPointer) {
        window.sfUnits.saveUnitsPointer(key, { unit_index: next, lesson_index: 0 });
      }
    } catch (e2) {
      console.warn('[ai] saveUnitsPointer failed', e2);
    }
  } catch (e) {
    console.warn('[ai] unit pointer update failed', e);
  }
}



// --- Duolingo-style Streak Helper ---
async function applyDailyStreak(reason = 'activity') {
  try {
    const profile = profileStore.get() || {};
    const streak  = profile.streak || {
      current: 0,
      best: 0,
      lastActiveISO: '',
      freezeTokens: 0
    };

    const nowISO  = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const lastISO = streak.lastActiveISO || '';
    const prev    = streak.current || 0;
    const freezeTokens = streak.freezeTokens || 0;

    const result = calcStreak(lastISO, nowISO, prev, freezeTokens);

    // Update profile streak fields
    const newStreak = {
  current: result.current,
  best: Math.max(streak.best || 0, result.current),
  lastActiveISO: nowISO,
  freezeTokens: result.freezeTokens
};

profileStore.update((draft) => {
  draft.streak = newStreak;
});

state.streak = newStreak.current;
state.streakDays = newStreak.current;


    if (typeof updateUiCounters === 'function') {
      updateUiCounters();
    }

    // TEMP: do not let the backend overwrite local streak until API is aligned
    // if (window.JWT_TOKEN && typeof updateUserProgress === 'function') {
    //   if (result.delta > 0) {
    //     await updateUserProgress({ streakEarned: true });
    //   }
    // }

    console.log('[streak] updated', { reason, result, newStreak });

  } catch (err) {
    console.warn('[streak] applyDailyStreak failed', err);
  }
}
 



async function finishAiSession() {
  const session    = state.aiSession;
  const questionEl = document.getElementById('ai-question');
  const result     = document.getElementById('ai-result-text');
  const btn        = document.getElementById('ai-action-btn');
  const input      = document.getElementById('ai-user-input');
  const answerCard = document.getElementById('ai-answer-card');
  const feedback   = document.getElementById('ai-feedback');
  const interactive = document.getElementById('ai-interactive') || document.getElementById('ai-step-host');

  const sel = state.selections || {};

  // Commit the last step if it hasn't been committed yet
  if (session && !state.aiStep?.committed) {
    const stepResult = {
      correct: !!state.aiStep?.answeredCorrectly,
      attempts: state.aiStep?.attempts || 0,
      seconds: Math.max(
        1,
        Math.round((Date.now() - (state.aiStep?.startedAt || Date.now())) / 1000)
      ),
      difficulty: session?.difficulty || session?.band || null,
      objective_id: session?.objectiveId || null
    };
    state.lastAiStepResult = stepResult;
    if (stepResult.correct && state.aiSession) {
      state.aiSession.correct = (state.aiSession.correct || 0) + 1;
      updateAiProgressChip();
    }
    if (state.aiStep) state.aiStep.committed = true;
  }

  // Clear the active question UI
  if (interactive) {
    interactive.innerHTML = '';
  }
  if (questionEl) {
    questionEl.textContent = 'Session complete 🎉';
  }

  if (input) {
    input.disabled = true;
    input.value = '';
  }
  if (answerCard) {
    answerCard.hidden = true;
  }

  // Show feedback line in green
  if (feedback) {
    feedback.hidden = false;
    feedback.classList.remove('bad');
    feedback.classList.add('good');
    feedback.textContent = 'Great job! 🎉';
  }

  // Main summary text in the centre
  if (session && result) {
    const correct  = Number(session.correct || 0);
    const total    = Number(session.total || 0);
    const accuracy = total > 0 ? (correct / total) : 0;

    const subjectLabel =
      sel.subject === 'maths'   ? 'Maths'   :
      sel.subject === 'english' ? 'English' :
      'Challenge';

    const yearText   = sel.year  ? `Year ${sel.year} ` : '';
    const topicText  = sel.topic ? `– ${sel.topic.replace(/[-_]+/g, ' ')}` : '';
    const subjectKey = sel.subject || 'maths';

    result.hidden = false;

    const percent = total ? Math.round((correct / total) * 100) : 0;
    let headline = '';
    let line = '';

    if (percent >= 80) {
      headline = 'Awesome work! 🎉';
      line = `You got ${correct} of ${total} right. Ready for the next step?`;
    } else if (percent >= 50) {
      headline = 'Nice try! 🙂';
      line = `You got ${correct} of ${total}. Want to practise once more?`;
    } else {
      headline = 'Keep practising! 💪';
      line = `You got ${correct} of ${total}. Let’s try this step again.`;
    }

        result.innerText = `${headline} ${line}`;

    // --- unlock the step locally (Units list reads this)
    // Coins were already added per-correct question via awardLocalCoins
    const coinsEarned = correct * 10;
    completeAiUnitSession({
      subject: sel.subject,
      year: sel.year,
      topic: sel.topic,
      aiUnitId: sel.aiUnitId,
      aiStepId: sel.aiStepId,
      asked: total,
      correct,
      accuracy,
      targetQuestions: total,
      coinsSuggested: coinsEarned
    });

    

    // 3) sync coins + streak to backend, reusing legacy merge-progress payload
    try {
      if (typeof updateUserProgress === 'function' && window.JWT_TOKEN) {
        const streakEarned = percent >= 80;
        const activityKey = [
          'ai-unit',
          sel.subject || 'maths',
          sel.year || 'y?',
          sel.topic || 'topic?',
          sel.aiUnitId || 'unit?',
          sel.aiStepId || 'step?'
        ].join(':');

        updateUserProgress({
          activityKey,
          streakEarned,
          // send the explicit coin delta so merge() always sees a positive coins_earned
          coins_earned: coinsEarned
        }).catch(err => console.warn('[ai] merge-progress failed', err));
      }
    } catch (err) {
      console.warn('[ai] updateUserProgress failed', err);
    }

    // 4) finally, reconcile pointer from server so local cache matches truth
    try {
     if (window.sfUnits?.reconcileUnitsPointer) {
      
     }
   } catch (e) {
  console.warn('[ai] reconcileUnitsPointer after finishAiSession failed', e);
   }




    // --- streak update ---
    if (percent >= 80) {
      applyDailyStreak('ai-session');
    }

    // reset per-session coin buffer (coins already applied via awardLocalCoins)
    state.lessonCoinsPending = 0;

        // Ensure server + local pointers are in sync for this selection
    if (window.JWT_TOKEN && window.sfUnits?.reconcileUnitsPointer) {
      window.sfUnits
        .reconcileUnitsPointer(state.selections || {})
        .catch(err => console.warn('[ai] pointer reconcile failed', err));
    }


    // --- adaptive baseline update ---
    const profile  = state.skillProfile || {};
    const prev     = profile[subjectKey] || {
      baselineLevel: getBaselineLevelForSubject(subjectKey),
      confidence: 0.5,
      lastPlacementAt: Date.now()
    };

    let nextLevel = prev.baselineLevel;
    if (accuracy < 0.4) {
      nextLevel = prev.baselineLevel === 'stretch' ? 'core' : 'support';
    } else if (accuracy > 0.8) {
      nextLevel = prev.baselineLevel === 'support' ? 'core' : 'stretch';
    }

    const blendedConfidence = Math.max(
      0.2,
      Math.min(1, (prev.confidence || 0.5) * 0.7 + accuracy * 0.3)
    );

    session.difficulty = nextLevel;
    session.level      = nextLevel;

    profile[subjectKey] = {
     baselineLevel: nextLevel,
     confidence: blendedConfidence,
     lastPlacementAt: prev.lastPlacementAt || Date.now(),
     placementDone: prev.placementDone || false
    };

    state.skillProfile = profile;
    saveSkillProfile();
    if (session) session.completed = true;


    // --- Adaptive CTA ---
    if (btn) {
      btn.disabled = false;

      if (percent >= 80) {
        btn.innerText = 'Next step';
        btn.onclick = () => {
          const close = window.closeAiModal || closeAiModal;
          if (typeof close === 'function') close();

          const hub = document.getElementById('challengeHubContainer');
          if (hub && typeof renderUnitsView === 'function') {
            renderUnitsView(hub);
          } else {
            history.pushState({}, '', '/units');
            const go = window.router || router;
            if (typeof go === 'function') go();
          }
        };
      } else {
        btn.innerText = 'Try again';
        btn.onclick = () => {
          const sel   = state.selections || {};
          const subj  = sel.subject || 'maths';
          const prof  = state.skillProfile || {};
          const nextDiff =
            (prof[subj] && prof[subj].baselineLevel) ||
            getBaselineLevelForSubject(subj);

          state.aiSession = {
            topic: sel.topic || (state.aiSession && state.aiSession.topic) || 'general',
            level: nextDiff,
            difficulty: nextDiff,
            total: 5,
            asked: 0,
            correct: 0
          };

          if (input) {
            input.disabled = false;
            input.value = '';
          }
          if (answerCard) {
            answerCard.hidden = false;
          }
          if (feedback) {
            feedback.hidden = true;
            feedback.textContent = '';
            feedback.classList.remove('good', 'bad');
          }

          updateAiProgressChip();
          callBackend();
        };
      }
    }
  }

  // Keep the progress bar / chip in sync
  updateAiProgressChip();
}





// Helper to update UI and Save
function awardLocalCoins(amount) {
    state.coins += amount;
    state.lessonCoinsPending = (state.lessonCoinsPending || 0) + amount;
    
    // Call your existing app functions
    if(typeof updateUiCounters === 'function') updateUiCounters();
    if(typeof saveLocalGuestProgress === 'function') saveLocalGuestProgress();
}

// --- 3. INITIALIZE AI MODULE ---

// Add this check to prevent errors if module isn't loaded yet
if (typeof initAI === 'function') {
    // We pass your EXISTING core functions to the AI module
    initAI({
        state: state,
        updateUi: (typeof updateUiCounters !== 'undefined') ? updateUiCounters : () => {},
        saveProgress: (typeof saveLocalGuestProgress !== 'undefined') ? saveLocalGuestProgress : () => {}
    });
    console.log("🚀 AI Module Initialized via app.js");
}


function saveSelections() {
  const json = JSON.stringify(state.selections);
  sessionStorage.setItem('sf_selections', json);              // existing
  try { localStorage.setItem('sf_selections_persist', json); } catch {}
}
window.saveSelections = saveSelections;



// Show/hide home-only sections (hero, grown-ups card, trust strip)
function setHomeInfoVisible(show) {
 document.querySelectorAll('.home-hero, .grownups.section, .trust-strip')
   .forEach(el => { if (el) el.hidden = !show; });
}




function renderSelectionStep(step) {
  const hubContainer = document.querySelector('#challengeHubContainer');
  if (!hubContainer) return;

  // --- build options ---
  let title, options, gridClass = 'selection-grid';
  if (step === 'subject') {
    title = 'Pick Your Adventure!';
    gridClass = 'selection-grid subject-grid';
    options = {
      english: { label: 'Word & Story Lab', emoji: '📖' },
      maths:   { label: 'Number Quest',     emoji: '🔢' }
    };
  } else if (step === 'year') {
    title = 'Pick Your Class!';
    options = {
      '3': '🎒 Year 3 Explorers',
      '4': '🗺️ Year 4 Adventurers',
      '5': '🏆 Year 5 Champions',
      '6': '🚀 Year 6 Trailblazers (Coming Soon!)'
    };
  } else { // topic
    title = 'Pick a quest!';
    if ((state.selections || {}).subject === 'english') {
      options = { spelling: '✍️ Spelling Wizards', grammar: '📚 Grammar Heroes' };
    } else {
      options = {
        'addition': '➕ Adding Adventurers',
        'subtraction': '➖ Subtraction Squad',
        'place-value': '🧭 Place Value Pals',
        'number-line': '📏 Number Line Hoppers',
        'thousands': '⛰️ Thousand Trekkers',
        'shapes': '🔺 Shape Explorers',
        'roman-numerals': '🏛️ Roman Numeral Rangers'
      };
    }
  }

  const backBtn = (step !== 'subject')
    ? `<button id="backBtn" class="btn btn-back">← Go Back</button>`
    : '';

  // --- SUBJECT SCREEN: two rows of your hero tiles ---
  // --- SUBJECT SCREEN: two rows of your hero tiles ---
if (step === 'subject') {
  const subjectsRow = `
    <div class="${gridClass}">
      <button class="selection-card large-card" data-key="english" type="button" aria-label="${options.english.label}">
        <span class="selection-card-title">${options.english.label}</span>
        <span class="selection-card-emoji" aria-hidden="true">${options.english.emoji}</span>
      </button>
      <button class="selection-card large-card" data-key="maths" type="button" aria-label="${options.maths.label}">
        <span class="selection-card-title">${options.maths.label}</span>
        <span class="selection-card-emoji" aria-hidden="true">${options.maths.emoji}</span>
      </button>
    </div>`;

  const actionsRow = `
    <div class="${gridClass}">
      <button id="dailyCard" class="selection-card large-card" type="button" aria-label="Daily Challenge">
        <span class="selection-card-title">Daily Challenge</span>
        <span class="selection-card-emoji" aria-hidden="true">🎯</span>
      </button>
      <button id="tablesCard" class="selection-card large-card" type="button" aria-label="Times Tables">
        <span class="selection-card-title">Times Tables</span>
        <span class="selection-card-emoji" aria-hidden="true">✖️</span>
      </button>
    </div>`;

  hubContainer.innerHTML = `
    <div class="selection-step">
      <div class="selection-step-header">${backBtn}<h1>${title}</h1></div>
      ${subjectsRow}
      ${actionsRow}
    </div>
  `;
} else {
    // --- YEAR/TOPIC SCREENS: original simple cards ---
    const gridContent = Object.entries(options).map(([key, value]) => {
      const isComingSoon = typeof value === 'string' && value.includes('Coming Soon');
      return `<button class="selection-card ${isComingSoon ? 'disabled' : ''}" data-key="${key}">${value}</button>`;
    }).join('');

    hubContainer.innerHTML = `
      <div class="selection-step">
        <div class="selection-step-header">${backBtn}<h1>${title}</h1></div>
        <div class="${gridClass}">${gridContent}</div>
      </div>
    `;
  }

  // --- back button wiring ---
  const back = document.getElementById('backBtn');
  if (back) {
    back.onclick = () => {
      if (step === 'year') delete state.selections.subject;
      if (step === 'topic') delete state.selections.year;
      saveSelections();
      renderChallengeHub();
    };
  }

  // --- normal picker cards (subject/year/topic) ---
  hubContainer.querySelectorAll('.selection-card[data-key]').forEach(card => {
  card.onclick = () => {
    if (card.classList.contains('disabled')) return;
    state.selections[step] = card.dataset.key;
    saveSelections();
    renderChallengeHub();
  };
});


  // --- extra actions on subject only ---
  if (step === 'subject') {
    const dailyBtn = document.getElementById('dailyCard');
    if (dailyBtn) {
      dailyBtn.onclick = (e) => {
        e.preventDefault();
        // Gate on click (visible to all; only logged-in can run)
        if (!JWT_TOKEN) {
          showSaveNudge?.({
            variant: 'post',
            title: 'Daily Challenge needs a login',
            message: 'Log in to unlock Daily Challenge and save your coins & streak.',
            onLogin: gotoLoginSameTab
          });
          return;
        }
        startDailyChallenge();
      };
    }
    const tablesBtn = document.getElementById('tablesCard');
    if (tablesBtn) {
      tablesBtn.onclick = (e) => { e.preventDefault(); startTablesSprint(); };
    }
  }

  // Show hero/teacher sections only on the subject picker
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

// e) MULTI_CHOICE — single-answer MCQ
function renderMultiChoice(step, host) {
  if (!host) return;
  const wrap = document.createElement('div');
  wrap.className = 'multi-choice option-grid';

  const opts = Array.from(step.options || []);
  opts
    .map((opt) => (typeof opt === 'string' ? { text: opt } : opt))
    .sort(() => Math.random() - 0.5)
    .forEach((opt, idx) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'option-card';
      b.textContent = String(opt.text || '');
      b.onclick = () => {
        if (state.answered) return;
        wrap.querySelectorAll('.option-card').forEach(c => c.classList.remove('sel'));
        b.classList.add('sel');
        state.select = idx;
        enableNextWhenReady(true);
      };
      wrap.appendChild(b);
    });

  host.appendChild(wrap);
  enableNextWhenReady(false);
}

// Stub multi-select → reuse single-select on first choice
function renderMultiSelect(step, host) {
  return renderMultiChoice(step, host);
}
window.renderMultiChoice = renderMultiChoice;
window.renderMultiSelect = renderMultiSelect;

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
else if (step.type === 'multi_choice' || step.type === 'multichoice') {
  if (typeof window.renderMultiChoice === 'function') window.renderMultiChoice(step, host);
}
else if (step.type === 'multi_select' || step.type === 'multiselect') {
  if (typeof window.renderMultiSelect === 'function') window.renderMultiSelect(step, host);
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

function recordLessonToProfile({ pack, score, coinsGained, streakEarned }) {
  try {
    const todayKey = getTodayKey(new Date(), USER_TZ);
    const totalSteps = Array.isArray(pack?.steps) ? pack.steps.length : 0;

    // Treat normal lessons as the current subject mode (nice for History list)
    const mode = state?.selections?.subject || 'lesson';

    const summary = {
      correct: score,
      wrong: Math.max(0, totalSteps - score),
      coinsEarned: coinsGained,
      streakDelta: streakEarned ? 1 : 0,
      mode
    };

    // Unlock any badges tied to this summary
    const before = profileStore.get();
    const badgeResult = maybeUnlockBadges(before, summary);

    profileStore.update(d => {
      d.history ||= {};
      const prev = d.history[todayKey] || { correct:0, wrong:0, total:0, coinsEarned:0, mode };
      d.history[todayKey] = {
        ...prev,
        dateISO: new Date().toISOString(),
        mode,
        correct: (prev.correct || 0) + summary.correct,
        wrong:   (prev.wrong   || 0) + summary.wrong,
        total:   (prev.total   || 0) + totalSteps,
        coinsEarned: (prev.coinsEarned || 0) + summary.coinsEarned,
      };

      // Keep streak in the profile store in sync (so chips/tabs show right away)
      if (streakEarned) {
        const s = d.streak || { current:0, best:0, lastActiveISO:'' };
        s.current = (s.current || 0) + 1;
        s.best = Math.max(s.best || 0, s.current);
        s.lastActiveISO = new Date().toISOString();
        d.streak = s;
      }

      if (badgeResult?.unlocked?.length) {
        d.badges = Array.from(new Set([...(d.badges || []), ...badgeResult.unlocked]));
      }
    });

    // If you’re sitting on the profile page, refresh it
    if (location.pathname === '/profile') {
      try { renderProfile(); } catch {}
    }
  } catch (e) {
    console.warn('recordLessonToProfile failed:', e);
  }
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
 // 🟣 Apply coins: pending per-step coins + completion bonus (respect cap if known)
let completionBonus = 10;
if (typeof state.coinsCapRemaining === 'number') {
  completionBonus = Math.min(completionBonus, Math.max(0, state.coinsCapRemaining));
  state.coinsCapRemaining -= completionBonus;
}

// Calculate BEFORE zeroing pending
const coinsGained = (state.lessonCoinsPending || 0) + completionBonus;

// Apply coins
state.coins += coinsGained;
state.lessonCoinsPending = 0;

// Guests manage streak locally; logged-in relies on server truth
if (!JWT_TOKEN && streakEarnedThisLesson) state.streak++;
updateUiCounters();

// NEW: write to profileStore so History/Badges update
try {
  recordLessonToProfile({
    pack,
    score: state.score,
    coinsGained,
    streakEarned: streakEarnedThisLesson
  });
} catch {}



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


async function updateUserProgress({ streakEarned = false, activityKey = '', coins_earned = null } = {}) {
   if (!JWT_TOKEN) return;


 // Compute coin delta: prefer explicit coins_earned (AI units),
  // otherwise fall back to state-based delta for legacy flows.
  const fromState  = Math.max(0, (state.coins || 0) - (state.lastSyncedCoins || 0));
  const deltaCoins = (typeof coins_earned === 'number' && !Number.isNaN(coins_earned))
    ? Math.max(0, coins_earned)
    : fromState;


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


} // ← end of function renderLesson(short)

/* === Profile route (paste the full block you have) === */

// ---- SkillFlex inline icons (SVG) ----
const SFIcon = {
  coin: (size = 18) => `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="sfCoinG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"  stop-color="#FFE066"/>
          <stop offset="50%" stop-color="#FFC247"/>
          <stop offset="100%" stop-color="#E5A93B"/>
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="9" fill="url(#sfCoinG)" stroke="#D89A33"/>
      <circle cx="12" cy="12" r="5" fill="rgba(255,255,255,.25)"/>
    </svg>
  `,
  flame: (size = 18) => `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="sfFlameG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stop-color="#FF8A00"/>
          <stop offset="100%" stop-color="#FF3D00"/>
        </linearGradient>
      </defs>
      <path d="M12 2c2.2 3 2.5 5.6.8 8 3-1 6.2 1.6 6.2 5.1a7 7 0 11-14 0c0-2.3 1.2-4.3 3-5.5C7.8 7.8 9.6 4.9 12 2z" fill="url(#sfFlameG)"/>
      <path d="M13.2 12.5c1.3 1 .9 3.6-1.2 4.5-1.8.8-3.8-.2-3.8-2 0-1 .6-1.9 1.5-2.4.3 1.1 1.5 1.8 2.6 1.2.5-.3.8-.7.9-1.3z" fill="#FFD08A"/>
    </svg>
  `,
  avatar: (streak = 0, size = 36) => {
    const fill = streak >= 20 ? '#7C3AED' : streak >= 10 ? '#2563EB' : streak >= 5 ? '#10B981' : '#94A3B8';
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">
        <defs>
          <linearGradient id="sfFaceG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${fill}"/>
            <stop offset="100%" stop-color="#0B1020"/>
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="21" fill="url(#sfFaceG)"/>
        <circle cx="17.5" cy="20.5" r="2.5" fill="#fff"/>
        <circle cx="30.5" cy="20.5" r="2.5" fill="#fff"/>
        <path d="M16 29c2.5 4 13.5 4 16 0" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/>
      </svg>
    `;
  }
};

// ===== Main (global) header =====
function buildMainHeader({ coins = 0, streak = 0, loggedIn = false, active = '' } = {}) {
  const tab = (t, label) => {
    const locked = !loggedIn;
    const href = `/profile?tab=${t}`;
    const cur = active === t ? 'aria-current="page"' : '';
    const classes = locked ? 'mh-tab disabled' : 'mh-tab';
    const aria = locked ? 'aria-disabled="true" title="Log in to use this"' : '';
    return `<a ${cur} class="${classes}" ${aria} data-tab="${t}" href="${href}">${label}</a>`;
  };
  return `
    <header id="mainHeader" class="mh" role="banner">
      <div class="mh-left">
        <a href="/" data-link class="mh-logo" aria-label="SkillFlex home"></a>
        <div class="mh-title">SkillFlex Kids</div>
        <nav class="mh-tabs" aria-label="Profile">
          ${tab('overview','Overview')}
          ${tab('shop','Shop')}
          ${tab('history','History')}
          ${tab('badges','Badges')}
        </nav>
      </div>
      <div class="mh-spacer"></div>
      <div class="mh-chips">
        <span class="mh-chip" aria-label="${coins} coins">${SFIcon.coin(16)}<span class="mh-num" id="mhCoins">${coins}</span></span>
        <span class="mh-chip" aria-label="${streak} day streak">${SFIcon.flame(16)}<span class="mh-num" id="mhStreak">${streak}</span></span>
      </div>
    </header>
  `;
}

function currentProfileTabFromLocation(){
  const u = new URL(location.href);
  if (u.pathname !== '/profile') return '';
  return (u.searchParams.get('tab') || 'overview').toLowerCase();
}

function mountMainHeader(){
  try {
    const profile = (window.profileStore?.get && window.profileStore.get()) || {};
    const coins  = Number(profile?.coins || 0);
    const streak = Number(profile?.streak?.current || profile?.streak || 0);
    const loggedIn = !!window.JWT_TOKEN;
    const active = currentProfileTabFromLocation();

    // ✅ Small header is MOBILE-ONLY and LOGGED-IN only
    const wantMini = loggedIn && window.innerWidth < 720;

    let host = document.getElementById('mainHeader');

    if (!wantMini) {
      // remove if it exists (prevents duplicates on /units desktop)
      if (host) host.remove();
      return;
    }

    const html = buildMainHeader({ coins, streak, loggedIn, active });

    if (!host) {
      const wrap = document.createElement('div');
      wrap.innerHTML = html;
      host = wrap.firstElementChild;
      const appRoot = document.getElementById('app');
      (appRoot?.parentElement || document.body).insertBefore(host, appRoot || document.body.firstChild);
    } else {
      host.outerHTML = html;
      host = document.getElementById('mainHeader');
    }

    const nav = host.querySelector('.mh-tabs');
    if (nav && !nav._wired) {
      nav._wired = true;
      nav.addEventListener('click', (e) => {
        const a = e.target.closest('a.mh-tab');
        if (!a) return;
        if (a.classList.contains('disabled')) {
          e.preventDefault();
          gotoLoginSameTab();
          return;
        }
        e.preventDefault();
        const href = a.getAttribute('href');
        if (!href) return;
        history.pushState({}, '', href);
        router();
      });
    }

    const cEl = document.getElementById('mhCoins');
    const sEl = document.getElementById('mhStreak');
    if (cEl) cEl.textContent = coins;
    if (sEl) sEl.textContent = streak;
  } catch {}
}


if (typeof window !== 'undefined') window.mountMainHeader = mountMainHeader;


function renderProfile() {
  if (!JWT_TOKEN) {
    app.innerHTML = `
      <section class="pf-wrap pf-guest">
        <div class="pf-card pf-stat pf-empty">Profile view coming soon for guests.</div>
      </section>
    `;
    return;
  }

  const profile   = profileStore.get();
  const items     = getShopItems(profile) || [];
  const equipped  = items.find(i => i.equipped);
  const coins     = Number(profile?.coins || 0);
  const streak    = Number(profile?.streak?.current || 0);
  const best      = Number(profile?.streak?.best || 0);
  const badgesCt  = (profile?.badges || []).length;
  const themeMode = getThemePreference() || document.documentElement.dataset.theme || 'light';

   const params = new URLSearchParams(location.search);
  let tab = (params.get('tab') || 'overview').toLowerCase();

  // clean route: /path → Learn
  if (location.pathname === '/path') {
  tab = 'path';
}

  // ---- Body view flags (for CSS) ----
  const body = document.body;
  body.classList.add('logged-in');                          // hide old kids hero
  body.classList.remove('profile-focus', 'path-view', 'in-lesson');

  if (tab === 'path') {
    body.classList.add('path-view');
  } else {
    body.classList.add('profile-focus');
  }

  // ---- What to show on mobile vs desktop ----
  const onMobile = window.innerWidth < 720;   // UI decision only

  // Learn/Path tab
  const showPath  = (tab === 'path');

  // Body:
  // - mobile: hide body when you're on Learn/Path (full-bleed path)
  // - desktop: always show body under the hero
  const showBody  = onMobile ? (tab !== 'path') : true;



const mobileHeader = `
  <div class="pf-hero pf-hero-xs">
    <div class="pf-hero-left">
      <div class="pf-avatar pf-avatar-xs">${SFIcon.avatar(streak, 36)}</div>
    </div>
    <div class="pf-hero-right">
      <div class="pf-chips">
        <span class="pf-chip" aria-label="${coins} coins">
          ${SFIcon.coin(18)}<span class="pf-num">${coins}</span>
        </span>
        <span class="pf-chip" aria-label="${streak} day streak">
          ${SFIcon.flame(18)}<span class="pf-num">${streak}</span>
        </span>
      </div>
      ${buildProfileGearMenu(themeMode)}
    </div>
  </div>`;


  // ===== Panels =====
  const overviewHTML = `
    <div class="pf-cards-row">
      <div class="pf-card pf-stat">
        <div class="pf-stat-title">Coins</div>
        <div class="pf-stat-big">${coins}</div>
        <div class="pf-stat-sub">Spend in the Shop</div>
      </div>
      <div class="pf-card pf-stat">
        <div class="pf-stat-title">Streak</div>
        <div class="pf-stat-big">${streak}</div>
        <div class="pf-stat-sub">Best: ${best}</div>
      </div>
      <div class="pf-card pf-stat">
        <div class="pf-stat-title">Badges</div>
        <div class="pf-stat-big">${badgesCt}</div>
        <div class="pf-stat-sub">Unlocked so far</div>
      </div>
    </div>

    <div class="pf-cards-row">
      <div class="pf-card pf-look">
        <div class="pf-card-h">Current Look</div>
        <div class="pf-look-box">
          <div class="pf-look-avatar">${equipped?.emoji ?? '🪄'}</div>
          <div class="pf-look-meta">
            <div class="pf-look-title">${equipped ? (equipped.title || equipped.name || 'Equipped') : 'Default'}</div>
            <div class="pf-stat-sub">Your active frame/flair</div>
          </div>
        </div>
        <button class="btn" data-action="change-look">✨ ${PROFILE_COPY.changeLook}</button>
      </div>
    </div>
  `;

  const shopHTML = `
    <div class="pf-card pf-list">
      <div class="pf-card-h">Shop</div>
      <div id="pfShopHost" class="pf-shop-host"></div>
    </div>
  `;

  const sessionHistory = profile.history || {};
  const historyHTML = `
    <div class="pf-card pf-list">
      <div class="pf-card-h">All Sessions</div>
      <ul class="pf-session-list">
        ${
          Object.entries(sessionHistory).length
            ? Object.entries(sessionHistory).sort((a,b)=>b[0].localeCompare(a[0])).map(([k, s])=>{
                const total = s.total ?? (Number(s.correct||0)+Number(s.wrong||0));
                return `<li><span class="pf-s-date">${k}</span><span class="pf-s-note">${s.mode||'lesson'}</span><span class="pf-s-score">${s.correct||0}/${total||0} correct</span><span class="pf-s-coins">+${s.coinsEarned||0}</span></li>`;
              }).join('')
            : `<li class="pf-empty">No sessions yet.</li>`
        }
      </ul>
    </div>
  `;

  const badgesHTML = `
    <div class="pf-card pf-list">
      <div class="pf-card-h">Badges</div>
      <div class="pf-badges">
        ${
          badgesCt
            ? (profile.badges || []).map(b => `<span class="pf-badge">${b}</span>`).join('')
            : `<div class="pf-empty">No badges yet</div>`
        }
      </div>
    </div>
  `;

  // ===== Hero (desktop only). On mobile we render just a small gear anchor so “More” can open. =====
  const desktopHero = buildProfileDesktopHero(tab, profile, themeMode);

  // Tiny gear dock so the “More” bottom tab has something to open on mobile
  const gearDockMobile = `
  <div class="pf-hero pf-hero-xs">
    <div class="pf-hero-right">
      ${buildProfileGearMenu(themeMode)}
    </div>
  </div>`;

  app.innerHTML = `
  <section class="pf-wrap">
    ${desktopHero}
    ${showPath ? renderProfilePathSection(profile) : ''}

    ${showBody ? `
      <div class="pf-body">
        ${
          tab==='overview' ? overviewHTML :
          tab==='shop'     ? shopHTML :
          tab==='history'  ? historyHTML : badgesHTML
        }
      </div>
    ` : ''}

    <p><a class="btn" href="/" data-link>← Back home</a></p>
  </section>
`;

// Hide "Back home" on mobile (bottom tabs replace it)
  if (shouldShowMobileTabs()) {
    const backLink = app.querySelector('.pf-wrap > p > a.btn[href="/"]');
    if (backLink) backLink.parentElement.hidden = true; // hide the <p>
  }
  // Wire up interactions that still apply
  wireProfileInteractions();
  wireProfileSettingsMenu();
  wireProfileHeroTabs(app);

  // SPA navigation for internal links inside Profile (Path cards, View all, Continue, etc.)
  app.querySelectorAll('.pf-wrap a[href]').forEach(a => {
    // Skip the hero tabs – handled via wireProfileHeroTabs
    if (a.classList.contains('pf-tab')) return;

    a.addEventListener('click', (ev) => {
      // Respect right clicks / modifier keys / already-handled events
      if (ev.defaultPrevented || ev.button !== 0) return;
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;

      const href = a.getAttribute('href');
      if (!href) return;

      const url = new URL(href, location.href);

      // Only intercept same-origin, internal links (no downloads / _blank / external)
      const sameOrigin = url.origin === location.origin;
      const internal   = sameOrigin && url.pathname.startsWith('/');
      const skip =
        a.hasAttribute('download') ||
        a.target === '_blank' ||
        (a.rel && a.rel.includes('external'));

      if (!internal || skip) return; // let the browser handle these normally

      ev.preventDefault();

      const dest = url.pathname + url.search + url.hash;
      const cur  = location.pathname + location.search + location.hash;
      if (dest !== cur) {
        history.pushState({}, '', dest);
      }

      // Let the main SPA router take over (so /units, etc. work correctly)
      router();
    });
  });



  // Inline shop (when tab = shop)
  const shopHost = document.getElementById('pfShopHost');
  if (shopHost) {
    renderShopHoverCard(shopHost);
    profileStore.subscribe(() => renderShopHoverCard(shopHost));
  }
}


function getAvatarTier(profile = {}, streakValue = 0) {
  const streak = Number(streakValue || profile?.streak?.current || profile?.streak) || 0;
  if (streak >= 30) return 'legendary';
  if (streak >= 10) return 'gold';
  if (streak >= 3)  return 'silver';
  return 'starter';
}


function buildProfileDesktopHero(activeTab = 'overview', profile = profileStore.get(), themeMode) {
  if (!JWT_TOKEN) return '';
  const safeProfile = profile || {};
  const coins = Number(safeProfile?.coins || 0);
  const streakSource = typeof safeProfile?.streak === 'number'
    ? safeProfile.streak
    : safeProfile?.streak?.current;
  const streak = Number(streakSource || 0);
  const rawHandle = (safeProfile?.handle || safeProfile?.username || '').trim();
  const subtitle = rawHandle
    ? (rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`)
    : '@player';
  const normalizedTab = (activeTab || '').toLowerCase();
  const tabs = [
    { key: 'units', label: 'Learn' },
    { key: 'overview', label: 'Overview' },
    { key: 'shop', label: 'Shop' },
    { key: 'history', label: 'History' },
    { key: 'badges', label: 'Badges' }
  ];
  const avatarTier = getAvatarTier(safeProfile, streak);
  const avatarSymbol =
    safeProfile?.avatarIcon ||
    safeProfile?.avatarEmoji ||
    safeProfile?.avatar ||
    '✨';
  const avatarMarkup = `
    <div class="pf-avatar-inner" data-avatar-tier="${avatarTier}">
      ${avatarSymbol}
    </div>
  `;
  const chipsMarkup = `
    <div class="pf-chips">
      <span class="pf-chip pf-chip-coins" aria-label="${coins} coins">
        <span class="pf-chip-icon" aria-hidden="true">🪙</span>
        <span class="pf-chip-value">${coins}</span>
      </span>
      <span class="pf-chip pf-chip-streak" aria-label="${streak} day streak">
        <span class="pf-chip-icon" aria-hidden="true">🔥</span>
        <span class="pf-chip-value">${streak}</span>
      </span>
    </div>
  `;
  const mode =
    themeMode ||
    getThemePreference?.() ||
    document.documentElement.dataset.theme ||
    'light';

  return `
    <div class="pf-hero">
      <div class="pf-hero-left">
        <div class="pf-avatar">${avatarMarkup}</div>
        <div class="pf-title-block">
          <h1 class="pf-title">Your Profile</h1>
          <div class="pf-sub">${subtitle}</div>
            <nav class="pf-tabs">
             ${tabs.map(({ key, label }) => `
              <a 
                 href="${key === 'units' ? '/units' : `/profile?tab=${key}`}"
                 data-tab="${key}"
                 class="pf-tab ${normalizedTab === key ? 'active' : ''}">
                  ${label}
                   </a>
                  `).join('')}
             </nav>



        </div>
      </div>
      <div class="pf-hero-right">
        ${chipsMarkup}
        ${buildProfileGearMenu(mode)}
      </div>
    </div>
  `;
}


function buildProfileGearMenu(themeMode = 'light') {
  if (!JWT_TOKEN) return '';
  return `
    <div class="pf-gear-wrap">
      <button type="button" class="pf-gear" aria-haspopup="menu" aria-expanded="false" aria-label="${PROFILE_COPY.gearTitle}">
        ⚙️
      </button>
      <div class="pf-gear-pop" role="menu" aria-label="${PROFILE_COPY.gearTitle}" hidden>
        <div class="pf-menu-label">${PROFILE_COPY.theme}</div>
        <div class="pf-theme-switch" role="group" aria-label="${PROFILE_COPY.theme}">
          <button type="button" class="pf-theme-btn ${themeMode === 'light' ? 'active' : ''}" data-theme="light" role="menuitemradio" aria-checked="${themeMode === 'light'}">${PROFILE_COPY.themeLight}</button>
          <button type="button" class="pf-theme-btn ${themeMode === 'dark' ? 'active' : ''}" data-theme="dark" role="menuitemradio" aria-checked="${themeMode === 'dark'}">${PROFILE_COPY.themeDark}</button>
        </div>

        <!-- 🌐 Language (still disabled) -->
        <button type="button" class="pf-menu-item pf-menu-disabled" disabled role="menuitem">
          🌐 ${PROFILE_COPY.languageSoon}
          <span class="pf-badge-soon">soon</span>
        </button>

        <!-- 🚪 NEW: Logout button under language -->
        <button type="button" class="pf-menu-item pf-logout-btn" data-action="logout" role="menuitem">
          🚪 Log out
        </button>

        <div class="pf-menu-divider"></div>
        <button type="button" class="pf-menu-item pf-menu-parent" data-action="toggle-grownups" role="menuitem" aria-expanded="false">${PROFILE_COPY.grownups}</button>
        <div class="pf-menu-sub" hidden>
          <p class="pf-menu-note">👨‍👩‍👧 ${PROFILE_COPY.parentsSoon}</p>
          <p class="pf-menu-note">🧑‍🏫 ${PROFILE_COPY.teachersSoon}</p>
          <p class="pf-menu-note">🔐 ${PROFILE_COPY.manageSoon}</p>
          <div class="pf-menu-links">
            <button type="button" class="pf-link-btn" data-link="${CONFIG.BACKEND_PORTAL_URL}/parents/tutors" role="menuitem">${PROFILE_COPY.findTutors}</button>
            <button type="button" class="pf-link-btn" data-link="${CONFIG.BACKEND_PORTAL_URL}/teachers/apply" role="menuitem">${PROFILE_COPY.becomeTutor}</button>
          </div>
        </div>
      </div>
    </div>
  `;
}


function wireProfileSettingsMenu(wrapOverride) {
  if (!wrapOverride && gearCleanupFns.length) {
    gearCleanupFns.forEach((fn) => fn());
    gearCleanupFns = [];
    window._pfGearCleanup = null;
  }

  const wraps = wrapOverride
    ? (Array.isArray(wrapOverride) ? wrapOverride : [wrapOverride])
    : Array.from(document.querySelectorAll('.pf-gear-wrap'));

  if (!wraps.length) return;

  wraps.forEach((wrap) => {
    const cleanup = setupGearWrap(wrap);
    if (cleanup) gearCleanupFns.push(cleanup);
  });

  if (!window._pfGearCleanup) {
    window._pfGearCleanup = () => {
      gearCleanupFns.forEach((fn) => fn());
      gearCleanupFns = [];
      window._pfGearCleanup = null;
    };
  }
}

function setupGearWrap(wrap) {
  const btn = wrap?.querySelector('.pf-gear');
  const pop = wrap?.querySelector('.pf-gear-pop');
  if (!wrap || !btn || !pop) return null;

  const prefersHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const cleanup = [];
  let isOpen = false;
  let hideTimer = null;

  const add = (node, type, handler, options) => {
    node.addEventListener(type, handler, options);
    cleanup.push(() => node.removeEventListener(type, handler, options));
  };

  const setOpen = (state) => {
    isOpen = state;
    wrap.classList.toggle('open', state);
    if (state) {
      pop.removeAttribute('hidden');
      btn.setAttribute('aria-expanded', 'true');
      const first = pop.querySelector('.pf-theme-btn, .pf-menu-item, .pf-link-btn');
      first?.focus?.();
    } else {
      pop.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', 'false');
    }
  };
  wrap._pfSetOpen = setOpen;

  add(btn, 'click', (e) => {
    e.preventDefault();
    setOpen(!isOpen);
  });

  if (prefersHover) {
    const enter = () => { clearTimeout(hideTimer); setOpen(true); };
    const leave = () => { hideTimer = setTimeout(() => setOpen(false), 160); };
    add(wrap, 'mouseenter', enter);
    add(wrap, 'mouseleave', leave);
    add(pop, 'mouseenter', enter);
    add(pop, 'mouseleave', leave);
  }

  const outside = (e) => {
    if (!wrap.contains(e.target)) setOpen(false);
  };
  add(document, 'click', outside);

  add(document, 'keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });

  wrap.querySelectorAll('.pf-theme-btn').forEach((themeBtn) => {
    add(themeBtn, 'click', (e) => {
      e.preventDefault();
      const mode = themeBtn.dataset.theme === 'dark' ? 'dark' : 'light';
      setThemePreference(mode, true);
      wrap.querySelectorAll('.pf-theme-btn').forEach((btnEl) => {
        const active = btnEl.dataset.theme === mode;
        btnEl.classList.toggle('active', active);
        btnEl.setAttribute('aria-checked', String(active));
      });
    });
  });

  const changeLookBtn = wrap.querySelector('[data-action="change-look"]');
  if (changeLookBtn) {
    add(changeLookBtn, 'click', (e) => {
      e.preventDefault();
      setOpen(false);
      handleChangeLookRequest();
    });
  }

  const logoutBtn = wrap.querySelector('[data-action="logout"]');
  if (logoutBtn) {
    add(logoutBtn, 'click', async (e) => {
      e.preventDefault();
      setOpen(false);
      try { await logout(); } catch (err) { console.error('Logout failed:', err); }
    });
  }

  const grownupsBtn = wrap.querySelector('[data-action="toggle-grownups"]');
  const grownupsPanel = wrap.querySelector('.pf-menu-sub');
  if (grownupsBtn && grownupsPanel) {
    add(grownupsBtn, 'click', (e) => {
      e.preventDefault();
      const expanded = !grownupsPanel.hasAttribute('hidden');
      if (expanded) grownupsPanel.setAttribute('hidden', '');
      else grownupsPanel.removeAttribute('hidden');
      grownupsBtn.setAttribute('aria-expanded', String(!expanded));
    });
  }

  wrap.querySelectorAll('.pf-link-btn').forEach((linkBtn) => {
    const url = linkBtn.dataset.link;
    if (!url) return;
    add(linkBtn, 'click', (e) => {
      e.preventDefault();
      maybeOpenGrownupLink(url);
      setOpen(false);
    });
  });

  return () => {
    cleanup.forEach((fn) => fn());
    wrap._pfSetOpen = null;
  };
}

function wireProfileHeroTabs(root = document) {
  const scope = root instanceof Element ? root : document;

  scope.querySelectorAll('.pf-tab').forEach((btn) => {
    if (!btn || btn._pfTabWired) return;
    btn._pfTabWired = true;

    btn.addEventListener('click', (ev) => {
      // ignore already-handled / right-click / modifier-key clicks
      if (ev.defaultPrevented || ev.button !== 0) return;
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;

      const tab = (btn.dataset.tab || 'overview').toLowerCase();

      // 🔴 SPECIAL CASE: Learn/Units should go to /units, NOT /profile
      if (tab === 'units') {
        ev.preventDefault();
        ev.stopPropagation();
        history.pushState({}, '', '/units');
        router();
        return;
      }

      // Default: profile tab routing
      ev.preventDefault();
      const url = new URL(location.href);
      url.pathname = '/profile';
      url.searchParams.set('tab', tab);
      history.pushState({}, '', url.pathname + '?' + url.searchParams + url.hash);
      router();
    });
  });
}



function handleChangeLookRequest() {
  const profile = profileStore.get();
  const owned = (getShopItems(profile) || []).filter((i) => i.owned);
  if (!owned.length) {
    history.pushState({}, '', '/profile?tab=shop');
    router();
    return;
  }
  showShopModal({
    items: owned,
    coins: profile.coins,
    onPurchase: (id) => {
      const res = purchaseItem(profileStore, id);
      if (res?.ok) emitTelemetry('equip_look', { item: res.item.id });
      renderProfile();
      return res;
    }
  });
}

function hasAnyProfileProgress(profile) {
  return Boolean(
    (profile?.streak?.current ?? 0) > 0 ||
    (Array.isArray(profile?.progress) && profile.progress.length) ||
    profile?.lastLesson ||
    profile?.lastUnitId
  );
}

function renderProfilePathSection(profile) {
  const hasProgress = hasAnyProfileProgress(profile);

  // Empty state shown when the user has never started a path
  const empty = `
    <div class="pf-path-empty">
      <div class="pf-path-empty-title">${PROFILE_COPY.pathEmpty}</div>
      <div class="pf-path-empty-cta">
        <button class="btn btn-primary" data-action="continue">
          ${PROFILE_COPY.pathContinue}
        </button>
      </div>
    </div>
  `;

  // When there *is* progress, just show a short summary + continue button
  const summary = `
    <div class="pf-path-summary">
      <p class="subtitle">${PROFILE_COPY.pathSubtitle}</p>
    </div>
  `;

  return `
    <section class="section pf-path" aria-labelledby="pf-path-title">
      <div class="pf-path-head">
        <div class="pf-path-titles">
          <h2 id="pf-path-title">${PROFILE_COPY.pathTitle}</h2>
          <p class="subtitle">${PROFILE_COPY.pathSubtitle}</p>
        </div>
        <div class="pf-path-actions">
          <button class="btn btn-primary" data-action="continue">
            ${PROFILE_COPY.pathContinue}
          </button>
        </div>
      </div>
      <div class="pf-path-body">
        ${hasProgress ? summary : empty}
      </div>
    </section>
  `;
}




function injectUnitsDesktopHeader(path) {
  if (!app) return;

  const existing = app.querySelector('.pf-units-hero');

  const loggedIn = !!(JWT_TOKEN || DEV_MOCK_LOGIN);
  const onDesktop =
    typeof window !== 'undefined' && window.innerWidth >= 720;

  const shouldShow =
    path === '/units' &&
    loggedIn &&
    onDesktop;

  // If we shouldn't show it, clean up and bail
  if (!shouldShow) {
    existing?.remove();
    return;
  }

  const profile = profileStore.get();
  const themeMode =
    (typeof getThemePreference === 'function'
      ? getThemePreference()
      : null) ||
    document.documentElement.dataset.theme ||
    'light';

  const heroMarkup = buildProfileDesktopHero('path', profile, themeMode);
  if (!heroMarkup) {
    existing?.remove();
    return;
  }

  const section = document.createElement('section');
  section.className = 'pf-wrap pf-units-hero';
  section.innerHTML = heroMarkup;

  if (existing) {
    existing.replaceWith(section);
  } else {
    app.prepend(section);
  }

  // 🔑 KEY PART: mirror the body flags that make the hero visible on /profile
  // We want the Learn/Path view styling on desktop.
  const body = document.body;
  body.classList.add('logged-in');
  body.classList.remove('in-lesson');
  body.classList.remove('profile-focus');
  

  // Re-use existing wiring
  wireProfileHeroTabs(section);
  const wrap = section.querySelector('.pf-gear-wrap');
  if (wrap) wireProfileSettingsMenu(wrap);
  wireProfileInteractions();
}


function requiresGrownupGate() {
  if (matchMedia('(pointer: coarse)').matches) return true;
  if (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) return true;
  return 'ontouchstart' in window;
}


function maybeOpenGrownupLink(url) {
  if (!url) return;
  const needsGate = requiresGrownupGate();
  if (needsGate) {
    const answer = window.prompt(`${PROFILE_COPY.grownupGateTitle}\n${PROFILE_COPY.grownupGateHint}\n2 + 5 = ?`);
    if (String(answer || '').trim() !== '7') {
      feedback('Oops! Try again.', false);
      return;
    }
  }
  window.open(url, '_blank', 'noopener');
}

/* === end Profile route === */


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
 mountMainHeader();
 profileStore.subscribe(() => mountMainHeader());


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


 // SINGLE delegator for internal navigation
document.body.addEventListener('click', (e) => {
  // ignore already-handled, right/middle clicks, or with modifiers
  if (e.defaultPrevented || e.button !== 0) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

  // 1) Prefer explicit SPA links (works on <a> or any element with data-href)
  let a = e.target.closest('a[data-link], [data-link][href], [data-link][data-href]');
  let href = a?.getAttribute?.('href') ?? a?.getAttribute?.('data-href');

  // 2) Otherwise handle plain same-origin anchors like <a href="/profile?tab=shop">
  if (!a) {
    const cand = e.target.closest('a[href]');
    if (cand) {
      const url = new URL(cand.getAttribute('href'), location.href);
      const sameOrigin = url.origin === location.origin;
      const internal   = sameOrigin && url.pathname.startsWith('/');
      const skip =
        cand.hasAttribute('download') ||
        cand.target === '_blank' ||
        cand.rel?.includes('external');

      if (internal && !skip) {
        a = cand;
        href = url.pathname + url.search + url.hash;
      }
    }
  }

  if (!a || !href) return;

  e.preventDefault();

  const dest = href.startsWith('http')
    ? new URL(href).pathname + new URL(href).search + new URL(href).hash
    : href;

  // avoid pushing identical URL
  const cur = location.pathname + location.search + location.hash;
  if (dest !== cur) history.pushState({}, '', dest);

  router();
});


// keep this once (don’t add duplicates)
let _rsT;
window.addEventListener('resize', () => {
  clearTimeout(_rsT);
  _rsT = setTimeout(() => {
    updateMobileTabsVisibility();
    updateMobileTabsActive(location.pathname + location.search);
    injectUnitsDesktopHeader(location.pathname);
    maybeShowInstallNudge(); // ← add this
  }, 120);
});

window.addEventListener('popstate', () => {
  updateMobileTabsVisibility();
  updateMobileTabsActive(location.pathname + location.search);
  injectUnitsDesktopHeader(location.pathname);
  maybeShowInstallNudge(); // ← add this
  router();
});





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



document.addEventListener('DOMContentLoaded', () => {
  try {
    ensureModalHost();
    hydrateProfileHeader(profileStore.get());
    profileStore.subscribe(hydrateProfileHeader);
    wireDailyCard();
    wireShopButton();
    observeDailyAnchors(); // ensures Daily wires once homeTpl is stamped
  } catch (e) { console.error(e); }
});
function observeDailyAnchors() {
  const root = document.getElementById('app') || document.body;
  const obs = new MutationObserver(() => {
    const btn = document.getElementById('continueBtn');
    if (btn && !btn.dataset.dailyWired) {
      btn.dataset.dailyWired = '1';
      wireDailyCard(); // re-run now that #continueBtn exists in the live DOM
    }
  });
  obs.observe(root, { childList: true, subtree: true });
}


// === Daily Challenge helpers (appended) ===
function hydrateProfileHeader(profile) {
  try {
    const coinsEl = document.querySelector('#coins');
    const streakEl = document.querySelector('#streak');
    if (coinsEl) coinsEl.textContent = `🪙 ${profile?.coins ?? 0}`;
    if (streakEl) streakEl.textContent = `🔥 ${profile?.streak?.current ?? 0}`;
  } catch {}
}

function wireDailyCard() {
  const btn = document.getElementById('continueBtn');
  if (!btn) return;
  btn.addEventListener('click', (e) => { e.preventDefault(); startDailyChallenge(); });
  updateDailyCard(profileStore.get());
  profileStore.subscribe(updateDailyCard);
}

function updateDailyCard(profile) {
  const pill = document.getElementById('continueMeta');
  if (!pill) return;
  const tz = (typeof USER_TZ !== 'undefined' && USER_TZ) ? USER_TZ : (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const todayKey = getTodayKey(new Date(), tz);
  const session = profile.history?.[todayKey];
  const completed = session ? (session.correct + session.wrong) : 0;
  pill.textContent = completed ? `${completed}/${DAILY_QUESTION_COUNT} today` : 'New day unlocked';
}

function renderShopHoverCard(host) {
  const profile = profileStore.get();
  const coins   = Number(profile?.coins || 0);
  const items   = getShopItems(profile) || [];

  host.innerHTML = `
    <div class="shop-card">
      <div class="shop-head">Shop • <span class="coins">${coins} coins</span></div>
      <div class="shop-list">
        ${items.map((it) => {
          const title    = it.title ?? it.name ?? it.label ?? 'Untitled';
          const price    = Number(it.price ?? it.cost ?? it.coins ?? 0);
          const owned    = !!(it.owned ?? it.isOwned);
          const equipped = !!(it.equipped ?? it.isEquipped);
          const act      = owned ? 'equip' : 'buy';
          const label    = owned ? (equipped ? 'Equipped' : 'Equip') : `— ${price}`;
          const disabled = !owned && coins < price;

          return `
            <button class="shop-item" data-id="${it.id}" data-act="${act}" ${disabled ? 'disabled' : ''}>
              <span class="emoji">${it.emoji ?? ''}</span>
              <span class="name">${title}</span>
              <span class="price">${label}</span>
            </button>`;
        }).join('')}
      </div>
    </div>
  `;

  host.querySelectorAll('.shop-item').forEach((btn) => {
    btn.onclick = () => {
      const id  = btn.dataset.id;
      const act = btn.dataset.act;
      const res = act === 'buy'
        ? purchaseItem(profileStore, id)
        : purchaseItem(profileStore, id); // swap to equipItem(id) if you have one

      if (!res?.ok && act === 'buy') { feedback(res?.error || 'Not enough coins', false); return; }
      if (res?.ok && act === 'buy')   { emitTelemetry('shop_purchase', { item: res.item.id }); }
      renderShopHoverCard(host); // refresh coins/labels instantly
    };
  });
}

function wireProfileInteractions() {
  const root = document.getElementById('app') || document.body;
  if (root._pfWired) return;            // idempotent
  root._pfWired = true;

  root.addEventListener('click', (e) => {
    const changeLook = e.target.closest('[data-action="change-look"]');
    if (changeLook) {
      e.preventDefault();
      handleChangeLookRequest();
      return;
    }
    const continueBtn = e.target.closest('[data-action="continue"]');
    if (continueBtn) {
      e.preventDefault();
      history.pushState({}, '', '/units?continue=1');
      router();
      return;
    }
    const viewAll = e.target.closest('[data-action="view-all"]');
    if (viewAll) {
      e.preventDefault();
      history.pushState({}, '', '/units');
      router();
      return;
    }
  }, { passive: false });
}


function wireShopButton() {
  const anchor  = document.querySelector('.shop-anchor');
  const shopBtn = document.getElementById('shop-button');
  const hover   = document.getElementById('shopHover');
  if (!anchor || !shopBtn || !hover) return;

  // ensure visible if your HTML had `hidden`
  shopBtn.hidden = false;

  // build the hovercard once
  renderShopHoverCard(hover);
  profileStore.subscribe(() => renderShopHoverCard(hover));

  let hideTimer;
  const open = () => {
  clearTimeout(hideTimer);
  hover.classList.add('open');
  shopBtn.setAttribute('aria-expanded','true');
  refreshShopUi(); // NEW
};

  const close = () => { hideTimer = setTimeout(()=>{ hover.classList.remove('open'); shopBtn.setAttribute('aria-expanded','false'); }, 120); };

  // mouse + keyboard open/close (desktop)
  anchor.addEventListener('mouseenter', open);
  anchor.addEventListener('mouseleave', close);
  anchor.addEventListener('focusin',  open);
  anchor.addEventListener('focusout', (e)=>{ if (!anchor.contains(e.relatedTarget)) close(); });

  // touch fallback: open the existing modal on tap
  shopBtn.addEventListener('click', (e) => {
    if (matchMedia('(hover: none)').matches) {
      e.preventDefault();
      const profile = profileStore.get();
      showShopModal({
        items: getShopItems(profile),
        coins: profile.coins,
        onPurchase: (id) => {
          const res = purchaseItem(profileStore, id);
          if (res?.ok) emitTelemetry('shop_purchase', { item: res.item.id });
          return res;
        }
      });
    }
  });
}


function startTablesSprint() {
  const profile = profileStore.get();
  const tz = (typeof USER_TZ !== 'undefined' && USER_TZ) ? USER_TZ : (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const todayKey = getTodayKey(new Date(), tz);
  const mode = 'maths';
  const cacheKey = `${todayKey}:${mode}:sprint`;

  let session = dailySessionCache.get(cacheKey);
  if (!session) {
    session = generateTimesTableSet({ seed: cacheKey, count: DAILY_QUESTION_COUNT, mastery: profile.mastery || {} });
    dailySessionCache.set(cacheKey, session);
  }
  emitTelemetry('lesson_started', { mode, source: 'tables_sprint' });
  runDailySession({ mode, session, todayKey });
}


async function startDailyChallenge() {
  const profile = profileStore.get();
  const tz = (typeof USER_TZ !== 'undefined' && USER_TZ) ? USER_TZ : (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const todayKey = getTodayKey(new Date(), tz);
  const mode = nextMode(profile.lastMode || 'english', profile.mastery || {});
  const cacheKey = `${todayKey}:${mode}`;
  let session = dailySessionCache.get(cacheKey);
  if (!session) {
    const factory = QUESTION_FACTORIES[mode] || QUESTION_FACTORIES.maths;
    session = factory({ seed: cacheKey, count: DAILY_QUESTION_COUNT, mastery: profile.mastery || {} });
    dailySessionCache.set(cacheKey, session);
  }
  emitTelemetry('lesson_started', { mode, source: 'daily' });
  runDailySession({ mode, session, todayKey });
}

function runDailySession({ mode, session, todayKey }) {
  const queue = [...session.questions];
  const results = { correct: 0, wrong: 0, total: queue.length };
  (function next() {
    if (!queue.length) { finalizeDailySession(results, todayKey, mode); return; }
    const step = queue.shift();
    renderDynamicStep(step, (correct) => {
      if (correct) results.correct++; else results.wrong++;
      emitTelemetry('question_answered', { id: step.id, correct });
      next();
    });
  })();
}

function renderDynamicStep(step, onResult) {
  const host = document.getElementById('stepHost') || document.getElementById('challengeHubContainer') || document.getElementById('app');
  if (!host) return;
  try {
    host.innerHTML = '';
    const prompt = document.createElement('p');
    prompt.className = 'lesson-prompt';
    prompt.textContent = step.prompt;
    const grid = document.createElement('div');
    grid.className = 'option-grid';
    grid.tabIndex = 0;
    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('.option-card');
      if (!btn) return;
      evaluate(btn);
    });
    grid.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const btn = document.activeElement;
      if (btn?.classList?.contains('option-card')) { e.preventDefault(); evaluate(btn); }
    });
    step.choices.forEach((label, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-card';
      btn.dataset.index = String(index);
      btn.setAttribute('aria-pressed', 'false');
      btn.textContent = label;
      grid.appendChild(btn);
    });
    host.appendChild(prompt);
    host.appendChild(grid);

    function evaluate(btn) {
      const idx = Number(btn.dataset.index);
      if (!Number.isFinite(idx)) return;
      const correct = idx === step.answerIndex;
      grid.querySelectorAll('.option-card').forEach((node, nodeIndex) => {
        node.setAttribute('aria-pressed', String(nodeIndex === idx));
        node.classList.toggle('correct', nodeIndex === step.answerIndex);
        node.classList.toggle('incorrect', nodeIndex === idx && !correct);
      });
      grid.querySelectorAll('button').forEach((node) => node.disabled = true);
      setTimeout(() => onResult(correct), 400);
    }
  } catch (err) {
    console.error('Daily render error', err);
    try { emitTelemetry('render_error', { message: err?.message }); } catch {}
  }
}

function finalizeDailySession(results, todayKey, mode) {
  const profile = profileStore.get();
  const firstSession = !profile.history?.[todayKey];
  const coinsAward = awardCoins({ base: 8, correctStreak: results.correct, firstSession, difficulty: profile.settings?.difficulty || 'auto' });
  const nowISO = new Date().toISOString();
  const sc = calcStreak(profile.streak?.lastActiveISO, nowISO, profile.streak?.current || 0, profile.streak?.freezeTokens || 0);
  const summary = { correct: results.correct, wrong: results.wrong, coinsEarned: coinsAward.total, streakDelta: sc.delta || 0, mode };
  const badgeResult = maybeUnlockBadges(profile, summary);

  profileStore.update((draft) => {
    draft.coins = Math.max(0, (draft.coins || 0) + coinsAward.total);
    draft.streak = {
      current: sc.current,
      best: Math.max(draft.streak?.best || 0, sc.current),
      lastActiveISO: nowISO,
      freezeTokens: sc.freezeTokens
    };
    draft.history ||= {};
    draft.history[todayKey] = {
      dateISO: nowISO, mode,
      correct: results.correct, wrong: results.wrong,
      timeSec: (window.state?.lessonTime || 0),
      coinsEarned: coinsAward.total, streakDelta: sc.delta || 0,
      badgeUnlocks: badgeResult.unlocked
    };
    draft.badges = Array.from(new Set([...(draft.badges || []), ...badgeResult.unlocked]));
    draft.lastMode = mode;
    draft.mastery = updateMastery(draft.mastery || {}, mode, results);
  });

  try {
    emitTelemetry('coins_awarded', { total: coinsAward.total, mode });
    emitTelemetry('streak_updated', { current: profileStore.get().streak.current });
    badgeResult.unlocked.forEach((id) => emitTelemetry('badge_unlocked', { id }));
    emitTelemetry('session_completed', { ...summary, todayKey });
  } catch {}

  showSummaryModal({ results, coinsAward, streakCalc: sc, badgeResult });
  updateDailyCard(profileStore.get());
}

function updateMastery(mastery, mode, results) {
  const key = `mode:${mode}`;
  const prev = mastery[key] || { correct: 0, wrong: 0, lastSeenISO: '' };
  return { ...mastery, [key]: { correct: prev.correct + results.correct, wrong: prev.wrong + results.wrong, lastSeenISO: new Date().toISOString() } };
}
