// js/features/lesson/index.js
const $ = (s) => document.querySelector(s);

// UI helpers
function enableNextWhenReady(ready) {
  const b = $('#btnNext');
  if (b) b.disabled = !ready;
}

function createOptionGrid(options = [], onSelect) {
  const grid = document.createElement('div');
  grid.className = 'option-grid';
  (options || []).forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option-card';

    if (opt.image) {
      const img = document.createElement('img');
      img.className = 'thumb';
      img.src = opt.image;
      btn.appendChild(img);
    }

    const span = document.createElement('span');
    span.className = 'option-text';
    span.textContent = String(opt.text ?? '');
    btn.appendChild(span);

    btn.onclick = () => onSelect(i, btn);
    grid.appendChild(btn);
  });
  return grid;
}

// Renders a single step. All flow (checking, coins, advance) remains in app.js.
export function renderStep(step, host) {
  const state = window.state;                      // <-- single shared state
  if (!host || !step || !state) return;

  host.innerHTML = '';

  if (step.prompt) {
    const p = document.createElement('p');
    p.textContent = step.prompt;
    host.appendChild(p);
  }

  // Multiple choice
  if (step.type === 'select_option') {
    const handle = (index, card) => {
      if (state.answered) return;
      host.querySelectorAll('.option-card').forEach(c => c.classList.remove('sel'));
      card.classList.add('sel');
      state.select = index;
      enableNextWhenReady(true);
    };
    host.appendChild(createOptionGrid(step.options || [], handle));
    enableNextWhenReady(false);
    return;
  }

  // Delegate other step types to global renderers provided by app.js
  if (step.type === 'fill_blank'  && typeof window.renderFillBlank  === 'function') { window.renderFillBlank(step, host);  return; }
  if (step.type === 'match_pairs' && typeof window.renderMatchPairs === 'function') { window.renderMatchPairs(step, host); return; }
  if (step.type === 'sort_items'  && typeof window.renderSortItems  === 'function') { window.renderSortItems(step, host);  return; }
  if (step.type === 'true_false'  && typeof window.renderTrueFalse  === 'function') { window.renderTrueFalse(step, host);  return; }
}
