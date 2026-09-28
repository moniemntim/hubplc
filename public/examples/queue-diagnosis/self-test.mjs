import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { analyzeRecords } from './queue-diagnosis-model.mjs';

const fixture = JSON.parse(
  await readFile(new URL('./fixture.json', import.meta.url), 'utf8'),
);

void test('synthetic records calculate the documented segment values', () => {
  const result = analyzeRecords(fixture.records);
  assert.deepEqual(
    result.accepted.map(
      ({
        requestId,
        queue,
        worker_pre,
        first_byte_wait,
        remaining_receive,
        parse,
        persist_tail,
        total,
        sum,
        candidateSegment,
      }) => ({
        requestId,
        queue,
        worker_pre,
        first_byte_wait,
        remaining_receive,
        parse,
        persist_tail,
        total,
        sum,
        candidateSegment,
      }),
    ),
    [
      {
        requestId: '781',
        queue: 800,
        worker_pre: 10,
        first_byte_wait: 200,
        remaining_receive: 10,
        parse: 5,
        persist_tail: 5,
        total: 1030,
        sum: 1030,
        candidateSegment: 'queue',
      },
      {
        requestId: '782',
        queue: 10,
        worker_pre: 10,
        first_byte_wait: 5000,
        remaining_receive: 10,
        parse: 10,
        persist_tail: 10,
        total: 5050,
        sum: 5050,
        candidateSegment: 'first_byte_wait',
      },
      {
        requestId: '783',
        queue: 5,
        worker_pre: 5,
        first_byte_wait: 10,
        remaining_receive: 10,
        parse: 2000,
        persist_tail: 10,
        total: 2040,
        sum: 2040,
        candidateSegment: 'parse',
      },
      {
        requestId: '784',
        queue: 5,
        worker_pre: 2000,
        first_byte_wait: 10,
        remaining_receive: 10,
        parse: 5,
        persist_tail: 5,
        total: 2035,
        sum: 2035,
        candidateSegment: 'worker_pre',
      },
    ],
  );
  assert.deepEqual(
    result.rejected.map(({ requestId }) => requestId),
    ['invalid-missing', 'invalid-clock', 'invalid-backward'],
  );
});

void test('every accepted timing identity is exact', () => {
  for (const result of analyzeRecords(fixture.records).accepted)
    assert.equal(result.sumMatchesTotal, true);
});
