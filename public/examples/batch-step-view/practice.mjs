import { snapshot } from './fixtures.mjs';
import { projectSnapshot } from './model.mjs';

// Practice: change attempt 2 to 0. The result must be SOURCE_REJECTED,
// never a guessed successful completion.
const input = snapshot({
  sourceEpoch: 8,
  snapshotRevision: 1,
  acquiredAtMs: 130000,
  attempt: 2,
  waitReason: 'VALVE_FEEDBACK_PENDING',
  nextCondition: 'valve open feedback GOOD',
});
console.log(JSON.stringify(projectSnapshot(input, 130000)));
