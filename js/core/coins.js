// js/core/coins.js
const DIFFICULTY_MULTIPLIERS = { easy: 0.75, auto: 1, normal: 1, hard: 1.25 };

export function awardCoins({ base = 5, correctStreak = 0, firstSession = false, difficulty = 'auto' }) {
  const streakBonus = Math.max(0, correctStreak - 3) * 2;
  const diffMult = DIFFICULTY_MULTIPLIERS[difficulty] ?? 1;
  const diffBonus = Math.round(base * (diffMult - 1));
  const firstBonus = firstSession ? 5 : 0;
  const total = Math.max(1, Math.round(base + streakBonus + diffBonus + firstBonus));
  return { total, breakdown: { base, streakBonus, difficultyBonus: diffBonus, firstSessionBonus: firstBonus } };
}
