const STAGES = [
  'enqueue',
  'dequeue',
  'send',
  'firstByte',
  'lastByte',
  'parseDone',
  'complete',
];

const SEGMENTS = [
  ['queue', 'enqueue', 'dequeue'],
  ['worker_pre', 'dequeue', 'send'],
  ['first_byte_wait', 'send', 'firstByte'],
  ['remaining_receive', 'firstByte', 'lastByte'],
  ['parse', 'lastByte', 'parseDone'],
  ['persist_tail', 'parseDone', 'complete'],
];

const rejected = (record, reason) => ({
  status: 'rejected',
  requestId:
    record !== null && typeof record === 'object'
      ? (record.requestId ?? null)
      : null,
  reason,
});

const validText = (value) => typeof value === 'string' && value.length > 0;

/**
 * Analyses one locally recorded, same-clock timing row. It does no wall-clock
 * waiting, network I/O, PLC access, or CPU-load measurement.
 */
export function analyzeRecord(record) {
  if (record === null || typeof record !== 'object' || Array.isArray(record))
    return rejected(record, 'record must be an object');
  for (const field of ['requestId', 'deviceId', 'workerId'])
    if (!validText(record[field]))
      return rejected(record, `${field} must be nonempty text`);
  if (record.timestamps === null || typeof record.timestamps !== 'object')
    return rejected(record, 'timestamps must be an object');

  const values = {};
  let clockId = null;
  let previousMs = null;
  let previousStage = null;
  for (const stage of STAGES) {
    const timestamp = record.timestamps[stage];
    if (timestamp === null || typeof timestamp !== 'object')
      return rejected(record, `missing ${stage} timestamp`);
    if (!Number.isSafeInteger(timestamp.ms) || timestamp.ms < 0)
      return rejected(record, `${stage}.ms must be a nonnegative safe integer`);
    if (!validText(timestamp.clockId))
      return rejected(record, `${stage}.clockId must be nonempty text`);
    if (clockId === null) clockId = timestamp.clockId;
    else if (timestamp.clockId !== clockId)
      return rejected(record, `clock mismatch at ${stage}`);
    if (previousMs !== null && timestamp.ms < previousMs)
      return rejected(record, `${stage} precedes ${previousStage}`);
    values[stage] = timestamp.ms;
    previousMs = timestamp.ms;
    previousStage = stage;
  }

  const durations = Object.fromEntries(
    SEGMENTS.map(([name, start, end]) => [name, values[end] - values[start]]),
  );
  const total = values.complete - values.enqueue;
  const sum = Object.values(durations).reduce(
    (totalMs, value) => totalMs + value,
    0,
  );
  const candidate = Object.entries(durations).reduce(
    (largest, [segment, durationMs]) =>
      durationMs > largest.durationMs ? { segment, durationMs } : largest,
    { segment: 'queue', durationMs: durations.queue },
  );
  return {
    status: 'accepted',
    requestId: record.requestId,
    deviceId: record.deviceId,
    workerId: record.workerId,
    clockId,
    ...durations,
    total,
    sum,
    sumMatchesTotal: sum === total,
    candidateSegment: candidate.segment,
    candidateDurationMs: candidate.durationMs,
  };
}

export function analyzeRecords(records) {
  if (!Array.isArray(records)) throw new TypeError('records must be an array');
  const accepted = [];
  const rejectedRecords = [];
  for (const record of records) {
    const result = analyzeRecord(record);
    if (result.status === 'accepted') accepted.push(result);
    else rejectedRecords.push(result);
  }
  return { accepted, rejected: rejectedRecords };
}
