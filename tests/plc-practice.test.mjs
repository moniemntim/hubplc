import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initialPractice,
  emptyInputs,
  practiceScan,
} from '../lib/plc-practice.ts';
const input = (patch) => ({ ...emptyInputs, ...patch });

void test('latch holds after release, stop dominates and held start restarts', () => {
  let s = initialPractice();
  for (const [start, stop, q] of [
    [false, false, false],
    [true, false, true],
    [false, false, true],
    [false, true, false],
    [true, true, false],
    [true, false, true],
  ]) {
    s = practiceScan('latch', s, input({ start, stop }));
    assert.equal(s.q, q);
  }
});
void test('TON starts at observed edge, reaches exactly 2000ms and resets', () => {
  let s = practiceScan('ton', initialPractice(), input({ input: true }));
  assert.equal(s.elapsed, 0);
  assert.equal(s.q, false);
  for (let i = 1; i < 20; i++) {
    s = practiceScan('ton', s, input({ input: true }));
    assert.equal(s.q, false);
  }
  assert.equal(s.elapsed, 1900);
  s = practiceScan('ton', s, input({ input: true }));
  assert.equal(s.q, true);
  assert.equal(s.elapsed, 2000);
  s = practiceScan('ton', s, input({ input: false }));
  assert.equal(s.q, false);
  assert.equal(s.elapsed, 0);
  s = practiceScan('ton', s, input({ input: true }));
  assert.equal(s.elapsed, 0);
});
void test('TON early release never produces delayed output', () => {
  let s = initialPractice();
  for (let i = 0; i < 11; i++)
    s = practiceScan('ton', s, input({ input: true }));
  for (let i = 0; i < 30; i++) {
    s = practiceScan('ton', s, input({ input: false }));
    assert.equal(s.q, false);
    assert.equal(s.elapsed, 0);
  }
});
void test('sequence follows documented trace and only one transition per scan', () => {
  let s = initialPractice();
  for (const [patch, phase, et] of [
    [{}, 'WAIT', 0],
    [{ start: true }, 'RUN', 0],
    [{}, 'RUN', 100],
    [{ done: true, ack: true }, 'DONE', 200],
    [{}, 'DONE', 200],
    [{ ack: true }, 'WAIT', 0],
  ]) {
    s = practiceScan('sequence', s, input(patch));
    assert.equal(s.phase, phase);
    assert.equal(s.elapsed, et);
    assert.equal(s.q, phase === 'RUN');
  }
});
void test('sequence timeout beats same-scan completion, retains fault until valid reset', () => {
  let s = practiceScan('sequence', initialPractice(), input({ start: true }));
  for (let i = 1; i < 20; i++) s = practiceScan('sequence', s, input({}));
  s = practiceScan('sequence', s, input({ done: true }));
  assert.equal(s.phase, 'FAULT');
  assert.equal(s.reason, 'TIMEOUT');
  assert.equal(s.q, false);
  s = practiceScan('sequence', s, input({ done: true, reset: true }));
  assert.equal(s.phase, 'FAULT');
  assert.equal(s.reason, 'TIMEOUT');
  s = practiceScan('sequence', s, input({ reset: true }));
  assert.equal(s.phase, 'WAIT');
  assert.equal(s.q, false);
});
void test('sequence held start cannot restart, rejected edge is not queued', () => {
  let s = practiceScan(
    'sequence',
    initialPractice(),
    input({ start: true, done: true }),
  );
  assert.equal(s.phase, 'WAIT');
  s = practiceScan('sequence', s, input({ start: true }));
  assert.equal(s.phase, 'WAIT');
  s = practiceScan('sequence', s, input({}));
  s = practiceScan('sequence', s, input({ start: true }));
  assert.equal(s.phase, 'RUN');
  s = practiceScan('sequence', s, input({ start: true, done: true }));
  assert.equal(s.phase, 'DONE');
  s = practiceScan('sequence', s, input({ start: true, ack: true }));
  assert.equal(s.phase, 'WAIT');
  s = practiceScan('sequence', s, input({ start: true }));
  assert.equal(s.phase, 'WAIT');
});
void test('sequence stop dominates done and reset cannot bypass active stop', () => {
  let s = practiceScan('sequence', initialPractice(), input({ start: true }));
  s = practiceScan('sequence', s, input({ stop: true, done: true }));
  assert.equal(s.phase, 'FAULT');
  assert.equal(s.reason, 'STOP');
  s = practiceScan('sequence', s, input({ stop: true, reset: true }));
  assert.equal(s.phase, 'FAULT');
});
