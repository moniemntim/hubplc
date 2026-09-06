import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acElectrical,
  dcElectrical,
  dividerInverse,
  rcTime,
  resistorColor,
  resistorColorReverse,
  resistorNetwork,
  timer555Astable,
  timer555AstableInverse,
  timer555Mono,
  timer555MonoInverse,
  voltageDivider,
} from '../lib/tools/electrical.ts';

await test('unloaded voltage divider forward and inverse', () => {
  const r = voltageDivider('24', '10000', '10000');
  assert.ok(Math.abs(r.vout - 12) < 1e-12);
  assert.equal(r.current, 0.0012);
  assert.equal(dividerInverse('24', '12', '10000').r2, 10000);
  assert.throws(() => dividerInverse('24', '24', '1'));
});
await test('DC and AC electrical relations', () => {
  assert.deepEqual(dcElectrical('v', '24', 'r', '12'), {
    v: 24,
    i: 2,
    r: 12,
    p: 48,
  });
  const ac = acElectrical('three', '400', '.8', 'power', '10000');
  assert.ok(Math.abs(ac.i - 18.042) < 0.001);
  assert.equal(ac.va, 12500);
  assert.throws(() => acElectrical('single', '220', '1.1', 'power', '10'));
});
await test('555 formulas use NE555 thresholds and inverse consistency', () => {
  assert.ok(
    Math.abs(timer555Mono('1000000', '.000001').time - Math.log(3)) < 1e-14,
  );
  assert.ok(
    Math.abs(timer555MonoInverse(String(Math.log(3)), '.000001').r - 1000000) <
      1e-7,
  );
  const forward = timer555Astable('10000', '10000', '.000001');
  assert.ok(Math.abs(forward.frequency - 48.0898) < 0.001);
  const reverse = timer555AstableInverse(
    String(forward.frequency),
    String(forward.duty),
    '.000001',
  );
  assert.ok(Math.abs(reverse.ra - 10000) < 1e-7);
  assert.throws(() => timer555AstableInverse('10', '50', '.000001'));
});
await test('resistor color and resistor network boundaries', () => {
  const r = resistorColor(4, ['brown', 'black', 'red', 'gold']);
  assert.equal(r.resistance, 1000);
  assert.equal(r.minimum, 950);
  assert.deepEqual(resistorColorReverse('1000', 4, 'gold').bands, [
    'brown',
    'black',
    'red',
    'gold',
  ]);
  assert.deepEqual(resistorColorReverse('4.7', 4, 'gold').bands, [
    'yellow',
    'violet',
    'gold',
    'gold',
  ]);
  assert.throws(() => resistorColorReverse('1234', 4, 'gold'));
  assert.equal(resistorNetwork('100, 100', 'parallel').resistance, 50);
  assert.equal(resistorNetwork('100 220 330', 'series').resistance, 650);
  assert.throws(() => resistorNetwork('100', 'series'));
});
await test('RC charge and discharge values', () => {
  const charge = rcTime('10000', '.0001', '1', 'charge', '5');
  assert.equal(charge.tau, 1);
  assert.ok(Math.abs(charge.voltage - 5 * (1 - Math.exp(-1))) < 1e-12);
  const discharge = rcTime('10000', '.0001', '0', 'discharge', '5');
  assert.equal(discharge.voltage, 5);
  assert.throws(() => rcTime('0', '1', '1', 'charge', '5'));
});

await test('DC supports all six independent known pairs', () => {
  const pairs = [
    ['v', '24', 'i', '2'],
    ['v', '24', 'r', '12'],
    ['v', '24', 'p', '48'],
    ['i', '2', 'r', '12'],
    ['i', '2', 'p', '48'],
    ['r', '12', 'p', '48'],
  ];
  for (const [a, av, b, bv] of pairs) {
    assert.deepEqual(dcElectrical(a, av, b, bv), { v: 24, i: 2, r: 12, p: 48 });
  }
  assert.throws(() => dcElectrical('v', '', 'i', '2'));
  assert.throws(() => dcElectrical('v', '24', 'v', '2'));
  assert.throws(() => dcElectrical('v', '1e308', 'i', '1e308'));
});

await test('all calculators reject malformed, overflow, and underflow inputs', () => {
  assert.throws(() => voltageDivider('', '1', '1'));
  assert.throws(() => voltageDivider('1e308', '1e308', '1e308'));
  assert.throws(() => voltageDivider('5e-324', '1e307', '1e307'));
  assert.throws(() => dividerInverse('10', '11', '1'));
  assert.throws(() => acElectrical('single', '220', '0', 'power', '1'));
  assert.throws(() => acElectrical('three', '1e308', '1', 'current', '1e308'));
  assert.throws(() => timer555Mono('', '1e-6'));
  assert.throws(() => timer555Mono('1e308', '1e308'));
  assert.throws(() => timer555Astable('1e-320', '1e-320', '1e-320'));
  assert.throws(() => timer555MonoInverse('5e-324', '1e308'));
  assert.throws(() => timer555AstableInverse('1e308', '60', '1e308'));
  assert.throws(() => resistorColor(4, ['black', 'black', 'red', 'gold']));
  assert.throws(() => resistorColor(4, ['brown', 'black', 'red', 'pink']));
  assert.throws(() => resistorNetwork('1, nope', 'series'));
  assert.throws(() => resistorNetwork('1e308, 1e308', 'series'));
  assert.equal(resistorNetwork('5e-324, 5e-324', 'series').resistance, 1e-323);
  assert.throws(() => rcTime('1e-320', '1e-320', '1', 'charge', '5'));
  assert.throws(() => rcTime('1', '1', '-1', 'charge', '5'));
});

await test('inverse calculators round trip independent values', () => {
  const divider = dividerInverse('18', '6', '3300');
  assert.ok(
    Math.abs(voltageDivider('18', '3300', String(divider.r2)).vout - 6) < 1e-12,
  );
  const mono = timer555Mono('4700', '.0000022');
  assert.ok(
    Math.abs(timer555MonoInverse(String(mono.time), '.0000022').r - 4700) <
      1e-8,
  );
  const astable = timer555Astable('3300', '6800', '.00000047');
  const reverse = timer555AstableInverse(
    String(astable.frequency),
    String(astable.duty),
    '.00000047',
  );
  assert.ok(Math.abs(reverse.ra - 3300) < 1e-7);
  assert.ok(Math.abs(reverse.rb - 6800) < 1e-7);
});
