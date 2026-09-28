import assert from 'node:assert/strict';
import { END_ROW, FIXTURE, LATE_ROW } from './fixtures.mjs';
import { replay, summarize, WINDOW_MS } from './model.mjs';

const base = summarize(FIXTURE);
assert.equal(FIXTURE.length, 132);
assert.deepEqual(
  [
    base.cycleCount,
    base.clearCount,
    base.activeCount,
    base.unacknowledgedCount,
  ],
  [50, 40, 10, 8],
);
assert.deepEqual(
  [base.unacknowledgedActiveCount, base.unacknowledgedClearCount],
  [3, 5],
);
const duplicateReplay = summarize([...FIXTURE, ...FIXTURE]);
assert.equal(duplicateReplay.ignoredDuplicateIds.length, 132);
assert.equal(duplicateReplay.contentVersion, base.contentVersion);
assert.throws(
  () => replay([...FIXTURE, { ...FIXTURE[0], source: 'different-source' }]),
  /collision/,
);
assert.notEqual(
  base.contentVersion,
  summarize([...FIXTURE, LATE_ROW], { asOfMs: WINDOW_MS + 20_000 })
    .contentVersion,
);
assert.equal(summarize([...FIXTURE, END_ROW]).cycleCount, 50);
assert.equal(
  summarize([...FIXTURE, END_ROW], { startMs: WINDOW_MS, endMs: WINDOW_MS * 2 })
    .cycleCount,
  1,
);
console.log('alarm-flood self-test: PASS');
