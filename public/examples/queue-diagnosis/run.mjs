import { readFile } from 'node:fs/promises';
import { analyzeRecords } from './queue-diagnosis-model.mjs';

const fixture = JSON.parse(
  await readFile(new URL('./fixture.json', import.meta.url), 'utf8'),
);
const result = analyzeRecords(fixture.records);

console.log(`dataset=${fixture.dataset} synthetic=${fixture.synthetic}`);
console.log(
  'accepted request_id,device_id,worker_id,clock_id,queue,worker_pre,first_byte_wait,remaining_receive,parse,persist_tail,total,sum,candidate_segment,candidate_ms',
);
for (const item of result.accepted)
  console.log(
    [
      item.requestId,
      item.deviceId,
      item.workerId,
      item.clockId,
      item.queue,
      item.worker_pre,
      item.first_byte_wait,
      item.remaining_receive,
      item.parse,
      item.persist_tail,
      item.total,
      item.sum,
      item.candidateSegment,
      item.candidateDurationMs,
    ].join(','),
  );
console.log('rejected request_id,reason');
for (const item of result.rejected)
  console.log(`${item.requestId},${item.reason}`);
console.log(
  `summary accepted=${result.accepted.length} rejected=${result.rejected.length}`,
);
console.log(
  'candidate_segment is the largest measured segment, not proof of a device, network, worker, or parser fault.',
);
