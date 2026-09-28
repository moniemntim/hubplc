import assert from 'node:assert/strict';
import { TeachingAuthority, request } from './model.mjs';
for (const [session, expected] of [
  ['V', 'ROLE_DENIED'],
  ['O', 'ROLE_DENIED'],
  ['M', 'ROLE_DENIED'],
  ['S', 'QUEUED'],
]) {
  const server = new TeachingAuthority();
  const result = server.submit(session, request(), 0);
  assert.equal(result.decision, expected);
  assert.equal(server.inspect().device.writes, 0);
  console.log(`${session} submit95=${result.decision} writes=0`);
}
const server = new TeachingAuthority();
assert.equal(
  server.submit('S', request('HIGH', 150), 0).decision,
  'RANGE_DENIED',
);
assert.equal(
  server.submit('S', request('OTHER', 95, 1, 'B'), 0).decision,
  'RESOURCE_DENIED',
);
console.log('Supervisor150=RANGE_DENIED; resourceB=RESOURCE_DENIED');
assert.equal(server.submit('S', request('OK', 95), 1).decision, 'QUEUED');
assert.equal(server.execute('OK', 2).decision, 'APPLIED');
const readback = server.read('S', 'A', 3);
assert.deepEqual(
  [readback.value, readback.revision, server.inspect().device.writes],
  [95, 2, 1],
);
console.log('readback value=95 revision=2 writes=1');
assert.equal(
  server.submit('S', request('OLD', 90, 1), 4).decision,
  'REVISION_CONFLICT',
);
assert.equal(
  server.submit('S', request('EXPIRED', 90, 2), 600000).decision,
  'SESSION_EXPIRED_OR_UNKNOWN',
);
console.log('oldRevision=REVISION_CONFLICT; expiry=SESSION_EXPIRED_OR_UNKNOWN');
console.log('matrix: PASS');
