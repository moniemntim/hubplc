import assert from 'node:assert/strict';
import { CRITICAL_FILTER, FILTER, FIXTURE } from './fixtures.mjs';
import { createAlarmReport } from './model.mjs';

const report = createAlarmReport(FIXTURE, FILTER);
assert.deepEqual(
  report.activeTransitions.map((row) => row.occurrenceId),
  ['OCC-P01', 'OCC-P02'],
);
assert.deepEqual(
  report.unackedAtCutoff.map((row) => row.occurrenceId),
  ['OCC-P03', 'OCC-P02'],
);
assert.deepEqual(
  report.unknownHistory.map((row) => row.occurrenceId),
  ['OCC-P05'],
);
assert.deepEqual(createAlarmReport(FIXTURE, CRITICAL_FILTER).rowCount, {
  activeTransitions: 1,
  unackedAtCutoff: 1,
  unknownHistory: 0,
});
console.log(
  'alarm-report self-test: PASS active=P01,P02 unacked=P03,P02 unknown=P05',
);
