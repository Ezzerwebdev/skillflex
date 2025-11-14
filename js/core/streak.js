// js/core/streak.js
const DAY_MS = 86_400_000;

export function getTodayKey(now = new Date(), tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC') {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  const [{ value: year }, , { value: month }, , { value: day }] = fmt.formatToParts(now);
  return `${year}-${month}-${day}`;
}

export function isNewDay(lastISO, nowISO) {
  return lastISO !== nowISO;
}

export function calcStreak(lastISO, nowISO, prev = 0, freezeTokens = 0) {
  if (!lastISO) return { current: 1, delta: +1, freezeTokens };
  const last = new Date(lastISO).getTime();
  const now = new Date(nowISO).getTime();
  const diff = Math.floor((now - last) / DAY_MS);
  if (diff <= 0) return { current: prev, delta: 0, freezeTokens };
  if (diff === 1) return { current: prev + 1, delta: +1, freezeTokens };
  if (freezeTokens > 0) {
    return { current: prev, delta: 0, freezeTokens: freezeTokens - 1, freezeUsed: true };
  }
  return { current: 0, delta: -prev, freezeTokens, reset: true };
}
