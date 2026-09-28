import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  analyzeRecord,
  analyzeRecords,
} from '../public/examples/queue-diagnosis/queue-diagnosis-model.mjs';

const fixture = JSON.parse(
  await readFile(
    new URL('../public/examples/queue-diagnosis/fixture.json', import.meta.url),
    'utf8',
  ),
);

void test('seven timestamps calculate segment math and exact sum identity', () => {
  const result = analyzeRecord(fixture.records[0]);
  assert.deepEqual(
    {
      queue: result.queue,
      worker_pre: result.worker_pre,
      first_byte_wait: result.first_byte_wait,
      remaining_receive: result.remaining_receive,
      parse: result.parse,
      persist_tail: result.persist_tail,
      total: result.total,
      sum: result.sum,
      sumMatchesTotal: result.sumMatchesTotal,
      candidateSegment: result.candidateSegment,
    },
    {
      queue: 800,
      worker_pre: 10,
      first_byte_wait: 200,
      remaining_receive: 10,
      parse: 5,
      persist_tail: 5,
      total: 1030,
      sum: 1030,
      sumMatchesTotal: true,
      candidateSegment: 'queue',
    },
  );
});

void test('candidate segment changes with synthetic first-byte, parse, and worker-pre delays', () => {
  const accepted = analyzeRecords(fixture.records).accepted;
  assert.deepEqual(
    accepted.map(({ requestId, candidateSegment, candidateDurationMs }) => [
      requestId,
      candidateSegment,
      candidateDurationMs,
    ]),
    [
      ['781', 'queue', 800],
      ['782', 'first_byte_wait', 5000],
      ['783', 'parse', 2000],
      ['784', 'worker_pre', 2000],
    ],
  );
});

void test('missing endpoints, mixed clocks, and time moving backward are rejected', () => {
  const rejected = analyzeRecords(fixture.records).rejected;
  assert.deepEqual(
    rejected.map(({ requestId }) => requestId),
    ['invalid-missing', 'invalid-clock', 'invalid-backward'],
  );
  assert.match(rejected[0].reason, /missing complete/);
  assert.match(rejected[1].reason, /clock mismatch/);
  assert.match(rejected[2].reason, /send precedes dequeue/);
});

void test('time bounds and malformed records are rejected rather than calculated', () => {
  const unsafe = structuredClone(fixture.records[0]);
  unsafe.timestamps.complete.ms = Number.MAX_SAFE_INTEGER + 1;
  assert.equal(analyzeRecord(unsafe).status, 'rejected');
  assert.equal(analyzeRecord(null).status, 'rejected');
  assert.throws(() => analyzeRecords({}), TypeError);
});
