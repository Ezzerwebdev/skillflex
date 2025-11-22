// [2024-11-21] Shared helpers to render optional audio/image/manipulatives scaffolding for steps.
import { renderManipulatives } from './manipulatives.js';

export function renderAudioPrompt(container, audioUrl) {
  if (!audioUrl || !container) return;
  const block = document.createElement('div');
  block.className = 'audio-prompt';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'audio-play-btn';
  btn.textContent = '🔊 Play question';
  const audio = document.createElement('audio');
  audio.preload = 'auto';
  audio.src = audioUrl;
  btn.addEventListener('click', () => {
    try { audio.currentTime = 0; audio.play(); } catch {}
  });
  block.appendChild(btn);
  block.appendChild(audio);
  container.appendChild(block);
}

export function renderImagePrompt(container, imageUrl, imageAlt = '') {
  if (!imageUrl || !container) return;
  const fig = document.createElement('figure');
  fig.className = 'step-image';
  const img = document.createElement('img');
  img.src = imageUrl;
  img.alt = imageAlt || '';
  fig.appendChild(img);
  container.appendChild(fig);
}

export function renderMediaBlocks(host, step) {
  if (!host || !step) return;
  if (step.audioUrl) renderAudioPrompt(host, step.audioUrl);
  if (step.imageUrl) renderImagePrompt(host, step.imageUrl, step.imageAlt);
  if (step.manipulatives) renderManipulatives(host, step.manipulatives);
}

// Back-compat globals if needed elsewhere
if (typeof window !== 'undefined') {
  window.renderMediaBlocks = renderMediaBlocks;
  window.renderAudioPrompt = renderAudioPrompt;
  window.renderImagePrompt = renderImagePrompt;
}
