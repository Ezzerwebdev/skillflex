// js/core/badges.js
const BADGE_RULES = [
  { id: 'streak-3', label: '3-Day Spark', check: (profile) => profile.streak?.current >= 3 },
  { id: 'perfect-10', label: 'Perfect 10', check: (_profile, session) => session.correct === 10 && session.wrong === 0 },
  { id: 'tables-ace', label: 'Multiplication Ninja', check: (_profile, session) => session.mode === 'maths' && session.correct >= 8 },
  { id: 'shopper', label: 'Shop Starter', check: (profile) => (profile.purchases || []).length >= 1 }
];

export function maybeUnlockBadges(profile, session) {
  const owned = new Set(profile.badges || []);
  const unlocked = [];
  const badges = [];
  for (const rule of BADGE_RULES) {
    if (owned.has(rule.id)) continue;
    if (rule.check(profile, session)) {
      owned.add(rule.id);
      unlocked.push(rule.id);
      badges.push({ id: rule.id, label: rule.label });
    }
  }
  return { unlocked, badges };
}
