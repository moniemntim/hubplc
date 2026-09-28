export const METADATA = Object.freeze({
  operationId: 'OP-884',
  user: 'U17',
  equipment: 'EQ-A',
  tag: 'TEMP_SP',
  screen: 'Recipe',
  unit: '°C',
  displayedOld: 50,
  authorityOld: 52,
  expectedRevision: 42,
  requestedNew: 55,
});
export const MAX_EVENT_BYTES = 4096;
export const MAX_EVENTS = 12;

const FIELDS = {
  pending: ['seq', 'serverTime', 'type'],
  accepted: ['seq', 'serverTime', 'type'],
  sent: ['seq', 'serverTime', 'type'],
  disconnect: ['seq', 'serverTime', 'type'],
  rejected: [
    'seq',
    'serverTime',
    'type',
    'reason',
    'observedRevision',
    'expectedRevision',
  ],
  readback: [
    'seq',
    'serverTime',
    'type',
    'operationId',
    'equipment',
    'tag',
    'value',
    'revisionBefore',
    'revisionAfter',
  ],
};

const exactlyIsoUtc = (value) =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString() === value;

const invalid = (reason) => ({
  result: 'invalid',
  reason,
  valid: false,
  warnings: [],
});

const hasMetadataContract = (metadata) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata))
    return false;
  try {
    const actualKeys = Reflect.ownKeys(metadata);
    const requiredKeys = Reflect.ownKeys(METADATA);
    return (
      actualKeys.length === requiredKeys.length &&
      requiredKeys.every(
        (key) => actualKeys.includes(key) && metadata[key] === METADATA[key],
      )
    );
  } catch {
    return false;
  }
};

const serializedEventBytes = (events) => {
  try {
    return Buffer.byteLength(JSON.stringify(events), 'utf8');
  } catch {
    return null;
  }
};

const hasExactFields = (event, allowed) => {
  try {
    const keys = Reflect.ownKeys(event);
    return (
      keys.length === allowed.length &&
      allowed.every(
        (key) =>
          keys.includes(key) &&
          Object.prototype.propertyIsEnumerable.call(event, key),
      )
    );
  } catch {
    return false;
  }
};

export function analyzeOperationLog(metadata, events) {
  if (!hasMetadataContract(metadata))
    return invalid('metadata_contract_mismatch');
  if (
    !Array.isArray(events) ||
    events.length === 0 ||
    events.length > MAX_EVENTS
  )
    return invalid('event_count_invalid');
  const bytes = serializedEventBytes(events);
  if (bytes === null) return invalid('events_not_json_serializable');
  if (bytes > MAX_EVENT_BYTES) return invalid('event_bytes_exceeded');

  let result = 'pending';
  let reason = 'awaiting_acceptance';
  let previousTime = null;
  const warnings = [];
  for (const [index, event] of events.entries()) {
    if (!event || typeof event !== 'object' || Array.isArray(event))
      return invalid(`event_${index + 1}_not_object`);
    if (event.seq !== index + 1)
      return invalid('sequence_missing_duplicate_or_out_of_order');
    if (!exactlyIsoUtc(event.serverTime)) return invalid('server_time_invalid');
    if (previousTime !== null && event.serverTime < previousTime)
      warnings.push(`server_time_reversed_at_seq_${event.seq}`);
    previousTime = event.serverTime;
    if (!Object.hasOwn(FIELDS, event.type))
      return invalid('event_type_invalid');
    const allowed = FIELDS[event.type];
    if (!hasExactFields(event, allowed))
      return invalid('event_fields_invalid_or_sensitive');

    if (event.type === 'pending') {
      if (result !== 'pending' || index !== 0)
        return invalid('illegal_transition');
      continue;
    }
    if (event.type === 'accepted') {
      if (result !== 'pending') return invalid('illegal_transition');
      result = 'accepted';
      reason = 'accepted_not_applied';
      continue;
    }
    if (event.type === 'sent') {
      if (result !== 'accepted') return invalid('illegal_transition');
      result = 'sent';
      reason = 'sent_not_applied';
      continue;
    }
    if (event.type === 'disconnect') {
      if (result !== 'sent') return invalid('illegal_transition');
      result = 'unknown';
      reason = 'disconnect_after_send';
      continue;
    }
    if (event.type === 'rejected') {
      if (result !== 'accepted') return invalid('illegal_transition');
      if (
        event.reason !== 'VERSION_CONFLICT' ||
        !Number.isSafeInteger(event.observedRevision) ||
        event.observedRevision < 0 ||
        event.observedRevision === METADATA.expectedRevision ||
        event.expectedRevision !== METADATA.expectedRevision
      )
        return invalid('rejection_proof_invalid');
      result = 'rejected';
      reason = `VERSION_CONFLICT observed=${event.observedRevision} expected=${event.expectedRevision}`;
      continue;
    }
    if (event.type === 'readback') {
      if (!['sent', 'unknown'].includes(result))
        return invalid('illegal_transition');
      const proof =
        event.operationId === METADATA.operationId &&
        event.equipment === METADATA.equipment &&
        event.tag === METADATA.tag &&
        event.value === METADATA.requestedNew &&
        event.revisionBefore === METADATA.expectedRevision &&
        event.revisionAfter === METADATA.expectedRevision + 1;
      if (proof) {
        result = 'applied';
        reason = 'correlated_readback_proof';
      } else {
        result = 'unknown';
        reason = 'readback_proof_incomplete_or_mismatched';
      }
    }
  }
  return { result, reason, valid: true, warnings };
}
