import assert from 'node:assert/strict';
import { demoScans, expectedDemo, initialConfirmed } from './fixtures.mjs';
import {
  initialState,
  MAX_VERSION,
  parameterScan,
} from './parameter-snapshot-model.mjs';

const summarize = (state) => {
  const snapshotValues = state.jobSnapshot
    ? `${state.jobSnapshot.qty}/${state.jobSnapshot.wait_ms}`
    : '-';
  return `${state.scan} ${state.jobState} confirmed=${state.confirmed.version} snapshot=${state.jobSnapshot?.version ?? '-'} snapshot_values=${snapshotValues} confirm=${state.confirmation.status} accept=${state.acceptance.status} terminal=${state.terminal.status}`;
};

let state = initialState({ confirmed: initialConfirmed });
const actualDemo = [];
for (const input of demoScans) {
  state = parameterScan(state, input);
  actualDemo.push(summarize(state));
}
assert.deepEqual(actualDemo, expectedDemo);
assert.deepEqual(state.lastJob, {
  outcome: 'aborted',
  snapshot: { qty: 200, wait_ms: 900, version: 9 },
});

let exhausted = initialState({
  confirmed: { qty: 1, wait_ms: 0, version: MAX_VERSION },
});
exhausted = parameterScan(exhausted, {
  edit: { qty: 2, wait_ms: 1 },
  confirm: true,
  acceptRequest: false,
  complete: false,
  abort: false,
});
assert.deepEqual(exhausted.confirmation, {
  status: 'rejected',
  reason: 'version_exhausted',
});
assert.equal(exhausted.confirmed.version, MAX_VERSION);

console.log('self-test: PASS');
