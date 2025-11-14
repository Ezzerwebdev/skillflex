// js/generators/trueFalse.js
import { createRng } from './prng.js';

const FACTS = [
  { text: 'An adjective describes a noun.', answer: true },
  { text: 'Twelve is an odd number.', answer: false },
  { text: 'The sun rises in the east.', answer: true },
  { text: 'Bats are birds.', answer: false }
];

export function generateTrueFalseSet({ seed, count = 10 }) {
  const rand = createRng(seed);
  const questions = [];
  for (let i = 0; i < count; i++) {
    const fact = FACTS[i % FACTS.length];
    const order = rand() > 0.5 ? ['True', 'False'] : ['False', 'True'];
    const answerIndex = order.indexOf(fact.answer ? 'True' : 'False');
    questions.push({
      id: `tf-${i}`,
      type: 'true_false',
      prompt: fact.text,
      choices: order,
      answerIndex
    });
  }
  return { questions };
}
