export const MAX_OCCURRENCES = 8;
export const MAX_LEDGER = 16;
export const MAX_LOG = 128;

const clone = (state) => ({
  ...state,
  occurrences: state.occurrences.map((item) => ({ ...item })),
  ledger: state.ledger.map((item) => ({ ...item })),
  log: state.log.map((item) => ({ ...item })),
});
const plainObject = (value) =>
  value !== null &&
  typeof value === 'object' &&
  Object.getPrototypeOf(value) === Object.prototype;
const exactKeys = (value, keys) => {
  if (!plainObject(value)) return false;
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
const validTime = (now, prior) => Number.isSafeInteger(now) && now >= prior;
const validOccurrenceId = (value) =>
  typeof value === 'string' &&
  value.trim() === value &&
  /^O[1-9]\d{0,5}$/u.test(value);
const validRequestId = (value) =>
  typeof value === 'string' &&
  value.trim() === value &&
  /^[A-Za-z0-9_-]{1,20}$/u.test(value);
const hasControl = (value) =>
  [...value].some((character) => {
    const code = character.codePointAt(0);
    return code <= 31 || code === 127;
  });
const validText = (value) =>
  typeof value === 'string' &&
  value.length <= 120 &&
  value.trim().length > 0 &&
  !hasControl(value);
const trustedActor = (value) => value === 'Operator' || value === 'Supervisor';
const validRevision = (value) => Number.isSafeInteger(value) && value > 0;
const find = (state, occurrenceId) =>
  state.occurrences.find((item) => item.occurrenceId === occurrenceId);

function begin(state, now) {
  if (!validTime(now, state.now)) throw new TypeError('time invalid');
  if (state.log.length >= state.maxLog) return null;
  const next = clone(state);
  next.now = now;
  return next;
}
function addLog(state, { occurrenceId = null, action, actor = null }) {
  state.log.push({
    seq: state.nextLogSeq++,
    time: state.now,
    occurrenceId,
    action,
    actor,
  });
  state.lastDecision = action;
}
function logCapacityBlocked(state) {
  return {
    ...state,
    fault: state.fault ?? 'log_capacity',
    known: false,
    lastDecision: 'log_capacity_fault',
  };
}
function faultBlocked(state) {
  return { ...state, known: false, lastDecision: 'fault_blocked' };
}
function ackPayload(request) {
  return JSON.stringify({
    occurrenceId: request.occurrenceId,
    expectedRevision: request.expectedRevision,
    actor: request.actor,
    comment: request.comment,
  });
}
function validAck(request) {
  return (
    exactKeys(request, [
      'occurrenceId',
      'expectedRevision',
      'requestId',
      'actor',
      'comment',
    ]) &&
    validOccurrenceId(request.occurrenceId) &&
    validRevision(request.expectedRevision) &&
    validRequestId(request.requestId) &&
    trustedActor(request.actor) &&
    validText(request.comment)
  );
}
function validWorkflow(request) {
  if (
    !plainObject(request) ||
    !validOccurrenceId(request.occurrenceId) ||
    !validRevision(request.expectedRevision) ||
    !trustedActor(request.actor)
  ) {
    return false;
  }
  if (request.action === 'start')
    return (
      exactKeys(request, [
        'occurrenceId',
        'expectedRevision',
        'actor',
        'action',
      ]) && request.actor === 'Operator'
    );
  return (
    request.action === 'resolve' &&
    exactKeys(request, [
      'occurrenceId',
      'expectedRevision',
      'actor',
      'action',
      'evidence',
    ]) &&
    request.actor === 'Supervisor' &&
    validText(request.evidence)
  );
}

export function initialLifecycle({
  maxOccurrences = MAX_OCCURRENCES,
  maxLedger = MAX_LEDGER,
  maxLog = MAX_LOG,
} = {}) {
  if (
    !Number.isSafeInteger(maxOccurrences) ||
    maxOccurrences < 1 ||
    maxOccurrences > MAX_OCCURRENCES ||
    !Number.isSafeInteger(maxLedger) ||
    maxLedger < 1 ||
    maxLedger > MAX_LEDGER ||
    !Number.isSafeInteger(maxLog) ||
    maxLog < 1 ||
    maxLog > MAX_LOG
  ) {
    throw new TypeError('capacity invalid');
  }
  return {
    now: 0,
    nextId: 1,
    nextLogSeq: 1,
    condition: false,
    currentId: null,
    fault: null,
    known: true,
    lastDecision: null,
    occurrences: [],
    ledger: [],
    log: [],
    maxOccurrences,
    maxLedger,
    maxLog,
  };
}

export function sourceCondition(state, now, active) {
  if (typeof active !== 'boolean') throw new TypeError('condition invalid');
  if (state.fault) return faultBlocked(state);
  const next = begin(state, now);
  if (!next) return logCapacityBlocked(state);
  if (active && !state.condition) {
    if (next.occurrences.length >= next.maxOccurrences) {
      next.fault = 'occurrence_capacity';
      next.known = false;
      addLog(next, { action: 'occurrence_capacity_fault' });
      return next;
    }
    const occurrenceId = `O${next.nextId++}`;
    next.currentId = occurrenceId;
    next.occurrences.push({
      occurrenceId,
      active: true,
      acked: false,
      revision: 1,
      work: 'Open',
      evidence: '',
      startedAt: now,
      clearedAt: null,
      ackActor: null,
      ackAt: null,
      comment: '',
    });
    addLog(next, { occurrenceId, action: 'active' });
  } else if (!active && state.condition && state.currentId) {
    const item = find(next, state.currentId);
    item.active = false;
    item.revision += 1;
    item.clearedAt = now;
    addLog(next, { occurrenceId: item.occurrenceId, action: 'clear' });
  }
  next.condition = active;
  return next;
}

export function acknowledge(state, now, request) {
  if (state.fault) return faultBlocked(state);
  const next = begin(state, now);
  if (!next) return logCapacityBlocked(state);
  if (!validAck(request)) {
    addLog(next, { action: 'ack_rejected_request' });
    return next;
  }
  const payload = ackPayload(request);
  const prior = next.ledger.find(
    (item) => item.requestId === request.requestId,
  );
  if (prior) {
    addLog(next, {
      occurrenceId: request.occurrenceId,
      action: prior.payload === payload ? 'ack_replay' : 'ack_request_conflict',
      actor: request.actor,
    });
    return next;
  }
  const item = find(next, request.occurrenceId);
  if (!item) {
    addLog(next, {
      occurrenceId: request.occurrenceId,
      action: 'ack_rejected_request',
      actor: request.actor,
    });
    return next;
  }
  if (item.revision !== request.expectedRevision) {
    addLog(next, {
      occurrenceId: item.occurrenceId,
      action: 'ack_revision_conflict',
      actor: request.actor,
    });
    return next;
  }
  if (item.acked) {
    addLog(next, {
      occurrenceId: item.occurrenceId,
      action: 'ack_already_acked',
      actor: request.actor,
    });
    return next;
  }
  if (next.ledger.length >= next.maxLedger) {
    addLog(next, {
      occurrenceId: item.occurrenceId,
      action: 'ack_ledger_capacity_rejected',
      actor: request.actor,
    });
    return next;
  }
  next.ledger.push({ requestId: request.requestId, payload });
  item.acked = true;
  item.ackActor = request.actor;
  item.ackAt = now;
  item.comment = request.comment;
  item.revision += 1;
  addLog(next, {
    occurrenceId: item.occurrenceId,
    action: 'ack',
    actor: request.actor,
  });
  return next;
}

export function workflow(state, now, request) {
  if (state.fault) return faultBlocked(state);
  const next = begin(state, now);
  if (!next) return logCapacityBlocked(state);
  if (!validWorkflow(request)) {
    addLog(next, { action: 'workflow_rejected_request' });
    return next;
  }
  const item = find(next, request.occurrenceId);
  if (!item) {
    addLog(next, {
      occurrenceId: request.occurrenceId,
      action: 'workflow_rejected_request',
      actor: request.actor,
    });
    return next;
  }
  if (item.revision !== request.expectedRevision) {
    addLog(next, {
      occurrenceId: item.occurrenceId,
      action: 'workflow_revision_conflict',
      actor: request.actor,
    });
    return next;
  }
  if (request.action === 'start' && item.work === 'Open') {
    item.work = 'InProgress';
    item.revision += 1;
    addLog(next, {
      occurrenceId: item.occurrenceId,
      action: 'workflow_started',
      actor: request.actor,
    });
    return next;
  }
  if (
    request.action === 'resolve' &&
    item.work === 'InProgress' &&
    !item.active &&
    item.acked
  ) {
    item.work = 'Resolved';
    item.evidence = request.evidence;
    item.revision += 1;
    addLog(next, {
      occurrenceId: item.occurrenceId,
      action: 'workflow_resolved',
      actor: request.actor,
    });
    return next;
  }
  addLog(next, {
    occurrenceId: item.occurrenceId,
    action: 'workflow_rejected_transition',
    actor: request.actor,
  });
  return next;
}
