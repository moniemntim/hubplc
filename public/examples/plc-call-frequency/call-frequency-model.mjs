// Offline teaching model. It has no PLC I/O refresh, vendor runtime, or
// physical output behavior. A skipped invocation deliberately keeps state.

function requireBoolean(value, name) {
  if (typeof value !== 'boolean')
    throw new TypeError(`${name} must be boolean`);
}

function requireMilliseconds(value, name) {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new TypeError(`${name} must be a non-negative integer`);
}

export function initialEdge() {
  return { previous: false, q: false };
}

export function callEdge(before, { clk }) {
  requireBoolean(before?.previous, 'before.previous');
  requireBoolean(before?.q, 'before.q');
  requireBoolean(clk, 'clk');
  return { previous: clk, q: clk && !before.previous };
}

export function initialDeadlineTimer({ startedAtMs, durationMs }) {
  requireMilliseconds(startedAtMs, 'startedAtMs');
  requireMilliseconds(durationMs, 'durationMs');
  return {
    startedAtMs,
    durationMs,
    lastCallAtMs: startedAtMs,
    elapsedMs: 0,
    expired: false,
  };
}

export function callDeadlineTimer(before, { nowMs }) {
  requireMilliseconds(nowMs, 'nowMs');
  if (nowMs < before?.lastCallAtMs)
    throw new RangeError('nowMs precedes last call');
  const elapsedMs = nowMs - before.startedAtMs;
  return {
    ...before,
    lastCallAtMs: nowMs,
    elapsedMs,
    expired: elapsedMs >= before.durationMs,
  };
}

export function initialGapTimer({ startedAtMs, durationMs, maxGapMs }) {
  requireMilliseconds(startedAtMs, 'startedAtMs');
  requireMilliseconds(durationMs, 'durationMs');
  requireMilliseconds(maxGapMs, 'maxGapMs');
  return {
    startedAtMs,
    durationMs,
    maxGapMs,
    lastCallAtMs: null,
    gapMs: 0,
    error: null,
    expired: false,
  };
}

export function callGapTimer(before, { nowMs }) {
  requireMilliseconds(nowMs, 'nowMs');
  if (nowMs < before?.startedAtMs) throw new RangeError('nowMs precedes start');
  if (before.lastCallAtMs !== null && nowMs < before.lastCallAtMs)
    throw new RangeError('nowMs precedes last call');
  const gapMs = before.lastCallAtMs === null ? 0 : nowMs - before.lastCallAtMs;
  if (before.error !== null)
    return { ...before, lastCallAtMs: nowMs, gapMs, expired: false };
  if (gapMs > before.maxGapMs)
    return {
      ...before,
      lastCallAtMs: nowMs,
      gapMs,
      error: 'TIME_GAP',
      expired: false,
    };
  const elapsedMs = nowMs - before.startedAtMs;
  return {
    ...before,
    lastCallAtMs: nowMs,
    gapMs,
    error: null,
    expired: elapsedMs >= before.durationMs,
  };
}
