import assert from 'node:assert/strict';
import { simulateRead } from './timeline.mjs';
for (const delay of [199, 200, 201]) {
  const result = simulateRead({ replyDelaysMs: [delay], maxAttempts: 1 });
  assert.equal(result.result, delay < 200 ? 'completed' : 'attempts-exhausted');
  console.log(JSON.stringify({ case: `reply-${delay}`, ...result }));
}
const full = simulateRead({ replyDelaysMs: [300, 300, 300] });
assert.deepEqual(
  full.attempts.map((a) => a.sentAtMs),
  [0, 250, 500],
);
assert.equal(full.endedAtMs, 700);
console.log(JSON.stringify({ case: 'three-timeouts', ...full }));
const clipped = simulateRead({
  replyDelaysMs: [300, 300, 300],
  totalDeadlineMs: 500,
});
assert.equal(clipped.endedAtMs, 500);
assert.equal(clipped.attempts.length, 2);
console.log(JSON.stringify({ case: 'total-500', ...clipped }));
const duringWait = simulateRead({
  replyDelaysMs: [300, 300, 300],
  totalDeadlineMs: 400,
});
assert.equal(duringWait.attempts[1].endedAtMs, 400);
console.log(JSON.stringify({ case: 'total-400', ...duringWait }));
console.log(
  'PASS: virtual deadline boundaries, retry count and total deadline',
);
