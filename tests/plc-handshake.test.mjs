import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initialReceiver,
  receiverScan,
} from '../public/examples/plc-handshake/handshake-model.mjs';
import {
  handshakeFixtures,
  runFixture,
} from '../public/examples/plc-handshake/fixtures.mjs';

void test('normal delayed consumer holds Accept, then Done, until the matching acknowledgement', () => {
  const rows = runFixture(handshakeFixtures.normalDelayedConsumer);
  assert.deepEqual(
    rows.map((row) => row.state.mode),
    ['BUSY', 'BUSY', 'RESULT', 'RESULT', 'IDLE'],
  );
  assert.equal(rows[0].signals.accept, true);
  assert.equal(rows[1].signals.accept, false);
  assert.equal(rows[2].signals.done, true);
  assert.equal(rows[2].signals.fail, false);
  assert.equal(rows[3].signals.resultId, 17);
  assert.equal(rows.at(-1).signals.resultId, null);
});

void test('the accepted payload is a snapshot and Busy retains a new-ID rejection without overwriting it', () => {
  const payload = { recipe: 'A', nested: { quantity: 4 } };
  let state = initialReceiver();
  ({ state } = receiverScan(state, {
    nowMs: 0,
    sender: { req: true, requestId: 17, payload },
  }));
  payload.nested.quantity = 99;
  const firstSnapshot = state.current.payload;
  ({ state } = receiverScan(state, { nowMs: 1, sender: {} }));
  const busy = receiverScan(state, {
    nowMs: 2,
    sender: { req: true, requestId: 18, payload: { recipe: 'B' } },
  });
  assert.deepEqual(firstSnapshot, { recipe: 'A', nested: { quantity: 4 } });
  assert.deepEqual(busy.state.current.payload, firstSnapshot);
  assert.equal(busy.signals.rejectId, 18);
  assert.equal(busy.signals.rejectReason, 'BUSY');
  const held = receiverScan(busy.state, {
    nowMs: 3,
    sender: { req: true, requestId: 18, payload: { recipe: 'changed' } },
  });
  assert.deepEqual(held.state.scanEvents, []);
  assert.equal(held.signals.rejectId, 18);
  assert.deepEqual(held.state.current.payload, firstSnapshot);
  const released = receiverScan(held.state, { nowMs: 4, sender: {} });
  assert.equal(released.signals.rejectId, null);
});

void test('a wrong ResultAck cannot clear a held result', () => {
  const rows = runFixture(handshakeFixtures.wrongAck);
  assert.equal(rows[3].state.mode, 'RESULT');
  assert.equal(rows[3].signals.done, true);
  assert.deepEqual(rows[3].state.scanEvents, [
    { code: 'WRONG_RESULT_ACK', resultAckId: 18, expectedRequestId: 17 },
  ]);
  assert.equal(rows[4].state.mode, 'IDLE');
});

void test('Req release and a strictly increasing ID are required before another acceptance', () => {
  const rows = runFixture(handshakeFixtures.sameIdHold);
  assert.deepEqual(rows[1].state.scanEvents, []);
  assert.equal(rows.at(-1).state.mode, 'IDLE');
  assert.deepEqual(rows.at(-1).state.scanEvents, [
    { code: 'STALE_REQUEST_ID', requestId: 17 },
  ]);

  const busyRows = runFixture(handshakeFixtures.busyNewId);
  assert.deepEqual(busyRows[2].state.scanEvents, [
    { code: 'BUSY_REJECT', requestId: 18 },
  ]);
  assert.equal(busyRows[3].signals.rejectId, 18);
  assert.equal(busyRows[4].signals.rejectId, null);
  assert.equal(busyRows.at(-1).state.current.requestId, 19);
  assert.deepEqual(busyRows.at(-1).state.current.payload, {
    recipe: 'C',
    quantity: 2,
  });
});

void test('the 200 ms timeout wins a worker success sampled in the same Receiver call', () => {
  const rows = runFixture(handshakeFixtures.timeoutWinsSuccess);
  assert.equal(rows[2].state.mode, 'RESULT');
  assert.equal(rows[2].signals.done, false);
  assert.equal(rows[2].signals.fail, true);
  assert.equal(rows[2].signals.resultId, 17);
  assert.equal(rows[2].signals.resultReason, 'TIMEOUT');
  assert.deepEqual(rows[2].state.scanEvents, [
    { code: 'TIMEOUT', requestId: 17 },
  ]);
  assert.equal(rows[3].state.mode, 'RESULT');
  assert.equal(rows.at(-1).state.mode, 'IDLE');
});

void test('Accept survives early completion until Req is released, and premature ResultAck cannot clear it', () => {
  const rows = runFixture(handshakeFixtures.earlyCompleteSlowSender);
  assert.deepEqual(
    rows.map((row) => row.state.mode),
    ['BUSY', 'RESULT', 'RESULT', 'RESULT', 'IDLE'],
  );
  assert.equal(rows[1].signals.accept, true);
  assert.equal(rows[1].signals.busy, false);
  assert.equal(rows[1].signals.done, true);
  assert.equal(rows[2].signals.accept, true);
  assert.deepEqual(rows[2].state.scanEvents, [
    { code: 'RESULT_ACK_BEFORE_REQ_RELEASE', resultAckId: 17 },
  ]);
  assert.equal(rows[3].signals.accept, false);
  assert.equal(rows[3].signals.done, true);
  assert.equal(rows.at(-1).state.mode, 'IDLE');
});

void test('timeout also retains Accept while Req is held', () => {
  const rows = runFixture(handshakeFixtures.timeoutReqHeld);
  assert.equal(rows[1].state.mode, 'RESULT');
  assert.equal(rows[1].signals.accept, true);
  assert.equal(rows[1].signals.busy, false);
  assert.equal(rows[1].signals.done, false);
  assert.equal(rows[1].signals.fail, true);
  assert.equal(rows[2].signals.accept, false);
  assert.equal(rows[2].signals.fail, true);
  assert.equal(rows.at(-1).state.mode, 'IDLE');
});

void test('a new Req and matching Ack in RESULT do not discard the pending result', () => {
  const rows = runFixture(handshakeFixtures.normalDelayedConsumer);
  const response = receiverScan(rows[2].state, {
    nowMs: 81,
    sender: { req: true, requestId: 18, resultAckId: 17 },
  });
  assert.equal(response.state.mode, 'RESULT');
  assert.equal(response.signals.resultId, 17);
  assert.equal(response.signals.rejectId, 18);
  assert.equal(response.signals.rejectReason, 'RESULT_PENDING');
  const released = receiverScan(response.state, { nowMs: 82 });
  assert.equal(released.signals.resultId, 17);
  const acknowledged = receiverScan(released.state, {
    nowMs: 83,
    sender: { resultAckId: 17 },
  });
  assert.equal(acknowledged.state.mode, 'IDLE');
});

void test('invalid snapshots and backwards time are rejected', () => {
  assert.throws(
    () => receiverScan(initialReceiver(), { nowMs: 0, sender: { req: true } }),
    TypeError,
  );
  assert.throws(
    () =>
      receiverScan(initialReceiver(), { nowMs: 0, sender: { requestId: 17 } }),
    TypeError,
  );
  assert.throws(
    () => receiverScan({ ...initialReceiver(), lastNowMs: 2 }, { nowMs: 1 }),
    RangeError,
  );
});
