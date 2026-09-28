import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

import {
  buildTaskRows,
  makeSampleTimes,
  sampleTrace,
  summarizeTrace,
} from '../public/examples/plc-trace/trace-model.mjs';

const execFileAsync = promisify(execFile);

void test('coarse snapshots can miss a one-scan event while retained count proves acceptance', () => {
  const rows = buildTaskRows({
    cycleMs: 2,
    totalScans: 12,
    eventScans: [3, 7, 10],
  });
  const samples = sampleTrace(rows, [0, 6, 12, 18]);
  assert.deepEqual(
    samples.map((sample) => [
      sample.scan,
      Number(sample.oneShot),
      sample.eventCount,
    ]),
    [
      [1, 0, 0],
      [4, 0, 1],
      [7, 1, 2],
      [10, 1, 3],
    ],
  );
  assert.deepEqual(summarizeTrace(samples), {
    samples: 4,
    oneShotScans: [7, 10],
    lastSampledEventCount: 3,
  });
});

void test('half-open endpoints assign an event end boundary to the next scan', () => {
  const rows = buildTaskRows({ cycleMs: 2, totalScans: 4, eventScans: [3] });
  assert.deepEqual(sampleTrace(rows, [4, 6]), [
    { timeMs: 4, scan: 3, oneShot: true, eventCount: 1 },
    { timeMs: 6, scan: 4, oneShot: false, eventCount: 1 },
  ]);
  assert.throws(() => sampleTrace(rows, [8]), RangeError);
});

void test('a two-millisecond phase offset changes visibility without changing interval', () => {
  const rows = buildTaskRows({
    cycleMs: 2,
    totalScans: 12,
    eventScans: [3, 7, 10],
  });
  const phaseZero = sampleTrace(
    rows,
    makeSampleTimes({ totalMs: 24, intervalMs: 6, phaseMs: 0 }),
  );
  const phaseTwo = sampleTrace(
    rows,
    makeSampleTimes({ totalMs: 24, intervalMs: 6, phaseMs: 2 }),
  );
  assert.deepEqual(summarizeTrace(phaseZero).oneShotScans, [7, 10]);
  assert.deepEqual(summarizeTrace(phaseTwo).oneShotScans, []);
  assert.equal(summarizeTrace(phaseZero).lastSampledEventCount, 3);
  assert.equal(summarizeTrace(phaseTwo).lastSampledEventCount, 3);
});

void test('fixture runner output remains the reviewed exact output', async () => {
  const example = new URL('../public/examples/plc-trace/', import.meta.url);
  const [{ stdout }, expected] = await Promise.all([
    execFileAsync(process.execPath, ['run.mjs'], {
      cwd: example,
      windowsHide: true,
    }),
    readFile(new URL('expected-output.txt', example), 'utf8'),
  ]);
  assert.equal(stdout, expected);
});

void test('invalid definitions fail before producing plausible snapshots', () => {
  assert.throws(
    () =>
      makeSampleTimes({
        totalMs: 24,
        intervalMs: Number.MIN_VALUE,
        phaseMs: 0,
      }),
    RangeError,
  );
  assert.throws(
    () => buildTaskRows({ cycleMs: 2, totalScans: 10001, eventScans: [] }),
    RangeError,
  );
  assert.throws(
    () => buildTaskRows({ cycleMs: 2, totalScans: 3, eventScans: [2, 2] }),
    RangeError,
  );
  assert.throws(
    () => makeSampleTimes({ totalMs: 10, intervalMs: 2, phaseMs: 2 }),
    RangeError,
  );
});
