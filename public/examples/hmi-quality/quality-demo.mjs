import assert from 'node:assert/strict';
import { advance, initialProjection, receive, view } from './model.mjs';
import { sample } from './fixtures.mjs';

const print = (state, prefix) => {
  const current = view(state);
  console.log(
    `${prefix} state=${current.dataState} value=${current.value} acquired=${current.lastGoodAcquiredAt} sourceChange=${current.lastSourceChangeAt} received=${current.lastReceivedAt} trend=${current.trendPoint}`,
  );
};
let state = receive(
  initialProjection(),
  0,
  sample({ seq: 1, value: 0, acquiredAt: 0, sourceChangedAt: 0 }),
);
print(state, 't=0');
state = receive(
  state,
  500,
  sample({
    seq: 2,
    value: 999,
    quality: 'Bad',
    acquiredAt: 500,
    receivedAt: 500,
    sourceChangedAt: 500,
  }),
);
print(state, 't=500');
assert.equal(view(state).value, 0);
state = receive(
  state,
  2500,
  sample({ seq: 3, value: 0, acquiredAt: 2500, sourceChangedAt: 0 }),
);
print(state, 't=2500');
state = advance(state, 4500);
print(state, 't=4500');
assert.equal(view(state).dataState, 'STALE');
assert.deepEqual(
  state.trend.map((point) => point.value),
  [0, null, 0, null],
);
console.log('quality demo: PASS');
