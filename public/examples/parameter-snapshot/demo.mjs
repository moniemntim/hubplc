import assert from 'node:assert/strict';
import { demoScans, expectedDemo, initialConfirmed } from './fixtures.mjs';
import { initialState, parameterScan } from './parameter-snapshot-model.mjs';

const summarize = (state) => {
  const snapshotValues = state.jobSnapshot
    ? `${state.jobSnapshot.qty}/${state.jobSnapshot.wait_ms}`
    : '-';
  return `${state.scan} ${state.jobState} confirmed=${state.confirmed.version} snapshot=${state.jobSnapshot?.version ?? '-'} snapshot_values=${snapshotValues} confirm=${state.confirmation.status} accept=${state.acceptance.status} terminal=${state.terminal.status}`;
};

let state = initialState({ confirmed: initialConfirmed });
const actual = [];
for (const input of demoScans) {
  state = parameterScan(state, input);
  const row = summarize(state);
  actual.push(row);
  console.log(row);
}
assert.deepEqual(actual, expectedDemo);
console.log('demo: PASS');
