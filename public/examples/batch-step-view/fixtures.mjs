const base = {
  schemaVersion: 1,
  sourceEpoch: 7,
  snapshotRevision: 11,
  acquiredAtMs: 1000,
  batchId: 'CIP-17',
  recipeId: 'CIP-R7',
  recipeRevision: 7,
  stepId: 'Drain',
  attempt: 1,
  state: 'WAITING',
  quality: 'GOOD',
  completion: {
    status: 'NOT_PROVEN',
    conditionEvidence: null,
    transitionAtMs: null,
  },
  waitReason: 'LEVEL_ABOVE_TARGET',
  failureReason: null,
  nextCondition:
    'reported level 35% > target 20%; controller needs level <= 20% and quality GOOD',
  recoveryRequired: false,
};

export const snapshot = (overrides = {}) => ({
  ...base,
  ...overrides,
  completion: overrides.completion ?? { ...base.completion },
});

export const cases = [
  ['waiting-level', 1000, snapshot()],
  [
    'waiting-quality-bad',
    2000,
    snapshot({
      snapshotRevision: 12,
      acquiredAtMs: 2000,
      quality: 'BAD',
      waitReason: 'DATA_QUALITY_UNAVAILABLE',
      nextCondition: 'quality GOOD before evaluating level',
    }),
  ],
  [
    'waiting-quality-unknown',
    3000,
    snapshot({
      snapshotRevision: 13,
      acquiredAtMs: 3000,
      quality: 'UNKNOWN',
      waitReason: 'DATA_QUALITY_UNAVAILABLE',
      nextCondition: 'quality GOOD before evaluating level',
    }),
  ],
  [
    'failed-timeout-as-reported',
    120000,
    snapshot({
      snapshotRevision: 14,
      acquiredAtMs: 120000,
      state: 'FAILED',
      waitReason: null,
      failureReason: 'PROCESS_TIMEOUT',
      nextCondition: 'read controller recovery decision',
      recoveryRequired: true,
    }),
  ],
  [
    'controller-restart-recovery-read',
    121000,
    snapshot({
      sourceEpoch: 8,
      snapshotRevision: 1,
      acquiredAtMs: 121000,
      state: 'RECOVERY_REQUIRED',
      quality: 'UNKNOWN',
      waitReason: null,
      failureReason: 'CONTROLLER_RESTART',
      nextCondition: 'operator verifies batch and equipment before recovery',
      recoveryRequired: true,
    }),
  ],
  [
    'hmi-reopen-reads-new-attempt',
    130000,
    snapshot({
      sourceEpoch: 8,
      snapshotRevision: 2,
      acquiredAtMs: 130000,
      attempt: 2,
      waitReason: 'VALVE_FEEDBACK_PENDING',
      nextCondition: 'valve open feedback GOOD',
    }),
  ],
  [
    'complete-with-source-evidence',
    135000,
    snapshot({
      sourceEpoch: 8,
      snapshotRevision: 3,
      acquiredAtMs: 135000,
      attempt: 2,
      state: 'COMPLETE',
      quality: 'GOOD',
      completion: {
        status: 'PROVEN',
        conditionEvidence:
          'controller confirmed level <= 20% and valve feedback GOOD',
        transitionAtMs: 134900,
      },
      waitReason: null,
      failureReason: null,
      nextCondition: null,
      recoveryRequired: false,
    }),
  ],
];
