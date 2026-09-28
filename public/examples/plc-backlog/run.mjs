import { readFile } from 'node:fs/promises';
import { classifyInstanceTrace, simulateFifo } from './backlog-model.mjs';

const fixture = JSON.parse(
  await readFile(new URL('./fixture.json', import.meta.url), 'utf8'),
);
const result = simulateFifo(fixture.fifo);
console.log(`dataset=${fixture.dataset}`);
console.log(
  `fifo arrivals=${fixture.fifo.arrivalsMs.join(',')} serviceMs=${result.serviceMs} waitingCapacity=${result.waitingCapacity}`,
);
console.log('admitted job,arrivalMs,startMs,finishMs,waitMs');
for (const job of result.admitted)
  console.log(
    `${job.id},${job.arrivalMs},${job.startMs},${job.finishMs},${job.waitMs}`,
  );
console.log(
  'rejected job,arrivalMs,startMs,finishMs,waitMs,activeBefore,activeAfter,reason',
);
for (const job of result.rejected)
  console.log(
    `${job.id},${job.arrivalMs},${job.startMs},${job.finishMs},${job.waitMs},${job.activeJobIdBefore},${job.activeJobIdAfter},${job.reason}`,
  );
console.log(
  `summary admitted=${result.admitted.length} rejected=${result.rejected.length}`,
);
for (const trace of fixture.traces) {
  const outcome = classifyInstanceTrace(trace);
  console.log(
    `trace ${trace.id}: ${outcome.classification}; overlaps=${outcome.overlaps.length}; synthetic=${trace.synthetic}`,
  );
}
