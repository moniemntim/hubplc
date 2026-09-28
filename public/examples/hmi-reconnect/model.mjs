// Offline controller contract. These event names are not any HMI vendor API.
export function initialHmi() {
  return {
    nowMs: 0,
    generation: 12,
    viewToken: 1,
    mounted: true,
    connected: true,
    refreshing: false,
    snapshot: {
      value: 7,
      revision: 4,
      sourceTime: 100,
      receivedAt: 0,
      stale: false,
    },
    nextQuery: 0,
    nextOperation: 0,
    readQuery: null,
    statusQuery: null,
    command: null,
    armed: false,
    commandSends: 0,
    action: 'initial',
  };
}
const unresolved = (state) =>
  ['sent', 'accepted', 'unknown'].includes(state.command?.status);
const ready = (state) =>
  state.connected &&
  state.mounted &&
  !state.refreshing &&
  !state.snapshot.stale &&
  !unresolved(state);
function nextQuery(state) {
  if (!Number.isSafeInteger(state.nextQuery + 1))
    throw new RangeError('query IDs exhausted');
  return ++state.nextQuery;
}
function requestRead(state) {
  state.readQuery = {
    queryId: nextQuery(state),
    generation: state.generation,
    viewToken: state.viewToken,
  };
  state.refreshing = true;
  state.snapshot.stale = true;
  state.armed = false;
}
function requestStatus(state) {
  state.statusQuery = {
    queryId: nextQuery(state),
    generation: state.generation,
    operationId: state.command.operationId,
  };
}
function same(query, event, keys) {
  return query !== null && keys.every((key) => query[key] === event[key]);
}
export function hmiEvent(before, event) {
  if (!Number.isSafeInteger(event.nowMs) || event.nowMs < before.nowMs)
    throw new RangeError('processing time must be monotonic');
  const state = structuredClone(before);
  state.nowMs = event.nowMs;
  state.action = 'ignored';
  switch (event.type) {
    case 'disconnect':
      if (!state.connected) break;
      if (!Number.isSafeInteger(state.generation + 1))
        throw new RangeError('generation exhausted');
      state.generation++;
      state.connected = false;
      state.snapshot.stale = true;
      state.refreshing = true;
      state.readQuery = null;
      state.statusQuery = null;
      state.armed = false;
      if (unresolved(state)) state.command.status = 'unknown';
      state.action = 'disconnected';
      break;
    case 'connect':
      if (state.connected) break;
      state.connected = true;
      if (state.mounted) requestRead(state);
      if (state.command?.status === 'unknown') requestStatus(state);
      state.action = 'refresh-requested';
      break;
    case 'unmount':
      if (!state.mounted) break;
      if (!Number.isSafeInteger(state.viewToken + 1))
        throw new RangeError('view tokens exhausted');
      state.viewToken++;
      state.mounted = false;
      state.readQuery = null;
      state.armed = false;
      state.action = 'unmounted';
      break;
    case 'mount':
      if (state.mounted) break;
      state.mounted = true;
      if (state.connected) requestRead(state);
      state.action = 'mounted';
      break;
    case 'read-request':
      if (state.connected && state.mounted) {
        requestRead(state);
        state.action = 'read-requested';
      }
      break;
    case 'read-complete':
      if (
        !state.connected ||
        !state.mounted ||
        !same(state.readQuery, event, ['generation', 'viewToken', 'queryId'])
      ) {
        state.action = 'stale-read-ignored';
        break;
      }
      if (
        !Number.isFinite(event.value) ||
        !Number.isSafeInteger(event.revision) ||
        event.revision < state.snapshot.revision ||
        !Number.isSafeInteger(event.sourceTime) ||
        event.sourceTime < 0
      ) {
        state.action = 'invalid-read';
        break;
      }
      state.snapshot = {
        value: event.value,
        revision: event.revision,
        sourceTime: event.sourceTime,
        receivedAt: event.nowMs,
        stale: false,
      };
      state.refreshing = false;
      state.readQuery = null;
      state.action = 'read-applied';
      break;
    case 'button':
      if (typeof event.pressed !== 'boolean')
        throw new TypeError('pressed must be boolean');
      if (!ready(state)) {
        state.armed = false;
        state.action = 'button-blocked';
      } else if (!event.pressed) {
        state.armed = true;
        state.action = 'button-released';
      } else if (state.armed) {
        if (!Number.isSafeInteger(state.nextOperation + 1))
          throw new RangeError('operation IDs exhausted');
        state.command = {
          operationId: `OP${++state.nextOperation}`,
          status: 'sent',
          payload: {
            value: state.snapshot.value,
            revision: state.snapshot.revision,
          },
        };
        state.commandSends++;
        state.armed = false;
        state.action = 'command-submitted';
      }
      break;
    case 'command-result':
      if (!['accepted', 'applied', 'rejected'].includes(event.status))
        throw new TypeError('invalid command result');
      if (
        state.connected &&
        state.command !== null &&
        event.generation === state.generation &&
        event.operationId === state.command?.operationId &&
        ['sent', 'accepted'].includes(state.command.status)
      ) {
        state.command.status = event.status;
        state.action = 'command-result-applied';
      }
      break;
    case 'status-request':
      if (state.connected && state.command?.status === 'unknown') {
        requestStatus(state);
        state.action = 'status-requested';
      }
      break;
    case 'status-complete':
      if (
        !['applied', 'rejected', 'not-found', 'timeout'].includes(event.status)
      )
        throw new TypeError('invalid status response');
      if (
        state.connected &&
        state.command?.status === 'unknown' &&
        same(state.statusQuery, event, ['generation', 'queryId', 'operationId'])
      ) {
        if (['applied', 'rejected'].includes(event.status))
          state.command.status = event.status;
        state.statusQuery = null;
        state.action =
          event.status === 'applied' || event.status === 'rejected'
            ? 'status-resolved'
            : 'still-unknown';
      }
      break;
    default:
      throw new TypeError('unknown teaching event');
  }
  return state;
}

// Real Node EventEmitter subscription management; browser/HMI listeners are not tested.
export function buttonBinding(emitter, onButton) {
  let mounted = false;
  const handler = (pressed) => onButton(pressed);
  return {
    mount() {
      if (!mounted) {
        emitter.on('button', handler);
        mounted = true;
      }
    },
    unmount() {
      if (mounted) {
        emitter.off('button', handler);
        mounted = false;
      }
    },
  };
}
