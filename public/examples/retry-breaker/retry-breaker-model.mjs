export const BACKOFF = Object.freeze({
  baseMs: 1000,
  multiplier: 2,
  capMs: 8000,
});
export const BREAKER = Object.freeze({
  failureThreshold: 5,
  failureWindowMs: 20000,
  openMs: 30000,
  probeTimeoutMs: 1000,
});

const assertNow = (nowMs, previousNowMs) => {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0 || nowMs < previousNowMs)
    throw new RangeError(
      'nowMs must be a nonnegative, nondecreasing safe integer',
    );
};

const assertToken = (token) => {
  if (typeof token !== 'string' || token.length === 0)
    throw new TypeError('token must be nonempty text');
};

const safeAdd = (left, right, name) => {
  const result = left + right;
  if (!Number.isSafeInteger(result))
    throw new RangeError(`${name} exceeds safe integer range`);
  return result;
};

export function makeBackoffPlan(samples) {
  if (!Array.isArray(samples) || samples.length === 0)
    throw new RangeError('samples must be a nonempty array');
  return samples.map((sample, index) => {
    if (!Number.isFinite(sample) || sample < 0 || sample >= 1)
      throw new RangeError(`samples[${index}] must be finite and in [0, 1)`);
    const capMs = Math.min(
      BACKOFF.capMs,
      BACKOFF.baseMs * BACKOFF.multiplier ** index,
    );
    return {
      retryNumber: index + 1,
      sample,
      capMs,
      waitMs: Math.floor(sample * capMs),
    };
  });
}

/**
 * A virtual retry timeline. Every call is an externally-approved, retry-safe
 * read failure; attempts include the original call. No timer, network call,
 * PLC access, or sleep occurs. It has no write or unknown-outcome semantics.
 */
export function simulateRetry({ callElapsedMs, deadlineMs, samples }) {
  if (!Array.isArray(callElapsedMs) || callElapsedMs.length === 0)
    throw new RangeError('callElapsedMs must be a nonempty array');
  if (!Number.isSafeInteger(deadlineMs) || deadlineMs <= 0)
    throw new RangeError('deadlineMs must be a positive safe integer');
  for (const [index, elapsedMs] of callElapsedMs.entries())
    if (!Number.isSafeInteger(elapsedMs) || elapsedMs < 0)
      throw new RangeError(
        `callElapsedMs[${index}] must be a nonnegative safe integer`,
      );
  const backoff = makeBackoffPlan(samples);
  if (backoff.length < callElapsedMs.length - 1)
    throw new RangeError('samples must cover every retry wait');

  let nowMs = 0;
  const attempts = [];
  for (const [index, requestedCallMs] of callElapsedMs.entries()) {
    if (nowMs >= deadlineMs) break;
    const startedAtMs = nowMs;
    const availableCallMs = deadlineMs - nowMs;
    const observedCallMs = Math.min(requestedCallMs, availableCallMs);
    nowMs += observedCallMs;
    const attempt = {
      attempt: index + 1,
      startedAtMs,
      requestedCallMs,
      observedCallMs,
      callEndedAtMs: nowMs,
      requestedWaitMs: 0,
      observedWaitMs: 0,
      endedBy: null,
    };
    if (observedCallMs < requestedCallMs || nowMs >= deadlineMs) {
      attempt.endedBy = 'DEADLINE_DURING_CALL';
      attempts.push(attempt);
      break;
    }
    if (index === callElapsedMs.length - 1) {
      attempt.endedBy = 'ATTEMPTS_EXHAUSTED';
      attempts.push(attempt);
      break;
    }
    const planned = backoff[index];
    attempt.requestedWaitMs = planned.waitMs;
    attempt.observedWaitMs = Math.min(planned.waitMs, deadlineMs - nowMs);
    nowMs += attempt.observedWaitMs;
    if (attempt.observedWaitMs < attempt.requestedWaitMs || nowMs >= deadlineMs)
      attempt.endedBy = 'DEADLINE_BEFORE_NEXT_ATTEMPT';
    attempts.push(attempt);
    if (attempt.endedBy !== null) break;
  }
  return { deadlineMs, attempts, endedAtMs: nowMs };
}

export function initialBreaker() {
  return {
    phase: 'CLOSED',
    lastNowMs: 0,
    failureTimesMs: [],
    openUntilMs: null,
    activePermit: null,
    nextToken: 1,
  };
}

const transitionOpen = (state, nowMs) => ({
  ...state,
  phase: 'OPEN',
  openUntilMs: safeAdd(nowMs, BREAKER.openMs, 'open deadline'),
  activePermit: null,
  failureTimesMs: [],
});

const closed = (state) => ({
  ...state,
  phase: 'CLOSED',
  openUntilMs: null,
  activePermit: null,
  failureTimesMs: [],
});

/**
 * Advances only when the caller explicitly supplies nowMs. A probe that has
 * not replied is timed out here, so it cannot hold HALF_OPEN forever.
 */
export function advanceBreaker(before, nowMs) {
  assertNow(nowMs, before.lastNowMs);
  let state = { ...before, lastNowMs: nowMs };
  if (
    state.activePermit?.kind === 'PROBE' &&
    nowMs >= state.activePermit.deadlineMs
  )
    return { state: transitionOpen(state, nowMs), transition: 'PROBE_TIMEOUT' };
  if (state.phase === 'OPEN' && nowMs >= state.openUntilMs)
    state = { ...state, phase: 'HALF_OPEN' };
  return { state, transition: null };
}

/**
 * Grants at most one active permit. OPEN-to-HALF_OPEN happens only when this
 * explicit call observes nowMs at or beyond the stored open deadline.
 */
export function acquirePermit(before, nowMs) {
  const { state } = advanceBreaker(before, nowMs);
  if (state.activePermit !== null)
    return { state, decision: 'ACTIVE_PERMIT_REJECTED', permit: null };
  if (state.phase === 'OPEN')
    return { state, decision: 'CIRCUIT_OPEN_REJECTED', permit: null };
  const isProbe = state.phase === 'HALF_OPEN';
  if (
    !Number.isSafeInteger(state.nextToken) ||
    state.nextToken < 1 ||
    state.nextToken >= Number.MAX_SAFE_INTEGER
  )
    throw new RangeError('nextToken cannot be incremented safely');
  const token = `${isProbe ? 'probe' : 'call'}-${state.nextToken}`;
  const permit = {
    token,
    kind: isProbe ? 'PROBE' : 'CALL',
    deadlineMs: isProbe
      ? safeAdd(nowMs, BREAKER.probeTimeoutMs, 'probe deadline')
      : null,
  };
  return {
    state: { ...state, activePermit: permit, nextToken: state.nextToken + 1 },
    decision: isProbe ? 'PROBE_GRANTED' : 'CALL_GRANTED',
    permit,
  };
}

/**
 * Completion is virtual. For a probe, nowMs >= deadlineMs is timeout first,
 * even if the supplied outcome says success. Old tokens are ignored.
 */
export function completePermit(before, nowMs, token, outcome) {
  const observed = advanceBreaker(before, nowMs);
  assertToken(token);
  if (
    !['SUCCESS', 'RETRYABLE_FAILURE', 'NONRETRYABLE_FAILURE'].includes(outcome)
  )
    throw new TypeError('outcome is invalid');
  const state = observed.state;
  if (observed.transition === 'PROBE_TIMEOUT')
    return { state, decision: 'PROBE_TIMEOUT' };
  const permit = state.activePermit;
  if (permit === null || permit.token !== token)
    return { state, decision: 'STALE_TOKEN_IGNORED' };

  if (permit.kind === 'PROBE') {
    if (nowMs >= permit.deadlineMs)
      return { state: transitionOpen(state, nowMs), decision: 'PROBE_TIMEOUT' };
    if (outcome === 'SUCCESS')
      return { state: closed(state), decision: 'PROBE_SUCCESS_CLOSED' };
    return {
      state: transitionOpen(state, nowMs),
      decision: 'PROBE_FAILURE_OPENED',
    };
  }

  if (outcome !== 'RETRYABLE_FAILURE')
    return { state: closed(state), decision: 'CALL_COMPLETED_CLOSED' };
  const failureTimesMs = [...state.failureTimesMs, nowMs].filter(
    (failedAtMs) => failedAtMs >= nowMs - BREAKER.failureWindowMs,
  );
  const after = { ...state, activePermit: null, failureTimesMs };
  if (failureTimesMs.length >= BREAKER.failureThreshold)
    return {
      state: transitionOpen(after, nowMs),
      decision: 'FAILURE_THRESHOLD_OPENED',
    };
  return { state: after, decision: 'RETRYABLE_FAILURE_RECORDED' };
}
