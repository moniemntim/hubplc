// Teaching model only: one task, ordinary memory, refresh before program.
export function runScanSequence(inputs, order = 'forward') {
  if (
    !Array.isArray(inputs) ||
    inputs.some((input) => typeof input !== 'boolean')
  ) {
    throw new TypeError('inputs must be an array of booleans');
  }
  if (!['forward', 'swapped'].includes(order))
    throw new RangeError('unknown order');
  let m10 = false;
  let m11 = false;
  let out = false;
  return inputs.map((input, index) => {
    const applied = out; // boundary applies the previous program result
    const previousM10 = m10;
    if (order === 'forward') {
      m10 = input;
      m11 = m10;
    } else {
      m11 = m10;
      m10 = input;
    }
    out = m11;
    return { scan: index + 1, input, previousM10, m10, m11, out, applied };
  });
}

// Ideal sampling of the half-open ON interval [startMs, endMs).
export function samplePulse(startMs, endMs, sampleTimes) {
  if (
    !Number.isFinite(startMs) ||
    !Number.isFinite(endMs) ||
    startMs >= endMs
  ) {
    throw new RangeError('pulse must have finite start < end');
  }
  if (
    !Array.isArray(sampleTimes) ||
    sampleTimes.some((time) => !Number.isFinite(time))
  ) {
    throw new TypeError('sample times must be finite numbers');
  }
  return sampleTimes.map((timeMs) => ({
    timeMs,
    input: timeMs >= startMs && timeMs < endMs,
  }));
}

// A always assigns the request, B always assigns false. No physical output.
export function traceWriters(request, order = 'AB') {
  if (typeof request !== 'boolean')
    throw new TypeError('request must be boolean');
  if (!['AB', 'BA'].includes(order))
    throw new RangeError('unknown writer order');
  let out = false;
  const writes = order.split('').map((writer) => {
    out = writer === 'A' ? request : false;
    return { writer, out };
  });
  return { writes, out };
}

// Fixed demo policy: either request may turn on; Stop or Alarm blocks both.
// Ordinary logic only, not an emergency stop or safety control function.
// No latching or restart inhibition: clearing a block restores a held request.
export function decideOutput({ autoRequest, manualRequest, stop, alarm }) {
  if (
    [autoRequest, manualRequest, stop, alarm].some(
      (value) => typeof value !== 'boolean',
    )
  ) {
    throw new TypeError('all decision inputs must be boolean');
  }
  const block = stop || alarm;
  return {
    autoRequest,
    manualRequest,
    stop,
    alarm,
    block,
    out: (autoRequest || manualRequest) && !block,
  };
}
