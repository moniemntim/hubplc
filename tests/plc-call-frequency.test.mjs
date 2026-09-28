import assert from 'node:assert/strict';
import test from 'node:test';
import {
  callDeadlineTimer,
  callEdge,
  callGapTimer,
  initialDeadlineTimer,
  initialEdge,
  initialGapTimer,
} from '../public/examples/plc-call-frequency/call-frequency-model.mjs';

void test('deadline equality and allowed-gap equality are accepted; reinitialization clears a gap fault', () => {
  let deadline = initialDeadlineTimer({ startedAtMs: 0, durationMs: 300 });
  deadline = callDeadlineTimer(deadline, { nowMs: 299 });
  assert.equal(deadline.expired, false);
  assert.equal(callDeadlineTimer(deadline, { nowMs: 300 }).expired, true);
  let gap = initialGapTimer({ startedAtMs: 0, durationMs: 300, maxGapMs: 150 });
  gap = callGapTimer(gap, { nowMs: 0 });
  gap = callGapTimer(gap, { nowMs: 150 });
  assert.equal(gap.error, null);
  assert.equal(callGapTimer(gap, { nowMs: 300 }).expired, true);
  assert.equal(callGapTimer(gap, { nowMs: 301 }).error, 'TIME_GAP');
  const restarted = initialGapTimer({
    startedAtMs: 400,
    durationMs: 300,
    maxGapMs: 150,
  });
  assert.equal(callGapTimer(restarted, { nowMs: 400 }).error, null);
  assert.equal(callGapTimer(restarted, { nowMs: 400 }).expired, false);
});

void test('conditional calls preserve edge state while always-called state samples every row', () => {
  let conditional = initialEdge();
  let always = initialEdge();
  const result = [];
  for (const [clk, called] of [
    [false, true],
    [true, false],
    [false, false],
    [true, true],
  ]) {
    if (called) conditional = callEdge(conditional, { clk });
    always = callEdge(always, { clk });
    result.push([
      conditional.previous,
      conditional.q,
      always.previous,
      always.q,
    ]);
  }
  assert.deepEqual(result, [
    [false, false, false, false],
    [false, false, true, true],
    [false, false, false, false],
    [true, true, true, true],
  ]);
});

void test('a stored Q is double-consumed only when a consumer ignores invocation status', () => {
  let state = initialEdge();
  let naive = 0;
  let oneShot = 0;
  for (const [clk, called] of [
    [false, true],
    [true, true],
    [true, false],
    [true, true],
  ]) {
    if (called) state = callEdge(state, { clk });
    naive += Number(state.q);
    oneShot += Number(called && state.q);
  }
  assert.deepEqual(
    { naive, oneShot, q: state.q },
    { naive: 2, oneShot: 1, q: false },
  );
});

void test('always-called state prevents a held high level from becoming a resume event', () => {
  let skipped = initialEdge();
  let always = initialEdge();
  for (const [clk, enabled] of [
    [false, true],
    [true, false],
    [true, false],
    [true, true],
  ]) {
    if (enabled) skipped = callEdge(skipped, { clk });
    always = callEdge(always, { clk });
  }
  assert.deepEqual(skipped, { previous: true, q: true });
  assert.deepEqual(always, { previous: true, q: false });
});

void test('a pulse that begins and ends during skipped rows cannot be reconstructed later', () => {
  let state = callEdge(initialEdge(), { clk: false });
  state = callEdge(state, { clk: false });
  assert.deepEqual(state, { previous: false, q: false });
});

void test('custom deadline and gap policies give distinct explicit outcomes', () => {
  let deadline = initialDeadlineTimer({ startedAtMs: 0, durationMs: 300 });
  let gap = initialGapTimer({ startedAtMs: 0, durationMs: 300, maxGapMs: 150 });
  deadline = callDeadlineTimer(deadline, { nowMs: 0 });
  gap = callGapTimer(gap, { nowMs: 0 });
  deadline = callDeadlineTimer(deadline, { nowMs: 100 });
  gap = callGapTimer(gap, { nowMs: 100 });
  deadline = callDeadlineTimer(deadline, { nowMs: 300 });
  gap = callGapTimer(gap, { nowMs: 300 });
  assert.deepEqual(
    { elapsedMs: deadline.elapsedMs, expired: deadline.expired },
    { elapsedMs: 300, expired: true },
  );
  assert.deepEqual(
    { gapMs: gap.gapMs, error: gap.error, expired: gap.expired },
    { gapMs: 200, error: 'TIME_GAP', expired: false },
  );
  gap = callGapTimer(gap, { nowMs: 400 });
  assert.deepEqual(
    { gapMs: gap.gapMs, error: gap.error, expired: gap.expired },
    { gapMs: 100, error: 'TIME_GAP', expired: false },
  );
});

void test('custom timers reject a clock that moves backward after an observation', () => {
  let deadline = initialDeadlineTimer({ startedAtMs: 0, durationMs: 300 });
  deadline = callDeadlineTimer(deadline, { nowMs: 200 });
  assert.throws(() => callDeadlineTimer(deadline, { nowMs: 199 }), RangeError);
  let gap = initialGapTimer({ startedAtMs: 0, durationMs: 300, maxGapMs: 150 });
  gap = callGapTimer(gap, { nowMs: 200 });
  assert.throws(() => callGapTimer(gap, { nowMs: 199 }), RangeError);
});
