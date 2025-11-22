import { enableNextWhenReady } from '../ui.js';
import { state } from '../../../core/state.js';
import { renderMediaBlocks } from '../media.js';
export function renderTrueFalse(step, host){
  if (!host) return;
  const wrap = document.createElement('div'); wrap.className = 'true-false';
  renderMediaBlocks(wrap, step);
  const grid = document.createElement('div'); grid.className = 'option-grid ai-options-grid';
  ['True ✅','False ❌'].forEach((label, i) => {
    const card=document.createElement('button'); card.className='option-card ai-option-card'; card.textContent=label;
    card.onclick=()=>{ if (state.answered) return; wrap.querySelectorAll('.ai-option-card').forEach(c=>c.classList.remove('selected')); card.classList.add('selected'); state.select=i; enableNextWhenReady(true); };
    grid.appendChild(card);
  });
  wrap.appendChild(grid); host.appendChild(wrap); enableNextWhenReady(false);
}
