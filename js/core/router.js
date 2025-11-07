import { renderLesson } from '../features/lesson/index.js';
import { renderChallengeHub } from '../features/activities.js';

export function router(){
  const app = document.querySelector('#app'); if (!app) return;
  const path = location.pathname;
  if (/^\/lesson\//.test(path)) {
    document.body.classList.add('in-lesson'); app.classList.add('lesson-active');
    const lessonPath = path.substring('/lesson/'.length); return renderLesson(lessonPath);
  }
  document.body.classList.remove('in-lesson'); app.classList.remove('lesson-active');
  const homeTpl = document.getElementById('homeTpl');
  if (homeTpl) { app.innerHTML = homeTpl.innerHTML; renderChallengeHub(); }
  else { app.innerHTML = '<div class="error-container"><h2>Error</h2><p>Home template missing.</p></div>'; }
}
export function goHome(){ history.pushState({}, '', '/'); router(); }
