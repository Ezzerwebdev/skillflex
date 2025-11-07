// /js/features/units.js
// Unit/Sections playlist feature — adds  “units -> lessons” hub
// Requires 3 tiny hooks in app.js (shown below).

// ------------------------- CURRICULUM MAP -------------------------
//
// How this file is organized:
//   1) CURATED UNITS (hand-picked)         ← Put your Duolingo-style sections here
//   2) AUTO FALLBACK (generated)           ← Builds units from custom_activities.json when no curated plan
//   3) The rest of the feature (helpers, renderers, hooks)
//
// KEY FORMAT used by this feature: `${subject}:${year}:${topic}`
// Example: 'english:3:spelling_baked'
//
// IMPORTANT: When you add curated lessons below, always use the *full* pack id
// from your custom_activities.json (e.g. 'year3/english/spelling/ei-fill-the-gap-y3').
// The router will open /lesson/<id> → fetchPack will load /packs/<id>.json.

// 1) === CURATED UNITS (hand-picked) ==================================
// Year 3 · Spelling · Term 1A (PlanIt Weeks 1–7)
const CURRICULUM = {};

// 2) === AUTO FALLBACK (generated from custom_activities.json) ========
// If there is NO curated entry for the current selection key, we try to
// build a reasonable “Units & Lessons” plan from your global activities
// index (window.allActivities). This keeps the feature working for
// everything else without bloating app.js or hand-writing everything.

const AUTO = {
  // Change how many lessons per unit if you wish
  CHUNK_SIZE: 5,

  emojiFor(subject, topic) {
    if (subject === 'english' && topic === 'spelling') return '🔡';
    if (subject === 'english' && topic === 'grammar')  return '📘';
    if (subject === 'maths')                            return '➗';
    return '📚';
  },

  // Sort the raw activities before chunking. Title is a sensible default.
  sortFn(a, b) {
    // Stable-ish alpha by title then id
    const t = String(a.title || '').localeCompare(String(b.title || ''));
    return t !== 0 ? t : String(a.id || '').localeCompare(String(b.id || ''));
  },

  buildUnitsForSelection(sel, all) {
    if (!sel?.subject || !sel?.year || !sel?.topic) return [];
    const filtered = (all || []).filter(a =>
      a.subject === sel.subject &&
      Number(a.year) === Number(sel.year) &&
      a.topic === sel.topic
    ).sort(AUTO.sortFn);

    if (!filtered.length) return [];

    const units = [];
    const emoji = AUTO.emojiFor(sel.subject, sel.topic);
    const chunkSize = AUTO.CHUNK_SIZE;

    for (let i = 0; i < filtered.length; i += chunkSize) {
      const chunk = filtered.slice(i, i + chunkSize);
      units.push({
        id: `auto-u${units.length + 1}`,
        title: `Unit ${units.length + 1}`,
        emoji,
        lessons: chunk.map(item => ({ id: item.id, title: item.title })),
      });
    }
    return units;
  },
};

// ------------------------- STATE HELPERS --------------------------
// Per-level storage keys to prevent cross-level overwrites.
function UNIT_KEYS(sel){
  const base = keyForSel(sel || {}); // `${subject}:${year}:${topic}:${level}`
  return {
    plan: `sf_unit_plan:${base}`,
    uIdx: `sf_unit_index:${base}`,
    lIdx: `sf_unit_lesson_index:${base}`,
    meta: `sf_unit_meta:${base}`
  };
}
// Back-compat (reads only) to pull any pre-level data once.
const UNIT_KEYS_LEGACY = { plan: 'sf_unit_plan', uIdx: 'sf_unit_index', lIdx: 'sf_unit_lesson_index', meta: 'sf_unit_meta' };



const keyForSel = (sel) => `${sel?.subject || ""}:${sel?.year || ""}:${sel?.topic || ""}:${sel?.level || ""}`;

// --- External plan loader -------------------------------------------
// Keep this tiny; same-origin fetch from /packs

const PLAN_VERSION = '16'; // bump to bust cache when you edit _plan.json
const _planCache = new Map(); // key -> units[]

// Builds /packs path for a selection (subject, year, topic)
// Builds /packs path for a selection (subject, year, topic, level)
function planUrlFor(sel) {
  const { subject, year, topic, level } = sel || {};
  const file = level ? `_plan.${level}.json` : `_plan.json`;

  // Maths can be year-only (no topic)
  if (subject === 'maths' && !topic) {
    return `/packs/year${year}/maths/${file}?v=${PLAN_VERSION}`;
  }

  // Subject + topic (english/spelling, english/grammar, maths/<topic>)
  return `/packs/year${year}/${subject}/${topic}/${file}?v=${PLAN_VERSION}`;
}


async function loadCuratedPlan(sel) {
  const key = keyForSel(sel);
  if (_planCache.has(key)) return _planCache.get(key);

  async function tryUrl(u) {
    try {
      const r = await fetch(u, { cache: 'no-store' });
      if (!r.ok) return null;
      const j = await r.json();
      const list = Array.isArray(j?.units) ? j.units : j; // accept {units:[]} or bare []
      return Array.isArray(list) ? list : null;
    } catch {
      return null;
    }
  }

  const primary = planUrlFor(sel);
  let units = await tryUrl(primary);

  // If we asked for _plan.<level>.json and it’s missing, fall back to _plan.json
  if (!units && sel?.level) {
    const fb = primary.replace(/_plan\.[^/]+\.json/, '_plan.json');
    units = await tryUrl(fb);
  }

  if (units) _planCache.set(key, units);
  return units || null;
}

// ---------- Level constants & placement ----------
// ---------- Level UI (modal) + placement (no CSS injection here) ----------
const LEVEL_ORDER   = ['seedling','sprout','challenge']; // Warm-Up, Ready, Challenge!
const LEVEL_LABELS  = { seedling:'Warm-Up', sprout:'Ready', challenge:'Challenge!' };
(window.sfHooks ||= {}).levelLabelFor = (id) => LEVEL_LABELS[id] || '';
const PLACEMENT_THRESHOLDS = { sproutMin:50, challengeMin:80 }; // % (mirrors yours)

const trackKeyOf    = (sel) => `${sel?.subject||''}:${sel?.year||''}:${sel?.topic||''}`;
const LS_LEVEL_CHOICE = (sel) => `sf_level_choice:${trackKeyOf(sel)}`;
const LS_PLACE        = (sel) => `sf_place:${trackKeyOf(sel)}`;
const LS_LVL_COOLDOWN = (sel) => `sf_last_level_up_at:${trackKeyOf(sel)}`;

function readPlacement(sel){ try { return JSON.parse(localStorage.getItem(LS_PLACE(sel))||'null'); } catch { return null; } }
function writePlacement(sel, data){ localStorage.setItem(LS_PLACE(sel), JSON.stringify(data)); }
function readTrackLevel(sel){ return localStorage.getItem(LS_LEVEL_CHOICE(sel)) || null; }
function writeTrackLevel(sel, lvl){ localStorage.setItem(LS_LEVEL_CHOICE(sel), lvl); }

function readLocalPtrFor(sel){
  const K = UNIT_KEYS(sel);
  const u = Number(localStorage.getItem(K.uIdx));
  const l = Number(localStorage.getItem(K.lIdx));
  if (!Number.isFinite(u) || !Number.isFinite(l)) return null;
  return { unit_index: Math.max(0, u|0), lesson_index: Math.max(0, l|0) };
}

function ptrIsUnitCompleted(ptr, unitIdx, plan){
  if (!ptr || !plan?.[unitIdx]) return false;
  const len = (plan[unitIdx]?.lessons?.length) || 0;
  return (ptr.unit_index > unitIdx) || (ptr.unit_index === unitIdx && ptr.lesson_index >= Math.max(0, len - 1));
}

async function isLevelUnlocked(sel, targetLevel){
  if (targetLevel === 'seedling') return true;

  // optional cooldown mirror
  const cooldownDays = Number(window.SF_LEVEL_UP_COOLDOWN_DAYS || 0);
  if (cooldownDays > 0) {
    const last = Number(localStorage.getItem(LS_LVL_COOLDOWN(sel))||'0');
    if (Date.now() - last < cooldownDays * 86400_000) return false;
  }

  const placement = readPlacement(sel);

  if (targetLevel === 'sprout') {
    if ((placement?.score ?? -1) >= PLACEMENT_THRESHOLDS.sproutMin) return true;
    const planSeed = await loadCuratedPlan({ ...sel, level: 'seedling' }) || [];
    const ptrSeed  = readLocalPtrFor({ ...sel, level: 'seedling' });
    return ptrIsUnitCompleted(ptrSeed, 0, planSeed); // Warm-Up Unit 1 done
  }

  if (targetLevel === 'challenge') {
    if ((placement?.score ?? -1) >= PLACEMENT_THRESHOLDS.challengeMin) return true;
    const planSpr = await loadCuratedPlan({ ...sel, level: 'sprout' }) || [];
    const ptrSpr  = readLocalPtrFor({ ...sel, level: 'sprout' });
    return ptrIsUnitCompleted(ptrSpr, 1, planSpr); // Ready Unit 2 done
  }
  return false;
}

// Generic modal shell — relies on classes you put in ui.css (no injected styles here)
function openModal({ title, renderBody, renderFooter }) {
  return new Promise((resolve) => {
    const ovl = document.createElement('div'); ovl.className = 'sf-modal-ovl';
    const box = document.createElement('div'); box.className = 'sf-modal';
    box.innerHTML = `
      <div class="sf-head"><h3>${title || ''}</h3></div>
      <div class="sf-body"></div>
      <div class="sf-foot"></div>`;
    ovl.appendChild(box);
    const close = (val=null)=>{ try{document.body.removeChild(ovl);}catch{} resolve(val); };
    ovl.addEventListener('click', (e)=>{ if(e.target===ovl) close(null); });
    const body = box.querySelector('.sf-body');
    const foot = box.querySelector('.sf-foot');
    renderBody?.(body, close);
    renderFooter?.(foot, close);
    document.body.appendChild(ovl);
  });
}

// Small offline placement set for Y3 spelling; extend later as needed
const PLACEMENT_SETS = {
  'english:3:spelling': {
    id: 'y3-spell-v1',
    items: [
      { id:'p1', prompt:"_____ going to the park later.", options:["Their","There","They're"], answerIndex:2 },
      { id:'p2', prompt:"Which word has the long /ai/ sound?", options:["train","bread","ship"], answerIndex:0 },
      { id:'p3', prompt:"What does 'unhappy' mean?", options:["very happy","not happy","happy again"], answerIndex:1 },
      { id:'p4', prompt:"Choose the word that means 'not agree'.", options:["disagree","agreeful","agreeless"], answerIndex:0 },
      { id:'p5', prompt:"Pick the correctly spelled word:", options:["thay","thei","they"], answerIndex:2 },
    ]
  }
};

async function uiRunPlacement(sel){
  const track = trackKeyOf(sel);
  const set = PLACEMENT_SETS[track];
  if (!set) return null; // if no set, you can decide to skip

  let idx = 0, correct = 0;
  const res = await openModal({
    title: 'Quick Level Check',
    renderBody: (body, close) => {
      const renderQ = () => {
        const q = set.items[idx];
        body.innerHTML = '';
        const h = document.createElement('h4'); h.className='sf-quiz-q'; h.textContent = `Q${idx+1}. ${q.prompt}`;
        body.appendChild(h);
        q.options.forEach((opt, oi) => {
          const btn = document.createElement('button');
          btn.className = 'sf-quiz-opt';
          btn.textContent = opt;
          btn.onclick = () => {
            if (oi === q.answerIndex) correct++;
            idx++;
            if (idx >= set.items.length) {
              const score = Math.round(100 * correct / set.items.length);
              const result = { score, taken_at: Date.now() };
              writePlacement(sel, result);
              close(result);
            } else {
              renderQ();
            }
          };
          body.appendChild(btn);
        });
        const chip = document.createElement('div');
        chip.className = 'sf-chip';
        chip.textContent = `${idx+1}/${set.items.length}`;
        body.appendChild(chip);
      };
      renderQ();
    },
    renderFooter: (foot, close) => {
      const cancel = document.createElement('button'); cancel.className='sf-btn gray'; cancel.textContent='Cancel';
      cancel.onclick = () => close(null);
      foot.appendChild(cancel);
    }
  });
  return res;
}

async function uiOpenLevelChooser(sel){
  const opts = [
    { id:'seedling',  label:'Warm-Up',   sub:'Gentle start' },
    { id:'sprout',    label:'Ready',     sub:'Step up the challenge' },
    { id:'challenge', label:'Challenge!',sub:'Top tier' }
  ];

  // Precompute locks
  const lockedMap = Object.create(null);
  for (const o of opts) lockedMap[o.id] = !(await isLevelUnlocked(sel, o.id));

  const chosen = await openModal({
    title: 'Choose your level',
    renderBody: (body, close) => {
      const grid = document.createElement('div'); grid.className='sf-grid';
      opts.forEach(o => {
        const card = document.createElement('div'); card.className='sf-card';
        card.setAttribute('data-id', o.id);
        card.innerHTML = `
          <div class="sf-badge ${lockedMap[o.id] ? 'lock':'ok'}">${lockedMap[o.id] ? 'Locked' : 'Unlocked'}</div>
          <div class="title">${o.label}</div>
          <div class="sub">${o.sub}</div>
        `;

        card.onclick = async () => {
          // If locked, run placement inline — no native confirm()
          if (lockedMap[o.id]) {
            const placement = await uiRunPlacement(sel);
            if (!placement) return;
            const nowUnlocked = await isLevelUnlocked(sel, o.id);
            if (nowUnlocked) {
              lockedMap[o.id] = false;
              card.querySelector('.sf-badge').className = 'sf-badge ok';
              card.querySelector('.sf-badge').textContent = 'Unlocked';
              close(o.id);
            } else {
              safeFeedback('Still locked. Try the prerequisite first.', false);
            }
            return;
          }
          close(o.id);
        };

        grid.appendChild(card);
      });
      body.appendChild(grid);
    },
    renderFooter: (foot, close) => {
      const cancel = document.createElement('button'); cancel.className='sf-btn gray'; cancel.textContent='Cancel';
      cancel.onclick = () => close(null);
      foot.appendChild(cancel);
    }
  });
  return chosen;
}

// Ask level BEFORE hub shows when entering a subject/year/topic
function maybePromptLevelOnEntry(s){
  const sel = s.selections || {};
  if (!sel.subject || !sel.year || !sel.topic) return false;

  // 1) use previously chosen level for this track
  const saved = readTrackLevel(sel);
  if (saved && !sel.level) sel.level = saved;

  if (sel.level) return false; // already set

  // 2) choose now, then re-render hub
  (async () => {
    const picked = await uiOpenLevelChooser(sel);
    const chosen = ['seedling','sprout','challenge'].includes(picked) ? picked : 'seedling';
    sel.level = chosen;
    writeTrackLevel(sel, chosen);

    // persist selection
    try {
      sessionStorage.setItem('sf_selections', JSON.stringify(sel));
      localStorage.setItem('sf_selections_persist', JSON.stringify(sel));
    } catch {}

    // reset plan state to ensure correct plan loads
    s.unitPlan = []; s.unitIndex = 0; s.lessonIndex = 0; s._unitMeta = null;
    persistUnitState(s);

    // comeback → will load plan + reconcile pointer
    (window.sfHooks?.renderHubOverride || (() => false))();
  })();

  return true; // “I’m handling it, don’t render hub yet”
}



// === Units pointer API (logged-in sync) ==========================
const UNITS_API = (p) => (window.API_BASE || '/api') + p;

async function fetchUnitsPointer(key){
  try {
    if (!window.JWT_TOKEN) return null;
    const res = await fetch(UNITS_API('/game/units/pointer?key=' + encodeURIComponent(key)), {
      method: 'GET',
      headers: { 'Accept':'application/json', 'Authorization': `Bearer ${window.JWT_TOKEN}` },
      cache: 'no-store'
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function saveUnitsPointer(key, uIdx, lIdx){
  try {
    if (!window.JWT_TOKEN) return;
    await fetch(UNITS_API('/game/units/pointer'), {
      method: 'POST',
      headers: { 'Accept':'application/json','Content-Type':'application/json','Authorization':`Bearer ${window.JWT_TOKEN}` },
      body: JSON.stringify({ key, unit_index: uIdx, lesson_index: lIdx }),
      keepalive: true,
    });
  } catch {}
}

async function reconcileUnitsPointer(s, host){
  try {
    const keyLvl = keyForSel(s.selections);
    let ptr = null;

    // online: fetch levelled; if missing, try legacy and upsert forward
    if (window.JWT_TOKEN) {
      ptr = await fetchUnitsPointer(keyLvl);
      if (!ptr) {
        const legacyKey = `${s.selections.subject}:${s.selections.year}:${s.selections.topic}`; // subject:year:topic
        const legacyPtr = await fetchUnitsPointer(legacyKey);
        if (legacyPtr) {
          // adopt legacy → upsert into levelled key
          await saveUnitsPointer(keyLvl, Number(legacyPtr.unit_index||0), Number(legacyPtr.lesson_index||0));
          ptr = legacyPtr;
        }
      }
    }

    const uiLocal = Number(s.unitIndex   || 0);
    const liLocal = Number(s.lessonIndex || 0);
    const uiSrv   = Number(ptr?.unit_index   || 0);
    const liSrv   = Number(ptr?.lesson_index || 0);

    const serverAhead = (uiSrv > uiLocal) || (uiSrv === uiLocal && liSrv > liLocal);
    const localAhead  = (uiLocal > uiSrv) || (uiLocal === uiSrv && liLocal > liSrv);

    if (serverAhead) {
      // adopt server pointer → persist + repaint
      s.unitIndex = uiSrv; s.lessonIndex = liSrv;
      persistUnitState(s);
      if (host) renderUnitHubInto(host, s);
      return;
    }

    // if local is ahead, push it up once
    if (localAhead && window.JWT_TOKEN) {
      await saveUnitsPointer(keyLvl, uiLocal, liLocal);
    }
  } catch {}
}


window.reconcileUnitsPointer = reconcileUnitsPointer;

function applyServerPointerIfAhead(s, key, ptr, host){
  try {
    if (!ptr) return;
    const ui = Number(ptr.unit_index || 0);
    const li = Number(ptr.lesson_index || 0);
    const ahead = (ui > (s.unitIndex||0)) || (ui === (s.unitIndex||0) && li > (s.lessonIndex||0));
    if (ahead) {
      s.unitIndex = ui; s.lessonIndex = li;
      persistUnitState(s);
      if (host) renderUnitHubInto(host, s);
    }
  } catch {}
}

// --- Home chrome toggle (mirror of app.js:setHomeInfoVisible) ---
const HOME_ONLY_SEL = '.home-hero, .grownups.section, .trust-strip';
function unitsSetHomeInfoVisible(show){
  try {
    document.querySelectorAll(HOME_ONLY_SEL)
      .forEach(el => { if (el) el.hidden = !show; });
  } catch {}
}


// ------------------------- ID / SLUG NORMALISER ------------------
// Accepts a short code ("anti-fill-gap") or a full pack id
// ("year3/english/spelling/anti-fill-the-gap-y3") and returns the
// *full* id that your fetchPack() expects.
const ACTIVITY_INDEX = (() => {
  const map = Object.create(null);
  try {
    (window.allActivities || []).forEach(a => {
      const leaf = String(a.id).split('/').pop();
      map[a.id] = a.id;     // full → full
      map[leaf] = a.id;     // leaf → full
    });
  } catch {}
  return map;
})();

function slugOf(idOrObj) {
  const raw =
    (typeof idOrObj === 'string' ? idOrObj : idOrObj?.id) || '';
  const cleaned = raw.trim()
    .replace(/^\/+|\/+$/g, '')   // trim slashes
    .replace(/\.json$/i, '');    // drop .json if present
  if (cleaned.includes('/')) return cleaned;     // already full
  return ACTIVITY_INDEX[cleaned] || cleaned;     // expand short → full
}


function hydrateUnitState(s) {
  try {
    const K = UNIT_KEYS(s.selections || {});
    const plan = JSON.parse(localStorage.getItem(K.plan) || localStorage.getItem(UNIT_KEYS_LEGACY.plan) || '[]');
    const uIdx = Number(localStorage.getItem(K.uIdx) || localStorage.getItem(UNIT_KEYS_LEGACY.uIdx) || 0);
    const lIdx = Number(localStorage.getItem(K.lIdx) || localStorage.getItem(UNIT_KEYS_LEGACY.lIdx) || 0);
    const meta = JSON.parse(localStorage.getItem(K.meta) || localStorage.getItem(UNIT_KEYS_LEGACY.meta) || '{}');
    s.unitPlan    = Array.isArray(plan) ? plan : [];
    s.unitIndex   = Number.isFinite(uIdx) ? uIdx : 0;
    s.lessonIndex = Number.isFinite(lIdx) ? lIdx : 0;
    s._unitMeta   = meta && Object.keys(meta).length ? meta : null;
  } catch {
    s.unitPlan = []; s.unitIndex = 0; s.lessonIndex = 0; s._unitMeta = null;
  }
}

function persistUnitState(s) {
  try {
    const K = UNIT_KEYS(s.selections || {});
    localStorage.setItem(K.plan, JSON.stringify(s.unitPlan || []));
    localStorage.setItem(K.uIdx, String(s.unitIndex || 0));
    localStorage.setItem(K.lIdx, String(s.lessonIndex || 0));
    localStorage.setItem(K.meta, JSON.stringify(s._unitMeta || {}));
  } catch {}
}


function inUnitMode(s) { return Array.isArray(s.unitPlan) && s.unitPlan.length > 0; }

function buildAutoUnitsForSelection(s, size = 3) {
  const list = (window.allActivities || [])
  .filter(a =>
    a.subject === s.selections?.subject &&
    Number(a.year) === Number(s.selections?.year) &&
    a.topic === s.selections?.topic && (!s.selections?.level || (a.level || "") === s.selections.level) &&
    (!s.selections?.level || (a.level || "") === s.selections.level)
  )
    .sort((a, b) => String(a.title).localeCompare(b.title)); // stable order

  const units = [];
  for (let i = 0; i < list.length; i += size) {
    const chunk = list.slice(i, i + size);
    if (chunk.length === 0) break;
    units.push({
      id: `auto-${units.length + 1}`,
      title: `Unit ${units.length + 1}`,
      emoji: '📚',
      lessons: chunk.map(a => ({ id: a.id, title: a.title }))
    });
  }
  return units;
}

function getPlanForSelection(s) {
  const key = keyForSel(s.selections || {});
  // 1) baked-in (fast path)
  const baked = CURRICULUM[key];
    if (Array.isArray(baked) && baked.length) return baked;
  // 2) cached JSON (loaded earlier this session)
  const cached = _planCache.get(key);
  if (Array.isArray(cached) && cached.length) return cached;
  // 3) fallback auto-build
  return buildAutoUnitsForSelection(s);
}


function ensureUnitPlanForSelection(s){
  const plan = getPlanForSelection(s);
  if (!plan || !plan.length) { s.unitPlan = []; return false; }

  const meta = {
  subject: s.selections?.subject,
  year: s.selections?.year,
  topic: s.selections?.topic,
  level: s.selections?.level || null
};
  const changed = JSON.stringify(meta) !== JSON.stringify(s._unitMeta || {});

  if (changed || !inUnitMode(s)) {
    s.unitPlan = plan;
    s.unitIndex = 0;
    s.lessonIndex = 0;
    s._unitMeta = meta;
    persistUnitState(s);
  }
  return true;
}


function allowedToOpenLessonInUnits(s, lessonId) {
  if (!inUnitMode(s)) return true;
  const u = s.unitPlan[s.unitIndex];
  if (!u) return false;
  const target = toFullSlugForSelection(s, lessonId).toLowerCase();
  const idx = (u.lessons || []).findIndex(
  x => toFullSlugForSelection(s, x.id).toLowerCase() === target
  );

  if (idx === -1) return false;
  return idx <= s.lessonIndex;  // allow previous/current in the current unit
}

function nextHref(s) {
  if (!inUnitMode(s)) return null;
  const u = s.unitPlan[s.unitIndex];
  const l = u?.lessons?.[s.lessonIndex];
  return l ? `/lesson/${toFullSlugForSelection(s, l.id)}` : null;

}



// ------------------------- RENDERER -------------------------------
function injectStyles(){
  if (document.getElementById('unitsFeatureCss')) return;
  const css = `
  .unit-card .rail{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}
  .unit-card.locked .activity-card{pointer-events:none;opacity:.6;filter:grayscale(.25)}
  .unit-card.current .activity-card.current .activity-icon{animation:cardNudge 1.2s ease-in-out infinite}
  .unit-card .pill{display:inline-block;padding:.25rem .6rem;border-radius:999px;font-size:.75rem;font-weight:700;background:#eef2ff;border:1px solid #c7d2fe;color:#1e3a8a}
  `;
  const style = document.createElement('style');
  style.id = 'unitsFeatureCss';
  style.textContent = css;
  document.head.appendChild(style);
}

// ---- UI helpers: inline nudge + toast (no native alerts) ----
function showTileNudge(tile, msg) {
  try {
    const r = tile.getBoundingClientRect();
    const tip = document.createElement('div');
    tip.textContent = msg;
    tip.style.cssText = [
      'position:fixed',
      `top:${Math.max(8, r.top - 10)}px`,
      `left:${r.left + r.width / 2}px`,
      'transform:translate(-50%, -110%)',
      'background:#111', 'color:#fff',
      'padding:.4rem .6rem', 'border-radius:10px',
      'box-shadow:0 4px 14px rgba(0,0,0,.2)',
      'z-index:9999', 'font-size:13px',
      'pointer-events:none', 'opacity:0',
      'transition:opacity .15s ease, transform .15s ease'
    ].join(';');
    document.body.appendChild(tip);
    requestAnimationFrame(() => { tip.style.opacity = '1'; });
    setTimeout(() => {
      tip.style.opacity = '0'; tip.style.transform = 'translate(-50%, -90%)';
      setTimeout(() => { try { tip.remove(); } catch {} }, 180);
    }, 1400);
  } catch {}
}

function showToast(msg) {
  let cont = document.getElementById('sfToaster');
  if (!cont) {
    cont = document.createElement('div');
    cont.id = 'sfToaster';
    cont.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none';
    document.body.appendChild(cont);
  }
  const item = document.createElement('div');
  item.textContent = msg;
  item.style.cssText = 'background:#111;color:#fff;padding:.6rem .9rem;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,.25);opacity:0;transform:translateY(8px);transition:opacity .2s,transform .2s;pointer-events:auto';
  cont.appendChild(item);
  requestAnimationFrame(() => { item.style.opacity = '1'; item.style.transform = 'translateY(0)'; });
  setTimeout(() => {
    item.style.opacity = '0'; item.style.transform = 'translateY(8px)';
    setTimeout(() => { try { item.remove(); if (!cont.children.length) cont.remove(); } catch {} }, 200);
  }, 1800);
}

// Replace any old safeFeedback that used alert()
function safeFeedback(msg /*, ok */) {
  try {
    if (typeof window.safeFeedback === 'function') return window.safeFeedback(msg, false);
    if (typeof window.toast === 'function') return window.toast(msg);
  } catch {}
  showToast(msg);
}


function renderUnitHubInto(container, s){
   // Hide home-only sections while Units hub is active
  unitsSetHomeInfoVisible(false);
  const units = s.unitPlan || [];
  const currU = Number(s.unitIndex)||0;
  const currL = Number(s.lessonIndex)||0;

  const html = units.map((unit, i) => {
    const locked  = i > currU;
    const done    = i < currU;
    const current = i === currU;

    const steps = (unit.lessons || []).map((lsn, j) => {
      const stepDone   = done || (current && j < currL);
      const stepCurr   = current && j === currL;
      const stepLocked = locked || (current && j > currL);

      const classes = ['activity-card',
        stepDone ? 'completed' : '',
        stepCurr ? 'current'   : '',
        stepLocked ? 'locked'  : ''
      ].filter(Boolean).join(' ');

      const badge = stepDone ? '😊' : stepCurr ? '🎯' : '🔒';

      // 🔒 LOCKED: non-anchor tile + data-step used by the nudge
      if (stepLocked) {
        return `
          <div class="${classes}" role="button" aria-disabled="true" data-step="${j+1}">
            <div class="activity-step">Step ${j+1}</div>
            <div class="activity-icon">${badge}</div>
            <div class="activity-title">${lsn.title || 'Lesson'}</div>
          </div>`;
      }

      // ✅ UNLOCKED: anchor + data-link so your SPA router picks it up
      const slug = slugOf(lsn);
      return `
       <a href="/lesson/${toFullSlugForSelection(s, lsn.id)}" class="${classes}" data-link>
        <div class="activity-step">Step ${j+1}</div>
       <div class="activity-icon">${badge}</div>
        <div class="activity-title">${lsn.title || 'Lesson'}</div>
        </a>`;

       }).join('');

    const stateChip = done ? 'Done' : current ? 'Now' : 'Locked';
    const lockNote  = locked ? `<div class="bonus-lock-banner">🔒 Finish ${units[i-1]?.title || 'previous'} to unlock</div>` : '';

    return `
      <section class="section unit-card ${locked ? 'locked' : current ? 'current' : 'done'}">
        <div class="activity-list-header sub">
          <h3>${unit.emoji || '🎒'} ${unit.title}</h3>
          <span class="pill">${stateChip}</span>
        </div>
        ${lockNote}
        <div class="activity-grid rail">${steps}</div>
      </section>`;
  }).join('');

  // progress chip for level pill
  const u = s.unitPlan[currU]; const total = u?.lessons?.length || 0;
 const chip = total ? `${Math.min(currL+1,total)}/${total}` : '';


  container.innerHTML = `
  <div class="activity-list-header">
    <h2>Learning Path</h2>
    <div style="display:flex;gap:8px;align-items:center">
      <button class="pill" id="levelPill" title="Change level"></button>
      <button id="changeSelectionsBtn" class="btn btn-change">Change Selection</button>
    </div>
  </div>
  ${html}
`;

    // --- Level pill + switcher ---
const pill = container.querySelector('#levelPill');
if (pill) {
  const cur = s?.selections?.level || 'seedling';
  const u = s.unitPlan[Number(s.unitIndex)||0];
  const total = u?.lessons?.length || 0;
  const chip = total ? `• ${Math.min((s.lessonIndex||0)+1, total)}/${total}` : '';
  pill.textContent = `${(LEVEL_LABELS[cur] || 'Level')} ${chip}`.trim();

  pill.onclick = async () => {
    const chosen = await uiOpenLevelChooser(s.selections);
    if (!chosen || chosen === cur) return;

    // Optional: save current pointer to server before switching
    try { if (window.JWT_TOKEN) await saveUnitsPointer(keyForSel(s.selections), s.unitIndex||0, s.lessonIndex||0); } catch {}

    // Switch level (per-track)
    s.selections.level = chosen;
    try {
      sessionStorage.setItem('sf_selections', JSON.stringify(s.selections));
      localStorage.setItem('sf_selections_persist', JSON.stringify(s.selections));
    } catch {}

    // Reset unit state for the new level
    s.unitPlan = []; s.unitIndex = 0; s.lessonIndex = 0; s._unitMeta = null;
    persistUnitState(s);

    // Optional cooldown mark if moving up
    if (LEVEL_ORDER.indexOf(chosen) > LEVEL_ORDER.indexOf(cur)) {
      localStorage.setItem(LS_LVL_COOLDOWN(s.selections), String(Date.now()));
    }

    // Re-render (will fetch the right _plan.<level>.json and reconcile pointer)
    (window.sfHooks?.renderHubOverride || (() => false))();
  };
}


  // Change selection button
  const change = container.querySelector('#changeSelectionsBtn');
  if (change) change.onclick = () => {
    const s2 = window.state;
    if (s2.selections?.topic) delete s2.selections.topic;
    else if (s2.selections?.year) delete s2.selections.year;
    else delete s2.selections.subject;
    try {
      sessionStorage.setItem('sf_selections', JSON.stringify(s2.selections));
      localStorage.setItem('sf_selections_persist', JSON.stringify(s2.selections));
    } catch {}
    window.router?.();
  };

  // 👇 Nudge when locked tiles are clicked/pressed (no popups)
container.addEventListener('click', (e) => {
  const lockedTile = e.target.closest('.activity-card.locked');
  if (!lockedTile) return;
  e.preventDefault(); e.stopPropagation();
  const step = Number(lockedTile.getAttribute('data-step') || '2');
  const prev = Math.max(1, step - 1);
  showTileNudge(lockedTile, `Finish Step ${prev} first to unlock this one ✨`);
});

container.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const lockedTile = e.target.closest('.activity-card.locked');
  if (!lockedTile) return;
  e.preventDefault(); e.stopPropagation();
  const step = Number(lockedTile.getAttribute('data-step') || '2');
  const prev = Math.max(1, step - 1);
  showTileNudge(lockedTile, `Finish Step ${prev} first to unlock this one ✨`);
});
}



// ------------------------- PUBLIC INSTALL -------------------------
export function installUnitsFeature(){

  injectStyles();
  const hooks = (window.sfHooks = window.sfHooks || {});
  if (!hooks.openLevelChooser) hooks.openLevelChooser = uiOpenLevelChooser;
  if (!hooks.runPlacement) hooks.runPlacement = () => uiRunPlacement(window.state?.selections || {});


  // 1) Hub override (keep yours as-is)
  hooks.renderHubOverride = () => {
    const s = window.state;
    if (!s?.selections) return false;

    hydrateUnitState(s);
    // NEW: pick level per track BEFORE we build the plan
    if (maybePromptLevelOnEntry(s)) return true; // modal will re-run this

    // Instant plan (baked / cached / auto)
    const ok = ensureUnitPlanForSelection(s);
// do not bail if plan is empty; we will render and async-upgrade

    let host = document.querySelector("#challengeHubContainer")
  || document.querySelector("#dailyHubContainer")
  || document.querySelector("#hubContainer");
if (!host) {
  host = document.createElement("div");
  host.id = "challengeHubContainer";
  (document.getElementById("main") || document.querySelector("#app") || document.body).appendChild(host);
}

    renderUnitHubInto(host, s);
    // 🔗 Make server & local agree (pull ahead or push ahead)
    reconcileUnitsPointer(s, host);
    // Background: try curated JSON unless a baked plan already exists
  (async () => {
    const key = keyForSel(s.selections);
    if (CURRICULUM[key]) return; // baked-in present; do not override
    const remote = await loadCuratedPlan(s.selections);
    if (Array.isArray(remote) && remote.length) {
  const hadPlan = Array.isArray(s.unitPlan) && s.unitPlan.length > 0;
  const prevU = Number(s.unitIndex || 0);
  const prevL = Number(s.lessonIndex || 0);

  s.unitPlan = remote;

  if (hadPlan) {
    let u = prevU, l = prevL;
    if (!s.unitPlan[u]) { u = 0; l = 0; }
    const len = (s.unitPlan[u]?.lessons?.length) || 0;
    if (l >= len) l = Math.max(0, len - 1);
    s.unitIndex = u; s.lessonIndex = l;
  } else {
    s.unitIndex = 0; s.lessonIndex = 0;
  }

  s._unitMeta = { subject: s.selections.subject, year: s.selections.year, topic: s.selections.topic, level: s.selections.level || null };

  persistUnitState(s);
  renderUnitHubInto(host, s);
  try { reconcileUnitsPointer(s, host); } catch {}
}
  })();
    
    return true;
  };

  // 2) 🔒 Replace your existing gate with this hardened version
  hooks.canOpenLessonOverride = (lessonId) => {
    const s = window.state;
    if (!s) return true;

    // defensively hydrate + ensure when gating (covers deep-links)
    hydrateUnitState(s);
    ensureUnitPlanForSelection(s);
    reconcileUnitsPointer(s); // no host needed here

    if (!inUnitMode(s)) return true; // fall back to daily gating
    return allowedToOpenLessonInUnits(s, lessonId);
  };

  // 3) Completion pointer advance (keep)
hooks.onLessonComplete = ({ pack, scorePct }) => {
  const s = window.state;
  if (!inUnitMode(s)) return;
  if (scorePct < 50) return;

  const u = s.unitPlan[s.unitIndex];
  if (!u) return;

  s.lessonIndex++;
  if (s.lessonIndex >= (u.lessons?.length || 0)) {
    s.unitIndex++;
    s.lessonIndex = 0;
  }
  persistUnitState(s);

  // 🔗 If logged in, persist the pointer to the server
  try {
    if (window.JWT_TOKEN) {
      const key = keyForSel(s.selections);
      saveUnitsPointer(key, s.unitIndex, s.lessonIndex);
    }
  } catch {}

  // 🔗 Mirror the core completion bookkeeping & server sync
  try {
    const id = String(pack?.id || '');
    if (id && !Array.isArray(s.completedToday)) s.completedToday = [];
    if (id && !s.completedToday.includes(id)) s.completedToday.push(id);

    if (window.JWT_TOKEN) {
      const makeKey =
        window.sfBuildActivityKey ||
        (() => {
          const sel = s.selections || {};
          return (`lesson:${id}|${sel.subject || 'any'}|${sel.year || 'any'}|${sel.topic || 'any'}`).slice(0, 190);
        });

      window.sfUpdateUserProgress?.({
        streakEarned: scorePct >= 50,
        activityKey: makeKey(),
      });
    } else {
      window.saveLocalGuestProgress?.();
    }
  } catch {}
};


// 4) Next link (keep)
hooks.getNextHref = () => {
  const s = window.state;
  return inUnitMode(s) ? nextHref(s) : null;
};

}


/* --- single, guarded definition of toFullSlugForSelection --- */
if (typeof window.toFullSlugForSelection !== 'function') {
  window.toFullSlugForSelection = function(s, idOrObj){
    try{
      const leafOrFull =
        (typeof slugOf === 'function') ? slugOf(idOrObj)
        : (typeof idOrObj === 'string' ? idOrObj : (idOrObj?.id||''));
      if (String(leafOrFull).includes('/')) return leafOrFull; // already full
      const sel = s?.selections || {};
      if (!sel.subject || !sel.year) return leafOrFull;
      if (sel.subject === 'maths' && !sel.topic) return `year${sel.year}/maths/${leafOrFull}`;
      return `year${sel.year}/${sel.subject}/${sel.topic}/${leafOrFull}`;
    } catch {
      return (typeof idOrObj === 'string' ? idOrObj : (idOrObj?.id||''));
    }
  };
}
/* make a global var alias so plain calls work */
var toFullSlugForSelection = window.toFullSlugForSelection;
/* --- end guarded definition --- */
