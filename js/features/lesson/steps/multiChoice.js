// [2024-11-21] Added multiChoice step (single-answer MCQ) for AI/adaptive flows.
import { enableNextWhenReady } from '../ui.js';
import { state } from '../../../core/state.js';
import { renderMediaBlocks } from '../media.js';

export function renderMultiChoice(step, host) {
  if (!host) return;
  host.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = 'multi-choice ai-options-grid';
  renderMediaBlocks(wrap, step);

  const opts = Array.from(step.options || []);
  opts
    .map((opt) => (typeof opt === 'string' ? { text: opt } : opt))
    .sort(() => Math.random() - 0.5)
    .forEach((opt, idx) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'option-card ai-option-card';
      b.textContent = String(opt.text || '');
      b.onclick = () => {
        if (state.answered) return;
        wrap.querySelectorAll('.ai-option-card').forEach((c) => c.classList.remove('selected'));
        b.classList.add('selected');
        state.select = idx;
        enableNextWhenReady(true);
      };
      wrap.appendChild(b);
    });

  host.appendChild(wrap);
  enableNextWhenReady(false);
}

// Stub: multiSelect falls back to multiChoice behaviour for now.
export function renderMultiSelect(step, host) {
  return renderMultiChoice(step, host);
}
