import { FILTER, FIXTURE, SHIFT } from './fixtures.mjs';
import { createAlarmReport } from './model.mjs';

const report = createAlarmReport(FIXTURE, FILTER);
console.log(
  'night-shift local=[' +
    SHIFT.startLocal +
    ',' +
    SHIFT.endLocal +
    ') utc=[' +
    SHIFT.startUtc +
    ',' +
    SHIFT.endUtc +
    ')',
);
console.log(JSON.stringify(report, null, 2));
console.log(
  'snapshot active=P01,P02 unacked=P03,P02 unknown=P05 coverageCompleteForFilter=false',
);
