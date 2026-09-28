export const FRESH_MS = 2000;
export const MAX_EVENTS = 64;
export const MAX_HISTORY = 64;

const clone = (state) => ({
  ...state,
  lastGood: state.lastGood && { ...state.lastGood },
  events: state.events.map((item) => ({ ...item })),
  trend: state.trend.map((item) => ({ ...item })),
});
const exact = (value, keys) => {
  if (
    value === null ||
    typeof value !== 'object' ||
    Object.getPrototypeOf(value) !== Object.prototype
  )
    return false;
  const own = Reflect.ownKeys(value);
  return (
    own.length === keys.length &&
    keys.every(
      (key) =>
        own.includes(key) &&
        Object.prototype.propertyIsEnumerable.call(value, key),
    )
  );
};
const time = (value) => Number.isSafeInteger(value) && value >= 0;
const validEpoch = (value) => Number.isSafeInteger(value) && value > 0;
const quality = (value) => value === 'Good' || value === 'Bad';
const finiteOrNull = (value) =>
  value === null || (typeof value === 'number' && Number.isFinite(value));

function add(state, action, extra = {}) {
  state.events.push({
    seq: state.nextEventSeq++,
    time: state.now,
    action,
    ...extra,
  });
  state.lastDecision = action;
}
function canChange(state, now) {
  if (!time(now) || now < state.now)
    throw new TypeError('now must be monotonic safe integer');
  if (state.fault) return null;
  if (
    state.events.length >= state.maxEvents ||
    state.trend.length >= state.maxHistory
  )
    return false;
  const next = clone(state);
  next.now = now;
  return next;
}
function fault(state, code) {
  return {
    ...state,
    fault: state.fault ?? code,
    known: false,
    lastDecision: code,
  };
}
function gap(state) {
  state.trend.push({ time: state.now, value: null });
}
function fresh(state) {
  return (
    state.lastGood !== null && state.now - state.lastGood.acquiredAt < FRESH_MS
  );
}
function validSample(request, now) {
  return (
    exact(request, [
      'epoch',
      'seq',
      'value',
      'quality',
      'acquiredAt',
      'receivedAt',
      'sourceChangedAt',
    ]) &&
    validEpoch(request.epoch) &&
    Number.isSafeInteger(request.seq) &&
    request.seq > 0 &&
    finiteOrNull(request.value) &&
    quality(request.quality) &&
    time(request.acquiredAt) &&
    time(request.receivedAt) &&
    request.acquiredAt <= request.receivedAt &&
    request.receivedAt <= now &&
    (request.sourceChangedAt === null ||
      (time(request.sourceChangedAt) &&
        request.sourceChangedAt <= request.acquiredAt))
  );
}

export function initialProjection({
  maxEvents = MAX_EVENTS,
  maxHistory = MAX_HISTORY,
} = {}) {
  if (
    !Number.isSafeInteger(maxEvents) ||
    maxEvents < 1 ||
    maxEvents > MAX_EVENTS ||
    !Number.isSafeInteger(maxHistory) ||
    maxHistory < 1 ||
    maxHistory > MAX_HISTORY
  )
    throw new TypeError('capacity invalid');
  return {
    now: 0,
    epoch: 1,
    expectedSeq: 1,
    nextEventSeq: 1,
    connection: 'Connected',
    pending: true,
    reconnectAt: null,
    rawQuality: 'Unknown',
    lastRawReceivedAt: null,
    lastAcceptedAcquiredAt: null,
    lastAcceptedReceivedAt: null,
    lastGood: null,
    events: [],
    trend: [],
    fault: null,
    known: true,
    lastDecision: null,
    maxEvents,
    maxHistory,
  };
}
export function view(state) {
  const isFresh = fresh(state);
  const noValue = state.lastGood === null;
  const age = noValue ? null : state.now - state.lastGood.acquiredAt;
  const dataState = state.fault
    ? 'FROZEN_UNKNOWN'
    : state.connection === 'Disconnected'
      ? 'DISCONNECTED'
      : state.pending
        ? 'PENDING_CURRENT_EPOCH'
        : state.rawQuality === 'Bad'
          ? 'BAD_LAST_GOOD'
          : noValue
            ? 'NO_VALUE'
            : isFresh
              ? 'FRESH'
              : 'STALE';
  return {
    epoch: state.epoch,
    connection: state.connection,
    pending: state.pending,
    rawQuality: state.rawQuality,
    value: noValue ? null : state.lastGood.value,
    lastGoodAcquiredAt: noValue ? null : state.lastGood.acquiredAt,
    lastSourceChangeAt: noValue ? null : state.lastGood.sourceChangedAt,
    lastReceivedAt: state.lastRawReceivedAt,
    lastGoodReceivedAt: noValue ? null : state.lastGood.receivedAt,
    lastGoodAge: age,
    fresh: isFresh,
    dataState,
    trendPoint: dataState === 'FRESH' ? state.lastGood.value : null,
  };
}
export function receive(state, now, request) {
  const next = canChange(state, now);
  if (next === null) return fault(state, 'fault_blocked');
  if (next === false) return fault(state, 'history_capacity');
  if (!validSample(request, now)) {
    add(next, 'sample_rejected_shape');
    gap(next);
    return next;
  }
  if (request.epoch !== next.epoch) {
    add(next, 'sample_rejected_epoch', {
      epoch: request.epoch,
      seq: request.seq,
    });
    gap(next);
    return next;
  }
  if (request.seq !== next.expectedSeq) {
    add(next, 'sample_rejected_seq', { seq: request.seq });
    gap(next);
    return next;
  }
  if (request.quality === 'Good' && request.value === null) {
    add(next, 'sample_rejected_no_good_value', { seq: request.seq });
    gap(next);
    return next;
  }
  if (next.connection !== 'Connected') {
    add(next, 'sample_rejected_disconnected', { seq: request.seq });
    gap(next);
    return next;
  }
  if (next.reconnectAt !== null && request.acquiredAt <= next.reconnectAt) {
    add(next, 'sample_rejected_old_cache', { seq: request.seq });
    gap(next);
    return next;
  }
  if (
    request.quality === 'Good' &&
    next.lastGood !== null &&
    request.acquiredAt <= next.lastGood.acquiredAt
  ) {
    add(next, 'sample_rejected_old_acquisition', { seq: request.seq });
    gap(next);
    return next;
  }
  if (
    (next.lastAcceptedAcquiredAt !== null &&
      request.acquiredAt <= next.lastAcceptedAcquiredAt) ||
    (next.lastAcceptedReceivedAt !== null &&
      request.receivedAt <= next.lastAcceptedReceivedAt)
  ) {
    add(next, 'sample_rejected_not_newer', { seq: request.seq });
    gap(next);
    return next;
  }
  next.expectedSeq += 1;
  next.lastAcceptedAcquiredAt = request.acquiredAt;
  next.lastAcceptedReceivedAt = request.receivedAt;
  next.lastRawReceivedAt = request.receivedAt;
  if (request.quality === 'Bad') {
    next.rawQuality = 'Bad';
    add(next, 'sample_bad', { seq: request.seq });
    gap(next);
    return next;
  }
  next.lastGood = {
    value: request.value,
    acquiredAt: request.acquiredAt,
    receivedAt: request.receivedAt,
    sourceChangedAt: request.sourceChangedAt,
    epoch: next.epoch,
  };
  next.rawQuality = 'Good';
  if (next.now - request.acquiredAt < FRESH_MS) next.pending = false;
  next.known = true;
  add(next, 'sample_good', { seq: request.seq });
  next.trend.push({
    time: now,
    value: view(next).dataState === 'FRESH' ? request.value : null,
  });
  return next;
}
export function disconnect(state, now) {
  const next = canChange(state, now);
  if (next === null) return fault(state, 'fault_blocked');
  if (next === false) return fault(state, 'history_capacity');
  next.connection = 'Disconnected';
  next.pending = true;
  add(next, 'disconnected');
  gap(next);
  return next;
}
export function reconnect(state, now) {
  const next = canChange(state, now);
  if (next === null) return fault(state, 'fault_blocked');
  if (next === false) return fault(state, 'history_capacity');
  if (next.epoch === Number.MAX_SAFE_INTEGER)
    throw new RangeError('epoch exhausted');
  next.epoch += 1;
  next.expectedSeq = 1;
  next.connection = 'Connected';
  next.pending = true;
  next.reconnectAt = now;
  next.rawQuality = 'Unknown';
  next.lastAcceptedAcquiredAt = null;
  next.lastAcceptedReceivedAt = null;
  add(next, 'reconnected_pending');
  gap(next);
  return next;
}
export function advance(state, now) {
  const next = canChange(state, now);
  if (next === null) return fault(state, 'fault_blocked');
  if (next === false) return fault(state, 'history_capacity');
  add(next, 'advance');
  next.trend.push({
    time: now,
    value: view(next).dataState === 'FRESH' ? next.lastGood.value : null,
  });
  return next;
}
