import { readFile } from 'node:fs/promises';
import { previewRecord } from './preview.mjs';
const input = JSON.parse(
  await readFile(new URL('./records.json', import.meta.url), 'utf8'),
);
console.log(
  JSON.stringify(
    input.records.map((record) => previewRecord(record, input.asOf)),
    null,
    2,
  ),
);
