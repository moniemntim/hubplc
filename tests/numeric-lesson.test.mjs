import assert from 'node:assert/strict';
import test from 'node:test';
import { compareWithTolerance, roundRaw100 } from '../lib/numeric-lesson.ts';

void test('fixed tolerance keeps binary64 boundary and equality semantics visible', () => {
  const compare = (a, b = '25', tolerance = '0.05') =>
    compareWithTolerance({ a, b, absoluteTolerance: tolerance });
  assert.equal(compare('25.049').close, true);
  assert.equal(compare('25.051').close, false);
  assert.equal(compare('25.05').close, false);
  assert.equal(compare('1.5', '1', '0.5').close, true);
});

void test('relative tolerance applies only when explicitly requested', () => {
  const fixed = compareWithTolerance({
    a: '10000.5',
    b: '10000',
    absoluteTolerance: '0.05',
  });
  const relative = compareWithTolerance({
    a: '10000.5',
    b: '10000',
    absoluteTolerance: '0.01',
    relativeTolerance: '0.0001',
  });
  assert.equal(fixed.close, false);
  assert.equal(relative.close, true);
  assert.equal(relative.limit, 1.00005);
});

void test('invalid and overflowing comparisons do not become ordinary false results', () => {
  for (const input of [
    { a: '', b: '1', absoluteTolerance: '0.1' },
    { a: 'NaN', b: '1', absoluteTolerance: '0.1' },
    { a: '1', b: '1', absoluteTolerance: '-1' },
    { a: '1e308', b: '-1e308', absoluteTolerance: '0.1' },
  ])
    assert.throws(() => compareWithTolerance(input));
});

void test('fixed-point rounding handles negative midpoint and rejects bad raw values', () => {
  assert.equal(roundRaw100('-1235').rounded10, -124);
  assert.equal(roundRaw100('-1235').display, '-12.4');
  assert.equal(roundRaw100('1235').rounded10, 124);
  assert.equal(roundRaw100('-4').rounded10, 0);
  assert.equal(Object.is(roundRaw100('-4').rounded10, -0), false);
  for (const value of ['12.5', '100001', '-100001', '', '1e3'])
    assert.throws(() => roundRaw100(value));
});
