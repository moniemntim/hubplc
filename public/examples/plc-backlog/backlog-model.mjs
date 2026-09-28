const assertSafeInteger = (value, name, { minimum = 0 } = {}) => {
  if (!Number.isSafeInteger(value) || value < minimum)
    throw new RangeError(`${name} must be a safe integer >= ${minimum}`);
};

/**
 * Deterministic single-server FIFO model. Time is supplied as integer
 * milliseconds: it performs no wall-clock wait and makes no PLC CPU-load
 * measurement. A completion at an arrival timestamp is processed first.
 */
export function simulateFifo({ arrivalsMs, serviceMs, waitingCapacity }) {
  if (!Array.isArray(arrivalsMs))
    throw new TypeError('arrivalsMs must be an array');
  assertSafeInteger(serviceMs, 'serviceMs', { minimum: 1 });
  assertSafeInteger(waitingCapacity, 'waitingCapacity');

  let previousArrivalMs = 0;
  for (const [index, arrivalMs] of arrivalsMs.entries()) {
    assertSafeInteger(arrivalMs, `arrivalsMs[${index}]`);
    if (index > 0 && arrivalMs < previousArrivalMs)
      throw new RangeError('arrivalsMs must be monotonic');
    previousArrivalMs = arrivalMs;
  }

  const admitted = [];
  const rejected = [];
  const queue = [];
  const events = [];
  let active = null;

  const start = (job, startMs) => {
    const finishMs = startMs + serviceMs;
    if (!Number.isSafeInteger(finishMs))
      throw new RangeError('startMs + serviceMs must be a safe integer');
    Object.assign(job, { startMs, finishMs, waitMs: startMs - job.arrivalMs });
    active = job;
    events.push({ timeMs: startMs, kind: 'START', jobId: job.id });
  };

  const completeThrough = (timeMs) => {
    while (active !== null && active.finishMs <= timeMs) {
      const completed = active;
      active = null;
      events.push({
        timeMs: completed.finishMs,
        kind: 'FINISH',
        jobId: completed.id,
      });
      if (queue.length > 0) start(queue.shift(), completed.finishMs);
    }
  };

  for (const [index, arrivalMs] of arrivalsMs.entries()) {
    // Completion before arrival is deliberate, including equal timestamps.
    completeThrough(arrivalMs);
    const job = {
      id: `J${index + 1}`,
      arrivalMs,
      startMs: null,
      finishMs: null,
      waitMs: null,
    };
    const activeBefore = active?.id ?? null;
    if (active === null) {
      admitted.push(job);
      events.push({
        timeMs: arrivalMs,
        kind: 'ARRIVE_ADMITTED',
        jobId: job.id,
      });
      start(job, arrivalMs);
    } else if (queue.length < waitingCapacity) {
      admitted.push(job);
      queue.push(job);
      events.push({ timeMs: arrivalMs, kind: 'ARRIVE_QUEUED', jobId: job.id });
    } else {
      const rejectedJob = {
        ...job,
        reason: 'WAITING_CAPACITY_FULL',
        activeJobIdBefore: activeBefore,
        activeJobIdAfter: active?.id ?? null,
      };
      rejected.push(rejectedJob);
      events.push({
        timeMs: arrivalMs,
        kind: 'ARRIVE_REJECTED',
        jobId: job.id,
      });
    }
  }
  completeThrough(Number.MAX_SAFE_INTEGER);
  return { serviceMs, waitingCapacity, admitted, rejected, events };
}

const traceError = (message, overlaps = [], openCalls = []) => ({
  classification: 'INSUFFICIENT_EVIDENCE',
  overlaps,
  openCalls,
  evidenceErrors: [message],
});

const snapshotOpenCalls = (callsByInstance) =>
  [...callsByInstance.entries()].flatMap(([instance, calls]) =>
    calls.map(({ jobId, timeMs }) => ({ instance, jobId, beganAtMs: timeMs })),
  );

const traceEventError = (event, index, lastTimeMs) => {
  if (event === null || typeof event !== 'object' || Array.isArray(event))
    return `events[${index}] must be an object`;
  if (!Number.isSafeInteger(event.timeMs) || event.timeMs < 0)
    return `events[${index}].timeMs must be a nonnegative safe integer`;
  if (event.timeMs < lastTimeMs) return 'events must be monotonic by timeMs';
  if (!['BEGIN', 'END', 'POLL', 'WORK_COMPLETE'].includes(event.kind))
    return `events[${index}].kind is unknown`;
  if (typeof event.jobId !== 'string' || event.jobId.length === 0)
    return `events[${index}].jobId must be a nonempty string`;
  if (typeof event.instance !== 'string' || event.instance.length === 0)
    return `events[${index}].instance must be a nonempty string`;
  return null;
};

/**
 * BEGIN and END are actual entry and return of a call, never the lifecycle of
 * asynchronous work. WORK_COMPLETE records the latter when it is available.
 * A malformed or incomplete trace deliberately gives no overlap conclusion.
 */
export function classifyInstanceTrace(trace) {
  if (trace === null || typeof trace !== 'object' || Array.isArray(trace))
    return traceError('trace must be an object');
  const { events, traceComplete } = trace;
  if (!Array.isArray(events) || events.length === 0)
    return traceError('trace must contain at least one event');
  if (typeof traceComplete !== 'boolean')
    return traceError('traceComplete must be boolean');

  const callsByInstance = new Map();
  const knownJobsByInstance = new Map();
  const completedJobs = new Set();
  const pollCounts = new Map();
  const overlaps = [];
  let lastTimeMs = 0;
  for (const [index, event] of events.entries()) {
    const invalid = traceEventError(event, index, lastTimeMs);
    if (invalid)
      return traceError(invalid, overlaps, snapshotOpenCalls(callsByInstance));
    lastTimeMs = event.timeMs;
    const calls = callsByInstance.get(event.instance) ?? [];
    const knownJobs = knownJobsByInstance.get(event.instance) ?? new Set();
    const jobKey = JSON.stringify([event.instance, event.jobId]);

    if (event.kind === 'BEGIN') {
      if (calls.length > 0)
        overlaps.push({
          instance: event.instance,
          activeJobId: calls.at(-1).jobId,
          activeJobIds: calls.map(({ jobId }) => jobId),
          newJobId: event.jobId,
          atMs: event.timeMs,
        });
      calls.push(event);
      callsByInstance.set(event.instance, calls);
      knownJobs.add(event.jobId);
      knownJobsByInstance.set(event.instance, knownJobs);
    } else if (event.kind === 'END') {
      if (calls.length === 0 || calls.at(-1).jobId !== event.jobId)
        return traceError(
          `events[${index}] END does not return the active call`,
          overlaps,
          snapshotOpenCalls(callsByInstance),
        );
      calls.pop();
      if (calls.length === 0) callsByInstance.delete(event.instance);
    } else if (event.kind === 'POLL') {
      if (!knownJobs.has(event.jobId) || completedJobs.has(jobKey))
        return traceError(
          `events[${index}] POLL does not identify a known pending job`,
          overlaps,
          snapshotOpenCalls(callsByInstance),
        );
      pollCounts.set(jobKey, (pollCounts.get(jobKey) ?? 0) + 1);
    } else if (event.kind === 'WORK_COMPLETE') {
      if (!knownJobs.has(event.jobId) || completedJobs.has(jobKey))
        return traceError(
          `events[${index}] WORK_COMPLETE does not identify a pending job`,
          overlaps,
          snapshotOpenCalls(callsByInstance),
        );
      completedJobs.add(jobKey);
    }
  }

  const openCalls = snapshotOpenCalls(callsByInstance);
  if (!traceComplete)
    return traceError('trace is marked incomplete', overlaps, openCalls);
  if (openCalls.length > 0)
    return traceError(
      'trace claims completeness with unmatched calls',
      overlaps,
      openCalls,
    );
  if (overlaps.length > 0)
    return {
      classification: 'OVERLAPPING_SHARED_INSTANCE',
      overlaps,
      openCalls,
      evidenceErrors: [],
    };
  if ([...pollCounts.values()].some((count) => count >= 2))
    return {
      classification: 'REPEATED_POLL_SAME_WORK',
      overlaps,
      openCalls,
      evidenceErrors: [],
    };
  return {
    classification: 'NO_OVERLAP_OBSERVED',
    overlaps,
    openCalls,
    evidenceErrors: [],
  };
}
