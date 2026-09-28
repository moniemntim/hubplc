export const SCHEMA = 'alarm-report-fixture-v1';
export const RESULT_SCHEMA = 'alarm-report-result-v1';
export const MAX_OCCURRENCES = 32;
export const MAX_TRANSITIONS = 64;

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const TRANSITION_TYPES = new Set(['ACTIVE', 'ACK', 'CLEAR']);
const occurrenceKeys = [
  'history',
  'occurrenceId',
  'priority',
  'sourceId',
  'transitions',
];
const transitionKeys = ['atUtc', 'order', 'transitionId', 'type'];
const fixtureKeys = ['coverage', 'occurrences', 'schema'];
const coverageKeys = [
  'complete',
  'knownPrehistoryComplete',
  'unknownOccurrenceIds',
];
const filterKeys = ['endUtc', 'priorities', 'sourceIds', 'startUtc'];

const asciiCompare = (left, right) =>
  left < right ? -1 : left > right ? 1 : 0;
const isPlainObject = (value) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype;
const validText = (value, limit) =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= limit &&
  value === value.trim() &&
  Array.prototype.every.call(value, (character) => {
    const code = character.charCodeAt(0);
    return code >= 0x21 && code <= 0x7e;
  });

function hasExactKeys(value, expected) {
  if (!isPlainObject(value)) return false;
  const actual = Reflect.ownKeys(value);
  if (!actual.every((key) => typeof key === 'string')) return false;
  actual.sort(asciiCompare);
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function validUtc(value) {
  if (typeof value !== 'string' || value.length !== 24) return false;
  const parsed = Date.parse(value);
  return (
    Number.isSafeInteger(parsed) && new Date(parsed).toISOString() === value
  );
}

function cloneTransition(transition) {
  return {
    transitionId: transition.transitionId,
    type: transition.type,
    atUtc: transition.atUtc,
    order: transition.order,
  };
}

function validateTransition(value) {
  if (!hasExactKeys(value, transitionKeys))
    throw new TypeError('transition must have the exact documented shape');
  if (!validText(value.transitionId, 32))
    throw new RangeError(
      'transitionId must be printable, trimmed, and at most 32 characters',
    );
  if (!TRANSITION_TYPES.has(value.type))
    throw new RangeError('transition type must be ACTIVE, ACK, or CLEAR');
  if (!validUtc(value.atUtc))
    throw new RangeError('atUtc must be a canonical UTC ISO timestamp');
  if (!Number.isSafeInteger(value.order) || value.order < 1)
    throw new RangeError('transition order must be a positive safe integer');
  return cloneTransition(value);
}

function validateOccurrence(value) {
  if (!hasExactKeys(value, occurrenceKeys))
    throw new TypeError('occurrence must have the exact documented shape');
  if (!validText(value.occurrenceId, 32) || !validText(value.sourceId, 32))
    throw new RangeError(
      'occurrenceId and sourceId must be printable, trimmed strings',
    );
  if (!PRIORITIES.includes(value.priority))
    throw new RangeError('priority is invalid');
  if (!['COMPLETE', 'UNKNOWN_HISTORY'].includes(value.history))
    throw new RangeError('history must be COMPLETE or UNKNOWN_HISTORY');
  if (!Array.isArray(value.transitions) || value.transitions.length > 3)
    throw new RangeError(
      'transitions must contain at most ACTIVE, ACK, and CLEAR',
    );
  const transitions = value.transitions.map(validateTransition);
  if (value.history === 'UNKNOWN_HISTORY') {
    if (transitions.length !== 0)
      throw new Error(
        'UNKNOWN_HISTORY occurrence must not claim a reconstructable state',
      );
    return {
      occurrenceId: value.occurrenceId,
      sourceId: value.sourceId,
      priority: value.priority,
      history: value.history,
      transitions,
    };
  }
  if (transitions.length === 0)
    throw new Error('COMPLETE occurrence needs an ACTIVE transition');
  const ids = new Set();
  const orders = new Set();
  const types = new Set();
  for (const transition of transitions) {
    if (
      ids.has(transition.transitionId) ||
      orders.has(transition.order) ||
      types.has(transition.type)
    )
      throw new Error(
        'occurrence transition ids, orders, and types must be unique',
      );
    ids.add(transition.transitionId);
    orders.add(transition.order);
    types.add(transition.type);
  }
  const chronological = [...transitions].sort(compareTransition);
  if (chronological[0].type !== 'ACTIVE')
    throw new Error('COMPLETE occurrence must start with ACTIVE');
  return {
    occurrenceId: value.occurrenceId,
    sourceId: value.sourceId,
    priority: value.priority,
    history: value.history,
    transitions: chronological,
  };
}

function compareTransition(left, right) {
  return (
    asciiCompare(left.atUtc, right.atUtc) ||
    left.order - right.order ||
    asciiCompare(left.transitionId, right.transitionId)
  );
}

export function validateFixture(value) {
  if (!hasExactKeys(value, fixtureKeys))
    throw new TypeError('fixture must have the exact documented shape');
  if (value.schema !== SCHEMA)
    throw new RangeError('fixture schema is invalid');
  if (!hasExactKeys(value.coverage, coverageKeys))
    throw new TypeError('coverage must have the exact documented shape');
  if (typeof value.coverage.complete !== 'boolean')
    throw new RangeError('coverage.complete must be boolean');
  if (value.coverage.knownPrehistoryComplete !== true)
    throw new RangeError('knownPrehistoryComplete must explicitly be true');
  if (
    !Array.isArray(value.coverage.unknownOccurrenceIds) ||
    value.coverage.unknownOccurrenceIds.length > MAX_OCCURRENCES
  )
    throw new RangeError('unknownOccurrenceIds must be a bounded array');
  if (
    !Array.isArray(value.occurrences) ||
    value.occurrences.length > MAX_OCCURRENCES
  )
    throw new RangeError('occurrences must be a bounded array');
  const occurrences = value.occurrences.map(validateOccurrence);
  const occurrenceIds = new Set();
  const allTransitionIds = new Set();
  let transitionCount = 0;
  for (const occurrence of occurrences) {
    if (occurrenceIds.has(occurrence.occurrenceId))
      throw new Error('occurrenceId must be unique');
    occurrenceIds.add(occurrence.occurrenceId);
    for (const transition of occurrence.transitions) {
      if (allTransitionIds.has(transition.transitionId))
        throw new Error('transitionId must be unique across occurrences');
      allTransitionIds.add(transition.transitionId);
      transitionCount += 1;
    }
  }
  if (transitionCount > MAX_TRANSITIONS)
    throw new RangeError('fixture contains too many transitions');
  const unknown = occurrences
    .filter((occurrence) => occurrence.history === 'UNKNOWN_HISTORY')
    .map((occurrence) => occurrence.occurrenceId)
    .sort(asciiCompare);
  const declaredUnknown = [...value.coverage.unknownOccurrenceIds].sort(
    asciiCompare,
  );
  if (
    !declaredUnknown.every((id) => validText(id, 32)) ||
    new Set(declaredUnknown).size !== declaredUnknown.length ||
    declaredUnknown.length !== unknown.length ||
    declaredUnknown.some((id, index) => id !== unknown[index])
  )
    throw new Error(
      'coverage unknownOccurrenceIds must exactly name UNKNOWN_HISTORY occurrences',
    );
  if (value.coverage.complete !== (unknown.length === 0))
    throw new Error('coverage.complete disagrees with unknown history');
  return {
    schema: SCHEMA,
    coverage: {
      complete: unknown.length === 0,
      knownPrehistoryComplete: true,
      unknownOccurrenceIds: declaredUnknown,
    },
    occurrences,
  };
}

function validateFilter(value) {
  if (!hasExactKeys(value, filterKeys))
    throw new TypeError('filter must have the exact documented shape');
  if (
    !validUtc(value.startUtc) ||
    !validUtc(value.endUtc) ||
    value.startUtc >= value.endUtc
  )
    throw new RangeError(
      'filter needs canonical UTC timestamps with startUtc before endUtc',
    );
  for (const [key, accepted] of [
    ['sourceIds', (item) => validText(item, 32)],
    ['priorities', (item) => PRIORITIES.includes(item)],
  ]) {
    const items = value[key];
    if (
      items !== null &&
      (!Array.isArray(items) || items.length === 0 || items.length > 4)
    )
      throw new RangeError(
        key + ' must be null or a nonempty array of at most four values',
      );
    if (
      items !== null &&
      (!items.every(accepted) || new Set(items).size !== items.length)
    )
      throw new RangeError(key + ' contains an invalid or duplicate value');
  }
  return {
    startUtc: value.startUtc,
    endUtc: value.endUtc,
    sourceIds:
      value.sourceIds === null ? null : [...value.sourceIds].sort(asciiCompare),
    priorities:
      value.priorities === null
        ? null
        : [...value.priorities].sort(asciiCompare),
  };
}

function matches(occurrence, filter) {
  return (
    (filter.sourceIds === null ||
      filter.sourceIds.includes(occurrence.sourceId)) &&
    (filter.priorities === null ||
      filter.priorities.includes(occurrence.priority))
  );
}

function occurrenceRow(occurrence, transition) {
  return {
    occurrenceId: occurrence.occurrenceId,
    transitionId: transition.transitionId,
    sourceId: occurrence.sourceId,
    priority: occurrence.priority,
    atUtc: transition.atUtc,
    order: transition.order,
  };
}

function unacknowledgedStateAtEnd(occurrence, endUtc) {
  const prior = occurrence.transitions.filter(
    (transition) => transition.atUtc < endUtc,
  );
  const active = prior.some((transition) => transition.type === 'ACTIVE');
  const cleared = prior.some((transition) => transition.type === 'CLEAR');
  const acknowledged = prior.some((transition) => transition.type === 'ACK');
  if (!active || acknowledged) return null;
  return cleared ? 'CLEARED_UNACKED' : 'ACTIVE_UNACKED';
}

export function createAlarmReport(fixture, filter) {
  const validatedFixture = validateFixture(fixture);
  const validatedFilter = validateFilter(filter);
  const visible = validatedFixture.occurrences.filter((occurrence) =>
    matches(occurrence, validatedFilter),
  );
  const activeTransitions = visible
    .flatMap((occurrence) =>
      occurrence.transitions
        .filter(
          (transition) =>
            transition.type === 'ACTIVE' &&
            transition.atUtc >= validatedFilter.startUtc &&
            transition.atUtc < validatedFilter.endUtc,
        )
        .map((transition) => occurrenceRow(occurrence, transition)),
    )
    .sort(
      (left, right) =>
        asciiCompare(left.atUtc, right.atUtc) ||
        left.order - right.order ||
        asciiCompare(left.transitionId, right.transitionId),
    );
  const unackedAtCutoff = visible
    .flatMap((occurrence) => {
      if (occurrence.history !== 'COMPLETE') return [];
      const statusAtCutoff = unacknowledgedStateAtEnd(
        occurrence,
        validatedFilter.endUtc,
      );
      if (statusAtCutoff === null) return [];
      const active = occurrence.transitions.find(
        (transition) => transition.type === 'ACTIVE',
      );
      return [{ ...occurrenceRow(occurrence, active), statusAtCutoff }];
    })
    .sort(
      (left, right) =>
        asciiCompare(left.atUtc, right.atUtc) ||
        left.order - right.order ||
        asciiCompare(left.occurrenceId, right.occurrenceId),
    );
  const unknownHistory = visible
    .filter((occurrence) => occurrence.history === 'UNKNOWN_HISTORY')
    .map((occurrence) => ({
      occurrenceId: occurrence.occurrenceId,
      sourceId: occurrence.sourceId,
      priority: occurrence.priority,
      state: 'UNKNOWN_HISTORY',
    }))
    .sort((left, right) => asciiCompare(left.occurrenceId, right.occurrenceId));
  return {
    schema: RESULT_SCHEMA,
    filters: {
      ...validatedFilter,
      cutoffUtc: validatedFilter.endUtc,
    },
    coverage: {
      ...validatedFixture.coverage,
      completeForFilter: unknownHistory.length === 0,
    },
    rowCount: {
      activeTransitions: activeTransitions.length,
      unackedAtCutoff: unackedAtCutoff.length,
      unknownHistory: unknownHistory.length,
    },
    activeTransitions,
    unackedAtCutoff,
    unknownHistory,
  };
}
