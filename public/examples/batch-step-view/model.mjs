// Read-only projection of a controller-owned batch-step snapshot.
// This module has no timer, command, Retry, Resume, or controller transition.
export const FRESH_WINDOW_MS = 5000;

const STATES = new Set([
  'WAITING',
  'EXECUTING',
  'FAILED',
  'RECOVERY_REQUIRED',
  'COMPLETE',
]);
const QUALITIES = new Set(['GOOD', 'BAD', 'UNKNOWN']);
const WAIT_REASONS = new Set([
  'LEVEL_ABOVE_TARGET',
  'VALVE_FEEDBACK_PENDING',
  'DATA_QUALITY_UNAVAILABLE',
]);
const FAILURE_REASONS = new Set([
  'PROCESS_TIMEOUT',
  'FEEDBACK_CONTRADICTION',
  'CONTROLLER_RESTART',
]);
const own = (value, keys) =>
  value !== null &&
  typeof value === 'object' &&
  Object.getPrototypeOf(value) === Object.prototype &&
  Reflect.ownKeys(value).length === keys.length &&
  keys.every(
    (key) =>
      Object.hasOwn(value, key) &&
      Object.prototype.propertyIsEnumerable.call(value, key),
  );
const safeTime = (value) => Number.isSafeInteger(value) && value >= 0;
const boundedText = (value, max = 80) =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= max &&
  value.trim() === value &&
  !Array.from(value).some(
    (c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127,
  );
const boundedRevision = (value) =>
  Number.isSafeInteger(value) && value > 0 && value <= 1000000;

function validCompletion(value, acquiredAtMs) {
  if (!own(value, ['status', 'conditionEvidence', 'transitionAtMs']))
    return false;
  if (value.status === 'NOT_PROVEN')
    return value.conditionEvidence === null && value.transitionAtMs === null;
  return (
    value.status === 'PROVEN' &&
    boundedText(value.conditionEvidence) &&
    safeTime(value.transitionAtMs) &&
    value.transitionAtMs <= acquiredAtMs
  );
}

function validSnapshot(value) {
  if (
    !own(value, [
      'schemaVersion',
      'sourceEpoch',
      'snapshotRevision',
      'acquiredAtMs',
      'batchId',
      'recipeId',
      'recipeRevision',
      'stepId',
      'attempt',
      'state',
      'quality',
      'completion',
      'waitReason',
      'failureReason',
      'nextCondition',
      'recoveryRequired',
    ]) ||
    value.schemaVersion !== 1 ||
    !boundedRevision(value.sourceEpoch) ||
    !boundedRevision(value.snapshotRevision) ||
    !safeTime(value.acquiredAtMs) ||
    !boundedText(value.batchId, 40) ||
    !boundedText(value.recipeId, 40) ||
    !boundedRevision(value.recipeRevision) ||
    !boundedText(value.stepId, 40) ||
    !boundedRevision(value.attempt) ||
    !STATES.has(value.state) ||
    !QUALITIES.has(value.quality) ||
    !validCompletion(value.completion, value.acquiredAtMs) ||
    !(value.waitReason === null || WAIT_REASONS.has(value.waitReason)) ||
    !(
      value.failureReason === null || FAILURE_REASONS.has(value.failureReason)
    ) ||
    !(value.nextCondition === null || boundedText(value.nextCondition)) ||
    typeof value.recoveryRequired !== 'boolean'
  )
    return false;

  if (value.state === 'WAITING')
    return (
      value.completion.status === 'NOT_PROVEN' &&
      value.waitReason !== null &&
      value.failureReason === null &&
      value.nextCondition !== null &&
      !value.recoveryRequired &&
      (value.quality === 'GOOD'
        ? value.waitReason !== 'DATA_QUALITY_UNAVAILABLE'
        : value.waitReason === 'DATA_QUALITY_UNAVAILABLE')
    );
  if (value.state === 'EXECUTING')
    return (
      value.completion.status === 'NOT_PROVEN' &&
      value.waitReason === null &&
      value.failureReason === null &&
      value.nextCondition !== null &&
      !value.recoveryRequired
    );
  if (value.state === 'FAILED')
    return (
      value.completion.status === 'NOT_PROVEN' &&
      value.waitReason === null &&
      value.failureReason !== null &&
      value.nextCondition !== null &&
      value.recoveryRequired
    );
  if (value.state === 'RECOVERY_REQUIRED')
    return (
      value.completion.status === 'NOT_PROVEN' &&
      value.waitReason === null &&
      value.failureReason !== null &&
      value.nextCondition !== null &&
      value.recoveryRequired
    );
  return (
    value.state === 'COMPLETE' &&
    value.quality === 'GOOD' &&
    value.completion.status === 'PROVEN' &&
    value.waitReason === null &&
    value.failureReason === null &&
    value.nextCondition === null &&
    !value.recoveryRequired
  );
}

const rejected = (code) => ({
  accepted: false,
  code,
  view: {
    status: 'UNKNOWN',
    currentStep: 'Unknown',
    attempt: null,
    quality: 'UNKNOWN',
    completion: 'NOT_PROVEN',
    conditionEvidence: null,
    waitReason: null,
    failureReason: null,
    nextCondition: null,
    recovery: 'DO_NOT_ACT',
  },
});

// `nowMs` is a caller-observed instant from the same virtual clock. It only
// gates whether the authoritative snapshot is fresh enough to display.
export function projectSnapshot(snapshot, nowMs) {
  if (!safeTime(nowMs))
    throw new TypeError('nowMs must be a nonnegative safe integer');
  if (!validSnapshot(snapshot)) return rejected('SOURCE_REJECTED');
  if (nowMs < snapshot.acquiredAtMs) return rejected('CLOCK_BEFORE_SNAPSHOT');
  if (nowMs - snapshot.acquiredAtMs >= FRESH_WINDOW_MS)
    return rejected('SOURCE_STALE');
  return {
    accepted: true,
    code: 'PROJECTED',
    view: {
      status: snapshot.state,
      sourceEpoch: snapshot.sourceEpoch,
      snapshotRevision: snapshot.snapshotRevision,
      acquiredAtMs: snapshot.acquiredAtMs,
      batchId: snapshot.batchId,
      recipe: `${snapshot.recipeId}@${snapshot.recipeRevision}`,
      currentStep: snapshot.stepId,
      attempt: snapshot.attempt,
      quality: snapshot.quality,
      completion: snapshot.completion.status,
      conditionEvidence: snapshot.completion.conditionEvidence,
      transitionAtMs: snapshot.completion.transitionAtMs,
      waitReason: snapshot.waitReason,
      failureReason: snapshot.failureReason,
      nextCondition: snapshot.nextCondition,
      recovery: snapshot.recoveryRequired ? 'REQUIRED' : 'NOT_REQUIRED',
    },
  };
}
