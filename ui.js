/**
 * UI Components Module (ui.js)
 * Clean, accessible UI helpers for SkillFlex Kids.
 */

const $ = (s) => document.querySelector(s);

/**
 * Announce a message for screen readers without visual noise.
 */
export function announceLive(text) {
  const live = document.createElement('div');
  live.className = 'sr-only';
  live.setAttribute('aria-live', 'polite');
  live.textContent = text;
  document.body.appendChild(live);
  setTimeout(() => live.remove(), 600);
}

/**
 * Simple focus trap for a modal container. Returns a cleanup fn.
 */
function trapFocus(modalEl) {
  const FOCUSABLE =
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
  let focusables = Array.from(modalEl.querySelectorAll(FOCUSABLE));
  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  function onKey(e) {
    if (e.key !== 'Tab') return;
    // Refresh in case DOM changed
    focusables = Array.from(modalEl.querySelectorAll(FOCUSABLE));
    if (focusables.length === 0) return;
    const firstNow = focusables[0];
    const lastNow = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === firstNow) {
      e.preventDefault();
      lastNow.focus();
    } else if (!e.shiftKey && document.activeElement === lastNow) {
      e.preventDefault();
      firstNow.focus();
    }
  }

  modalEl.addEventListener('keydown', onKey);
  return () => modalEl.removeEventListener('keydown', onKey);
}

/**
 * Lock/unlock page scroll while a modal is open.
 */
function lockScroll() {
  const prev = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  return () => {
    document.body.style.overflow = prev;
  };
}

/**
 * Kid-friendly nudge shown when trying to save before any progress exists.
 */
/**
 * Save/Login nudge
 * - variant: 'pre'  → “Almost there” (earn your first coin)
 *           'post' → “Log in to keep coins / play bonus”
 * - onStart: callback for the pre variant (start a challenge)
 * - onLogin: callback for the post variant (go to login)
 * - title/message: optional override copy
 */
/**
 * Kid-friendly nudge. Supports two variants:
 * - pre:  ask to start a challenge (primary = "Pick a challenge")
 * - post: ask to log in            (primary = "Log in")
 *
 * Usage:
 *   showSaveNudge({ variant:'pre',  onStart: fn })
 *   showSaveNudge({ variant:'post', onLogin: fn, title?, message? })
 */
/**
 * Kid-friendly nudges:
 * - variant: "pre"  → (before first play) Pick a challenge / Got it
 * - variant: "post" → (after playing)    Log in / Maybe later
 *
 * opts:
 *   variant: "pre" | "post"
 *   title?: string
 *   message?: string
 *   onStart?: () => void        // only for "pre"
 *   onLogin?: () => void        // only for "post"
 *   onLater?: () => void        // optional; default = go home
 */
export function showSaveNudge(opts) {
  const isObj = typeof opts === 'object' && opts !== null;
  const variant = isObj ? (opts.variant || 'pre') : 'pre';
  const onStart = isObj ? opts.onStart : (typeof opts === 'function' ? opts : null);
  const onLogin = isObj ? opts.onLogin : null;
  const onLater = isObj && typeof opts.onLater === 'function'
    ? opts.onLater
    : () => {
        // default: go home
        try {
          document.body.classList.remove('in-lesson');
          document.getElementById('app')?.classList.remove('lesson-active');
          history.pushState({}, '', '/');
          window.router?.();
        } catch {}
      };

  const host = document.querySelector('#modal-host');
  if (!host) return alert('Heads up: modal host missing');

  const t = isObj && opts.title
    ? opts.title
    : (variant === 'pre' ? 'Almost there! ✨' : 'Next steps need a login');
  const m = isObj && opts.message
    ? opts.message
    : (variant === 'pre'
        ? 'Do one quick challenge to earn your first coin. Then you can save your coins forever!'
        : 'Log in to continue your learning path and keep your coins across devices.');

  const primaryId = variant === 'pre' ? 'nudge-start' : 'nudge-login';
  const secondaryId = 'nudge-close';
  const primaryLabel = variant === 'pre' ? 'Pick a challenge' : 'Log in';
  const secondaryLabel = variant === 'pre' ? 'Got it' : 'Maybe later';

  host.innerHTML = `
    <div class="modal-overlay" data-modal-overlay>
      <div class="modal-content" role="dialog" aria-modal="true"
           aria-labelledby="nudge-title" aria-describedby="nudge-desc">
        <h2 id="nudge-title" class="modal-title">${t}</h2>
        <p id="nudge-desc" class="modal-text">${m}</p>
        <div style="display:flex; gap:.75rem; justify-content:center; flex-wrap:wrap">
          <button id="${primaryId}" class="btn btn-primary" type="button">${primaryLabel}</button>
          <button id="${secondaryId}" class="btn btn-secondary" type="button">${secondaryLabel}</button>
        </div>
      </div>
    </div>
  `;

  const overlay = host.querySelector('[data-modal-overlay]');
  const content = host.querySelector('.modal-content');
  const releaseFocus = (function trapFocus(modalEl){
    const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const list = Array.from(modalEl.querySelectorAll(FOCUSABLE));
      if (!list.length) return;
      const first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    modalEl.addEventListener('keydown', onKey);
    return () => modalEl.removeEventListener('keydown', onKey);
  })(content);

  const unlock = (function lockScroll(){
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  })();

  const close = () => { releaseFocus(); unlock(); host.innerHTML = ''; };

  // Wire buttons
  host.querySelector(`#${secondaryId}`).onclick = () => { close(); onLater(); };
  host.querySelector(`#${primaryId}`).onclick = () => {
    if (variant === 'pre') { close(); onStart?.(); }
    else { close(); onLogin?.(); }
  };

  overlay.addEventListener('click', (e) => { if (e.target === overlay) { close(); onLater(); } });
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') { close(); onLater(); } });

  (host.querySelector(`#${primaryId}`) || content).focus();
  announceLive(t);
}




/**
 * Completion modal (accessible, keyboard friendly).
 * @param {number} score
 * @param {number} total
 * @param {function} onContinue
 * @param {object}   extra      optional { onSave: function }
 */
export function showCompletionModal(score, total, onContinue, extra = {}) {
  const modalHost = document.querySelector('#modal-host');
  if (!modalHost) {
    console.error('Modal host element not found!');
    // If we can’t show a modal, just go home.
    try {
      history.pushState({}, '', '/');
      if (typeof window.router === 'function') window.router();
    } catch {}
    return;
  }

  // Friendly headline based on score
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  let title = 'Good Effort!';
  let subtitle = 'Every bit of practice helps you grow stronger!';
  if (pct >= 90) {
    title = 'Incredible! 🌟';
    subtitle = "You're a true learning superstar!";
  } else if (pct >= 50) {
    title = 'Well Done! 🎉';
    subtitle = 'That was a fantastic job. Keep it up!';
  }

  const showSave = typeof extra.onSave === 'function';
  const showNext = typeof onContinue === 'function';

  // Build modal
  modalHost.innerHTML = `
    <div class="modal-overlay" data-modal-overlay>
      <div class="modal-content" role="dialog" aria-modal="true"
           aria-labelledby="modal-title" aria-describedby="modal-desc">
        <h2 id="modal-title" class="modal-title">${title}</h2>
        <p id="modal-desc" class="modal-text">${subtitle}</p>

        <div class="modal-score">You scored: <strong>${score} / ${total}</strong></div>

        <div class="modal-actions" style="display:flex; gap:.75rem; justify-content:center; flex-wrap:wrap">
          ${showSave ? `<button id="modal-save" class="btn btn-primary" type="button">Save my coins 🪙</button>` : ''}
          ${showNext ? `<button id="modal-next" class="btn btn-primary" type="button">Continue ▶</button>` : ''}
          <button id="modal-back" class="btn btn-secondary" type="button">Back to hub</button>
        </div>
      </div>
    </div>
  `;

  // Focus management + scroll lock (helpers already defined above in your file)
  const overlay  = modalHost.querySelector('[data-modal-overlay]');
  const content  = modalHost.querySelector('.modal-content');
  const btnSave  = modalHost.querySelector('#modal-save');
  const btnNext  = modalHost.querySelector('#modal-next');
  const btnBack  = modalHost.querySelector('#modal-back');
  const prevFocus = document.activeElement;

  const releaseFocus = (function trapFocus(modalEl){
    const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const list = Array.from(modalEl.querySelectorAll(FOCUSABLE));
      if (!list.length) return;
      const first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    modalEl.addEventListener('keydown', onKey);
    return () => modalEl.removeEventListener('keydown', onKey);
  })(content);

  const unlock = (function lockScroll(){
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  })();

  function cleanup() {
    releaseFocus();
    unlock();
    modalHost.innerHTML = '';
    try { prevFocus && prevFocus.focus?.(); } catch {}
  }

  // Always go back to the hub
  function goHome() {
    cleanup();
    document.body.classList.remove('in-lesson');
    document.getElementById('app')?.classList.remove('lesson-active');
    history.pushState({}, '', '/');
    if (typeof window.router === 'function') window.router();
  }

  // Wire buttons
  btnBack.addEventListener('click', goHome);

  if (btnNext && showNext) {
    btnNext.addEventListener('click', async () => {
      cleanup();
      try { await onContinue(); } catch {}
    });
  }

  if (btnSave && showSave) {
    btnSave.addEventListener('click', (e) => {
      e.preventDefault();
      // Keep modal visible; the save handler will navigate to login.
      try { extra.onSave(); } catch {}
    });
  }

  // Dismissals → also go home
  overlay.addEventListener('click', (e) => { if (e.target === overlay) goHome(); });
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') goHome(); });

  // Initial focus + SR announce
  (btnSave || btnNext || btnBack).focus();
  (function announceLive(text){
    const live = document.createElement('div');
    live.className = 'sr-only';
    live.setAttribute('aria-live', 'polite');
    live.textContent = text;
    document.body.appendChild(live);
    setTimeout(() => live.remove(), 600);
  })('Lesson complete. Choose Save, Continue, or Back to hub.');
}

/**
 * CONTINUE CARD
 * Uses the units feature’s nextHref + current pointer to present one obvious action.
 */
export function renderContinueCard(state = window.state) {
  const card = document.getElementById('continueCard');
  if (!card) return;

  try {
    const s = state || {};
    const next = window.sfHooks?.getNextHref?.() || null;

    // Work out label like: “Unit 2 · Step 3”
    let meta = '';
    if (Array.isArray(s.unitPlan) && s.unitPlan.length) {
      const u = Number(s.unitIndex || 0) + 1;
      const l = Number(s.lessonIndex || 0) + 1;
      const len = s.unitPlan[s.unitIndex]?.lessons?.length || 0;
      meta = `Unit ${u} · Step ${Math.min(l, Math.max(1, len))}`;
    }

    // If no next yet, try to point at first lesson
    let href = next;
    if (!href && Array.isArray(s.unitPlan) && s.unitPlan[0]?.lessons?.[0]) {
      const first = s.unitPlan[0].lessons[0];
      href = `/lesson/${window.toFullSlugForSelection(s, first.id)}`;
      meta = 'Start Warm-Up';
    }

    if (!href) {
      card.hidden = true;
      return;
    }

    const btn = card.querySelector('#continueBtn');
    const chip = card.querySelector('#continueMeta');

    btn.setAttribute('href', href);
    btn.textContent = meta.startsWith('Start') ? 'Start' : 'Continue';
    chip.textContent = meta;
    card.hidden = false;

    // SPA navigation
    btn.onclick = (e) => {
      e.preventDefault();
      history.pushState({}, '', href);
      window.router?.();
    };
  } catch {
    card.hidden = true;
  }
}

/**
 * MOTIVATION RAIL
 * Simple, non-blocking “quests/streak/coins” rail (desktop will show; mobile stacks under).
 */
export function renderMotivationRail(state = window.state) {
  const rail = document.getElementById('motivationRail');
  if (!rail) return;

  // Basic example content (pull real values from your state later)
  const coinsEl = document.getElementById('coins');
  const streakEl = document.getElementById('streak');
  const coins = coinsEl ? coinsEl.textContent : '🪙 0';
  const streak = streakEl ? streakEl.textContent : '🔥 0';

  rail.innerHTML = `
    <section class="section">
      <div class="activity-list-header sub"><h3>Daily Quests</h3></div>
      <ul class="rail-list">
        <li>Earn 10 XP <span class="pill">0 / 10</span></li>
        <li>Finish 1 lesson <span class="pill">0 / 1</span></li>
        <li>Keep your streak <span class="pill">${streak}</span></li>
      </ul>
    </section>

    <section class="section">
      <div class="activity-list-header sub"><h3>Your stats</h3></div>
      <div class="pill" style="display:inline-block;margin-right:.5rem">${coins}</div>
      <div class="pill" style="display:inline-block">${streak}</div>
    </section>
  `;
}

// Make them callable from units.js without import wiring if needed
window.renderContinueCard = renderContinueCard;
window.renderMotivationRail = renderMotivationRail;
