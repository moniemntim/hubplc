export const MAX_SEQUENCE = 1_000_000;
export const MAX_HOLD_MS = 60_000;

const STATIONS = ['A', 'B'];
const INPUT_KEYS = [
  'nowMs',
  'requestA',
  'requestB',
  'cancelA',
  'cancelB',
  'release',
  'resetFault',
  'moduleReady',
  'safetyConfirmed',
];

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

const copyPending = (pending) =>
  pending ? { station: pending.station, seq: pending.seq } : null;

const ensureInput = (input, previousNowMs) => {
  if (!ownKeysMatch(input, INPUT_KEYS))
    throw new TypeError('scan input has missing or unknown fields');
  if (!Number.isSafeInteger(input.nowMs) || input.nowMs < previousNowMs)
    throw new RangeError('nowMs must be a nondecreasing safe integer');
  for (const key of [
    'requestA',
    'requestB',
    'cancelA',
    'cancelB',
    'resetFault',
    'moduleReady',
    'safetyConfirmed',
  ]) {
    if (typeof input[key] !== 'boolean')
      throw new TypeError(`${key} must be boolean`);
  }
};

const validRelease = (release) =>
  release !== null &&
  ownKeysMatch(release, ['owner', 'jobSeq']) &&
  STATIONS.includes(release.owner) &&
  Number.isSafeInteger(release.jobSeq) &&
  release.jobSeq >= 1;

const idleEvent = () => 'none';

const recordEvent = (state, event) => {
  state.events.push(event);
  state.event = event;
};

export function initialScheduler({ maxHoldMs = 10, firstSequence = 1 } = {}) {
  if (
    !Number.isSafeInteger(maxHoldMs) ||
    maxHoldMs < 1 ||
    maxHoldMs > MAX_HOLD_MS
  )
    throw new RangeError(`maxHoldMs must be within 1..${MAX_HOLD_MS}`);
  if (
    !Number.isSafeInteger(firstSequence) ||
    firstSequence < 1 ||
    firstSequence > MAX_SEQUENCE
  )
    throw new RangeError(`firstSequence must be within 1..${MAX_SEQUENCE}`);
  return {
    scan: 0,
    nowMs: 0,
    maxHoldMs,
    nextSequence: firstSequence,
    owner: null,
    ownerJobSeq: null,
    deadlineMs: null,
    faultLock: false,
    faultOwner: null,
    pending: { A: null, B: null },
    previousRequest: { A: false, B: false },
    previousResetFault: false,
    grant: null,
    enable: { A: false, B: false },
    events: [],
    event: idleEvent(),
  };
}

const copyState = (state, input) => ({
  scan: state.scan + 1,
  nowMs: input.nowMs,
  maxHoldMs: state.maxHoldMs,
  nextSequence: state.nextSequence,
  owner: state.owner,
  ownerJobSeq: state.ownerJobSeq,
  deadlineMs: state.deadlineMs,
  faultLock: state.faultLock,
  faultOwner: state.faultOwner,
  pending: { A: copyPending(state.pending.A), B: copyPending(state.pending.B) },
  previousRequest: { A: input.requestA, B: input.requestB },
  previousResetFault: input.resetFault,
  grant: null,
  enable: { A: false, B: false },
  events: [],
  event: idleEvent(),
});

const updateEnable = (state) => {
  state.enable = {
    A: !state.faultLock && state.owner === 'A',
    B: !state.faultLock && state.owner === 'B',
  };
  return state;
};

const addRequest = (state, station) => {
  if (state.nextSequence > MAX_SEQUENCE) {
    recordEvent(state, `request_${station}_rejected_sequence_exhausted`);
    return;
  }
  if (state.owner === station) {
    recordEvent(state, `request_${station}_ignored_owner_already_active`);
    return;
  }
  if (state.pending[station]) return;
  state.pending[station] = { station, seq: state.nextSequence };
  state.nextSequence += 1;
};

const cancelQueued = (state, station) => {
  if (!state.pending[station]) return false;
  state.pending[station] = null;
  recordEvent(state, `pending_${station}_cancelled`);
  return true;
};

const grantNext = (state) => {
  const candidates = STATIONS.map((station) => state.pending[station]).filter(
    Boolean,
  );
  if (candidates.length === 0) return;
  if (state.nowMs > Number.MAX_SAFE_INTEGER - state.maxHoldMs) {
    recordEvent(state, 'clock_exhausted');
    return;
  }
  candidates.sort((left, right) => left.seq - right.seq);
  const next = candidates[0];
  state.pending[next.station] = null;
  state.owner = next.station;
  state.ownerJobSeq = next.seq;
  state.deadlineMs = state.nowMs + state.maxHoldMs;
  state.grant = { station: next.station, jobSeq: next.seq };
  recordEvent(state, `granted_${next.station}_${next.seq}`);
};

export function schedulerScan(state, input) {
  ensureInput(input, state.nowMs);
  const next = copyState(state, input);
  const requestRising = {
    A: input.requestA && !state.previousRequest.A,
    B: input.requestB && !state.previousRequest.B,
  };
  const resetRising = input.resetFault && !state.previousResetFault;

  for (const station of STATIONS) {
    if (requestRising[station]) addRequest(next, station);
  }
  for (const station of STATIONS) {
    if (input[`cancel${station}`]) cancelQueued(next, station);
  }

  const timedOut =
    state.owner !== null && input.nowMs >= state.deadlineMs && !state.faultLock;
  if (timedOut) {
    next.faultLock = true;
    next.faultOwner = state.owner;
    recordEvent(next, `timeout_${state.owner}_${state.ownerJobSeq}`);
    return updateEnable(next);
  }

  if (state.faultLock) {
    if (resetRising && input.moduleReady && input.safetyConfirmed) {
      next.faultLock = false;
      next.owner = null;
      next.ownerJobSeq = null;
      next.deadlineMs = null;
      recordEvent(next, 'fault_reset_owner_cleared');
    } else if (resetRising) {
      recordEvent(next, 'fault_reset_conditions_not_met');
    }
    return updateEnable(next);
  }

  let releasedThisScan = false;
  if (input.release !== null) {
    if (
      validRelease(input.release) &&
      state.owner === input.release.owner &&
      state.ownerJobSeq === input.release.jobSeq
    ) {
      next.owner = null;
      next.ownerJobSeq = null;
      next.deadlineMs = null;
      recordEvent(
        next,
        `released_${input.release.owner}_${input.release.jobSeq}`,
      );
      releasedThisScan = true;
    } else {
      recordEvent(next, 'release_rejected_owner_or_jobseq_mismatch');
    }
  }

  if (!releasedThisScan) {
    for (const station of STATIONS) {
      if (state.owner === station && input[`cancel${station}`]) {
        recordEvent(next, `owner_${station}_cancel_requires_controlled_stop`);
      }
    }
  }

  if (releasedThisScan || state.owner !== null) return updateEnable(next);

  grantNext(next);
  return updateEnable(next);
}
