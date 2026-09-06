import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeSmdCapacitor,
  decodeSmdResistor,
  encodeSmdCapacitor,
  encodeSmdResistor,
} from '../lib/tools/markings.ts';
import { smdMarkingReference } from '../lib/tools/markings.ts';
import {
  ledSeriesResistor,
  preferredResistor,
  preferredValues,
} from '../lib/tools/preferred.ts';

await test('SMD resistor markings decode and encode exact values', () => {
  assert.equal(decodeSmdResistor('472', 'three').resistance, 4700);
  assert.equal(decodeSmdResistor('1001', 'four').resistance, 1000);
  assert.equal(decodeSmdResistor('4R7', 'decimal').resistance, 4.7);
  assert.equal(decodeSmdResistor('01Y', 'eia96').resistance, 1);
  assert.equal(decodeSmdResistor('01A', 'eia96').resistance, 100);
  assert.equal(decodeSmdResistor('10C', 'eia96').resistance, 12400);
  assert.equal(decodeSmdResistor('96F', 'eia96').resistance, 97600000);
  assert.equal(decodeSmdResistor('000', 'three').resistance, 0);
  assert.throws(() => decodeSmdResistor('010', 'three'));
  assert.equal(encodeSmdResistor('4700', 'three').code, '472');
  assert.equal(encodeSmdResistor('4.7', 'decimal').code, '4R7');
  assert.equal(encodeSmdResistor('999.999', 'decimal').code, '999R999');
  assert.equal(encodeSmdResistor('1', 'eia96').code, '01Y');
  assert.throws(() => decodeSmdResistor('97Y', 'eia96'));
  assert.throws(() => decodeSmdResistor('01R', 'eia96'));
  assert.throws(() => encodeSmdResistor('1234', 'three'));
  assert.throws(() => decodeSmdResistor('', 'three'));
  assert.throws(() => decodeSmdResistor('1e309', 'three'));
  assert.throws(() => encodeSmdResistor('5e-324', 'three'));
  for (const base of smdMarkingReference.eia96Bases) {
    for (const multiplier of Object.values(
      smdMarkingReference.eia96Multipliers,
    )) {
      const value = base * multiplier;
      const encoded = encodeSmdResistor(String(value), 'eia96');
      assert.ok(
        Math.abs(decodeSmdResistor(encoded.code, 'eia96').resistance - value) <=
          Math.max(1, value) * 1e-12,
      );
    }
  }
  for (const code of ['271', '471', '561', '681', '821']) {
    const value = decodeSmdResistor(code, 'three').resistance;
    assert.equal(encodeSmdResistor(String(value), 'three').code, code);
  }
  assert.equal(
    encodeSmdResistor(
      String(decodeSmdResistor('999R999', 'decimal').resistance),
      'decimal',
    ).code,
    '999R999',
  );
});

await test('SMD capacitor markings use pF code and optional tolerance', () => {
  const decoded = decodeSmdCapacitor('104', 'K');
  assert.equal(decoded.capacitance, 100e-9);
  assert.equal(decoded.tolerance, 10);
  assert.equal(decodeSmdCapacitor('4R7').capacitance, 4.7e-12);
  assert.equal(decodeSmdCapacitor('104K').tolerance, 10);
  assert.equal(decodeSmdCapacitor('R50').capacitance, 0.5e-12);
  assert.equal(encodeSmdCapacitor('100e-9', 'J').code, '104J');
  assert.equal(encodeSmdCapacitor('4.7e-12').code, '4R7');
  assert.equal(encodeSmdCapacitor('.5e-12').code, 'R50');
  assert.equal(encodeSmdCapacitor('9.9e-12').code, '9R9');
  assert.equal(encodeSmdCapacitor('470e-12').code, '471');
  assert.equal(encodeSmdCapacitor('4.7e-10').code, '471');
  assert.equal(encodeSmdCapacitor('1e-9').code, '102');
  assert.equal(encodeSmdCapacitor('101e-12').code, '101R0');
  assert.equal(encodeSmdCapacitor('999e-12').code, '999R0');
  assert.equal(encodeSmdCapacitor('1e-12').code, '010');
  assert.equal(decodeSmdCapacitor('010').capacitance, 1e-12);
  assert.throws(() => decodeSmdCapacitor('0R0'));
  assert.throws(() => decodeSmdCapacitor('001'));
  assert.throws(() => decodeSmdCapacitor('10A'));
  assert.throws(() => encodeSmdCapacitor('5e-324'));
  assert.throws(() => encodeSmdCapacitor('1e308'));
  assert.throws(() => encodeSmdCapacitor('1.234567e-12'));
  for (let significant = 1; significant <= 99; significant++) {
    for (let exponent = 0; exponent <= 9; exponent++) {
      const code = `${String(significant).padStart(2, '0')}${exponent}`;
      const decodedValue = decodeSmdCapacitor(code).capacitance;
      const reencoded = encodeSmdCapacitor(String(decodedValue)).code;
      assert.equal(decodeSmdCapacitor(reencoded).capacitance, decodedValue);
    }
  }
});

await test('preferred values select midpoint upward and LED rounds up', () => {
  assert.equal(preferredValues('E96').length, 96);
  const preferred = preferredResistor('12.5', 'E6');
  assert.equal(preferred.lower, 10);
  assert.equal(preferred.upper, 15);
  assert.equal(preferred.nearest, 15);
  assert.deepEqual(preferredResistor('128', 'E24'), {
    target: 128,
    lower: 120,
    upper: 130,
    nearest: 130,
    errorPercent: 1.5625,
  });
  const led = ledSeriesResistor('12', '3', '3', '.02', 'E24');
  assert.equal(led.idealResistance, 150);
  assert.equal(led.selectedResistance, 150);
  assert.equal(led.actualCurrent, 0.02);
  assert.throws(() => ledSeriesResistor('9', '3', '3', '.02', 'E24'));
  assert.throws(() => ledSeriesResistor('12', '3', '1.5', '.02', 'E24'));
  assert.throws(() => preferredResistor('', 'E24'));
  assert.throws(() => preferredResistor('5e-324', 'E24'));
  assert.throws(() => ledSeriesResistor('1e308', '1', '2', '1e-320', 'E24'));
});
