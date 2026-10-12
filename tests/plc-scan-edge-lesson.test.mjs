import assert from 'node:assert/strict';
import test from 'node:test';
import {
  appendEdgeScan,
  longHoldCase,
  parseScanInputs,
  runScanLesson,
  samplePulseLesson,
} from '../lib/plc-scan-edge-lesson.ts';
import {
  runScanSequence,
  samplePulse,
} from '../public/examples/plc-scan/scan-model.mjs';
import {
  edgeScan,
  initialEdges,
} from '../public/examples/plc-edges/edge-model.mjs';

void test('on-page scan results match the downloadable model for all five-scan input sequences', () => {
  for (let mask = 0; mask < 32; mask++) {
    const inputs = Array.from({ length: 5 }, (_, index) =>
      Boolean(mask & (1 << index)),
    );
    for (const order of ['forward', 'swapped']) {
      assert.deepEqual(
        runScanLesson(inputs, order),
        runScanSequence(inputs, order),
      );
    }
  }
  assert.deepEqual(parseScanInputs('0, 0,1,0,0'), [
    false,
    false,
    true,
    false,
    false,
  ]);
  for (const invalid of ['', '0,2', '1,', Array(13).fill('0').join(',')]) {
    assert.throws(() => parseScanInputs(invalid));
  }
});

void test('on-page pulse sampling uses the downloadable half-open interval rule', () => {
  for (const [start, end] of [
    [2, 5],
    [8, 12],
    [8, 25],
    [10, 20],
    [0, 40],
  ]) {
    assert.deepEqual(
      samplePulseLesson(String(start), String(end)),
      samplePulse(start, end, [0, 10, 20, 30]),
    );
  }
  for (const [start, end] of [
    ['5', '5'],
    ['12', '8'],
    ['1.5', '5'],
    ['-1', '2'],
    ['0', '41'],
  ]) {
    assert.throws(() => samplePulseLesson(start, end));
  }
});

void test('on-page edge count and events match the downloadable model', () => {
  const inputs = [
    false,
    ...Array(10).fill(true),
    false,
    true,
    true,
    false,
    true,
  ];
  let state = initialEdges();
  let history = [];
  for (const button of inputs) {
    const previous = state.previous;
    state = edgeScan(state, { button });
    history = appendEdgeScan(history, button);
    assert.deepEqual(history.at(-1), {
      scan: history.length,
      button,
      previous,
      rising: state.rising,
      falling: state.falling,
      commandCount: state.commandCount,
    });
  }
  assert.deepEqual(longHoldCase(), history.slice(0, 12));
  assert.equal(history.at(-1).commandCount, 3);
  let capped = longHoldCase();
  for (let index = capped.length; index < 32; index++)
    capped = appendEdgeScan(capped, false);
  assert.throws(() => appendEdgeScan(capped, true), /32/);
});
