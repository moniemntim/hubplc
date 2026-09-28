import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  formatMean,
  formatScaled,
  summarizeBatch,
} from '../public/examples/batch-statistics/batch-statistics.mjs';

const fixturePath = fileURLToPath(
  new URL('../public/examples/batch-statistics/fixture.json', import.meta.url),
);
const { batches } = JSON.parse(await readFile(fixturePath, 'utf8'));

void test('normal batch retains integer scaled sum and rational mean', () => {
  const result = summarizeBatch(batches.normal);
  assert.deepEqual(result.mean, { numerator: 600, denominator: 3 });
  assert.equal(result.sumScaled, 600);
  assert.equal(formatMean(result.mean), '20.000000');
  assert.equal(formatScaled(result.minScaled), '10.0');
  assert.equal(formatScaled(result.maxScaled), '30.0');
});

void test('empty and all-Bad batches remain statistically undefined', () => {
  for (const name of ['empty', 'allBad']) {
    const result = summarizeBatch(batches[name]);
    assert.equal(result.validCount, 0);
    assert.equal(result.sumScaled, null);
    assert.equal(result.mean, null);
    assert.equal(result.minScaled, null);
    assert.equal(result.maxScaled, null);
  }
  assert.equal(summarizeBatch(batches.empty).status, 'NO_DATA');
  assert.equal(summarizeBatch(batches.allBad).status, 'NO_VALID_SAMPLE');
  assert.equal(summarizeBatch(batches.allBad).totalCount, 3);
});

void test('negative values initialize extrema from the first valid sample', () => {
  const result = summarizeBatch(batches.negative);
  assert.equal(result.sumScaled, -160);
  assert.equal(result.minScaled, -80);
  assert.equal(result.maxScaled, -30);
  assert.deepEqual(result.mean, { numerator: -160, denominator: 3 });
  assert.equal(formatMean(result.mean), '-5.333333');
});

void test('range endpoints are valid and an out-of-range value is rejected', () => {
  const result = summarizeBatch(batches.range);
  assert.equal(result.status, 'OK');
  assert.equal(result.validCount, 2);
  assert.equal(result.sumScaled, 1400);
  assert.equal(result.minScaled, -400);
  assert.equal(result.maxScaled, 1800);
  assert.deepEqual(result.rejected, [{ index: 2, reason: 'RANGE_REJECTED' }]);
});

void test('capacity accepts exactly four maxima and rejects a fifth input without partial statistics', () => {
  const atLimit = summarizeBatch(batches.capacityAtLimit);
  assert.equal(atLimit.status, 'OK');
  assert.equal(atLimit.inputCount, 4);
  assert.equal(atLimit.totalCount, 4);
  assert.equal(atLimit.sumScaled, 7200);

  const exceeded = summarizeBatch(batches.capacityExceeded);
  assert.equal(exceeded.status, 'INPUT_LIMIT_EXCEEDED');
  assert.equal(exceeded.inputCount, 5);
  assert.equal(exceeded.totalCount, 0);
  assert.equal(exceeded.validCount, 0);
  assert.equal(exceeded.sumScaled, null);
  assert.equal(exceeded.rejectedCount, 0);
  assert.equal(exceeded.batchError, 'CAPACITY_LIMIT');
});

void test('non-GOOD, non-integer and non-array inputs receive deterministic handling', () => {
  const rejected = summarizeBatch([
    { quality: 'GOOD', scaledValue: 10.5 },
    { quality: 'UNKNOWN', scaledValue: 20 },
  ]);
  assert.equal(rejected.status, 'NO_VALID_SAMPLE');
  assert.deepEqual(rejected.rejected, [
    { index: 0, reason: 'VALUE_NOT_SAFE_INTEGER' },
    { index: 1, reason: 'QUALITY_REJECTED' },
  ]);
  assert.throws(() => summarizeBatch({}), /samples must be an array/);
});
