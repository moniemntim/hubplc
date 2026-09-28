import {
  initialShelving,
  sample,
  timedShelve,
  view,
} from './alarm-shelving.mjs';
import { goodActive, shelve } from './fixtures.mjs';

let state = sample(initialShelving(), 100, goodActive(100));
state = timedShelve(
  state,
  100,
  shelve('P1', 30000, 'OP17', 'planned inspection'),
);
console.log(
  JSON.stringify({ expiry: state.shelves[0].expiresAt, view: view(state) }),
);
console.log('practice: PASS');
