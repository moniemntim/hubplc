import {
  acknowledge,
  initialLifecycle,
  sourceCondition,
} from './alarm-lifecycle.mjs';
import { ack } from './fixtures.mjs';
// The first request has comment 'seen'. Change only this second comment.
const secondComment = 'different';
let state = sourceCondition(initialLifecycle(), 1, true);
state = acknowledge(state, 2, ack('O1', 1, 'P1', 'Operator', 'seen'));
state = acknowledge(state, 3, ack('O1', 1, 'P1', 'Operator', secondComment));
const item = state.occurrences[0];
console.log(
  `decision=${state.lastDecision} revision=${item.revision} ackAt=${item.ackAt} comment=${item.comment} active=${item.active}`,
);
