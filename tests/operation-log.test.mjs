import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import {
  fixtures,
  METADATA,
} from '../public/examples/operation-log/fixtures.mjs';
import {
  analyzeOperationLog,
  MAX_EVENTS,
} from '../public/examples/operation-log/model.mjs';

void test('accepted and sent remain distinct from correlated applied proof', () => {
  assert.equal(
    analyzeOperationLog(METADATA, fixtures.acceptedOnly).result,
    'accepted',
  );
  assert.equal(
    analyzeOperationLog(METADATA, fixtures.success).result,
    'applied',
  );
  assert.equal(
    analyzeOperationLog(METADATA, fixtures.unknownResolved).result,
    'applied',
  );
  assert.equal(
    analyzeOperationLog(METADATA, [{ ...fixtures.acceptedOnly[1], seq: 1 }])
      .result,
    'accepted',
  );
});

void test('disconnect and same-value wrong-operation evidence remain unknown', () => {
  const disconnected = analyzeOperationLog(
    METADATA,
    fixtures.disconnectUnknown,
  );
  const wrongOperation = analyzeOperationLog(
    METADATA,
    fixtures.sameValueWrongOperation,
  );
  assert.deepEqual(
    [disconnected.result, disconnected.reason],
    ['unknown', 'disconnect_after_send'],
  );
  assert.equal(wrongOperation.result, 'unknown');
});

void test('explicit revision rejection needs a different nonnegative observed revision', () => {
  assert.equal(
    analyzeOperationLog(METADATA, fixtures.revisionConflict).result,
    'rejected',
  );
  for (const observedRevision of [42, -1]) {
    const events = fixtures.revisionConflict.map((event) => ({ ...event }));
    events[2].observedRevision = observedRevision;
    assert.deepEqual(analyzeOperationLog(METADATA, events), {
      result: 'invalid',
      reason: 'rejection_proof_invalid',
      valid: false,
      warnings: [],
    });
  }
});

void test('metadata contract ignores key order but rejects extra sensitive fields', () => {
  const reordered = Object.fromEntries(Object.entries(METADATA).reverse());
  assert.equal(
    analyzeOperationLog(reordered, fixtures.success).result,
    'applied',
  );
  assert.equal(
    analyzeOperationLog({ ...METADATA, token: 'do-not-log' }, fixtures.success)
      .reason,
    'metadata_contract_mismatch',
  );
});

void test('malformed proof, missing sequence, sensitive fields, and non-JSON events are invalid', () => {
  assert.equal(
    analyzeOperationLog(METADATA, fixtures.malformedMissingProof).result,
    'invalid',
  );
  assert.equal(
    analyzeOperationLog(METADATA, fixtures.missingSequence).result,
    'invalid',
  );
  const sensitive = fixtures.success.map((event) => ({ ...event }));
  sensitive[1].token = 'do-not-log';
  assert.equal(
    analyzeOperationLog(METADATA, sensitive).reason,
    'event_fields_invalid_or_sensitive',
  );
  const bigint = fixtures.success.map((event) => ({ ...event }));
  bigint[0].debug = 1n;
  assert.equal(
    analyzeOperationLog(METADATA, bigint).reason,
    'events_not_json_serializable',
  );
  const cyclic = fixtures.success.map((event) => ({ ...event }));
  cyclic[0].self = cyclic;
  assert.equal(
    analyzeOperationLog(METADATA, cyclic).reason,
    'events_not_json_serializable',
  );
});

void test('sequence controls causality while timestamp reversal becomes a warning', () => {
  const reversed = analyzeOperationLog(METADATA, fixtures.reversedServerTime);
  assert.equal(reversed.result, 'accepted');
  assert.deepEqual(reversed.warnings, ['server_time_reversed_at_seq_2']);
  assert.equal(
    analyzeOperationLog(METADATA, Array(MAX_EVENTS + 1).fill({})).result,
    'invalid',
  );
});

void test('downloaded self-test and demo pass', () => {
  const folder = 'public/examples/operation-log';
  assert.match(
    execFileSync(process.execPath, ['self-test.mjs'], {
      cwd: folder,
      encoding: 'utf8',
    }),
    /self-test: PASS/,
  );
  assert.match(
    execFileSync(process.execPath, ['demo.mjs'], {
      cwd: folder,
      encoding: 'utf8',
    }),
    /demo: PASS/,
  );
});

void test('wrong target and revision stay unknown; duplicate seq, terminal override and invalid time are invalid', () => {
  for (const change of [
    { equipment: 'EQ-B' },
    { tag: 'OTHER' },
    { value: 54 },
    { revisionBefore: 41 },
    { revisionAfter: 44 },
  ]) {
    const events = structuredClone(fixtures.success);
    Object.assign(events.at(-1), change);
    assert.equal(analyzeOperationLog(METADATA, events).result, 'unknown');
  }
  const duplicate = structuredClone(fixtures.success);
  duplicate[2].seq = 2;
  assert.equal(analyzeOperationLog(METADATA, duplicate).result, 'invalid');
  const terminal = [
    ...fixtures.success,
    { seq: 5, type: 'sent', serverTime: '2026-09-28T00:00:05.000Z' },
  ];
  assert.equal(
    analyzeOperationLog(METADATA, terminal).reason,
    'illegal_transition',
  );
  for (const serverTime of [
    '2026-02-30T00:00:00.000Z',
    '+010000-01-01T00:00:00.000Z',
    '2026-09-28T00:00:00Z',
  ]) {
    assert.equal(
      analyzeOperationLog(METADATA, [{ seq: 1, type: 'accepted', serverTime }])
        .reason,
      'server_time_invalid',
    );
  }
});
