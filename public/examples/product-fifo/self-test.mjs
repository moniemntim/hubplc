import assert from 'node:assert/strict';
import { five, wrap } from './fixtures.mjs';
import {
  activeProducts,
  fifoScan,
  initialFifo,
} from './product-fifo-model.mjs';
let state = initialFifo();
for (const input of five) state = fifoScan(state, input);
assert.deepEqual(
  [state.count, state.completed, state.event],
  [0, 5, 'station_duplicate'],
);
state = initialFifo();
for (const input of wrap) state = fifoScan(state, input);
assert.deepEqual(
  [
    state.head,
    state.tail,
    state.count,
    activeProducts(state).map((p) => p.productId),
  ],
  [1, 1, 5, ['P02', 'P03', 'P04', 'P05', 'P06']],
);
console.log('self-test: PASS');
