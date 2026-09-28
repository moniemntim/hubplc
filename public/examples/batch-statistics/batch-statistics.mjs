export const LIMITS = Object.freeze({
  scale: 10,
  minScaled: -400,
  maxScaled: 1800,
  maxSamples: 4,
});

function noStatistics(
  status,
  inputCount = 0,
  totalCount = inputCount,
  rejected = [],
  batchError = null,
) {
  return {
    status,
    inputCount,
    totalCount,
    validCount: 0,
    rejectedCount: rejected.length,
    rejected,
    batchError,
    sumScaled: null,
    mean: null,
    minScaled: null,
    maxScaled: null,
  };
}

function reject(index, reason) {
  return { index, reason };
}

export function summarizeBatch(samples) {
  if (!Array.isArray(samples)) {
    throw new TypeError('samples must be an array');
  }
  if (samples.length > LIMITS.maxSamples) {
    return noStatistics(
      'INPUT_LIMIT_EXCEEDED',
      samples.length,
      0,
      [],
      'CAPACITY_LIMIT',
    );
  }
  if (samples.length === 0) {
    return noStatistics('NO_DATA');
  }

  let sumScaled = 0;
  let minScaled = null;
  let maxScaled = null;
  let validCount = 0;
  const rejected = [];

  samples.forEach((sample, index) => {
    if (sample?.quality !== 'GOOD') {
      rejected.push(reject(index, 'QUALITY_REJECTED'));
      return;
    }
    if (!Number.isSafeInteger(sample.scaledValue)) {
      rejected.push(reject(index, 'VALUE_NOT_SAFE_INTEGER'));
      return;
    }
    if (
      sample.scaledValue < LIMITS.minScaled ||
      sample.scaledValue > LIMITS.maxScaled
    ) {
      rejected.push(reject(index, 'RANGE_REJECTED'));
      return;
    }

    const value = sample.scaledValue;
    sumScaled += value;
    validCount += 1;
    minScaled = minScaled === null ? value : Math.min(minScaled, value);
    maxScaled = maxScaled === null ? value : Math.max(maxScaled, value);
  });

  if (validCount === 0) {
    return noStatistics(
      'NO_VALID_SAMPLE',
      samples.length,
      samples.length,
      rejected,
    );
  }
  return {
    status: 'OK',
    inputCount: samples.length,
    totalCount: samples.length,
    validCount,
    rejectedCount: rejected.length,
    rejected,
    batchError: null,
    sumScaled,
    mean: { numerator: sumScaled, denominator: validCount },
    minScaled,
    maxScaled,
  };
}

export function formatScaled(scaledValue) {
  if (!Number.isSafeInteger(scaledValue)) return null;
  const sign = scaledValue < 0 ? '-' : '';
  const absolute = Math.abs(scaledValue);
  return `${sign}${Math.floor(absolute / LIMITS.scale)}.${String(absolute % LIMITS.scale).padStart(1, '0')}`;
}

export function formatMean(mean) {
  if (mean === null) return null;
  const denominator = mean.denominator * LIMITS.scale;
  const sign = mean.numerator < 0 ? '-' : '';
  const absolute = Math.abs(mean.numerator);
  const whole = Math.floor(absolute / denominator);
  let remainder = absolute % denominator;
  let fraction = '';
  for (let index = 0; index < 6; index += 1) {
    remainder *= 10;
    fraction += String(Math.floor(remainder / denominator));
    remainder %= denominator;
  }
  return `${sign}${whole}.${fraction}`;
}
