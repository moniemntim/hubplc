const finite = (x) =>
  typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= 1e9;
export const fivePoints = () => [
  [0, 0],
  [100, 8],
  [200, 20],
  [300, 35],
  [400, 55],
];
function validate(points) {
  if (!Array.isArray(points) || points.length < 2 || points.length > 32)
    return false;
  return Array.from(points).every(
    (p, i) =>
      Array.isArray(p) &&
      p.length === 2 &&
      finite(p[0]) &&
      finite(p[1]) &&
      (i === 0 || p[0] > points[i - 1][0]),
  );
}
export class Curve {
  #points;
  #version = 1;
  constructor(points = fivePoints()) {
    if (!validate(points)) throw new TypeError('TABLE_ERROR');
    this.#points = points.map((p) => [...p]);
  }
  replace(points, expectedVersion) {
    if (
      !Number.isSafeInteger(expectedVersion) ||
      expectedVersion !== this.#version
    )
      return { state: 'VERSION_CONFLICT', version: this.#version };
    if (!validate(points))
      return { state: 'TABLE_ERROR', version: this.#version };
    if (this.#version === Number.MAX_SAFE_INTEGER)
      return { state: 'VERSION_CAPACITY', version: this.#version };
    this.#points = points.map((p) => [...p]);
    this.#version++;
    return { state: 'COMMITTED', version: this.#version };
  }
  calculate(x, quality = 'Good', unit = 'count') {
    const rejected = (state) => ({
      state,
      valid: false,
      y: null,
      version: this.#version,
    });
    if (quality !== 'Good') return rejected('QUALITY_INVALID');
    if (unit !== 'count') return rejected('UNIT_MISMATCH');
    if (!finite(x)) return rejected('INPUT_INVALID');
    const points = this.#points,
      last = points.length - 1;
    if (x < points[0][0] || x > points[last][0])
      return rejected('OUT_OF_RANGE');
    const exact = points.findIndex((p) => p[0] === x);
    if (exact >= 0)
      return {
        state: 'NODE',
        valid: true,
        x,
        y: points[exact][1],
        left: exact,
        right: exact,
        ratio: 0,
        version: this.#version,
      };
    const right = points.findIndex((p) => p[0] > x),
      left = right - 1;
    const ratio = (x - points[left][0]) / (points[right][0] - points[left][0]);
    const y = points[left][1] + ratio * (points[right][1] - points[left][1]);
    if (!Number.isFinite(y)) return rejected('NUMERIC_ERROR');
    return {
      state: 'INTERPOLATED',
      valid: true,
      x,
      y,
      left,
      right,
      ratio,
      version: this.#version,
    };
  }
}
