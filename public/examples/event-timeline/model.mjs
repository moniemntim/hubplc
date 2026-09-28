const ID = /^[A-Z][A-Z0-9_-]{0,23}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const KINDS = new Set(['source', 'command', 'note']);
const PRECISIONS = new Set(['millisecond', 'second', 'unknown']);
const KIND_ORDER = { source: '0', command: '1', note: '2' };

const clone = (value) => structuredClone(value);

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  return Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value, keys) {
  if (!isPlainObject(value)) return false;
  const ownKeys = Reflect.ownKeys(value);
  return (
    ownKeys.every(
      (key) =>
        typeof key === 'string' &&
        Object.prototype.propertyIsEnumerable.call(value, key),
    ) &&
    ownKeys.sort(asciiCompare).join('|') ===
      [...keys].sort(asciiCompare).join('|')
  );
}

function isIso(value) {
  return (
    typeof value === 'string' &&
    ISO.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

function validId(value) {
  return typeof value === 'string' && value.trim() === value && ID.test(value);
}

function validText(value, maximum) {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.trim() === value &&
    value.length <= maximum &&
    !containsControl(value)
  );
}

function containsControl(value) {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint <= 0x1f || codePoint === 0x7f) return true;
  }
  return false;
}

function asciiCompare(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function reject(state, decision, detail) {
  return { state: clone(state), decision, detail };
}

function transitionKey(transition) {
  return `${transition.sourceId}/${transition.transitionId}`;
}

function stableTransition(transition) {
  return JSON.stringify({
    actor: transition.actor,
    clockComparable: transition.clockComparable,
    cycleId: transition.cycleId,
    kind: transition.kind,
    payload: transition.payload,
    precision: transition.precision,
    sourceId: transition.sourceId,
    sourceTime: transition.sourceTime,
    transitionId: transition.transitionId,
  });
}

function validTransition(transition) {
  if (
    !hasExactKeys(transition, [
      'actor',
      'clockComparable',
      'cycleId',
      'kind',
      'payload',
      'precision',
      'sourceId',
      'sourceTime',
      'transitionId',
    ])
  ) {
    return false;
  }
  if (
    !validId(transition.transitionId) ||
    !validId(transition.sourceId) ||
    !validId(transition.cycleId) ||
    !KINDS.has(transition.kind) ||
    !PRECISIONS.has(transition.precision) ||
    !validText(transition.actor, 40) ||
    !validText(transition.payload, 120) ||
    typeof transition.clockComparable !== 'boolean'
  ) {
    return false;
  }
  if (transition.sourceTime === null) {
    return (
      transition.clockComparable === false && transition.precision === 'unknown'
    );
  }
  return isIso(transition.sourceTime) && transition.precision !== 'unknown';
}

function validReceipt(receipt) {
  return (
    hasExactKeys(receipt, ['receivedAt', 'receiptId']) &&
    validId(receipt.receiptId) &&
    isIso(receipt.receivedAt)
  );
}

function validCoverage(coverage) {
  return (
    Array.isArray(coverage) &&
    coverage.length <= 8 &&
    coverage.every(
      (item) =>
        hasExactKeys(item, ['end', 'reason', 'start']) &&
        isIso(item.start) &&
        isIso(item.end) &&
        item.start < item.end &&
        validText(item.reason, 80),
    )
  );
}

export function createTimeline({ coverage = [] } = {}) {
  if (!validCoverage(coverage))
    throw new TypeError('coverage must be bounded metadata');
  return {
    events: [],
    receipts: [],
    notes: [],
    coverage: clone(coverage),
    fault: null,
  };
}

export function ingestTransition(state, transition, receipt) {
  if (!validTransition(transition) || !validReceipt(receipt)) {
    return reject(state, 'INPUT_REJECTED', 'transition_or_receipt_shape');
  }
  if (state.fault !== null)
    return reject(state, 'FAULTED_REJECTED', state.fault.code);
  if (state.receipts.some((item) => item.receiptId === receipt.receiptId)) {
    return reject(state, 'RECEIPT_ID_REJECTED', receipt.receiptId);
  }
  if (state.receipts.length >= 64) {
    return reject(state, 'RECEIPT_CAPACITY_REJECTED', 'receipt_limit_64');
  }

  const key = transitionKey(transition);
  const existing = state.events.find((item) => item.key === key);
  if (
    existing !== undefined &&
    existing.fingerprint !== stableTransition(transition)
  ) {
    return reject(state, 'PAYLOAD_CONFLICT_REJECTED', key);
  }

  if (existing === undefined && state.events.length >= 32) {
    const next = clone(state);
    next.fault = { code: 'EVENT_CAPACITY_FAULT', limit: 32 };
    return { state: next, decision: 'EVENT_CAPACITY_FAULT', detail: key };
  }

  const next = clone(state);
  if (existing === undefined) {
    next.events.push({
      ...clone(transition),
      key,
      receiveTime: receipt.receivedAt,
      fingerprint: stableTransition(transition),
    });
  }
  next.receipts.push({
    receiptId: receipt.receiptId,
    transitionKey: key,
    receivedAt: receipt.receivedAt,
  });
  return {
    state: next,
    decision:
      existing === undefined ? 'EVENT_ADMITTED' : 'RETRANSMISSION_RECORDED',
    detail: key,
  };
}

function validNote(note) {
  return (
    hasExactKeys(note, [
      'author',
      'createdAt',
      'cycleId',
      'noteId',
      'reason',
      'targetKey',
      'text',
      'version',
    ]) &&
    validId(note.noteId) &&
    validId(note.cycleId) &&
    typeof note.targetKey === 'string' &&
    note.targetKey.trim() === note.targetKey &&
    /^[A-Z][A-Z0-9_-]{0,23}\/[A-Z][A-Z0-9_-]{0,23}$/.test(note.targetKey) &&
    validText(note.author, 40) &&
    validText(note.reason, 80) &&
    validText(note.text, 240) &&
    Number.isSafeInteger(note.version) &&
    note.version >= 1 &&
    note.version <= 8 &&
    isIso(note.createdAt)
  );
}

export function appendNote(state, note, receipt) {
  if (!validNote(note) || !validReceipt(receipt)) {
    return reject(state, 'INPUT_REJECTED', 'note_or_receipt_shape');
  }
  const parent = state.events.find((item) => item.key === note.targetKey);
  if (
    parent === undefined ||
    parent.kind === 'note' ||
    parent.cycleId !== note.cycleId
  ) {
    return reject(state, 'NOTE_REFERENCE_REJECTED', note.targetKey);
  }
  const previous = state.notes.filter((item) => item.noteId === note.noteId);
  if (
    previous.some(
      (item) =>
        item.targetKey !== note.targetKey || item.cycleId !== note.cycleId,
    )
  ) {
    return reject(state, 'NOTE_LINEAGE_REJECTED', note.noteId);
  }
  if (previous.length >= 8 || state.notes.length >= 8) {
    return reject(state, 'NOTE_CAPACITY_REJECTED', 'note_version_limit_8');
  }
  if (note.version !== previous.length + 1) {
    return reject(state, 'NOTE_VERSION_REJECTED', note.noteId);
  }
  if (
    (previous.length > 0 && previous.at(-1).createdAt > note.createdAt) ||
    receipt.receivedAt < note.createdAt
  ) {
    return reject(state, 'NOTE_TIME_REJECTED', note.noteId);
  }

  const transition = {
    transitionId: `${note.noteId}-V${note.version}`,
    sourceId: 'HMI_NOTE',
    cycleId: note.cycleId,
    sourceTime: null,
    clockComparable: false,
    precision: 'unknown',
    kind: 'note',
    actor: note.author,
    payload: `${note.noteId}@${note.version}`,
  };
  const admitted = ingestTransition(state, transition, receipt);
  if (admitted.decision !== 'EVENT_ADMITTED') return admitted;
  const next = admitted.state;
  next.notes.push(clone(note));
  return {
    state: next,
    decision: 'NOTE_APPENDED',
    detail: `${note.noteId}@${note.version}`,
  };
}

export function observedSourceReceiveDifference(event) {
  if (
    event.sourceTime === null ||
    event.clockComparable !== true ||
    event.precision !== 'millisecond'
  ) {
    return null;
  }
  return Date.parse(event.receiveTime) - Date.parse(event.sourceTime);
}

function totalKey(event) {
  return [KIND_ORDER[event.kind], event.sourceId, event.transitionId].join('|');
}

export function timelinePartitions(state, window) {
  if (
    !hasExactKeys(window, ['end', 'start']) ||
    !isIso(window.start) ||
    !isIso(window.end) ||
    window.start >= window.end
  ) {
    throw new TypeError('window must be a valid [start,end) interval');
  }
  const windowed = [];
  const outside = [];
  const unlocated = [];
  for (const event of state.events) {
    if (event.sourceTime === null) unlocated.push(event);
    else if (
      event.sourceTime >= window.start &&
      event.sourceTime < window.end
    ) {
      windowed.push(event);
    } else outside.push(event);
  }
  windowed.sort((a, b) =>
    asciiCompare(
      `${a.sourceTime}|${totalKey(a)}`,
      `${b.sourceTime}|${totalKey(b)}`,
    ),
  );
  outside.sort((a, b) =>
    asciiCompare(
      `${a.sourceTime}|${totalKey(a)}`,
      `${b.sourceTime}|${totalKey(b)}`,
    ),
  );
  unlocated.sort((a, b) => asciiCompare(totalKey(a), totalKey(b)));
  return { windowed, outside, unlocated };
}

export function exportTimeline(state, window) {
  const partitions = timelinePartitions(state, window);
  const project = (event) => {
    const publicEvent = clone(event);
    delete publicEvent.fingerprint;
    return publicEvent;
  };
  return {
    schema: 'event-timeline-synthetic-v1',
    window: { start: window.start, end: window.end, interval: '[start,end)' },
    windowed: partitions.windowed.map(project),
    outside: partitions.outside.map(project),
    unlocated: partitions.unlocated.map(project),
    receipts: state.receipts
      .map(clone)
      .sort((a, b) => asciiCompare(a.receiptId, b.receiptId)),
    notes: state.notes
      .map(clone)
      .sort((a, b) =>
        asciiCompare(`${a.noteId}|${a.version}`, `${b.noteId}|${b.version}`),
      ),
    coverage: clone(state.coverage),
    fault: clone(state.fault),
  };
}
