import assert from 'node:assert/strict';
import {
  ModeAuthority,
  request,
  signals,
  MAX_REQUESTS,
  FRESH_MS,
  WAIT_MS,
} from './model.mjs';
const ready = (at) => signals(at, { stopped: true, autoIdle: true });
export function verify() {
  const s = new ModeAuthority();
  assert.equal(s.submit(request('ONE'), 0).decision, 'PENDING');
  assert.equal(s.submit(request('ONE'), 0).decision, 'REPLAY');
  assert.equal(
    s.submit(request('ONE', 'Auto'), 0).decision,
    'REQUEST_CONFLICT',
  );
  assert.equal(s.submit(request('BUSY'), 0).reason, 'BUSY');
  s.scan(ready(1), 1);
  assert.deepEqual(
    [s.view(1).modeConfirmed, s.view(1).controlOwner, s.inspect().revision],
    ['Manual', 'HMI-A', 2],
  );
  assert.equal(s.result('BUSY').status, 'REJECTED');
  assert.equal(
    s.submit(request('STALE', 'Auto', 1), 1).reason,
    'REVISION_CONFLICT',
  );
  assert.equal(
    s.submit(request('OTHER', 'Auto', 2, 'HMI-B'), 1).reason,
    'NOT_OWNER',
  );
  assert.equal(s.submit(request('ONE'), 1).record.status, 'CONFIRMED');
  assert.equal(s.inspect().revision, 2);
  for (const [at, interlock, quality, expected] of [
    [4999, true, 'Good', 'CONFIRMED'],
    [5000, true, 'Good', 'REJECTED'],
    [1, false, 'Good', 'REJECTED'],
    [1, true, 'Bad', 'REJECTED'],
    [1, true, 'Unknown', 'REJECTED'],
  ]) {
    const model = new ModeAuthority();
    model.submit(request('LIMIT'), 0);
    model.scan(
      signals(at, { stopped: true, autoIdle: true, interlock, quality }),
      at,
    );
    assert.equal(model.result('LIMIT').status, expected);
    if (at === WAIT_MS) assert.equal(model.result('LIMIT').reason, 'TIMEOUT');
    if (expected === 'REJECTED') assert.equal(model.inspect().mode, 'Auto');
  }
  const cancel = new ModeAuthority();
  cancel.submit(request('C'), 0);
  assert.equal(cancel.cancel('C', 'HMI-B', 0).decision, 'NOT_OWNER');
  assert.equal(cancel.cancel('C', 'HMI-A', 1).decision, 'CANCELLED');
  cancel.scan(ready(2), 2);
  assert.equal(cancel.inspect().mode, 'Auto');
  assert.equal(cancel.cancel('C', 'HMI-A', 2).decision, 'ALREADY_TERMINAL');
  const stale = new ModeAuthority();
  assert.equal(stale.view(FRESH_MS).known, false);
  assert.equal(stale.submit(request('S'), FRESH_MS).reason, 'DATA_UNAVAILABLE');
  const pendingStale = new ModeAuthority();
  pendingStale.submit(request('S'), 0);
  pendingStale.scan(signals(0), 1000);
  assert.equal(pendingStale.result('S').reason, 'DATA_UNAVAILABLE');
  const m = new ModeAuthority();
  m.scan(ready(0), 0);
  m.submit(request('MAN'), 0);
  m.scan(ready(1), 1);
  m.submit(request('ENTER', 'Maintenance', 2), 2);
  m.scan(ready(3), 3);
  assert.equal(
    m.submit(request('AUTO', 'Auto', 3), 3).reason,
    'TRANSITION_DENIED',
  );
  m.submit(request('EXIT', 'Manual', 3), 4);
  m.scan({ ...ready(5), testStopped: false }, 5);
  assert.equal(m.view(5).pending.reason, 'WAIT_TEST_STOPPED');
  m.scan(ready(6), 6);
  assert.equal(m.view(6).pending.reason, 'WAIT_RESTORE_REVIEW');
  m.scan({ ...ready(7), restoreReviewed: true }, 7);
  assert.equal(m.view(7).modeConfirmed, 'Manual');
  const cap = new ModeAuthority();
  for (let i = 0; i < MAX_REQUESTS; i++)
    cap.submit(request('R' + i, 'Auto'), 0);
  assert.equal(cap.submit(request('FULL'), 0).decision, 'CAPACITY_REACHED');
  assert.equal(cap.result('R0').status, 'REJECTED');
  assert.equal(cap.inspect().records.length, MAX_REQUESTS);
  const copy = m.inspect();
  copy.mode = 'Auto';
  copy.records[0].request.target = 'Auto';
  assert.equal(m.inspect().mode, 'Manual');
  assert.equal(m.result('MAN').request.target, 'Manual');
  assert.throws(() => m.scan(ready(6), 8), /invalid source/);
  assert.throws(() => m.view(6), /monotonic/);
  assert.throws(
    () => new ModeAuthority().scan({ ...ready(0), stopped: 'true' }, 0),
    /invalid source/,
  );
  assert.throws(() => new ModeAuthority().scan(ready(1), 0), /invalid source/);
}
verify();
console.log('mode self-test: PASS');
