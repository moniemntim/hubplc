import assert from 'node:assert/strict';
import test from 'node:test';
import { directionExample, stepExample } from '../lib/sensor-lesson.ts';
void test('direction reversal keeps midpoint ambiguity and out-of-range status', () => {
  for (const [input, f, r] of [
    ['4', 0, 100],
    ['8', 25, 75],
    ['12', 50, 50],
    ['16', 75, 25],
    ['20', 100, 0],
  ])
    assert.deepEqual(directionExample(input), {
      forward: f,
      reverse: r,
      outside: false,
    });
  assert.deepEqual(directionExample('3'), {
    forward: -6.25,
    reverse: 106.25,
    outside: true,
  });
  assert.throws(() => directionExample(''));
});
void test('step thresholds distinguish delay, sampling and falling response', () => {
  const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-10);
  const r = stepExample('0.5', '0', '0.1', false);
  near(r.t90, 1.151292546497023);
  near(r.rise, 1.09861228866811);
  near(r.rows[2].sample, 1.2);
  near(r.rows[2].threshold, 74);
  const d = stepExample('0.5', '0.3', '0.1', true);
  near(d.rows[2].crossing, r.rows[2].crossing + 0.3);
  near(d.rows[2].sample, 1.5);
  near(d.rows[2].threshold, 26);
  assert.ok(d.rows[2].observed < 26);
  near(d.rise, r.rise);
  for (const row of r.rows) {
    assert.ok(row.sample + 1e-12 >= row.crossing);
    assert.ok(row.sample - 0.1 < row.crossing);
  }
  for (const args of [
    ['0', '0', '0.1'],
    ['', '0', '0.1'],
    ['1', '-1', '0.1'],
    ['1', '0', '0'],
    ['1', '0', '1001'],
  ])
    assert.throws(() => stepExample(...args, false));
});
