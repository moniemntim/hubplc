import { DEMO_SAMPLES } from './fixtures.mjs';
import { initialAlarm, sampleAlarm } from './model.mjs';

// Change only these copies. Keep nowMs strictly increasing and integer.
const samples = DEMO_SAMPLES.map((sample) => ({ ...sample }));
// Practice: turn the 1000 ms equality sample into a low sample. The alarm
// then starts at low-4 (2500 ms), rather than low-active (3500 ms).
samples[2].rawMilliBar = 4999;

let state = initialAlarm();
for (const input of samples) {
  state = sampleAlarm(state, input);
  console.log(JSON.stringify({ id: input.id, ...state }));
}
