// /public_html/js/theme.js

const THEME_KEY = 'sf-theme';
const root = document.documentElement;
const prefersDarkQuery = matchMedia('(prefers-color-scheme: dark)');

// We only support 'light' or 'dark' now.
// Anything else (including old 'system' values) is normalised.
function normalizeMode(mode) {
  return mode === 'dark' ? 'dark' : 'light';
}

// Swap themed screenshots (bento grid etc.)
function applyThemeImages(mode) {
  const effective = mode === 'dark' ? 'dark' : 'light';

  document.querySelectorAll('.js-theme-img').forEach((img) => {
    const lightSrc = img.getAttribute('data-img-light');
    const darkSrc  = img.getAttribute('data-img-dark');

    if (!lightSrc && !darkSrc) return;

    const targetSrc =
      effective === 'dark'
        ? (darkSrc || lightSrc)
        : (lightSrc || darkSrc);

    if (!targetSrc) return;

    // Avoid pointless reloads
    if (!img.src.endsWith(targetSrc)) {
      img.src = targetSrc;
    }
  });
}

export function getThemePreference() {
  try {
    return localStorage.getItem(THEME_KEY) || '';
  } catch {
    return '';
  }
}

export function setThemePreference(mode, persist = true) {
  const value = normalizeMode(mode); // 'light' or 'dark'
  root.dataset.theme = value;

  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, value);
    } catch {
      // ignore storage errors
    }
  }

  applyThemeImages(value);
  syncHeaderToggle(value);
  return value;
}

export function initThemeToggle() {
  const storedRaw = getThemePreference();
  let initial;

  if (storedRaw) {
    // If something weird like 'system' is stored, normalise it
    initial = normalizeMode(storedRaw);
  } else {
    // No preference yet -> follow OS once at startup
    initial = prefersDarkQuery.matches ? 'dark' : 'light';
  }

  setThemePreference(initial, false);

  // Optional: if user never chose a theme, follow OS changes live
  prefersDarkQuery.addEventListener('change', (e) => {
    if (!getThemePreference()) {
      setThemePreference(e.matches ? 'dark' : 'light', false);
    }
  });

  wireHeaderToggle();

  // Re-wire button + re-apply themed images when SPA nav swaps templates
  document.addEventListener('sf:nav', () => {
    wireHeaderToggle();
    applyThemeImages(root.dataset.theme || 'light');
  });
}

function wireHeaderToggle() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;

  btn.onclick = () => {
    const current = root.dataset.theme === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    setThemePreference(next);
  };

  syncHeaderToggle(root.dataset.theme || 'light');
}

function syncHeaderToggle(mode) {
  const btn = document.getElementById('themeToggle');
  const icon = document.getElementById('themeIcon');
  const isDark = mode === 'dark';

  if (btn) btn.setAttribute('aria-pressed', String(isDark));
  if (icon) icon.textContent = isDark ? '☀️' : '🌙';
}

// Auto-init
if (document.readyState !== 'loading') initThemeToggle();
else document.addEventListener('DOMContentLoaded', initThemeToggle);
