import assert from 'node:assert/strict';
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
} from './model.mjs';

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

let monitor = good(createDataQualityMonitor(), 0).state;
monitor = tick(monitor, HEARTBEAT_LIMIT_MS - 1);
assert.equal(monitor.quality, 'GOOD');
monitor = tick(monitor, HEARTBEAT_LIMIT_MS);
assert.deepEqual(
  [monitor.connection, monitor.quality, monitor.lastGoodValue],
  ['WATCHDOG_EXPIRED', 'BAD', 23.4],
);
assert.equal(heartbeat(monitor, 601).quality, 'BAD');
assert.equal(good(monitor, 602).reason, 'RESTART_REQUIRED');
assert.equal(
  heartbeat(good(createDataQualityMonitor(), 0).state, HEARTBEAT_LIMIT_MS)
    .reason,
  'HEARTBEAT_EXPIRED',
);
assert.equal(
  good(createDataQualityMonitor(), HEARTBEAT_LIMIT_MS).reason,
  'HEARTBEAT_EXPIRED',
);
monitor = restart(monitor, 700);
assert.equal(monitor.quality, 'BAD');
assert.equal(good(monitor, 701, 1).reason, 'OLD_OR_UNEXPECTED_EPOCH');
monitor = good(monitor, 702).state;
assert.equal(monitor.quality, 'GOOD');

let stop = good(createDataQualityMonitor(), 0).state;
stop = gracefulStop(stop, 120);
assert.deepEqual(
  [stop.connection, stop.quality, stop.value, stop.lastGoodValue],
  ['STOPPED', 'UNCERTAIN', 23.4, 23.4],
);
assert.equal(good(stop, 121).reason, 'RESTART_REQUIRED');
stop = tick(stop, 2120);
assert.deepEqual(
  [stop.quality, stop.reason, stop.receiveAgeMs],
  ['UNCERTAIN', 'GRACEFUL_STOP', 2120],
);

let age = good(createDataQualityMonitor(), 0).state;
for (const time of [500, 1000, 1500]) age = heartbeat(age, time);
age = tick(age, DATA_AGE_LIMIT_MS - 1);
assert.equal(ordinaryAutomaticUse(age).allowed, true);
age = heartbeat(age, DATA_AGE_LIMIT_MS);
assert.deepEqual(
  [age.quality, age.reason, ordinaryAutomaticUse(age).allowed],
  ['BAD', 'RECEIVE_AGE_EXPIRED', false],
);
assert.equal(heartbeat(age, 2100).quality, 'BAD');

const mismatch = good(createDataQualityMonitor(), 0, 1, {
  sourceClockId: 'SOURCE-UTC',
});
assert.deepEqual(
  [mismatch.accepted, mismatch.reason, mismatch.state.quality],
  [false, 'SOURCE_CLOCK_MISMATCH', 'BAD'],
);
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
assert.equal(sourceAge.sourceAgeMs, 1999);
sourceAge = heartbeat(sourceAge, 2000);
assert.equal(sourceAge.reason, 'SOURCE_AGE_EXPIRED');
const stale = good(createDataQualityMonitor({ nowMs: 2000 }), 2000, 1, {
  sourceAtMs: 0,
  receivedAtMs: 2000,
});
assert.deepEqual(
  [stale.accepted, stale.reason, stale.state.quality],
  [false, 'STALE_DATA', 'BAD'],
);
const ordered = good(createDataQualityMonitor(), 100, 1, {
  sourceAtMs: 90,
  receivedAtMs: 100,
}).state;
const delayed = good(ordered, 110, 1, {
  value: 99,
  sourceAtMs: 90,
  receivedAtMs: 110,
});
assert.deepEqual(
  [delayed.accepted, delayed.reason, delayed.state.value],
  [false, 'SOURCE_NOT_NEWER', 23.4],
);
let oldEpochAge = good(createDataQualityMonitor(), 0).state;
for (const time of [500, 1000, 1500])
  oldEpochAge = heartbeat(oldEpochAge, time);
const oldEpoch = good(oldEpochAge, 2000, 2);
assert.deepEqual(
  [
    oldEpoch.reason,
    oldEpoch.state.quality,
    oldEpoch.state.reason,
    ordinaryAutomaticUse(oldEpoch.state).allowed,
  ],
  ['OLD_OR_UNEXPECTED_EPOCH', 'BAD', 'RECEIVE_AGE_EXPIRED', false],
);

console.log('data-quality self-test: PASS');
