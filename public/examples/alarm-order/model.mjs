import { createHash } from 'node:crypto';
export const RULE = 'alarm-order/v1';
const FIELDS = [
  'sourceId',
  'conditionId',
  'occurrenceId',
  'severity',
  'active',
  'acked',
  'eventTime',
  'timeTrusted',
  'uncertaintyMs',
  'receiveTime',
];
const ID = /^[A-Z0-9_-]{1,24}$/;
function utc(text) {
  if (
    typeof text !== 'string' ||
    text.length !== 24 ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(text)
  )
    throw new TypeError('UTC_MILLISECONDS_REQUIRED');
  const ms = Date.parse(text);
  if (!Number.isFinite(ms) || new Date(ms).toISOString() !== text)
    throw new TypeError('INVALID_DATE');
  return ms;
}
function record(input) {
  if (
    !input ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Reflect.ownKeys(input).length !== FIELDS.length ||
    !FIELDS.every(
      (k) =>
        Object.hasOwn(input, k) &&
        Object.prototype.propertyIsEnumerable.call(input, k),
    )
  )
    throw new TypeError('RECORD_SHAPE');
  for (const key of ['sourceId', 'conditionId', 'occurrenceId'])
    if (
      typeof input[key] !== 'string' ||
      input[key].trim() !== input[key] ||
      !ID.test(input[key])
    )
      throw new TypeError('IDENTITY_REQUIRED');
  if (
    !Number.isInteger(input.severity) ||
    input.severity < 1 ||
    input.severity > 1000
  )
    throw new RangeError('SEVERITY_1_TO_1000');
  for (const key of ['active', 'acked', 'timeTrusted'])
    if (typeof input[key] !== 'boolean')
      throw new TypeError('BOOLEAN_REQUIRED');
  if (input.eventTime !== null) utc(input.eventTime);
  utc(input.receiveTime);
  if (input.timeTrusted && input.eventTime === null)
    throw new TypeError('TRUSTED_TIME_MISSING');
  if (
    input.uncertaintyMs !== null &&
    (!Number.isSafeInteger(input.uncertaintyMs) ||
      input.uncertaintyMs < 0 ||
      input.uncertaintyMs > 60000)
  )
    throw new RangeError('UNCERTAINTY_RANGE');
  if (input.timeTrusted && input.uncertaintyMs === null)
    throw new TypeError('TRUSTED_UNCERTAINTY_MISSING');
  return Object.fromEntries(FIELDS.map((k) => [k, input[k]]));
}
export const identity = (row) =>
  `${row.sourceId}/${row.conditionId}/${row.occurrenceId}`;
export function sortKey(row) {
  return [
    -row.severity,
    row.timeTrusted ? 0 : 1,
    row.timeTrusted ? utc(row.eventTime) : 0,
    row.sourceId,
    row.conditionId,
    row.occurrenceId,
  ];
}
function compare(a, b) {
  const x = sortKey(a),
    y = sortKey(b);
  for (let i = 0; i < x.length; i++)
    if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
}
export function createSnapshot(input) {
  if (!Array.isArray(input) || input.length > 100)
    throw new RangeError('AT_MOST_100_INPUT_ROWS');
  const byId = new Map();
  // for-of visits array holes, which record() rejects instead of skipping.
  for (const item of input) {
    const row = record(item),
      key = identity(row),
      old = byId.get(key);
    if (old && JSON.stringify(old) !== JSON.stringify(row))
      throw new Error('CONFLICTING_SNAPSHOT_ROW:' + key);
    byId.set(key, row);
  }
  const rows = [...byId.values()].sort(compare).map(Object.freeze);
  const id = createHash('sha256')
    .update(JSON.stringify({ rule: RULE, rows }))
    .digest('hex');
  return Object.freeze({ rule: RULE, id, rows: Object.freeze(rows) });
}
export function page(snapshot, offset, size) {
  if (
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    offset > snapshot.rows.length ||
    !Number.isSafeInteger(size) ||
    size < 1 ||
    size > 20
  )
    throw new RangeError('PAGE_BOUNDS');
  return snapshot.rows.slice(offset, offset + size);
}
export function partition(snapshot) {
  const groups = {
    activeUnacked: [],
    activeAcked: [],
    inactiveUnacked: [],
    inactiveAcked: [],
  };
  for (const row of snapshot.rows)
    groups[
      `${row.active ? 'active' : 'inactive'}${row.acked ? 'Acked' : 'Unacked'}`
    ].push(row);
  return groups;
}
