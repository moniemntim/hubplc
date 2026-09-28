import { readFile } from 'node:fs/promises';

import {
  buildTaskRows,
  makeSampleTimes,
  sampleTrace,
  summarizeTrace,
} from './trace-model.mjs';

const fixture = JSON.parse(
  await readFile(new URL('./fixture.json', import.meta.url), 'utf8'),
);
const rows = buildTaskRows(fixture);
const totalMs = rows.at(-1).endMs;

console.log(`dataset,${fixture.dataset}`);
console.log(
  `model,cycleMs,${fixture.cycleMs},totalScans,${fixture.totalScans},eventScans,${fixture.eventScans.join('|')}`,
);
console.log('task_rows');
console.log('scan,startMs,endMs,oneShot,eventCount');
for (const row of rows)
  console.log(
    [
      row.scan,
      row.startMs,
      row.endMs,
      Number(row.oneShot),
      row.eventCount,
    ].join(','),
  );

for (const plan of fixture.tracePlans) {
  const samples = sampleTrace(
    rows,
    makeSampleTimes({
      totalMs,
      intervalMs: plan.intervalMs,
      phaseMs: plan.phaseMs,
    }),
  );
  const summary = summarizeTrace(samples);
  console.log(
    `trace,${plan.id},intervalMs,${plan.intervalMs},phaseMs,${plan.phaseMs}`,
  );
  console.log('timeMs,scan,oneShot,eventCount');
  for (const sample of samples)
    console.log(
      [
        sample.timeMs,
        sample.scan,
        Number(sample.oneShot),
        sample.eventCount,
      ].join(','),
    );
  console.log(
    [
      'summary',
      plan.id,
      'samples',
      summary.samples,
      'oneShotScans',
      summary.oneShotScans.join('|') || 'none',
      'lastSampledEventCount',
      summary.lastSampledEventCount,
    ].join(','),
  );
}
