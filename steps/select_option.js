// steps/select_option.js — multiple choice
import { registerStepType } from './index.js';


function render(step, host, state) {
const grid = document.createElement('div');
grid.className = 'option-grid';


step.options.forEach((opt, i) => {
const card = document.createElement('button');
card.className = 'option-card';


if (opt.image) {
const img = document.createElement('img');
img.className = 'thumb';
img.src = opt.image;
card.appendChild(img);
}


const text = document.createElement('span');
text.className = 'option-text';
text.textContent = opt.text;
card.appendChild(text);


card.onclick = () => {
if (state.answered) return;
host.querySelectorAll('.option-card').forEach(c => c.classList.remove('sel'));
card.classList.add('sel');
state.select = i;
const n = document.querySelector('#btnNext');
if (n) n.disabled = false;
};


grid.appendChild(card);
});


host.appendChild(grid);
}


function check(step, state) {
return state.select === step.answer;
}


function reset(step, state) {
state.select = null;
}


registerStepType('select_option', { render, check, reset });