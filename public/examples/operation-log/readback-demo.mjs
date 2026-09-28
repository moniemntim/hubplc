import { fixtures, METADATA } from './fixtures.mjs';
import { analyzeOperationLog } from './model.mjs';

const cases = [
  'acceptedOnly',
  'disconnectUnknown',
  'success',
  'sameValueWrongOperation',
  'revisionConflict',
];
for (const name of cases) {
  const outcome = analyzeOperationLog(METADATA, fixtures[name]);
  console.log(`${name}: result=${outcome.result} reason=${outcome.reason}`);
}
console.log('readback demo: PASS');
