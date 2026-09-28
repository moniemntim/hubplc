import assert from 'node:assert/strict';
import test from 'node:test';

import { Fc03LateResponseMatcher } from '../public/examples/plc-late-response/fc03-late-response-matcher.mjs';

function submit(matcher, nowMs = 0, deadlineMs = 100) {
  return matcher.submitFc03({
    unitId: 1,
    startAddress: 16,
    quantity: 2,
    nowMs,
    deadlineMs,
  });
}

function fc03Response() {
  return new Uint8Array([0x03, 0x04, 0x00, 0x64, 0x00, 0xc8]);
}

function callback(request, overrides = {}) {
  return {
    epoch: request.epoch,
    peer: request.peer,
    transactionId: request.transactionId,
    unitId: request.unitId,
    pdu: fc03Response(),
    receivedAtMs: 50,
    ...overrides,
  };
}

void test('rejects an epoch-12 callback while accepting the new epoch-13 TID 0 request once', () => {
  const matcher = new Fc03LateResponseMatcher({ epoch: 12, peer: 'line-a' });
  const oldRequest = submit(matcher, 0, 10);
  matcher.expireThrough(10);
  matcher.advanceEpoch({
    epoch: 13,
    peer: 'line-a',
    nowMs: 11,
    oldChannelClosed: true,
  });
  const newRequest = submit(matcher, 12, 100);

  assert.equal(oldRequest.transactionId, 0);
  assert.equal(newRequest.transactionId, 0);
  assert.deepEqual(
    matcher.acceptCallback(callback(oldRequest, { receivedAtMs: 20 })),
    {
      classification: 'old-epoch',
      accepted: false,
    },
  );
  assert.equal(
    matcher.acceptCallback(callback(newRequest, { receivedAtMs: 20 }))
      .classification,
    'completed',
  );
  assert.deepEqual(
    matcher.acceptCallback(callback(newRequest, { receivedAtMs: 21 })),
    { classification: 'duplicate', accepted: false },
  );
  assert.equal(matcher.getRequest(newRequest).state, 'completed');
});

void test('rejects wrong peer, Unit ID, function, byte count, and PDU length without completing', () => {
  const matcher = new Fc03LateResponseMatcher({ epoch: 13, peer: 'line-a' });
  const request = submit(matcher);

  assert.equal(
    matcher.acceptCallback(callback(request, { peer: 'line-b' }))
      .classification,
    'wrong-peer',
  );
  assert.equal(
    matcher.acceptCallback(callback(request, { unitId: 2 })).classification,
    'wrong-unit-id',
  );
  assert.equal(
    matcher.acceptCallback(
      callback(request, { pdu: new Uint8Array([0x04, 0x04, 0, 0, 0, 0]) }),
    ).classification,
    'wrong-function',
  );
  assert.equal(
    matcher.acceptCallback(
      callback(request, { pdu: new Uint8Array([0x03, 0x02, 0, 0]) }),
    ).classification,
    'wrong-byte-count',
  );
  assert.equal(
    matcher.acceptCallback(
      callback(request, { pdu: new Uint8Array([0x03, 0x04, 0, 0]) }),
    ).classification,
    'wrong-pdu-length',
  );
  assert.equal(matcher.getRequest(request).state, 'pending');
});

void test('treats a callback at the deadline as late and keeps its terminal state', () => {
  const matcher = new Fc03LateResponseMatcher({ epoch: 13, peer: 'line-a' });
  const request = submit(matcher, 0, 50);

  assert.deepEqual(
    matcher.acceptCallback(callback(request, { receivedAtMs: 50 })),
    { classification: 'late', accepted: false },
  );
  assert.equal(matcher.getRequest(request).state, 'expired');
  assert.deepEqual(
    matcher.acceptCallback(callback(request, { receivedAtMs: 51 })),
    { classification: 'late-terminal', accepted: false },
  );
});

void test('refuses TID wrap in one epoch and requires external close confirmation before epoch advance', () => {
  const matcher = new Fc03LateResponseMatcher({
    epoch: 8,
    peer: 'line-a',
    initialTransactionId: 0xffff,
  });
  const finalId = submit(matcher);

  assert.equal(finalId.transactionId, 0xffff);
  assert.throws(() => submit(matcher), /Transaction IDs are exhausted/);
  assert.throws(
    () =>
      matcher.advanceEpoch({
        epoch: 9,
        peer: 'line-a',
        nowMs: 1,
        oldChannelClosed: false,
      }),
    /confirms the old channel is closed/,
  );
  assert.deepEqual(
    matcher.advanceEpoch({
      epoch: 9,
      peer: 'line-a',
      nowMs: 1,
      oldChannelClosed: true,
    }),
    { epoch: 9, peer: 'line-a' },
  );
  assert.equal(submit(matcher, 2, 10).transactionId, 0);
});

void test('rejects an FC03 range beyond address 65535 before allocating a TID or advancing time', () => {
  const matcher = new Fc03LateResponseMatcher({ epoch: 13, peer: 'line-a' });
  const finalAddress = matcher.submitFc03({
    unitId: 1,
    startAddress: 0xffff,
    quantity: 1,
    nowMs: 0,
    deadlineMs: 10,
  });

  assert.equal(finalAddress.transactionId, 0);
  assert.throws(
    () =>
      matcher.submitFc03({
        unitId: 1,
        startAddress: 0xffff,
        quantity: 2,
        nowMs: 5,
        deadlineMs: 10,
      }),
    /must stay within the FC03 16-bit address range/,
  );
  assert.equal(
    matcher.submitFc03({
      unitId: 1,
      startAddress: 0,
      quantity: 1,
      nowMs: 0,
      deadlineMs: 10,
    }).transactionId,
    1,
  );
});

void test('rejects backwards processing time without changing a pending record or epoch', () => {
  const matcher = new Fc03LateResponseMatcher({ epoch: 13, peer: 'line-a' });
  const request = submit(matcher, 100, 200);

  assert.throws(() => matcher.expireThrough(99), /must not be earlier/);
  assert.throws(
    () =>
      matcher.advanceEpoch({
        epoch: 14,
        peer: 'line-a',
        nowMs: 99,
        oldChannelClosed: true,
      }),
    /must not be earlier/,
  );
  assert.throws(
    () => matcher.acceptCallback(callback(request, { receivedAtMs: 99 })),
    /must not be earlier/,
  );
  assert.equal(matcher.getRequest(request).state, 'pending');
  assert.deepEqual(matcher.activeChannel, { epoch: 13, peer: 'line-a' });
  assert.equal(
    matcher.acceptCallback(callback(request, { receivedAtMs: 100 }))
      .classification,
    'completed',
  );
});

void test('accepts a well-formed FC03 exception as terminal without decoding it as register data', () => {
  const matcher = new Fc03LateResponseMatcher({ epoch: 13, peer: 'line-a' });
  const request = submit(matcher);

  assert.deepEqual(
    matcher.acceptCallback(
      callback(request, { pdu: new Uint8Array([0x83, 0x02]) }),
    ),
    { classification: 'exception', accepted: true, exceptionCode: 2 },
  );
  assert.equal(matcher.getRequest(request).state, 'exception');
});
