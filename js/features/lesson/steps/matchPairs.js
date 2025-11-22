import { state } from '../../../core/state.js';
import { enableNextWhenReady } from '../ui.js';
import { renderMediaBlocks } from '../media.js';
export function renderMatchPairs(step, host){
  const PAIRS_NEXT_MODE = 'complete';
  const basePairs = Array.isArray(step?.pairs) ? step.pairs : [];
  if (!basePairs.length) { try { enableNextWhenReady(false); } catch {} ; return; }
  const wrap = document.createElement('div'); wrap.className = 'match-pairs';
  renderMediaBlocks(wrap, step);

  const leftCol  = document.createElement('div'); const rightCol = document.createElement('div');
  leftCol.className  = 'match-col left'; rightCol.className = 'match-col right';
  const leftLabel  = document.createElement('h3'); const rightLabel = document.createElement('h3');
  leftLabel.className  = 'col-label'; rightLabel.className = 'col-label';
  leftLabel.textContent  = step.leftLabel  || 'Prefixes'; rightLabel.textContent = step.rightLabel || 'Base words';
  leftCol.appendChild(leftLabel); rightCol.appendChild(rightLabel);
  const leftItems  = basePairs.map((p, i) => ({ id: `L${i}`, text: String(p.left)  }));
  const rightItems = basePairs.map((p, i) => ({ id: `R${i}`, text: String(p.right) }));
  const fy = (a)=>{ const x=[...a]; for(let i=x.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [x[i],x[j]]=[x[j],x[i]]; } return x; };
  const L = fy(leftItems); const R = fy(rightItems);
  const leftBtns  = new Map(); const rightBtns = new Map();
  const leftToRight = new Map(); const rightToLeft = new Map(); let pendingLeftId = null;
  const status = document.createElement('div'); status.className = 'match-status';
  const actions = document.createElement('div'); actions.className = 'match-actions';
  const btnReset = document.createElement('button'); btnReset.className='link-reset'; btnReset.type='button'; btnReset.textContent='Reset pairs';
  const hardReset = () => { leftToRight.clear(); rightToLeft.clear(); pendingLeftId = null; updateStatePairs(); refreshUI(); };
  btnReset.onclick = hardReset; actions.appendChild(btnReset); state._resetMatchPairs = hardReset;
  const safeEnable = (b) => { try { enableNextWhenReady(!!b); } catch {} };
  function makeBtn(text, onClick){ const b=document.createElement('button'); b.type='button'; b.className='option-card ai-option-card'; b.textContent=text; b.addEventListener('click', onClick, { passive:true }); b.setAttribute('aria-pressed','false'); return b; }
  function updateStatePairs(){ state.pairs = Array.from(leftToRight.entries()).map(([lid, rid]) => { const l = leftItems.find(x => x.id === lid); const r = rightItems.find(x => x.id === rid); return (l && r) ? { left: l.text, right: r.text } : null; }).filter(Boolean); }
  function readyToProceed(){ return (PAIRS_NEXT_MODE === 'any') ? leftToRight.size > 0 : (leftToRight.size === leftItems.length && leftItems.length > 0); }
  function refreshUI(){
    leftBtns.forEach((btn, id) => { const sel = pendingLeftId === id; const chosen = leftToRight.has(id); btn.classList.toggle('sel', sel); btn.classList.toggle('chosen', chosen); btn.setAttribute('aria-pressed', String(sel || chosen)); });
    rightBtns.forEach((btn, id) => { const chosen = rightToLeft.has(id); btn.classList.toggle('chosen', chosen); btn.setAttribute('aria-pressed', String(chosen)); });
    const matched = leftToRight.size, total = leftItems.length; status.innerHTML = `${matched}/${total} matched` + (pendingLeftId ? `<span class="hint"> — pick a base word</span>` : ''); safeEnable(readyToProceed());
  }
  function unpairLeft(lid){ if (!leftToRight.has(lid)) return; const rid = leftToRight.get(lid); leftToRight.delete(lid); rightToLeft.delete(rid); }
  function unpairRight(rid){ if (!rightToLeft.has(rid)) return; const lid = rightToLeft.get(rid); rightToLeft.delete(rid); leftToRight.delete(lid); }
  function selectLeft(lid){ if (state.answered) return; pendingLeftId = (pendingLeftId === lid) ? null : lid; refreshUI(); }
  function pairWithRight(rid){ if (state.answered || !pendingLeftId) return; const lid = pendingLeftId; unpairLeft(lid); unpairRight(rid); leftToRight.set(lid, rid); rightToLeft.set(rid, lid); pendingLeftId = null; updateStatePairs(); refreshUI(); }
  L.forEach(item => { const b = makeBtn(item.text, () => selectLeft(item.id)); leftBtns.set(item.id, b); leftCol.appendChild(b); });
  R.forEach(item => { const b = makeBtn(item.text, () => pairWithRight(item.id)); rightBtns.set(item.id, b); rightCol.appendChild(b); });
  wrap.appendChild(status); wrap.appendChild(actions); wrap.appendChild(leftCol); wrap.appendChild(rightCol); host.appendChild(wrap);
  state.pairs = []; refreshUI();
}
