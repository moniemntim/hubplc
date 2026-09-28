import assert from 'node:assert/strict';
import { fixtures } from './fixtures.mjs';
import { validateRawRecipe } from './recipe-validation.mjs';

const list = (outcome) =>
  outcome.errors.map(({ path, code }) => `${path}:${code}`).join(',');
const lines = [];
const r7 = validateRawRecipe(fixtures.r7);
assert.deepEqual(
  list(r7),
  '/temp:required,/speed:finite_number_required,/low:low_must_not_exceed_high',
);
lines.push(
  `R7: valid=${r7.valid} incomplete=${r7.incomplete} errors=${list(r7)}`,
);
const valid = validateRawRecipe(fixtures.valid);
assert.equal(valid.valid, true);
assert.equal(
  valid.candidate?.canonical,
  '{"schema_version":"recipe-v3","recipe_id":"R1","temp":25,"speed":1200,"low":20,"high":80}',
);
lines.push(
  `valid: valid=${valid.valid} candidate=${valid.candidate?.candidateId}`,
);
const limited = validateRawRecipe(fixtures.errorLimit);
assert.equal(limited.incomplete, true);
assert.deepEqual(
  list(limited),
  '/high:required,/low:required,/:error_limit_reached',
);
lines.push(
  `error-limit: valid=${limited.valid} incomplete=${limited.incomplete} errors=${list(limited)}`,
);
for (const line of lines) console.log(line);
console.log('demo: PASS');
