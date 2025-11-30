// renderLesson is defined in app.js and exposed on window
import { renderUnitsView } from '../features/units.js';
export function router() {
  const app = document.querySelector('#app');
  if (!app) return;

  const path = location.pathname;

  // ---------- Lesson route ----------
  if (/^\/lesson\//.test(path)) {
    document.body.classList.add('in-lesson');
    app.classList.add('lesson-active');

    const lessonPath = path.substring('/lesson/'.length);

    if (typeof window.renderLesson === 'function') {
      return window.renderLesson(lessonPath);
    }

    console.error('[router] window.renderLesson is not available');
    app.innerHTML = `
      <div class="error-container">
        <h2>Error</h2>
        <p>Lesson view is not available. Please refresh the page.</p>
      </div>
    `;
    return;
  }

  // ---------- Home / non-lesson routes ----------
  document.body.classList.remove('in-lesson');
  app.classList.remove('lesson-active');

  const homeTpl = document.getElementById('homeTpl');
  if (homeTpl) { 
    app.innerHTML = homeTpl.innerHTML; 
    // ⬇️ Use the new AI units view inside the hub container
    const hub = document.querySelector('#challengeHubContainer');
    if (hub) renderUnitsView(hub);
  } else {
    app.innerHTML = `
      <div class="error-container">
        <h2>Error</h2>
        <p>Home template missing.</p>
      </div>
    `;
  }
}

export function goHome() {
  history.pushState({}, '', '/');
  router();
}
