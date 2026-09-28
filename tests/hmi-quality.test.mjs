import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import {
  advance,
  disconnect,
  initialProjection,
  receive,
  reconnect,
  view,
} from '../public/examples/hmi-quality/model.mjs';
import { sample } from '../public/examples/hmi-quality/fixtures.mjs';

void test('downloadable self-test executes', () => {
  assert.match(
    execFileSync(
      process.execPath,
      ['public/examples/hmi-quality/self-test.mjs'],
      { encoding: 'utf8' },
    ),
    /self-test: PASS/,
  );
});

void test('Bad never overwrites last Good, valid zero remains a value, and trend uses gaps', () => {
  let state = receive(
    initialProjection(),
    0,
    sample({ seq: 1, value: 0, acquiredAt: 0, sourceChangedAt: 0 }),
  );
  state = receive(
    state,
    100,
    sample({
      seq: 2,
      value: 999,
      quality: 'Bad',
      acquiredAt: 100,
      sourceChangedAt: 100,
    }),
  );
  assert.deepEqual(
    [
      view(state).value,
      view(state).lastGoodAcquiredAt,
      view(state).lastReceivedAt,
      view(state).dataState,
    ],
    [0, 0, 100, 'BAD_LAST_GOOD'],
  );
  assert.equal(state.trend.at(-1).value, null);
  state = receive(
    state,
    200,
    sample({ seq: 3, value: 0, acquiredAt: 200, sourceChangedAt: 200 }),
  );
  assert.deepEqual(
    [
      view(state).value,
      view(state).lastGoodAcquiredAt,
      view(state).lastSourceChangeAt,
    ],
    [0, 200, 200],
  );
  state = receive(
    state,
    300,
    sample({
      seq: 4,
      value: null,
      quality: 'Bad',
      acquiredAt: 150,
      receivedAt: 150,
      sourceChangedAt: null,
    }),
  );
  assert.deepEqual(
    [
      state.lastDecision,
      view(state).rawQuality,
      view(state).lastReceivedAt,
      view(state).lastGoodAcquiredAt,
    ],
    ['sample_rejected_not_newer', 'Good', 200, 200],
  );
});

void test('freshness uses last Good acquisition and turns stale exactly at 2000 ms', () => {
  let state = receive(
    initialProjection(),
    0,
    sample({ seq: 1, value: 5, acquiredAt: 0, sourceChangedAt: null }),
  );
  state = receive(
    state,
    100,
    sample({ seq: 2, value: 5, acquiredAt: 100, sourceChangedAt: 0 }),
  );
  assert.equal(view(state).lastSourceChangeAt, 0);
  state = advance(state, 2099);
  assert.equal(view(state).dataState, 'FRESH');
  state = advance(state, 2100);
  assert.equal(view(state).dataState, 'STALE');
});

void test('source change is a declared source field, not an HMI value comparison', () => {
  let state = receive(
    initialProjection(),
    0,
    sample({ seq: 1, value: 8, acquiredAt: 0, sourceChangedAt: 0 }),
  );
  state = receive(
    state,
    10,
    sample({ seq: 2, value: 8, acquiredAt: 10, sourceChangedAt: 9 }),
  );
  assert.equal(view(state).lastSourceChangeAt, 9);
  state = receive(
    state,
    20,
    sample({ seq: 3, value: 8, acquiredAt: 20, sourceChangedAt: null }),
  );
  assert.equal(view(state).lastSourceChangeAt, null);
});

void test('a stale Good does not clear pending and writes a trend gap', () => {
  let state = receive(
    initialProjection(),
    0,
    sample({ seq: 1, value: 1, acquiredAt: 0, sourceChangedAt: 0 }),
  );
  state = disconnect(state, 10);
  state = reconnect(state, 20);
  state = receive(
    state,
    2021,
    sample({
      epoch: 2,
      seq: 1,
      value: 2,
      acquiredAt: 21,
      receivedAt: 2021,
      sourceChangedAt: null,
    }),
  );
  assert.deepEqual(
    [view(state).pending, view(state).dataState, state.trend.at(-1).value],
    [true, 'PENDING_CURRENT_EPOCH', null],
  );
});

void test('reconnect remains pending through old epoch and old cached acquisition until new epoch data arrives', () => {
  let state = receive(
    initialProjection(),
    0,
    sample({ seq: 1, value: 62, acquiredAt: 0, sourceChangedAt: 0 }),
  );
  state = disconnect(state, 50);
  state = reconnect(state, 100);
  state = receive(
    state,
    101,
    sample({
      epoch: 1,
      seq: 2,
      value: 62,
      acquiredAt: 50,
      receivedAt: 101,
      sourceChangedAt: 0,
    }),
  );
  assert.equal(view(state).dataState, 'PENDING_CURRENT_EPOCH');
  state = receive(
    state,
    102,
    sample({
      epoch: 2,
      seq: 1,
      value: 62,
      acquiredAt: 50,
      receivedAt: 102,
      sourceChangedAt: 0,
    }),
  );
  assert.equal(state.lastDecision, 'sample_rejected_old_cache');
  assert.equal(view(state).pending, true);
  assert.deepEqual(
    [
      state.expectedSeq,
      state.lastAcceptedAcquiredAt,
      state.lastAcceptedReceivedAt,
    ],
    [1, null, null],
  );
  state = receive(
    state,
    103,
    sample({
      epoch: 2,
      seq: 1,
      value: 64,
      acquiredAt: 103,
      sourceChangedAt: 103,
    }),
  );
  assert.deepEqual(
    [view(state).pending, view(state).dataState, view(state).value],
    [false, 'FRESH', 64],
  );
});

void test('source change cannot be later than acquisition', () => {
  const state = receive(
    initialProjection(),
    10,
    sample({ seq: 1, value: 2, acquiredAt: 10, sourceChangedAt: 11 }),
  );
  assert.deepEqual(
    [state.lastDecision, state.expectedSeq, state.lastGood],
    ['sample_rejected_shape', 1, null],
  );
});

void test('strict shape, old sequence, and bounded histories fail visibly without unbounded records', () => {
  let state = initialProjection({ maxEvents: 2, maxHistory: 2 });
  state = receive(
    state,
    0,
    sample({ seq: 1, value: 1, acquiredAt: 0, sourceChangedAt: 0 }),
  );
  state = receive(state, 1, {
    epoch: 1,
    seq: 2,
    value: 1,
    quality: 'Good',
    acquiredAt: 1,
    receivedAt: 1,
  });
  assert.equal(state.lastDecision, 'sample_rejected_shape');
  const events = state.events;
  state = advance(state, 2);
  assert.deepEqual(
    [state.fault, state.known, state.lastDecision],
    ['history_capacity', false, 'history_capacity'],
  );
  assert.deepEqual(state.events, events);
  state = receive(
    state,
    3,
    sample({ seq: 3, value: 2, acquiredAt: 3, sourceChangedAt: 3 }),
  );
  assert.equal(state.lastDecision, 'fault_blocked');
  assert.equal(state.fault, 'history_capacity');
});
