import assert from 'node:assert/strict';
import { demoScans, expectedDemo } from './fixtures.mjs';
import {
  initialScheduler,
  MAX_SEQUENCE,
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
  actual.push(summary(state));
}
assert.deepEqual(actual, expectedDemo);

state = initialScheduler({ firstSequence: MAX_SEQUENCE });
state = schedulerScan(state, {
  nowMs: 0,
  requestA: true,
  requestB: true,
  cancelA: false,
  cancelB: false,
  release: null,
  resetFault: false,
  moduleReady: false,
  safetyConfirmed: false,
});
assert.equal(state.ownerJobSeq, MAX_SEQUENCE);
assert.equal(state.event, 'granted_A_1000000');

console.log('self-test: PASS');
