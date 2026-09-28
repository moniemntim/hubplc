export const HEARTBEAT_LIMIT_MS = 600;
export const DATA_AGE_LIMIT_MS = 2000;

const QUALITY = new Set(['GOOD', 'UNCERTAIN', 'BAD']);
const CONNECTION = new Set([
  'CONNECTED_WAITING_DATA',
  'RUNNING',
  'STOPPED',
  'WATCHDOG_EXPIRED',
]);

const clone = (value) => structuredClone(value);

function requireTime(name, value) {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new RangeError(`${name} must be a nonnegative safe integer`);
}

function requireNow(state, nowMs) {
  requireTime('nowMs', nowMs);
  if (nowMs < state.nowMs)
    throw new RangeError('nowMs must be monotonic within this monitor');
}

function validateState(state) {
  if (!state || typeof state !== 'object')
    throw new TypeError('state is required');
  requireTime('state.nowMs', state.nowMs);
  if (!Number.isSafeInteger(state.epoch) || state.epoch < 1)
    throw new RangeError('state epoch must be a positive safe integer');
  if (typeof state.clockId !== 'string' || state.clockId.length === 0)
    throw new TypeError('state clockId is required');
  if (!QUALITY.has(state.quality) || !CONNECTION.has(state.connection))
    throw new RangeError('unknown state quality or connection');
}

function withNow(state, nowMs) {
  validateState(state);
  requireNow(state, nowMs);
  return updateAges({ ...clone(state), nowMs }, { enforce: false });
}

function markBad(next, reason) {
  next.quality = 'BAD';
  next.reason = reason;
  return next;
}

function updateAges(next, { enforce }) {
  if (next.receivedAtMs === null) return next;
  if (next.receivedClockId !== next.clockId)
    return enforce ? markBad(next, 'RECEIVE_CLOCK_MISMATCH') : next;
  const receiveAgeMs = next.nowMs - next.receivedAtMs;
  if (receiveAgeMs < 0)
    return enforce ? markBad(next, 'RECEIVE_TIME_IN_FUTURE') : next;
  next.receiveAgeMs = receiveAgeMs;
  if (next.sourceAtMs !== null) {
    if (next.sourceClockId !== next.clockId)
      return enforce ? markBad(next, 'SOURCE_CLOCK_MISMATCH') : next;
    const sourceAgeMs = next.nowMs - next.sourceAtMs;
    if (sourceAgeMs < 0)
      return enforce ? markBad(next, 'SOURCE_TIME_IN_FUTURE') : next;
    next.sourceAgeMs = sourceAgeMs;
    if (enforce && receiveAgeMs >= DATA_AGE_LIMIT_MS)
      return markBad(next, 'RECEIVE_AGE_EXPIRED');
    if (enforce && sourceAgeMs >= DATA_AGE_LIMIT_MS)
      return markBad(next, 'SOURCE_AGE_EXPIRED');
  }
  if (enforce && receiveAgeMs >= DATA_AGE_LIMIT_MS)
    return markBad(next, 'RECEIVE_AGE_EXPIRED');
  return next;
}

function heartbeatExpired(next) {
  return next.nowMs - next.lastHeartbeatAtMs >= HEARTBEAT_LIMIT_MS;
}

function expireHeartbeat(next) {
  if (
    ['RUNNING', 'CONNECTED_WAITING_DATA'].includes(next.connection) &&
    heartbeatExpired(next)
  ) {
    next.connection = 'WATCHDOG_EXPIRED';
    markBad(next, 'HEARTBEAT_EXPIRED');
    return true;
  }
  return false;
}

/**
 * Pure offline model. `clockId` identifies the one clock used for `nowMs`.
 * The model does not advance itself; an external monitor must call tick().
 */
export function createDataQualityMonitor({
  clockId = 'MONO-A',
  nowMs = 0,
} = {}) {
  if (typeof clockId !== 'string' || clockId.length === 0)
    throw new TypeError('clockId is required');
  requireTime('nowMs', nowMs);
  return {
    nowMs,
    clockId,
    epoch: 1,
    connection: 'CONNECTED_WAITING_DATA',
    quality: 'BAD',
    reason: 'AWAITING_CURRENT_EPOCH_DATA',
    value: null,
    lastGoodValue: null,
    lastGoodAtMs: null,
    receivedAtMs: null,
    receivedClockId: null,
    sourceAtMs: null,
    sourceClockId: null,
    receiveAgeMs: null,
    sourceFreshnessMs: null,
    sourceAgeMs: null,
    lastAcceptedSourceAtMs: null,
    lastHeartbeatAtMs: nowMs,
  };
}

export function inspect(state) {
  validateState(state);
  return clone(state);
}

export function tick(state, nowMs) {
  const next = withNow(state, nowMs);
  if (next.connection === 'STOPPED')
    return updateAges(next, { enforce: false });
  if (expireHeartbeat(next)) return next;
  if (next.connection === 'RUNNING') return updateAges(next, { enforce: true });
  return next;
}

export function heartbeat(state, nowMs) {
  const next = withNow(state, nowMs);
  if (expireHeartbeat(next)) return next;
  if (next.connection !== 'RUNNING') return next;
  next.lastHeartbeatAtMs = nowMs;
  return updateAges(next, { enforce: true });
}

export function gracefulStop(state, nowMs) {
  const next = withNow(state, nowMs);
  if (expireHeartbeat(next)) return next;
  if (next.connection === 'WATCHDOG_EXPIRED') return next;
  next.connection = 'STOPPED';
  next.quality = 'UNCERTAIN';
  next.reason = 'GRACEFUL_STOP';
  return next;
}

export function restart(state, nowMs) {
  const next = withNow(state, nowMs);
  expireHeartbeat(next);
  if (next.epoch === Number.MAX_SAFE_INTEGER)
    throw new RangeError('epoch exhausted');
  next.epoch++;
  next.connection = 'CONNECTED_WAITING_DATA';
  next.quality = 'BAD';
  next.reason = 'AWAITING_CURRENT_EPOCH_DATA';
  next.receivedAtMs = null;
  next.receivedClockId = null;
  next.sourceAtMs = null;
  next.sourceClockId = null;
  next.receiveAgeMs = null;
  next.sourceFreshnessMs = null;
  next.sourceAgeMs = null;
  next.lastAcceptedSourceAtMs = null;
  next.lastHeartbeatAtMs = nowMs;
  return next;
}

export function receiveGood(
  state,
  {
    nowMs,
    epoch,
    value,
    sourceAtMs,
    sourceClockId,
    receivedAtMs,
    receivedClockId,
  },
) {
  const next = withNow(state, nowMs);
  if (!Number.isSafeInteger(epoch) || epoch < 1)
    throw new RangeError('epoch must be a positive safe integer');
  if (!Number.isFinite(value)) throw new TypeError('value must be finite');
  requireTime('sourceAtMs', sourceAtMs);
  requireTime('receivedAtMs', receivedAtMs);
  if (typeof sourceClockId !== 'string' || sourceClockId.length === 0)
    throw new TypeError('sourceClockId is required');
  if (typeof receivedClockId !== 'string' || receivedClockId.length === 0)
    throw new TypeError('receivedClockId is required');
  if (expireHeartbeat(next))
    return { state: next, accepted: false, reason: next.reason };
  updateAges(next, { enforce: next.connection === 'RUNNING' });
  if (epoch !== next.epoch)
    return { state: next, accepted: false, reason: 'OLD_OR_UNEXPECTED_EPOCH' };
  if (next.connection === 'STOPPED' || next.connection === 'WATCHDOG_EXPIRED')
    return { state: next, accepted: false, reason: 'RESTART_REQUIRED' };
  if (receivedClockId !== next.clockId) {
    markBad(next, 'RECEIVE_CLOCK_MISMATCH');
    return { state: next, accepted: false, reason: next.reason };
  }
  if (receivedAtMs > nowMs) {
    markBad(next, 'RECEIVE_TIME_IN_FUTURE');
    return { state: next, accepted: false, reason: next.reason };
  }
  if (sourceClockId !== receivedClockId) {
    markBad(next, 'SOURCE_CLOCK_MISMATCH');
    return { state: next, accepted: false, reason: next.reason };
  }
  if (sourceAtMs > receivedAtMs) {
    markBad(next, 'SOURCE_TIME_IN_FUTURE');
    return { state: next, accepted: false, reason: next.reason };
  }
  const sourceFreshnessMs = receivedAtMs - sourceAtMs;
  const receiveAgeMs = nowMs - receivedAtMs;
  const sourceAgeMs = nowMs - sourceAtMs;
  if (
    next.lastAcceptedSourceAtMs !== null &&
    sourceAtMs <= next.lastAcceptedSourceAtMs
  ) {
    markBad(next, 'SOURCE_NOT_NEWER');
    return { state: next, accepted: false, reason: next.reason };
  }
  if (
    sourceFreshnessMs >= DATA_AGE_LIMIT_MS ||
    receiveAgeMs >= DATA_AGE_LIMIT_MS ||
    sourceAgeMs >= DATA_AGE_LIMIT_MS
  ) {
    markBad(next, 'STALE_DATA');
    return { state: next, accepted: false, reason: next.reason };
  }
  next.connection = 'RUNNING';
  next.quality = 'GOOD';
  next.reason = 'CURRENT_EPOCH_FRESH_DATA';
  next.value = value;
  next.lastGoodValue = value;
  next.lastGoodAtMs = nowMs;
  next.receivedAtMs = receivedAtMs;
  next.receivedClockId = receivedClockId;
  next.sourceAtMs = sourceAtMs;
  next.sourceClockId = sourceClockId;
  next.receiveAgeMs = receiveAgeMs;
  next.sourceFreshnessMs = sourceFreshnessMs;
  next.sourceAgeMs = sourceAgeMs;
  next.lastAcceptedSourceAtMs = sourceAtMs;
  next.lastHeartbeatAtMs = nowMs;
  return { state: next, accepted: true, reason: 'ACCEPTED' };
}

export function ordinaryAutomaticUse(state) {
  validateState(state);
  const allowed =
    state.connection === 'RUNNING' &&
    state.quality === 'GOOD' &&
    state.receiveAgeMs !== null &&
    state.receiveAgeMs < DATA_AGE_LIMIT_MS &&
    state.sourceAgeMs !== null &&
    state.sourceAgeMs < DATA_AGE_LIMIT_MS;
  return { allowed, reason: allowed ? 'CURRENT_GOOD_DATA' : state.reason };
}
