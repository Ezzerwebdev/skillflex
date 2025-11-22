// js/generators/timesTables.js
import { createRng } from './prng.js';

const DEFAULT_TABLES = [2,3,4,5,6,7,8,9,10,11,12];

export function genTimesTableQuestion(seed, tables = DEFAULT_TABLES) {
  const rand = createRng(String(seed));
  const a = tables[Math.floor(rand() * tables.length)];
  const b = 2 + Math.floor(rand() * 11);
  const answer = a * b;
  const options = new Set([answer]);
  while (options.size < 4) {
    const delta = Math.floor(rand() * 9) - 4;
    const guess = Math.max(1, answer + delta * a);
    options.add(guess);
  }
  const choices = shuffle([...options], rand);
  return {
    id: `tables-${a}x${b}`,
    type: 'select_option',
    prompt: `What is ${a} × ${b}?`,
    choices: choices.map((n) => String(n)),
    answerIndex: choices.indexOf(answer)
  };
}

export function generateTimesTableSet({ seed, count = 10, mastery = {}, tables = DEFAULT_TABLES }) {
  const questions = [];
  const seen = new Set();
  const plan = pickTables(tables, mastery, count);
  for (let i = 0; i < count; i++) {
    const table = plan[i % plan.length];
    let question = genTimesTableQuestion(`${seed}-${i}-${table}`, [table]);
    let guard = 0;
    while (seen.has(question.id) && guard < 5) {
      question = genTimesTableQuestion(`${seed}-${i}-${table}-${guard}`, tables);
      guard++;
    }
    seen.add(question.id);
    questions.push(question);
  }
  return { questions };
}

function pickTables(tables, mastery, count) {
  const stats = tables.map((table) => {
    const record = mastery[`table:${table}`] || {};
    const attempts = (record.correct || 0) + (record.wrong || 0);
    const accuracy = attempts ? record.correct / attempts : 0;
    return { table, priority: 1 - accuracy };
  }).sort((a, b) => b.priority - a.priority);
  if (!stats.length) return tables.slice();
  const out = [];
  const src = stats.length ? stats : tables.map((table) => ({ table }));
  while (out.length < count) out.push(src[out.length % src.length].table);
  return out;
}

function shuffle(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
