import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { fixtures } from '../public/examples/recipe-validation/fixtures.mjs';
import {
  MAX_ERRORS,
  MAX_RAW_INPUT_BYTES,
  validateRawRecipe,
} from '../public/examples/recipe-validation/recipe-validation.mjs';

const keys = (result) =>
  result.errors.map(({ path, code }) => `${path}:${code}`);

void test('R7 has exactly required, type, then cross-field errors with raw distinction', () => {
  const result = validateRawRecipe(fixtures.r7);
  assert.deepEqual(keys(result), [
    '/temp:required',
    '/speed:finite_number_required',
    '/low:low_must_not_exceed_high',
  ]);
  assert.deepEqual(result.errors[0].raw, { kind: 'missing' });
  assert.deepEqual(result.errors[1].raw, { kind: 'string', value: 'abc' });
  assert.equal(result.raw.text, fixtures.r7);
});

void test('valid zero, equality, and boundary fixtures produce candidates without deployment', () => {
  for (const fixture of ['valid', 'zero', 'equalLowHigh', 'bounds']) {
    const result = validateRawRecipe(fixtures[fixture]);
    assert.equal(result.valid, true, fixture);
    assert.equal(result.incomplete, false, fixture);
    assert.match(result.candidate?.sha256 ?? '', /^[0-9a-f]{64}$/);
    assert.match(
      result.candidate?.canonical ?? '',
      /^\{"schema_version":"recipe-v3"/,
    );
  }
});

void test('invalid JSON, non-finite values, unknown fields, versions, and non-objects stop correctly', () => {
  assert.deepEqual(keys(validateRawRecipe(fixtures.invalidJsonNaN)), [
    '/:invalid_json',
  ]);
  assert.deepEqual(keys(validateRawRecipe(fixtures.nonFinite)), [
    '/temp:finite_number_required',
  ]);
  assert.deepEqual(keys(validateRawRecipe(fixtures.unknown)), [
    '/speeed:unknown_field',
  ]);
  assert.deepEqual(keys(validateRawRecipe(fixtures.unsupportedVersion)), [
    '/schema_version:unsupported_schema_version',
  ]);
  assert.deepEqual(keys(validateRawRecipe(fixtures.nonObject)), [
    '/:top_level_object_required',
  ]);
});

void test('error limit and raw input bound explicitly report incomplete results', () => {
  const limited = validateRawRecipe(fixtures.errorLimit);
  assert.equal(limited.errors.length, MAX_ERRORS);
  assert.equal(limited.errors.at(-1)?.code, 'error_limit_reached');
  assert.equal(limited.incomplete, true);
  const tooLarge = validateRawRecipe('x'.repeat(MAX_RAW_INPUT_BYTES + 1));
  assert.equal(tooLarge.raw.truncated, true);
  assert.equal(tooLarge.raw.text, null);
  assert.equal(tooLarge.incomplete, true);
});

void test('downloaded self-test and demo pass', () => {
  const folder = 'public/examples/recipe-validation';
  assert.match(
    execFileSync(process.execPath, ['self-test.mjs'], {
      cwd: folder,
      encoding: 'utf8',
    }),
    /self-test: PASS/,
  );
  assert.match(
    execFileSync(process.execPath, ['demo.mjs'], {
      cwd: folder,
      encoding: 'utf8',
    }),
    /demo: PASS/,
  );
});

void test('ambiguous duplicate keys including Unicode escapes are rejected before field validation', () => {
  for (const text of [
    '{"schema_version":"recipe-v3","temp":1,"temp":2}',
    String.raw`{"schema_version":"recipe-v3","temp":1,"\u0074emp":2}`,
  ]) {
    const result = validateRawRecipe(text);
    assert.equal(result.valid, false);
    assert.deepEqual(keys(result), ['/temp:duplicate_key']);
    assert.equal(result.raw.text, text);
    assert.equal(result.candidate, null);
  }
});

void test('stable candidate ignores key order; escaped unknown paths and whitespace ID stay invalid', () => {
  const input = JSON.parse(fixtures.valid);
  const reordered = Object.fromEntries(Object.entries(input).reverse());
  assert.deepEqual(
    validateRawRecipe(JSON.stringify(reordered)).candidate,
    validateRawRecipe(fixtures.valid).candidate,
  );
  assert.equal(
    validateRawRecipe(JSON.stringify({ ...input, recipe_id: '   ' })).valid,
    false,
  );
  const unknown = { ...input, 'a/b~c': { nested: 'quoted " { : }' } };
  assert.deepEqual(keys(validateRawRecipe(JSON.stringify(unknown))), [
    '/a~1b~0c:unknown_field',
  ]);
  assert.deepEqual(
    keys(
      validateRawRecipe(JSON.stringify({ ...input, temp: 181, speed: '1200' })),
    ),
    ['/speed:finite_number_required', '/temp:out_of_range'],
  );
});
