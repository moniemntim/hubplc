import assert from 'node:assert/strict';
import {
  advance,
  initialShelving,
  sample,
  timedShelve,
  view,
} from './alarm-shelving.mjs';
import { clearGood, goodActive, shelve } from './fixtures.mjs';

const row = (state, time) => {
  const current = view(state);
  console.log(
    `t=${time} active=${current.active} shelved=${current.shelved} alarmVisible=${current.alarmVisible} qualityWarning=${current.qualityWarningVisible}`,
  );
};
let state = sample(initialShelving(), 0, goodActive(0));
row(state, 0);
state = timedShelve(state, 0, shelve('R1', 10));
row(state, 0);
state = advance(state, 10);
row(state, 10);
assert.equal(view(state).alarmVisible, true);
state = sample(state, 12, clearGood(12));
row(state, 12);
assert.equal(view(state).active, false);
console.log('demo: PASS');
