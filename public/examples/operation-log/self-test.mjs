import assert from 'node:assert/strict';
import { fixtures, METADATA } from './fixtures.mjs';
import { analyzeOperationLog } from './model.mjs';

const result = (name) => analyzeOperationLog(METADATA, fixtures[name]);
assert.equal(result('success').result, 'applied');
assert.equal(result('acceptedOnly').result, 'accepted');
assert.equal(result('disconnectUnknown').result, 'unknown');
assert.equal(result('unknownResolved').result, 'applied');
assert.equal(result('sameValueWrongOperation').result, 'unknown');
assert.equal(result('revisionConflict').result, 'rejected');
assert.equal(result('malformedMissingProof').result, 'invalid');
assert.equal(result('missingSequence').result, 'invalid');
assert.deepEqual(result('reversedServerTime').warnings, [
  'server_time_reversed_at_seq_2',
]);
console.log('self-test: PASS');
