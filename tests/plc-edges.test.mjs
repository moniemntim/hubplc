import test from 'node:test';
import assert from 'node:assert/strict';
import {
  edgeScan,
  initialEdges,
} from '../public/examples/plc-edges/edge-model.mjs';
import {
  entryScan,
  initialEntry,
} from '../public/examples/plc-edges/entry-model.mjs';

void test('a held button creates one rising event and one command', () => {
  let state = initialEdges();
  state = edgeScan(state, { button: false });
  for (let index = 0; index < 10; index++) {
    state = edgeScan(state, { button: true });
    assert.equal(state.rising, index === 0);
    assert.equal(state.falling, false);
  }
  assert.equal(state.commandCount, 1);
});

void test('release rearms the next press and produces one falling event', () => {
  let state = edgeScan(initialEdges(), { button: true });
  state = edgeScan(state, { button: false });
  assert.equal(state.falling, true);
  assert.equal(state.commandCount, 1);
  state = edgeScan(state, { button: true });
  assert.equal(state.rising, true);
  assert.equal(state.commandCount, 2);
});

void test('the documented 12 scans and appended re-presses remain reproducible', () => {
  let state = initialEdges();
  const counts = [];
  const events = [];
  for (const button of [
    false,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    false,
    true,
    true,
    false,
    true,
  ]) {
    state = edgeScan(state, { button });
    counts.push(state.commandCount);
    events.push([Number(state.rising), Number(state.falling)]);
  }
  assert.deepEqual(events[1], [1, 0]);
  assert.deepEqual(events[11], [0, 1]);
  assert.deepEqual(counts.slice(12), [2, 2, 2, 3]);
});

void test('the model rejects non-boolean input and invalid prior state', () => {
  assert.throws(() => edgeScan(initialEdges(), { button: 1 }), TypeError);
  assert.throws(
    () => edgeScan({ previous: false, commandCount: -1 }, { button: false }),
    TypeError,
  );
});

void test('edge model rejects a rising event that would exceed a safe count', () => {
  assert.throws(
    () =>
      edgeScan(
        { previous: false, commandCount: Number.MAX_SAFE_INTEGER },
        { button: true },
      ),
    RangeError,
  );
});

void test('state-entry trace initializes once and retains the prior saved batch', () => {
  let state = initialEntry();
  const rows = [];
  for (const [stateNow, sample] of [
    ['WAIT', null],
    ['RUN', 12],
    ['RUN', 8],
    ['RUN', null],
    ['RUN', 5],
    ['DONE', 99],
    ['DONE', null],
    ['RUN', null],
    ['RUN', 7],
  ]) {
    state = entryScan(state, { stateNow, sample });
    rows.push(state);
  }
  assert.equal(rows[1].entryCount, 1);
  assert.deepEqual([rows[4].batchSum, rows[4].sampleCount], [25, 3]);
  assert.equal(rows[5].acceptedSample, false);
  assert.deepEqual([rows[5].savedSum, rows[5].savedCount], [25, 3]);
  assert.equal(rows[6].saveCount, 1);
  assert.deepEqual(
    [rows[7].batchSum, rows[7].sampleCount, rows[7].entryCount],
    [0, 0, 2],
  );
  assert.deepEqual([rows[8].savedSum, rows[8].savedCount], [25, 3]);
});

void test('state-entry model validates the approved state and sample input', () => {
  assert.throws(
    () => entryScan(initialEntry(), { stateNow: 'FAULT' }),
    TypeError,
  );
  assert.throws(
    () => entryScan(initialEntry(), { stateNow: 'RUN', sample: '12' }),
    TypeError,
  );
});

void test('state-entry rejects non-finite totals and exhausted counters', () => {
  assert.throws(
    () =>
      entryScan(
        { ...initialEntry(), previous: 'RUN', batchSum: Number.MAX_VALUE },
        { stateNow: 'RUN', sample: Number.MAX_VALUE },
      ),
    RangeError,
  );
  assert.throws(
    () =>
      entryScan(
        {
          ...initialEntry(),
          previous: 'RUN',
          sampleCount: Number.MAX_SAFE_INTEGER,
        },
        { stateNow: 'RUN', sample: 1 },
      ),
    RangeError,
  );
  assert.throws(
    () =>
      entryScan(
        { ...initialEntry(), entryCount: Number.MAX_SAFE_INTEGER },
        { stateNow: 'RUN' },
      ),
    RangeError,
  );
  assert.throws(
    () =>
      entryScan(
        {
          ...initialEntry(),
          previous: 'RUN',
          saveCount: Number.MAX_SAFE_INTEGER,
        },
        { stateNow: 'DONE' },
      ),
    RangeError,
  );
});
