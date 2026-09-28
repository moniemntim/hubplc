import assert from 'node:assert/strict';

import { Fc03LateResponseMatcher } from './fc03-late-response-matcher.mjs';

const normalResponse = new Uint8Array([0x03, 0x04, 0x00, 0x64, 0x00, 0xc8]);

function submit(matcher, nowMs = 0, deadlineMs = 100) {
  return matcher.submitFc03({
    unitId: 1,
    startAddress: 16,
    quantity: 2,
    nowMs,
    deadlineMs,
  });
}

function callback(request, receivedAtMs, overrides = {}) {
  return {
    epoch: request.epoch,
    peer: request.peer,
    transactionId: request.transactionId,
    unitId: request.unitId,
    pdu: normalResponse,
    receivedAtMs,
    ...overrides,
  };
}

function report(label, result, expected) {
  assert.equal(result.classification, expected, label);
  console.log(`${label},${result.classification}`);
}

const epochMatcher = new Fc03LateResponseMatcher({
  epoch: 12,
  peer: 'line-a',
});
const oldRequest = submit(epochMatcher, 0, 50);
epochMatcher.expireThrough(50);
epochMatcher.advanceEpoch({
  epoch: 13,
  peer: 'line-a',
  nowMs: 51,
  oldChannelClosed: true,
});
const newRequest = submit(epochMatcher, 52, 100);
report(
  'old_callback',
  epochMatcher.acceptCallback(callback(oldRequest, 60)),
  'old-epoch',
);
report(
  'new_callback',
  epochMatcher.acceptCallback(callback(newRequest, 60)),
  'completed',
);
report(
  'duplicate',
  epochMatcher.acceptCallback(callback(newRequest, 61)),
  'duplicate',
);

const validationMatcher = new Fc03LateResponseMatcher({
  epoch: 20,
  peer: 'line-a',
});
const validationRequest = submit(validationMatcher);
report(
  'wrong_peer',
  validationMatcher.acceptCallback(
    callback(validationRequest, 10, { peer: 'line-b' }),
  ),
  'wrong-peer',
);
report(
  'wrong_function',
  validationMatcher.acceptCallback(
    callback(validationRequest, 11, {
      pdu: new Uint8Array([0x04, 0x04, 0, 0, 0, 0]),
    }),
  ),
  'wrong-function',
);
report(
  'wrong_pdu_length',
  validationMatcher.acceptCallback(
    callback(validationRequest, 12, {
      pdu: new Uint8Array([0x03, 0x04, 0, 0]),
    }),
  ),
  'wrong-pdu-length',
);
assert.equal(validationMatcher.getRequest(validationRequest).state, 'pending');

const beforeDeadlineMatcher = new Fc03LateResponseMatcher({
  epoch: 21,
  peer: 'line-a',
});
const beforeDeadline = submit(beforeDeadlineMatcher, 0, 50);
report(
  'deadline_just_before',
  beforeDeadlineMatcher.acceptCallback(callback(beforeDeadline, 49)),
  'completed',
);

const deadlineMatcher = new Fc03LateResponseMatcher({
  epoch: 22,
  peer: 'line-a',
});
const deadlineRequest = submit(deadlineMatcher, 0, 50);
report(
  'deadline_exact',
  deadlineMatcher.acceptCallback(callback(deadlineRequest, 50)),
  'late',
);
report(
  'deadline_after',
  deadlineMatcher.acceptCallback(callback(deadlineRequest, 51)),
  'late-terminal',
);

const wrapMatcher = new Fc03LateResponseMatcher({
  epoch: 30,
  peer: 'line-a',
  initialTransactionId: 0xffff,
});
assert.equal(submit(wrapMatcher).transactionId, 0xffff);
assert.throws(() => submit(wrapMatcher, 1), /Transaction IDs are exhausted/);
console.log('tid_wrap_after_65535,refused');

const exceptionMatcher = new Fc03LateResponseMatcher({
  epoch: 40,
  peer: 'line-a',
});
const exceptionRequest = submit(exceptionMatcher);
report(
  'fc03_exception',
  exceptionMatcher.acceptCallback(
    callback(exceptionRequest, 10, { pdu: new Uint8Array([0x83, 0x02]) }),
  ),
  'exception',
);
