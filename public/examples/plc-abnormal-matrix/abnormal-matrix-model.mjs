// Offline teaching model. One call represents one sampled scan; it does not
// emulate a PLC runtime, I/O refresh, communications, or physical outputs.

export const TIMEOUT_MS = 300;

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

function clearTerminal(next) {
  next.state = 'WAIT';
  next.currentRequestId = null;
  next.deadlineAtMs = null;
  next.outputRequestActive = false;
  next.result = null;
  next.reason = null;
}

function settle(next, state, reason) {
  next.state = state;
  next.deadlineAtMs = null;
  next.outputRequestActive = false;
  next.reason = reason;
}

function lateEvent(next, feedbackId) {
  if (feedbackId !== null)
    next.scanEvents.push({ code: 'LATE_FEEDBACK', feedbackId });
}

export function initialMatrix() {
  return {
    state: 'WAIT',
    lastNowMs: 0,
    lastAcceptedRequestId: 0,
    currentRequestId: null,
    deadlineAtMs: null,
    outputRequestActive: false,
    result: null,
    reason: null,
    previousRequestLevel: false,
    scanEvents: [],
  };
}

export function matrixScan(
  before,
  {
    nowMs,
    requestLevel = false,
    requestId = null,
    feedbackId = null,
    ackId = null,
    cancel = false,
    reset = false,
  },
) {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0)
    throw new TypeError('nowMs must be a non-negative safe integer');
  if (nowMs < before.lastNowMs)
    throw new RangeError('nowMs must not move backward');
  assertBoolean(requestLevel, 'requestLevel');
  assertBoolean(cancel, 'cancel');
  assertBoolean(reset, 'reset');
  assertOptionalId(requestId, 'requestId');
  assertOptionalId(feedbackId, 'feedbackId');
  assertOptionalId(ackId, 'ackId');
  if (requestLevel && requestId === null)
    throw new TypeError('requestId is required while requestLevel is true');
  if (!requestLevel && requestId !== null)
    throw new TypeError('requestId must be null while requestLevel is false');

  const requestRaised = requestLevel && !before.previousRequestLevel;
  const next = {
    ...before,
    lastNowMs: nowMs,
    previousRequestLevel: requestLevel,
    scanEvents: [],
  };

  if (before.state === 'WAIT') {
    if (feedbackId !== null)
      next.scanEvents.push({ code: 'ORPHAN_FEEDBACK', feedbackId });
    if (!requestRaised) return next;
    if (requestId <= before.lastAcceptedRequestId) {
      next.scanEvents.push({ code: 'REUSED_REQUEST_ID', requestId });
      return next;
    }
    if (nowMs > Number.MAX_SAFE_INTEGER - TIMEOUT_MS)
      throw new RangeError(
        'deadlineAtMs cannot exceed Number.MAX_SAFE_INTEGER',
      );
    next.state = 'RUN';
    next.lastAcceptedRequestId = requestId;
    next.currentRequestId = requestId;
    next.deadlineAtMs = nowMs + TIMEOUT_MS;
    next.outputRequestActive = true;
    next.result = null;
    next.reason = null;
    next.scanEvents.push({ code: 'ACCEPTED', requestId });
    return next;
  }

  if (requestRaised) next.scanEvents.push({ code: 'BUSY_REJECT', requestId });

  if (before.state === 'RUN') {
    if (cancel) {
      settle(next, 'CANCELLED', 'CANCEL');
      lateEvent(next, feedbackId);
      return next;
    }
    if (nowMs >= before.deadlineAtMs) {
      settle(next, 'ERROR', 'TIMEOUT');
      lateEvent(next, feedbackId);
      return next;
    }
    if (feedbackId === null) return next;
    if (feedbackId !== before.currentRequestId) {
      next.scanEvents.push({
        code: 'WRONG_FEEDBACK',
        feedbackId,
        expectedRequestId: before.currentRequestId,
      });
      return next;
    }
    settle(next, 'DONE', null);
    next.result = { requestId: feedbackId, feedbackAtMs: nowMs };
    next.scanEvents.push({ code: 'COMPLETED', feedbackId });
    return next;
  }

  lateEvent(next, feedbackId);
  if (before.state === 'DONE') {
    if (ackId === null) return next;
    if (ackId !== before.currentRequestId) {
      next.scanEvents.push({
        code: 'BAD_ACK',
        ackId,
        expectedRequestId: before.currentRequestId,
      });
      return next;
    }
    next.scanEvents.push({ code: 'ACKNOWLEDGED', ackId });
    clearTerminal(next);
    return next;
  }

  if (reset) {
    next.scanEvents.push({ code: 'RESET', requestId: before.currentRequestId });
    clearTerminal(next);
  }
  return next;
}
