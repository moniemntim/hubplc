import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acPowerConvert,
  calculatePowerFactor,
  energyAndCost,
} from '../lib/tools/power-calculators.ts';
const near = (actual, expected) =>
  assert.ok(
    Math.abs(actual - expected) < Math.max(1, Math.abs(expected)) * 1e-11,
    `${actual} != ${expected}`,
  );

await test('power conversion covers DC, single phase and balanced three phase', () => {
  const three = acPowerConvert(
    'power-to-current',
    'three',
    '10',
    'kW',
    '380',
    '0.8',
  );
  near(three.current, 10000 / (Math.sqrt(3) * 380 * 0.8));
  near(
    acPowerConvert(
      'current-to-power',
      'three',
      String(three.current),
      'A',
      '380',
      '0.8',
    ).watts,
    10000,
  );
  near(
    acPowerConvert('power-to-voltage', 'single', '2.2', 'kW', '10', '0.8')
      .voltage,
    275,
  );
  assert.equal(
    acPowerConvert('apparent-to-real', 'single', '1', 'MVA', '', '.9').watts,
    900000,
  );
  assert.equal(
    acPowerConvert('real-to-apparent', 'single', '900', 'kW', '', '.9').va,
    1000000,
  );
  assert.equal(
    acPowerConvert('current-to-power', 'dc', '10', 'A', '24', '').watts,
    240,
  );
  near(
    acPowerConvert('apparent-to-current', 'three', '10', 'kVA', '380', '')
      .current,
    10000 / (Math.sqrt(3) * 380),
  );
  assert.equal(
    acPowerConvert('apparent-units', 'single', '1', 'MVA', '', '').va,
    1000000,
  );
});

await test('power factor solves P/S and P/Q triangles', () => {
  const ps = calculatePowerFactor('active-apparent', '8', 'kW', '10', 'kVA');
  near(ps.pf, 0.8);
  near(ps.vars, 6000);
  near(ps.angleDegrees, 36.86989764584402);
  const pq = calculatePowerFactor('active-reactive', '8', 'kW', '-6', 'kvar');
  near(pq.va, 10000);
  near(pq.pf, 0.8);
  assert.equal(pq.direction, '超前');
  assert.throws(() =>
    calculatePowerFactor('active-apparent', '11', 'kW', '10', 'kVA'),
  );
});

await test('energy and cost convert power, time, kWh and joules', () => {
  const forward = energyAndCost('from-power', '1', 'kW', '8', '30', '3');
  assert.equal(forward.kwh, 240);
  assert.equal(forward.cost, 720);
  assert.equal(forward.joules, 864000000);
  const inverse = energyAndCost('from-energy', '3.6e6', 'J', '1', '', '3');
  near(inverse.kwh, 1);
  near(inverse.watts, 1000);
  near(inverse.cost, 3);
});

await test('power calculators reject invalid domains', () => {
  assert.throws(() =>
    acPowerConvert('power-to-current', 'three', '10', 'kW', '0', '.8'),
  );
  assert.throws(() =>
    acPowerConvert('real-to-apparent', 'single', '1', 'kW', '', '1.1'),
  );
  assert.throws(() =>
    calculatePowerFactor('active-reactive', '0', 'W', '0', 'var'),
  );
  assert.throws(() => energyAndCost('from-energy', '1', 'kWh', '0', '', '3'));
  assert.throws(() => energyAndCost('from-power', '-1', 'kW', '8', '30', '3'));
});
