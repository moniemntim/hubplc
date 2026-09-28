import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  conservation,
  consumeNext,
  createReceiver,
  endOfInput,
  ingestChunk,
} from './receive-buffer-model.mjs';

const fixture = JSON.parse(
  await readFile(new URL('./fixture.json', import.meta.url), 'utf8'),
);

void test('fixture separates partial framing from whole-frame queue admission', () => {
  let state = createReceiver(fixture.config);
  state = ingestChunk(state, Buffer.from(fixture.mainChunks[0])).state;
  assert.equal(state.framing.length, 1);
  state = ingestChunk(state, Buffer.from(fixture.mainChunks[1])).state;
  assert.deepEqual(
    [
      state.queueBytes,
      state.completedFrames,
      state.acceptedFrames,
      state.rejectedQueueFrames,
    ],
    [4, 2, 1, 1],
  );
  state = consumeNext(state).state;
  state = ingestChunk(state, Buffer.from(fixture.mainChunks[2])).state;
  assert.deepEqual(conservation(state), {
    completedPayloadMatchesDisposition: true,
    acceptedPayloadMatchesConsumerAndQueue: true,
  });
});

void test('fixture makes EOF and oversize outcomes explicit', () => {
  let state = createReceiver(fixture.config);
  for (const bytes of fixture.partialEofChunks)
    state = ingestChunk(state, Buffer.from(bytes)).state;
  assert.equal(endOfInput(state).status, 'INCOMPLETE_FRAME_AT_EOF');
  state = ingestChunk(
    createReceiver(fixture.config),
    Buffer.from(fixture.oversizeHeader),
  ).state;
  assert.equal(state.stopReason, 'FRAME_TOO_LARGE');
});

void test('a zero payload header stops and a exactly-full queue accepts its frame', () => {
  let state = ingestChunk(
    createReceiver(fixture.config),
    Buffer.of(0, 0),
  ).state;
  assert.equal(state.stopReason, 'EMPTY_FRAME');
  state = ingestChunk(
    createReceiver({ ...fixture.config, queueCapacityBytes: 4 }),
    Buffer.of(0, 4, 1, 2, 3, 4),
  ).state;
  assert.equal(state.acceptedFrames, 1);
  assert.equal(state.queueBytes, 4);
});
