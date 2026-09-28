import assert from 'node:assert/strict';
import test from 'node:test';
import { Buffer } from 'node:buffer';
import {
  decodeBinary32,
  encodeBinary32,
  gateBinary32,
  multiplyFiniteToBinary32,
} from '../public/examples/float-gate/float-gate-model.mjs';

const range = { min: 0, max: 2 };
const sourceRecord = (bytes, endian = 'be', quality = 'good') => ({
  bytes,
  endian,
  quality,
  range,
  provenance: 'SOURCE_BYTES',
});

void test('big-endian and little-endian binary32 1.0 decode identically only with their declared byte order', () => {
  assert.deepEqual(
    [
      decodeBinary32(Buffer.from('3f800000', 'hex'), 'be').value,
      decodeBinary32(Buffer.from('0000803f', 'hex'), 'le').value,
    ],
    [1, 1],
  );
  assert.notEqual(
    decodeBinary32(Buffer.from('0000803f', 'hex'), 'be').value,
    1,
  );
  const wrongButLegalEndian = gateBinary32(
    sourceRecord(Buffer.from('0000803f', 'hex'), 'be'),
  );
  assert.equal(wrongButLegalEndian.decision, 'ACCEPT');
  assert.equal(wrongButLegalEndian.finite, true);
  assert.notEqual(wrongButLegalEndian.value, 1);
});

void test('representative NaN bit patterns and both infinities are nonfinite without inferring an external root cause', () => {
  const cases = [
    ['7fc00001', '0x400001'],
    ['7fc0dead', '0x40dead'],
    ['7f800001', '0x000001'],
    ['ff800001', '0x000001'],
    ['7f800000', null],
    ['ff800000', null],
  ];
  for (const [hex, payload] of cases) {
    const result = gateBinary32(sourceRecord(Buffer.from(hex, 'hex')));
    assert.equal(result.decision, 'NONFINITE_REJECTED');
    assert.equal(result.provenance, 'SOURCE_BYTES');
    if (payload !== null) assert.equal(result.fractionHex, payload);
  }
});

void test('negative zero and the smallest positive subnormal remain finite binary32 values', () => {
  const negativeZero = gateBinary32(
    sourceRecord(Buffer.from('80000000', 'hex')),
  );
  const smallestSubnormal = gateBinary32(
    sourceRecord(Buffer.from('00000001', 'hex')),
  );
  assert.equal(Object.is(negativeZero.value, -0), true);
  assert.equal(negativeZero.decision, 'ACCEPT');
  assert.equal(smallestSubnormal.value, 1.401298464324817e-45);
  assert.equal(smallestSubnormal.decision, 'ACCEPT');
});

void test('quality and inclusive range are separate gates after finiteness', () => {
  assert.equal(
    gateBinary32(sourceRecord(encodeBinary32(0, 'be'))).decision,
    'ACCEPT',
  );
  assert.equal(
    gateBinary32(sourceRecord(encodeBinary32(2, 'be'))).decision,
    'ACCEPT',
  );
  assert.equal(
    gateBinary32(sourceRecord(encodeBinary32(3, 'be'))).decision,
    'RANGE_REJECTED',
  );
  assert.equal(
    gateBinary32(sourceRecord(encodeBinary32(1, 'be'), 'be', 'bad')).decision,
    'QUALITY_REJECTED',
  );
});

void test('format mistakes reject before a value can be used', () => {
  assert.equal(
    gateBinary32(sourceRecord(Buffer.from([0, 0, 128]), 'le')).decision,
    'FORMAT_REJECTED',
  );
  assert.equal(
    gateBinary32(sourceRecord(Buffer.alloc(4), 'network')).decision,
    'FORMAT_REJECTED',
  );
  assert.equal(
    gateBinary32(sourceRecord(Uint8Array.of(0, 0, 128, 63))).decision,
    'FORMAT_REJECTED',
  );
  assert.equal(
    gateBinary32(sourceRecord(encodeBinary32(1, 'be'), 'be', 'unknown'))
      .decision,
    'FORMAT_REJECTED',
  );
  assert.equal(
    gateBinary32({
      ...sourceRecord(encodeBinary32(1, 'be')),
      range: { min: 2, max: 0 },
    }).decision,
    'FORMAT_REJECTED',
  );
  assert.equal(gateBinary32(null).decision, 'FORMAT_REJECTED');
  assert.equal(
    gateBinary32({
      ...sourceRecord(encodeBinary32(1, 'be')),
      provenance: '',
    }).decision,
    'FORMAT_REJECTED',
  );
});

void test('only the explicit synthetic f32 operation labels its overflow provenance', () => {
  const operation = multiplyFiniteToBinary32(3.4e38, 2, 'be');
  assert.equal(operation.provenance, 'FINITE_OPERATION_F32_OVERFLOW');
  assert.equal(operation.bytes.toString('hex'), '7f800000');
  assert.throws(() => multiplyFiniteToBinary32(Infinity, 2), RangeError);
  assert.throws(
    () => multiplyFiniteToBinary32(Number.MAX_VALUE, 1),
    RangeError,
  );
});

void test('returned diagnostic range is a snapshot rather than a mutable input reference', () => {
  const mutableRange = { min: 0, max: 2 };
  const result = gateBinary32({
    ...sourceRecord(encodeBinary32(1, 'be')),
    range: mutableRange,
  });
  mutableRange.max = -1;
  assert.deepEqual(result.range, { min: 0, max: 2 });
});
