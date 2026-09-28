import assert from 'node:assert/strict';
import { END_ROW, FIXTURE, LATE_ROW } from './fixtures.mjs';
import { summarize, WINDOW_MS } from './model.mjs';

const before = summarize(FIXTURE);
const replayed = summarize([...FIXTURE, ...FIXTURE]);
const late = summarize([...FIXTURE, LATE_ROW], { asOfMs: WINDOW_MS + 20_000 });
const firstWindowAtBoundary = summarize([...FIXTURE, END_ROW]);
const nextWindow = summarize([...FIXTURE, END_ROW], {
  startMs: WINDOW_MS,
  endMs: WINDOW_MS * 2,
});

assert.deepEqual(before.groupCounts, {
  Utility: 1,
  Pump: 14,
  TemperatureFlow: 20,
  Communication: 15,
});
assert.deepEqual(
  [
    before.transitionCount,
    before.cycleCount,
    before.clearCount,
    before.activeCount,
    before.unacknowledgedCount,
  ],
  [132, 50, 40, 10, 8],
);
assert.deepEqual(
  [before.unacknowledgedActiveCount, before.unacknowledgedClearCount],
  [3, 5],
);
assert.deepEqual(
  [
    replayed.transitionCount,
    replayed.cycleCount,
    replayed.ignoredDuplicateIds.length,
  ],
  [132, 50, 132],
);
assert.notEqual(before.contentVersion, late.contentVersion);
assert.deepEqual(
  [firstWindowAtBoundary.cycleCount, nextWindow.cycleCount],
  [50, 1],
);

console.log(
  'base transitions=132 cycles=50 groups=1+14+20+15 clear=40 active=10 unacked=8 (active=3 clear=5)',
);
console.log(
  'candidate=' +
    before.candidateEarliestCycleId +
    ' is earliest sourceSequence only, not a cause',
);
console.log(
  'replay duplicates=132 ignored; original counts stay transitions=132 cycles=50',
);
console.log(
  'late before=' +
    before.contentVersion +
    ' after=' +
    late.contentVersion +
    ' cycles=' +
    late.cycleCount,
);
console.log('boundary end=900000 firstWindow=50 nextWindow=1');
console.log('alarm-flood demo: PASS');
