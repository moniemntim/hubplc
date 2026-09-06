import test from 'node:test';
import assert from 'node:assert/strict';
import {
  capacitorNetwork,
  currentDivider,
  passiveNetwork,
  shuntFromTwo,
  shuntMeasured,
} from '../lib/tools/networks.ts';
import {
  lcResonance,
  rcFilter,
  rcFilterInverse,
  reactance,
  reactanceInverse,
} from '../lib/tools/frequency.ts';

await test('passive resistor and capacitor network formulas', () => {
  assert.equal(passiveNetwork([100, 100], 'parallel', '電阻').equivalent, 50);
  assert.equal(
    passiveNetwork([100, 220, 330], 'series', '電阻').equivalent,
    650,
  );
  assert.equal(capacitorNetwork([100e-9, 100e-9], 'series').equivalent, 50e-9);
  assert.equal(
    capacitorNetwork([100e-9, 100e-9], 'parallel').equivalent,
    200e-9,
  );
  assert.throws(() => passiveNetwork([1], 'series', '電阻'));
  assert.throws(() => capacitorNetwork([0, 1], 'parallel'));
});

await test('current divider conserves current and reports branch power', () => {
  const result = currentDivider([100, 100], 'voltage', '10');
  assert.equal(result.equivalent, 50);
  assert.equal(result.totalCurrent, 0.2);
  assert.equal(result.branches[0].current, 0.1);
  assert.equal(result.branches[1].percent, 50);
  assert.ok(
    Math.abs(
      result.branches.reduce((sum, branch) => sum + branch.current, 0) -
        result.totalCurrent,
    ) < 1e-12,
  );
  assert.throws(() => currentDivider([1, Infinity], 'current', '1'));
});

await test('shunt calculator supports inverse and zero measured signal', () => {
  const direct = shuntFromTwo('voltage', '.075', '100');
  assert.equal(direct.resistance, 0.00075);
  assert.equal(direct.power, 7.5);
  const measured = shuntMeasured('100', '.075', '.03');
  assert.equal(measured.current, 40);
  assert.equal(shuntMeasured('100', '.075', '0').current, 0);
  assert.throws(() => shuntMeasured('0', '.075', '.01'));
});

await test('RC filter and reactance inverse conversions', () => {
  const filter = rcFilter('lowpass', '10000', '0.0000001', '159.1549430919');
  assert.ok(Math.abs(filter.cutoff - 159.1549430919) < 1e-7);
  assert.ok(Math.abs(filter.gain - Math.SQRT1_2) < 1e-10);
  assert.ok(
    Math.abs(
      rcFilterInverse(String(filter.cutoff), '.0000001').resistance - 10000,
    ) < 1e-7,
  );
  const cap = reactance('capacitor', '1000', '.000001');
  assert.ok(Math.abs(cap.magnitude - 159.1549430919) < 1e-7);
  assert.ok(
    Math.abs(
      reactanceInverse('capacitor', '1000', String(cap.magnitude)).component -
        0.000001,
    ) < 1e-15,
  );
  assert.throws(() => reactance('inductor', '-1', '1'));
});

await test('LC resonance forward and inverse calculations', () => {
  const forward = lcResonance('lc', '.001', '.000001');
  assert.ok(Math.abs(forward.frequency - 5032.92121045) < 1e-6);
  const inverse = lcResonance('lf', '.001', String(forward.frequency));
  assert.ok(Math.abs(inverse.capacitance - 0.000001) < 1e-15);
  assert.throws(() => lcResonance('cf', '1', '0'));
});
