const safe = (x) => Number.isSafeInteger(x) && x >= 0;
export function createDraft(current, value, now) {
  if (
    current?.decision !== 'READ' ||
    !['V', 'O', 'S', 'M'].includes(current.user) ||
    current.target !== 'A' ||
    !Number.isSafeInteger(current.revision) ||
    current.revision < 1 ||
    !Number.isSafeInteger(current.value) ||
    !Number.isSafeInteger(value) ||
    value < 60 ||
    value > 100 ||
    !safe(now) ||
    now > Number.MAX_SAFE_INTEGER - 300000
  )
    throw new TypeError('invalid draft context');
  return Object.freeze({
    owner: current.user,
    target: 'A',
    unit: 'C',
    baseValue: current.value,
    baseRevision: current.revision,
    value,
    createdAt: now,
    expiresAt: now + 300000,
  });
}
export function reviewDraft(draft, current, now, sentOperationId = null) {
  if (!safe(now) || now < draft.createdAt)
    throw new TypeError('invalid review time');
  if (current?.decision === 'READ' && current.user !== draft.owner)
    return { state: 'OTHER_USER_HIDDEN' };
  if (sentOperationId !== null)
    return { state: 'SENT_RESULT_REQUIRED', operationId: sentOperationId };
  if (now >= draft.expiresAt) return { state: 'DRAFT_EXPIRED' };
  if (current?.decision !== 'READ') return { state: 'REAUTH_REQUIRED_UNSENT' };
  if (current.target !== draft.target || current.unit !== draft.unit)
    return { state: 'CONTEXT_CHANGED' };
  if (!current.canSubmit) return { state: 'ROLE_DENIED_UNSENT' };
  if (
    current.revision !== draft.baseRevision ||
    current.value !== draft.baseValue
  )
    return {
      state: 'VERSION_CHANGED',
      base: draft.baseValue,
      current: current.value,
      draft: draft.value,
    };
  return {
    state: 'READY_FOR_EXPLICIT_SUBMIT',
    draft: draft.value,
    expectedRevision: draft.baseRevision,
  };
}
