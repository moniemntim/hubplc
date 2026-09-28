import assert from 'node:assert/strict';
import test from 'node:test';
import { filterSequence } from '../lib/filter-lesson.ts';
void test('invalid samples clear the window and retain only explicitly old values', () => {
  const rows = filterSequence(
    '12000,12000,12000,16384,16384,11800,11950,12010',
    true,
  );
  assert.deepEqual(
    rows.map((r) => r.state),
    ['Warmup', 'Warmup', 'Good', 'Bad', 'Bad', 'Warmup', 'Warmup', 'Good'],
  );
  assert.deepEqual(
    rows.map((r) => r.current),
    [null, null, 7.5, null, null, null, null, 7.45],
  );
  assert.deepEqual(
    rows.map((r) => r.age),
    [null, null, 0, 100, 200, 300, 400, 0],
  );
  assert.equal(rows[7].mean, 11920);
  const missing = filterSequence('1000,1010,1005,x,1007,1008,1009', true);
  assert.equal(missing[3].raw, null);
  assert.equal(missing[3].count, 0);
  assert.equal(missing[6].current, 0.63);
  assert.equal(filterSequence('0,0,0', true)[2].current, 0);
  assert.equal(filterSequence('16000,16000,16000', true)[2].current, 10);
  assert.equal(filterSequence('-1', true)[0].state, 'Bad');
});
void test('peak attenuation and step response are reproducible without invented padding', () => {
  const rows = filterSequence('10,10,50,10,10', false);
  assert.deepEqual(
    rows.map((r) => r.mean),
    [null, null, 70 / 3, 70 / 3, 70 / 3],
  );
  assert.equal(rows.filter((r) => r.raw > 30).length, 1);
  assert.equal(rows.filter((r) => r.current > 30).length, 0);
  assert.deepEqual(
    filterSequence('10,10,10,50,50,50', false).map((r) => r.current),
    [null, null, 10, 70 / 3, 110 / 3, 50],
  );
  for (const text of [
    '',
    '10,,20',
    'NaN',
    'Infinity',
    '1000001',
    Array(31).fill('1').join(','),
  ])
    assert.throws(() => filterSequence(text, false));
});
