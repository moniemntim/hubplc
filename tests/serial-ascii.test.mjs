import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advanceParser,
  createParser,
  feedByte,
} from '../public/examples/serial-ascii/serial-ascii-model.mjs';

const feedMany = (state, bytes, now) => {
  let next = state;
  for (const byte of bytes) next = feedByte(next, byte, now).state;
  return next;
};

void test('one-byte, split, and coalesced delivery produce the same complete frames', () => {
  const bytes = [2, 48, 48, 53, 72, 69, 76, 76, 79, 3, 2, 48, 48, 49, 90, 3];
  let oneByte = createParser();
  for (const [index, byte] of bytes.entries())
    oneByte = feedMany(oneByte, [byte], index);
  const coalesced = feedMany(createParser(), bytes, 0);
  assert.deepEqual(oneByte.published, coalesced.published);
  assert.equal(coalesced.published.length, 2);
});

void test('no partial payload is published and malformed length, payload, or ETX faults stop flow', () => {
  const partial = feedMany(createParser(), [2, 48, 48, 51, 65, 66], 0);
  assert.equal(partial.published.length, 0);
  const cases = [
    [[2, 48, 65], 'LENGTH_SYNTAX_REJECTED'],
    [[2, 48, 48, 48], 'LENGTH_RANGE_REJECTED'],
    [[2, 48, 48, 49, 128], 'PAYLOAD_REJECTED'],
    [[2, 48, 48, 49, 65, 4], 'ETX_REJECTED'],
  ];
  for (const [bytes, reason] of cases) {
    const state = feedMany(createParser(), bytes, 0);
    assert.equal(state.fault.reason, reason);
    assert.equal(feedByte(state, 2, 1).event, 'STOPPED');
  }
});

void test('the equal deadline times out before a same-time byte and advance can observe idle timeout', () => {
  let state = feedByte(createParser(), 2, 0).state;
  const withSameTimeByte = feedByte(state, 48, 500);
  assert.equal(withSameTimeByte.event, 'TIMEOUT_REJECTED');
  assert.equal(withSameTimeByte.state.fault.receivedHex, '02');
  state = feedByte(createParser(), 2, 0).state;
  assert.equal(advanceParser(state, 499).event, 'ADVANCED');
  assert.equal(advanceParser(state, 500).event, 'TIMEOUT_REJECTED');
});

void test('input, output, and frame storage remain bounded', () => {
  const inputLimited = feedByte(createParser({ maxInputBytes: 1 }), 2, 0).state;
  assert.equal(feedByte(inputLimited, 48, 1).event, 'INPUT_LIMIT_REJECTED');
  const outputLimited = feedMany(
    createParser({ maxOutputFrames: 1 }),
    [2, 48, 48, 49, 65, 3, 2, 48, 48, 49, 66, 3],
    0,
  );
  assert.equal(outputLimited.fault.reason, 'OUTPUT_LIMIT_REJECTED');
  assert.equal(outputLimited.published.length, 1);
  assert.throws(() => createParser({ maxInputBytes: 0 }), RangeError);
});

void test('the maximum 128-byte payload makes one 133-byte frame', () => {
  const bytes = [2, 49, 50, 56, ...Array(128).fill(0x41), 3];
  const state = feedMany(createParser(), bytes, 0);
  assert.equal(state.stopped, false);
  assert.deepEqual(
    [
      state.published.length,
      state.published[0].length,
      state.published[0].frameHex.length,
    ],
    [1, 128, 266],
  );
});

void test('STX deadline must be representable as a safe integer', () => {
  const lastRepresentableStart = Number.MAX_SAFE_INTEGER - 500;
  const started = feedByte(createParser(), 2, lastRepresentableStart).state;
  assert.equal(started.deadline, Number.MAX_SAFE_INTEGER);
  assert.equal(
    advanceParser(started, Number.MAX_SAFE_INTEGER).event,
    'TIMEOUT_REJECTED',
  );
  assert.throws(
    () => feedByte(createParser(), 2, Number.MAX_SAFE_INTEGER - 499),
    RangeError,
  );
});
