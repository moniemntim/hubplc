import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  classifyInstanceTrace,
  simulateFifo,
} from '../public/examples/plc-backlog/backlog-model.mjs';

const fixture = JSON.parse(
  await readFile(
    new URL('../public/examples/plc-backlog/fixture.json', import.meta.url),
    'utf8',
  ),
);

void test('eight deterministic arrivals match the FIFO timetable', () => {
  const result = simulateFifo(fixture.fifo);
  assert.deepEqual(
    result.admitted.map(({ id, arrivalMs, startMs, finishMs, waitMs }) => [
      id,
      arrivalMs,
      startMs,
      finishMs,
      waitMs,
    ]),
    [
      ['J1', 0, 0, 120, 0],
      ['J2', 100, 120, 240, 20],
      ['J3', 200, 240, 360, 40],
      ['J4', 300, 360, 480, 60],
      ['J5', 400, 480, 600, 80],
      ['J6', 500, 600, 720, 100],
      ['J7', 600, 720, 840, 120],
      ['J8', 700, 840, 960, 140],
    ],
  );
  assert.equal(result.rejected.length, 0);
});

void test('finite waiting capacity rejects a new job and retains the active job', () => {
  const result = simulateFifo({
    arrivalsMs: [0, 1, 2],
    serviceMs: 10,
    waitingCapacity: 1,
  });
  assert.deepEqual(result.rejected[0], {
    id: 'J3',
    arrivalMs: 2,
    startMs: null,
    finishMs: null,
    waitMs: null,
    reason: 'WAITING_CAPACITY_FULL',
    activeJobIdBefore: 'J1',
    activeJobIdAfter: 'J1',
  });
});

void test('finish-at-arrival ordering frees capacity before a new admission', () => {
  const result = simulateFifo({
    arrivalsMs: [0, 10, 20],
    serviceMs: 10,
    waitingCapacity: 0,
  });
  assert.deepEqual(
    result.admitted.map(({ id, waitMs }) => [id, waitMs]),
    [
      ['J1', 0],
      ['J2', 0],
      ['J3', 0],
    ],
  );
});

void test('repeated polling, observed overlap, and incomplete trace stay distinct', () => {
  const [polls, overlap, incomplete] = fixture.traces.map(
    classifyInstanceTrace,
  );
  assert.equal(polls.classification, 'REPEATED_POLL_SAME_WORK');
  assert.equal(overlap.classification, 'OVERLAPPING_SHARED_INSTANCE');
  assert.deepEqual(overlap.overlaps, [
    {
      instance: 'requestState',
      activeJobId: 'J17',
      activeJobIds: ['J17'],
      newJobId: 'J18',
      atMs: 5,
    },
  ]);
  assert.equal(incomplete.classification, 'INSUFFICIENT_EVIDENCE');
});

void test('trace classifier remains conservative for missing, mismatched, and unknown evidence', () => {
  assert.equal(
    classifyInstanceTrace({
      traceComplete: true,
      events: [
        { timeMs: 0, kind: 'BEGIN', jobId: 'J17', instance: 'state' },
        { timeMs: 1, kind: 'END', jobId: 'J17', instance: 'state' },
      ],
    }).classification,
    'NO_OVERLAP_OBSERVED',
  );
  for (const trace of [
    { traceComplete: true, events: [] },
    {
      traceComplete: true,
      events: [{ timeMs: 0, kind: 'BEGIN', jobId: 'J17', instance: 'state' }],
    },
    {
      traceComplete: true,
      events: [
        { timeMs: 0, kind: 'BEGIN', jobId: 'J17', instance: 'state' },
        { timeMs: 1, kind: 'END', jobId: 'J18', instance: 'state' },
      ],
    },
    {
      traceComplete: true,
      events: [{ timeMs: 0, kind: 'POLL', jobId: 'J17', instance: 'state' }],
    },
    {
      traceComplete: true,
      events: [{ timeMs: 0, kind: 'UNKNOWN', jobId: 'J17', instance: 'state' }],
    },
  ])
    assert.equal(
      classifyInstanceTrace(trace).classification,
      'INSUFFICIENT_EVIDENCE',
    );
});

void test('inputs require monotonic safe-integer timestamps and valid settings', () => {
  assert.throws(
    () =>
      simulateFifo({ arrivalsMs: [0, -1], serviceMs: 1, waitingCapacity: 0 }),
    RangeError,
  );
  assert.throws(
    () => simulateFifo({ arrivalsMs: [0], serviceMs: 0, waitingCapacity: 0 }),
    RangeError,
  );
  assert.throws(
    () => simulateFifo({ arrivalsMs: [0], serviceMs: 1, waitingCapacity: -1 }),
    RangeError,
  );
  assert.equal(
    classifyInstanceTrace({ events: [], traceComplete: 'yes' }).classification,
    'INSUFFICIENT_EVIDENCE',
  );
});
