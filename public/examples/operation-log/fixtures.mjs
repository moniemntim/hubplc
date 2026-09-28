import { METADATA } from './model.mjs';

const at = (seq, type, extra = {}) => ({
  seq,
  type,
  serverTime: `2026-09-28T00:00:0${seq}.000Z`,
  ...extra,
});
const proof = (seq, extra = {}) =>
  at(seq, 'readback', {
    operationId: METADATA.operationId,
    equipment: METADATA.equipment,
    tag: METADATA.tag,
    value: METADATA.requestedNew,
    revisionBefore: METADATA.expectedRevision,
    revisionAfter: METADATA.expectedRevision + 1,
    ...extra,
  });

export { METADATA };
export const fixtures = {
  success: [at(1, 'pending'), at(2, 'accepted'), at(3, 'sent'), proof(4)],
  acceptedOnly: [at(1, 'pending'), at(2, 'accepted')],
  disconnectUnknown: [
    at(1, 'pending'),
    at(2, 'accepted'),
    at(3, 'sent'),
    at(4, 'disconnect'),
  ],
  unknownResolved: [
    at(1, 'pending'),
    at(2, 'accepted'),
    at(3, 'sent'),
    at(4, 'disconnect'),
    proof(5),
  ],
  sameValueWrongOperation: [
    at(1, 'pending'),
    at(2, 'accepted'),
    at(3, 'sent'),
    proof(4, { operationId: 'OP-OTHER' }),
  ],
  revisionConflict: [
    at(1, 'pending'),
    at(2, 'accepted'),
    at(3, 'rejected', {
      reason: 'VERSION_CONFLICT',
      observedRevision: 43,
      expectedRevision: 42,
    }),
  ],
  malformedMissingProof: [
    at(1, 'pending'),
    at(2, 'accepted'),
    at(3, 'sent'),
    at(4, 'readback', {
      operationId: 'OP-884',
      equipment: 'EQ-A',
      tag: 'TEMP_SP',
      value: 55,
      revisionBefore: 42,
    }),
  ],
  missingSequence: [at(1, 'pending'), at(3, 'accepted')],
  reversedServerTime: [
    at(1, 'pending'),
    { ...at(2, 'accepted'), serverTime: '2026-09-27T00:00:00.000Z' },
  ],
};
