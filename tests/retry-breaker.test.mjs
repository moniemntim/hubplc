import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acquirePermit,
  advanceBreaker,
  completePermit,
  initialBreaker,
  makeBackoffPlan,
  simulateRetry,
} from '../public/examples/retry-breaker/retry-breaker-model.mjs';

const samples = [0.63, 0.705, 0.05, 0.8375, 0.35];

const openBreaker = () => {
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
  return state;
};

void test('fixed U samples give deterministic full-jitter arithmetic', () => {
  assert.deepEqual(
    makeBackoffPlan(samples).map(({ retryNumber, capMs, waitMs }) => [
      retryNumber,
      capMs,
      waitMs,
    ]),
    [
      [1, 1000, 630],
      [2, 2000, 1410],
      [3, 4000, 200],
      [4, 8000, 6700],
      [5, 8000, 2800],
    ],
  );
});

void test('attempt includes original call and overall deadline truncates wait', () => {
  const result = simulateRetry({
    callElapsedMs: [100, 200, 300, 400, 500, 600],
    deadlineMs: 13000,
    samples,
  });
  assert.deepEqual(
    result.attempts.map(
      ({
        attempt,
        startedAtMs,
        observedCallMs,
        requestedWaitMs,
        observedWaitMs,
        endedBy,
      }) => [
        attempt,
        startedAtMs,
        observedCallMs,
        requestedWaitMs,
        observedWaitMs,
        endedBy,
      ],
    ),
    [
      [1, 0, 100, 630, 630, null],
      [2, 730, 200, 1410, 1410, null],
      [3, 2340, 300, 200, 200, null],
      [4, 2840, 400, 6700, 6700, null],
      [5, 9940, 500, 2800, 2560, 'DEADLINE_BEFORE_NEXT_ATTEMPT'],
    ],
  );
  assert.equal(result.endedAtMs, 13000);
});

void test('five retryable failures open, only one half-open probe is permitted, and success closes', () => {
  const state = openBreaker();
  assert.equal(state.phase, 'OPEN');
  assert.equal(state.openUntilMs, 30400);
  assert.equal(acquirePermit(state, 1000).decision, 'CIRCUIT_OPEN_REJECTED');
  const probe = acquirePermit(state, 30400);
  assert.equal(probe.decision, 'PROBE_GRANTED');
  assert.equal(
    acquirePermit(probe.state, 30400).decision,
    'ACTIVE_PERMIT_REJECTED',
  );
  const success = completePermit(
    probe.state,
    30450,
    probe.permit.token,
    'SUCCESS',
  );
  assert.equal(success.decision, 'PROBE_SUCCESS_CLOSED');
  assert.equal(success.state.phase, 'CLOSED');
});

void test('probe timeout wins at equality, failure opens, and old token completion is ignored', () => {
  let state = openBreaker();
  let probe = acquirePermit(state, 30400);
  const timeout = completePermit(
    probe.state,
    31400,
    probe.permit.token,
    'SUCCESS',
  );
  assert.equal(timeout.decision, 'PROBE_TIMEOUT');
  assert.equal(timeout.state.phase, 'OPEN');
  assert.equal(timeout.state.openUntilMs, 61400);
  assert.equal(
    completePermit(timeout.state, 31401, probe.permit.token, 'SUCCESS')
      .decision,
    'STALE_TOKEN_IGNORED',
  );

  state = openBreaker();
  probe = acquirePermit(state, 30400);
  const failed = completePermit(
    probe.state,
    30450,
    probe.permit.token,
    'RETRYABLE_FAILURE',
  );
  assert.equal(failed.decision, 'PROBE_FAILURE_OPENED');
  assert.equal(failed.state.phase, 'OPEN');
});

void test('an explicit observation times out a silent probe and later reply stays stale', () => {
  const state = openBreaker();
  const probe = acquirePermit(state, 30400);
  const observed = advanceBreaker(probe.state, 31400);
  assert.equal(observed.transition, 'PROBE_TIMEOUT');
  assert.equal(observed.state.phase, 'OPEN');
  assert.equal(
    acquirePermit(observed.state, 31401).decision,
    'CIRCUIT_OPEN_REJECTED',
  );
  assert.equal(
    completePermit(observed.state, 31401, probe.permit.token, 'SUCCESS')
      .decision,
    'STALE_TOKEN_IGNORED',
  );
});

void test('failure window includes 20000 ms and success or nonretryable completion clears it', () => {
  let state = initialBreaker();
  for (const nowMs of [0, 5000, 10000, 15000, 20000]) {
    const permit = acquirePermit(state, nowMs);
    state = completePermit(
      permit.state,
      nowMs,
      permit.permit.token,
      'RETRYABLE_FAILURE',
    ).state;
  }
  assert.equal(state.phase, 'OPEN');

  state = initialBreaker();
  for (const nowMs of [0, 5000, 10000, 15000, 20001]) {
    const permit = acquirePermit(state, nowMs);
    state = completePermit(
      permit.state,
      nowMs,
      permit.permit.token,
      'RETRYABLE_FAILURE',
    ).state;
  }
  assert.equal(state.phase, 'CLOSED');
  assert.equal(state.failureTimesMs.length, 4);

  for (const outcome of ['SUCCESS', 'NONRETRYABLE_FAILURE']) {
    state = initialBreaker();
    for (const nowMs of [0, 1]) {
      const permit = acquirePermit(state, nowMs);
      state = completePermit(
        permit.state,
        nowMs,
        permit.permit.token,
        'RETRYABLE_FAILURE',
      ).state;
    }
    const permit = acquirePermit(state, 2);
    state = completePermit(permit.state, 2, permit.permit.token, outcome).state;
    assert.deepEqual(state.failureTimesMs, []);
  }
});

void test('invalid inputs and time reversal are rejected', () => {
  assert.throws(() => makeBackoffPlan([1]), RangeError);
  assert.throws(
    () =>
      acquirePermit(
        { ...initialBreaker(), phase: 'HALF_OPEN' },
        Number.MAX_SAFE_INTEGER,
      ),
    RangeError,
  );
  assert.throws(
    () => simulateRetry({ callElapsedMs: [1], deadlineMs: 0, samples: [0.5] }),
    RangeError,
  );
  assert.throws(() => acquirePermit(initialBreaker(), -1), RangeError);
  const permit = acquirePermit(initialBreaker(), 10);
  assert.throws(
    () => completePermit(permit.state, 9, permit.permit.token, 'SUCCESS'),
    RangeError,
  );
  assert.throws(
    () => completePermit(permit.state, 10, '', 'SUCCESS'),
    TypeError,
  );
  assert.throws(
    () =>
      acquirePermit(
        { ...initialBreaker(), nextToken: Number.MAX_SAFE_INTEGER },
        0,
      ),
    RangeError,
  );
  assert.throws(
    () =>
      completePermit(
        {
          ...initialBreaker(),
          lastNowMs: Number.MAX_SAFE_INTEGER - 1,
          activePermit: { token: 'call-1', kind: 'CALL', deadlineMs: null },
          failureTimesMs: Array(4).fill(Number.MAX_SAFE_INTEGER - 1),
        },
        Number.MAX_SAFE_INTEGER - 1,
        'call-1',
        'RETRYABLE_FAILURE',
      ),
    RangeError,
  );
});

void test('overall deadline wins at exact call and wait boundaries', () => {
  const call = simulateRetry({
    callElapsedMs: [100, 50],
    deadlineMs: 100,
    samples: [0],
  });
  assert.equal(call.attempts.length, 1);
  assert.equal(call.attempts[0].endedBy, 'DEADLINE_DURING_CALL');
  const wait = simulateRetry({
    callElapsedMs: [100, 50],
    deadlineMs: 730,
    samples: [0.63],
  });
  assert.equal(wait.attempts.length, 1);
  assert.equal(wait.attempts[0].observedWaitMs, 630);
  assert.equal(wait.attempts[0].endedBy, 'DEADLINE_BEFORE_NEXT_ATTEMPT');
});
