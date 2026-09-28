import { readFile } from 'node:fs/promises';
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

const printFault = (name, state) => {
  if (state.fault)
    console.log(
      `fault=${name} stopped=${state.stopped} reason=${state.fault.reason} expected=${state.fault.expected} received=${state.fault.receivedHex}`,
    );
  else
    console.log(
      `fault=${name} stopped=${state.stopped} stage=${state.stage} published=${state.published.length}`,
    );
};

console.log(`dataset=${fixture.dataset} synthetic=${fixture.synthetic}`);
let valid = createParser();
for (const chunk of fixture.validChunks) {
  valid = feedMany(valid, chunk.bytes, chunk.now);
  console.log(
    `chunk_now=${chunk.now} published=${valid.published.length} stage=${valid.stage} stopped=${valid.stopped}`,
  );
}
for (const [index, frame] of valid.published.entries())
  console.log(
    `published_index=${index} length=${frame.length} payload_hex=${frame.payloadHex} frame_hex=${frame.frameHex}`,
  );

for (const [name, bytes] of Object.entries(fixture.faults))
  printFault(name, feedMany(createParser(), bytes, 0));

let timeout = feedByte(createParser(), 0x02, 0).state;
timeout = advanceParser(timeout, 500).state;
printFault('timeout', timeout);
