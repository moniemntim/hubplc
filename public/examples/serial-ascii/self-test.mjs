import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  advanceParser,
  createParser,
  feedByte,
} from './serial-ascii-model.mjs';

const fixture = JSON.parse(
  await readFile(new URL('./fixture.json', import.meta.url), 'utf8'),
);

const feedMany = (state, bytes, now) => {
  let next = state;
  for (const byte of bytes) next = feedByte(next, byte, now).state;
  return next;
};

void test('split and coalesced fixture publishes only complete frames', () => {
  let state = createParser();
  state = feedMany(
    state,
    fixture.validChunks[0].bytes,
    fixture.validChunks[0].now,
  );
  assert.equal(state.published.length, 0);
  state = feedMany(
    state,
    fixture.validChunks[1].bytes,
    fixture.validChunks[1].now,
  );
  assert.equal(state.published.length, 0);
  state = feedMany(
    state,
    fixture.validChunks[2].bytes,
    fixture.validChunks[2].now,
  );
  assert.deepEqual(state.published, [
    { length: 5, payloadHex: '48454c4c4f', frameHex: '0230303548454c4c4f03' },
    { length: 1, payloadHex: '5a', frameHex: '023030315a03' },
  ]);
});

void test('fixture faults preserve expected and received hex diagnostics', () => {
  const expectations = {
    lengthSyntax: 'LENGTH_SYNTAX_REJECTED',
    lengthRange: 'LENGTH_RANGE_REJECTED',
    payload: 'PAYLOAD_REJECTED',
    etx: 'ETX_REJECTED',
  };
  for (const [name, bytes] of Object.entries(fixture.faults)) {
    const state = feedMany(createParser(), bytes, 0);
    assert.equal(state.fault.reason, expectations[name]);
    assert.match(state.fault.receivedHex, /^02/);
  }
});

void test('advance without bytes reaches the equal deadline and stops the parser', () => {
  let state = feedByte(createParser(), 0x02, 0).state;
  const timedOut = advanceParser(state, 500);
  state = timedOut.state;
  assert.equal(timedOut.event, 'TIMEOUT_REJECTED');
  assert.deepEqual(state.fault, {
    reason: 'TIMEOUT_REJECTED',
    expected: 'NEXT_BYTE_BEFORE_DEADLINE',
    receivedHex: '02',
    declaredLength: null,
    receivedPayloadBytes: 0,
  });
});
