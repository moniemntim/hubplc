import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import {
  enq,
  evt,
  five,
  wrap,
} from '../public/examples/product-fifo/fixtures.mjs';
import {
  activeProducts,
  fifoScan,
  initialFifo,
} from '../public/examples/product-fifo/product-fifo-model.mjs';

void test('five products finish once, P03 skips S1, and replay does not add count', () => {
  let state = initialFifo();
  for (const input of five) state = fifoScan(state, input);
  assert.deepEqual(
    [state.count, state.completed, state.event],
    [0, 5, 'station_duplicate'],
  );
});
void test('full same-scan enqueue rejects before dequeue and P06 wraps later', () => {
  let state = initialFifo();
  for (const input of wrap.slice(0, 7)) state = fifoScan(state, input);
  assert.deepEqual(state.events, ['enqueue_rejected_full', 'dequeued_P01']);
  state = fifoScan(state, wrap[7]);
  assert.deepEqual(
    [
      state.head,
      state.tail,
      state.count,
      activeProducts(state).map((p) => p.productId),
    ],
    [1, 1, 5, ['P02', 'P03', 'P04', 'P05', 'P06']],
  );
});
void test('wrong product, station, order, and conflicting event ID do not update head', () => {
  let state = fifoScan(initialFifo(), enq('P01'));
  const before = structuredClone(state);
  for (const input of [
    evt('E3-1', 'P02', 'S1', 'COMPLETE'),
    evt('E3-2', 'P01', 'S2', 'COMPLETE'),
    evt('E3-3', 'P01', 'S2', 'SKIP'),
  ]) {
    state = fifoScan(state, input);
    assert.deepEqual(
      [state.head, state.tail, state.count, state.slots],
      [before.head, before.tail, before.count, before.slots],
    );
  }
  state = fifoScan(state, evt('E3-4', 'P01', 'S1', 'COMPLETE'));
  const after = structuredClone(state);
  state = fifoScan(state, evt('E3-4', 'P01', 'S1', 'SKIP'));
  assert.equal(state.event, 'station_conflict_event_id_payload');
  assert.deepEqual(state.slots, after.slots);
});
void test('bounded event/product records explicitly reject new IDs and IDs are not reused', () => {
  let state = fifoScan(
    initialFifo({ maxEventRecords: 1, maxProductRecords: 1 }),
    enq('P01'),
  );
  state = fifoScan(state, evt('E4-1', 'P01', 'S1', 'COMPLETE'));
  state = fifoScan(state, evt('E4-2', 'P01', 'S2', 'COMPLETE'));
  assert.equal(state.event, 'station_rejected_event_record_capacity');
  state = fifoScan(state, enq('P02'));
  assert.equal(state.event, 'enqueue_rejected_product_id_record_capacity');
  state = fifoScan(state, enq('P01'));
  assert.equal(state.event, 'enqueue_rejected_product_id_reused');
});
void test('downloaded self-test and demo pass', () => {
  const cwd = 'public/examples/product-fifo';
  assert.match(
    execFileSync(process.execPath, ['self-test.mjs'], {
      cwd,
      encoding: 'utf8',
    }),
    /self-test: PASS/,
  );
  assert.match(
    execFileSync(process.execPath, ['demo.mjs'], { cwd, encoding: 'utf8' }),
    /demo: PASS/,
  );
});
void test('valid wrong-order and empty events consume IDs; controls and nonstring IDs reject', () => {
  let state = fifoScan(initialFifo(), enq('P01'));
  state = fifoScan(state, evt('E5-1', 'P01', 'S2', 'COMPLETE'));
  assert.equal(state.event, 'station_rejected_station_or_order');
  state = fifoScan(state, evt('E5-1', 'P01', 'S2', 'COMPLETE'));
  assert.equal(state.event, 'station_duplicate');
  state = fifoScan(state, evt('E5-2', 'P01', 'S1', 'COMPLETE'));
  assert.equal(state.event, 's1_complete_P01');
  state = fifoScan(initialFifo(), evt('E5-3', 'P01', 'S1', 'COMPLETE'));
  state = fifoScan(state, evt('E5-3', 'P01', 'S1', 'COMPLETE'));
  assert.equal(state.event, 'station_duplicate');
  state = fifoScan(initialFifo(), {
    enqueue: { productId: 'P\n01' },
    stationEvent: null,
  });
  assert.equal(state.event, 'enqueue_rejected_product_id_invalid');
  state = fifoScan(initialFifo(), {
    enqueue: null,
    stationEvent: {
      eventId: 5,
      productId: 'P01',
      station: 'S1',
      action: 'COMPLETE',
    },
  });
  assert.equal(state.event, 'station_rejected_event_shape_or_id');
  state = fifoScan(initialFifo(), {
    enqueue: null,
    stationEvent: {
      eventId: 'E1-1\n',
      productId: 'P01',
      station: 'S1',
      action: 'COMPLETE',
    },
  });
  assert.equal(state.event, 'station_rejected_event_shape_or_id');
});
