/**
 * Minimal completion modal used by the lesson engine.
 * API: showCompletionModal(score, total, onContinue, extra?)
 * - extra.onSave?() is called by a secondary button when shown (guest save)
 */
export function showCompletionModal(score, total, onContinue, extra){
  // Reuse if already in DOM
  let overlay = document.getElementById('sfModalOverlay');
  if (!overlay){
    overlay = document.createElement('div');
    overlay.id = 'sfModalOverlay';
    overlay.style.cssText = `
      position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
      background:rgba(0,0,0,.5);z-index:9999;padding:16px;`;
    overlay.innerHTML = `
      <div id="sfModalCard" style="
        width:100%;max-width:480px;border-radius:16px;background:#fff;
        box-shadow:0 10px 30px rgba(0,0,0,.15);padding:20px;position:relative;">
        <button id="sfModalClose" aria-label="Close" style="
          position:absolute;top:8px;right:8px;border:0;background:transparent;
          font-size:22px;cursor:pointer;">×</button>
        <h2 style="margin:0 0 8px 0;font-size:1.25rem;">Great job! 🎉</h2>
        <p id="sfModalBody" style="margin:0 0 16px 0;color:#444;"></p>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button id="sfModalPrimary" style="
            padding:.6rem 1rem;border-radius:10px;border:0;background:#1d4ed8;color:#fff;cursor:pointer;">Continue</button>
          <button id="sfModalSave" style="
            display:none;padding:.6rem 1rem;border-radius:10px;border:1px solid #ddd;background:#fff;cursor:pointer;">Save my coins</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  }

  const body = overlay.querySelector('#sfModalBody');
  body.textContent = `You scored ${score}/${total}.`;

  const btnClose = overlay.querySelector('#sfModalClose');
  const btnPrimary = overlay.querySelector('#sfModalPrimary');
  const btnSave = overlay.querySelector('#sfModalSave');

  // wire
  const finish = () => { overlay.remove(); try{ onContinue && onContinue(); }catch{} };

  btnClose.onclick = finish;
  btnPrimary.onclick = finish;

  if (extra && typeof extra.onSave === 'function'){
    btnSave.style.display = 'inline-block';
    btnSave.onclick = async () => { try{ await extra.onSave(); } finally { finish(); } };
  } else {
    btnSave.style.display = 'none';
    btnSave.onclick = null;
  }

  overlay.style.display = 'flex';
}
