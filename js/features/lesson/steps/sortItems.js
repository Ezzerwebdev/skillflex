import { enableNextWhenReady } from '../ui.js';
import { state } from '../../../core/state.js';
import { renderMediaBlocks } from '../media.js';
export function renderSortItems(step, host){
  if (!host) return;
  const wrap = document.createElement('div'); wrap.className = 'sort-items';
  renderMediaBlocks(wrap, step);
  const bank = document.createElement('div'); const out  = document.createElement('div'); const hint = document.createElement('div');
  bank.className = 'option-grid word-bank'; out.className  = 'option-grid sentence-builder'; hint.className = 'builder-hint'; hint.textContent = 'Tap items to build the order. Tap again to remove.';
  const bankButtons = []; state.order = [];
  function sync(){ state.order = Array.from(out.querySelectorAll('.option-card.word-card.chosen')).map(el => el.textContent); enableNextWhenReady(step.answer && state.order.length === step.answer.length); }
  (step.items || []).forEach((it, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'option-card ai-option-card word-card'; b.textContent = String(it);
    b.onclick = () => { if (state.answered || b.disabled) return; const c = document.createElement('button'); c.type = 'button'; c.className = 'option-card word-card chosen'; c.textContent = String(it); c.dataset.srcIndex = String(i); c.onclick = () => { if (state.answered) return; out.removeChild(c); const src = bankButtons[Number(c.dataset.srcIndex)]; if (src) src.disabled = false; sync(); }; out.appendChild(c); b.disabled = true; sync(); };
    bankButtons[i] = b; bank.appendChild(b);
  });
  wrap.appendChild(hint); wrap.appendChild(out); wrap.appendChild(bank); host.appendChild(wrap); enableNextWhenReady(false);
}
