import { readFile } from 'node:fs/promises';

import { appendAndExtract, hexToBytes } from './modbus-framing.mjs';

const fixture = JSON.parse(
  await readFile(new URL('./stream-fixtures.json', import.meta.url), 'utf8'),
);
let remainder = new Uint8Array();
const transactionIds = [];

for (const chunk of fixture.chunks) {
  const extracted = appendAndExtract(remainder, hexToBytes(chunk));
  transactionIds.push(...extracted.frames.map((frame) => frame.transactionId));
  remainder = extracted.remainder;
}

console.log(
  `TID: ${transactionIds.map((id) => id.toString(16).padStart(4, '0').toUpperCase()).join(', ')}`,
);
console.log(`remain: ${remainder.length}`);
