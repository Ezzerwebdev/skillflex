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
  console.warn('renderChallengeHub() is deprecated; router now uses renderUnitsView instead.');
  return;
}

