// steps/index.js — tiny registry used by the lesson engine
const registry = new Map();


export function registerStepType(type, impl) {
// impl must provide: render(step, host, state), check(step, state), optional reset(step, state)
registry.set(type, impl);
}


export function resetStepType(step, state) {
const impl = registry.get(step.type);
if (impl && typeof impl.reset === 'function') impl.reset(step, state);
else {
// sane defaults so the engine doesn't keep old choices
state.select = null;
state.orderIds = [];
state._orderTokens = null;
}
}


export function renderStepType(step, host, state) {
const impl = registry.get(step.type);
if (!impl || typeof impl.render !== 'function') {
throw new Error(`Unknown step type: ${step.type}`);
}
return impl.render(step, host, state);
}


export function checkStepType(step, state) {
const impl = registry.get(step.type);
if (!impl || typeof impl.check !== 'function') {
throw new Error(`Unknown step type: ${step.type}`);
}
return !!impl.check(step, state);
}