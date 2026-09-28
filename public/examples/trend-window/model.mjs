export const DAY_MS = 86400000;
export const MAX_SEGMENTS = 128;
export const MAX_TENTHS = 1000000;
const exact = (value, keys) =>
  value !== null &&
  typeof value === 'object' &&
  Object.getPrototypeOf(value) === Object.prototype &&
  Reflect.ownKeys(value).length === keys.length &&
  keys.every(
    (key) =>
      Object.hasOwn(value, key) &&
      Object.prototype.propertyIsEnumerable.call(value, key),
  );
const validTime = (value) => Number.isSafeInteger(value) && value >= 0;
const segment = (value) =>
  exact(value, ['startMs', 'endMs', 'valueTenths', 'quality']) &&
  validTime(value.startMs) &&
  validTime(value.endMs) &&
  value.startMs < value.endMs &&
  Number.isSafeInteger(value.valueTenths) &&
  Math.abs(value.valueTenths) <= MAX_TENTHS &&
  ['Good', 'Bad'].includes(value.quality);
const rawPoint = (value) =>
  exact(value, ['atMs', 'valueTenths']) &&
  validTime(value.atMs) &&
  Number.isSafeInteger(value.valueTenths) &&
  Math.abs(value.valueTenths) <= MAX_TENTHS;
const asC = (numerator, denominator) =>
  Number(numerator) / Number(denominator) / 10;

export function analyzeWindow({ segments, windowStartMs, windowEndMs }) {
  if (
    !Array.isArray(segments) ||
    segments.length === 0 ||
    segments.length > MAX_SEGMENTS ||
    !validTime(windowStartMs) ||
    !validTime(windowEndMs) ||
    windowStartMs >= windowEndMs
  )
    throw new TypeError('window input invalid');
  if (!segments.every(segment)) throw new TypeError('segment shape invalid');
  for (let index = 1; index < segments.length; index += 1)
    if (segments[index].startMs < segments[index - 1].endMs)
      throw new TypeError('segments overlap or are unordered');
  let knownDuration = 0;
  let weightedTenthsMs = 0n;
  let maxTenths = null;
  for (const item of segments) {
    const start = Math.max(item.startMs, windowStartMs);
    const end = Math.min(item.endMs, windowEndMs);
    if (end <= start || item.quality !== 'Good') continue;
    const duration = end - start;
    knownDuration += duration;
    weightedTenthsMs += BigInt(duration) * BigInt(item.valueTenths);
    maxTenths =
      maxTenths === null
        ? item.valueTenths
        : Math.max(maxTenths, item.valueTenths);
  }
  const duration = windowEndMs - windowStartMs;
  return {
    windowStartMs,
    windowEndMs,
    duration,
    knownDuration,
    coverage: knownDuration / duration,
    fullWindowMeanC:
      knownDuration === duration
        ? asC(weightedTenthsMs, BigInt(duration))
        : null,
    knownMeanC:
      knownDuration === 0 ? null : asC(weightedTenthsMs, BigInt(knownDuration)),
    maxC: maxTenths === null ? null : maxTenths / 10,
  };
}
export function rawChangeSimpleMean({ seed, changes }) {
  if (
    !rawPoint(seed) ||
    !Array.isArray(changes) ||
    changes.length === 0 ||
    changes.length + 1 > MAX_SEGMENTS ||
    !changes.every(rawPoint)
  )
    throw new TypeError('raw change input invalid');
  const all = [seed, ...changes];
  for (let index = 1; index < all.length; index += 1)
    if (all[index].atMs <= all[index - 1].atMs)
      throw new TypeError('raw changes must be strictly monotonic and unique');
  return all.reduce((sum, item) => sum + item.valueTenths, 0) / all.length / 10;
}
