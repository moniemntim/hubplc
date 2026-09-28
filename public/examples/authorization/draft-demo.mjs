import assert from 'node:assert/strict';
import { TeachingAuthority, request } from './model.mjs';
import { createDraft, reviewDraft } from './draft.mjs';
const source = new TeachingAuthority();
const read = (session, now) => ({
  ...source.read(session, 'A', now),
  unit: 'C',
});
const draft = createDraft(read('S', 590000), 95, 590000);
let view = reviewDraft(draft, read('S', 600000), 600000);
assert.equal(view.state, 'REAUTH_REQUIRED_UNSENT');
assert.equal(source.inspect().device.writes, 0);
console.log('expiry: REAUTH_REQUIRED_UNSENT writes=0');
assert.equal(
  source.submit('S', request('BYPASS', 95), 600000).decision,
  'SESSION_EXPIRED_OR_UNKNOWN',
);
source.renewFixtureSession('S', 600001);
view = reviewDraft(draft, read('S', 600002), 600002);
assert.equal(view.state, 'READY_FOR_EXPLICIT_SUBMIT');
assert.equal(source.inspect().device.writes, 0);
console.log('same user: READY_FOR_EXPLICIT_SUBMIT writes=0');
source.renewFixtureSession('T', 600003);
source.submit('T', request('OTHER', 92), 600004);
source.execute('OTHER', 600005);
view = reviewDraft(draft, read('S', 600006), 600006);
assert.equal(view.state, 'VERSION_CHANGED');
console.log('version changed: base=80 current=92 draft=95; no automatic write');
const newIntent = createDraft(read('S', 600007), 95, 600007);
source.submit('S', request('OP9', 95, newIntent.baseRevision), 600008);
source.execute('OP9', 600009);
view = reviewDraft(newIntent, read('S', 1200001), 1200001, 'OP9');
assert.equal(view.state, 'SENT_RESULT_REQUIRED');
console.log('sent then expired: OP9 SENT_RESULT_REQUIRED');
source.renewFixtureSession('S', 1200002);
const result = source.lookup('S', 'OP9', 1200003);
assert.deepEqual(
  [result.status, result.value, result.appliedRevision],
  ['APPLIED', 95, 3],
);
assert.equal(source.inspect().device.writes, 2);
console.log('lookup OP9: APPLIED value=95 revision=3 writes=2');
console.log('draft demo: PASS');
