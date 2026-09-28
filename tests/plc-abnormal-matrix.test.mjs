import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initialMatrix,
  matrixScan,
} from '../public/examples/plc-abnormal-matrix/abnormal-matrix-model.mjs';
import {
  runFixture,
  scenarioFixtures,
} from '../public/examples/plc-abnormal-matrix/fixtures.mjs';

function scan(state, nowMs, extras = {}) {
  return matrixScan(state, { nowMs, ...extras });
}

function accept(state, nowMs, requestId) {
  return scan(state, nowMs, { requestLevel: true, requestId });
}

function release(state, nowMs) {
  return scan(state, nowMs);
}

void test('the four documented fixtures are independent and reproducible', () => {
  const normal = runFixture(scenarioFixtures.normal);
  const timeout = runFixture(scenarioFixtures.timeout);
  const busyReject = runFixture(scenarioFixtures.busyReject);
  const cancel = runFixture(scenarioFixtures.cancel);

  assert.deepEqual(
    normal.map((row) => row.state.state),
    ['RUN', 'RUN', 'DONE', 'WAIT'],
  );
  assert.deepEqual(normal[2].state.result, {
    requestId: 17,
    feedbackAtMs: 120,
  });
  assert.equal(normal[3].state.currentRequestId, null);
  assert.equal(normal[3].state.result, null);
  assert.deepEqual(
    timeout.map((row) => row.state.state),
    ['RUN', 'RUN', 'ERROR', 'ERROR'],
  );
  assert.equal(timeout[2].state.currentRequestId, 17);
  assert.equal(timeout[2].state.reason, 'TIMEOUT');
  assert.equal(timeout.at(-1).state.scanEvents[0].code, 'LATE_FEEDBACK');
  assert.equal(busyReject[2].state.currentRequestId, 17);
  assert.equal(busyReject[2].state.scanEvents[0].code, 'BUSY_REJECT');
  assert.deepEqual(
    cancel.map((row) => row.state.state),
    ['RUN', 'RUN', 'CANCELLED', 'CANCELLED', 'WAIT'],
  );
  assert.equal(cancel[3].state.currentRequestId, 17);
  assert.equal(cancel[3].state.reason, 'CANCEL');
  assert.equal(cancel[4].state.currentRequestId, null);
});

void test('feedback at 299 ms completes, while 300 ms and 301 ms time out', () => {
  let state = accept(initialMatrix(), 0, 17);
  state = release(state, 1);
  state = scan(state, 299, { feedbackId: 17 });
  assert.equal(state.state, 'DONE');

  for (const nowMs of [300, 301]) {
    state = accept(initialMatrix(), 0, 17);
    state = release(state, 1);
    state = scan(state, nowMs, { feedbackId: 17 });
    assert.equal(state.state, 'ERROR');
    assert.equal(state.reason, 'TIMEOUT');
    assert.deepEqual(state.scanEvents, [
      { code: 'LATE_FEEDBACK', feedbackId: 17 },
    ]);
  }
});

void test('cancel outranks timeout and feedback in one sampled scan', () => {
  let state = accept(initialMatrix(), 0, 17);
  state = release(state, 1);
  state = scan(state, 300, { cancel: true, feedbackId: 17 });
  assert.equal(state.state, 'CANCELLED');
  assert.equal(state.reason, 'CANCEL');
  assert.deepEqual(state.scanEvents, [
    { code: 'LATE_FEEDBACK', feedbackId: 17 },
  ]);
});

void test('wrong feedback and wrong acknowledgement do not mutate terminal evidence', () => {
  let state = accept(initialMatrix(), 0, 17);
  state = release(state, 1);
  state = scan(state, 120, { feedbackId: 18 });
  assert.equal(state.state, 'RUN');
  assert.deepEqual(state.scanEvents, [
    { code: 'WRONG_FEEDBACK', feedbackId: 18, expectedRequestId: 17 },
  ]);
  state = scan(state, 121, { feedbackId: 17 });
  const result = state.result;
  state = scan(state, 150, { ackId: 18 });
  assert.equal(state.state, 'DONE');
  assert.deepEqual(state.result, result);
  assert.deepEqual(state.scanEvents, [
    { code: 'BAD_ACK', ackId: 18, expectedRequestId: 17 },
  ]);
  state = scan(state, 151, { ackId: 17 });
  assert.equal(state.state, 'WAIT');
});

void test('a held request stays one event through reset and accepted IDs cannot be reused', () => {
  let state = accept(initialMatrix(), 0, 17);
  state = scan(state, 300, { requestLevel: true, requestId: 17, cancel: true });
  assert.equal(state.state, 'CANCELLED');
  assert.deepEqual(state.scanEvents, []);
  state = scan(state, 301, { requestLevel: true, requestId: 17, reset: true });
  assert.equal(state.state, 'WAIT');
  state = scan(state, 302, { requestLevel: true, requestId: 17 });
  assert.equal(state.state, 'WAIT');
  assert.deepEqual(state.scanEvents, []);
  state = release(state, 303);
  state = accept(state, 304, 17);
  assert.equal(state.state, 'WAIT');
  assert.deepEqual(state.scanEvents, [
    { code: 'REUSED_REQUEST_ID', requestId: 17 },
  ]);
  state = release(state, 305);
  state = accept(state, 306, 18);
  assert.equal(state.state, 'RUN');
  assert.equal(state.currentRequestId, 18);
});

void test('the model rejects malformed or time-reversing input', () => {
  assert.throws(
    () => matrixScan(initialMatrix(), { nowMs: 0, requestLevel: true }),
    TypeError,
  );
  assert.throws(
    () => matrixScan(initialMatrix(), { nowMs: 0, feedbackId: 0 }),
    TypeError,
  );
  assert.throws(
    () => matrixScan(initialMatrix(), { nowMs: 0, requestId: 17 }),
    TypeError,
  );
  assert.throws(
    () => scan({ ...initialMatrix(), lastNowMs: 10 }, 9),
    RangeError,
  );
});
