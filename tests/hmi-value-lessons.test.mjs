import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assessReadback,
  submitEngineering,
  submitRawString,
} from '../lib/hmi-value-lessons.ts';
import {
  createNumericState,
  submitEngineeringText,
  submitRawEnvelope,
} from '../public/examples/numeric-input/numeric-input-model.mjs';
import {
  fixtures,
  METADATA,
} from '../public/examples/operation-log/fixtures.mjs';
import { analyzeOperationLog } from '../public/examples/operation-log/model.mjs';

void test('numeric lesson retains last wire for range, step and raw-string rejection', () => {
  const initial = { lastWire: 250 };
  const range = submitEngineering(initial, '100.04');
  assert.deepEqual(
    [range.result.decision, range.result.lastWire],
    ['RANGE_REJECTED', 250],
  );
  const step = submitEngineering(range.state, '25.35');
  assert.deepEqual(
    [step.result.decision, step.result.lastWire],
    ['STEP_REJECTED', 250],
  );
  const accepted = submitEngineering(step.state, '25.30');
  assert.deepEqual(
    [accepted.result.decision, accepted.result.lastWire],
    ['ACCEPT', 253],
  );
  const raw = submitRawString(accepted.state, '7');
  assert.deepEqual(
    [raw.result.decision, raw.result.lastWire],
    ['RAW_TYPE_REJECTED', 253],
  );
});

void test('readback lesson distinguishes accepted, mismatched, conflict and proof', () => {
  assert.deepEqual(assessReadback('accepted').result, 'accepted');
  assert.deepEqual(assessReadback('wrong-operation').result, 'unknown');
  assert.match(
    assessReadback('revision-conflict').reason,
    /observed=43 expected=42/,
  );
  const applied = assessReadback('complete-proof');
  assert.deepEqual([applied.result, applied.evidence.length], ['applied', 6]);
  assert.throws(
    () => assessReadback('unexpected'),
    /Unknown readback scenario/,
  );
});

void test('page cases match the downloadable numeric and operation-log models', () => {
  let pageState = { lastWire: 250 };
  let sourceState = createNumericState();
  for (const value of [
    '100.04',
    '25.35',
    '25.30',
    '0',
    '100.0',
    '25.03',
    '100.00',
    '00',
    ' 7',
  ]) {
    const page = submitEngineering(pageState, value);
    const source = submitEngineeringText(sourceState, value);
    assert.deepEqual(
      [page.result.decision, page.result.lastWire, page.result.lastEngineering],
      [
        source.result.decision,
        source.result.lastWire,
        source.result.lastEngineering,
      ],
      value,
    );
    pageState = page.state;
    sourceState = source.state;
  }
  const pageRaw = submitRawString(pageState, '7');
  const sourceRaw = submitRawEnvelope(sourceState, {
    schema: 'numeric-input/v1',
    unit: 'C',
    scale: 10,
    raw: '7',
  });
  assert.deepEqual(
    [pageRaw.result.decision, pageRaw.result.lastWire],
    [sourceRaw.result.decision, sourceRaw.result.lastWire],
  );

  for (const [scenario, fixture] of [
    ['accepted', 'acceptedOnly'],
    ['wrong-operation', 'sameValueWrongOperation'],
    ['revision-conflict', 'revisionConflict'],
    ['complete-proof', 'success'],
  ]) {
    const page = assessReadback(scenario);
    const source = analyzeOperationLog(METADATA, fixtures[fixture]);
    assert.deepEqual(
      [page.result, page.reason],
      [source.result, source.reason],
      scenario,
    );
  }
});
