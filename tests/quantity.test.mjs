import test from 'node:test';
import assert from 'node:assert/strict';
import { scaleQuantity, quantityUnits } from '../lib/tools/quantity.ts';

await test('all quantity units preserve SI values on display round trips', () => {
  for (const units of Object.values(quantityUnits)) {
    for (const { factor } of units) {
      for (const input of ['1', '0.1', '4700', '1e-9', '123.456']) {
        const display = scaleQuantity(input, 1 / factor);
        const recovered = Number(scaleQuantity(display, factor));
        assert.ok(Math.abs(recovered - Number(input)) <= Number(input) * 1e-13);
      }
    }
  }
});
await test('quantity conversion preserves blanks and rejects malformed and unrepresentable numbers', () => {
  assert.equal(scaleQuantity('', 1000), '');
  assert.equal(scaleQuantity('1.5', 1000), '1500');
  assert.equal(scaleQuantity('100', 1e-9), '1e-7');
  for (const value of ['abc', 'Infinity', 'NaN', '0x10', '1,000', '--2'])
    assert.throws(() => scaleQuantity(value, 1));
  assert.throws(() => scaleQuantity('1e308', 1e3));
  assert.throws(() => scaleQuantity('1e-320', 1e-12));
  for (const factor of [0, -1, Infinity, NaN])
    assert.throws(() => scaleQuantity('1', factor));
});
