import { FILTER, FIXTURE } from './fixtures.mjs';
import { createAlarmReport } from './model.mjs';

// Change this only to the documented canonical timestamps before running.
const ackUtc = '2026-09-16T21:59:59.999Z';
const beforeEndAck = structuredClone(FIXTURE);
beforeEndAck.occurrences.find(
  (row) => row.occurrenceId === 'OCC-P02',
).transitions[1].atUtc = ackUtc;
const report = createAlarmReport(beforeEndAck, FILTER);
console.log(
  'P02 ACK=' +
    ackUtc +
    ' -> unacked=' +
    report.unackedAtCutoff.map((row) => row.occurrenceId).join(',') +
    ' unknown=' +
    report.unknownHistory.map((row) => row.occurrenceId).join(','),
);
