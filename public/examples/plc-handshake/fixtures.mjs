import { initialReceiver, receiverScan } from './handshake-model.mjs';

const request = (nowMs, requestId, payload, label) => ({
  nowMs,
  sender: { req: true, requestId, payload },
  label,
});

const release = (nowMs, label, resultAckId = null) => ({
  nowMs,
  sender: { resultAckId },
  label,
});

const holdRequest = (
  nowMs,
  requestId,
  payload,
  label,
  resultAckId = null,
  worker = {},
) => ({
  nowMs,
  sender: { req: true, requestId, payload, resultAckId },
  worker,
  label,
});

// Each following row is the Sender's next scan after observing the prior
// Receiver output. busyNewId deliberately violates the normal Sender contract.
export const handshakeFixtures = {
  normalDelayedConsumer: [
    request(0, 17, { recipe: 'A', quantity: 4 }, 'Sender publishes request 17'),
    release(1, 'Sender observed Accept=17 and releases Req'),
    {
      nowMs: 80,
      worker: { complete: true },
      label: 'Receiver worker succeeds',
    },
    release(81, 'Sender delays result consumption for one scan'),
    release(82, 'Sender stores result 17 and publishes matching ResultAck', 17),
  ],
  wrongAck: [
    request(0, 17, { recipe: 'A' }, 'Sender publishes request 17'),
    release(1, 'Sender releases accepted request'),
    {
      nowMs: 80,
      worker: { complete: true },
      label: 'Receiver worker succeeds',
    },
    release(81, 'Sender sends wrong ResultAck=18', 18),
    release(82, 'Sender sends matching ResultAck=17', 17),
  ],
  busyNewId: [
    request(0, 17, { recipe: 'A', quantity: 4 }, 'Sender publishes request 17'),
    release(1, 'Sender releases accepted request'),
    request(
      20,
      18,
      { recipe: 'B', quantity: 9 },
      'Fault injection: publish 18 while Busy',
    ),
    request(
      21,
      18,
      { recipe: 'changed', quantity: 99 },
      'Fault injection: hold rejected 18',
    ),
    release(22, 'Fault injection ends: release rejected 18'),
    {
      nowMs: 80,
      worker: { complete: true },
      label: 'Original worker 17 succeeds',
    },
    release(81, 'Sender acknowledges result 17', 17),
    request(
      82,
      19,
      { recipe: 'C', quantity: 2 },
      'Rearmed Sender publishes increasing 19',
    ),
  ],
  sameIdHold: [
    request(0, 17, { recipe: 'A' }, 'Sender publishes request 17'),
    holdRequest(
      1,
      17,
      { recipe: 'changed' },
      'Fault injection: Sender changes held payload',
    ),
    release(2, 'Sender releases request 17'),
    {
      nowMs: 80,
      worker: { complete: true },
      label: 'Receiver worker succeeds',
    },
    release(81, 'Sender acknowledges result 17', 17),
    request(82, 17, { recipe: 'reused' }, 'Sender incorrectly reuses 17'),
  ],
  timeoutWinsSuccess: [
    request(0, 17, { recipe: 'A' }, 'Sender publishes request 17'),
    release(1, 'Sender releases accepted request'),
    {
      nowMs: 200,
      worker: { complete: true },
      label: 'Deadline and worker success arrive in one Receiver scan',
    },
    release(201, 'Sender sends wrong ResultAck=18', 18),
    release(202, 'Sender sends matching ResultAck=17', 17),
  ],
  earlyCompleteSlowSender: [
    request(0, 17, { recipe: 'A' }, 'Sender publishes request 17'),
    holdRequest(
      20,
      17,
      { recipe: 'A' },
      'Worker succeeds before Sender has released Req',
      null,
      { complete: true },
    ),
    holdRequest(
      21,
      17,
      { recipe: 'A' },
      'Fault injection: premature matching ResultAck while Req is held',
      17,
    ),
    release(22, 'Sender releases Req after seeing held Accept and Done'),
    release(23, 'Sender sends matching ResultAck after Req release', 17),
  ],
  timeoutReqHeld: [
    request(0, 17, { recipe: 'A' }, 'Sender publishes request 17'),
    holdRequest(
      200,
      17,
      { recipe: 'A' },
      'Deadline and worker success arrive while Req remains held',
      null,
      { complete: true },
    ),
    release(201, 'Sender releases Req after seeing held Accept and Fail'),
    release(202, 'Sender sends matching ResultAck=17', 17),
  ],
};

export function runFixture(steps) {
  let state = initialReceiver();
  return steps.map(({ label, ...input }) => {
    const response = receiverScan(state, input);
    state = response.state;
    return { label, input, ...response };
  });
}
