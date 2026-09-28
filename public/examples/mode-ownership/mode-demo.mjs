import assert from 'node:assert/strict';
import { ModeAuthority, request, signals } from './model.mjs';
const source = new ModeAuthority();
assert.equal(source.submit(request('M17'), 0).decision, 'PENDING');
source.scan(signals(1), 1);
let v = source.view(1);
assert.equal(v.pending.reason, 'WAIT_STOPPED');
console.log(
  `requested=Manual confirmed=${v.modeConfirmed} owner=${v.controlOwner} reason=${v.pending.reason}`,
);
source.scan(signals(2, { stopped: true }), 2);
assert.equal(source.view(2).pending.reason, 'WAIT_AUTO_IDLE');
console.log('stopped=true; reason=WAIT_AUTO_IDLE');
const lastRead = source.view(2);
source.scan(signals(3, { stopped: true, autoIdle: true }), 3);
// Simulate a lost delivery: do not replace lastRead with the new source view.
console.log(`reply lost: screen=Unknown lastRead=${lastRead.modeConfirmed}`);
assert.equal(source.result('M17').status, 'CONFIRMED');
v = source.view(3);
assert.deepEqual(
  [v.modeConfirmed, v.controlOwner, v.modeRevision],
  ['Manual', 'HMI-A', 2],
);
console.log('lookup M17=CONFIRMED; fresh mode=Manual owner=HMI-A revision=2');
assert.equal(source.submit(request('M17'), 3).decision, 'REPLAY');
assert.equal(source.inspect().revision, 2);
assert.equal(
  source.submit(request('OTHER', 'Auto', 2, 'HMI-B'), 3).reason,
  'NOT_OWNER',
);
source.submit(request('A18', 'Auto', 2), 4);
source.scan(
  signals(5, { stopped: true, autoIdle: true, manualIdle: false }),
  5,
);
assert.equal(source.view(5).pending.reason, 'WAIT_MANUAL_IDLE');
source.scan(
  signals(6, { stopped: true, autoIdle: true, sequenceReady: false }),
  6,
);
assert.equal(source.view(6).pending.reason, 'WAIT_SEQUENCE_READY');
source.scan(signals(7, { stopped: true, autoIdle: true }), 7);
assert.equal(source.view(7).modeConfirmed, 'Auto');
console.log('return=Auto owner=PLC revision=3; no output command exists');
console.log('mode demo: PASS');
