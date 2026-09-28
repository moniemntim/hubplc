import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import {
  initialHmi,
  hmiEvent,
  buttonBinding,
} from '../public/examples/hmi-reconnect/model.mjs';
void test('public replay preserves unknown and requires fresh intent after recovery', () => {
  const stdout = execFileSync(
    process.execPath,
    ['public/examples/hmi-reconnect/demo.mjs'],
    { encoding: 'utf8' },
  );
  assert.match(stdout, /OP2 required a fresh release and press/);
});
void test('unmount token and request ID both reject old display updates', () => {
  let state = hmiEvent(initialHmi(), { nowMs: 0, type: 'read-request' });
  const first = state.readQuery;
  state = hmiEvent(state, { nowMs: 1, type: 'unmount' });
  state = hmiEvent(state, { nowMs: 2, type: 'mount' });
  const next = state.readQuery;
  const reply = {
    nowMs: 3,
    type: 'read-complete',
    value: 10,
    revision: 5,
    sourceTime: 200,
  };
  state = hmiEvent(state, { ...reply, ...first });
  assert.equal(state.snapshot.value, 7);
  state = hmiEvent(state, { ...reply, ...next, value: NaN });
  assert.equal(state.snapshot.stale, true);
  state = hmiEvent(state, { ...reply, ...next, revision: 3 });
  assert.equal(state.action, 'invalid-read');
  state = hmiEvent(state, { ...reply, ...next });
  assert.equal(state.snapshot.value, 10);
  state = hmiEvent(state, { nowMs: 4, type: 'read-request' });
  state = hmiEvent(state, { ...reply, nowMs: 5, ...next, value: 20 });
  assert.equal(state.action, 'stale-read-ignored');
});
void test('read recovery cannot resolve an unknown command; stale status reply cannot resolve a new query', () => {
  let state = initialHmi();
  for (const event of [
    { nowMs: 0, type: 'button', pressed: false },
    { nowMs: 1, type: 'button', pressed: true },
    { nowMs: 2, type: 'disconnect' },
    { nowMs: 3, type: 'connect' },
  ])
    state = hmiEvent(state, event);
  const firstStatus = state.statusQuery;
  state = hmiEvent(state, {
    nowMs: 4,
    type: 'status-complete',
    ...firstStatus,
    status: 'timeout',
  });
  assert.equal(state.command.status, 'unknown');
  state = hmiEvent(state, { nowMs: 5, type: 'status-request' });
  const latest = state.statusQuery;
  state = hmiEvent(state, {
    nowMs: 6,
    type: 'status-complete',
    ...firstStatus,
    status: 'applied',
  });
  assert.equal(state.command.status, 'unknown');
  state = hmiEvent(state, {
    nowMs: 7,
    type: 'status-complete',
    ...latest,
    status: 'rejected',
  });
  assert.equal(state.command.status, 'rejected');
  assert.equal(state.commandSends, 1);
  assert.throws(
    () => hmiEvent(state, { nowMs: 6, type: 'disconnect' }),
    RangeError,
  );
});
void test('duplicate mount is idempotent and finally cleanup also removes throwing handlers', () => {
  const emitter = new EventEmitter();
  const binding = buttonBinding(emitter, () => {
    throw new Error('test error');
  });
  binding.mount();
  binding.mount();
  assert.equal(emitter.listenerCount('button'), 1);
  try {
    assert.throws(() => emitter.emit('button', true), /test error/);
  } finally {
    binding.unmount();
  }
  assert.equal(emitter.listenerCount('button'), 0);
});
void test('a result without a current command cannot create an operation', () => {
  const state = hmiEvent(initialHmi(), {
    nowMs: 0,
    type: 'command-result',
    generation: 12,
    status: 'applied',
  });
  assert.equal(state.command, null);
  assert.equal(state.commandSends, 0);
});
