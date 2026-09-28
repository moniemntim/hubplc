import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CONTRACT,
  createNumericState,
  engineeringTextForWire,
  submitEngineeringText,
  submitRawEnvelope,
  validateEngineeringText,
  validateRawEnvelope,
} from '../public/examples/numeric-input/numeric-input-model.mjs';

const envelope = (raw) => ({
  schema: CONTRACT.schema,
  unit: CONTRACT.unit,
  scale: CONTRACT.scale,
  raw,
});

void test('exact decimal text accepts bounds and maps trailing zeroes to integer wire units', () => {
  assert.deepEqual(validateEngineeringText('0'), {
    accepted: true,
    decision: 'ACCEPT',
    wire: 0,
  });
  assert.equal(validateEngineeringText('100.0').wire, 1000);
  assert.equal(validateEngineeringText('25.30').wire, 253);
  assert.equal(validateEngineeringText('25.3000000000000').wire, 253);
  assert.equal(engineeringTextForWire(1000), '100.0');
});

void test('range is checked before exact step alignment and never rounds or clamps', () => {
  assert.equal(validateEngineeringText('100.04').decision, 'RANGE_REJECTED');
  assert.equal(validateEngineeringText('25.35').decision, 'STEP_REJECTED');
  const before = createNumericState(250);
  const rejected = submitEngineeringText(before, '25.35');
  assert.equal(rejected.state, before);
  assert.equal(rejected.result.lastWire, 250);
  assert.deepEqual(submitEngineeringText(before, '25.30').state, {
    lastWire: 253,
  });
});

void test('text grammar is ASCII-only with no spaces, signs, locale comma, leading zeroes, or exponent notation', () => {
  for (const text of [
    '',
    ' 25.3',
    '25.3 ',
    '+25.3',
    '-0.1',
    '025.3',
    '25,3',
    '２５.３',
    '25.3\n',
    '1e1',
    '25.',
    '12345678901234567',
  ])
    assert.equal(validateEngineeringText(text).decision, 'SYNTAX_REJECTED');
  const sixteenCharacters = '25.3000000000000';
  assert.equal(sixteenCharacters.length, 16);
  assert.equal(validateEngineeringText(sixteenCharacters).decision, 'ACCEPT');
  assert.equal(
    validateEngineeringText('25.30000000000000').decision,
    'SYNTAX_REJECTED',
  );
});

void test('raw envelope independently validates schema, unit, scale, integer type, and range', () => {
  assert.equal(validateRawEnvelope(envelope(253)).decision, 'ACCEPT');
  assert.equal(
    validateRawEnvelope(envelope('253')).decision,
    'RAW_TYPE_REJECTED',
  );
  assert.equal(
    validateRawEnvelope(envelope(25.3)).decision,
    'RAW_TYPE_REJECTED',
  );
  assert.equal(
    validateRawEnvelope(envelope(NaN)).decision,
    'RAW_TYPE_REJECTED',
  );
  assert.equal(
    validateRawEnvelope(envelope(Infinity)).decision,
    'RAW_TYPE_REJECTED',
  );
  assert.equal(validateRawEnvelope(envelope(-1)).decision, 'RANGE_REJECTED');
  assert.equal(validateRawEnvelope(envelope(0)).decision, 'ACCEPT');
  assert.equal(validateRawEnvelope(envelope(1000)).decision, 'ACCEPT');
  assert.equal(validateRawEnvelope(envelope(1001)).decision, 'RANGE_REJECTED');
  assert.equal(
    validateRawEnvelope({ ...envelope(253), schema: 'numeric-input/v2' })
      .decision,
    'SCHEMA_REJECTED',
  );
  assert.equal(
    validateRawEnvelope({ ...envelope(253), unit: 'F' }).decision,
    'UNIT_REJECTED',
  );
  assert.equal(
    validateRawEnvelope({ ...envelope(253), scale: 100 }).decision,
    'SCALE_REJECTED',
  );
  assert.equal(validateRawEnvelope([]).decision, 'RAW_ENVELOPE_REJECTED');
  assert.equal(
    validateRawEnvelope({
      schema: CONTRACT.schema,
      unit: CONTRACT.unit,
      scale: 10,
    }).decision,
    'RAW_ENVELOPE_REJECTED',
  );
  assert.equal(
    validateRawEnvelope({ ...envelope(253), unexpected: true }).decision,
    'RAW_ENVELOPE_REJECTED',
  );
  const nonEnumerableExtra = envelope(253);
  Object.defineProperty(nonEnumerableExtra, 'hidden', { value: true });
  assert.equal(
    validateRawEnvelope(nonEnumerableExtra).decision,
    'RAW_ENVELOPE_REJECTED',
  );
  const inherited = Object.create({ raw: 253 });
  inherited.schema = CONTRACT.schema;
  inherited.unit = CONTRACT.unit;
  inherited.scale = CONTRACT.scale;
  assert.equal(
    validateRawEnvelope(inherited).decision,
    'RAW_ENVELOPE_REJECTED',
  );
});

void test('raw failure preserves the existing state value', () => {
  const before = createNumericState(253);
  const submitted = submitRawEnvelope(before, envelope('253'));
  assert.equal(submitted.state, before);
  assert.deepEqual(submitted.result, {
    accepted: false,
    decision: 'RAW_TYPE_REJECTED',
    detail: 'RAW_SAFE_INTEGER_REQUIRED',
    lastWire: 253,
    lastEngineering: '25.3',
  });
});
