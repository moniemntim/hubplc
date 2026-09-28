import assert from 'node:assert/strict';
import { elapsed, timeout } from './tick.mjs';
for (const [label, start, now, gapBound, nowBoot] of [
  ['normal', 20, 30, 10, 'A'],
  ['wrap', 250, 14, 20, 'A'],
  ['last tick', 255, 0, 1, 'A'],
  ['full lap', 250, 250, 256, 'A'],
  ['hidden lap', 250, 14, 276, 'A'],
  ['restart', 250, 14, 20, 'B'],
]) {
  const result = elapsed({ start, now, gapBound, nowBoot });
  console.log(
    `${label}: ${result.reason} elapsed=${result.elapsed} timeout15=${timeout(result, 15)}`,
  );
}
assert.equal(elapsed({ start: 250, now: 14, gapBound: 20 }).elapsed, 20);
console.log('tick demo: PASS');
