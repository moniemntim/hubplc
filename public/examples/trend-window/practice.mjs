import { analyzeWindow } from './model.mjs';
import { segments, tenEnd, tenStart } from './fixtures.mjs';
const changed = structuredClone(segments);
changed[0].endMs += 30000;
changed[1].startMs += 30000;
const result = analyzeWindow({
  segments: changed,
  windowStartMs: tenStart,
  windowEndMs: tenEnd,
});
console.log(JSON.stringify(result));
console.log('practice: output generated; compare with expected result');
