import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Offline numerical acceptance examples for the two accompanying HubPLC articles.
 *
 * Run with: node public/examples/plc-numeric/plc-numeric-offline-example.mjs
 *
 * This is a JavaScript (IEEE 754 binary64) reference implementation. It neither
 * connects to a PLC nor proves the representation, instruction semantics, or
 * overflow behavior of a particular PLC REAL/LREAL implementation.
 */

export const COMPARISON_POLICY = Object.freeze({
  absoluteTolerance: 0.05,
  relativeTolerance: 0,
});

export const RELATIVE_COMPARISON_POLICY = Object.freeze({
  absoluteTolerance: 0.01,
  relativeTolerance: 0.0001,
});

export const EXACT_BOUNDARY_COMPARISON_POLICY = Object.freeze({
  absoluteTolerance: 0.5,
  relativeTolerance: 0,
});

export const ROUNDING_POLICY = Object.freeze({
  inputScale: 100,
  outputScale: 10,
  minimumRaw100: -100_000,
  maximumRaw100: 100_000,
  tieRule: 'nearest-away-from-zero',
});

function invalidComparison(status) {
  return {
    status,
    difference: null,
    scale: null,
    relativeLimit: null,
    limit: null,
    close: false,
  };
}

/**
 * Compares two finite engineering values. The acceptance limit is
 * max(absoluteTolerance, relativeTolerance * max(abs(a), abs(b))).
 */
export function compareEngineeringValues(a, b, policy = COMPARISON_POLICY) {
  if (policy === null || typeof policy !== 'object') {
    return invalidComparison('INVALID_POLICY');
  }
  const { absoluteTolerance, relativeTolerance } = policy;
  if (
    !Number.isFinite(absoluteTolerance) ||
    !Number.isFinite(relativeTolerance) ||
    absoluteTolerance < 0 ||
    relativeTolerance < 0
  ) {
    return invalidComparison('INVALID_POLICY');
  }
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return invalidComparison('INVALID_VALUE');
  }

  const difference = Math.abs(a - b);
  if (!Number.isFinite(difference)) {
    return invalidComparison('DIFFERENCE_OVERFLOW');
  }
  const scale = Math.max(Math.abs(a), Math.abs(b));
  const relativeLimit = relativeTolerance * scale;
  if (!Number.isFinite(relativeLimit)) {
    return invalidComparison('LIMIT_OVERFLOW');
  }
  const limit = Math.max(absoluteTolerance, relativeLimit);
  return {
    status: 'OK',
    difference,
    scale,
    relativeLimit,
    limit,
    close: difference <= limit,
  };
}

function invalidRounding(status) {
  return {
    status,
    rounded10: null,
    remainder: null,
  };
}

/**
 * Rounds a signed, exact hundredths-of-a-unit integer to tenths. At a midpoint,
 * the magnitude increases, then the input sign is restored.
 */
export function roundRaw100ToTenth(raw100) {
  if (!Number.isSafeInteger(raw100)) {
    return invalidRounding('INVALID_RAW100');
  }
  if (
    raw100 < ROUNDING_POLICY.minimumRaw100 ||
    raw100 > ROUNDING_POLICY.maximumRaw100
  ) {
    return invalidRounding('OUT_OF_RANGE');
  }

  const magnitude = Math.abs(raw100);
  const quotient = Math.floor(magnitude / 10);
  const remainder = magnitude % 10;
  const roundedMagnitude = quotient + (remainder >= 5 ? 1 : 0);
  return {
    status: 'OK',
    rounded10:
      roundedMagnitude === 0
        ? 0
        : raw100 < 0
          ? -roundedMagnitude
          : roundedMagnitude,
    remainder,
  };
}

function formatScaled(value, scale, decimalPlaces) {
  if (!Number.isSafeInteger(value)) return null;
  const sign = value < 0 ? '-' : '';
  const magnitude = Math.abs(value);
  const whole = Math.floor(magnitude / scale);
  const fraction = String(magnitude % scale).padStart(decimalPlaces, '0');
  return `${sign}${whole}.${fraction}`;
}

export function formatRaw100(raw100) {
  return formatScaled(raw100, ROUNDING_POLICY.inputScale, 2);
}

export function formatRounded10(rounded10) {
  return formatScaled(rounded10, ROUNDING_POLICY.outputScale, 1);
}

export const COMPARISON_CASES = Object.freeze([
  {
    id: 'within-fixed-process-window',
    a: 25.049,
    b: 25,
    policy: COMPARISON_POLICY,
    expectedClose: true,
  },
  {
    id: 'outside-fixed-process-window',
    a: 25.051,
    b: 25,
    policy: COMPARISON_POLICY,
    expectedClose: false,
  },
  {
    id: 'decimal-boundary-representation-rejects',
    a: 25.05,
    b: 25,
    policy: COMPARISON_POLICY,
    expectedClose: false,
  },
  {
    id: 'binary-exact-boundary-includes-equality',
    a: 1.5,
    b: 1,
    policy: EXACT_BOUNDARY_COMPARISON_POLICY,
    expectedClose: true,
  },
  {
    id: 'near-zero-uses-absolute-floor',
    a: 0.001,
    b: 0,
    policy: RELATIVE_COMPARISON_POLICY,
    expectedClose: true,
  },
  {
    id: 'relative-policy-accepts-large-value-difference',
    a: 10_000.5,
    b: 10_000,
    policy: RELATIVE_COMPARISON_POLICY,
    expectedClose: true,
  },
  {
    id: 'fixed-process-window-rejects-that-same-difference',
    a: 10_000.5,
    b: 10_000,
    policy: COMPARISON_POLICY,
    expectedClose: false,
  },
]);

export const ROUNDING_CASES = Object.freeze([
  { id: 'positive-below-midpoint', raw100: 1234, expectedRounded10: 123 },
  { id: 'positive-midpoint', raw100: 1235, expectedRounded10: 124 },
  { id: 'positive-above-midpoint', raw100: 1236, expectedRounded10: 124 },
  { id: 'negative-below-midpoint', raw100: -1234, expectedRounded10: -123 },
  { id: 'negative-midpoint', raw100: -1235, expectedRounded10: -124 },
  { id: 'negative-above-midpoint', raw100: -1236, expectedRounded10: -124 },
  { id: 'positive-half-tenth', raw100: 5, expectedRounded10: 1 },
  { id: 'negative-half-tenth', raw100: -5, expectedRounded10: -1 },
  { id: 'negative-below-half-tenth', raw100: -4, expectedRounded10: 0 },
  { id: 'zero', raw100: 0, expectedRounded10: 0 },
]);

export function runKnownCases() {
  const floatingComparison = COMPARISON_CASES.map((testCase) => ({
    id: testCase.id,
    a: testCase.a,
    b: testCase.b,
    policy: testCase.policy,
    expectedClose: testCase.expectedClose,
    result: compareEngineeringValues(testCase.a, testCase.b, testCase.policy),
  }));
  const fixedPointRounding = ROUNDING_CASES.map((testCase) => {
    const result = roundRaw100ToTenth(testCase.raw100);
    return {
      id: testCase.id,
      raw100: testCase.raw100,
      rawDisplay: formatRaw100(testCase.raw100),
      expectedRounded10: testCase.expectedRounded10,
      result,
      roundedDisplay: formatRounded10(result.rounded10),
    };
  });
  return { floatingComparison, fixedPointRounding };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
) {
  console.log(JSON.stringify(runKnownCases(), null, 2));
}
