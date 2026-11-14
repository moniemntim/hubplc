import assert from 'node:assert/strict';
import test from 'node:test';
import { convertUnitBatch } from '../lib/tools/unit-batch.ts';
import { convertUnit } from '../lib/tools/units.ts';
import { numberInput } from '../lib/tools/core.ts';
import { translateToolMessage } from '../lib/tools/error-i18n.ts';

void test('batch flow conversion preserves source rows and reports every result', () => {
  const rows = convertUnitBatch('1\n10\n\n12\r\n', 'lmin', 'm3h');
  assert.deepEqual(
    rows.map((row) => row.line),
    [1, 2, 4],
  );
  for (const [index, expected] of [0.06, 0.6, 0.72].entries())
    assert.ok(Math.abs(rows[index].value - expected) < 1e-12);
});
void test('an invalid batch row is retained and does not become a stale numeric result', () => {
  const rows = convertUnitBatch('1\nnot-a-number\n12', 'lmin', 'm3h');
  assert.equal(rows[1].line, 2);
  assert.ok(rows[1].error);
  assert.equal(rows[1].value, undefined);
  assert.ok(Math.abs(rows[2].value - 0.72) < 1e-12);
});
void test('batch conversion respects physical limits and rejects empty or excessive work', () => {
  assert.throws(() => convertUnitBatch(' \n\r\n', 'bar', 'kpa'), /至少一筆/);
  assert.throws(
    () => convertUnitBatch(Array(201).fill('1').join('\n'), 'bar', 'kpa'),
    /200/,
  );
  assert.equal(
    convertUnitBatch(Array(200).fill('1').join('\n'), 'bar', 'kpa').length,
    200,
  );
  const rows = convertUnitBatch('0\n-274', 'c', 'f');
  assert.ok(Math.abs(rows[0].value - 32) < 1e-10);
  assert.match(rows[1].error, /絕對零度/);
  assert.ok(convertUnitBatch('1', 'lmin', 'kgs')[0].error);
});
void test('nonzero values never silently underflow to zero during parsing or conversion', () => {
  assert.throws(() => numberInput('1e-400'), /過小/);
  assert.equal(numberInput('0e-400'), 0);
  assert.equal(convertUnit('1e-16', 'c', 'c'), 1e-16);
  assert.ok(Math.abs(convertUnit('1e-320', 'uf', 'nf') / 1e-317 - 1) < 0.001);
  assert.throws(() => convertUnit('1e-320', 'pa', 'bar'), /過小/);
  assert.equal(convertUnit('1e300', 'gib', 'gib'), 1e300);
  assert.equal(
    translateToolMessage('數值過小，超出可表示範圍。', 'en'),
    'Value is too small to represent.',
  );
});
