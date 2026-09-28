export const MIN_QTY = 1;
export const MAX_QTY = 1000;
export const MIN_WAIT_MS = 0;
export const MAX_WAIT_MS = 60_000;
export const MAX_VERSION = 2_147_483_647;

const INPUT_KEYS = ['edit', 'confirm', 'acceptRequest', 'complete', 'abort'];
const EDIT_KEYS = ['qty', 'wait_ms'];

const copyParameters = (parameters) => ({
  qty: parameters.qty,
  wait_ms: parameters.wait_ms,
});

const copyConfirmed = (confirmed) => ({
  ...copyParameters(confirmed),
  version: confirmed.version,
});

const copySnapshot = (snapshot) =>
  snapshot === null ? null : copyConfirmed(snapshot);

const copyEdit = (edit) => {
  if (!edit || typeof edit !== 'object' || Array.isArray(edit)) return edit;
  return { ...edit };
};

const ownKeysMatch = (value, expected) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  try {
    const keys = Reflect.ownKeys(value);
    return (
      keys.length === expected.length &&
      expected.every(
        (key) =>
          keys.includes(key) &&
          Object.prototype.propertyIsEnumerable.call(value, key),
      )
    );
  } catch {
    return false;
  }
};

const validation = (edit) => {
  if (!ownKeysMatch(edit, EDIT_KEYS))
    return { ok: false, reason: 'edit_shape_invalid' };
  if (!Number.isSafeInteger(edit.qty))
    return { ok: false, reason: 'qty_not_safe_integer' };
  if (edit.qty < MIN_QTY || edit.qty > MAX_QTY)
    return { ok: false, reason: 'qty_out_of_range' };
  if (!Number.isSafeInteger(edit.wait_ms))
    return { ok: false, reason: 'wait_ms_not_safe_integer' };
  if (edit.wait_ms < MIN_WAIT_MS || edit.wait_ms > MAX_WAIT_MS)
    return { ok: false, reason: 'wait_ms_out_of_range' };
  return { ok: true, value: copyParameters(edit) };
};

const ensureInput = (input) => {
  if (!ownKeysMatch(input, INPUT_KEYS))
    throw new TypeError(
      'scan input must contain only edit and four boolean signals',
    );
  for (const key of ['confirm', 'acceptRequest', 'complete', 'abort']) {
    if (typeof input[key] !== 'boolean')
      throw new TypeError(`${key} must be boolean`);
  }
  if (input.complete && input.abort)
    throw new RangeError('complete and abort cannot both be true in one scan');
};

const initialConfirmed = (confirmed) => {
  if (!confirmed || typeof confirmed !== 'object' || Array.isArray(confirmed))
    throw new RangeError('initial confirmed parameters must be an object');
  const checked = validation({
    qty: confirmed.qty,
    wait_ms: confirmed.wait_ms,
  });
  if (!checked.ok)
    throw new RangeError(
      `initial confirmed parameters invalid: ${checked.reason}`,
    );
  if (
    !Number.isSafeInteger(confirmed.version) ||
    confirmed.version < 1 ||
    confirmed.version > MAX_VERSION
  )
    throw new RangeError(
      'initial confirmed version must be within 1..MAX_VERSION',
    );
  return { ...checked.value, version: confirmed.version };
};

const noEvent = () => ({ status: 'none', reason: 'none' });

const nextState = (state, edit, input) => ({
  scan: state.scan + 1,
  edit: copyEdit(edit),
  confirmed: copyConfirmed(state.confirmed),
  jobState: state.jobState,
  jobSnapshot: copySnapshot(state.jobSnapshot),
  lastJob: state.lastJob
    ? {
        outcome: state.lastJob.outcome,
        snapshot: copySnapshot(state.lastJob.snapshot),
      }
    : null,
  previousConfirm: input.confirm,
  previousAcceptRequest: input.acceptRequest,
  acceptPending: state.acceptPending,
  confirmation: noEvent(),
  acceptance: noEvent(),
  terminal: noEvent(),
});

export function initialState({ confirmed } = {}) {
  const startingConfirmed = initialConfirmed(
    confirmed ?? { qty: 100, wait_ms: 500, version: 7 },
  );
  return {
    scan: 0,
    edit: copyParameters(startingConfirmed),
    confirmed: startingConfirmed,
    jobState: 'IDLE',
    jobSnapshot: null,
    lastJob: null,
    previousConfirm: false,
    previousAcceptRequest: false,
    acceptPending: false,
    confirmation: noEvent(),
    acceptance: noEvent(),
    terminal: noEvent(),
  };
}

const startJob = (state) => {
  state.jobState = 'RUN';
  state.jobSnapshot = copyConfirmed(state.confirmed);
  state.acceptPending = false;
  state.acceptance = {
    status: 'accepted',
    reason: `snapshot_version_${state.jobSnapshot.version}`,
  };
};

export function parameterScan(state, input) {
  ensureInput(input);
  const next = nextState(state, input.edit, input);
  const confirmRising = input.confirm && !state.previousConfirm;
  const acceptRising = input.acceptRequest && !state.previousAcceptRequest;
  let confirmationRejected = false;

  if (confirmRising) {
    const checked = validation(input.edit);
    if (!checked.ok) {
      next.confirmation = { status: 'rejected', reason: checked.reason };
      confirmationRejected = true;
    } else if (state.confirmed.version === MAX_VERSION) {
      next.confirmation = { status: 'rejected', reason: 'version_exhausted' };
      confirmationRejected = true;
    } else {
      next.confirmed = {
        ...checked.value,
        version: state.confirmed.version + 1,
      };
      next.confirmation = {
        status: 'accepted',
        reason: `confirmed_version_${next.confirmed.version}`,
      };
    }
  }

  const terminalSignal = input.complete
    ? 'completed'
    : input.abort
      ? 'aborted'
      : null;
  const wasRunning = state.jobState === 'RUN';
  if (terminalSignal && wasRunning) {
    next.lastJob = {
      outcome: terminalSignal,
      snapshot: copySnapshot(state.jobSnapshot),
    };
    next.jobState = 'IDLE';
    next.jobSnapshot = null;
    next.terminal = { status: terminalSignal, reason: 'job_snapshot_cleared' };
  } else if (terminalSignal) {
    next.terminal = { status: 'ignored', reason: 'no_running_job' };
  }

  if (wasRunning) {
    if (acceptRising)
      next.acceptance = { status: 'rejected', reason: 'job_running' };
    return next;
  }

  if (terminalSignal) {
    if (next.acceptPending || acceptRising) {
      next.acceptance = {
        status: 'rejected',
        reason: 'terminal_signal_active',
      };
    }
    next.acceptPending = false;
    return next;
  }

  if (next.acceptPending) {
    if (!input.acceptRequest) {
      next.acceptPending = false;
      next.acceptance = {
        status: 'rejected',
        reason: 'accept_request_released_before_ack',
      };
    } else if (confirmationRejected) {
      next.acceptPending = false;
      next.acceptance = { status: 'rejected', reason: 'confirmation_rejected' };
    } else if (confirmRising) {
      next.acceptance = {
        status: 'deferred',
        reason: 'confirmation_same_scan',
      };
    } else {
      startJob(next);
    }
    return next;
  }

  if (!acceptRising) return next;
  if (confirmationRejected) {
    next.acceptance = { status: 'rejected', reason: 'confirmation_rejected' };
  } else if (confirmRising) {
    next.acceptPending = true;
    next.acceptance = { status: 'deferred', reason: 'confirmation_same_scan' };
  } else {
    startJob(next);
  }
  return next;
}
