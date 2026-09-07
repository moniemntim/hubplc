import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyStopwatch,
  elapsedAt,
  toggleStopwatch,
  recordLap,
  formatStopwatch,
  parseStopwatch,
} from '../lib/tools/stopwatch.ts';

void test('start, pause and resume exclude paused time and survive delayed ticks', () => {
  let s = toggleStopwatch(emptyStopwatch(), 1000);
  assert.equal(elapsedAt(s, 61234), 60234);
  s = toggleStopwatch(s, 61234);
  assert.equal(elapsedAt(s, 100000), 60234);
  s = toggleStopwatch(s, 110000);
  assert.equal(elapsedAt(s, 112000), 62234);
  assert.equal(elapsedAt(s, 109000), 60234);
});

void test('laps retain cumulative times across pauses and reject recording while paused', () => {
  let s = emptyStopwatch();
  assert.equal(recordLap(s, 1000), s);
  s = toggleStopwatch(s, 1000);
  s = recordLap(s, 11000);
  s = toggleStopwatch(s, 16000);
  s = toggleStopwatch(s, 21000);
  s = recordLap(s, 31000);
  assert.deepEqual(s.laps, [10000, 25000]);
  const full = { ...s, laps: Array(1000).fill(0) };
  assert.equal(recordLap(full, 32000), full);
});

void test('display truncates hundredths, rolls over hours and preserves long durations', () => {
  assert.equal(formatStopwatch(0), '00:00:00.00');
  assert.equal(formatStopwatch(59999), '00:00:59.99');
  assert.equal(formatStopwatch(3600010), '01:00:00.01');
  assert.equal(formatStopwatch(360000000), '100:00:00.00');
  assert.equal(formatStopwatch(12345, true), '00:00:12');
});

void test('saved and shared states resume using the original start time', () => {
  const running = recordLap(toggleStopwatch(emptyStopwatch(), 1000), 2000);
  const restored = parseStopwatch(JSON.stringify(running), 100000);
  assert.deepEqual(restored, running);
  assert.equal(elapsedAt(restored, 100000), 99000);
  const paused = toggleStopwatch(running, 3000);
  assert.equal(
    elapsedAt(parseStopwatch(JSON.stringify(paused), 100000), 100000),
    2000,
  );
});

void test('untrusted links reject malformed, oversized, future and inconsistent state', () => {
  for (const raw of ['null', '{}', 'bad', 'x'.repeat(40001)])
    assert.equal(parseStopwatch(raw, 10000), null);
  for (const patch of [
    { version: 2 },
    { elapsed: -1 },
    { elapsed: 1.5 },
    { elapsed: 1e30 },
    { startedAt: 10001 },
    { startedAt: '100' },
    { laps: [101] },
    { laps: [90, 80] },
    { laps: [null] },
    { laps: Array(1001).fill(0) },
  ])
    assert.equal(
      parseStopwatch(
        JSON.stringify({ ...emptyStopwatch(), elapsed: 100, ...patch }),
        10000,
      ),
      null,
    );
});
