// js/core/profile.js
const PROFILE_KEY = 'sf_profile_v2';
const PROFILE_VERSION = 2;

export function defaultProfile() {
  return {
    version: PROFILE_VERSION,
    coins: 0,
    streak: { current: 0, best: 0, lastActiveISO: '', freezeTokens: 0 },
    badges: [],
    purchases: [],
    settings: { difficulty: 'auto', sound: true },
    mastery: {},
    history: {},
    lastMode: 'english'
  };
}

export function upgradeProfile(oldProfile) {
  if (!oldProfile || typeof oldProfile !== 'object') return defaultProfile();
  const next = { ...defaultProfile(), ...oldProfile };
  next.version = PROFILE_VERSION;
  next.coins = Number(oldProfile.coins || 0);
  next.badges = Array.isArray(oldProfile.badges) ? oldProfile.badges : [];
  next.purchases = Array.isArray(oldProfile.purchases) ? oldProfile.purchases : [];
  next.settings = { ...defaultProfile().settings, ...(oldProfile.settings || {}) };
  next.mastery = oldProfile.mastery || {};
  next.history = oldProfile.history || {};
  next.lastMode = oldProfile.lastMode || 'english';

  const s = oldProfile.streak;
  let currentVal = 0;
  if (typeof s === 'number') currentVal = s;
  else if (s && typeof s.current !== 'undefined' && s.current !== null) currentVal = s.current;

  next.streak = {
    current: Number((currentVal || 0)),
    best: Number((s && s.best) || 0),
    lastActiveISO: (s && s.lastActiveISO) || '',
    freezeTokens: Number((s && s.freezeTokens) || 0)
  };
  return next;
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return defaultProfile();
    const parsed = JSON.parse(raw);
    if (parsed.version !== PROFILE_VERSION) return upgradeProfile(parsed);
    return parsed;
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.warn('localStorage profile save failed', err);
    try {
      if (typeof window !== 'undefined' && typeof window.idbPut === 'function') {
        window.idbPut('meta', { key: 'profile', value: profile });
      }
    } catch {}
  }
}

export function initProfileStore() {
  let snapshot = loadProfile();
  const listeners = new Set();
  function notify() {
    listeners.forEach((fn) => { try { fn(snapshot); } catch (e) { console.warn('profile listener error', e); } });
  }
  return {
    get() { return snapshot; },
    update(mutator) {
      const draft = typeof structuredClone === 'function' ? structuredClone(snapshot) : JSON.parse(JSON.stringify(snapshot));
      mutator(draft);
      snapshot = upgradeProfile(draft);
      saveProfile(snapshot);
      notify();
    },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  };
}

export function nextMode(prevMode, mastery) {
  const fallbackOrder = ['english', 'maths', 'literacy'];
  const mastered = Object.entries(mastery || {})
    .filter(([key]) => key.indexOf('mode:') === 0)
    .map(([key, stat]) => {
      const c = (stat && stat.correct) || 0;
      const w = (stat && stat.wrong) || 0;
      const attempts = c + w;
      const accuracy = attempts ? c / attempts : 0;
      return { mode: key.replace('mode:', ''), accuracy };
    })
    .sort((a, b) => a.accuracy - b.accuracy);
  if (mastered.length) return mastered[0].mode;
  const idx = fallbackOrder.indexOf(prevMode);
  return fallbackOrder[(idx + 1) % fallbackOrder.length];
}
