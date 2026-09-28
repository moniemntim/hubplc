import assert from 'node:assert/strict';
import test from 'node:test';
import { aliasExample } from '../lib/alias-lesson.ts';
void test('alias folding preserves phase-aware samples and Nyquist ambiguity', () => {
  for (const [f, fs, a, s] of [
    [10, 100, 10, 10],
    [49, 100, 49, 49],
    [51, 100, 49, -49],
    [70, 100, 30, -30],
    [130, 100, 30, 30],
    [70, 200, 70, 70],
    [100, 100, 0, 0],
  ])
    for (const p of [0, 37, 90]) {
      const r = aliasExample(String(f), String(fs), String(p));
      assert.equal(r.alias, a);
      assert.equal(r.signed, s);
      for (const row of r.rows)
        assert.ok(Math.abs(row.original - row.equivalent) < 1e-12);
    }
  const zero = aliasExample('50', '100', '0');
  assert.ok(zero.rows.every((r) => Math.abs(r.original) < 1e-12));
  const phase = aliasExample('50', '100', '90');
  phase.rows.forEach((r, i) =>
    assert.ok(Math.abs(r.original - (i % 2 ? -1 : 1)) < 1e-12),
  );
  for (const args of [
    ['', '100', '0'],
    ['-1', '100', '0'],
    ['70', '0', '0'],
    ['70', '100', '361'],
    ['10001', '100', '0'],
  ])
    assert.throws(() => aliasExample(...args));
});
