// js/core/analytics.js
const listeners = new Set();
const sessionId = generateSessionId();

export function emitTelemetry(event, payload = {}) {
  const detail = { event, payload, sessionId, at: Date.now() };
  for (const fn of listeners) {
    try { fn(detail); } catch (err) { console.warn('telemetry listener error', err); }
  }
  try {
    window.dispatchEvent(new CustomEvent('telemetry', { detail }));
  } catch {}
}

export function onTelemetry(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function generateSessionId() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}
