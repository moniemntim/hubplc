import assert from 'node:assert/strict';
import test from 'node:test';
import {
  actuatorPathExample,
  analogLoadExample,
  inputProtectionExample,
  switchLossExample,
} from '../lib/io-path-lesson.ts';

const near = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} != ${expected}`);

void test('analog load separates loading error from ground offset', () => {
  const high = analogLoadExample('10', '100', '1000000', '0.2');
  near(high.loaded, 10000000 / 1000100);
  near(high.measured, high.loaded + 0.2);
  assert.equal(high.outside, true);
  const low = analogLoadExample('10', '100', '10000', '0');
  near(low.loaded, 100000 / 10100);
  near(low.loadingError, -10000 / 10100);
});

void test('switch example compares loss and inductive decay under named inputs', () => {
  const result = switchLossExample('24', '0.2', '0.15', '0.9', '100', '24');
  near(result.mosfetLoss, 0.006);
  near(result.bjtLoss, 0.18);
  near(result.energy, 0.002);
  near(result.idealDecay, 0.0008333333333333334);
  const diode = switchLossExample('24', '0.2', '0.15', '0.9', '100', '0.7');
  assert.ok(diode.idealDecay > result.idealDecay);
});

void test('input protection must pass low and high voltage budgets', () => {
  const fail = inputProtectionExample(
    '18',
    '29',
    '3',
    '0.7',
    '0.2',
    '18',
    '30',
    '48',
    '36',
  );
  near(fail.loadVoltage, 16.7);
  near(fail.loss, 2.1);
  assert.equal(fail.lowSidePass, false);
  assert.equal(fail.normalPass, true);
  assert.equal(fail.clampPass, false);
  assert.equal(fail.pass, false);
  const pass = inputProtectionExample(
    '20',
    '29',
    '3',
    '0.1',
    '0.1',
    '18',
    '30',
    '34',
    '36',
  );
  assert.equal(pass.pass, true);
  assert.throws(() =>
    inputProtectionExample('30', '29', '1', '0', '0', '1', '30', '30', '30'),
  );
});

void test('actuator example uses the voltage across both coil terminals', () => {
  assert.equal(
    actuatorPathExample('24', '24', '120', '0', '20').verdict,
    '先查供電、輸出與返回路徑',
  );
  const good = actuatorPathExample('24', '0.2', '120', '0.198', '20');
  near(good.coilVoltage, 23.8);
  near(good.expectedCurrent, 23.8 / 120);
  assert.equal(good.verdict, '電氣層初步成立，往閥、氣源與機構查');
  const open = actuatorPathExample('24', '0', '120', '0.01', '20');
  assert.equal(open.verdict, '電壓存在但電流不足，查開路或高阻');
});
