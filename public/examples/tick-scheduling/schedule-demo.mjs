import assert from 'node:assert/strict';
import { samples } from './tick.mjs';
import { run } from './scheduler.mjs';
const scans = samples(Array.from({ length: 1001 }, (_, i) => i * 10));
for (const mode of ['completion', 'phase']) {
  const r = run({ mode, scans, durations: [80, 120, 50, 100] });
  const starts = r.events.slice(0, 10).map((e) => e.start);
  console.log(`${mode}: ${starts.join(',')}`);
  assert.equal(starts[9], mode === 'completion' ? 9780 : 9000);
}
const late = run({
  scans: samples([0, 80, 1000, 1080, 3500, 3580, 4000, 4080]),
});
console.log(
  `late: target=${late.events[2].target} start=${late.events[2].start} missed=${late.missed} next=${late.nextTarget}`,
);
const busy = run({
  scans: samples([0, 1000, 2000, 2500, 3000]),
  durations: [2500],
});
console.log(
  `busy: starts=${busy.events.map((e) => e.start).join(',')} missed=${busy.missed}`,
);
assert.equal(late.missed, 1);
assert.equal(busy.missed, 2);
console.log('schedule demo: PASS');
