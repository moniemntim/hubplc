import { readFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { gateBinary32, multiplyFiniteToBinary32 } from './float-gate-model.mjs';

const fixture = JSON.parse(
  await readFile(new URL('./fixture.json', import.meta.url), 'utf8'),
);

const printDecision = (id, result) => {
  const fields = [
    `id=${id}`,
    `bytes=${result.bytesHex ?? 'none'}`,
    `endian=${result.endian ?? 'none'}`,
    `bits=${result.bitsHex ?? 'none'}`,
    `class=${result.classification ?? 'NONE'}`,
    `finite=${result.finite ?? 'SKIPPED'}`,
    `quality=${result.quality ?? 'SKIPPED'}`,
    `range=${result.rangeStatus}`,
    `usable=${result.usable}`,
    `decision=${result.decision}`,
    `provenance=${result.provenance ?? 'none'}`,
  ];
  if (result.classification === 'FINITE') fields.push(`value=${result.value}`);
  if (result.classification === 'NAN')
    fields.push(`nan_payload=${result.fractionHex}`);
  if (result.detail)
    fields.push(`detail=${result.detail.replaceAll(' ', '_')}`);
  console.log(fields.join(' '));
};

console.log(`dataset=${fixture.dataset} synthetic=${fixture.synthetic}`);
for (const record of fixture.records) {
  const result = gateBinary32({
    ...record,
    bytes: Buffer.from(record.bytes),
    range: fixture.range,
  });
  printDecision(record.id, result);
}

const operation = multiplyFiniteToBinary32(
  fixture.operation.left,
  fixture.operation.right,
  fixture.operation.endian,
);
printDecision(
  fixture.operation.id,
  gateBinary32({
    bytes: operation.bytes,
    endian: operation.endian,
    quality: fixture.operation.quality,
    range: fixture.range,
    provenance: operation.provenance,
  }),
);
