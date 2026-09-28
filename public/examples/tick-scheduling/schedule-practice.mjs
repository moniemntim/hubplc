import { samples } from './tick.mjs';
import { run } from './scheduler.mjs';
const mode = 'phase';
const duration = 80;
const times = [0, 80, 1000, 1080, 3500, 3580, 4000, 4080];
const result = run({ mode, scans: samples(times), durations: [duration] });
console.log(JSON.stringify(result, null, 2));
