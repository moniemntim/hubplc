import assert from 'node:assert/strict';
import { fifoScan, initialFifo } from './product-fifo-model.mjs';

// Change these inputs, rerun, and compare each printed state.
const practiceSteps = [
  { enqueue: { productId: 'P01' }, stationEvent: null },
  {
    enqueue: null,
    stationEvent: {
      eventId: 'E9-1',
      productId: 'P01',
      station: 'S1',
      action: 'SKIP',
    },
  },
  {
    enqueue: null,
    stationEvent: {
      eventId: 'E9-2',
      productId: 'P01',
      station: 'S2',
      action: 'COMPLETE',
    },
  },
];
let state = initialFifo();
for (const [index, input] of practiceSteps.entries()) {
  state = fifoScan(state, input);
  const head = state.count ? state.slots[state.head] : null;
  console.log(
    `scan=${index + 1} head=${state.head} tail=${state.tail} count=${state.count} head_status=${head ? `${head.productId}/${head.status}` : '-'} event=${state.event}`,
  );
}
assert.deepEqual([state.count, state.completed], [0, 1]);
console.log('practice: PASS');
