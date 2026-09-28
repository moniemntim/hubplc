import { elapsed } from './tick.mjs';
const durationOK = (x) => Number.isSafeInteger(x) && x >= 0 && x <= 1000000000;
// Virtual work completes at start + injected duration; completion is observed at scan.
export function run({
  mode = 'phase',
  period = 1000,
  bits = 16,
  scans,
  durations = [80],
  maxEvents = 32,
}) {
  if (
    !['phase', 'completion'].includes(mode) ||
    !durationOK(period) ||
    period === 0 ||
    !Number.isInteger(bits) ||
    bits < 1 ||
    bits > 32 ||
    !Array.isArray(scans) ||
    scans.length === 0 ||
    scans.length > 2000 ||
    !Array.isArray(durations) ||
    durations.length === 0 ||
    durations.length > 32 ||
    durations.some((x) => !durationOK(x)) ||
    !Number.isInteger(maxEvents) ||
    maxEvents < 1 ||
    maxEvents > 32
  )
    throw new TypeError('invalid scheduler configuration');
  const events = [],
    skips = [];
  let total = 0,
    next = 0,
    busy = null,
    previous = null,
    missed = 0,
    fault = null;
  for (const sample of scans) {
    if (
      sample === null ||
      typeof sample !== 'object' ||
      typeof sample.boot !== 'string' ||
      !sample.boot
    )
      throw new TypeError('invalid sample');
    const step = elapsed({
      bits,
      start: previous?.tick ?? sample.tick,
      now: sample.tick,
      startBoot: previous?.boot ?? sample.boot,
      nowBoot: sample.boot,
      gapBound: sample.gapBound,
    });
    if (!step.valid) {
      fault = step.reason;
      break;
    }
    if (!Number.isSafeInteger(total + step.elapsed)) {
      fault = 'TIME_RANGE';
      break;
    }
    total += step.elapsed;
    previous = { ...sample };
    if (busy !== null && total >= busy.finish) {
      busy.observedFinish = total;
      busy.status = 'COMPLETE';
      busy = null;
      if (mode === 'completion') next = total + period;
    }
    if (!Number.isSafeInteger(next)) {
      fault = 'TIME_RANGE';
      break;
    }
    if (total < next) continue;
    if (mode === 'completion' && busy !== null) continue;
    let target = next;
    if (mode === 'phase') {
      const due = Math.floor((total - next) / period) + 1;
      const skipped = busy !== null ? due : due - 1;
      if (skipped > 0) {
        skips.push({
          firstTarget: next,
          count: skipped,
          observed: total,
          reason: busy !== null ? 'BUSY' : 'COALESCED',
        });
        missed += skipped;
      }
      target = next + (due - 1) * period;
      next += due * period;
      if (busy !== null) continue;
    }
    if (events.length >= maxEvents) {
      fault = 'EVENT_CAPACITY';
      break;
    }
    const duration = durations[events.length % durations.length];
    if (!Number.isSafeInteger(total + duration)) {
      fault = 'TIME_RANGE';
      break;
    }
    busy = {
      target,
      start: total,
      finish: total + duration,
      observedFinish: null,
      duration,
      lateness: total - target,
      status: 'RUNNING',
    };
    events.push(busy);
  }
  return structuredClone({
    mode,
    elapsed: total,
    nextTarget: mode === 'completion' && busy !== null ? null : next,
    missed,
    events,
    skips,
    fault,
  });
}
