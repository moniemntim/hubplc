export const MAX_POINTS = 32;
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
const time = (value) => Number.isSafeInteger(value) && value >= 0;
const point = (value) =>
  exact(value, ['timeMs', 'value', 'quality']) &&
  time(value.timeMs) &&
  Number.isFinite(value.value) &&
  Math.abs(value.value) <= 1000000 &&
  ['Good', 'Bad'].includes(value.quality);
export function cursor({ points, cursorMs }) {
  if (
    !Array.isArray(points) ||
    points.length < 2 ||
    points.length > MAX_POINTS ||
    !time(cursorMs) ||
    !points.every(point)
  )
    throw new TypeError('cursor input invalid');
  for (let index = 1; index < points.length; index += 1)
    if (points[index].timeMs <= points[index - 1].timeMs)
      throw new TypeError('points must be strict monotonic unique');
  const exactPoint = points.find((item) => item.timeMs === cursorMs);
  if (exactPoint)
    return exactPoint.quality === 'Good'
      ? { kind: 'RAW', value: exactPoint.value, cursorMs }
      : { kind: 'UNAVAILABLE', value: null, cursorMs };
  const right = points.findIndex((item) => item.timeMs > cursorMs);
  if (right < 1) return { kind: 'OUTSIDE', value: null, cursorMs };
  const leftPoint = points[right - 1],
    rightPoint = points[right];
  if (leftPoint.quality !== 'Good' || rightPoint.quality !== 'Good')
    return { kind: 'UNAVAILABLE', value: null, cursorMs };
  return {
    kind: 'INTERPOLATED',
    value:
      leftPoint.value +
      ((rightPoint.value - leftPoint.value) * (cursorMs - leftPoint.timeMs)) /
        (rightPoint.timeMs - leftPoint.timeMs),
    cursorMs,
  };
}
export function alignEvent({ sourceMs, receivedMs, sameClockDomain }) {
  if (
    !time(sourceMs) ||
    !time(receivedMs) ||
    typeof sameClockDomain !== 'boolean'
  )
    throw new TypeError('event input invalid');
  return sameClockDomain
    ? { comparable: true, differenceMs: receivedMs - sourceMs }
    : { comparable: false, differenceMs: null };
}
