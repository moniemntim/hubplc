import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  conservation,
  consumeNext,
  createReceiver,
  encodeFrame,
  endOfInput,
  ingestChunk,
} from '../public/examples/receive-buffer/receive-buffer-model.mjs';

const fixture = JSON.parse(
  await readFile(
    new URL('../public/examples/receive-buffer/fixture.json', import.meta.url),
    'utf8',
  ),
);

void test('split header and split payload remain framing bytes until one complete frame exists', () => {
  let state = createReceiver(fixture.config);
  state = ingestChunk(state, Buffer.of(0)).state;
  assert.equal(state.framing.length, 1);
  state = ingestChunk(state, Buffer.of(4, 10, 11)).state;
  assert.equal(state.framing.length, 4);
  assert.equal(state.queue.length, 0);
  state = ingestChunk(state, Buffer.of(12, 13)).state;
  assert.equal(state.framing.length, 0);
  assert.equal(Buffer.isBuffer(state.queue[0]), true);
  assert.deepEqual([...state.queue[0]], [10, 11, 12, 13]);
});

void test('coalesced frames apply payload-byte capacity and preserve existing queue on rejection', () => {
  let state = createReceiver(fixture.config);
  state = ingestChunk(state, Buffer.from(fixture.mainChunks[0])).state;
  state = ingestChunk(state, Buffer.from(fixture.mainChunks[1])).state;
  assert.equal(state.queueBytes, 4);
  assert.deepEqual([...state.queue[0]], [10, 11, 12, 13]);
  assert.equal(state.rejectedQueueFrames, 1);
  assert.equal(state.rejectedQueuePayloadBytes, 6);
  assert.deepEqual(conservation(state), {
    completedPayloadMatchesDisposition: true,
    acceptedPayloadMatchesConsumerAndQueue: true,
  });
});

void test('consuming whole queued frame makes capacity for a later full frame', () => {
  let state = createReceiver(fixture.config);
  for (const bytes of fixture.mainChunks.slice(0, 2))
    state = ingestChunk(state, Buffer.from(bytes)).state;
  const consumed = consumeNext(state);
  state = consumed.state;
  assert.deepEqual([...consumed.payload], [10, 11, 12, 13]);
  state = ingestChunk(state, Buffer.from(fixture.mainChunks[2])).state;
  assert.deepEqual([...state.queue[0]], [30, 31, 32, 33]);
  assert.equal(state.queueBytes, 4);
});

void test('a frame exactly filling payload-byte capacity is accepted', () => {
  const state = ingestChunk(
    createReceiver({ ...fixture.config, queueCapacityBytes: 4 }),
    Buffer.of(0, 4, 1, 2, 3, 4),
  ).state;
  assert.deepEqual(
    {
      queueBytes: state.queueBytes,
      accepted: state.acceptedFrames,
      rejected: state.rejectedQueueFrames,
    },
    { queueBytes: 4, accepted: 1, rejected: 0 },
  );
});

void test('oversize header stops without resynchronization and partial EOF does not infer loss', () => {
  let state = ingestChunk(
    createReceiver(fixture.config),
    Buffer.from(fixture.oversizeHeader),
  ).state;
  assert.deepEqual(
    {
      stopped: state.stopped,
      reason: state.stopReason,
      framingBytes: state.framing.length,
    },
    { stopped: true, reason: 'FRAME_TOO_LARGE', framingBytes: 0 },
  );
  assert.equal(ingestChunk(state, Buffer.of(0)).event, 'STOPPED_IGNORED');
  state = createReceiver(fixture.config);
  state = ingestChunk(state, Buffer.from(fixture.partialEofChunks[0])).state;
  assert.deepEqual(endOfInput(state), {
    status: 'INCOMPLETE_FRAME_AT_EOF',
    framingBytes: 4,
    lossInferred: false,
  });
});

void test('empty or oversize header stops while prior valid frame in the same chunk stays queued', () => {
  const validThenOversize = Buffer.of(0, 4, 1, 2, 3, 4, 3, 233);
  let state = ingestChunk(
    createReceiver(fixture.config),
    validThenOversize,
  ).state;
  assert.deepEqual(
    {
      reason: state.stopReason,
      queueBytes: state.queueBytes,
      queue: [...state.queue[0]],
    },
    { reason: 'FRAME_TOO_LARGE', queueBytes: 4, queue: [1, 2, 3, 4] },
  );
  state = ingestChunk(createReceiver(fixture.config), Buffer.of(0, 0)).state;
  assert.equal(state.stopReason, 'EMPTY_FRAME');
});

void test('input, framing, and byte-type bounds are refused', () => {
  assert.throws(
    () => createReceiver({ ...fixture.config, queueCapacityBytes: -1 }),
    RangeError,
  );
  assert.throws(
    () =>
      createReceiver({
        ...fixture.config,
        maxPayload: 1001,
        maxFramingBytes: 1002,
      }),
    RangeError,
  );
  assert.throws(
    () => createReceiver({ ...fixture.config, maxPayload: 65536 }),
    RangeError,
  );
  assert.throws(
    () => createReceiver({ ...fixture.config, queueCapacityBytes: 65537 }),
    RangeError,
  );
  assert.throws(
    () => createReceiver({ ...fixture.config, maxInputBytes: 65537 }),
    RangeError,
  );
  assert.throws(
    () => createReceiver({ ...fixture.config, maxFramingBytes: 65538 }),
    RangeError,
  );
  let state = createReceiver({ ...fixture.config, maxInputBytes: 3 });
  assert.equal(
    ingestChunk(state, Buffer.of(0, 4, 1, 2)).event,
    'INPUT_LIMIT_EXCEEDED',
  );
  state = createReceiver({
    ...fixture.config,
    maxFramingBytes: 6,
    maxPayload: 4,
  });
  assert.equal(
    ingestChunk(state, Buffer.of(0, 4, 1, 2, 3, 4, 5)).event,
    'FRAMING_LIMIT_EXCEEDED',
  );
  assert.throws(
    () => ingestChunk(createReceiver(fixture.config), [0, 4]),
    TypeError,
  );
  assert.throws(() => encodeFrame(Buffer.alloc(65536)), RangeError);
  assert.throws(() => encodeFrame(Buffer.alloc(0)), RangeError);
});
