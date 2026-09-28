import assert from 'node:assert/strict';
import { analyzeWindow, DAY_MS, rawChangeSimpleMean } from './model.mjs';
import {
  rawChanges,
  rawSeed,
  segments,
  tenEnd,
  tenStart,
} from './fixtures.mjs';
const ten = analyzeWindow({
  segments,
  windowStartMs: tenStart,
  windowEndMs: tenEnd,
});
const day = analyzeWindow({ segments, windowStartMs: 0, windowEndMs: DAY_MS });
const simple = rawChangeSimpleMean({ seed: rawSeed, changes: rawChanges });
assert.deepEqual(
  [ten.fullWindowMeanC, ten.coverage, day.fullWindowMeanC, day.maxC, simple],
  [61.5, 1, 60.010416666666664, 75, 67.5],
);
console.log(
  `ten-minute weighted=${ten.fullWindowMeanC} coverage=${ten.coverage}`,
);
console.log(`day weighted=${day.fullWindowMeanC} max=${day.maxC}`);
console.log(
  `raw-change simple=${simple} (seed 60 + change 75; not window raw)`,
);
console.log('demo: PASS');
