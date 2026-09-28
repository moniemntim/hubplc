// Offline arithmetic model. gapBound is external evidence, never inferred from ticks.
const integer = (x) => Number.isSafeInteger(x) && x >= 0;
export function elapsed({
  bits = 8,
  start,
  now,
  startBoot = 'A',
  nowBoot = 'A',
  gapBound,
}) {
  if (!Number.isInteger(bits) || bits < 1 || bits > 32)
    throw new TypeError('bits must be 1..32');
  const modulus = 2 ** bits;
  if (
    !integer(start) ||
    start >= modulus ||
    !integer(now) ||
    now >= modulus ||
    typeof startBoot !== 'string' ||
    !startBoot ||
    typeof nowBoot !== 'string' ||
    !nowBoot
  )
    throw new TypeError('invalid tick or boot');
  if (startBoot !== nowBoot)
    return { valid: false, reason: 'RESTART', elapsed: null };
  if (!integer(gapBound) || gapBound >= modulus)
    return { valid: false, reason: 'INTERVAL_UNPROVEN', elapsed: null };
  const delta = now >= start ? now - start : modulus - start + now;
  if (delta > gapBound)
    return { valid: false, reason: 'INCONSISTENT_BOUND', elapsed: null };
  return { valid: true, reason: 'OK', elapsed: delta };
}
export function timeout(result, threshold) {
  if (!integer(threshold)) throw new TypeError('invalid threshold');
  return result.valid
    ? result.elapsed >= threshold
      ? 'TIMEOUT'
      : 'WAIT'
    : 'INVALID';
}
// Converts known virtual instants into fixture samples. Not a PLC clock reader.
export function samples(times, bits = 16) {
  if (
    !Array.isArray(times) ||
    !times.length ||
    times.length > 2000 ||
    times[0] !== 0 ||
    !Number.isInteger(bits) ||
    bits < 1 ||
    bits > 32 ||
    times.some((t, i) => !integer(t) || (i > 0 && t < times[i - 1]))
  )
    throw new TypeError('invalid virtual timeline');
  return times.map((t, i) => ({
    tick: t % 2 ** bits,
    boot: 'A',
    gapBound: i === 0 ? 0 : t - times[i - 1],
  }));
}
