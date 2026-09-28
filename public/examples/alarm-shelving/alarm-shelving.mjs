export const MAX_SHELVES = 8;
export const MAX_LEDGER = 16;
export const MAX_LOG = 64;
export const FRESH_WITHIN_MS = 5000;

const clone = (state) => ({
  ...state,
  source: { ...state.source },
  shelves: state.shelves.map((item) => ({ ...item })),
  ledger: state.ledger.map((item) => ({ ...item })),
  log: state.log.map((item) => ({ ...item })),
});
const ownExact = (value, keys) => {
  if (
    value === null ||
    typeof value !== 'object' ||
    Object.getPrototypeOf(value) !== Object.prototype
  )
    return false;
  const own = Reflect.ownKeys(value);
  return (
    own.length === keys.length &&
    keys.every(
      (key) =>
        own.includes(key) &&
        Object.prototype.propertyIsEnumerable.call(value, key),
    )
  );
};
const safeTime = (now, previous) =>
  Number.isSafeInteger(now) && now >= previous;
const validId = (value) =>
  typeof value === 'string' &&
  value.trim() === value &&
  /^[A-Za-z0-9_-]{1,20}$/u.test(value);
const hasControl = (value) => {
  for (const character of value) {
    const code = character.codePointAt(0);
    if (code <= 31 || code === 127) return true;
  }
  return false;
};
const validText = (value) =>
  typeof value === 'string' &&
  value.length <= 120 &&
  value.trim().length > 0 &&
  !hasControl(value);
const currentShelf = (state) =>
  state.shelves.find((item) => item.shelfId === state.currentShelfId) ?? null;
const payload = (request) =>
  JSON.stringify({
    epoch: request.epoch,
    actor: request.actor,
    owner: request.owner,
    reason: request.reason,
    durationMs: request.durationMs,
  });
const shelfRequest = (request) =>
  ownExact(request, [
    'epoch',
    'requestId',
    'actor',
    'owner',
    'reason',
    'durationMs',
  ]) &&
  Number.isSafeInteger(request.epoch) &&
  request.epoch > 0 &&
  validId(request.requestId) &&
  request.actor === 'Operator' &&
  validText(request.owner) &&
  validText(request.reason) &&
  Number.isSafeInteger(request.durationMs) &&
  request.durationMs >= 1 &&
  request.durationMs <= 30000;
const sourceRequest = (request, now) =>
  ownExact(request, ['epoch', 'active', 'acked', 'quality', 'sourceAt']) &&
  Number.isSafeInteger(request.epoch) &&
  request.epoch > 0 &&
  typeof request.active === 'boolean' &&
  typeof request.acked === 'boolean' &&
  ['Good', 'Bad'].includes(request.quality) &&
  Number.isSafeInteger(request.sourceAt) &&
  request.sourceAt >= 0 &&
  request.sourceAt <= now;

function log(state, action, extra = {}) {
  state.log.push({
    seq: state.nextLogSeq++,
    time: state.now,
    action,
    ...extra,
  });
  state.lastDecision = action;
}
function frozen(state, action) {
  return {
    ...state,
    fault: state.fault ?? 'log_capacity',
    known: false,
    lastDecision: action,
  };
}
function begin(state, now) {
  if (!safeTime(now, state.now)) throw new TypeError('time invalid');
  if (state.fault) return null;
  if (state.log.length + 2 > state.maxLog) return false;
  const next = clone(state);
  next.now = now;
  return next;
}
function expire(next) {
  const shelf = currentShelf(next);
  if (shelf && next.now >= shelf.expiresAt) {
    shelf.endedAt = next.now;
    shelf.end = 'expired';
    next.currentShelfId = null;
    log(next, 'shelf_expired', { shelfId: shelf.shelfId });
  }
}
function finish(state, now, action) {
  const next = begin(state, now);
  if (next === null) return frozen(state, 'fault_blocked');
  if (next === false) return frozen(state, 'log_capacity_fault');
  expire(next);
  return action(next);
}

export function initialShelving({
  maxShelves = MAX_SHELVES,
  maxLedger = MAX_LEDGER,
  maxLog = MAX_LOG,
} = {}) {
  if (
    ![maxShelves, maxLedger, maxLog].every(Number.isSafeInteger) ||
    maxShelves < 1 ||
    maxShelves > MAX_SHELVES ||
    maxLedger < 1 ||
    maxLedger > MAX_LEDGER ||
    maxLog < 2 ||
    maxLog > MAX_LOG
  )
    throw new TypeError('capacity invalid');
  return {
    now: 0,
    epoch: 1,
    nextShelfId: 1,
    nextLogSeq: 1,
    source: { active: null, acked: null, quality: 'Unknown', sourceAt: null },
    shelves: [],
    currentShelfId: null,
    ledger: [],
    log: [],
    fault: null,
    known: true,
    lastDecision: null,
    maxShelves,
    maxLedger,
    maxLog,
  };
}
export function view(state) {
  const shelf = currentShelf(state);
  const fresh =
    state.source.sourceAt !== null &&
    state.now - state.source.sourceAt <= FRESH_WITHIN_MS;
  return {
    epoch: state.epoch,
    active: state.source.active,
    ackedSnapshot: state.source.acked,
    quality: state.source.quality,
    fresh,
    shelved: shelf !== null,
    alarmVisible: state.source.active === true && shelf === null,
    qualityWarningVisible:
      state.source.quality !== 'Good' ||
      !fresh ||
      !state.known ||
      state.fault !== null,
    known: state.known,
    fault: state.fault,
  };
}
export function sample(state, now, request) {
  return finish(state, now, (next) => {
    if (!sourceRequest(request, now)) {
      log(next, 'sample_rejected');
      return next;
    }
    if (request.epoch !== next.epoch) {
      log(next, 'sample_rejected_epoch');
      return next;
    }
    if (
      next.source.sourceAt !== null &&
      request.sourceAt <= next.source.sourceAt
    ) {
      log(next, 'sample_rejected_not_newer');
      return next;
    }
    if (request.quality === 'Bad') {
      next.source = {
        ...next.source,
        epoch: request.epoch,
        quality: 'Bad',
        sourceAt: request.sourceAt,
      };
      next.known = true;
      log(next, 'sample_bad');
      return next;
    }
    next.source = { ...request };
    next.known = true;
    log(next, 'sample');
    return next;
  });
}
export function advance(state, now) {
  return finish(state, now, (next) => {
    log(next, 'advance');
    return next;
  });
}
export function timedShelve(state, now, request) {
  return finish(state, now, (next) => {
    if (!shelfRequest(request)) {
      log(next, 'shelve_rejected_request');
      return next;
    }
    const prior = next.ledger.find(
      (item) => item.requestId === request.requestId,
    );
    const body = payload(request);
    if (prior) {
      log(
        next,
        prior.payload === body
          ? request.epoch === next.epoch
            ? 'shelve_replay'
            : 'shelve_historical_replay'
          : 'shelve_request_conflict',
        { requestId: request.requestId },
      );
      return next;
    }
    if (request.epoch !== next.epoch) {
      log(next, 'shelve_rejected_epoch', { requestId: request.requestId });
      return next;
    }
    if (next.currentShelfId !== null) {
      log(next, 'shelve_rejected_already_shelved', {
        requestId: request.requestId,
      });
      return next;
    }
    if (next.shelves.length >= next.maxShelves) {
      next.fault = 'shelf_capacity';
      next.known = false;
      log(next, 'shelf_capacity_fault');
      return next;
    }
    if (next.ledger.length >= next.maxLedger) {
      next.fault = 'ledger_capacity';
      next.known = false;
      log(next, 'ledger_capacity_fault');
      return next;
    }
    if (next.now > Number.MAX_SAFE_INTEGER - request.durationMs) {
      log(next, 'shelve_rejected_time_overflow');
      return next;
    }
    if (
      next.source.active !== true ||
      next.source.quality !== 'Good' ||
      !view(next).fresh
    ) {
      log(next, 'shelve_rejected_source_not_eligible');
      return next;
    }
    const shelfId = `S${next.nextShelfId++}`;
    next.shelves.push({
      shelfId,
      requestId: request.requestId,
      owner: request.owner,
      reason: request.reason,
      actor: request.actor,
      startedAt: next.now,
      expiresAt: next.now + request.durationMs,
      endedAt: null,
      end: null,
    });
    next.currentShelfId = shelfId;
    next.ledger.push({ requestId: request.requestId, payload: body });
    log(next, 'shelved', { shelfId, requestId: request.requestId });
    return next;
  });
}
export function unshelve(state, now, request) {
  return finish(state, now, (next) => {
    if (
      !ownExact(request, ['epoch', 'actor']) ||
      !Number.isSafeInteger(request.epoch) ||
      request.epoch !== next.epoch ||
      request.actor !== 'Operator'
    ) {
      log(next, 'unshelve_rejected_request');
      return next;
    }
    const shelf = currentShelf(next);
    if (!shelf) {
      log(next, 'unshelve_no_current_shelf');
      return next;
    }
    shelf.endedAt = now;
    shelf.end = 'manual';
    next.currentShelfId = null;
    log(next, 'unshelved', { shelfId: shelf.shelfId });
    return next;
  });
}
export function restart(state, now) {
  return finish(state, now, (next) => {
    next.epoch += 1;
    next.source = {
      active: null,
      acked: null,
      quality: 'Unknown',
      sourceAt: null,
    };
    const shelf = currentShelf(next);
    if (shelf) {
      shelf.endedAt = now;
      shelf.end = 'restart';
    }
    next.currentShelfId = null;
    next.known = false;
    log(next, 'restart_unknown_unshelved');
    return next;
  });
}
