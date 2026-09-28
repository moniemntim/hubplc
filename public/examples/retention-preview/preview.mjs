// A fixed, fictional policy for an offline teaching exercise. No deletion API.
export const POLICY = Object.freeze({
  id: 'DEMO-T30-v1',
  dataClass: 'telemetry-demo',
  days: 30,
});

function utcSeconds(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)
  )
    return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) &&
    new Date(ms).toISOString() === value.replace('Z', '.000Z')
    ? ms
    : null;
}

export function previewRecord(record, asOf) {
  const now = utcSeconds(asOf);
  if (now === null)
    throw new TypeError('asOf must be a real UTC timestamp to whole seconds');
  const result = {
    id: record?.id ?? null,
    status: 'REVIEW',
    reason: '',
    expiresAt: null,
  };
  if (!record || typeof record.id !== 'string' || !record.id.trim())
    return { ...result, reason: 'MISSING_ID' };
  if (
    !Array.isArray(record.holds) ||
    record.holds.some((hold) => typeof hold !== 'string' || !hold.trim())
  )
    return { ...result, reason: 'UNKNOWN_HOLD_STATE' };
  if (record.holds.length > 0)
    return { ...result, status: 'HOLD', reason: 'ACTIVE_HOLD' };
  if (record.dataClass !== POLICY.dataClass || record.policyId !== POLICY.id)
    return { ...result, reason: 'UNMATCHED_POLICY' };
  const closedAt = utcSeconds(record.closedAt);
  if (closedAt === null) return { ...result, reason: 'INVALID_CLOSED_AT' };
  if (closedAt > now) return { ...result, reason: 'FUTURE_CLOSED_AT' };
  const expires = closedAt + POLICY.days * 24 * 60 * 60 * 1000;
  return {
    ...result,
    status: now >= expires ? 'CANDIDATE' : 'KEEP',
    reason: now >= expires ? 'EXPIRED_FOR_REVIEW' : 'NOT_YET_EXPIRED',
    expiresAt: new Date(expires).toISOString(),
  };
}
