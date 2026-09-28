import {
  acknowledge,
  initialLifecycle,
  sourceCondition,
  workflow,
} from './alarm-lifecycle.mjs';
import { ack } from './fixtures.mjs';
// Change the final actor or evidence, then inspect the rejection or resolution.
const finalActor = 'Supervisor';
const evidence = 'pressure verified';
let state = sourceCondition(initialLifecycle(), 1, true);
state = acknowledge(state, 2, ack('O1', 1, 'R1'));
state = workflow(state, 3, {
  occurrenceId: 'O1',
  expectedRevision: 2,
  actor: 'Operator',
  action: 'start',
});
state = sourceCondition(state, 4, false);
state = workflow(state, 5, {
  occurrenceId: 'O1',
  expectedRevision: 4,
  actor: finalActor,
  action: 'resolve',
  evidence,
});
const item = state.occurrences[0];
console.log(
  `decision=${state.lastDecision} work=${item.work} revision=${item.revision} active=${item.active} acked=${item.acked}`,
);
