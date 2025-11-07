// /public_html/js/theme.js
export function initThemeToggle() {
  const KEY = 'sf-theme';
  const root = document.documentElement;

  const el = () => ({
    btn: document.getElementById('themeToggle'),
    icon: document.getElementById('themeIcon'),
  });

  const saved = localStorage.getItem(KEY);
  const prefersDark = matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(saved || (prefersDark ? 'dark' : 'light'), false);

  if (!saved) {
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      setTheme(e.matches ? 'dark' : 'light', false);
    });
  }

  readyWire(); // wire up now and also after client-side nav (if any)
  document.addEventListener('sf:nav', readyWire); // optional if your app emits a nav event

  function readyWire() {
    const { btn, icon } = el();
    if (!btn) return; // header not in DOM yet
    btn.onclick = () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
    updateButton(icon, root.dataset.theme);
  }

  function setTheme(mode, persist = true) {
    root.dataset.theme = mode;                       // sets [data-theme="dark"|"light"]
    if (persist) localStorage.setItem(KEY, mode);
    const { icon } = el();
    updateButton(icon, mode);
  }

  function updateButton(icon, mode) {
    const btn = el().btn;
    if (!btn) return;
    const dark = mode === 'dark';
    btn.setAttribute('aria-pressed', String(dark));
    if (icon) icon.textContent = dark ? '☀️' : '🌙';
  }
}

// auto-init when DOM is ready if imported as a side effect
if (document.readyState !== 'loading') initThemeToggle();
else document.addEventListener('DOMContentLoaded', initThemeToggle);
