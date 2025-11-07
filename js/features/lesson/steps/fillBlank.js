import { enableNextWhenReady } from '../ui.js';
import { state } from '../../../core/state.js';
export function renderFillBlank(step, host){
  const wrap = document.createElement('div'); wrap.className = 'fill-blank';
  const input = document.createElement('input');
  input.type = 'text'; input.className = 'text-input'; input.placeholder = 'Type your answer…';
  input.autocomplete = 'off'; input.spellcheck = true;
  input.addEventListener('input', () => { state.text = input.value; enableNextWhenReady(state.text.trim().length > 0); });
  wrap.appendChild(input); host.appendChild(wrap); enableNextWhenReady(false);
}
