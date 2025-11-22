// js/ui/modals.js
export function ensureModalHost() {
  if (!document.getElementById('modal-host')) {
    const host = document.createElement('div');
    host.id = 'modal-host';
    document.body.appendChild(host);
  }
}

export function showShopModal({ items, coins, onPurchase }) {
  ensureModalHost();
  const host = document.getElementById('modal-host');
  host.innerHTML = `
    <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="shop-title">
      <div class="modal-content shop" tabindex="-1">
        <button class="modal-close" aria-label="Close shop">×</button>
        <h2 id="shop-title">Shop · ${coins} coins</h2>
        <div class="shop-grid"></div>
      </div>
    </div>`;
  const grid = host.querySelector('.shop-grid');
  items.forEach((item) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'shop-item btn';
    btn.dataset.id = item.id;
    btn.disabled = item.owned || !item.affordable;
    btn.setAttribute('aria-pressed', String(item.owned));
    btn.textContent = `${item.emoji} ${item.label} — ${item.cost}`;
    btn.addEventListener('click', () => {
      const res = onPurchase(item.id);
      if (res?.ok) {
        btn.disabled = true;
        btn.setAttribute('aria-pressed', 'true');
      }
    });
    grid.appendChild(btn);
  });
  host.querySelector('.modal-close').addEventListener('click', () => host.replaceChildren());
  trapFocus(host.querySelector('.modal-content'));
}

export function showSummaryModal({ results, coinsAward, streakCalc, badgeResult }) {
  ensureModalHost();
  const host = document.getElementById('modal-host');
  const badgeHtml = badgeResult.badges.map((b) => `<span class="pill">${b.label}</span>`).join('');
  host.innerHTML = `
    <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="summary-title">
      <div class="modal-content" tabindex="-1">
        <button class="modal-close" aria-label="Close summary">×</button>
        <h2 id="summary-title">Great work!</h2>
        <p>You answered ${results.correct}/${results.correct + results.wrong} correctly and earned ${coinsAward.total} coins.</p>
        <p>Streak: ${streakCalc.current} (${streakCalc.delta >= 0 ? '+' : ''}${streakCalc.delta})</p>
        <div class="badge-row">${badgeHtml}</div>
        <button id="summary-primary" class="btn btn-primary">Practice weak spots</button>
      </div>
    </div>`;
  host.querySelector('.modal-close').addEventListener('click', () => host.replaceChildren());
  host.querySelector('#summary-primary').addEventListener('click', () => host.replaceChildren());
  trapFocus(host.querySelector('.modal-content'));
}

function trapFocus(modal) {
  const focusable = () => Array.from(modal.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])'));
  function onKey(e) {
    if (e.key !== 'Tab') return;
    const nodes = focusable();
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  modal.addEventListener('keydown', onKey);
  requestAnimationFrame(() => focusable()[0]?.focus());
}
