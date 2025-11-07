import { enableNextWhenReady } from '../ui.js';
import { state } from '../../../core/state.js';
export function renderTrueFalse(step, host){
  const wrap = document.createElement('div'); wrap.className = 'true-false';
  const grid = document.createElement('div'); grid.className = 'option-grid';
  ['True ✅','False ❌'].forEach((label, i) => {
    const card=document.createElement('button'); card.className='option-card'; card.textContent=label;
    card.onclick=()=>{ if (state.answered) return; document.querySelectorAll('.option-card').forEach(c=>c.classList.remove('sel')); card.classList.add('sel'); state.select=i; enableNextWhenReady(true); };
    grid.appendChild(card);
  });
  wrap.appendChild(grid); host.appendChild(wrap); enableNextWhenReady(false);
}
