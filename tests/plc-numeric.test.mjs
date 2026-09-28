import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  COMPARISON_CASES,
  COMPARISON_POLICY,
  ROUNDING_CASES,
  compareEngineeringValues,
  formatRaw100,
  formatRounded10,
  roundRaw100ToTenth,
  runKnownCases,
} from '../public/examples/plc-numeric/plc-numeric-offline-example.mjs';

const examplePath = fileURLToPath(
  new URL(
    '../public/examples/plc-numeric/plc-numeric-offline-example.mjs',
    import.meta.url,
  ),
);

void test('known floating comparison cases follow their declared policy', () => {
  for (const testCase of COMPARISON_CASES) {
    const result = compareEngineeringValues(
      testCase.a,
      testCase.b,
      testCase.policy,
    );
    assert.equal(result.status, 'OK', testCase.id);
    assert.equal(result.close, testCase.expectedClose, testCase.id);
  }
});

void test('comparison rejects invalid values and invalid policies explicitly', () => {
  assert.equal(
    compareEngineeringValues(Number.NaN, 25, COMPARISON_POLICY).status,
    'INVALID_VALUE',
  );
  assert.equal(
    compareEngineeringValues(25, Number.POSITIVE_INFINITY, COMPARISON_POLICY)
      .status,
    'INVALID_VALUE',
  );
  assert.equal(
    compareEngineeringValues(25, 25, {
      absoluteTolerance: -0.01,
      relativeTolerance: 0,
    }).status,
    'INVALID_POLICY',
  );
  assert.equal(compareEngineeringValues(25, 25, null).status, 'INVALID_POLICY');
  assert.equal(
    compareEngineeringValues(Number.MAX_VALUE, -Number.MAX_VALUE).status,
    'DIFFERENCE_OVERFLOW',
  );
  assert.equal(
    compareEngineeringValues(Number.MAX_VALUE, Number.MAX_VALUE, {
      absoluteTolerance: 0,
      relativeTolerance: 2,
    }).status,
    'LIMIT_OVERFLOW',
  );
});

void test('fixed-point midpoint rule is symmetric and retains exact tenths', () => {
  for (const testCase of ROUNDING_CASES) {
    const result = roundRaw100ToTenth(testCase.raw100);
    assert.equal(result.status, 'OK', testCase.id);
    assert.equal(result.rounded10, testCase.expectedRounded10, testCase.id);
  }
  assert.equal(formatRaw100(-1235), '-12.35');
  assert.equal(formatRounded10(-124), '-12.4');
  assert.equal(Object.is(roundRaw100ToTenth(-4).rounded10, -0), false);
});

void test('fixed-point rounding rejects non-integers and range breaches', () => {
  assert.equal(roundRaw100ToTenth(12.5).status, 'INVALID_RAW100');
  assert.equal(roundRaw100ToTenth(100_001).status, 'OUT_OF_RANGE');
});

void test('offline report includes both independent acceptance groups', () => {
  const report = runKnownCases();
  assert.equal(report.floatingComparison.length, COMPARISON_CASES.length);
  assert.equal(report.fixedPointRounding.length, ROUNDING_CASES.length);
  assert.ok(
    report.floatingComparison.every(
      (testCase) => testCase.result.status === 'OK',
    ),
  );
  assert.ok(
    report.fixedPointRounding.every(
      (testCase) => testCase.result.status === 'OK',
    ),
  );
});

void test('self-contained example runs as a CLI and emits JSON', () => {
  const execution = spawnSync(process.execPath, [examplePath], {
    encoding: 'utf8',
  });
  assert.equal(execution.status, 0, execution.stderr);
  const report = JSON.parse(execution.stdout);
  assert.equal(report.floatingComparison.length, COMPARISON_CASES.length);
  assert.equal(report.fixedPointRounding.length, ROUNDING_CASES.length);
});
