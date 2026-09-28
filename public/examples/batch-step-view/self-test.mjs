import assert from 'node:assert/strict';
import { cases, snapshot } from './fixtures.mjs';
import { FRESH_WINDOW_MS, projectSnapshot } from './model.mjs';

for (const [, nowMs, input] of cases)
  assert.equal(projectSnapshot(input, nowMs).accepted, true);

const timeout = projectSnapshot(cases[3][2], 120000);
assert.deepEqual(
  [timeout.view.status, timeout.view.failureReason, timeout.view.completion],
  ['FAILED', 'PROCESS_TIMEOUT', 'NOT_PROVEN'],
);
const restarted = projectSnapshot(cases[4][2], 121000);
assert.deepEqual(
  [restarted.view.sourceEpoch, restarted.view.status, restarted.view.quality],
  [8, 'RECOVERY_REQUIRED', 'UNKNOWN'],
);
const reopened = projectSnapshot(cases[5][2], 130000);
assert.deepEqual(
  [reopened.view.sourceEpoch, reopened.view.attempt, reopened.view.waitReason],
  [8, 2, 'VALVE_FEEDBACK_PENDING'],
);
const complete = projectSnapshot(cases[6][2], 135000);
assert.deepEqual(
  [complete.view.completion, complete.view.transitionAtMs],
  ['PROVEN', 134900],
);
assert.equal(
  projectSnapshot(snapshot(), 1000 + FRESH_WINDOW_MS).code,
  'SOURCE_STALE',
);
assert.equal(projectSnapshot(snapshot(), 999).code, 'CLOCK_BEFORE_SNAPSHOT');
assert.equal(
  projectSnapshot(
    snapshot({
      completion: {
        status: 'PROVEN',
        conditionEvidence: 'not allowed while waiting',
        transitionAtMs: 1000,
      },
    }),
    1000,
  ).code,
  'SOURCE_REJECTED',
);
console.log('self-test: PASS');
