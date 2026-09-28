import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { initialHmi, hmiEvent, buttonBinding } from './model.mjs';
let state = initialHmi();
function step(nowMs, type, fields = {}) {
  state = hmiEvent(state, { nowMs, type, ...fields });
  console.log(
    JSON.stringify({
      nowMs,
      type,
      action: state.action,
      generation: state.generation,
      value: state.snapshot.value,
      stale: state.snapshot.stale,
      operation: state.command?.operationId,
      status: state.command?.status,
      sends: state.commandSends,
    }),
  );
}
step(0, 'button', { pressed: false });
step(1, 'button', { pressed: true });
step(2, 'command-result', {
  generation: 12,
  operationId: 'OP1',
  status: 'accepted',
});
step(3, 'read-request');
const oldRead = state.readQuery;
step(4, 'disconnect');
assert.equal(state.command.status, 'unknown');
assert.equal(state.generation, 13);
step(5, 'button', { pressed: true });
step(6, 'connect');
const newRead = state.readQuery;
const firstStatus = state.statusQuery;
step(7, 'read-complete', {
  ...oldRead,
  value: 99,
  revision: 9,
  sourceTime: 900,
});
assert.equal(state.snapshot.value, 7);
step(8, 'read-complete', {
  ...newRead,
  value: 9,
  revision: 5,
  sourceTime: 110,
});
step(9, 'button', { pressed: true });
step(10, 'status-complete', { ...firstStatus, status: 'not-found' });
assert.equal(state.command.status, 'unknown');
step(11, 'status-request');
step(12, 'status-complete', { ...state.statusQuery, status: 'applied' });
step(13, 'button', { pressed: true });
assert.equal(state.commandSends, 1);
step(14, 'button', { pressed: false });
step(15, 'button', { pressed: true });
assert.equal(state.commandSends, 2);
assert.equal(state.command.operationId, 'OP2');
assert.deepEqual(state.command.payload, { value: 9, revision: 5 });

const emitter = new EventEmitter();
let calls = 0;
const binding = buttonBinding(emitter, () => calls++);
for (let i = 0; i < 10; i++) {
  binding.mount();
  binding.mount();
  try {
    emitter.emit('button', true);
  } finally {
    binding.unmount();
  }
  assert.equal(emitter.listenerCount('button'), 0);
}
assert.equal(calls, 10);
console.log('PASS: 10 mount cycles, 10 callbacks, 0 remaining listeners');
console.log(
  'PASS: reconnect never resent OP1; OP2 required a fresh release and press',
);
