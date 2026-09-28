import assert from 'node:assert/strict';
import { DEMO_SAMPLES } from './fixtures.mjs';
import { initialAlarm, sampleAlarm } from './model.mjs';

let state = initialAlarm();
const byId = new Map();
for (const input of DEMO_SAMPLES) {
  state = sampleAlarm(state, input);
  byId.set(input.id, state);
}
assert.equal(byId.get('low-equal').lowSinceMs, null);
assert.equal(byId.get('bad').evaluationKnown, false);
assert.equal(byId.get('sample-gap').decision, 'UNKNOWN_SAMPLE_GAP');
assert.deepEqual(
  [byId.get('high-clear').active, byId.get('high-clear').latched],
  [false, true],
);
assert.deepEqual(
  [state.active, state.latched, state.decision],
  [false, false, 'LATCH_RESET_ACCEPTED'],
);
console.log('alarm-hysteresis self-test: PASS');
