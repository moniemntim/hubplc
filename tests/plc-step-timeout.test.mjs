import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initialWait,
  waitScan,
} from '../public/examples/plc-step-timeout/wait-model.mjs';
const scan = (before, nowMs, inputs = {}) =>
  waitScan(before, { nowMs, ...inputs });
const running = () => scan(scan(initialWait(), 0), 10, { start: true });

void test('startup requires observed release and valid preconditions', () => {
  assert.equal(scan(initialWait(), 0, { start: true }).state, 'IDLE');
  for (const input of [
    { sensorB: true },
    { valid: false },
    { permit: false },
    { stop: true },
  ]) {
    const result = scan(scan(initialWait(), 0), 10, { start: true, ...input });
    assert.equal(result.state, 'IDLE');
    assert.equal(result.output, false);
  }
});
void test('4999 succeeds, 5000 times out even when sensor is true; late observation is recorded honestly', () => {
  assert.equal(scan(running(), 5009, { sensorB: true }).state, 'DONE');
  const fault = scan(running(), 5010, { sensorB: true });
  assert.equal(fault.error, 'TIMEOUT_B');
  assert.equal(fault.output, false);
  assert.equal(fault.lastFault.sensorB, true);
  assert.equal(fault.lastFault.elapsedMs, 5000);
  assert.equal(scan(running(), 5040).lastFault.elapsedMs, 5030);
});
void test('fault snapshot stays frozen through changed feedback, reset and new job', () => {
  let state = scan(running(), 5010);
  const fault = structuredClone(state.lastFault);
  state = scan(state, 5020, { sensorB: true });
  assert.deepEqual(state.lastFault, fault);
  state = scan(state, 5030, { reset: true, sensorB: true });
  assert.equal(state.action, 'reset-rejected');
  state = scan(state, 5040, { reset: true });
  assert.equal(state.state, 'FAULT');
  state = scan(state, 5050);
  state = scan(state, 5060, { reset: true, start: true });
  assert.equal(state.state, 'IDLE');
  assert.equal(state.error, null);
  state = scan(state, 5070, { start: true });
  assert.equal(state.state, 'IDLE');
  state = scan(state, 5080);
  state = scan(state, 5090, { start: true });
  assert.equal(state.state, 'WAIT_SENSOR_B');
  assert.equal(state.enteredAtMs, 5090);
  assert.deepEqual(state.lastFault, fault);
});
void test('stop and invalid input outrank elapsed-time and sensor success', () => {
  assert.equal(
    scan(running(), 5010, { stop: true, valid: false, sensorB: true }).error,
    'STOP',
  );
  assert.equal(
    scan(running(), 5010, { valid: false, sensorB: true }).error,
    'BAD_INPUT',
  );
  assert.equal(
    scan(running(), 5010, { permit: false, sensorB: true }).error,
    'PERMIT_LOST',
  );
});
void test('DONE is held for Ack; Reset is not an Ack', () => {
  let state = scan(running(), 20, { sensorB: true });
  state = scan(state, 30, { reset: true });
  assert.equal(state.state, 'DONE');
  state = scan(state, 40, { ack: true });
  assert.equal(state.state, 'IDLE');
  assert.equal(state.output, false);
  assert.equal(state.enteredAtMs, null);
});
void test('invalid quality disarms Reset and malformed inputs are rejected', () => {
  let state = scan(running(), 5010);
  state = scan(state, 5020, { valid: false });
  state = scan(state, 5030, { reset: true });
  assert.equal(state.state, 'FAULT');
  assert.throws(() => scan(running(), 9), RangeError);
  assert.throws(() => scan(running(), 20, { sensorB: 1 }), TypeError);
});
