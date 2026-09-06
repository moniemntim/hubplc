import test from 'node:test';
import assert from 'node:assert/strict';
import {
  passiveNetwork,
  capacitorNetwork,
  currentDivider,
  shuntFromTwo,
  shuntMeasured,
} from '../lib/tools/networks.ts';
import {
  rcFilter,
  rcFilterInverse,
  reactance,
  reactanceInverse,
  lcResonance,
} from '../lib/tools/frequency.ts';
const near = (a, b) =>
  assert.ok(Math.abs(a - b) <= Math.abs(b) * 1e-11, `${a} != ${b}`);
await test('every supported network size obeys series/parallel identities and conservation', () => {
  for (let n = 2; n <= 20; n++) {
    const rs = Array.from({ length: n }, (_, i) => (i + 1) * 100);
    const series = passiveNetwork(rs, 'series', '電阻');
    near(series.equivalent, (100 * n * (n + 1)) / 2);
    near(
      passiveNetwork(Array(n).fill(100), 'parallel', '電阻').equivalent,
      100 / n,
    );
    near(capacitorNetwork(Array(n).fill(1e-7), 'series').equivalent, 1e-7 / n);
    near(
      capacitorNetwork(Array(n).fill(1e-7), 'parallel').equivalent,
      n * 1e-7,
    );
    const current = currentDivider(rs, 'current', '.1');
    near(
      current.branches.reduce((s, b) => s + b.current, 0),
      0.1,
    );
    near(
      current.branches.reduce((s, b) => s + b.percent, 0),
      100,
    );
    near(
      current.branches.reduce((s, b) => s + b.power, 0),
      current.totalPower,
    );
    const voltage = currentDivider(rs, 'voltage', String(current.voltage));
    near(voltage.totalCurrent, 0.1);
  }
  for (const rs of [
    [],
    [1],
    Array(21).fill(1),
    [0, 1],
    [-1, 1],
    [NaN, 1],
    [Infinity, 1],
    [1e308, 1e308],
  ])
    assert.throws(() => passiveNetwork(rs, 'series', '電阻'));
  assert.throws(() => passiveNetwork([1e-320, 1e-320], 'parallel', '電阻'));
});
await test('frequency formulas round trip across component scales and modes', () => {
  for (const r of [1, 1e3, 1e6])
    for (const c of [1e-12, 1e-9, 1e-6]) {
      const fc = 1 / (2 * Math.PI * r * c);
      near(rcFilterInverse(String(fc), String(c)).resistance, r);
      for (const type of ['lowpass', 'highpass']) {
        const result = rcFilter(type, String(r), String(c), String(fc));
        near(result.gain, Math.SQRT1_2);
        near(result.gainDb, -3.010299956639812);
        near(result.phaseDeg, type === 'lowpass' ? -45 : 45);
      }
    }
  for (const kind of ['capacitor', 'inductor'])
    for (const v of [1e-9, 0.01, 10])
      for (const f of [1, 1e3, 1e6]) {
        const forward = reactance(kind, String(f), String(v));
        near(
          reactanceInverse(kind, String(f), String(forward.magnitude))
            .component,
          v,
        );
      }
  for (const l of [1e-6, 0.01, 1])
    for (const c of [1e-12, 1e-6, 0.001]) {
      const forward = lcResonance('lc', String(l), String(c));
      near(
        lcResonance('lf', String(l), String(forward.frequency)).capacitance,
        c,
      );
      near(
        lcResonance('cf', String(c), String(forward.frequency)).inductance,
        l,
      );
    }
});
await test('shunt inverses, zero measured signal, and every numeric parser rejects malformed values', () => {
  const x = shuntFromTwo('voltage', '.075', '100');
  near(x.resistance, 0.00075);
  near(x.power, 7.5);
  near(shuntFromTwo('current', '100', '.00075').voltage, 0.075);
  near(shuntFromTwo('resistance', '.00075', '.075').current, 100);
  near(shuntMeasured('100', '.075', '.0375').current, 50);
  assert.equal(shuntMeasured('100', '.075', '0').power, 0);
  for (const raw of [
    '',
    ' ',
    'wat',
    '0x10',
    '1,000',
    'NaN',
    'Infinity',
    '1e999',
    '0',
    '-1',
    '1e-400',
  ]) {
    for (const fn of [
      () => currentDivider([100, 100], 'voltage', raw),
      () => shuntFromTwo('voltage', raw, '100'),
      () => shuntMeasured(raw, '.075', '.01'),
      () => rcFilter('lowpass', raw, '1e-6', '100'),
      () => rcFilterInverse(raw, '1e-6'),
      () => reactance('capacitor', raw, '1e-6'),
      () => reactanceInverse('inductor', '100', raw),
      () => lcResonance('lc', raw, '1e-6'),
    ])
      assert.throws(fn, raw);
  }
  assert.throws(() => shuntMeasured('100', '.075', '-1'));
  assert.throws(() => shuntFromTwo('current', '1e308', '1e308'));
  assert.throws(() => rcFilter('lowpass', '1e308', '1e308', '1'));
  assert.throws(() => reactance('inductor', '1e308', '1e308'));
  assert.throws(() => lcResonance('lc', '1e-300', '1e-300'));
});
