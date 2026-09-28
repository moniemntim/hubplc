import assert from 'node:assert/strict';
import {
  acknowledge,
  initialLifecycle,
  sourceCondition,
  workflow,
} from './alarm-lifecycle.mjs';
import { ack } from './fixtures.mjs';

const action = (state) => state.log.at(-1).action;
let state = sourceCondition(initialLifecycle(), 1, true);
state = acknowledge(state, 2, ack('O1', 1, 'R1'));
state = workflow(state, 3, {
  occurrenceId: 'O1',
  expectedRevision: 2,
  actor: 'Operator',
  action: 'start',
});
state = workflow(state, 4, {
  occurrenceId: 'O1',
  expectedRevision: 3,
  actor: 'Supervisor',
  action: 'resolve',
  evidence: 'checked',
});
console.log(`active resolve=${action(state)}`);
state = sourceCondition(state, 5, false);
state = workflow(state, 6, {
  occurrenceId: 'O1',
  expectedRevision: 4,
  actor: 'Operator',
  action: 'resolve',
  evidence: 'checked',
});
console.log(`operator resolve=${action(state)}`);
state = workflow(state, 7, {
  occurrenceId: 'O1',
  expectedRevision: 3,
  actor: 'Supervisor',
  action: 'resolve',
  evidence: 'checked',
});
console.log(`stale revision=${action(state)}`);
state = workflow(state, 8, {
  occurrenceId: 'O1',
  expectedRevision: 4,
  actor: 'Supervisor',
  action: 'resolve',
  evidence: 'checked',
});
assert.equal(state.occurrences[0].work, 'Resolved');
console.log(
  `supervisor resolve=${action(state)} revision=${state.occurrences[0].revision}`,
);
console.log('workflow demo: PASS');
