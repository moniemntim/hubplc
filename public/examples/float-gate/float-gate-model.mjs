import { Buffer } from 'node:buffer';

const ENDIANS = new Set(['be', 'le']);
const QUALITIES = new Set(['good', 'bad']);

const asHex = (value, width) => `0x${value.toString(16).padStart(width, '0')}`;
const cloneRange = (range) =>
  range !== null && typeof range === 'object'
    ? { min: range.min, max: range.max }
    : range;

const decodeWord = (bytes, endian) =>
  endian === 'be' ? bytes.readUInt32BE(0) : bytes.readUInt32LE(0);

const decodeFloat = (bytes, endian) =>
  endian === 'be' ? bytes.readFloatBE(0) : bytes.readFloatLE(0);

function validateBytesAndEndian(bytes, endian) {
  if (!Buffer.isBuffer(bytes)) throw new TypeError('bytes must be a Buffer');
  if (bytes.length !== 4)
    throw new RangeError('bytes must contain exactly 4 bytes');
  if (!ENDIANS.has(endian)) throw new RangeError('endian must be "be" or "le"');
}

export function decodeBinary32(bytes, endian) {
  validateBytesAndEndian(bytes, endian);
  const bits = decodeWord(bytes, endian);
  const sign = bits >>> 31;
  const exponent = (bits >>> 23) & 0xff;
  const fraction = bits & 0x7fffff;
  const common = {
    bitsHex: asHex(bits, 8),
    bytesHex: bytes.toString('hex'),
    endian,
    sign,
    exponent,
    fractionHex: asHex(fraction, 6),
  };

  if (exponent === 0xff && fraction !== 0)
    return { ...common, classification: 'NAN', finite: false };
  if (exponent === 0xff)
    return {
      ...common,
      classification: sign === 0 ? 'POS_INF' : 'NEG_INF',
      finite: false,
    };
  return {
    ...common,
    classification: 'FINITE',
    finite: true,
    value: decodeFloat(bytes, endian),
  };
}

const rejectedFormat = (
  { bytes, endian, quality, range, provenance },
  error,
) => ({
  bytesHex: Buffer.isBuffer(bytes) ? bytes.toString('hex') : null,
  endian,
  quality,
  range: cloneRange(range),
  provenance,
  classification: null,
  finite: null,
  rangeStatus: 'SKIPPED',
  usable: false,
  decision: 'FORMAT_REJECTED',
  detail: error.message,
});

function validateRecord(record) {
  if (record === null || typeof record !== 'object')
    throw new TypeError('record must be an object');
  if (!QUALITIES.has(record.quality))
    throw new RangeError('quality must be "good" or "bad"');
  if (
    record.range === null ||
    typeof record.range !== 'object' ||
    !Number.isFinite(record.range.min) ||
    !Number.isFinite(record.range.max) ||
    record.range.min > record.range.max
  )
    throw new RangeError('range must have finite min <= max');
  if (typeof record.provenance !== 'string' || record.provenance.length === 0)
    throw new TypeError('provenance must be a non-empty string');
  validateBytesAndEndian(record.bytes, record.endian);
}

/**
 * Decodes one binary32 sample and accepts it only after format, finiteness,
 * source quality, and inclusive engineering-range checks.
 */
export function gateBinary32(record) {
  try {
    validateRecord(record);
  } catch (error) {
    return rejectedFormat(record ?? {}, error);
  }

  const decoded = decodeBinary32(record.bytes, record.endian);
  const range = cloneRange(record.range);
  const common = {
    ...decoded,
    quality: record.quality,
    range,
    provenance: record.provenance,
  };
  if (!decoded.finite)
    return {
      ...common,
      rangeStatus: 'SKIPPED',
      usable: false,
      decision: 'NONFINITE_REJECTED',
    };
  if (record.quality !== 'good')
    return {
      ...common,
      rangeStatus: 'SKIPPED',
      usable: false,
      decision: 'QUALITY_REJECTED',
    };
  const inRange = decoded.value >= range.min && decoded.value <= range.max;
  return {
    ...common,
    rangeStatus: inRange ? 'PASS' : 'FAIL',
    usable: inRange,
    decision: inRange ? 'ACCEPT' : 'RANGE_REJECTED',
  };
}

export function encodeBinary32(value, endian) {
  if (typeof value !== 'number') throw new TypeError('value must be a number');
  if (!ENDIANS.has(endian)) throw new RangeError('endian must be "be" or "le"');
  const bytes = Buffer.alloc(4);
  if (endian === 'be') bytes.writeFloatBE(value, 0);
  else bytes.writeFloatLE(value, 0);
  return bytes;
}

/**
 * A deliberately narrow synthetic operation: both inputs must first survive
 * binary32 rounding. Its provenance is evidence from this model, not a claim
 * about an external device's floating-point exception behavior.
 */
export function multiplyFiniteToBinary32(left, right, endian = 'be') {
  if (!Number.isFinite(left) || !Number.isFinite(right))
    throw new RangeError('operands must be finite JavaScript numbers');
  if (!ENDIANS.has(endian)) throw new RangeError('endian must be "be" or "le"');
  const leftF32 = Math.fround(left);
  const rightF32 = Math.fround(right);
  if (!Number.isFinite(leftF32) || !Number.isFinite(rightF32))
    throw new RangeError('operands must remain finite after binary32 rounding');
  const value = Math.fround(leftF32 * rightF32);
  return {
    bytes: encodeBinary32(value, endian),
    endian,
    provenance: Number.isFinite(value)
      ? 'FINITE_OPERATION_F32_RESULT'
      : 'FINITE_OPERATION_F32_OVERFLOW',
    leftF32,
    rightF32,
  };
}
