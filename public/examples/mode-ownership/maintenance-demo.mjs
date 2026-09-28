import assert from 'node:assert/strict';
import { ModeAuthority, request, signals } from './model.mjs';
const source = new ModeAuthority();
const ready = (at, changes = {}) =>
  signals(at, { stopped: true, autoIdle: true, ...changes });
source.scan(ready(0), 0);
source.submit(request('MANUAL'), 0);
source.scan(ready(1), 1);
source.submit(request('ENTER', 'Maintenance', 2), 2);
source.scan(ready(3), 3);
assert.equal(source.view(3).modeConfirmed, 'Maintenance');
console.log('ENTER confirmed=Maintenance owner=HMI-A revision=3');
// Read-only paperwork labels; the model neither validates nor controls energy isolation.
const workRecord = {
  workOrder: 'WO-17',
  isolationEvidence: 'not_verified_in_demo',
  functionalTest: 'not_executed',
};
console.log(
  `workOrder=${workRecord.workOrder} isolation=${workRecord.isolationEvidence} test=${workRecord.functionalTest}`,
);
assert.equal(
  source.submit(request('SKIP', 'Auto', 3), 4).reason,
  'TRANSITION_DENIED',
);
source.submit(request('EXIT', 'Manual', 3), 5);
source.scan(ready(6, { testStopped: false }), 6);
assert.equal(source.view(6).pending.reason, 'WAIT_TEST_STOPPED');
console.log('EXIT pending=WAIT_TEST_STOPPED; confirmed=Maintenance');
source.scan(ready(7), 7);
assert.equal(source.view(7).pending.reason, 'WAIT_RESTORE_REVIEW');
console.log('EXIT pending=WAIT_RESTORE_REVIEW; confirmed=Maintenance');
source.scan(ready(8, { restoreReviewed: true }), 8);
assert.equal(source.view(8).modeConfirmed, 'Manual');
assert.equal(source.inspect().revision, 4);
console.log('EXIT confirmed=Manual revision=4; Auto not requested');
assert.equal(source.cancel('EXIT', 'HMI-A', 9).decision, 'ALREADY_TERMINAL');
console.log('maintenance demo: PASS');
