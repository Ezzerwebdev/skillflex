// steps/order_words.js — tap tokens to build the sentence
import { registerStepType } from './index.js';


function render(step, host, state) {
// stable ids handle duplicate words
state._orderTokens = step.words.map((text, i) => ({ id: `${step.id}-${i}`, text }));
state.orderIds = [];


const wrapper = document.createElement('div');
wrapper.className = 'order-builder';
const output = document.createElement('div'); output.className = 'order-output';
const pool = document.createElement('div'); pool.className = 'order-pool';
wrapper.append(output, pool);


const shuffled = [...state._orderTokens].sort(() => Math.random() - 0.5);


function setNextDisabled() {
const n = document.querySelector('#btnNext');
if (n) n.disabled = (state.orderIds.length !== state._orderTokens.length);
}


function redraw(){
output.innerHTML = '';
pool.innerHTML = '';


if (state.orderIds.length === 0) {
const hint = document.createElement('div');
hint.className = 'order-hint';
hint.textContent = 'Tap the words in order';
output.appendChild(hint);
}


// placed chips
state.orderIds.forEach((id, idx) => {
const tok = state._orderTokens.find(t => t.id === id);
const b = document.createElement('button');
b.type = 'button';
b.className = 'order-chip placed';
b.textContent = tok.text;
b.title = 'Remove';
b.onclick = () => { state.orderIds.splice(idx, 1); setNextDisabled(); redraw(); };
output.appendChild(b);
});


// pool chips
shuffled.forEach(tok => {
if (state.orderIds.includes(tok.id)) return;
const b = document.createElement('button');
b.type = 'button';
b.className = 'order-chip';
b.textContent = tok.text;
b.onclick = () => { state.orderIds.push(tok.id); setNextDisabled(); redraw(); };
pool.appendChild(b);
});
}


setNextDisabled();
redraw();
host.appendChild(wrapper);
}


function check(step, state) {
const ordered = state.orderIds.map(id => state._orderTokens.find(t => t.id === id)?.text).filter(Boolean);
return JSON.stringify(ordered) === JSON.stringify(step.answer);
}


function reset(step, state) {
state.orderIds = [];
state._orderTokens = null;
}


registerStepType('order_words', { render, check, reset });