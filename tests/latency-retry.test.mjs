import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateRead } from '../public/examples/latency-retry/timeline.mjs';
void test('read retry uses a strict processing deadline and never accepts the equality boundary', () => {
  for (const delay of [199, 200, 201]) {
    const result = simulateRead({ replyDelaysMs: [delay], maxAttempts: 1 });
    assert.equal(
      result.result,
      delay === 199 ? 'completed' : 'attempts-exhausted',
    );
  }
});
void test('three attempts have two backoffs; total deadline cuts wait and prevents a new attempt', () => {
  const args = { replyDelaysMs: [null, null, null] };
  const full = simulateRead(args);
  assert.deepEqual(
    full.attempts.map((item) => item.sentAtMs),
    [0, 250, 500],
  );
  assert.equal(full.endedAtMs, 700);
  const clipped = simulateRead({ ...args, totalDeadlineMs: 500 });
  assert.equal(clipped.attempts.length, 2);
  assert.equal(clipped.endedAtMs, 500);
  const during = simulateRead({ ...args, totalDeadlineMs: 400 });
  assert.equal(during.attempts[1].deadlineMs, 400);
  const first = simulateRead({ ...args, totalDeadlineMs: 50 });
  assert.equal(first.attempts[0].deadlineMs, 50);
});
void test('a later successful read stops retries and malformed fixtures are refused', () => {
  const result = simulateRead({ replyDelaysMs: [300, 20, 300] });
  assert.equal(result.attempts.length, 2);
  assert.equal(result.endedAtMs, 270);
  for (const invalid of [
    { replyDelaysMs: [] },
    { replyDelaysMs: [-1, 2, 3] },
    { replyDelaysMs: [1, 2, 3], totalDeadlineMs: 0 },
    { replyDelaysMs: [1, 2, 3], maxAttempts: 99 },
  ])
    assert.throws(() => simulateRead(invalid), RangeError);
});
