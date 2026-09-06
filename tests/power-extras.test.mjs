import test from 'node:test';
import assert from 'node:assert/strict';
import {
  batteryCapacityToAh,
  batteryLife,
  capacitorDischarge,
  dbmWatts,
} from '../lib/tools/power-extras.ts';

const near = (actual, expected) =>
  assert.ok(
    Math.abs(actual - expected) <= Math.max(1, Math.abs(expected)) * 1e-11,
    `${actual} != ${expected}`,
  );

await test('battery-life units and ideal constant-current estimate', () => {
  assert.equal(batteryCapacityToAh('2000', 'mAh'), 2);
  assert.equal(batteryCapacityToAh('2', 'Ah'), 2);
  const result = batteryLife('2', '.1', '100');
  assert.equal(result.usableCapacityAh, 2);
  assert.equal(result.hours, 20);
  near(result.days, 20 / 24);
  assert.equal(batteryLife('2', '.1', '50').hours, 10);
});

await test('capacitor discharge solves both directions and reports RC values', () => {
  const forward = capacitorDischarge('time', '.0001', '24', '5', '10000');
  near(forward.time, 1.5686159179138452);
  near(forward.tau, 1);
  near(forward.initialCurrent, 0.0024);
  near(forward.initialPower, 0.0576);
  near(forward.initialEnergy, 0.0288);
  near(forward.finalEnergy, 0.00125);
  near(forward.energyDissipated, 0.02755);
  near(
    capacitorDischarge('resistance', '.0001', '24', '5', String(forward.time))
      .resistance,
    10000,
  );
});

await test('dBm and watts conversion agrees in both directions', () => {
  const zero = dbmWatts('dbm', '0');
  near(zero.watts, 0.001);
  near(zero.milliwatts, 1);
  near(zero.dbw, -30);
  const thirty = dbmWatts('watts', '1');
  near(thirty.dbm, 30);
  near(thirty.dbw, 0);
  near(dbmWatts('dbm', '-30').watts, 0.000001);
});

await test('power extras reject empty, invalid, boundary, overflow and underflow inputs', () => {
  for (const raw of ['', ' ', 'wat', 'Infinity', '1e999']) {
    assert.throws(() => batteryLife(raw, '.1', '100'));
    assert.throws(() => capacitorDischarge('time', raw, '24', '5', '10000'));
    assert.throws(() => dbmWatts('dbm', raw));
  }
  for (const raw of ['0', '-1', '101'])
    assert.throws(() => batteryLife('2', '.1', raw));
  assert.throws(() => batteryLife('0', '.1', '100'));
  assert.throws(() => batteryLife('2', '0', '100'));
  assert.throws(() => batteryLife('1e308', '1e-308', '100'));
  assert.throws(() => capacitorDischarge('time', '.0001', '5', '5', '10000'));
  assert.throws(() =>
    capacitorDischarge('resistance', '.0001', '24', '5', '0'),
  );
  assert.throws(() =>
    capacitorDischarge('time', '1e308', '1e308', '5', '1e308'),
  );
  assert.throws(() => dbmWatts('dbm', '4000'));
  assert.throws(() => dbmWatts('dbm', '-4000'));
  assert.throws(() => dbmWatts('watts', '0'));
  assert.throws(() => dbmWatts('watts', '1e-400'));
  assert.throws(() => dbmWatts('watts', '1e308'));
});
