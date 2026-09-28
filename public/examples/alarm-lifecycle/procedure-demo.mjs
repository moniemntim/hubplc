import assert from 'node:assert/strict';
import {
  initialLifecycle,
  sourceCondition,
  acknowledge,
  workflow,
} from './alarm-lifecycle.mjs';
import { ack } from './fixtures.mjs';
let state = initialLifecycle();
function check(step, expected, operation) {
  state = operation(state);
  const item = state.occurrences[0];
  const actual = [
    state.lastDecision,
    item.active,
    item.acked,
    item.work,
    item.revision,
  ];
  assert.deepEqual(actual, expected, step);
  console.log(
    `${step} decision=${actual[0]} active=${actual[1]} acked=${actual[2]} work=${actual[3]} revision=${actual[4]}`,
  );
}
check('P01', ['active', true, false, 'Open', 1], (s) =>
  sourceCondition(s, 1, true),
);
check('P02', ['ack', true, true, 'Open', 2], (s) =>
  acknowledge(s, 2, ack('O1', 1, 'R1')),
);
check('P03', ['workflow_started', true, true, 'InProgress', 3], (s) =>
  workflow(s, 3, {
    occurrenceId: 'O1',
    expectedRevision: 2,
    actor: 'Operator',
    action: 'start',
  }),
);
check(
  'P04',
  ['workflow_rejected_transition', true, true, 'InProgress', 3],
  (s) =>
    workflow(s, 4, {
      occurrenceId: 'O1',
      expectedRevision: 3,
      actor: 'Supervisor',
      action: 'resolve',
      evidence: 'checked',
    }),
);
check('P05', ['clear', false, true, 'InProgress', 4], (s) =>
  sourceCondition(s, 5, false),
);
check('P06', ['workflow_rejected_request', false, true, 'InProgress', 4], (s) =>
  workflow(s, 6, {
    occurrenceId: 'O1',
    expectedRevision: 4,
    actor: 'Operator',
    action: 'resolve',
    evidence: 'checked',
  }),
);
check(
  'P07',
  ['workflow_revision_conflict', false, true, 'InProgress', 4],
  (s) =>
    workflow(s, 7, {
      occurrenceId: 'O1',
      expectedRevision: 3,
      actor: 'Supervisor',
      action: 'resolve',
      evidence: 'checked',
    }),
);
check('P08', ['workflow_resolved', false, true, 'Resolved', 5], (s) =>
  workflow(s, 8, {
    occurrenceId: 'O1',
    expectedRevision: 4,
    actor: 'Supervisor',
    action: 'resolve',
    evidence: 'checked',
  }),
);
console.log('procedure: PASS (8 checks; synthetic state only)');
