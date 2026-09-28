import assert from 'node:assert/strict';
import { demoScans, expectedDemo } from './fixtures.mjs';
import {
  initialScheduler,
  schedulerScan,
} from './resource-scheduler-model.mjs';

const summary = (state) => {
  const owner = state.owner ? `${state.owner}/${state.ownerJobSeq}` : '-';
  const enable = state.enable.A ? 'A' : state.enable.B ? 'B' : '-';
  const grant = state.grant
    ? `${state.grant.station}/${state.grant.jobSeq}`
    : '-';
  return `${state.scan} now=${state.nowMs} owner=${owner} pendingA=${state.pending.A?.seq ?? '-'} pendingB=${state.pending.B?.seq ?? '-'} lock=${state.faultLock} enable=${enable} grant=${grant} event=${state.event}`;
};

let state = initialScheduler();
const actual = [];
for (const input of demoScans) {
  state = schedulerScan(state, input);
  const row = summary(state);
  actual.push(row);
  console.log(row);
}
assert.deepEqual(actual, expectedDemo);
console.log('demo: PASS');
