import { createHash } from 'node:crypto';

export const MAX_TRANSITIONS = 256;
export const MAX_INPUT_ROWS = 512;
export const WINDOW_MS = 900_000;

const TYPES = new Set(['ACTIVE', 'CLEAR', 'ACK']);
const GROUPS = ['Utility', 'Pump', 'TemperatureFlow', 'Communication'];
const KEYS = [
  'id',
  'cycleId',
  'group',
  'source',
  'type',
  'occurredAtMs',
  'receivedAtMs',
  'sourceSequence',
].sort();
const validClock = (value) => Number.isSafeInteger(value) && value >= 0;
const validText = (value, limit) =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= limit &&
  value === value.trim() &&
  /^[\x21-\x7e]+$/.test(value);

function sameKeys(value) {
  if (Object.getPrototypeOf(value) !== Object.prototype) return false;
  const actual = Reflect.ownKeys(value);
  if (!actual.every((key) => typeof key === 'string')) return false;
  actual.sort();
  return (
    actual.length === KEYS.length &&
    actual.every((key, index) => key === KEYS[index])
  );
}

export function validateTransition(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !sameKeys(value)
  )
    throw new TypeError('transition must have the exact documented shape');
  if (!validText(value.id, 32) || !validText(value.cycleId, 32))
    throw new RangeError(
      'id and cycleId must be nonempty strings of at most 32 characters',
    );
  if (!GROUPS.includes(value.group) || !validText(value.source, 64))
    throw new RangeError('group or source is invalid');
  if (!TYPES.has(value.type))
    throw new RangeError('type must be ACTIVE, CLEAR, or ACK');
  if (
    !validClock(value.occurredAtMs) ||
    !validClock(value.receivedAtMs) ||
    value.receivedAtMs < value.occurredAtMs
  )
    throw new RangeError(
      'occurredAtMs and receivedAtMs must be nonnegative safe integers',
    );
  if (!Number.isSafeInteger(value.sourceSequence) || value.sourceSequence < 1)
    throw new RangeError('sourceSequence must be a positive safe integer');
  return {
    id: value.id,
    cycleId: value.cycleId,
    group: value.group,
    source: value.source,
    type: value.type,
    occurredAtMs: value.occurredAtMs,
    receivedAtMs: value.receivedAtMs,
    sourceSequence: value.sourceSequence,
  };
}

export function replay(transitions) {
  if (!Array.isArray(transitions) || transitions.length > MAX_INPUT_ROWS)
    throw new RangeError('transitions must be an array of at most 512 rows');
  const byId = new Map();
  const sequences = new Set();
  const ignoredDuplicateIds = [];
  for (const raw of transitions) {
    const row = validateTransition(raw);
    const fingerprint = JSON.stringify(row);
    const previous = byId.get(row.id);
    if (previous) {
      if (previous.fingerprint !== fingerprint)
        throw new Error('transition id collision has different payload');
      ignoredDuplicateIds.push(row.id);
      continue;
    }
    if (sequences.has(row.sourceSequence))
      throw new Error('sourceSequence must be unique across transitions');
    sequences.add(row.sourceSequence);
    byId.set(row.id, { row, fingerprint });
    if (byId.size > MAX_TRANSITIONS)
      throw new RangeError('at most 256 unique transition ids are accepted');
  }
  const canonical = [...byId.values()]
    .map((entry) => entry.row)
    .sort((a, b) => a.sourceSequence - b.sourceSequence);
  for (let index = 1; index < canonical.length; index += 1) {
    if (canonical[index].occurredAtMs < canonical[index - 1].occurredAtMs)
      throw new Error('occurredAtMs must not decrease in sourceSequence order');
  }
  return {
    transitions: canonical,
    ignoredDuplicateIds,
  };
}

function apply(rows) {
  const cycles = new Map();
  for (const row of [...rows].sort(
    (a, b) => a.sourceSequence - b.sourceSequence,
  )) {
    let cycle = cycles.get(row.cycleId);
    if (row.type === 'ACTIVE') {
      if (cycle) throw new Error('cycle has more than one ACTIVE transition');
      cycle = {
        id: row.cycleId,
        group: row.group,
        source: row.source,
        activeAtMs: row.occurredAtMs,
        activeSequence: row.sourceSequence,
        active: true,
        cleared: false,
        acknowledged: false,
        transitions: [row],
      };
      cycles.set(row.cycleId, cycle);
      continue;
    }
    if (!cycle)
      throw new Error(
        'CLEAR or ACK requires an earlier ACTIVE by sourceSequence',
      );
    if (cycle.group !== row.group || cycle.source !== row.source)
      throw new Error(
        'cycle source and group must match its ACTIVE transition',
      );
    if (row.type === 'CLEAR') {
      if (cycle.cleared)
        throw new Error('cycle has more than one CLEAR transition');
      cycle.cleared = true;
      cycle.active = false;
    } else {
      if (cycle.acknowledged)
        throw new Error('cycle has more than one ACK transition');
      cycle.acknowledged = true;
    }
    cycle.transitions.push(row);
  }
  return cycles;
}

function version(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function checkWindow(startMs, endMs, asOfMs) {
  if (
    !validClock(startMs) ||
    !validClock(endMs) ||
    !validClock(asOfMs) ||
    endMs <= startMs
  )
    throw new RangeError(
      'startMs, endMs, and asOfMs must be safe clocks with start < end',
    );
}

export function summarize(
  transitions,
  { startMs = 0, endMs = WINDOW_MS, asOfMs = endMs } = {},
) {
  checkWindow(startMs, endMs, asOfMs);
  const replayed = replay(transitions);
  const visible = replayed.transitions.filter(
    (row) => row.receivedAtMs <= asOfMs && row.occurredAtMs < endMs,
  );
  const visibleSequences = new Set(visible.map((row) => row.sourceSequence));
  for (const row of visible) {
    for (const earlier of replayed.transitions) {
      if (
        earlier.sourceSequence >= row.sourceSequence ||
        earlier.occurredAtMs >= endMs
      )
        continue;
      if (!visibleSequences.has(earlier.sourceSequence))
        throw new Error(
          'summary requires complete prior source history through asOfMs',
        );
    }
  }
  const beforeStart = visible.filter((row) => row.occurredAtMs < startMs);
  const atEnd = apply(visible);
  const atStart = apply(beforeStart);
  const cycles = [...atEnd.values()].filter(
    (cycle) => cycle.activeAtMs >= startMs && cycle.activeAtMs < endMs,
  );
  const carryIn = [...atStart.values()]
    .filter((cycle) => cycle.active)
    .map((cycle) => cycle.id);
  const groupCounts = Object.fromEntries(
    GROUPS.map((group) => [
      group,
      cycles.filter((cycle) => cycle.group === group).length,
    ]),
  );
  const trace = cycles
    .map((cycle) => ({
      id: cycle.id,
      group: cycle.group,
      active: cycle.active,
      cleared: cycle.cleared,
      acknowledged: cycle.acknowledged,
      transitions: cycle.transitions.map((row) => ({ ...row })),
    }))
    .sort(
      (a, b) =>
        a.transitions[0].sourceSequence - b.transitions[0].sourceSequence,
    );
  const candidate = [...cycles].sort(
    (a, b) => a.activeSequence - b.activeSequence,
  )[0];
  const result = {
    window: { startMs, endMs, asOfMs },
    transitionCount: visible.length,
    cycleCount: cycles.length,
    groupCounts,
    clearCount: cycles.filter((cycle) => cycle.cleared).length,
    activeCount: cycles.filter((cycle) => cycle.active).length,
    unacknowledgedCount: cycles.filter((cycle) => !cycle.acknowledged).length,
    unacknowledgedActiveCount: cycles.filter(
      (cycle) => cycle.active && !cycle.acknowledged,
    ).length,
    unacknowledgedClearCount: cycles.filter(
      (cycle) => !cycle.active && !cycle.acknowledged,
    ).length,
    carryIn,
    candidateEarliestCycleId: candidate?.id ?? null,
    ignoredDuplicateIds: replayed.ignoredDuplicateIds,
    trace,
  };
  return {
    ...result,
    contentVersion: version({
      window: result.window,
      transitions: visible.map((row) => ({ ...row })),
      summary: {
        groupCounts: result.groupCounts,
        clearCount: result.clearCount,
        activeCount: result.activeCount,
        unacknowledgedCount: result.unacknowledgedCount,
        carryIn: result.carryIn,
      },
    }),
  };
}
