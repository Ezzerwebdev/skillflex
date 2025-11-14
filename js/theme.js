// /public_html/js/theme.js
const THEME_KEY = 'sf-theme';
const root = document.documentElement;
const prefersDarkQuery = matchMedia('(prefers-color-scheme: dark)');
let systemListenerBound = false;

export function getThemePreference() {
  try {
    return localStorage.getItem(THEME_KEY) || '';
  } catch {
    return '';
  }
}

export function setThemePreference(mode, persist = true) {
  const value = mode === 'dark' ? 'dark' : 'light';
  root.dataset.theme = value;
  if (persist) {
    try { localStorage.setItem(THEME_KEY, value); } catch {}
  }
  syncHeaderToggle(value);
  return value;
}

export function initThemeToggle() {
  const stored = getThemePreference();
  const initial = stored || (prefersDarkQuery.matches ? 'dark' : 'light');
  setThemePreference(initial, false);

  if (!systemListenerBound) {
    prefersDarkQuery.addEventListener('change', (e) => {
      if (!getThemePreference()) setThemePreference(e.matches ? 'dark' : 'light', false);
    });
    systemListenerBound = true;
  }

  wireHeaderToggle();
  document.addEventListener('sf:nav', wireHeaderToggle);
}

function wireHeaderToggle() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  btn.onclick = () => setThemePreference(root.dataset.theme === 'dark' ? 'light' : 'dark');
  syncHeaderToggle(root.dataset.theme || 'light');
}

function syncHeaderToggle(mode) {
  const btn = document.getElementById('themeToggle');
  const icon = document.getElementById('themeIcon');
  if (btn) btn.setAttribute('aria-pressed', String(mode === 'dark'));
  if (icon) icon.textContent = mode === 'dark' ? '☀️' : '🌙';
}

if (document.readyState !== 'loading') initThemeToggle();
else document.addEventListener('DOMContentLoaded', initThemeToggle);
