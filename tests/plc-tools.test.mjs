import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analogConvert,
  analogConvertRanges,
  analogLegacy,
  analogSignalFromEngineering,
  analogSignalFromPercentage,
  baseConvert,
  modbusConvert,
  modbusCrc,
  plcScale,
  registerFromValue,
  registerToValue,
} from '../lib/tools/plc.ts';

await test('analog conversion supports common range, engineering values, and external range conversion', () => {
  assert.equal(
    analogConvert({
      signal: '12',
      signalLow: '4',
      signalHigh: '20',
      engineeringLow: '0',
      engineeringHigh: '100',
    }).engineering,
    50,
  );
  assert.equal(analogLegacy('20', '-50', '150').value, 150);
  assert.equal(analogConvertRanges('12', '4', '20', '0', '10').target, 5);
  assert.equal(
    analogSignalFromEngineering('50', '4', '20', '0', '100').signal,
    12,
  );
  assert.equal(analogSignalFromPercentage('50', '4', '20').signal, 12);
  assert.equal(
    analogConvert({
      signal: '2',
      signalLow: '4',
      signalHigh: '20',
      engineeringLow: '0',
      engineeringHigh: '100',
    }).outside,
    true,
  );
  assert.throws(() =>
    analogConvert({
      signal: '1',
      signalLow: '20',
      signalHigh: '4',
      engineeringLow: '0',
      engineeringHigh: '1',
    }),
  );
  assert.throws(() =>
    analogConvert({
      signal: '0',
      signalLow: '-1.7e308',
      signalHigh: '1.7e308',
      engineeringLow: '0',
      engineeringHigh: '1',
    }),
  );
});

await test('base converter handles word widths and two complement bounds', () => {
  assert.equal(
    baseConvert({ raw: 'FF', base: 16, bits: 8, signed: true }).decimal,
    '-1',
  );
  assert.equal(
    baseConvert({ raw: '-1', base: 10, bits: 8, signed: true }).hex,
    'FF',
  );
  assert.equal(
    baseConvert({ raw: '8000', base: 16, bits: 16, signed: true }).decimal,
    '-32768',
  );
  assert.equal(
    baseConvert({ raw: 'FFFFFFFF', base: 16, bits: 32, signed: false }).decimal,
    '4294967295',
  );
  assert.throws(() =>
    baseConvert({ raw: '100', base: 16, bits: 8, signed: false }),
  );
  assert.throws(() =>
    baseConvert({ raw: '-1', base: 10, bits: 8, signed: false }),
  );
  assert.throws(() =>
    baseConvert({ raw: '-129', base: 10, bits: 8, signed: true }),
  );
  assert.throws(() =>
    baseConvert({ raw: '102', base: 2, bits: 8, signed: false }),
  );
});

await test('Modbus reference conventions round trip for all areas', () => {
  const holding = modbusConvert({
    area: 'holding',
    digits: 5,
    reference: '40001',
  });
  assert.equal(holding.offset, 0);
  assert.equal(holding.functionCode, '03');
  assert.equal(
    modbusConvert({ area: 'input', digits: 6, offset: '100' }).reference,
    '300101',
  );
  assert.equal(
    modbusConvert({ area: 'coil', digits: 5, sequence: '1' }).reference,
    '00001',
  );
  assert.throws(() =>
    modbusConvert({ area: 'holding', digits: 5, offset: '9999' }),
  );
  assert.throws(() =>
    modbusConvert({ area: 'holding', digits: 5, reference: '40000' }),
  );
});

await test('PLC scaling works in both directions and marks external values', () => {
  assert.equal(
    plcScale({
      raw: '13824',
      rawLow: '0',
      rawHigh: '27648',
      engineeringLow: '0',
      engineeringHigh: '100',
      direction: 'raw-to-engineering',
    }).result,
    50,
  );
  assert.equal(
    plcScale({
      raw: '50',
      rawLow: '0',
      rawHigh: '27648',
      engineeringLow: '0',
      engineeringHigh: '100',
      direction: 'engineering-to-raw',
    }).result,
    13824,
  );
  assert.equal(
    plcScale({
      raw: '30000',
      rawLow: '0',
      rawHigh: '27648',
      engineeringLow: '0',
      engineeringHigh: '100',
      direction: 'raw-to-engineering',
    }).outside,
    true,
  );
  assert.throws(() =>
    plcScale({
      raw: '0',
      rawLow: '-1.7e308',
      rawHigh: '1.7e308',
      engineeringLow: '0',
      engineeringHigh: '100',
      direction: 'raw-to-engineering',
    }),
  );
});

await test('Modbus CRC wire result matches the specification example', () => {
  const crc = modbusCrc('01 03 00 00 00 0A');
  assert.equal(crc.crc, 'CDC5');
  assert.equal(crc.wire, 'C5 CD');
  assert.equal(crc.complete, '01 03 00 00 00 0A C5 CD');
  assert.throws(() => modbusCrc('01 3G'));
});

await test('register conversion handles signed edges, float and byte order round trips', () => {
  assert.equal(registerFromValue('-32768', 'int16').registers[0], '8000');
  assert.equal(registerToValue('FFFF', 'int16').value, -1);
  const float = registerFromValue('12.5', 'float32', 'CDAB');
  assert.deepEqual(float.registers, ['0000', '4148']);
  assert.equal(
    registerToValue(float.registers.join(' '), 'float32', 'CDAB').value,
    12.5,
  );
  assert.throws(() => registerFromValue('4294967296', 'uint32'));
  assert.throws(() => registerToValue('7FC0 0000', 'float32'));
  assert.throws(() => registerFromValue('1e-50', 'float32'));
  assert.doesNotThrow(() => registerFromValue('1e-45', 'float32'));
  assert.throws(() => registerFromValue('1', 'uint16', 'WXYZ'));
  assert.throws(() => registerToValue('0001', 'uint16', 'WXYZ'));
});

await test('PLC tools reject blank, malformed, and non-finite derived outputs without UI guards', () => {
  assert.throws(() =>
    analogConvert({
      signal: '',
      signalLow: '4',
      signalHigh: '20',
      engineeringLow: '0',
      engineeringHigh: '100',
    }),
  );
  assert.throws(() => analogConvertRanges('', '4', '20', '0', '10'));
  assert.throws(() => analogSignalFromEngineering('', '4', '20', '0', '100'));
  assert.throws(() => analogSignalFromPercentage('', '4', '20'));
  assert.throws(() => analogLegacy('', '0', '100'));
  assert.throws(() =>
    baseConvert({ raw: '', base: 10, bits: 8, signed: false }),
  );
  assert.throws(() => modbusConvert({ area: 'holding', digits: 5 }));
  assert.throws(() =>
    plcScale({
      raw: '',
      rawLow: '0',
      rawHigh: '1',
      engineeringLow: '0',
      engineeringHigh: '1',
      direction: 'raw-to-engineering',
    }),
  );
  assert.throws(() => modbusCrc(''));
  assert.throws(() => registerFromValue('', 'uint16'));
  assert.throws(() => registerToValue('', 'uint16'));
  assert.throws(() =>
    analogConvert({
      signal: '1e308',
      signalLow: '0',
      signalHigh: '1',
      engineeringLow: '0',
      engineeringHigh: '1e-308',
    }),
  );
  assert.throws(() =>
    plcScale({
      raw: '1e308',
      rawLow: '0',
      rawHigh: '1',
      engineeringLow: '0',
      engineeringHigh: '1e-308',
      direction: 'raw-to-engineering',
    }),
  );
});
