import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { DEMO_SAMPLES } from '../public/examples/alarm-hysteresis/fixtures.mjs';
import {
  CLEAR_HOLD_MS,
  HIGH_CLEAR_MILLIBAR,
  initialAlarm,
  LOW_START_MILLIBAR,
  sampleAlarm,
  START_HOLD_MS,
} from '../public/examples/alarm-hysteresis/model.mjs';

const sample = (state, nowMs, rawMilliBar, quality = 'GOOD', reset = false) =>
  sampleAlarm(state, { nowMs, rawMilliBar, quality, reset });

void test('downloadable self-test executes', () => {
  assert.match(
    execFileSync(
      process.execPath,
      ['public/examples/alarm-hysteresis/self-test.mjs'],
      {
        encoding: 'utf8',
      },
    ),
    /PASS/,
  );
});

void test('fixture covers equality, bad quality, gap, rejected reset, physical clear and latch reset', () => {
  let state = initialAlarm();
  const byId = new Map();
  for (const input of DEMO_SAMPLES) {
    state = sampleAlarm(state, input);
    byId.set(input.id, state);
  }
  assert.equal(byId.get('low-equal').lowSinceMs, null);
  assert.deepEqual(
    [byId.get('low-active').active, byId.get('low-active').latched],
    [true, true],
  );
  assert.equal(byId.get('reset-active').decision, 'RESET_REJECTED_ACTIVE');
  assert.deepEqual(
    [
      byId.get('bad').decision,
      byId.get('bad').quality,
      byId.get('bad').evaluationKnown,
    ],
    ['UNKNOWN_BAD_QUALITY', 'BAD', false],
  );
  assert.deepEqual(
    [
      byId.get('sample-gap').decision,
      byId.get('sample-gap').quality,
      byId.get('sample-gap').evaluationKnown,
    ],
    ['UNKNOWN_SAMPLE_GAP', 'GOOD', false],
  );
  assert.deepEqual(
    [byId.get('high-clear').active, byId.get('high-clear').latched],
    [false, true],
  );
  assert.deepEqual(
    [state.active, state.latched, state.decision],
    [false, false, 'LATCH_RESET_ACCEPTED'],
  );
});

void test('strict thresholds and exact holds are required', () => {
  let state = initialAlarm();
  state = sample(state, 0, LOW_START_MILLIBAR);
  assert.equal(state.active, false);
  state = sample(state, 500, LOW_START_MILLIBAR - 1);
  state = sample(state, 1500, LOW_START_MILLIBAR - 1);
  state = sample(state, 500 + START_HOLD_MS - 1, LOW_START_MILLIBAR - 1);
  assert.equal(state.active, false);
  state = sample(state, 500 + START_HOLD_MS, LOW_START_MILLIBAR - 1);
  assert.equal(state.active, true);
  state = sample(state, 3000, HIGH_CLEAR_MILLIBAR);
  assert.equal(state.highSinceMs, null);
  state = sample(state, 3500, HIGH_CLEAR_MILLIBAR + 1);
  state = sample(state, 4500, HIGH_CLEAR_MILLIBAR + 1);
  state = sample(state, 5500, HIGH_CLEAR_MILLIBAR + 1);
  state = sample(state, 3500 + CLEAR_HOLD_MS - 1, HIGH_CLEAR_MILLIBAR + 1);
  assert.equal(state.active, true);
  state = sample(state, 3500 + CLEAR_HOLD_MS, HIGH_CLEAR_MILLIBAR + 1);
  assert.equal(state.active, false);
});

void test('bad quality or a gap leaves active and latch history while resetting timers', () => {
  let state = initialAlarm();
  for (const [nowMs, raw] of [
    [0, 4999],
    [1000, 4999],
    [2000, 4999],
  ])
    state = sample(state, nowMs, raw);
  assert.deepEqual([state.active, state.latched], [true, true]);
  state = sample(state, 2500, 5400);
  assert.notEqual(state.highSinceMs, null);
  state = sample(state, 3000, 5400, 'BAD');
  assert.deepEqual(
    [
      state.active,
      state.latched,
      state.highSinceMs,
      state.evaluationKnown,
      state.decision,
    ],
    [true, true, null, false, 'UNKNOWN_BAD_QUALITY'],
  );
  state = sample(state, 4501, 5400);
  assert.deepEqual(
    [
      state.active,
      state.latched,
      state.highSinceMs,
      state.evaluationKnown,
      state.decision,
    ],
    [true, true, null, false, 'UNKNOWN_SAMPLE_GAP'],
  );
});

void test('a fresh reset edge needs an inactive, normal-pressure good sample', () => {
  let state = initialAlarm();
  for (const nowMs of [0, 1000, 2000]) state = sample(state, nowMs, 4999);
  for (const nowMs of [3000, 4000, 5000, 6000])
    state = sample(state, nowMs, 5400);
  assert.deepEqual([state.active, state.latched], [false, true]);

  state = sample(state, 6500, 5200, 'GOOD', false);
  state = sample(state, 7000, 5200, 'GOOD', true);
  assert.deepEqual(
    [state.active, state.latched, state.decision],
    [false, true, 'RESET_REJECTED_NOT_NORMAL'],
  );

  state = sample(state, 7500, 5400, 'GOOD', false);
  state = sample(state, 8000, 5400, 'GOOD', true);
  assert.deepEqual(
    [state.active, state.latched, state.decision],
    [false, false, 'LATCH_RESET_ACCEPTED'],
  );
});

void test('sample times are strictly increasing safe integers', () => {
  const state = initialAlarm();
  assert.throws(() => sample(state, -1, 5000), RangeError);
  assert.throws(() => sample(state, 0.5, 5000), RangeError);
  assert.throws(() => sample(sample(state, 0, 5000), 0, 5000), RangeError);
});
