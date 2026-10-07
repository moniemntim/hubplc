import assert from 'node:assert/strict';
import test from 'node:test';
import {
  branchVoltageExample,
  eventCoverageExample,
  hotPlugExample,
  redundancyExample,
} from '../lib/power-lesson.ts';

void test('branch example includes both conductors and contact resistance', () => {
  const near = (actual, expected) =>
    assert.ok(Math.abs(actual - expected) < 1e-12);
  const normal = branchVoltageExample('24', '0.1', '30', '0.018', '0', '23.8');
  near(normal.loopResistance, 1.08);
  near(normal.drop, 0.108);
  near(normal.loadVoltage, 23.892);
  assert.equal(normal.pass, true);
  const bad = branchVoltageExample('24', '0.15', '30', '0.018', '0.5', '23.8');
  near(bad.loopResistance, 1.58);
  near(bad.loadVoltage, 23.763);
  assert.equal(bad.pass, false);
});

void test('redundancy example evaluates the remaining source alone', () => {
  const fail = redundancyExample('24', '16', '18', '0.6', '0.05', '23');
  assert.equal(fail.capacityMargin, -2);
  assert.equal(fail.loadVoltage, 22.5);
  assert.equal(fail.pass, false);
  const pass = redundancyExample('24', '20', '12', '0.1', '0.02', '23');
  assert.equal(pass.loadVoltage, 23.66);
  assert.equal(pass.pass, true);
});

void test('hot-plug estimate separates load current from charging current', () => {
  const result = hotPlugExample('24', '1000', '1', '0.8');
  assert.ok(Math.abs(result.energy - 0.288) < 1e-12);
  assert.ok(Math.abs(result.chargeTime - 0.12) < 1e-12);
  assert.equal(hotPlugExample('24', '1000', '1', '1.2').chargeTime, null);
});

void test('event coverage keeps sampling and clock uncertainty separate', () => {
  assert.deepEqual(eventCoverageExample('100', '50', '20', '100'), {
    detectionGuaranteed: false,
    relativeUncertainty: 200,
    ordered: false,
    order: '時間重疊，不能判先後',
  });
  const ordered = eventCoverageExample('10', '50', '250', '20');
  assert.equal(ordered.detectionGuaranteed, true);
  assert.equal(ordered.order, '事件 B 較晚');
  for (const args of [
    ['', '1', '1', '1'],
    ['0', '1', '1', '1'],
    ['1', '-1', '1', '1'],
  ])
    assert.throws(() => eventCoverageExample(...args));
});
