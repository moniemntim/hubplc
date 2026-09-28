import assert from 'node:assert/strict';
import test from 'node:test';
import {
  acknowledge,
  initialLifecycle,
  sourceCondition,
  workflow,
} from '../public/examples/alarm-lifecycle/alarm-lifecycle.mjs';
import { ack } from '../public/examples/alarm-lifecycle/fixtures.mjs';

const lastAction = (state) => state.log.at(-1).action;

void test('clear retains an unacknowledged occurrence and a later edge creates a separate occurrence', () => {
  let state = sourceCondition(initialLifecycle(), 1, true);
  state = sourceCondition(state, 2, false);
  assert.equal(state.occurrences[0].active, false);
  assert.equal(state.occurrences[0].acked, false);
  assert.equal(state.occurrences[0].clearedAt, 2);
  state = sourceCondition(state, 3, true);
  assert.equal(state.currentId, 'O2');
  state = acknowledge(state, 4, ack('O1', 2, 'old-ack'));
  assert.equal(state.occurrences[0].acked, true);
  assert.equal(state.occurrences[1].acked, false);
  assert.equal(state.occurrences[0].ackActor, 'Operator');
  assert.equal(state.occurrences[0].ackAt, 4);
});

void test('successful acknowledgement replays exact content and stale revisions do not overwrite', () => {
  let state = sourceCondition(initialLifecycle(), 1, true);
  state = acknowledge(state, 2, ack('O1', 1, 'R1', 'Operator', 'checking'));
  assert.equal(state.occurrences[0].revision, 2);
  assert.equal(state.ledger.length, 1);
  state = acknowledge(state, 3, ack('O1', 1, 'R1', 'Operator', 'checking'));
  assert.equal(lastAction(state), 'ack_replay');
  assert.equal(state.occurrences[0].revision, 2);
  state = acknowledge(state, 4, ack('O1', 1, 'R1', 'Operator', 'different'));
  assert.equal(lastAction(state), 'ack_request_conflict');
  state = acknowledge(state, 5, ack('O1', 1, 'R2'));
  assert.equal(lastAction(state), 'ack_revision_conflict');
  assert.equal(state.occurrences[0].revision, 2);
  assert.equal(state.ledger.length, 1);
});

void test('workflow requires the current revision, Clear, Ack, Supervisor and evidence', () => {
  let state = sourceCondition(initialLifecycle(), 1, true);
  state = acknowledge(state, 2, ack('O1', 1, 'R1'));
  state = workflow(state, 3, {
    occurrenceId: 'O1',
    expectedRevision: 2,
    actor: 'Operator',
    action: 'start',
  });
  assert.equal(state.occurrences[0].work, 'InProgress');
  state = workflow(state, 4, {
    occurrenceId: 'O1',
    expectedRevision: 3,
    actor: 'Supervisor',
    action: 'resolve',
    evidence: 'checked',
  });
  assert.equal(lastAction(state), 'workflow_rejected_transition');
  state = sourceCondition(state, 5, false);
  state = workflow(state, 6, {
    occurrenceId: 'O1',
    expectedRevision: 4,
    actor: 'Operator',
    action: 'resolve',
    evidence: 'checked',
  });
  assert.equal(lastAction(state), 'workflow_rejected_request');
  state = workflow(state, 7, {
    occurrenceId: 'O1',
    expectedRevision: 3,
    actor: 'Supervisor',
    action: 'resolve',
    evidence: 'checked',
  });
  assert.equal(lastAction(state), 'workflow_revision_conflict');
  state = workflow(state, 8, {
    occurrenceId: 'O1',
    expectedRevision: 4,
    actor: 'Supervisor',
    action: 'resolve',
    evidence: 'checked',
  });
  assert.equal(state.occurrences[0].work, 'Resolved');
  assert.equal(state.occurrences[0].revision, 5);
});

void test('explicit caps fault or reject without silent eviction, and log cap retains state', () => {
  let state = initialLifecycle({ maxOccurrences: 1, maxLedger: 1, maxLog: 16 });
  state = sourceCondition(state, 1, true);
  state = sourceCondition(state, 2, false);
  state = sourceCondition(state, 3, true);
  assert.equal(lastAction(state), 'occurrence_capacity_fault');
  assert.equal(state.fault, 'occurrence_capacity');
  const faulted = state;
  state = sourceCondition(state, 4, false);
  assert.equal(state.lastDecision, 'fault_blocked');
  assert.deepEqual(state.occurrences, faulted.occurrences);
  state = acknowledge(state, 5, ack('O1', 2, 'blocked'));
  assert.equal(state.lastDecision, 'fault_blocked');

  state = initialLifecycle({ maxOccurrences: 2, maxLedger: 1, maxLog: 16 });
  state = acknowledge(sourceCondition(state, 1, true), 2, ack('O1', 1, 'R1'));
  state = sourceCondition(state, 3, false);
  state = sourceCondition(state, 4, true);
  state = acknowledge(state, 5, ack('O2', 1, 'R2'));
  assert.equal(lastAction(state), 'ack_ledger_capacity_rejected');
  assert.equal(state.ledger.length, 1);

  state = sourceCondition(initialLifecycle({ maxLog: 1 }), 1, true);
  const fullLog = state;
  state = acknowledge(state, 2, ack('O1', 1, 'R1'));
  assert.equal(state.lastDecision, 'log_capacity_fault');
  assert.equal(state.known, false);
  assert.equal(state.fault, 'log_capacity');
  assert.deepEqual(state.occurrences, fullLog.occurrences);
  assert.deepEqual(state.ledger, fullLog.ledger);
  assert.deepEqual(state.log, fullLog.log);
  assert.equal(state.occurrences[0].acked, false);
});

void test('requests have exact plain fields and bounded text rather than coercion', () => {
  const state = sourceCondition(initialLifecycle(), 1, true);
  const invalid = { ...ack('O1', 1, 'R1'), comment: 'ok', extra: true };
  const rejected = acknowledge(state, 2, invalid);
  assert.equal(lastAction(rejected), 'ack_rejected_request');
  assert.equal(rejected.occurrences[0].acked, false);
  assert.equal(
    lastAction(acknowledge(rejected, 3, { ...ack('O1', 1, '') })),
    'ack_rejected_request',
  );
  assert.equal(
    lastAction(acknowledge(rejected, 4, ack('O1\n', 1, 'R2'))),
    'ack_rejected_request',
  );
  assert.equal(
    lastAction(acknowledge(rejected, 5, ack('O1', 1, 'R2\n'))),
    'ack_rejected_request',
  );
  const withSymbol = { ...ack('O1', 1, 'R3') };
  withSymbol[Symbol('extra')] = true;
  assert.equal(
    lastAction(acknowledge(rejected, 6, withSymbol)),
    'ack_rejected_request',
  );
  const withHidden = { ...ack('O1', 1, 'R4') };
  Object.defineProperty(withHidden, 'hidden', { value: true });
  assert.equal(
    lastAction(acknowledge(rejected, 7, withHidden)),
    'ack_rejected_request',
  );
});

void test('missing requests reject without coercion or crashing; resolution still needs Ack and evidence', () => {
  const active = sourceCondition(initialLifecycle(), 1, true);
  for (const request of [undefined, null, 3, [], {}]) {
    assert.equal(
      acknowledge(active, 2, request).lastDecision,
      'ack_rejected_request',
    );
    assert.equal(
      workflow(active, 2, request).lastDecision,
      'workflow_rejected_request',
    );
  }
  let state = workflow(active, 2, {
    occurrenceId: 'O1',
    expectedRevision: 1,
    actor: 'Operator',
    action: 'start',
  });
  state = sourceCondition(state, 3, false);
  const request = {
    occurrenceId: 'O1',
    expectedRevision: 3,
    actor: 'Supervisor',
    action: 'resolve',
    evidence: 'checked',
  };
  assert.equal(
    workflow(state, 4, request).lastDecision,
    'workflow_rejected_transition',
  );
  state = acknowledge(state, 4, ack('O1', 3, 'R1'));
  assert.equal(
    workflow(state, 5, { ...request, expectedRevision: 4, evidence: ' ' })
      .lastDecision,
    'workflow_rejected_request',
  );
  assert.equal(
    workflow(state, 5, { ...request, expectedRevision: 4 }).occurrences[0].work,
    'Resolved',
  );
  assert.throws(() => sourceCondition(active, 0, false), /time invalid/);
});
