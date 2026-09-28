// Synchronous teaching state machine. No I/O, actuator output or identity service.
export const WAIT_MS = 5000;
export const FRESH_MS = 1000;
export const MAX_REQUESTS = 16;
const exact = (x, keys) =>
  x !== null &&
  typeof x === 'object' &&
  Object.getPrototypeOf(x) === Object.prototype &&
  Reflect.ownKeys(x).length === keys.length &&
  keys.every(
    (k) =>
      Object.hasOwn(x, k) && Object.prototype.propertyIsEnumerable.call(x, k),
  );
const time = (x) => Number.isSafeInteger(x) && x >= 0;
const clients = ['HMI-A', 'HMI-B'];
const modes = ['Auto', 'Manual', 'Maintenance'];
const signalKeys = [
  'acquiredAt',
  'quality',
  'stopped',
  'autoIdle',
  'manualIdle',
  'sequenceReady',
  'interlock',
  'testStopped',
  'restoreReviewed',
];
const goodSignals = (x) =>
  exact(x, signalKeys) &&
  time(x.acquiredAt) &&
  ['Good', 'Bad', 'Unknown'].includes(x.quality) &&
  signalKeys.slice(2).every((k) => typeof x[k] === 'boolean');
const goodRequest = (x) =>
  exact(x, ['requestId', 'target', 'client', 'expectedRevision']) &&
  typeof x.requestId === 'string' &&
  /^[A-Z][A-Z0-9-]{0,19}$/.test(x.requestId) &&
  x.requestId.trim() === x.requestId &&
  modes.includes(x.target) &&
  clients.includes(x.client) &&
  Number.isSafeInteger(x.expectedRevision) &&
  x.expectedRevision > 0;
export const signals = (acquiredAt = 0, changes = {}) => ({
  acquiredAt,
  quality: 'Good',
  stopped: false,
  autoIdle: false,
  manualIdle: true,
  sequenceReady: true,
  interlock: true,
  testStopped: true,
  restoreReviewed: false,
  ...changes,
});
export const request = (
  requestId,
  target = 'Manual',
  expectedRevision = 1,
  client = 'HMI-A',
) => ({ requestId, target, client, expectedRevision });
export class ModeAuthority {
  #now = 0;
  #mode = 'Auto';
  #owner = 'PLC';
  #revision = 1;
  #signals = signals();
  #pending = null;
  #records = new Map();
  #clock(now) {
    if (!time(now) || now < this.#now)
      throw new TypeError('monotonic clock required');
    this.#now = now;
  }
  #known() {
    return (
      this.#signals.quality === 'Good' &&
      this.#now - this.#signals.acquiredAt < FRESH_MS
    );
  }
  #finish(record, status, reason) {
    record.status = status;
    record.reason = reason;
    record.finishedAt = this.#now;
    record.after = {
      mode: this.#mode,
      owner: this.#owner,
      revision: this.#revision,
    };
    this.#pending = null;
  }
  submit(input, now) {
    this.#clock(now);
    if (!goodRequest(input)) return { decision: 'INVALID_REQUEST' };
    const body = {
      requestId: input.requestId,
      target: input.target,
      client: input.client,
      expectedRevision: input.expectedRevision,
    };
    const prior = this.#records.get(input.requestId);
    if (prior)
      return JSON.stringify(prior.request) === JSON.stringify(body)
        ? { decision: 'REPLAY', record: structuredClone(prior) }
        : { decision: 'REQUEST_CONFLICT' };
    if (this.#records.size >= MAX_REQUESTS)
      return { decision: 'CAPACITY_REACHED' };
    const before = {
      mode: this.#mode,
      owner: this.#owner,
      revision: this.#revision,
    };
    const record = {
      request: body,
      requestedAt: now,
      status: 'PENDING',
      reason: 'WAITING_SCAN',
      before,
      after: null,
      finishedAt: null,
    };
    this.#records.set(input.requestId, record);
    let reason = null;
    if (this.#pending) reason = 'BUSY';
    else if (!this.#known()) reason = 'DATA_UNAVAILABLE';
    else if (input.expectedRevision !== this.#revision)
      reason = 'REVISION_CONFLICT';
    else if (this.#mode !== 'Auto' && input.client !== this.#owner)
      reason = 'NOT_OWNER';
    else if (
      ![
        'Auto>Manual',
        'Manual>Auto',
        'Manual>Maintenance',
        'Maintenance>Manual',
      ].includes(this.#mode + '>' + input.target)
    )
      reason = 'TRANSITION_DENIED';
    if (reason) {
      record.status = 'REJECTED';
      record.reason = reason;
      record.after = { ...before };
      record.finishedAt = now;
      return { decision: 'REJECTED', reason };
    }
    this.#pending = input.requestId;
    return { decision: 'PENDING' };
  }
  // A simulated controller scan observes a complete trusted source sample.
  scan(sample, now) {
    if (
      !goodSignals(sample) ||
      !time(now) ||
      sample.acquiredAt > now ||
      sample.acquiredAt < this.#signals.acquiredAt
    )
      throw new TypeError('invalid source sample');
    this.#clock(now);
    this.#signals = structuredClone(sample);
    if (!this.#pending) return this.view(now);
    const record = this.#records.get(this.#pending);
    if (now - record.requestedAt >= WAIT_MS) {
      this.#finish(record, 'REJECTED', 'TIMEOUT');
      return this.view(now);
    }
    if (!this.#known()) {
      this.#finish(record, 'REJECTED', 'DATA_UNAVAILABLE');
      return this.view(now);
    }
    if (!sample.interlock) {
      this.#finish(record, 'REJECTED', 'INTERLOCK_DENIED');
      return this.view(now);
    }
    let wait = null;
    if (!sample.stopped) wait = 'WAIT_STOPPED';
    else if (!sample.autoIdle) wait = 'WAIT_AUTO_IDLE';
    else if (!sample.manualIdle) wait = 'WAIT_MANUAL_IDLE';
    else if (this.#mode === 'Maintenance' && !sample.testStopped)
      wait = 'WAIT_TEST_STOPPED';
    else if (this.#mode === 'Maintenance' && !sample.restoreReviewed)
      wait = 'WAIT_RESTORE_REVIEW';
    else if (record.request.target === 'Auto' && !sample.sequenceReady)
      wait = 'WAIT_SEQUENCE_READY';
    if (wait) {
      record.reason = wait;
      return this.view(now);
    }
    this.#mode = record.request.target;
    this.#owner = this.#mode === 'Auto' ? 'PLC' : record.request.client;
    this.#revision++;
    this.#finish(record, 'CONFIRMED', 'CONDITIONS_MET');
    return this.view(now);
  }
  cancel(requestId, client, now) {
    this.#clock(now);
    const record = this.#records.get(requestId);
    if (!record) return { decision: 'UNKNOWN_REQUEST' };
    if (client !== record.request.client) return { decision: 'NOT_OWNER' };
    if (record.status !== 'PENDING') return { decision: 'ALREADY_TERMINAL' };
    this.#finish(record, 'CANCELLED', 'CANCELLED_BEFORE_MODE_CHANGE');
    return { decision: 'CANCELLED' };
  }
  result(requestId) {
    const r = this.#records.get(requestId);
    return r ? structuredClone(r) : null;
  }
  view(now) {
    this.#clock(now);
    const known = this.#known();
    return {
      known,
      modeConfirmed: known ? this.#mode : 'Unknown',
      controlOwner: known ? this.#owner : 'Unknown',
      lastRecordedMode: this.#mode,
      modeRevision: this.#revision,
      quality: this.#signals.quality,
      acquiredAt: this.#signals.acquiredAt,
      sourceConditions: structuredClone(this.#signals),
      pending: this.#pending ? this.result(this.#pending) : null,
    };
  }
  inspect() {
    return structuredClone({
      mode: this.#mode,
      owner: this.#owner,
      revision: this.#revision,
      signals: this.#signals,
      records: [...this.#records.values()],
    });
  }
}
