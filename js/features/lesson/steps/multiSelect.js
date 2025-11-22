// [2024-11-21] Stub multiSelect step (falls back to multiChoice until fully built).
import { renderMultiChoice } from './multiChoice.js';
export function renderMultiSelect(step, host) {
  return renderMultiChoice(step, host);
}
