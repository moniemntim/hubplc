import assert from 'node:assert/strict';
import {
  acknowledge,
  initialLifecycle,
  sourceCondition,
} from './alarm-lifecycle.mjs';
import { ack } from './fixtures.mjs';

const row = (state, occurrenceId) => {
  const item = state.occurrences.find(
    (entry) => entry.occurrenceId === occurrenceId,
  );
  return `${item.occurrenceId} active=${item.active} acked=${item.acked} revision=${item.revision}`;
};
let state = initialLifecycle();
state = sourceCondition(state, 1, true);
console.log(row(state, 'O1'));
state = acknowledge(state, 2, ack('O1', 1, 'R1'));
console.log(row(state, 'O1'));
state = sourceCondition(state, 3, false);
console.log(row(state, 'O1'));
state = sourceCondition(state, 4, true);
state = sourceCondition(state, 5, false);
console.log(row(state, 'O2'));
state = sourceCondition(state, 6, true);
console.log(row(state, 'O3'));
state = acknowledge(state, 7, ack('O2', 2, 'R2'));
const old = state.occurrences.find((item) => item.occurrenceId === 'O2');
const fresh = state.occurrences.find((item) => item.occurrenceId === 'O3');
assert.equal(old.acked, true);
assert.equal(fresh.acked, false);
console.log(`old=O2 acked=${old.acked} O3 acked=${fresh.acked}`);
console.log('lifecycle demo: PASS');
