export type NumericDecision =
  | 'ACCEPT'
  | 'SYNTAX_REJECTED'
  | 'RANGE_REJECTED'
  | 'STEP_REJECTED'
  | 'RAW_TYPE_REJECTED';

export type NumericState = { lastWire: number };

export type NumericResult = {
  decision: NumericDecision;
  lastWire: number;
  lastEngineering: string;
};

const display = (wire: number) => `${Math.trunc(wire / 10)}.${wire % 10}`;
const result = (
  decision: NumericDecision,
  lastWire: number,
): NumericResult => ({
  decision,
  lastWire,
  lastEngineering: display(lastWire),
});

export function submitEngineering(
  state: NumericState,
  text: string,
): { state: NumericState; result: NumericResult } {
  if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/u.test(text) || text.length > 16)
    return { state, result: result('SYNTAX_REJECTED', state.lastWire) };
  const [whole, fraction = ''] = text.split('.');
  // Keep the decimal text exact without relying on a binary float or a BigInt
  // literal, because this project targets ES2017. The fixed 0.1 step means any
  // non-zero digits after the first fractional digit cannot map to a wire int.
  if (
    whole.length > 3 ||
    Number(whole) > 100 ||
    (whole === '100' && /[1-9]/u.test(fraction))
  )
    return { state, result: result('RANGE_REJECTED', state.lastWire) };
  const significantFraction = fraction.replace(/0+$/u, '');
  if (significantFraction.length > 1)
    return { state, result: result('STEP_REJECTED', state.lastWire) };
  const next = {
    lastWire:
      Number(whole) * 10 +
      (significantFraction === '' ? 0 : Number(significantFraction)),
  };
  return { state: next, result: result('ACCEPT', next.lastWire) };
}

export function submitRawString(
  state: NumericState,
  _raw: string,
): { state: NumericState; result: NumericResult } {
  // The page deliberately keeps this as a string to demonstrate that raw JSON
  // data is a separate entry point and must not be parsed as engineering text.
  return { state, result: result('RAW_TYPE_REJECTED', state.lastWire) };
}

export type ReadbackScenario =
  | 'accepted'
  | 'wrong-operation'
  | 'revision-conflict'
  | 'complete-proof';

export type ReadbackResult = {
  result: 'accepted' | 'unknown' | 'rejected' | 'applied';
  reason: string;
  evidence: string[];
};

const requiredEvidence = [
  'operationId=OP-884',
  'equipment=EQ-A',
  'tag=TEMP_SP',
  'value=55',
  'revisionBefore=42',
  'revisionAfter=43',
];

export function assessReadback(scenario: ReadbackScenario): ReadbackResult {
  if (scenario === 'accepted')
    return {
      result: 'accepted',
      reason: 'accepted_not_applied',
      evidence: ['accepted event'],
    };
  if (scenario === 'wrong-operation')
    return {
      result: 'unknown',
      reason: 'readback_proof_incomplete_or_mismatched',
      evidence: ['value=55', 'operationId=OP-OTHER (需要 OP-884)'],
    };
  if (scenario === 'revision-conflict')
    return {
      result: 'rejected',
      reason: 'VERSION_CONFLICT observed=43 expected=42',
      evidence: [
        'rejected event',
        'observedRevision=43',
        'expectedRevision=42',
      ],
    };
  if (scenario === 'complete-proof')
    return {
      result: 'applied',
      reason: 'correlated_readback_proof',
      evidence: requiredEvidence,
    };
  throw new Error('Unknown readback scenario');
}
