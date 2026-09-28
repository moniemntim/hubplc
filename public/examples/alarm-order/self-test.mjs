import assert from 'node:assert/strict';
import test from 'node:test';
import { createSnapshot, identity, page, partition } from './model.mjs';
import { rows, makeRow } from './fixtures.mjs';
void test('all 720 input permutations have one total order and snapshot id', () => {
  const expected = createSnapshot(rows);
  assert.deepEqual(expected.rows.map(identity), [
    'S1/PRESSURE/C',
    'S1/PRESSURE/E',
    'S2/PRESSURE/C',
    'S1/PRESSURE/A',
    'S1/PRESSURE/D',
    'S1/PRESSURE/B',
  ]);
  function visit(prefix, left) {
    if (!left.length) {
      assert.equal(createSnapshot(prefix).id, expected.id);
      return;
    }
    for (let i = 0; i < left.length; i++)
      visit(
        [...prefix, left[i]],
        left.filter((_, j) => i !== j),
      );
  }
  visit([], rows);
});
void test('identity distinguishes sources; duplicates agree or reject the whole snapshot', () => {
  const snapshot = createSnapshot(rows);
  assert.equal(
    createSnapshot([...rows, structuredClone(rows[0])]).id,
    snapshot.id,
  );
  assert.throws(
    () => createSnapshot([...rows, { ...rows[0], acked: true }]),
    /CONFLICTING/,
  );
  assert.throws(
    () => createSnapshot([makeRow('X', { severity: 0 })]),
    /SEVERITY/,
  );
  assert.throws(
    () =>
      createSnapshot([makeRow('X', { eventTime: '2026-02-30T00:00:00.000Z' })]),
    /INVALID_DATE/,
  );
  assert.throws(
    () => createSnapshot([makeRow('X', { eventTime: null })]),
    /TIME_MISSING/,
  );
  assert.throws(
    () => createSnapshot([makeRow('X', { sourceId: 'S1\n' })]),
    /IDENTITY/,
  );
  assert.throws(() => createSnapshot(Array(2)), /RECORD_SHAPE/);
  assert.throws(() => createSnapshot(Array(101).fill(rows[0])), /100/);
});
void test('fixed snapshot pages survive insertion and state partitions preserve every occurrence', () => {
  const input = structuredClone(rows),
    old = createSnapshot(input);
  const first = page(old, 0, 3);
  input.push(makeRow('NEW', { severity: 1000 }));
  input[0].acked = true;
  const second = page(old, 3, 3),
    current = createSnapshot(input);
  assert.deepEqual([...first, ...second], old.rows);
  assert.equal(current.rows[0].occurrenceId, 'NEW');
  assert.equal(old.rows.find((x) => x.occurrenceId === 'A').acked, false);
  assert.throws(() => {
    old.rows[0].severity = 1;
  }, TypeError);
  const groups = partition(old);
  assert.equal(groups.activeAcked.length, 1);
  assert.equal(groups.inactiveUnacked.length, 1);
  assert.equal(Object.values(groups).flat().length, 6);
  assert.throws(() => page(old, -1, 3), /PAGE_BOUNDS/);
});
void test('uncertainty intervals never drive pairwise comparisons; untrusted times rank last within severity', () => {
  const input = [
    makeRow('A', {
      eventTime: '2026-09-28T00:00:00.000Z',
      uncertaintyMs: 2000,
    }),
    makeRow('B', {
      eventTime: '2026-09-28T00:00:03.000Z',
      uncertaintyMs: 2000,
    }),
    makeRow('C', {
      eventTime: '2026-09-28T00:00:06.000Z',
      uncertaintyMs: 2000,
    }),
  ];
  assert.deepEqual(
    createSnapshot(input.reverse()).rows.map((x) => x.occurrenceId),
    ['A', 'B', 'C'],
  );
  const unknown = makeRow('D', {
    eventTime: '2000-01-01T00:00:00.000Z',
    timeTrusted: false,
  });
  assert.equal(
    createSnapshot([unknown, ...input]).rows.at(-1).occurrenceId,
    'D',
  );
  const receiptChanged = input.map((x) => ({
    ...x,
    receiveTime: '2026-09-29T00:00:00.000Z',
  }));
  assert.deepEqual(
    createSnapshot(receiptChanged).rows.map(identity),
    createSnapshot(input).rows.map(identity),
  );
});
