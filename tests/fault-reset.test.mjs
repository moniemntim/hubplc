import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initialReset,
  resetScan,
} from '../public/examples/fault-reset/reset-model.mjs';
const scan = (state, button, cause = false, valid = true) =>
  resetScan(state, { button, cause, valid });

void test('startup held button is ignored; accepted reset emits one pulse', () => {
  let state = scan(initialReset(), true);
  assert.equal(state.accepted, 0);
  state = scan(state, false);
  state = scan(state, true);
  assert.equal(state.fault, false);
  assert.equal(state.pulse, true);
  for (let i = 0; i < 10; i++) state = scan(state, true);
  assert.equal(state.pulse, false);
  assert.equal(state.accepted, 1);
});
void test('cause dominates; rejected press cannot become pending reset', () => {
  let state = scan(initialReset(), false);
  state = scan(state, true, true);
  assert.equal(state.reason, 'cause-active');
  state = scan(state, true);
  assert.equal(state.fault, true);
  assert.equal(state.accepted, 0);
  state = scan(scan(state, false), true);
  assert.equal(state.accepted, 1);
});
void test('invalid source disarms; reappearing high is not a new press', () => {
  let state = scan(initialReset(), false);
  state = scan(state, false, false, false);
  state = scan(state, true);
  assert.equal(state.accepted, 0);
  state = scan(scan(state, false), true);
  assert.equal(state.accepted, 1);
  state = scan(scan(state, false), true);
  assert.equal(state.reason, 'no-fault');
  assert.equal(state.accepted, 1);
});
void test('invalid reset data does not suppress an active local fault', () => {
  let state = scan(scan(initialReset(), false), true);
  state = scan(state, true, true, false);
  assert.equal(state.fault, true);
  assert.equal(state.pulse, false);
  assert.equal(state.armed, false);
  assert.throws(
    () => resetScan(state, { valid: true, button: 1, cause: false }),
    TypeError,
  );
});
