// Single-wait offline teaching model; output is a virtual command only.
export const WAIT_LIMIT_MS = 5000;
export function initialWait() {
  return {
    state: 'IDLE',
    lastNowMs: 0,
    previousStart: true,
    resetArmed: false,
    enteredAtMs: null,
    elapsedMs: 0,
    output: false,
    error: null,
    lastFault: null,
    action: 'initial',
  };
}
export function waitScan(
  before,
  {
    nowMs,
    start = false,
    reset = false,
    stop = false,
    sensorB = false,
    valid = true,
    permit = true,
    ack = false,
  },
) {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0 || nowMs < before.lastNowMs)
    throw new RangeError('nowMs must be a nonnegative monotonic safe integer');
  if (
    ![start, reset, stop, sensorB, valid, permit, ack].every(
      (value) => typeof value === 'boolean',
    )
  )
    throw new TypeError('all signals must be boolean');
  const risingStart = start && !before.previousStart;
  const resetPulse = reset && before.resetArmed && valid;
  const ready = valid && permit && !stop && !sensorB;
  const next = {
    ...before,
    lastNowMs: nowMs,
    previousStart: start,
    resetArmed: valid && !reset,
    action: 'hold',
  };
  const idle = (action) => {
    next.state = 'IDLE';
    next.enteredAtMs = null;
    next.elapsedMs = 0;
    next.error = null;
    next.action = action;
  };
  if (before.state === 'IDLE') {
    if (risingStart) {
      if (!ready) next.action = 'start-rejected';
      else {
        next.state = 'WAIT_SENSOR_B';
        next.enteredAtMs = nowMs;
        next.elapsedMs = 0;
        next.action = 'started';
      }
    }
  } else if (before.state === 'WAIT_SENSOR_B') {
    next.elapsedMs = nowMs - before.enteredAtMs;
    const error = stop
      ? 'STOP'
      : !valid
        ? 'BAD_INPUT'
        : !permit
          ? 'PERMIT_LOST'
          : next.elapsedMs >= WAIT_LIMIT_MS
            ? 'TIMEOUT_B'
            : null;
    if (error) {
      next.state = 'FAULT';
      next.error = error;
      next.action = 'fault';
      next.lastFault = {
        code: error,
        faultStep: before.state,
        atMs: nowMs,
        enteredAtMs: before.enteredAtMs,
        elapsedMs: next.elapsedMs,
        sensorB,
        valid,
        permit,
        stop,
        outputBefore: before.output,
      };
    } else if (sensorB) {
      next.state = 'DONE';
      next.action = 'completed';
    }
  } else if (before.state === 'FAULT') {
    if (resetPulse) {
      if (ready) idle('reset-accepted');
      else next.action = 'reset-rejected';
    }
  } else if (before.state === 'DONE' && ack) idle('acknowledged');
  next.output = next.state === 'WAIT_SENSOR_B';
  return next;
}
