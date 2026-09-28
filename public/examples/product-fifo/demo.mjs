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
console.log('five-products count=0 completed=5 replay=station_duplicate');
state = initialFifo();
for (const input of wrap) state = fifoScan(state, input);
const order = activeProducts(state)
  .map((p) => p.productId)
  .join(',');
assert.deepEqual(
  [state.head, state.tail, state.count, order],
  [1, 1, 5, 'P02,P03,P04,P05,P06'],
);
console.log(
  `wrap head=${state.head} tail=${state.tail} count=${state.count} order=${order}`,
);
console.log('demo: PASS');
