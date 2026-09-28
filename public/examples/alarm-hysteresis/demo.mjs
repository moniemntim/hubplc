import assert from 'node:assert/strict';
import { DEMO_SAMPLES } from './fixtures.mjs';
import { initialAlarm, sampleAlarm } from './model.mjs';

let state = initialAlarm();
for (const input of DEMO_SAMPLES) {
  state = sampleAlarm(state, input);
  console.log(
    `${input.id} now=${state.nowMs} raw=${state.rawMilliBar} quality=${state.quality} evaluationKnown=${state.evaluationKnown} low=${state.lowSinceMs ?? '-'} high=${state.highSinceMs ?? '-'} active=${state.active} latch=${state.latched} decision=${state.decision}`,
  );
}
assert.deepEqual(
  [state.active, state.latched, state.decision],
  [false, false, 'LATCH_RESET_ACCEPTED'],
);
console.log('alarm-hysteresis demo: PASS');
