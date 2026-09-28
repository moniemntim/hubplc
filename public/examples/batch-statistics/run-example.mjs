import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { formatMean, summarizeBatch } from './batch-statistics.mjs';

const fixturePath = fileURLToPath(new URL('./fixture.json', import.meta.url));
const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));

for (const [name, samples] of Object.entries(fixture.batches)) {
  const result = summarizeBatch(samples);
  const printable = {
    ...result,
    mean:
      result.mean === null
        ? null
        : `${result.mean.numerator}/${result.mean.denominator}`,
    meanDisplay: formatMean(result.mean),
  };
  console.log(`${name}: ${JSON.stringify(printable)}`);
}
