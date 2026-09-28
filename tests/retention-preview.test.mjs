import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { previewRecord } from '../public/examples/retention-preview/preview.mjs';
const input = JSON.parse(
  await readFile(
    new URL(
      '../public/examples/retention-preview/records.json',
      import.meta.url,
    ),
  ),
);
const base = input.records[1];
void test('fixed seven records have two candidates, one keep, one hold and three reviews', () => {
  assert.deepEqual(
    input.records.map((record) => previewRecord(record, input.asOf).status),
    ['CANDIDATE', 'CANDIDATE', 'KEEP', 'HOLD', 'REVIEW', 'REVIEW', 'REVIEW'],
  );
});
void test('expiry equality is a candidate but one second earlier is keep', () => {
  assert.equal(previewRecord(base, '2026-09-27T23:59:59Z').status, 'KEEP');
  assert.equal(previewRecord(base, input.asOf).status, 'CANDIDATE');
});
void test('remaining hold prevents eligibility; clearing all holds uses original date', () => {
  const record = input.records[3];
  assert.equal(
    previewRecord({ ...record, holds: ['DEMO-CASE-2'] }, input.asOf).status,
    'HOLD',
  );
  assert.equal(
    previewRecord({ ...record, holds: [] }, input.asOf).expiresAt,
    '2026-09-27T00:00:00.000Z',
  );
  assert.equal(
    previewRecord({ ...record, holds: null }, input.asOf).status,
    'REVIEW',
  );
});
void test('invalid dates, unknown versions and future timestamps do not become candidates', () => {
  for (const patch of [
    { closedAt: '2026-02-30T00:00:00Z' },
    { closedAt: '2026-08-29' },
    { closedAt: '2026-09-29T00:00:00Z' },
    { policyId: 'DEMO-T30-v2' },
    { holds: [''] },
    { id: '' },
  ])
    assert.equal(
      previewRecord({ ...base, ...patch }, input.asOf).status,
      'REVIEW',
    );
  assert.throws(() => previewRecord(base, '2026-02-30T00:00:00Z'), TypeError);
});
