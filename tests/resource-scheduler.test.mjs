import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { demoScans } from '../public/examples/resource-scheduler/fixtures.mjs';
import {
  initialScheduler,
  MAX_SEQUENCE,
  schedulerScan,
} from '../public/examples/resource-scheduler/resource-scheduler-model.mjs';

const input = (nowMs, overrides = {}) => ({
  nowMs,
  requestA: false,
  requestB: false,
  cancelA: false,
  cancelB: false,
  release: null,
  resetFault: false,
  moduleReady: false,
  safetyConfirmed: false,
  ...overrides,
});

void test('same-scan requests are sequenced A then B and held levels do not duplicate pending work', () => {
  let state = initialScheduler();
  state = schedulerScan(state, input(0, { requestA: true, requestB: true }));
  assert.deepEqual(state.grant, { station: 'A', jobSeq: 1 });
  assert.deepEqual(state.pending.B, { station: 'B', seq: 2 });
  state = schedulerScan(state, input(1, { requestA: true, requestB: true }));
  assert.equal(state.nextSequence, 3);
  assert.deepEqual(state.pending.B, { station: 'B', seq: 2 });
});

void test('queued cancellation precedes arbitration; matching release waits one scan before next grant', () => {
  let state = initialScheduler();
  state = schedulerScan(state, input(0, { requestA: true, cancelA: true }));
  assert.equal(state.owner, null);
  assert.equal(state.pending.A, null);
  assert.equal(state.event, 'pending_A_cancelled');

  state = initialScheduler();
  state = schedulerScan(state, input(0, { requestA: true }));
  state = schedulerScan(state, input(1, { requestB: true }));
  state = schedulerScan(state, input(2, { cancelB: true }));
  assert.equal(state.pending.B, null);
  state = schedulerScan(
    state,
    input(3, { release: { owner: 'A', jobSeq: 1 } }),
  );
  assert.equal(state.owner, null);
  assert.equal(state.grant, null);
  state = schedulerScan(state, input(4));
  assert.equal(state.owner, null);

  state = initialScheduler();
  state = schedulerScan(state, input(0, { requestA: true }));
  state = schedulerScan(state, input(1, { requestB: true }));
  state = schedulerScan(
    state,
    input(2, { release: { owner: 'A', jobSeq: 1 } }),
  );
  state = schedulerScan(state, input(3));
  assert.deepEqual(state.grant, { station: 'B', jobSeq: 2 });
});

void test('cancelled sequence numbers are never reused', () => {
  let state = initialScheduler();
  state = schedulerScan(state, input(0, { requestA: true }));
  state = schedulerScan(state, input(1, { requestB: true }));
  assert.equal(state.pending.B.seq, 2);
  state = schedulerScan(state, input(2, { cancelB: true }));
  state = schedulerScan(
    state,
    input(3, { release: { owner: 'A', jobSeq: 1 } }),
  );
  state = schedulerScan(state, input(4));
  state = schedulerScan(state, input(5, { requestB: true }));
  assert.deepEqual(state.grant, { station: 'B', jobSeq: 3 });
});

void test('an earlier B pending record is granted before a later A record', () => {
  let state = initialScheduler();
  state = schedulerScan(state, input(0, { requestA: true }));
  state = schedulerScan(state, input(1, { requestB: true }));
  assert.deepEqual(state.pending.B, { station: 'B', seq: 2 });
  state = schedulerScan(
    state,
    input(2, { release: { owner: 'A', jobSeq: 1 } }),
  );
  state = schedulerScan(state, input(3, { requestA: true }));
  assert.deepEqual(state.grant, { station: 'B', jobSeq: 2 });
  assert.deepEqual(state.pending.A, { station: 'A', seq: 3 });
});

void test('owner cancellation and wrong release cannot directly free the resource', () => {
  let state = initialScheduler();
  state = schedulerScan(state, input(0, { requestA: true }));
  state = schedulerScan(state, input(1, { cancelA: true }));
  assert.equal(state.owner, 'A');
  assert.equal(state.event, 'owner_A_cancel_requires_controlled_stop');
  assert.equal(state.enable.A, true);
  state = schedulerScan(
    state,
    input(2, { release: { owner: 'B', jobSeq: 1 } }),
  );
  assert.equal(state.owner, 'A');
  assert.equal(state.event, 'release_rejected_owner_or_jobseq_mismatch');
  state = schedulerScan(
    state,
    input(3, { release: { owner: 'A', jobSeq: 99 } }),
  );
  assert.equal(state.owner, 'A');
  assert.equal(state.event, 'release_rejected_owner_or_jobseq_mismatch');
});

void test('deadline equality faults first, retains owner, and reset needs a new safe edge before re-arbitration', () => {
  let state = initialScheduler({ maxHoldMs: 10 });
  state = schedulerScan(state, input(0, { requestA: true }));
  state = schedulerScan(state, input(5, { requestB: true }));
  state = schedulerScan(
    state,
    input(10, { release: { owner: 'A', jobSeq: 1 } }),
  );
  assert.equal(state.faultLock, true);
  assert.equal(state.owner, 'A');
  assert.deepEqual(state.enable, { A: false, B: false });
  assert.equal(state.event, 'timeout_A_1');

  state = schedulerScan(
    state,
    input(11, { resetFault: true, safetyConfirmed: true }),
  );
  assert.equal(state.faultLock, true);
  state = schedulerScan(
    state,
    input(12, { resetFault: true, moduleReady: true, safetyConfirmed: true }),
  );
  assert.equal(state.faultLock, true);
  state = schedulerScan(state, input(13));
  state = schedulerScan(
    state,
    input(14, { resetFault: true, moduleReady: true, safetyConfirmed: true }),
  );
  assert.equal(state.faultLock, false);
  assert.equal(state.owner, null);
  assert.equal(state.grant, null);
  state = schedulerScan(state, input(15));
  assert.deepEqual(state.grant, { station: 'B', jobSeq: 2 });
});

void test('sequence is bounded, monotonic time is enforced, and downloaded scripts pass', () => {
  let state = initialScheduler({ firstSequence: MAX_SEQUENCE });
  state = schedulerScan(state, input(0, { requestA: true, requestB: true }));
  assert.equal(state.ownerJobSeq, MAX_SEQUENCE);
  assert.equal(state.pending.B, null);
  assert.deepEqual(state.events, [
    'request_B_rejected_sequence_exhausted',
    'granted_A_1000000',
  ]);
  state = schedulerScan(state, input(1));
  state = schedulerScan(state, input(2, { requestB: true }));
  assert.equal(state.event, 'request_B_rejected_sequence_exhausted');
  assert.throws(
    () => schedulerScan(state, input(-1)),
    /nondecreasing safe integer/,
  );
  const folder = 'public/examples/resource-scheduler';
  assert.match(
    execFileSync(process.execPath, ['self-test.mjs'], {
      cwd: folder,
      encoding: 'utf8',
    }),
    /self-test: PASS/,
  );
  assert.match(
    execFileSync(process.execPath, ['demo.mjs'], {
      cwd: folder,
      encoding: 'utf8',
    }),
    /demo: PASS/,
  );
});

void test('MAX_SAFE deadline can time out, while a later grant reports clock exhaustion', () => {
  let state = initialScheduler({ maxHoldMs: 10 });
  const atLastGrant = Number.MAX_SAFE_INTEGER - 10;
  state = schedulerScan(state, input(atLastGrant, { requestA: true }));
  assert.equal(state.deadlineMs, Number.MAX_SAFE_INTEGER);
  state = schedulerScan(state, input(Number.MAX_SAFE_INTEGER));
  assert.equal(state.faultLock, true);
  assert.equal(state.event, 'timeout_A_1');
  state = schedulerScan(
    state,
    input(Number.MAX_SAFE_INTEGER, {
      resetFault: true,
      moduleReady: true,
      safetyConfirmed: true,
    }),
  );
  assert.equal(state.owner, null);
  assert.equal(state.grant, null);
  state = schedulerScan(state, input(Number.MAX_SAFE_INTEGER));
  state = schedulerScan(
    state,
    input(Number.MAX_SAFE_INTEGER, { requestB: true }),
  );
  assert.equal(state.owner, null);
  assert.deepEqual(state.pending.B, { station: 'B', seq: 2 });
  assert.equal(state.event, 'clock_exhausted');
});

void test('request falling does not cancel pending work and enable is always exclusive', () => {
  let state = initialScheduler();
  state = schedulerScan(state, input(0, { requestA: true }));
  state = schedulerScan(state, input(1, { requestB: true }));
  state = schedulerScan(state, input(2));
  assert.deepEqual(state.pending.B, { station: 'B', seq: 2 });

  state = initialScheduler();
  for (const nextInput of demoScans) {
    state = schedulerScan(state, nextInput);
    assert.notEqual(state.enable.A && state.enable.B, true);
  }
});
