import assert from 'node:assert/strict';
import { Fc03LateResponseMatcher } from './fc03-late-response-matcher.mjs';
import { batchView } from './batch-view.mjs';

function setup() {
  const matcher = new Fc03LateResponseMatcher({
    epoch: 1,
    peer: 'gateway-a',
    initialTransactionId: 101,
  });
  const a = {
    ...matcher.submitFc03({
      unitId: 1,
      startAddress: 16,
      quantity: 2,
      nowMs: 0,
      deadlineMs: 2000,
    }),
    label: 'A',
  };
  const b = {
    ...matcher.submitFc03({
      unitId: 1,
      startAddress: 32,
      quantity: 2,
      nowMs: 10,
      deadlineMs: 510,
    }),
    label: 'B',
  };
  return { matcher, a, b, values: {}, updates: { A: 0, B: 0 } };
}
function receive(context, member, at, pdu, extra = {}) {
  const result = context.matcher.acceptCallback({
    ...member,
    receivedAtMs: at,
    pdu: Uint8Array.from(pdu),
    ...extra,
  });
  if (result.classification === 'completed') {
    const words = [];
    for (let index = 0; index < result.data.length; index += 2)
      words.push(result.data[index] * 256 + result.data[index + 1]);
    context.values[`${member.epoch}:${member.transactionId}`] = words;
    context.updates[member.label]++;
  }
  return result.classification;
}
function show(name, context) {
  const views = {};
  for (const policy of ['all', 'partial'])
    views[policy] = batchView(
      context.matcher,
      [context.a, context.b],
      context.values,
      policy,
    );
  console.log(
    JSON.stringify({ point: name, ...views, updates: context.updates }),
  );
  return views;
}
const aPdu = [3, 4, 0, 100, 0, 200];
const bPdu = [3, 4, 1, 44, 1, 144];
const normal = setup();
assert.equal(receive(normal, normal.b, 200, bPdu), 'completed');
const first = show('B first at 200', normal);
assert.deepEqual(first.all.visible, {});
assert.deepEqual(first.partial.visible, { B: [300, 400] });
assert.equal(receive(normal, normal.b, 201, bPdu), 'duplicate');
assert.equal(
  receive(normal, normal.a, 202, aPdu, { transactionId: 999 }),
  'unknown-transaction',
);
assert.equal(
  receive(normal, normal.a, 203, [3, 4, 0, 100]),
  'wrong-pdu-length',
);
assert.equal(normal.matcher.getRequest(normal.a).state, 'pending');
assert.equal(receive(normal, normal.a, 1200, aPdu), 'completed');
const finished = show('A finishes at 1200', normal);
assert.equal(finished.all.status, 'complete');
assert.deepEqual(finished.all.visible, { A: [100, 200], B: [300, 400] });
assert.deepEqual(normal.updates, { A: 1, B: 1 });

const missing = setup();
missing.matcher.expireThrough(510);
assert.equal(receive(missing, missing.b, 600, bPdu), 'late-terminal');
assert.equal(receive(missing, missing.a, 1200, aPdu), 'completed');
const incomplete = show('B expired; A finishes at 1200', missing);
assert.equal(incomplete.all.status, 'incomplete');
assert.deepEqual(incomplete.all.visible, {});
assert.deepEqual(incomplete.partial.visible, { A: [100, 200] });
assert.deepEqual(missing.updates, { A: 1, B: 0 });
console.log(
  'PASS: correct pairing, once-only updates, malformed isolation and all/partial views',
);
