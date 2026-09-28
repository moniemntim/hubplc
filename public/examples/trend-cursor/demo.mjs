import assert from 'node:assert/strict';
import { alignEvent, cursor } from './model.mjs';
import { event, points } from './fixtures.mjs';
const interpolated = cursor({ points, cursorMs: 3200 });
const raw = cursor({ points, cursorMs: 3000 });
const outside = cursor({ points, cursorMs: 7000 });
const aligned = alignEvent(event);
assert.deepEqual(
  [
    interpolated.kind,
    interpolated.value,
    raw.kind,
    raw.value,
    outside.kind,
    aligned.differenceMs,
  ],
  ['INTERPOLATED', 63.2, 'RAW', 62, 'OUTSIDE', 800],
);
console.log(
  `cursor=3200 kind=${interpolated.kind} value=${interpolated.value}`,
);
console.log(`cursor=3000 kind=${raw.kind} value=${raw.value}`);
console.log(
  `event comparable=${aligned.comparable} differenceMs=${aligned.differenceMs}`,
);
console.log('demo: PASS');
