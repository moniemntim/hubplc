const finite = (x) =>
  typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= 1e9;
export function normalize(angle) {
  if (!finite(angle))
    throw new TypeError('angle must be finite and within +/-1e9 degrees');
  const remainder = angle % 360;
  const value = remainder < 0 ? remainder + 360 : remainder;
  return value === 0 || value === 360 ? 0 : value;
}
export function shortest(previous, current) {
  const from = normalize(previous),
    to = normalize(current);
  const raw = to - from;
  let delta = raw;
  if (delta > 180) delta -= 360;
  else if (delta <= -180) delta += 360;
  return { from, to, raw, delta, tie: Math.abs(raw) === 180 };
}
export class AngleTracker {
  #previous = null;
  #sum = 0;
  #speed;
  constructor(maxSpeed = 360) {
    if (!finite(maxSpeed) || maxSpeed <= 0 || maxSpeed > 1e6)
      throw new TypeError('invalid maximum speed');
    this.#speed = maxSpeed;
  }
  update({ angle, at, quality = 'Good', boot = 'A' }) {
    const invalid = (reason) => {
      this.#previous = null;
      this.#sum = 0;
      return { state: reason, delta: null, segmentTotal: null };
    };
    if (quality !== 'Good') return invalid('QUALITY_INVALID');
    if (!finite(angle)) return invalid('ANGLE_INVALID');
    if (
      !Number.isSafeInteger(at) ||
      at < 0 ||
      typeof boot !== 'string' ||
      !boot
    )
      return invalid('CONTEXT_INVALID');
    const value = normalize(angle),
      previous = this.#previous;
    if (previous === null) {
      this.#previous = { value, at, boot };
      return { state: 'BASELINE', delta: null, segmentTotal: 0 };
    }
    if (boot !== previous.boot) return invalid('RESTART');
    const gap = at - previous.at;
    if (gap <= 0) return invalid('TIME_INVALID');
    const bound = (this.#speed * gap) / 1000;
    if (!Number.isFinite(bound) || bound >= 180)
      return invalid('HALF_TURN_UNPROVEN');
    const { delta } = shortest(previous.value, value);
    if (Math.abs(delta) === 180 || Math.abs(delta) > bound + 1e-9)
      return invalid('SPEED_INCONSISTENT');
    if (Math.abs(this.#sum + delta) > 1e9) return invalid('ACCUMULATOR_RANGE');
    this.#sum += delta;
    this.#previous = { value, at, boot };
    return { state: 'TRACKED', delta, segmentTotal: this.#sum };
  }
}
