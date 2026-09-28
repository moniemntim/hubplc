import assert from 'node:assert/strict';
import { TeachingAuthority, request } from './model.mjs';
const server = new TeachingAuthority();
server.submit('S', request('OP0', 85), 0);
server.execute('OP0', 1);
const tabA = server.read('S', 'A', 2),
  tabB = server.read('T', 'A', 2);
assert.equal(tabA.policyRevision, 12);
assert.equal(tabB.canSubmit, true);
assert.equal(server.submit('T', request('OP20', 95, 2), 3).decision, 'QUEUED');
server.changeRole('Viewer', 4);
const freshA = server.read('S', 'A', 5);
assert.equal(freshA.canSubmit, false);
console.log(
  `tabA canSubmit=${freshA.canSubmit}; oldTabB canSubmit=${tabB.canSubmit}`,
);
assert.equal(
  server.submit('T', request('OP21', 95, 2), 6).decision,
  'ROLE_DENIED',
);
console.log(
  `oldTabB direct submit=ROLE_DENIED; writes=${server.inspect().device.writes}`,
);
assert.equal(server.execute('OP20', 7).decision, 'ROLE_DENIED');
console.log('queued OP20=REJECTED; reason=ROLE_DENIED');
server.changeRole('Supervisor', 8);
assert.equal(server.inspect().policy.revision, 14);
assert.equal(server.execute('OP20', 9).decision, 'ALREADY_TERMINAL');
assert.equal(server.inspect().device.writes, 1);
console.log('restore revision=14; OP20 stays rejected; writes=1');
const current = server.read('T', 'A', 10);
server.submit('T', request('OP22', 90, current.revision), 11);
server.execute('OP22', 12);
assert.deepEqual(
  [
    server.inspect().device.value,
    server.inspect().device.revision,
    server.inspect().device.writes,
  ],
  [90, 3, 2],
);
console.log('new OP22 applied value=90 revision=3 writes=2');
console.log('downgrade: PASS');
