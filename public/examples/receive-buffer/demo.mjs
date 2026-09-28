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
let state = createReceiver(fixture.config);
console.log(`dataset=${fixture.dataset} synthetic=${fixture.synthetic}`);

for (const [index, bytes] of fixture.mainChunks.entries()) {
  if (index === 2) {
    const consumed = consumeNext(state);
    state = consumed.state;
    console.log(
      `consume payload_bytes=${consumed.payload.length} queue_bytes=${state.queueBytes} consumed_frames=${state.consumedFrames}`,
    );
  }
  state = ingestChunk(state, Buffer.from(bytes)).state;
  console.log(
    `after_chunk_${index + 1} framing_bytes=${state.framing.length} queue_bytes=${state.queueBytes} completed=${state.completedFrames} accepted=${state.acceptedFrames} rejected_queue=${state.rejectedQueueFrames} stopped=${state.stopped}`,
  );
}
const totals = conservation(state);
console.log(
  `conservation completed_payload=${state.completedPayloadBytes} accepted_payload=${state.acceptedPayloadBytes} rejected_payload=${state.rejectedQueuePayloadBytes} consumed_payload=${state.consumedPayloadBytes} queue_bytes=${state.queueBytes} completed_matches=${totals.completedPayloadMatchesDisposition} accepted_matches=${totals.acceptedPayloadMatchesConsumerAndQueue}`,
);
console.log(`eof=${endOfInput(state).status}`);

let partial = createReceiver(fixture.config);
for (const bytes of fixture.partialEofChunks)
  partial = ingestChunk(partial, Buffer.from(bytes)).state;
const partialEof = endOfInput(partial);
console.log(
  `partial_eof=${partialEof.status} framing_bytes=${partialEof.framingBytes} loss_inferred=${partialEof.lossInferred}`,
);

const oversize = ingestChunk(
  createReceiver(fixture.config),
  Buffer.from(fixture.oversizeHeader),
).state;
console.log(
  `oversize stopped=${oversize.stopped} reason=${oversize.stopReason} queue_bytes=${oversize.queueBytes}`,
);
