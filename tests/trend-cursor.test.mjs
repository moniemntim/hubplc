import assert from 'node:assert/strict';
import test from 'node:test';
import { alignEvent, cursor } from '../public/examples/trend-cursor/model.mjs';
import { event, points } from '../public/examples/trend-cursor/fixtures.mjs';
void test('raw, interpolation, outside, and Bad neighbors remain distinct', () => {
  assert.deepEqual(cursor({ points, cursorMs: 3000 }), {
    kind: 'RAW',
    value: 62,
    cursorMs: 3000,
  });
  assert.deepEqual(cursor({ points, cursorMs: 3200 }), {
    kind: 'INTERPOLATED',
    value: 63.2,
    cursorMs: 3200,
  });
  assert.equal(cursor({ points, cursorMs: 7000 }).kind, 'OUTSIDE');
  const bad = structuredClone(points);
  bad[2].quality = 'Bad';
  assert.equal(cursor({ points: bad, cursorMs: 3200 }).kind, 'UNAVAILABLE');
});
void test('only declared same clock domain yields a difference', () => {
  assert.deepEqual(alignEvent(event), { comparable: true, differenceMs: 800 });
  assert.deepEqual(alignEvent({ ...event, sameClockDomain: false }), {
    comparable: false,
    differenceMs: null,
  });
});
void test('cursor rejects invalid shape, duplicate time, unsafe clocks and nonfinite values', () => {
  for (const candidate of [
    [],
    [points[0]],
    [...points].reverse(),
    [points[0], points[0]],
    [{ ...points[0], extra: 1 }, points[1]],
    [{ ...points[0], value: NaN }, points[1]],
    [{ ...points[0], timeMs: -1 }, points[1]],
    [{ ...points[0], value: 1000001 }, points[1]],
    Array.from({ length: 33 }, (_, i) => ({ ...points[0], timeMs: i })),
  ])
    assert.throws(
      () => cursor({ points: candidate, cursorMs: 3200 }),
      TypeError,
    );
  assert.throws(
    () => cursor({ points, cursorMs: Number.MAX_SAFE_INTEGER + 1 }),
    TypeError,
  );
  assert.equal(cursor({ points, cursorMs: 0 }).kind, 'OUTSIDE');
  const bad = structuredClone(points);
  bad[2].quality = 'Bad';
  assert.deepEqual(cursor({ points: bad, cursorMs: 6000 }), {
    kind: 'UNAVAILABLE',
    value: null,
    cursorMs: 6000,
  });
  assert.throws(
    () => alignEvent({ ...event, sameClockDomain: 'true' }),
    TypeError,
  );
});
