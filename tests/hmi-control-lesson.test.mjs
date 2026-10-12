import assert from 'node:assert/strict';
import test from 'node:test';
import {
  authorizationCase,
  downgradeCase,
  maintenanceExitCase,
  manualModeCase,
} from '../lib/hmi-control-lesson.ts';

void test('manual request keeps Auto until valid conditions before the deadline', () => {
  assert.deepEqual(manualModeCase('4999', true), {
    status: 'CONFIRMED',
    reason: 'CONDITIONS_MET',
    mode: 'Manual',
    owner: 'HMI-A',
    revision: 2,
  });
  assert.equal(manualModeCase('5000', true).reason, 'TIMEOUT');
  assert.equal(manualModeCase('4999', false).reason, 'INTERLOCK_DENIED');
  assert.equal(manualModeCase('5000', false).reason, 'TIMEOUT');
  assert.throws(() => manualModeCase('-1', true));
});

void test('maintenance exit requires separate stop and restore summaries', () => {
  assert.equal(maintenanceExitCase(false, true).reason, 'WAIT_TEST_STOPPED');
  assert.equal(maintenanceExitCase(true, false).reason, 'WAIT_RESTORE_REVIEW');
  assert.deepEqual(maintenanceExitCase(true, true), {
    status: 'CONFIRMED',
    reason: 'CONDITIONS_MET',
    mode: 'Manual',
    revision: 4,
  });
});

void test('authorization refuses stale, wrong-role, wrong-target, invalid value and expiry', () => {
  const base = {
    session: 'S',
    value: '95',
    target: 'A',
    at: '0',
    expectedRevision: '1',
  };
  assert.deepEqual(authorizationCase(base), {
    submit: 'QUEUED',
    execute: 'APPLIED',
    value: 95,
    revision: 2,
    writes: 1,
  });
  for (const [change, expected] of [
    [{ session: 'O' }, 'ROLE_DENIED'],
    [{ target: 'B' }, 'RESOURCE_DENIED'],
    [{ value: '150' }, 'RANGE_DENIED'],
    [{ expectedRevision: '2' }, 'REVISION_CONFLICT'],
    [{ at: '600000' }, 'SESSION_EXPIRED_OR_UNKNOWN'],
  ]) {
    const result = authorizationCase({ ...base, ...change });
    assert.equal(result.submit, expected);
    assert.equal(result.writes, 0);
  }
  assert.throws(() => authorizationCase({ ...base, value: '95.5' }));
});

void test('queued operation stays unwritten through downgrade or restoration', () => {
  assert.equal(downgradeCase(false).dispatch, 'ROLE_DENIED');
  assert.equal(downgradeCase(true).dispatch, 'AUTHORIZATION_CHANGED');
  assert.equal(downgradeCase(true).writes, 0);
});
