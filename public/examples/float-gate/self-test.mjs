import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { Buffer } from 'node:buffer';
import { gateBinary32, multiplyFiniteToBinary32 } from './float-gate-model.mjs';

const fixture = JSON.parse(
  await readFile(new URL('./fixture.json', import.meta.url), 'utf8'),
);

const gateFixture = (record) =>
  gateBinary32({
    ...record,
    bytes: Buffer.from(record.bytes),
    range: fixture.range,
  });

void test('fixture accepts only finite, good-quality, in-range values', () => {
  const decisions = Object.fromEntries(
    fixture.records.map((record) => [record.id, gateFixture(record).decision]),
  );
  assert.deepEqual(decisions, {
    be_one: 'ACCEPT',
    le_one: 'ACCEPT',
    nan_payload_a: 'NONFINITE_REJECTED',
    nan_payload_b: 'NONFINITE_REJECTED',
    pos_inf: 'NONFINITE_REJECTED',
    neg_inf: 'NONFINITE_REJECTED',
    finite_out_of_range: 'RANGE_REJECTED',
    finite_bad_quality: 'QUALITY_REJECTED',
    format_short: 'FORMAT_REJECTED',
  });
});

void test('distinct NaN payload bits are preserved and finite operation overflow has explicit model evidence', () => {
  const nanA = gateFixture(fixture.records[2]);
  const nanB = gateFixture(fixture.records[3]);
  assert.equal(nanA.fractionHex, '0x400001');
  assert.equal(nanB.fractionHex, '0x40dead');
  const operation = multiplyFiniteToBinary32(3.4e38, 2);
  assert.equal(operation.bytes.toString('hex'), '7f800000');
  assert.equal(operation.provenance, 'FINITE_OPERATION_F32_OVERFLOW');
  assert.equal(
    gateBinary32({
      bytes: operation.bytes,
      endian: operation.endian,
      quality: 'good',
      range: fixture.range,
      provenance: operation.provenance,
    }).decision,
    'NONFINITE_REJECTED',
  );
});
