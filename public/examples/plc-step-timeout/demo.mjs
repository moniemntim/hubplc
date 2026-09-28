import { initialWait, waitScan } from './wait-model.mjs';

const fixtures = {
  'success-4999': [
    { nowMs: 0 },
    { nowMs: 10, start: true },
    { nowMs: 5009, sensorB: true },
    { nowMs: 5010, ack: true },
  ],
  'timeout-5000': [
    { nowMs: 0 },
    { nowMs: 10, start: true },
    { nowMs: 1010 },
    { nowMs: 3010 },
    { nowMs: 5009 },
    { nowMs: 5010, sensorB: true },
  ],
  'late-sample-5030': [
    { nowMs: 0 },
    { nowMs: 10, start: true },
    { nowMs: 5040 },
  ],
  'reset-requires-new-press': [
    { nowMs: 0 },
    { nowMs: 10, start: true },
    { nowMs: 5010, sensorB: true },
    { nowMs: 5020, reset: true, sensorB: true },
    { nowMs: 5030, reset: true },
    { nowMs: 5040 },
    { nowMs: 5050, reset: true, start: true },
    { nowMs: 5060, start: true },
    { nowMs: 5070 },
    { nowMs: 5080, start: true },
  ],
};
for (const [name, inputs] of Object.entries(fixtures)) {
  console.log(name);
  let state = initialWait();
  for (const input of inputs) {
    state = waitScan(state, input);
    console.log(JSON.stringify({ input, ...state }));
  }
}
