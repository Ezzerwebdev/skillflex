import { enableNextWhenReady } from '../ui.js';
import { state } from '../../../core/state.js';
import { renderMediaBlocks } from '../media.js';
export function renderFillBlank(step, host){
  if (!host) return;
  const wrap = document.createElement('div'); wrap.className = 'fill-blank';
  renderMediaBlocks(wrap, step);
  const answer = document.createElement('div');
  answer.className = 'ai-answer-card';
  const input = document.createElement('input');
  input.type = 'text'; input.className = 'text-input'; input.placeholder = 'Type your answer…';
  input.autocomplete = 'off'; input.spellcheck = true;
  input.addEventListener('input', () => { state.text = input.value; enableNextWhenReady(state.text.trim().length > 0); });
  answer.appendChild(input);
  wrap.appendChild(answer);
  host.appendChild(wrap); enableNextWhenReady(false);
}
