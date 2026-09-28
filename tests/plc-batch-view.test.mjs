import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { Fc03LateResponseMatcher } from '../public/examples/plc-late-response/fc03-late-response-matcher.mjs';
import { batchView } from '../public/examples/plc-late-response/batch-view.mjs';

void test('public batch replay verifies out-of-order, duplicate, malformed and expired outcomes', () => {
  const text = execFileSync(
    process.execPath,
    ['public/examples/plc-late-response/batch-demo.mjs'],
    { encoding: 'utf8' },
  );
  const rows = text
    .trim()
    .split(/\r?\n/)
    .slice(0, 3)
    .map((line) => JSON.parse(line));
  assert.equal(rows[0].all.settled, false);
  assert.equal(rows[1].all.settled, true);
  assert.equal(rows[2].partial.states.B, 'expired');
});
void test('batch view refuses empty/duplicate/unknown members and missing completed values', () => {
  const matcher = new Fc03LateResponseMatcher({ epoch: 1, peer: 'a' });
  const a = {
    ...matcher.submitFc03({
      unitId: 1,
      startAddress: 0,
      quantity: 1,
      nowMs: 0,
      deadlineMs: 20,
    }),
    label: 'A',
  };
  assert.throws(() => batchView(matcher, [], {}, 'all'), RangeError);
  assert.throws(() => batchView(matcher, [a, a], {}, 'all'), RangeError);
  assert.throws(
    () => batchView(matcher, [{ ...a, transactionId: 22 }], {}, 'all'),
    RangeError,
  );
  matcher.acceptCallback({
    ...a,
    receivedAtMs: 1,
    pdu: Uint8Array.from([3, 2, 0, 1]),
  });
  assert.throws(() => batchView(matcher, [a], {}, 'all'), /no saved data/);
});
