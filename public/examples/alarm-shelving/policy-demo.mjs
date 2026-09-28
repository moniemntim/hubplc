import assert from 'node:assert/strict';
import {
  initialShelving,
  restart,
  sample,
  timedShelve,
  view,
} from './alarm-shelving.mjs';
import { goodActive, shelve } from './fixtures.mjs';

let state = sample(initialShelving(), 1, goodActive(1));
state = timedShelve(state, 2, shelve('R1', 20));
const expiry = state.shelves[0].expiresAt;
state = timedShelve(state, 3, shelve('R1', 20));
console.log(
  `replay=${state.lastDecision} expiry=${state.shelves[0].expiresAt}`,
);
assert.equal(state.shelves[0].expiresAt, expiry);
state = sample(state, 4, {
  epoch: 1,
  active: true,
  acked: false,
  quality: 'Bad',
  sourceAt: 4,
});
console.log(
  `bad quality shelved=${view(state).shelved} qualityWarning=${view(state).qualityWarningVisible}`,
);
assert.equal(view(state).qualityWarningVisible, true);
state = restart(state, 5);
console.log(
  `restart epoch=${state.epoch} shelved=${view(state).shelved} known=${view(state).known}`,
);
assert.equal(view(state).shelved, false);
assert.equal(view(state).known, false);
console.log('policy demo: PASS');
