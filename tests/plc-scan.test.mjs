import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runScanSequence,
  samplePulse,
  traceWriters,
  decideOutput,
} from '../public/examples/plc-scan/scan-model.mjs';

void test('forward assignments share the new value; refresh uses previous out', () => {
  const inputs = [false, false, true, false, false];
  const rows = runScanSequence(inputs);
  for (const key of ['m10', 'm11', 'out'])
    assert.deepEqual(
      rows.map((row) => row[key]),
      inputs,
    );
  assert.deepEqual(
    rows.map((row) => row.applied),
    [false, false, false, true, false],
  );
  assert.deepEqual(inputs, [false, false, true, false, false]);
});

void test('read before assignment adds a scan, including first and last boundaries', () => {
  const rows = runScanSequence([false, false, true, false, false], 'swapped');
  assert.deepEqual(
    rows.map((row) => row.out),
    [false, false, false, true, false],
  );
  assert.deepEqual(
    rows.map((row) => row.applied),
    [false, false, false, false, true],
  );
  assert.equal(runScanSequence([true], 'swapped')[0].out, false);
  assert.equal(runScanSequence([true])[0].applied, false);
  assert.deepEqual(runScanSequence([]), []);
});

void test('sampling misses an entire inter-sample pulse and uses half-open endpoints', () => {
  const times = [0, 10, 20, 30];
  assert.deepEqual(
    samplePulse(2, 5, times).map((row) => row.input),
    [false, false, false, false],
  );
  assert.deepEqual(
    samplePulse(8, 12, times).map((row) => row.input),
    [false, true, false, false],
  );
  assert.deepEqual(
    samplePulse(8, 25, times).map((row) => row.input),
    [false, true, true, false],
  );
  assert.deepEqual(
    samplePulse(10, 20, times).map((row) => row.input),
    [false, true, false, false],
  );
});

void test('reversing two writes changes final value but preserves the trace', () => {
  assert.deepEqual(traceWriters(true), {
    writes: [
      { writer: 'A', out: true },
      { writer: 'B', out: false },
    ],
    out: false,
  });
  assert.deepEqual(traceWriters(true, 'BA'), {
    writes: [
      { writer: 'B', out: false },
      { writer: 'A', out: true },
    ],
    out: true,
  });
  assert.equal(traceWriters(false, 'BA').out, false);
});

void test('all 16 decisions give block priority and either request is sufficient', () => {
  for (const mask of Array.from({ length: 16 }, (_, index) => index)) {
    const inputs = {
      autoRequest: Boolean(mask & 8),
      manualRequest: Boolean(mask & 4),
      stop: Boolean(mask & 2),
      alarm: Boolean(mask & 1),
    };
    const result = decideOutput(inputs);
    if (inputs.stop || inputs.alarm) assert.equal(result.out, false);
    else assert.equal(result.out, mask >= 4);
  }
});

void test('demo has no fault latch: clearing a block restores the still-held request', () => {
  const held = {
    autoRequest: true,
    manualRequest: false,
    stop: false,
    alarm: true,
  };
  assert.equal(decideOutput(held).out, false);
  assert.equal(decideOutput({ ...held, alarm: false }).out, true);
  assert.equal(held.alarm, true);
});

void test('invalid fixtures fail explicitly rather than use truthy strings', () => {
  assert.throws(() => runScanSequence([1]), TypeError);
  assert.throws(() => runScanSequence([], 'other'), RangeError);
  assert.throws(() => samplePulse(10, 10, []), RangeError);
  assert.throws(() => samplePulse(0, 1, [NaN]), TypeError);
  assert.throws(() => traceWriters('false'), TypeError);
  assert.throws(() => traceWriters(true, 'AA'), RangeError);
  assert.throws(() => decideOutput({ autoRequest: 'false' }), TypeError);
});
