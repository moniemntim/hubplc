import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analogConvert,
  modbusConvert,
  plcScale,
  registerFromValue,
  registerToValue,
} from '../lib/tools/plc.ts';

await test('documented analog pressure vectors reproduce in calculator functions', () => {
  for (const [signal, engineering, percentage] of [
    ['4', 0, 0],
    ['12', 5, 50],
    ['20', 10, 100],
  ]) {
    const result = analogConvert({
      signal,
      signalLow: '4',
      signalHigh: '20',
      engineeringLow: '0',
      engineeringHigh: '10',
    });
    assert.equal(result.engineering, engineering);
    assert.equal(result.percentage, percentage);
    assert.equal(result.outside, false);
  }
  const outside = analogConvert({
    signal: '3.2',
    signalLow: '4',
    signalHigh: '20',
    engineeringLow: '0',
    engineeringHigh: '10',
  });
  assert.ok(Math.abs(outside.engineering + 0.5) < 1e-12);
  assert.ok(Math.abs(outside.percentage + 5) < 1e-12);
  assert.equal(outside.outside, true);
  assert.equal(
    plcScale({
      raw: '2000',
      rawLow: '0',
      rawHigh: '4000',
      engineeringLow: '0',
      engineeringHigh: '10',
      direction: 'raw-to-engineering',
    }).result,
    5,
  );
});

await test('documented Modbus address and register decoding vectors reproduce', () => {
  assert.deepEqual(
    modbusConvert({ area: 'holding', digits: 5, reference: '40010' }),
    {
      reference: '40010',
      offset: 9,
      sequence: 10,
      hex: '0009',
      functionCode: '03',
      area: 'Holding Register (4x)',
    },
  );
  assert.deepEqual(modbusConvert({ area: 'input', digits: 6, offset: '100' }), {
    reference: '300101',
    offset: 100,
    sequence: 101,
    hex: '0064',
    functionCode: '04',
    area: 'Input Register (3x)',
  });
  assert.equal(registerToValue('4148 0000', 'float32', 'ABCD').value, 12.5);
  assert.equal(registerToValue('0000 4148', 'float32', 'CDAB').value, 12.5);
  assert.equal(
    registerFromValue('12.5', 'float32', 'ABCD').registers.join(' '),
    '4148 0000',
  );
  assert.equal(registerToValue('FFF6', 'int16').value, -10);
  assert.throws(() => registerToValue('4148', 'float32'), /2 個四位 HEX/);
});
