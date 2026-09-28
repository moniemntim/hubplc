import assert from 'node:assert/strict';
import { fixtures } from './fixtures.mjs';
import {
  MAX_ERRORS,
  MAX_RAW_INPUT_BYTES,
  SCHEMA_VERSION,
  validateRawRecipe,
} from './recipe-validation.mjs';

const paths = (outcome) =>
  outcome.errors.map(({ path, code }) => `${path}:${code}`);

const r7 = validateRawRecipe(fixtures.r7);
assert.equal(r7.valid, false);
assert.equal(r7.incomplete, false);
assert.deepEqual(paths(r7), [
  '/temp:required',
  '/speed:finite_number_required',
  '/low:low_must_not_exceed_high',
]);
assert.deepEqual(r7.errors[1].raw, { kind: 'string', value: 'abc' });

for (const name of ['valid', 'zero', 'equalLowHigh', 'bounds']) {
  const outcome = validateRawRecipe(fixtures[name]);
  assert.equal(outcome.valid, true, name);
  assert.equal(
    outcome.candidate?.canonical.startsWith('{"schema_version":"recipe-v3"'),
    true,
  );
  assert.match(outcome.candidate?.sha256 ?? '', /^[0-9a-f]{64}$/);
}
assert.equal(
  validateRawRecipe(fixtures.emptyString).errors[0].path,
  '/recipe_id',
);
assert.equal(validateRawRecipe(fixtures.nonFinite).errors[0].path, '/temp');
assert.equal(
  validateRawRecipe(fixtures.invalidJsonNaN).errors[0].code,
  'invalid_json',
);
assert.deepEqual(paths(validateRawRecipe(fixtures.unknown)), [
  '/speeed:unknown_field',
]);
const limited = validateRawRecipe(fixtures.errorLimit);
assert.equal(limited.incomplete, true);
assert.equal(limited.errors.length, MAX_ERRORS);
assert.equal(limited.errors.at(-1)?.code, 'error_limit_reached');
assert.equal(
  validateRawRecipe(fixtures.unsupportedVersion).errors[0].code,
  'unsupported_schema_version',
);
assert.equal(
  validateRawRecipe(fixtures.nonObject).errors[0].code,
  'top_level_object_required',
);
const tooLarge = validateRawRecipe('x'.repeat(MAX_RAW_INPUT_BYTES + 1));
assert.equal(tooLarge.raw.truncated, true);
assert.equal(tooLarge.incomplete, true);
assert.equal(tooLarge.raw.text, null);
assert.equal(SCHEMA_VERSION, 'recipe-v3');
assert.equal(
  validateRawRecipe('{"schema_version":"recipe-v3","temp":1,"temp":2}')
    .errors[0].code,
  'duplicate_key',
);
assert.equal(
  validateRawRecipe(fixtures.valid.replace('"R1"', '"   "')).valid,
  false,
);

console.log('self-test: PASS');
