import { state } from '../core/state.js';
import { updateLoginButton } from '../core/auth.js';

let allActivities = [];

async function loadActivities(){
  if (allActivities.length === 0) {
    const r = await fetch('/custom_activities.json');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    allActivities = await r.json();
  }
}

function saveSelections(){ sessionStorage.setItem('sf_selections', JSON.stringify(state.selections)); }

function setHomeInfoVisible(show){
  document.querySelectorAll('.home-hero, .grownups.section, .trust-strip')
    .forEach(el => { if (el) el.hidden = !show; });
}

function simpleHash(str){
  let hash=0; if(!str) return hash;
  for (let i=0;i<str.length;i++){ const ch=str.charCodeAt(i); hash=((hash<<5)-hash)+ch; hash|=0; }
  return hash;
}

function shuffleArrayCrypto(arr){
  const a=[...arr];
  for (let i=a.length-1;i>0;i--){ const u=new Uint32Array(1);
    crypto.getRandomValues(u);
    const j=Math.floor((u[0]/2**32)*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function renderSelectionStep(step){
  const hubContainer = document.querySelector('#challengeHubContainer'); if (!hubContainer) return;

  let title, options, gridClass='selection-grid';
  switch(step){
    case 'subject':
      title='Pick Your Adventure!'; gridClass='selection-grid subject-grid';
      options={ english:{ label:'Word & Story Lab', emoji:'📖' }, maths:{ label:'Number Quest', emoji:'🔢' } };
      break;
    case 'year':
      title='Pick Your Class!';
      options={ '3':'🎒 Year 3 Explorers','4':'🗺️ Year 4 Adventurers','5':'🏆 Year 5 Champions','6':'🚀 Year 6 Trailblazers (Coming Soon!)' };
      break;
    case 'topic':
      title='Pick a quest!';
      if (state.selections.subject==='english') options={ 'spelling':'✍️ Spelling Wizards','grammar':'📚 Grammar Heroes' };
      else options={ 'addition':'➕ Adding Adventurers','subtraction':'➖ Subtraction Squad','place-value':'🧭 Place Value Pals','number-line':'📏 Number Line Hoppers','thousands':'⛰️ Thousand Trekkers','shapes':'🔺 Shape Explorers','roman-numerals':'🏛️ Roman Numeral Rangers' };
      break;
  }

  let backButtonHTML='';
  if (step !== 'subject') backButtonHTML = `<button id="backBtn" class="btn btn-back">← Go Back</button>`;

  const gridContent = Object.entries(options).map(([key, value]) => {
    if (step === 'subject') {
      return `<button class="selection-card large-card" data-key="${key}" type="button" aria-label="${value.label}">
        <span class="selection-card-title" data-emoji="${value.emoji}">${value.label}</span>
      </button>`;
    }
    const isComingSoon = typeof value === 'string' && value.includes('Coming Soon');
    return `<button class="selection-card ${isComingSoon ? 'disabled' : ''}" data-key="${key}">${value}</button>`;
  }).join('');

  hubContainer.innerHTML = `
    <div class="selection-step">
      <div class="selection-step-header">${backButtonHTML}<h1>${title}</h1></div>
      <div class="${gridClass}">${gridContent}</div>
    </div>`;

  const backBtn=document.getElementById('backBtn');
  if (backBtn) backBtn.onclick = () => {
    if (step==='year') delete state.selections.subject;
    if (step==='topic') delete state.selections.year;
    saveSelections(); renderChallengeHub();
  };

  hubContainer.querySelectorAll('.selection-card').forEach(card => {
    card.onclick = () => {
      if (card.classList.contains('disabled')) return;
      state.selections[step] = card.dataset.key;
      saveSelections(); renderChallengeHub();
    };
  });

  setHomeInfoVisible(step === 'subject');
}

export async function renderChallengeHub(){
  const hubContainer = document.querySelector('#challengeHubContainer');
  if (!hubContainer) { console.warn('#challengeHubContainer missing'); return; }

  try {
    const sessionSelections = sessionStorage.getItem('sf_selections');
    state.selections = sessionSelections ? JSON.parse(sessionSelections) : {};
  } catch { state.selections = {}; }

  const { subject, year, topic } = state.selections || {};
  if (!subject) return renderSelectionStep('subject');
  if (!year)    return renderSelectionStep('year');
  if (!topic)   return renderSelectionStep('topic');

  await loadActivities();
  setHomeInfoVisible(false);

  hubContainer.setAttribute('aria-busy', 'true');
  hubContainer.innerHTML = `
    <div class="activity-list-header"><h2>Today's Challenges</h2></div>
    <div class="activity-grid"><div class="skel"></div><div class="skel"></div><div class="skel"></div></div>`;

  const potential = allActivities.filter(a => a.subject == subject && a.year == year && a.topic == topic);

  if (potential.length === 0) {
    hubContainer.innerHTML = `
      <div class="activity-list-header">
        <h2>Today's Challenges</h2>
        <button id="changeSelectionsBtn" class="btn btn-change">Change Selection</button>
      </div>
      <div class="activity-grid"><p>No activities found for these selections. More are coming soon!</p></div>`;
    const changeBtn = document.querySelector('#changeSelectionsBtn');
    if (changeBtn) changeBtn.onclick = () => { state.selections = {}; saveSelections(); renderChallengeHub(); };
    return;
  }

  const grid = document.createElement('div'); grid.className = 'activity-grid';
  function renderCards(list){
    grid.innerHTML = list.map(act => {
      const done = state.completedToday.includes(act.id);
      const title = (act.title || '').replace(/-/g, '\u2011');
      return `<a href="/lesson/${act.id}" class="activity-card ${done ? 'completed' : ''}" data-link>
        <div class="activity-icon">${done ? '✅' : act.icon}</div>
        <div class="activity-title">${title}</div>
      </a>`;
    }).join('');
  }

  const header = document.createElement('div');
  header.className = 'activity-list-header';
  header.innerHTML = `
    <h2 id="dailyTitle">Today's Challenges</h2>
    <div>
      <button id="shuffleBtn" class="btn btn-change" title="Shuffle now" aria-label="Shuffle challenges">🔀 Shuffle</button>
      <button id="changeSelectionsBtn" class="btn btn-change">Change Selection</button>
    </div>`;

  const container = document.createElement('div');
  container.appendChild(header); container.appendChild(grid);
  hubContainer.innerHTML=''; hubContainer.appendChild(container);

  const remixKey = 'sf_remix_mode';
  const remixUntil = Number(sessionStorage.getItem(remixKey) || 0);
  let currentList;

  if (remixUntil > Date.now()) {
    currentList = shuffleArrayCrypto(potential).slice(0,3);
    const titleEl=document.querySelector('#dailyTitle'); if (titleEl) titleEl.textContent = 'Remixed Challenges';
  } else {
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const seed = dayOfYear + simpleHash(subject + year + topic);
    const dailyShuffled = [...potential].sort((a, b) => simpleHash(a.id + seed) - simpleHash(b.id + seed));
    currentList = dailyShuffled.slice(0, 3);
  }

  renderCards(currentList);

  const changeBtn = document.querySelector('#changeSelectionsBtn');
  if (changeBtn) changeBtn.onclick = () => {
    const { subject, year, topic } = state.selections || {};
    if (topic) delete state.selections.topic;
    else if (year) delete state.selections.year;
    else delete state.selections.subject;
    saveSelections(); renderChallengeHub();
  };

  const shuffleBtn = document.querySelector('#shuffleBtn');
  if (shuffleBtn && window.innerWidth <= 420) shuffleBtn.classList.add('fab');
  if (shuffleBtn) shuffleBtn.onclick = () => {
    const reshuffled = shuffleArrayCrypto(potential).slice(0, 3);
    renderCards(reshuffled);
    const titleEl = document.querySelector('#dailyTitle'); if (titleEl) titleEl.textContent = 'Remixed Challenges';
    sessionStorage.setItem(remixKey, String(Date.now() + 20 * 60 * 1000));
    const live = document.createElement('div'); live.setAttribute('aria-live', 'polite'); live.className = 'sr-only';
    live.textContent = 'Challenges reshuffled'; hubContainer.appendChild(live); setTimeout(() => live.remove(), 500);
  };

  updateLoginButton();
}
