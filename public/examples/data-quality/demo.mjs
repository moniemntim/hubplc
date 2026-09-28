import assert from 'node:assert/strict';
import {
  createDataQualityMonitor,
  gracefulStop,
  heartbeat,
  ordinaryAutomaticUse,
  receiveGood,
  restart,
  tick,
} from './model.mjs';

const sample = (monitor, nowMs, epoch, value = 23.4) =>
  receiveGood(monitor, {
    nowMs,
    epoch,
    value,
    sourceAtMs: nowMs,
    sourceClockId: 'MONO-A',
    receivedAtMs: nowMs,
    receivedClockId: 'MONO-A',
  });

let abrupt = createDataQualityMonitor();
abrupt = sample(abrupt, 0, 1).state;
console.log(
  `initial state=${abrupt.connection} quality=${abrupt.quality} value=${abrupt.value} last_good=${abrupt.lastGoodValue}`,
);
console.log(
  `without-external-tick quality=${abrupt.quality} now=${abrupt.nowMs}`,
);
abrupt = tick(abrupt, 600);
assert.equal(abrupt.reason, 'HEARTBEAT_EXPIRED');
console.log(
  `abrupt-at-600 state=${abrupt.connection} quality=${abrupt.quality} reason=${abrupt.reason} last_good=${abrupt.lastGoodValue}`,
);

let graceful = createDataQualityMonitor();
graceful = sample(graceful, 0, 1).state;
graceful = gracefulStop(graceful, 120);
console.log(
  `graceful state=${graceful.connection} quality=${graceful.quality} reason=${graceful.reason} value=${graceful.value} last_good=${graceful.lastGoodValue}`,
);

abrupt = restart(abrupt, 700);
console.log(
  `restart epoch=${abrupt.epoch} state=${abrupt.connection} quality=${abrupt.quality}`,
);
const old = sample(abrupt, 710, 1);
assert.equal(old.reason, 'OLD_OR_UNEXPECTED_EPOCH');
console.log(`old-epoch=${old.reason} quality=${old.state.quality}`);
abrupt = sample(old.state, 720, 2, 24.1).state;
console.log(
  `fresh-current-epoch state=${abrupt.connection} quality=${abrupt.quality} value=${abrupt.value}`,
);

let age = createDataQualityMonitor();
age = sample(age, 0, 1).state;
age = heartbeat(age, 500);
age = heartbeat(age, 1000);
age = heartbeat(age, 1500);
age = tick(age, 1999);
console.log(
  `receive-age-1999 quality=${age.quality} automatic=${ordinaryAutomaticUse(age).allowed}`,
);
age = heartbeat(age, 2000);
assert.equal(age.reason, 'RECEIVE_AGE_EXPIRED');
console.log(
  `receive-age-2000 quality=${age.quality} reason=${age.reason} automatic=${ordinaryAutomaticUse(age).allowed} last_good=${age.lastGoodValue}`,
);

console.log('data-quality demo: PASS');
