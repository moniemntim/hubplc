// Offline teaching model. One call is one Receiver scan over a Sender snapshot.
// It does not emulate a PLC runtime, I/O refresh, communications, or outputs.

export const RESULT_TIMEOUT_MS = 200;

function isId(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function assertOptionalId(value, name) {
  if (value !== null && !isId(value))
    throw new TypeError(`${name} must be a positive safe integer or null`);
}

function assertBoolean(value, name) {
  if (typeof value !== 'boolean')
    throw new TypeError(`${name} must be boolean`);
}

function clonePayload(payload) {
  try {
    return structuredClone(payload);
  } catch {
    throw new TypeError('sender.payload must be structured-cloneable');
  }
}

function clearCurrent(next) {
  next.mode = 'IDLE';
  next.current = null;
  next.acceptHeld = false;
  next.result = null;
}

function holdResult(next, status, reason) {
  next.mode = 'RESULT';
  next.result = {
    requestId: next.current.requestId,
    status,
    reason,
  };
}

function signalsFor(state) {
  const result = state.result;
  return {
    accept: state.acceptHeld,
    acceptId: state.acceptHeld ? state.current.requestId : null,
    busy: state.mode === 'BUSY',
    done: result?.status === 'SUCCESS',
    fail: result?.status === 'FAIL',
    resultId: result?.requestId ?? null,
    resultReason: result?.reason ?? null,
    rejectId: state.reject?.requestId ?? null,
    rejectReason: state.reject?.reason ?? null,
  };
}

export function initialReceiver() {
  return {
    mode: 'IDLE',
    lastNowMs: 0,
    lastAcceptedId: 0,
    requestArmed: true,
    acceptHeld: false,
    current: null,
    result: null,
    reject: null,
    scanEvents: [],
  };
}

export function receiverScan(
  before,
  {
    nowMs,
    sender: {
      req = false,
      requestId = null,
      payload = null,
      resultAckId = null,
    } = {},
    worker: { complete = false, failCode = null } = {},
  },
) {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0)
    throw new TypeError('nowMs must be a non-negative safe integer');
  if (nowMs < before.lastNowMs)
    throw new RangeError('nowMs must not move backward');
  assertBoolean(req, 'sender.req');
  assertBoolean(complete, 'worker.complete');
  assertOptionalId(requestId, 'sender.requestId');
  assertOptionalId(resultAckId, 'sender.resultAckId');
  if (req && requestId === null)
    throw new TypeError(
      'sender.requestId is required while sender.req is true',
    );
  if (!req && requestId !== null)
    throw new TypeError(
      'sender.requestId must be null while sender.req is false',
    );
  if (
    failCode !== null &&
    (typeof failCode !== 'string' || failCode.length === 0)
  )
    throw new TypeError('worker.failCode must be a non-empty string or null');

  const next = { ...before, lastNowMs: nowMs, scanEvents: [] };
  const newRequest = req && before.requestArmed;

  if (!req) {
    next.requestArmed = true;
    next.reject = null;
    if (next.acceptHeld) next.acceptHeld = false;
  } else if (newRequest) {
    next.requestArmed = false;
  }

  if (newRequest && before.mode === 'BUSY') {
    next.reject = { requestId, reason: 'BUSY' };
    next.scanEvents.push({ code: 'BUSY_REJECT', requestId });
  } else if (newRequest && before.mode === 'RESULT') {
    next.reject = { requestId, reason: 'RESULT_PENDING' };
    next.scanEvents.push({ code: 'RESULT_PENDING_REJECT', requestId });
  }

  if (before.mode === 'IDLE' && newRequest) {
    if (requestId <= before.lastAcceptedId) {
      next.scanEvents.push({ code: 'STALE_REQUEST_ID', requestId });
      return { state: next, signals: signalsFor(next) };
    }
    if (nowMs > Number.MAX_SAFE_INTEGER - RESULT_TIMEOUT_MS)
      throw new RangeError(
        'deadlineAtMs cannot exceed Number.MAX_SAFE_INTEGER',
      );
    next.mode = 'BUSY';
    next.lastAcceptedId = requestId;
    next.acceptHeld = true;
    next.current = {
      requestId,
      payload: clonePayload(payload),
      acceptedAtMs: nowMs,
      deadlineAtMs: nowMs + RESULT_TIMEOUT_MS,
    };
    next.scanEvents.push({ code: 'ACCEPTED', requestId });
    return { state: next, signals: signalsFor(next) };
  }

  if (before.mode === 'BUSY') {
    if (nowMs >= before.current.deadlineAtMs) {
      holdResult(next, 'FAIL', 'TIMEOUT');
      next.scanEvents.push({
        code: 'TIMEOUT',
        requestId: before.current.requestId,
      });
    } else if (failCode !== null) {
      holdResult(next, 'FAIL', failCode);
      next.scanEvents.push({
        code: 'FAILED',
        requestId: before.current.requestId,
      });
    } else if (complete) {
      holdResult(next, 'SUCCESS', null);
      next.scanEvents.push({
        code: 'COMPLETED',
        requestId: before.current.requestId,
      });
    }
    return { state: next, signals: signalsFor(next) };
  }

  if (before.mode === 'RESULT' && resultAckId !== null) {
    if (resultAckId === before.result.requestId) {
      if (before.acceptHeld || req) {
        next.scanEvents.push({
          code: 'RESULT_ACK_BEFORE_REQ_RELEASE',
          resultAckId,
        });
        return { state: next, signals: signalsFor(next) };
      }
      next.scanEvents.push({ code: 'RESULT_ACKNOWLEDGED', resultAckId });
      clearCurrent(next);
    } else {
      next.scanEvents.push({
        code: 'WRONG_RESULT_ACK',
        resultAckId,
        expectedRequestId: before.result.requestId,
      });
    }
  }
  return { state: next, signals: signalsFor(next) };
}
