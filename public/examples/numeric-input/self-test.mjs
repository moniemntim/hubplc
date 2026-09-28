import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  CONTRACT,
  createNumericState,
  submitEngineeringText,
  submitRawEnvelope,
  validateEngineeringText,
  validateRawEnvelope,
} from './numeric-input-model.mjs';

const fixture = JSON.parse(
  await readFile(new URL('./fixture.json', import.meta.url), 'utf8'),
);

void test('fixture shows range then step rejection without replacing the prior valid value', () => {
  let state = createNumericState(fixture.initialWire);
  const range = submitEngineeringText(state, fixture.engineering[0].text);
  state = range.state;
  assert.deepEqual(
    [range.result.decision, range.result.lastWire],
    ['RANGE_REJECTED', 250],
  );
  const step = submitEngineeringText(state, fixture.engineering[1].text);
  state = step.state;
  assert.deepEqual(
    [step.result.decision, step.result.lastWire],
    ['STEP_REJECTED', 250],
  );
  const exact = submitEngineeringText(state, fixture.engineering[2].text);
  assert.deepEqual(
    [exact.result.decision, exact.result.wire, exact.result.lastWire],
    ['ACCEPT', 253, 253],
  );
});

void test('raw envelope requires the fixed schema, C unit, scale 10, and integer raw', () => {
  let state = createNumericState(253);
  const rejected = submitRawEnvelope(state, fixture.raw[0].envelope);
  state = rejected.state;
  assert.deepEqual(
    [rejected.result.decision, rejected.result.lastWire],
    ['RAW_TYPE_REJECTED', 253],
  );
  const accepted = submitRawEnvelope(state, fixture.raw[1].envelope);
  assert.deepEqual(
    [accepted.result.decision, accepted.result.lastWire],
    ['ACCEPT', 7],
  );
  assert.equal(CONTRACT.scale, 10);
});

void test('trailing decimal zeroes produce the same exact wire integer', () => {
  assert.equal(validateEngineeringText('25.30').wire, 253);
  assert.equal(validateEngineeringText('25.3000000000000').wire, 253);
});

void test('raw envelope accepts only the four own enumerable contract fields', () => {
  const valid = fixture.raw[1].envelope;
  assert.equal(validateRawEnvelope(valid).decision, 'ACCEPT');
  assert.equal(
    validateRawEnvelope({ ...valid, extra: true }).decision,
    'RAW_ENVELOPE_REJECTED',
  );
  assert.equal(validateRawEnvelope([]).decision, 'RAW_ENVELOPE_REJECTED');
  assert.equal(
    validateRawEnvelope({
      schema: CONTRACT.schema,
      unit: CONTRACT.unit,
      scale: CONTRACT.scale,
    }).decision,
    'RAW_ENVELOPE_REJECTED',
  );
  const inherited = Object.create({ raw: 7 });
  inherited.schema = CONTRACT.schema;
  inherited.unit = CONTRACT.unit;
  inherited.scale = CONTRACT.scale;
  assert.equal(
    validateRawEnvelope(inherited).decision,
    'RAW_ENVELOPE_REJECTED',
  );
});
