// Offline timestamp model. It does not emulate a PLC, CODESYS Trace, I/O,
// task jitter, or physical signals.
function finite(name, value, positive = false) {
  if (!Number.isFinite(value) || (positive && value <= 0))
    throw new TypeError(
      `${name} must be a ${positive ? 'positive ' : ''}finite number`,
    );
}

function safeInteger(name, value, positive = false) {
  if (!Number.isSafeInteger(value) || (positive && value <= 0))
    throw new TypeError(
      `${name} must be a ${positive ? 'positive ' : ''}safe integer`,
    );
}

export function buildTaskRows({ cycleMs, totalScans, eventScans }) {
  finite('cycleMs', cycleMs, true);
  safeInteger('totalScans', totalScans, true);
  if (totalScans > 10000 || !Number.isFinite(cycleMs * totalScans))
    throw new RangeError(
      'teaching model is limited to 10000 scans and a finite time range',
    );
  if (!Array.isArray(eventScans))
    throw new TypeError('eventScans must be an array');
  let previousEvent = 0;
  for (const scan of eventScans) {
    safeInteger('event scan', scan, true);
    if (scan > totalScans || scan <= previousEvent)
      throw new RangeError('eventScans must be unique, increasing task scans');
    previousEvent = scan;
  }

  const events = new Set(eventScans);
  let eventCount = 0;
  return Array.from({ length: totalScans }, (_, index) => {
    const scan = index + 1;
    const oneShot = events.has(scan);
    if (oneShot) eventCount += 1;
    return {
      scan,
      startMs: index * cycleMs,
      endMs: (index + 1) * cycleMs,
      oneShot,
      eventCount,
    };
  });
}

export function makeSampleTimes({ totalMs, intervalMs, phaseMs }) {
  finite('totalMs', totalMs, true);
  finite('intervalMs', intervalMs, true);
  finite('phaseMs', phaseMs);
  if (phaseMs < 0 || phaseMs >= intervalMs)
    throw new RangeError('phaseMs must be >= 0 and < intervalMs');
  const count = Math.max(0, Math.ceil((totalMs - phaseMs) / intervalMs));
  if (!Number.isSafeInteger(count) || count > 10000)
    throw new RangeError('teaching model is limited to 10000 samples');
  return Array.from(
    { length: count },
    (_, index) => phaseMs + index * intervalMs,
  ).filter((timeMs) => timeMs < totalMs);
}

function validateRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0)
    throw new TypeError('rows must be a non-empty task-row array');
  for (const [index, row] of rows.entries()) {
    if (
      row?.scan !== index + 1 ||
      !Number.isFinite(row.startMs) ||
      !Number.isFinite(row.endMs) ||
      row.startMs >= row.endMs ||
      typeof row.oneShot !== 'boolean' ||
      !Number.isSafeInteger(row.eventCount) ||
      row.eventCount < 0 ||
      (index > 0 && rows[index - 1].endMs !== row.startMs)
    )
      throw new TypeError(
        'rows must be contiguous task rows from buildTaskRows',
      );
  }
}

// A timestamp at endMs belongs to the next task row: [startMs, endMs).
export function sampleTrace(rows, sampleTimes) {
  validateRows(rows);
  if (!Array.isArray(sampleTimes))
    throw new TypeError('sampleTimes must be an array');
  const firstStart = rows[0].startMs;
  const finalEnd = rows.at(-1).endMs;
  return sampleTimes.map((timeMs) => {
    finite('sample time', timeMs);
    if (timeMs < firstStart || timeMs >= finalEnd)
      throw new RangeError('sample time must be inside the task-row range');
    const row = rows.find(
      (candidate) => timeMs >= candidate.startMs && timeMs < candidate.endMs,
    );
    return {
      timeMs,
      scan: row.scan,
      oneShot: row.oneShot,
      eventCount: row.eventCount,
    };
  });
}

export function summarizeTrace(samples) {
  if (!Array.isArray(samples) || samples.length === 0)
    throw new TypeError('samples must be a non-empty sample array');
  return {
    samples: samples.length,
    oneShotScans: samples
      .filter((sample) => sample.oneShot)
      .map((sample) => sample.scan),
    lastSampledEventCount: samples.at(-1).eventCount,
  };
}
