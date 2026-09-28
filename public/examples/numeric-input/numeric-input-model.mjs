export const CONTRACT = Object.freeze({
  schema: 'numeric-input/v1',
  unit: 'C',
  scale: 10,
  minEngineering: 0,
  maxEngineering: 100,
  stepEngineering: '0.1',
  minWire: 0,
  maxWire: 1000,
  maxTextLength: 16,
});

const DECIMAL_TEXT = /^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/;
const RAW_ENVELOPE_KEYS = new Set(['schema', 'unit', 'scale', 'raw']);

const failure = (decision, detail) => ({ accepted: false, decision, detail });

const accepted = (wire) => ({ accepted: true, decision: 'ACCEPT', wire });

function hasExactRawEnvelopeShape(envelope) {
  if (
    envelope === null ||
    typeof envelope !== 'object' ||
    Array.isArray(envelope) ||
    Object.getPrototypeOf(envelope) !== Object.prototype
  )
    return false;
  const enumerableKeys = Object.keys(envelope);
  const ownNames = Object.getOwnPropertyNames(envelope);
  return (
    enumerableKeys.length === RAW_ENVELOPE_KEYS.size &&
    ownNames.length === RAW_ENVELOPE_KEYS.size &&
    Object.getOwnPropertySymbols(envelope).length === 0 &&
    enumerableKeys.every((key) => RAW_ENVELOPE_KEYS.has(key))
  );
}

function validateWireInteger(wire) {
  return (
    typeof wire === 'number' &&
    Number.isSafeInteger(wire) &&
    wire >= CONTRACT.minWire &&
    wire <= CONTRACT.maxWire
  );
}

export function engineeringTextForWire(wire) {
  if (!validateWireInteger(wire))
    throw new RangeError(
      'wire must be an integer in the configured wire range',
    );
  return `${Math.trunc(wire / CONTRACT.scale)}.${wire % CONTRACT.scale}`;
}

/**
 * Exact ASCII decimal parser. It derives the wire integer from a BigInt
 * numerator/denominator, never from a binary floating-point approximation.
 */
export function validateEngineeringText(text) {
  if (typeof text !== 'string')
    return failure('SYNTAX_REJECTED', 'TEXT_MUST_BE_STRING');
  if (text.length === 0) return failure('SYNTAX_REJECTED', 'TEXT_EMPTY');
  if (text.length > CONTRACT.maxTextLength)
    return failure('SYNTAX_REJECTED', 'TEXT_TOO_LONG');
  if (text.trim() !== text)
    return failure('SYNTAX_REJECTED', 'ASCII_WHITESPACE_NOT_ALLOWED');
  if (!DECIMAL_TEXT.test(text))
    return failure('SYNTAX_REJECTED', 'ASCII_DECIMAL_REQUIRED');

  const [wholeText, fractionText = ''] = text.split('.');
  const denominator = 10n ** BigInt(fractionText.length);
  const numerator =
    BigInt(wholeText) * denominator +
    BigInt(fractionText === '' ? 0 : fractionText);
  const min = BigInt(CONTRACT.minEngineering) * denominator;
  const max = BigInt(CONTRACT.maxEngineering) * denominator;
  if (numerator < min || numerator > max)
    return failure('RANGE_REJECTED', 'ENGINEERING_RANGE_0_TO_100');

  const wireNumerator = numerator * BigInt(CONTRACT.scale);
  if (wireNumerator % denominator !== 0n)
    return failure('STEP_REJECTED', 'STEP_0_1_REQUIRED');
  return accepted(Number(wireNumerator / denominator));
}

/**
 * Separate raw-envelope validator for the server boundary. It deliberately
 * requires a JavaScript integer, rather than parsing a text raw field.
 */
export function validateRawEnvelope(envelope) {
  if (!hasExactRawEnvelopeShape(envelope))
    return failure(
      'RAW_ENVELOPE_REJECTED',
      'EXACT_OWN_ENVELOPE_FIELDS_REQUIRED',
    );
  if (envelope.schema !== CONTRACT.schema)
    return failure('SCHEMA_REJECTED', 'SCHEMA_MISMATCH');
  if (envelope.unit !== CONTRACT.unit)
    return failure('UNIT_REJECTED', 'UNIT_MISMATCH');
  if (envelope.scale !== CONTRACT.scale)
    return failure('SCALE_REJECTED', 'SCALE_MISMATCH');
  if (typeof envelope.raw !== 'number' || !Number.isSafeInteger(envelope.raw))
    return failure('RAW_TYPE_REJECTED', 'RAW_SAFE_INTEGER_REQUIRED');
  if (envelope.raw < CONTRACT.minWire || envelope.raw > CONTRACT.maxWire)
    return failure('RANGE_REJECTED', 'WIRE_RANGE_0_TO_1000');
  return accepted(envelope.raw);
}

export function createNumericState(initialWire = 250) {
  if (!validateWireInteger(initialWire))
    throw new RangeError(
      'initialWire must be an integer in the configured wire range',
    );
  return { lastWire: initialWire };
}

const apply = (state, result) => {
  if (
    state === null ||
    typeof state !== 'object' ||
    !validateWireInteger(state.lastWire)
  )
    throw new TypeError('state must contain a valid lastWire integer');
  const nextState = result.accepted ? { lastWire: result.wire } : state;
  return {
    state: nextState,
    result: {
      ...result,
      lastWire: nextState.lastWire,
      lastEngineering: engineeringTextForWire(nextState.lastWire),
    },
  };
};

export const submitEngineeringText = (state, text) =>
  apply(state, validateEngineeringText(text));

export const submitRawEnvelope = (state, envelope) =>
  apply(state, validateRawEnvelope(envelope));
