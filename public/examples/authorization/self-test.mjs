import assert from 'node:assert/strict';
import {
  TeachingAuthority,
  MAX_AUDIT,
  MAX_OPERATIONS,
  request,
} from './model.mjs';
export function verify() {
  const server = new TeachingAuthority();
  assert.equal(server.submit('S', request(), 0).decision, 'QUEUED');
  assert.equal(server.submit('S', request(), 0).decision, 'REPLAY');
  assert.equal(
    server.submit('S', request('OP1', 96), 0).decision,
    'OPERATION_CONFLICT',
  );
  assert.equal(
    server.submit('S', { ...request('OP2'), role: 'Supervisor' }, 0).decision,
    'INVALID_REQUEST',
  );
  assert.equal(server.execute('OP1', 1).decision, 'APPLIED');
  assert.equal(server.execute('OP1', 1).decision, 'ALREADY_TERMINAL');
  assert.equal(server.inspect().device.writes, 1);
  const restored = new TeachingAuthority();
  restored.submit('S', request(), 0);
  restored.changeRole('Viewer', 1);
  restored.changeRole('Supervisor', 2);
  assert.equal(restored.execute('OP1', 3).decision, 'AUTHORIZATION_CHANGED');
  assert.equal(restored.inspect().device.writes, 0);
  for (const condition of ['offline', 'notready', 'expired']) {
    const s = new TeachingAuthority();
    s.submit('S', request(), 0);
    if (condition === 'offline') s.setAvailable(false, 1);
    if (condition === 'notready') s.setDeviceReady(false, 1);
    assert.equal(
      s.execute('OP1', condition === 'expired' ? 600000 : 2).decision,
      {
        offline: 'AUTHORITY_UNAVAILABLE',
        notready: 'DEVICE_NOT_READY',
        expired: 'SESSION_EXPIRED_OR_UNKNOWN',
      }[condition],
    );
    assert.equal(s.inspect().device.writes, 0);
  }
  const race = new TeachingAuthority();
  race.submit('S', request('X', 90), 0);
  race.submit('T', request('Y', 95), 0);
  race.execute('X', 1);
  assert.equal(race.execute('Y', 1).decision, 'REVISION_CONFLICT');
  assert.equal(race.inspect().device.value, 90);
  for (const value of [60, 100]) {
    const s = new TeachingAuthority();
    assert.equal(s.submit('S', request('LIMIT', value), 0).decision, 'QUEUED');
  }
  for (const value of [59, 101]) {
    const s = new TeachingAuthority();
    assert.equal(
      s.submit('S', request('LIMIT', value), 0).decision,
      'RANGE_DENIED',
    );
  }
  const capacity = new TeachingAuthority();
  for (let i = 0; i < MAX_OPERATIONS; i++)
    assert.equal(capacity.submit('S', request('OP' + i), 0).decision, 'QUEUED');
  assert.equal(
    capacity.submit('S', request('EXTRA'), 0).decision,
    'OPERATIONS_FULL',
  );
  const logs = new TeachingAuthority();
  for (let i = 0; i < MAX_AUDIT; i++) logs.read('V', 'A', 0);
  assert.equal(logs.submit('S', request(), 0).decision, 'AUDIT_FULL');
  assert.equal(logs.inspect().audit.length, MAX_AUDIT);
  assert.equal(logs.inspect().device.writes, 0);
  const exposed = server.inspect();
  exposed.device.value = 1;
  exposed.operations[0].payload.value = 1;
  assert.equal(server.inspect().device.value, 95);
  assert.throws(() => server.read('S', 'A', 0), /monotonic/);
  const down = new TeachingAuthority();
  down.submit('S', request(), 0);
  down.changeRole('Viewer', 1);
  assert.equal(down.execute('OP1', 2).decision, 'ROLE_DENIED');
  down.changeRole('Supervisor', 3);
  assert.equal(down.execute('OP1', 4).decision, 'ALREADY_TERMINAL');
  assert.equal(down.inspect().device.writes, 0);
}
verify();
console.log('authorization self-test: PASS');
