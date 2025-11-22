// [2024-11-21] Simple visual manipulatives for AI/lesson scaffolding.
export function renderManipulatives(container, spec) {
  if (!container || !spec || !spec.kind) return;
  switch (spec.kind) {
    case 'tenFrames':
      return renderTenFrames(container, spec);
    case 'numberLine':
      return renderNumberLine(container, spec);
    default:
      return;
  }
}

function renderTenFrames(container, spec) {
  const frames = Array.isArray(spec.frames) ? spec.frames : [];
  if (!frames.length) return;
  const wrap = document.createElement('div');
  wrap.className = 'ten-frames';
  frames.forEach((f) => {
    const filled = Math.max(0, Math.min(10, Number(f?.filled || 0)));
    const frame = document.createElement('div');
    frame.className = 'ten-frame';
    for (let i = 0; i < 10; i++) {
      const cell = document.createElement('div');
      cell.className = 'ten-frame-cell';
      if (i < filled) cell.classList.add('filled');
      frame.appendChild(cell);
    }
    wrap.appendChild(frame);
  });
  container.appendChild(wrap);
}

function renderNumberLine(container, spec) {
  const min = Number.isFinite(spec.min) ? Number(spec.min) : 0;
  const max = Number.isFinite(spec.max) ? Number(spec.max) : 10;
  if (max <= min) return;
  const highlights = Array.isArray(spec.highlight) ? spec.highlight.map(Number).filter(Number.isFinite) : [];

  const wrap = document.createElement('div');
  wrap.className = 'number-line';

  const track = document.createElement('div');
  track.className = 'number-line-track';
  wrap.appendChild(track);

  const span = max - min;
  const ticks = Math.min(10, span);
  for (let i = 0; i <= ticks; i++) {
    const val = min + Math.round((span * i) / ticks);
    const pct = 8 + (84 * (val - min)) / span; // aligns with track left/right
    const tick = document.createElement('div');
    tick.className = 'number-line-tick';
    tick.style.left = `${pct}%`;
    const label = document.createElement('div');
    label.className = 'number-line-label';
    label.style.left = `${pct}%`;
    label.textContent = String(val);
    wrap.appendChild(tick);
    wrap.appendChild(label);
  }

  highlights.forEach((val) => {
    if (val < min || val > max) return;
    const pct = 8 + (84 * (val - min)) / span;
    const dot = document.createElement('div');
    dot.className = 'number-line-point';
    dot.style.left = `${pct}%`;
    wrap.appendChild(dot);
  });

  container.appendChild(wrap);
}
