import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import {
  DATA_AGE_LIMIT_MS,
  HEARTBEAT_LIMIT_MS,
  createDataQualityMonitor,
  gracefulStop,
  heartbeat,
  ordinaryAutomaticUse,
  receiveGood,
  restart,
  tick,
} from '../public/examples/data-quality/model.mjs';

const good = (state, nowMs, epoch = state.epoch, overrides = {}) =>
  receiveGood(state, {
    nowMs,
    epoch,
    value: 23.4,
    sourceAtMs: nowMs,
    sourceClockId: 'MONO-A',
    receivedAtMs: nowMs,
    receivedClockId: 'MONO-A',
    ...overrides,
  });

void test('downloadable self-test executes', () => {
  assert.match(
    execFileSync(
      process.execPath,
      ['public/examples/data-quality/self-test.mjs'],
      {
        encoding: 'utf8',
      },
    ),
    /PASS/,
  );
});

void test('external tick detects an abrupt missed heartbeat only at the 600 ms equality boundary', () => {
  let state = good(createDataQualityMonitor(), 0).state;
  assert.equal(state.quality, 'GOOD');
  assert.equal(state.nowMs, 0);
  state = tick(state, HEARTBEAT_LIMIT_MS - 1);
  assert.equal(state.quality, 'GOOD');
  state = tick(state, HEARTBEAT_LIMIT_MS);
  assert.deepEqual(
    [
      state.connection,
      state.quality,
      state.reason,
      state.value,
      state.lastGoodValue,
    ],
    ['WATCHDOG_EXPIRED', 'BAD', 'HEARTBEAT_EXPIRED', 23.4, 23.4],
  );
  assert.equal(heartbeat(state, 601).quality, 'BAD');
  const blocked = good(state, 602);
  assert.deepEqual(
    [blocked.accepted, blocked.reason, blocked.state.quality],
    [false, 'RESTART_REQUIRED', 'BAD'],
  );
});

void test('heartbeat, current-epoch data, and old-epoch data cannot bypass an already due deadline', () => {
  const running = good(createDataQualityMonitor(), 0).state;
  const fromHeartbeat = heartbeat(running, HEARTBEAT_LIMIT_MS);
  assert.deepEqual(
    [fromHeartbeat.connection, fromHeartbeat.quality, fromHeartbeat.reason],
    ['WATCHDOG_EXPIRED', 'BAD', 'HEARTBEAT_EXPIRED'],
  );
  const fromCurrentData = good(running, HEARTBEAT_LIMIT_MS);
  assert.deepEqual(
    [
      fromCurrentData.accepted,
      fromCurrentData.reason,
      fromCurrentData.state.quality,
    ],
    [false, 'HEARTBEAT_EXPIRED', 'BAD'],
  );
  const fromUnexpectedData = good(running, HEARTBEAT_LIMIT_MS, 2);
  assert.deepEqual(
    [
      fromUnexpectedData.accepted,
      fromUnexpectedData.reason,
      fromUnexpectedData.state.quality,
    ],
    [false, 'HEARTBEAT_EXPIRED', 'BAD'],
  );
});

void test('graceful stop differs from abrupt expiry and never substitutes zero', () => {
  let state = good(createDataQualityMonitor(), 0).state;
  state = gracefulStop(state, 120);
  assert.deepEqual(
    [
      state.connection,
      state.quality,
      state.reason,
      state.value,
      state.lastGoodValue,
    ],
    ['STOPPED', 'UNCERTAIN', 'GRACEFUL_STOP', 23.4, 23.4],
  );
  assert.equal(ordinaryAutomaticUse(state).allowed, false);
  assert.equal(good(state, 121).reason, 'RESTART_REQUIRED');
  const later = tick(state, 2120);
  assert.deepEqual(
    [later.connection, later.quality, later.reason, later.receiveAgeMs],
    ['STOPPED', 'UNCERTAIN', 'GRACEFUL_STOP', 2120],
  );
});

void test('restart requires current-epoch data; a connection or old epoch cannot recover GOOD', () => {
  let state = good(createDataQualityMonitor(), 0).state;
  state = tick(state, 600);
  state = restart(state, 700);
  assert.deepEqual(
    [state.epoch, state.connection, state.quality],
    [2, 'CONNECTED_WAITING_DATA', 'BAD'],
  );
  const old = good(state, 701, 1);
  assert.deepEqual(
    [old.accepted, old.reason, old.state.quality],
    [false, 'OLD_OR_UNEXPECTED_EPOCH', 'BAD'],
  );
  state = good(old.state, 702, 2).state;
  assert.deepEqual(
    [state.connection, state.quality, state.value],
    ['RUNNING', 'GOOD', 23.4],
  );
});

void test('receive age and source freshness require matching clocks and expire at 2000 ms equality', () => {
  const distinct = good(createDataQualityMonitor(), 100, 1, {
    sourceAtMs: 0,
    receivedAtMs: 100,
  });
  assert.deepEqual(
    [
      distinct.accepted,
      distinct.state.sourceFreshnessMs,
      distinct.state.receiveAgeMs,
    ],
    [true, 100, 0],
  );
  let sourceAge = good(createDataQualityMonitor({ nowMs: 1500 }), 1500, 1, {
    sourceAtMs: 0,
    receivedAtMs: 1500,
  }).state;
  sourceAge = heartbeat(sourceAge, 1999);
  assert.deepEqual(
    [sourceAge.quality, sourceAge.sourceFreshnessMs, sourceAge.sourceAgeMs],
    ['GOOD', 1500, 1999],
  );
  sourceAge = heartbeat(sourceAge, 2000);
  assert.deepEqual(
    [sourceAge.quality, sourceAge.reason, sourceAge.sourceAgeMs],
    ['BAD', 'SOURCE_AGE_EXPIRED', 2000],
  );
  const mismatch = good(createDataQualityMonitor(), 0, 1, {
    sourceClockId: 'UTC',
  });
  assert.deepEqual(
    [mismatch.accepted, mismatch.reason, mismatch.state.quality],
    [false, 'SOURCE_CLOCK_MISMATCH', 'BAD'],
  );
  const sourceBoundary = good(
    createDataQualityMonitor({ nowMs: DATA_AGE_LIMIT_MS }),
    DATA_AGE_LIMIT_MS,
    1,
    {
      sourceAtMs: 0,
      receivedAtMs: DATA_AGE_LIMIT_MS,
    },
  );
  assert.deepEqual(
    [sourceBoundary.accepted, sourceBoundary.reason],
    [false, 'STALE_DATA'],
  );
  let state = good(createDataQualityMonitor(), 0).state;
  for (const nowMs of [500, 1000, 1500]) state = heartbeat(state, nowMs);
  state = tick(state, DATA_AGE_LIMIT_MS - 1);
  assert.equal(ordinaryAutomaticUse(state).allowed, true);
  state = heartbeat(state, DATA_AGE_LIMIT_MS);
  assert.deepEqual(
    [state.quality, state.reason, ordinaryAutomaticUse(state).allowed],
    ['BAD', 'RECEIVE_AGE_EXPIRED', false],
  );
  assert.equal(heartbeat(state, 2100).quality, 'BAD');
});

void test('a non-increasing source timestamp cannot replace or refresh a same-epoch value', () => {
  const state = good(createDataQualityMonitor(), 100, 1, {
    sourceAtMs: 90,
    receivedAtMs: 100,
  }).state;
  const delayed = good(state, 110, 1, {
    value: 99,
    sourceAtMs: 90,
    receivedAtMs: 110,
  });
  assert.deepEqual(
    [
      delayed.accepted,
      delayed.reason,
      delayed.state.quality,
      delayed.state.value,
      delayed.state.lastGoodValue,
    ],
    [false, 'SOURCE_NOT_NEWER', 'BAD', 23.4, 23.4],
  );
});

void test('a rejected old epoch still advances existing ages and cannot freeze GOOD', () => {
  let state = good(createDataQualityMonitor(), 0).state;
  for (const nowMs of [500, 1000, 1500]) state = heartbeat(state, nowMs);
  const old = good(state, 2000, 2);
  assert.deepEqual(
    [
      old.accepted,
      old.reason,
      old.state.quality,
      old.state.reason,
      old.state.receiveAgeMs,
      old.state.sourceAgeMs,
      ordinaryAutomaticUse(old.state).allowed,
    ],
    [
      false,
      'OLD_OR_UNEXPECTED_EPOCH',
      'BAD',
      'RECEIVE_AGE_EXPIRED',
      2000,
      2000,
      false,
    ],
  );
});

void test('time inputs are monotonic safe integers', () => {
  const state = createDataQualityMonitor();
  assert.throws(() => tick(state, -1), RangeError);
  assert.throws(() => tick(state, 0.5), RangeError);
  assert.throws(() => tick(tick(state, 1), 0), RangeError);
});

void test('expired monitor ages keep advancing and stop cannot clear watchdog latch', () => {
  let state = good(createDataQualityMonitor(), 0).state;
  state = tick(state, 600);
  state = tick(state, 900);
  assert.equal(state.receiveAgeMs, 900);
  assert.equal(state.sourceAgeMs, 900);
  state = gracefulStop(state, 901);
  assert.equal(state.connection, 'WATCHDOG_EXPIRED');
  assert.equal(state.reason, 'HEARTBEAT_EXPIRED');
});

void test('rejected stale candidate cannot overwrite the retained value timestamp metadata', () => {
  const state = good(createDataQualityMonitor({ nowMs: 2100 }), 2100).state;
  const rejected = good(state, 2200, 1, { sourceAtMs: 0, receivedAtMs: 2200 });
  assert.equal(rejected.accepted, false);
  assert.equal(rejected.state.sourceAtMs, 2100);
  assert.equal(rejected.state.receivedAtMs, 2100);
  assert.equal(rejected.state.sourceAgeMs, 100);
  assert.equal(rejected.state.receiveAgeMs, 100);
});
