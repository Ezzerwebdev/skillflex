// tests/core.test.js
import assert from 'node:assert/strict';
import { calcStreak } from '../js/core/streak.js';
import { awardCoins } from '../js/core/coins.js';
import { maybeUnlockBadges } from '../js/core/badges.js';
import { genTimesTableQuestion, generateTimesTableSet } from '../js/generators/timesTables.js';

(function testStreakIncrement() {
  const start = new Date('2024-01-01T10:00:00Z').toISOString();
  const next = new Date('2024-01-02T10:00:00Z').toISOString();
  const res = calcStreak(start, next, 2, 0);
  assert.equal(res.current, 3);
  assert.equal(res.delta, 1);
})();

(function testStreakFreeze() {
  const start = new Date('2024-01-01T10:00:00Z').toISOString();
  const skip = new Date('2024-01-04T10:00:00Z').toISOString();
  const res = calcStreak(start, skip, 5, 1);
  assert.equal(res.current, 5);
  assert.equal(res.freezeTokens, 0);
  assert.ok(res.freezeUsed);
})();

(function testStreakReset() {
  const start = new Date('2024-01-01T10:00:00Z').toISOString();
  const skip = new Date('2024-01-05T10:00:00Z').toISOString();
  const res = calcStreak(start, skip, 4, 0);
  assert.equal(res.current, 0);
  assert(res.reset);
})();

(function testAwardCoins() {
  const award = awardCoins({ base: 10, correctStreak: 9, firstSession: true, difficulty: 'hard' });
  assert(award.total >= 10);
  assert.equal(typeof award.breakdown, 'object');
})();

(function testTimesTablesDeterministic() {
  const q1 = genTimesTableQuestion('seed123', [2]);
  const q2 = genTimesTableQuestion('seed123', [2]);
  assert.deepEqual(q1, q2);
})();

(function testTimesTablesUnique() {
  const set = generateTimesTableSet({ seed: 'today', count: 8 });
  const ids = new Set(set.questions.map((q) => q.id));
  assert.equal(ids.size, set.questions.length);
})();

(function testBadges() {
  const profile = { streak: { current: 3 }, badges: [] };
  const session = { correct: 10, wrong: 0, mode: 'maths' };
  const res = maybeUnlockBadges(profile, session);
  assert(res.unlocked.includes('streak-3'));
  assert(res.unlocked.includes('perfect-10'));
})();

console.log('core tests passed');
