import assert from 'node:assert/strict';
import {
  disconnect,
  initialProjection,
  receive,
  reconnect,
  view,
} from './model.mjs';
import { sample } from './fixtures.mjs';

let state = receive(
  initialProjection(),
  0,
  sample({ seq: 1, value: 62, acquiredAt: 0, sourceChangedAt: 0 }),
);
state = receive(
  state,
  100,
  sample({ seq: 2, value: 62, acquiredAt: 100, sourceChangedAt: 0 }),
);
console.log(
  `t=100 acquired=${view(state).lastGoodAcquiredAt} sourceChange=${view(state).lastSourceChangeAt}`,
);
state = disconnect(state, 500);
console.log(`t=500 state=${view(state).dataState} value=${view(state).value}`);
state = reconnect(state, 1000);
console.log(`t=1000 epoch=${view(state).epoch} state=${view(state).dataState}`);
state = receive(
  state,
  1001,
  sample({
    epoch: 1,
    seq: 3,
    value: 62,
    acquiredAt: 100,
    receivedAt: 1001,
    sourceChangedAt: 0,
  }),
);
console.log(`old-epoch=${state.lastDecision} pending=${view(state).pending}`);
state = receive(
  state,
  1002,
  sample({
    epoch: 2,
    seq: 1,
    value: 62,
    acquiredAt: 100,
    receivedAt: 1002,
    sourceChangedAt: 0,
  }),
);
console.log(`old-cache=${state.lastDecision} pending=${view(state).pending}`);
state = receive(
  state,
  1003,
  sample({
    epoch: 2,
    seq: 1,
    value: 64,
    acquiredAt: 1003,
    sourceChangedAt: 1003,
  }),
);
assert.equal(view(state).dataState, 'FRESH');
console.log(
  `new-acquisition=${state.lastDecision} state=${view(state).dataState} value=${view(state).value}`,
);
console.log('connection demo: PASS');
