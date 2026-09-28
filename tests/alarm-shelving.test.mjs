import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advance,
  initialShelving,
  restart,
  sample,
  timedShelve,
  unshelve,
  view,
} from '../public/examples/alarm-shelving/alarm-shelving.mjs';
import {
  clearGood,
  goodActive,
  shelve,
  unshelve as unshelveRequest,
} from '../public/examples/alarm-shelving/fixtures.mjs';

const action = (state) => state.lastDecision;

void test('expiry at its exact time is processed by advance and makes a still-active source visible', () => {
  let state = sample(initialShelving(), 0, goodActive(0));
  state = timedShelve(state, 0, shelve('R1', 10));
  assert.equal(view(state).alarmVisible, false);
  state = advance(state, 10);
  assert.equal(state.shelves[0].end, 'expired');
  assert.equal(view(state).shelved, false);
  assert.equal(view(state).alarmVisible, true);
  assert.equal(action(state), 'advance');
});

void test('source Clear does not manufacture Active, and bad or stale warnings stay visible while shelved', () => {
  let state = sample(initialShelving(), 0, goodActive(0));
  state = timedShelve(state, 1, shelve('R1', 30000));
  state = sample(state, 2, clearGood(2));
  assert.equal(view(state).active, false);
  assert.equal(view(state).shelved, true);
  state = advance(state, 30001);
  assert.equal(view(state).active, false);
  assert.equal(view(state).shelved, false);

  state = sample(initialShelving(), 0, goodActive(0));
  state = timedShelve(state, 1, shelve('R2', 30000));
  state = advance(state, 6002);
  assert.equal(view(state).shelved, true);
  assert.equal(view(state).qualityWarningVisible, true);
  state = sample(state, 6003, {
    epoch: 1,
    active: false,
    acked: true,
    quality: 'Bad',
    sourceAt: 6003,
  });
  assert.equal(view(state).shelved, true);
  assert.equal(view(state).active, true);
  assert.equal(view(state).qualityWarningVisible, true);
  state = advance(state, 6004);
  assert.equal(view(state).qualityWarningVisible, true);
});

void test('content-bound replay does not extend, altered content conflicts, and new shelving needs unshelve first', () => {
  let state = sample(initialShelving(), 1, goodActive(1));
  state = timedShelve(state, 2, shelve('R1', 20));
  const expiry = state.shelves[0].expiresAt;
  state = timedShelve(state, 3, shelve('R1', 20));
  assert.equal(action(state), 'shelve_replay');
  assert.equal(state.shelves[0].expiresAt, expiry);
  state = timedShelve(state, 4, shelve('R1', 21));
  assert.equal(action(state), 'shelve_request_conflict');
  state = timedShelve(state, 5, shelve('R2', 20));
  assert.equal(action(state), 'shelve_rejected_already_shelved');
  state = unshelve(state, 6, unshelveRequest());
  state = timedShelve(state, 7, shelve('R2', 20));
  assert.equal(action(state), 'shelved');
});

void test('restart is unknown unshelved and strict requests reject tail newlines, symbols and missing data', () => {
  let state = sample(initialShelving(), 1, goodActive(1));
  state = timedShelve(state, 2, shelve('R1', 20));
  state = restart(state, 3);
  assert.equal(state.shelves[0].end, 'restart');
  assert.equal(state.ledger.length, 1);
  assert.deepEqual(view(state), {
    epoch: 2,
    active: null,
    ackedSnapshot: null,
    quality: 'Unknown',
    fresh: false,
    shelved: false,
    alarmVisible: false,
    qualityWarningVisible: true,
    known: false,
    fault: null,
  });
  state = sample(state, 4, goodActive(4));
  assert.equal(action(state), 'sample_rejected_epoch');
  state = timedShelve(state, 5, shelve('R1', 20));
  assert.equal(action(state), 'shelve_historical_replay');
  state = sample(state, 6, goodActive(6, 2));
  state = sample(state, 7, goodActive(6, 2));
  assert.equal(action(state), 'sample_rejected_not_newer');
  const invalidId = timedShelve(
    state,
    8,
    shelve('R1\n', 10, 'OP17', 'check', 2),
  );
  assert.equal(action(invalidId), 'shelve_rejected_request');
  const symbol = shelve('R2', 10, 'OP17', 'check', 2);
  symbol[Symbol('extra')] = true;
  assert.equal(
    action(timedShelve(invalidId, 9, symbol)),
    'shelve_rejected_request',
  );
  assert.equal(
    action(
      sample(invalidId, 10, {
        epoch: 2,
        active: true,
        acked: false,
        quality: 'Good',
      }),
    ),
    'sample_rejected',
  );
});
void test('capacity fault freezes later mutations and log capacity never evicts records', () => {
  let state = initialShelving({ maxShelves: 1, maxLog: 16 });
  state = sample(state, 0, goodActive(0));
  state = timedShelve(state, 1, shelve('R1', 2));
  state = advance(state, 3);
  state = timedShelve(state, 4, shelve('R2', 2));
  assert.equal(state.fault, 'shelf_capacity');
  assert.equal(state.known, false);
  const frozenShelves = state.shelves;
  state = sample(state, 5, goodActive(5));
  assert.equal(action(state), 'fault_blocked');
  assert.deepEqual(state.shelves, frozenShelves);

  state = sample(initialShelving({ maxLog: 2 }), 0, goodActive(0));
  const logs = state.log;
  state = advance(state, 1);
  assert.equal(state.fault, 'log_capacity');
  assert.equal(state.known, false);
  assert.deepEqual(state.log, logs);
});
