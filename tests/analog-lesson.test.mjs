import assert from 'node:assert/strict';
import test from 'node:test';
import { assessAnalog } from '../lib/analog-lesson.ts';
const input = (signal) => ({
  signal,
  signalLow: '4',
  signalHigh: '20',
  engineeringLow: '0',
  engineeringHigh: '10',
});
void test('lesson distinguishes arithmetic from available measurement without inventing wire diagnosis', () => {
  for (const [x, y] of [
    ['4', 0],
    ['12', 5],
    ['20', 10],
  ])
    assert.equal(assessAnalog(input(x), 'good').usableValue, y);
  for (const x of ['0', '3.2', '20.5', '22']) {
    const r = assessAnalog(input(x), 'good');
    assert.equal(r.state, 'OUT_OF_RANGE');
    assert.equal(r.usableValue, null);
    assert.ok(Number.isFinite(r.engineering));
  }
  assert.equal(assessAnalog(input('12'), 'bad').state, 'SOURCE_BAD');
  assert.equal(assessAnalog(input('12'), 'unknown').usableValue, null);
  assert.equal(
    assessAnalog(
      { ...input('2000'), signalLow: '0', signalHigh: '4000' },
      'good',
    ).usableValue,
    5,
  );
  assert.throws(() => assessAnalog(input(''), 'good'), /請填寫/);
  assert.throws(
    () => assessAnalog({ ...input('12'), signalHigh: '4' }, 'good'),
    /上限/,
  );
  assert.throws(() => assessAnalog(input('NaN'), 'good'), /數字/);
  assert.throws(() => assessAnalog(input('12'), 'invented'), /未知/);
});
