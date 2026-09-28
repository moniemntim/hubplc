import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { classifyInstanceTrace, simulateFifo } from './backlog-model.mjs';

const fixture = JSON.parse(
  await readFile(new URL('./fixture.json', import.meta.url), 'utf8'),
);

void test('fixture produces the documented FIFO timetable', () => {
  const result = simulateFifo(fixture.fifo);
  assert.deepEqual(
    result.admitted.map(({ id, arrivalMs, startMs, finishMs, waitMs }) => ({
      id,
      arrivalMs,
      startMs,
      finishMs,
      waitMs,
    })),
    [
      { id: 'J1', arrivalMs: 0, startMs: 0, finishMs: 120, waitMs: 0 },
      { id: 'J2', arrivalMs: 100, startMs: 120, finishMs: 240, waitMs: 20 },
      { id: 'J3', arrivalMs: 200, startMs: 240, finishMs: 360, waitMs: 40 },
      { id: 'J4', arrivalMs: 300, startMs: 360, finishMs: 480, waitMs: 60 },
      { id: 'J5', arrivalMs: 400, startMs: 480, finishMs: 600, waitMs: 80 },
      { id: 'J6', arrivalMs: 500, startMs: 600, finishMs: 720, waitMs: 100 },
      { id: 'J7', arrivalMs: 600, startMs: 720, finishMs: 840, waitMs: 120 },
      { id: 'J8', arrivalMs: 700, startMs: 840, finishMs: 960, waitMs: 140 },
    ],
  );
  assert.deepEqual(result.rejected, []);
});

void test('capacity and same-time completion obey the stated contract', () => {
  const rejected = simulateFifo({
    arrivalsMs: [0, 1, 2],
    serviceMs: 10,
    waitingCapacity: 1,
  }).rejected[0];
  assert.equal(rejected.activeJobIdBefore, 'J1');
  assert.equal(rejected.activeJobIdAfter, 'J1');
  assert.equal(
    simulateFifo({ arrivalsMs: [0, 10, 20], serviceMs: 10, waitingCapacity: 0 })
      .rejected.length,
    0,
  );
});

void test('trace distinctions are based on supplied rows only', () => {
  const outcomes = fixture.traces.map(classifyInstanceTrace);
  assert.equal(outcomes[0].classification, 'REPEATED_POLL_SAME_WORK');
  assert.equal(outcomes[1].classification, 'OVERLAPPING_SHARED_INSTANCE');
  assert.equal(outcomes[2].classification, 'INSUFFICIENT_EVIDENCE');
});

void test('trace defects do not become a repeated-poll conclusion', () => {
  const noOverlap = classifyInstanceTrace({
    traceComplete: true,
    events: [
      { timeMs: 0, kind: 'BEGIN', jobId: 'J17', instance: 'state' },
      { timeMs: 1, kind: 'END', jobId: 'J17', instance: 'state' },
    ],
  });
  assert.equal(noOverlap.classification, 'NO_OVERLAP_OBSERVED');
  for (const trace of [
    { traceComplete: true, events: [] },
    {
      traceComplete: true,
      events: [{ timeMs: 0, kind: 'BEGIN', jobId: 'J17', instance: 'state' }],
    },
    {
      traceComplete: true,
      events: [{ timeMs: 0, kind: 'POLL', jobId: 'J17', instance: 'state' }],
    },
  ])
    assert.equal(
      classifyInstanceTrace(trace).classification,
      'INSUFFICIENT_EVIDENCE',
    );
});
