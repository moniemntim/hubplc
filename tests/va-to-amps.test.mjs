import test from 'node:test';
import assert from 'node:assert/strict';
import { vaToAmps } from '../lib/tools/va-to-amps.ts';

await test('VA to amps: single phase, total three-phase power and voltage basis', () => {
  assert.equal(vaToAmps('1100', 'VA', '110', 'single').amps, 10);
  assert.equal(vaToAmps('1.1', 'kVA', '110', 'single').amps, 10);
  assert.ok(
    Math.abs(
      vaToAmps('10', 'kVA', '380', 'three-line').amps - 15.1934281365691,
    ) < 1e-10,
  );
  assert.equal(vaToAmps('6600', 'VA', '220', 'three-neutral').amps, 10);
  const a = vaToAmps(
    '6600',
    'VA',
    String(220 * Math.sqrt(3)),
    'three-line',
  ).amps;
  assert.ok(Math.abs(a - 10) < 1e-12);
  assert.equal(vaToAmps('0', 'VA', '220', 'single').amps, 0);
});

await test('VA to amps rejects invalid inputs and unrepresentable results', () => {
  for (const raw of ['', '-1', 'NaN', 'Infinity', '0x10', '1e999'])
    assert.throws(() => vaToAmps(raw, 'VA', '220', 'single'));
  for (const raw of ['', '0', '-1', 'NaN'])
    assert.throws(() => vaToAmps('1000', 'VA', raw, 'single'));
  assert.throws(() => vaToAmps('1e308', 'kVA', '220', 'single'));
  assert.throws(() => vaToAmps('1', 'VA', '5e-324', 'single'));
  assert.throws(() => vaToAmps('5e-324', 'VA', '1e308', 'single'));
  assert.throws(() => vaToAmps('1', 'W', '220', 'single'));
  assert.throws(() => vaToAmps('1', 'VA', '220', 'dc'));
});
