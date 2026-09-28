import assert from 'node:assert/strict';
import { fixtures, METADATA } from './fixtures.mjs';
import { analyzeOperationLog } from './model.mjs';

const cases = [
  'success',
  'acceptedOnly',
  'disconnectUnknown',
  'unknownResolved',
  'sameValueWrongOperation',
  'revisionConflict',
  'malformedMissingProof',
  'missingSequence',
];
const expected = {
  success: ['applied', 'correlated_readback_proof'],
  acceptedOnly: ['accepted', 'accepted_not_applied'],
  disconnectUnknown: ['unknown', 'disconnect_after_send'],
  unknownResolved: ['applied', 'correlated_readback_proof'],
  sameValueWrongOperation: [
    'unknown',
    'readback_proof_incomplete_or_mismatched',
  ],
  revisionConflict: ['rejected', 'VERSION_CONFLICT observed=43 expected=42'],
  malformedMissingProof: ['invalid', 'event_fields_invalid_or_sensitive'],
  missingSequence: ['invalid', 'sequence_missing_duplicate_or_out_of_order'],
};
for (const name of cases) {
  const outcome = analyzeOperationLog(METADATA, fixtures[name]);
  assert.deepEqual([outcome.result, outcome.reason], expected[name]);
  console.log(`${name}: result=${outcome.result} reason=${outcome.reason}`);
}
console.log('demo: PASS');
