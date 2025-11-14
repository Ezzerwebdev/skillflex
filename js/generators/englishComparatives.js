// js/generators/englishComparatives.js
import { createRng } from './prng.js';

const WORDS = [
  ['happy', 'happier'],
  ['bright', 'brighter'],
  ['silly', 'sillier'],
  ['brave', 'braver'],
  ['cozy', 'cozier'],
  ['funny', 'funnier']
];

export function generateComparativeSet({ seed, count = 10 }) {
  const rand = createRng(seed);
  const questions = [];
  for (let i = 0; i < count; i++) {
    const pair = WORDS[i % WORDS.length];
    const prompt = `Choose the comparative for "${pair[0]}"`;
    const distractor = `${pair[0]}er`;
    const choices = shuffle([pair[1], distractor], rand);
    questions.push({
      id: `eng-${pair[0]}-${i}`,
      type: 'select_option',
      prompt,
      choices,
      answerIndex: choices.indexOf(pair[1])
    });
  }
  return { questions };
}

function shuffle(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
