import assert from 'node:assert/strict';
import test from 'node:test';
import {
  acquirePermit,
  advanceBreaker,
  completePermit,
  initialBreaker,
  makeBackoffPlan,
  simulateRetry,
} from './retry-breaker-model.mjs';

const samples = [0.63, 0.705, 0.05, 0.8375, 0.35];

void test('fixed samples produce the documented caps and waits', () => {
  assert.deepEqual(
    makeBackoffPlan(samples).map(({ capMs, waitMs }) => [capMs, waitMs]),
    [
      [1000, 630],
      [2000, 1410],
      [4000, 200],
      [8000, 6700],
      [8000, 2800],
    ],
  );
});

void test('whole deadline clips a wait and attempts include the original call', () => {
  const result = simulateRetry({
    callElapsedMs: [100, 200, 300, 400, 500, 600],
    deadlineMs: 13000,
    samples,
  });
  assert.equal(result.attempts.length, 5);
  assert.deepEqual(result.attempts.at(-1), {
    attempt: 5,
    startedAtMs: 9940,
    requestedCallMs: 500,
    observedCallMs: 500,
    callEndedAtMs: 10440,
    requestedWaitMs: 2800,
    observedWaitMs: 2560,
    endedBy: 'DEADLINE_BEFORE_NEXT_ATTEMPT',
  });
});

void test('a probe timeout wins at equality and old reply is ignored', () => {
  let state = initialBreaker();
  for (const nowMs of [0, 100, 200, 300, 400]) {
    const permit = acquirePermit(state, nowMs);
    state = completePermit(
      permit.state,
      nowMs,
      permit.permit.token,
      'RETRYABLE_FAILURE',
    ).state;
  }
  const probe = acquirePermit(state, 30400);
  state = probe.state;
  assert.equal(acquirePermit(state, 30400).decision, 'ACTIVE_PERMIT_REJECTED');
  const timedOut = completePermit(state, 31400, probe.permit.token, 'SUCCESS');
  assert.equal(timedOut.decision, 'PROBE_TIMEOUT');
  assert.equal(
    completePermit(timedOut.state, 31401, probe.permit.token, 'SUCCESS')
      .decision,
    'STALE_TOKEN_IGNORED',
  );
});

void test('a silent probe expires on explicit time observation', () => {
  let state = initialBreaker();
  for (const nowMs of [0, 100, 200, 300, 400]) {
    const permit = acquirePermit(state, nowMs);
    state = completePermit(
      permit.state,
      nowMs,
      permit.permit.token,
      'RETRYABLE_FAILURE',
    ).state;
  }
  const probe = acquirePermit(state, 30400);
  const observed = advanceBreaker(probe.state, 31400);
  assert.equal(observed.transition, 'PROBE_TIMEOUT');
  assert.equal(
    completePermit(observed.state, 31401, probe.permit.token, 'SUCCESS')
      .decision,
    'STALE_TOKEN_IGNORED',
  );
});
