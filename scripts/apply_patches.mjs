import fs from 'node:fs';
import path from 'node:path';

const r = (p) => path.resolve(process.cwd(), p);

function upsertImportBlock(appJs) {
  const marker = `import './js/theme.js'`;
  const add = [
    `import { initProfileStore, nextMode } from './js/core/profile.js';`,
    `import { getTodayKey, calcStreak } from './js/core/streak.js';`,
    `import { awardCoins } from './js/core/coins.js';`,
    `import { maybeUnlockBadges } from './js/core/badges.js';`,
    `import { emitTelemetry } from './js/core/analytics.js';`,
    `import { getShopItems, purchaseItem } from './js/core/shop.js';`,
    `import { generateTimesTableSet } from './js/generators/timesTables.js';`,
    `import { generateComparativeSet } from './js/generators/englishComparatives.js';`,
    `import { generateTrueFalseSet } from './js/generators/trueFalse.js';`,
    `import { ensureModalHost, showSummaryModal, showShopModal } from './js/ui/modals.js';`,
  ].join('\n');

  if (appJs.includes(`import { initProfileStore, nextMode }`)) return appJs;
  const idx = appJs.indexOf(marker);
  if (idx === -1) return add + '\n' + appJs;
  const lineEnd = appJs.indexOf('\n', idx);
  return appJs.slice(0, lineEnd + 1) + add + '\n' + appJs.slice(lineEnd + 1);
}

function upsertConstants(appJs) {
  if (appJs.includes('DAILY_QUESTION_COUNT')) return appJs;
  const re = /const\s+DAILY_TARGET\s*=\s*[^;]+;[^\n]*\n/;
  const m = appJs.match(re);
  const block = `
const DAILY_QUESTION_COUNT = 10;
const QUESTION_FACTORIES = {
  maths: generateTimesTableSet,
  english: generateComparativeSet,
  literacy: generateTrueFalseSet
};
const profileStore = initProfileStore();
const dailySessionCache = new Map();
`;
  if (m) {
    const insertAt = m.index + m[0].length;
    return appJs.slice(0, insertAt) + block + appJs.slice(insertAt);
  }
  return block + appJs;
}

function addDOMContentLoaded(appJs) {
  const snippet = `
document.addEventListener('DOMContentLoaded', () => {
  try {
    ensureModalHost();
    hydrateProfileHeader(profileStore.get());
    profileStore.subscribe(hydrateProfileHeader);
    wireDailyCard();
    wireShopButton();
  } catch (e) { console.error(e); }
});
`;
  if (appJs.includes('wireDailyCard()') || appJs.includes('hydrateProfileHeader(')) return appJs;
  return appJs + '\n' + snippet;
}

function appendFunctions(appJs) {
  if (appJs.includes('function hydrateProfileHeader(')) return appJs; // assume all exist
  const fnBlock = `
// === Daily Challenge helpers (appended) ===
function hydrateProfileHeader(profile) {
  try {
    const coinsEl = document.querySelector('#coins');
    const streakEl = document.querySelector('#streak');
    if (coinsEl) coinsEl.textContent = \`🪙 \${profile?.coins ?? 0}\`;
    if (streakEl) streakEl.textContent = \`🔥 \${profile?.streak?.current ?? 0}\`;
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
  pill.textContent = completed ? \`\${completed}/\${DAILY_QUESTION_COUNT} today\` : 'New day unlocked';
}

function wireShopButton() {
  const shopBtn = document.getElementById('shop-button');
  if (!shopBtn) return;
  shopBtn.hidden = false;
  shopBtn.addEventListener('click', () => {
    const profile = profileStore.get();
    showShopModal({
      items: getShopItems(profile),
      coins: profile.coins,
      onPurchase: (id) => {
        const result = purchaseItem(profileStore, id);
        if (result?.ok) emitTelemetry('shop_purchase', { item: result.item.id });
        return result;
      }
    });
  });
}

async function startDailyChallenge() {
  const profile = profileStore.get();
  const tz = (typeof USER_TZ !== 'undefined' && USER_TZ) ? USER_TZ : (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const todayKey = getTodayKey(new Date(), tz);
  const mode = nextMode(profile.lastMode || 'english', profile.mastery || {});
  const cacheKey = \`\${todayKey}:\${mode}\`;
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
  const key = \`mode:\${mode}\`;
  const prev = mastery[key] || { correct: 0, wrong: 0, lastSeenISO: '' };
  return { ...mastery, [key]: { correct: prev.correct + results.correct, wrong: prev.wrong + results.wrong, lastSeenISO: new Date().toISOString() } };
}
`;
  return appJs + '\n' + fnBlock;
}

function patchAppJs() {
  const file = r('app.js');
  if (!fs.existsSync(file)) return { changed: false, reason: 'app.js not found' };
  let src = fs.readFileSync(file, 'utf8');
  const before = src;
  src = upsertImportBlock(src);
  src = upsertConstants(src);
  src = addDOMContentLoaded(src);
  src = appendFunctions(src);
  if (src !== before) {
    fs.writeFileSync(file, src);
    return { changed: true };
  }
  return { changed: false, reason: 'already patched' };
}

function patchUnitsJs() {
  const file = r('js/features/units.js');
  if (!fs.existsSync(file)) return { changed: false, reason: 'units.js not found' };
  let src = fs.readFileSync(file, 'utf8');
  const before = src;

  // Case 1: replace exact stub CURRICULUM = {};
  src = src.replace(/const\s+CURRICULUM\s*=\s*{}\s*;/, `const CURRICULUM = {
  'maths:tables:core': {
    title: 'Times Tables Sprint',
    emoji: '✖️',
    units: [
      {
        id: 'tables-basics',
        title: 'Build the Basics',
        emoji: '🌱',
        lessons: [
          { id: 'tables-2-5', title: '2–5 Warm-Up', generator: 'tables', tables: [2,3,4,5] },
          { id: 'tables-6-8', title: '6–8 Boosters', generator: 'tables', tables: [6,7,8] }
        ]
      },
      {
        id: 'tables-pro',
        title: 'Speed Masters',
        emoji: '⚡️',
        lessons: [
          { id: 'tables-9-12', title: '9–12 Showdown', generator: 'tables', tables: [9,10,11,12] },
          { id: 'tables-mixed', title: 'Mixed Lightning', generator: 'tables', tables: [2,3,4,5,6,7,8,9,10,11,12] }
        ]
      }
    ]
  }
};`);

  // Always ensure meta accessor exists
  if (!/sfTimesTablesMeta/.test(src)) {
    src += `
(window.sfTimesTablesMeta ||= {
  getPlanForTables: () => (typeof CURRICULUM !== 'undefined' && CURRICULUM['maths:tables:core']) ? CURRICULUM['maths:tables:core'] : ({
    id: 'maths:tables:core',
    title: 'Times Tables Sprint',
    emoji: '✖️',
    units: [
      { id: 'tables-basics', title: 'Build the Basics', emoji: '🌱', lessons: [
        { id: 'tables-2-5', title: '2–5 Warm-Up', generator: 'tables', tables: [2,3,4,5] },
        { id: 'tables-6-8', title: '6–8 Boosters', generator: 'tables', tables: [6,7,8] }
      ]},
      { id: 'tables-pro', title: 'Speed Masters', emoji: '⚡️', lessons: [
        { id: 'tables-9-12', title: '9–12 Showdown', generator: 'tables', tables: [9,10,11,12] },
        { id: 'tables-mixed', title: 'Mixed Lightning', generator: 'tables', tables: [2,3,4,5,6,7,8,9,10,11,12] }
      ]}
    ]
  })
});
`;
  }

  if (src !== before) {
    fs.writeFileSync(file, src);
    return { changed: true };
  }
  return { changed: false, reason: 'no changes applied' };
}

const appRes = patchAppJs();
const unitsRes = patchUnitsJs();

console.log(JSON.stringify({ appJs: appRes, unitsJs: unitsRes }, null, 2));
