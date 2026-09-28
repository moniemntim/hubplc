import { fixtures, METADATA } from './fixtures.mjs';
import { analyzeOperationLog } from './model.mjs';

const events = structuredClone(fixtures.sameValueWrongOperation);
// To make this fixture applied, paste before analyze: events.at(-1).operationId = 'OP-884';
// To test revision mismatch after that line, paste: events.at(-1).revisionAfter = 44;
const outcome = analyzeOperationLog(METADATA, events);
console.log(
  JSON.stringify({
    readbackOperationId: events.at(-1).operationId,
    revisionAfter: events.at(-1).revisionAfter,
    result: outcome.result,
    reason: outcome.reason,
  }),
);
console.log('practice: PASS');
