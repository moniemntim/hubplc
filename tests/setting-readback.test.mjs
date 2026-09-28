import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import {
  fixtures,
  METADATA,
} from '../public/examples/operation-log/fixtures.mjs';
import { analyzeOperationLog } from '../public/examples/operation-log/model.mjs';

void test('readback demo provides accepted, unknown, applied and rejected evidence', () => {
  const output = execFileSync(
    process.execPath,
    ['public/examples/operation-log/readback-demo.mjs'],
    { encoding: 'utf8' },
  );
  assert.match(
    output,
    /acceptedOnly: result=accepted reason=accepted_not_applied/,
  );
  assert.match(
    output,
    /disconnectUnknown: result=unknown reason=disconnect_after_send/,
  );
  assert.match(
    output,
    /success: result=applied reason=correlated_readback_proof/,
  );
  assert.match(
    output,
    /sameValueWrongOperation: result=unknown reason=readback_proof_incomplete_or_mismatched/,
  );
});

void test('the same number needs operation target and revision proof', () => {
  assert.equal(
    analyzeOperationLog(METADATA, fixtures.sameValueWrongOperation).result,
    'unknown',
  );
  const wrongRevision = structuredClone(fixtures.success);
  wrongRevision.at(-1).revisionAfter = 44;
  assert.equal(analyzeOperationLog(METADATA, wrongRevision).result, 'unknown');
  assert.equal(
    analyzeOperationLog(METADATA, fixtures.success).result,
    'applied',
  );
});

void test('readback practice is executable and starts with wrong-operation evidence', () => {
  const output = execFileSync(
    process.execPath,
    ['public/examples/operation-log/readback-practice.mjs'],
    { encoding: 'utf8' },
  );
  assert.match(output, /"readbackOperationId":"OP-OTHER"/);
  assert.match(output, /"result":"unknown"/);
});
