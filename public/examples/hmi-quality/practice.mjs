import { initialProjection, receive, view } from './model.mjs';
import { sample } from './fixtures.mjs';

let state = receive(
  initialProjection(),
  100,
  sample({ seq: 1, value: 0, acquiredAt: 100, sourceChangedAt: null }),
);
state = receive(
  state,
  101,
  sample({
    seq: 2,
    value: 7,
    acquiredAt: 101,
    receivedAt: 101,
    sourceChangedAt: null,
  }),
);
console.log(
  JSON.stringify({ decision: state.lastDecision, view: view(state) }),
);
console.log('practice: PASS');
