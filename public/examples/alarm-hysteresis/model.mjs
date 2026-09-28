export const LOW_START_MILLIBAR = 5000;
export const HIGH_CLEAR_MILLIBAR = 5300;
export const START_HOLD_MS = 2000;
export const CLEAR_HOLD_MS = 3000;
export const MAX_SAMPLE_GAP_MS = 1000;

const clone = (value) => structuredClone(value);
const validTime = (value) => Number.isSafeInteger(value) && value >= 0;

export function initialAlarm() {
  return {
    nowMs: null,
    rawMilliBar: null,
    quality: 'UNKNOWN',
    evaluationKnown: false,
    lowSinceMs: null,
    highSinceMs: null,
    active: false,
    latched: false,
    resetArmed: false,
    decision: 'UNKNOWN_INITIAL',
  };
}

function checkState(state) {
  if (!state || typeof state !== 'object')
    throw new TypeError('state required');
  if (state.nowMs !== null && !validTime(state.nowMs))
    throw new RangeError('state nowMs must be a nonnegative safe integer');
}

function unknown(next, decision) {
  next.lowSinceMs = null;
  next.highSinceMs = null;
  next.resetArmed = false;
  next.evaluationKnown = false;
  next.decision = decision;
  return next;
}

/**
 * Offline, zero-order-hold teaching model. A valid sample represents its value
 * until the next valid sample only when the gap is <= MAX_SAMPLE_GAP_MS.
 */
export function sampleAlarm(
  state,
  { nowMs, rawMilliBar, quality, reset = false },
) {
  checkState(state);
  if (!validTime(nowMs))
    throw new RangeError('nowMs must be a nonnegative safe integer');
  if (state.nowMs !== null && nowMs <= state.nowMs)
    throw new RangeError('nowMs must be strictly increasing');
  if (
    !Number.isSafeInteger(rawMilliBar) ||
    rawMilliBar < 0 ||
    rawMilliBar > 20000
  )
    throw new RangeError('rawMilliBar must be an integer 0..20000');
  if (!['GOOD', 'BAD'].includes(quality))
    throw new TypeError('quality must be GOOD or BAD');
  if (typeof reset !== 'boolean') throw new TypeError('reset must be boolean');

  const next = {
    ...clone(state),
    nowMs,
    rawMilliBar,
    quality,
    evaluationKnown: true,
  };
  const gap = state.nowMs === null ? 0 : nowMs - state.nowMs;
  if (quality === 'BAD') return unknown(next, 'UNKNOWN_BAD_QUALITY');
  if (state.nowMs !== null && gap > MAX_SAMPLE_GAP_MS)
    return unknown(next, 'UNKNOWN_SAMPLE_GAP');

  const resetEdge = reset && state.resetArmed;
  next.resetArmed = !reset;
  if (!next.active) {
    next.highSinceMs = null;
    if (rawMilliBar < LOW_START_MILLIBAR) {
      next.lowSinceMs ??= nowMs;
      if (nowMs - next.lowSinceMs >= START_HOLD_MS) {
        next.active = true;
        next.latched = true;
        next.highSinceMs = null;
        next.decision = 'ACTIVE_LOW_HOLD_MET';
      } else next.decision = 'PENDING_LOW_HOLD';
    } else {
      next.lowSinceMs = null;
      next.decision =
        rawMilliBar === LOW_START_MILLIBAR ? 'INACTIVE_LOW_EQUAL' : 'INACTIVE';
    }
  } else {
    next.lowSinceMs = null;
    if (rawMilliBar > HIGH_CLEAR_MILLIBAR) {
      next.highSinceMs ??= nowMs;
      if (nowMs - next.highSinceMs >= CLEAR_HOLD_MS) {
        next.active = false;
        next.highSinceMs = null;
        next.decision = 'INACTIVE_HIGH_HOLD_MET';
      } else next.decision = 'PENDING_HIGH_HOLD';
    } else {
      next.highSinceMs = null;
      next.decision =
        rawMilliBar === HIGH_CLEAR_MILLIBAR
          ? 'ACTIVE_HIGH_EQUAL'
          : 'ACTIVE_HOLD';
    }
  }

  if (resetEdge) {
    if (next.active) next.decision = 'RESET_REJECTED_ACTIVE';
    else if (next.latched && rawMilliBar > HIGH_CLEAR_MILLIBAR) {
      next.latched = false;
      next.decision = 'LATCH_RESET_ACCEPTED';
    } else if (next.latched) next.decision = 'RESET_REJECTED_NOT_NORMAL';
    else next.decision = 'RESET_NO_LATCH';
  }
  return next;
}
