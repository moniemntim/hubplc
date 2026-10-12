function whole(input: string, label: string) {
  const text = input.trim();
  if (!/^-?\d+$/.test(text)) throw new Error(`${label} 必須是整數。`);
  const value = Number(text);
  if (!Number.isSafeInteger(value))
    throw new Error(`${label} 超出安全整數範圍。`);
  return value;
}

export function manualModeCase(completeAtInput: string, interlock: boolean) {
  const completeAt = whole(completeAtInput, '完成時間');
  if (completeAt < 0) throw new Error('完成時間不可為負數。');
  if (completeAt >= 5000)
    return {
      status: 'REJECTED',
      reason: 'TIMEOUT',
      mode: 'Auto',
      owner: 'PLC',
      revision: 1,
    };
  if (!interlock)
    return {
      status: 'REJECTED',
      reason: 'INTERLOCK_DENIED',
      mode: 'Auto',
      owner: 'PLC',
      revision: 1,
    };
  return {
    status: 'CONFIRMED',
    reason: 'CONDITIONS_MET',
    mode: 'Manual',
    owner: 'HMI-A',
    revision: 2,
  };
}

export function maintenanceExitCase(
  testStopped: boolean,
  restoreReviewed: boolean,
) {
  if (!testStopped)
    return {
      status: 'PENDING',
      reason: 'WAIT_TEST_STOPPED',
      mode: 'Maintenance',
      revision: 3,
    };
  if (!restoreReviewed)
    return {
      status: 'PENDING',
      reason: 'WAIT_RESTORE_REVIEW',
      mode: 'Maintenance',
      revision: 3,
    };
  return {
    status: 'CONFIRMED',
    reason: 'CONDITIONS_MET',
    mode: 'Manual',
    revision: 4,
  };
}

export function authorizationCase(input: {
  session: 'V' | 'O' | 'S' | 'T' | 'M';
  value: string;
  target: 'A' | 'B';
  at: string;
  expectedRevision: string;
}) {
  const value = whole(input.value, '設定值');
  const at = whole(input.at, '虛擬時間');
  if (at < 0) throw new Error('虛擬時間不可為負數。');
  const expectedRevision = whole(input.expectedRevision, '預期版本');
  let submit: string;
  if (expectedRevision < 1) submit = 'INVALID_REQUEST';
  else if (at >= 600000) submit = 'SESSION_EXPIRED_OR_UNKNOWN';
  else if (input.target !== 'A') submit = 'RESOURCE_DENIED';
  else if (input.session !== 'S' && input.session !== 'T')
    submit = 'ROLE_DENIED';
  else if (value < 60 || value > 100) submit = 'RANGE_DENIED';
  else if (expectedRevision !== 1) submit = 'REVISION_CONFLICT';
  else submit = 'QUEUED';
  return {
    submit,
    execute: submit === 'QUEUED' ? 'APPLIED' : 'UNKNOWN_OPERATION',
    value: submit === 'QUEUED' ? value : 80,
    revision: submit === 'QUEUED' ? 2 : 1,
    writes: submit === 'QUEUED' ? 1 : 0,
  };
}

export function downgradeCase(restoreBeforeDispatch: boolean) {
  return {
    queuedPolicyRevision: 12,
    currentPolicyRevision: restoreBeforeDispatch ? 14 : 13,
    staleTabCanSubmit: true,
    directSubmit: 'ROLE_DENIED',
    dispatch: restoreBeforeDispatch ? 'AUTHORIZATION_CHANGED' : 'ROLE_DENIED',
    value: 80,
    revision: 1,
    writes: 0,
  };
}
