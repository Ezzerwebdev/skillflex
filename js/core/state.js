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
