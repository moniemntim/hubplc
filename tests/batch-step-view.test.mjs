import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  cases,
  snapshot,
} from '../public/examples/batch-step-view/fixtures.mjs';
import {
  FRESH_WINDOW_MS,
  projectSnapshot,
} from '../public/examples/batch-step-view/model.mjs';

void test('downloadable self-test and fixed demo execute', () => {
  assert.match(
    execFileSync(
      process.execPath,
      ['public/examples/batch-step-view/self-test.mjs'],
      {
        encoding: 'utf8',
      },
    ),
    /self-test: PASS/,
  );
  assert.match(
    execFileSync(
      process.execPath,
      ['public/examples/batch-step-view/demo.mjs'],
      {
        encoding: 'utf8',
      },
    ),
    /demo: PASS read-only authoritative snapshot projection/,
  );
});

void test('renderer projects the authoritative wait, quality, failure and recovery fields', () => {
  const projected = cases.map((item) => projectSnapshot(item[2], item[1]));
  assert.deepEqual(
    projected.map((item) => [
      item.accepted,
      item.view.status,
      item.view.attempt,
    ]),
    [
      [true, 'WAITING', 1],
      [true, 'WAITING', 1],
      [true, 'WAITING', 1],
      [true, 'FAILED', 1],
      [true, 'RECOVERY_REQUIRED', 1],
      [true, 'WAITING', 2],
      [true, 'COMPLETE', 2],
    ],
  );
  assert.deepEqual(
    [projected[1].view.quality, projected[1].view.waitReason],
    ['BAD', 'DATA_QUALITY_UNAVAILABLE'],
  );
  assert.deepEqual(
    [projected[3].view.failureReason, projected[3].view.completion],
    ['PROCESS_TIMEOUT', 'NOT_PROVEN'],
  );
});

void test('HMI reopen reads a new authoritative snapshot; it does not resume or send a command', () => {
  const before = projectSnapshot(cases[0][2], cases[0][1]);
  const restarted = projectSnapshot(cases[4][2], cases[4][1]);
  const reread = projectSnapshot(cases[5][2], cases[5][1]);
  assert.deepEqual(
    [
      before.view.sourceEpoch,
      before.view.attempt,
      reread.view.sourceEpoch,
      reread.view.attempt,
    ],
    [7, 1, 8, 2],
  );
  assert.equal(restarted.view.sourceEpoch, 8);
  assert.equal(Object.hasOwn(reread.view, 'commandId'), false);
});

void test('freshness equality, backwards clocks, unknown shapes and contradictory completion never fake success', () => {
  assert.equal(
    projectSnapshot(snapshot(), 1000 + FRESH_WINDOW_MS).code,
    'SOURCE_STALE',
  );
  assert.equal(projectSnapshot(snapshot(), 999).code, 'CLOCK_BEFORE_SNAPSHOT');
  for (const input of [
    { ...snapshot(), extra: true },
    snapshot({ state: 'UNKNOWN' }),
    snapshot({ quality: 'GOOD', waitReason: 'DATA_QUALITY_UNAVAILABLE' }),
    snapshot({ quality: 'UNKNOWN', waitReason: 'LEVEL_ABOVE_TARGET' }),
    snapshot({
      state: 'FAILED',
      waitReason: null,
      failureReason: null,
      recoveryRequired: true,
    }),
    snapshot({
      completion: {
        status: 'PROVEN',
        conditionEvidence: 'level condition',
        transitionAtMs: 1000,
      },
    }),
  ]) {
    const result = projectSnapshot(input, 1000);
    assert.deepEqual(
      [
        result.accepted,
        result.code,
        result.view.status,
        result.view.completion,
      ],
      [false, 'SOURCE_REJECTED', 'UNKNOWN', 'NOT_PROVEN'],
    );
  }
});

void test('only a coherent source-complete record can display completion evidence', () => {
  const complete = snapshot({
    state: 'COMPLETE',
    quality: 'GOOD',
    completion: {
      status: 'PROVEN',
      conditionEvidence: 'level <= 2000 and valve feedback GOOD',
      transitionAtMs: 999,
    },
    waitReason: null,
    failureReason: null,
    nextCondition: null,
    recoveryRequired: false,
  });
  const result = projectSnapshot(complete, 1000);
  assert.deepEqual(
    [
      result.accepted,
      result.view.status,
      result.view.completion,
      result.view.transitionAtMs,
    ],
    [true, 'COMPLETE', 'PROVEN', 999],
  );
});
