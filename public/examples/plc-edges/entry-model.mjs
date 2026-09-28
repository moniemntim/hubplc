// Offline teaching model for data ownership at an already approved state.
// It does not choose state transitions or emulate a PLC/vendor runtime.
const allowedStates = new Set(['WAIT', 'RUN', 'DONE']);

export const initialEntry = () => ({
  previous: 'WAIT',
  batchSum: 0,
  sampleCount: 0,
  entryCount: 0,
  savedSum: null,
  savedCount: null,
  saveCount: 0,
});

function assertState(state) {
  if (!allowedStates.has(state))
    throw new TypeError('stateNow must be WAIT, RUN, or DONE');
}

function assertBefore(before) {
  if (
    !allowedStates.has(before?.previous) ||
    !Number.isFinite(before.batchSum) ||
    !Number.isSafeInteger(before.sampleCount) ||
    before.sampleCount < 0 ||
    !Number.isSafeInteger(before.entryCount) ||
    before.entryCount < 0 ||
    !Number.isSafeInteger(before.saveCount) ||
    before.saveCount < 0 ||
    (before.savedSum !== null && !Number.isFinite(before.savedSum)) ||
    (before.savedCount !== null &&
      (!Number.isSafeInteger(before.savedCount) || before.savedCount < 0))
  )
    throw new TypeError(
      'before must be a state returned by initialEntry or entryScan',
    );
}

export function entryScan(before, { stateNow, sample = null }) {
  assertBefore(before);
  assertState(stateNow);
  if (sample !== null && !Number.isFinite(sample))
    throw new TypeError('sample must be a finite number or null');
  const entered = stateNow === 'RUN' && before.previous !== 'RUN';
  const exited = before.previous === 'RUN' && stateNow !== 'RUN';
  const next = {
    ...before,
    previous: stateNow,
    entered,
    exited,
    acceptedSample: false,
  };
  if (entered) {
    if (next.entryCount === Number.MAX_SAFE_INTEGER)
      throw new RangeError('entryCount cannot exceed Number.MAX_SAFE_INTEGER');
    next.batchSum = 0;
    next.sampleCount = 0;
    next.entryCount += 1;
  }
  if (stateNow === 'RUN' && sample !== null) {
    if (next.sampleCount === Number.MAX_SAFE_INTEGER)
      throw new RangeError('sampleCount cannot exceed Number.MAX_SAFE_INTEGER');
    const batchSum = next.batchSum + sample;
    if (!Number.isFinite(batchSum))
      throw new RangeError('batchSum must remain finite');
    next.batchSum = batchSum;
    next.sampleCount += 1;
    next.acceptedSample = true;
  }
  if (exited) {
    if (next.saveCount === Number.MAX_SAFE_INTEGER)
      throw new RangeError('saveCount cannot exceed Number.MAX_SAFE_INTEGER');
    next.savedSum = next.batchSum;
    next.savedCount = next.sampleCount;
    next.saveCount += 1;
  }
  return next;
}
