import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import {
  END_ROW,
  FIXTURE,
  LATE_ROW,
} from '../public/examples/alarm-flood/fixtures.mjs';
import {
  replay,
  summarize,
  WINDOW_MS,
} from '../public/examples/alarm-flood/model.mjs';

void test('fixed synthetic fixture computes the documented lifecycle counts', () => {
  const summary = summarize(FIXTURE);
  assert.equal(FIXTURE.length, 132);
  assert.deepEqual(summary.groupCounts, {
    Utility: 1,
    Pump: 14,
    TemperatureFlow: 20,
    Communication: 15,
  });
  assert.deepEqual(
    [
      summary.transitionCount,
      summary.cycleCount,
      summary.clearCount,
      summary.activeCount,
      summary.unacknowledgedCount,
      summary.unacknowledgedActiveCount,
      summary.unacknowledgedClearCount,
    ],
    [132, 50, 40, 10, 8, 3, 5],
  );
  assert.equal(summary.candidateEarliestCycleId, 'C001');
  assert.equal(summary.trace.length, 50);
});

void test('replay ignores only identical transitions and rejects id collisions', () => {
  const base = summarize(FIXTURE);
  const replayed = summarize([...FIXTURE, ...FIXTURE]);
  assert.deepEqual(
    [
      replayed.transitionCount,
      replayed.cycleCount,
      replayed.ignoredDuplicateIds.length,
    ],
    [132, 50, 132],
  );
  assert.equal(replayed.contentVersion, base.contentVersion);
  assert.throws(
    () => replay([...FIXTURE, { ...FIXTURE[0], source: 'other-source' }]),
    /collision/,
  );
});

void test('end is exclusive, carry-in is separate, and late arrival creates a new version', () => {
  const before = summarize(FIXTURE);
  const late = summarize([...FIXTURE, LATE_ROW], {
    asOfMs: WINDOW_MS + 20_000,
  });
  assert.deepEqual([before.cycleCount, late.cycleCount], [50, 51]);
  assert.notEqual(before.contentVersion, late.contentVersion);
  assert.equal(before.cycleCount, 50);
  assert.deepEqual(
    [
      summarize([...FIXTURE, END_ROW]).cycleCount,
      summarize([...FIXTURE, END_ROW], {
        startMs: WINDOW_MS,
        endMs: WINDOW_MS * 2,
      }).cycleCount,
    ],
    [50, 1],
  );
  assert.equal(
    summarize(FIXTURE, { startMs: 10_000, endMs: WINDOW_MS }).carryIn.length,
    10,
  );
});

void test('strict input bounds and lifecycle shape reject malformed source data', () => {
  assert.throws(
    () => replay(Array.from({ length: 513 }, () => FIXTURE[0])),
    /512/,
  );
  const tooMany = Array.from({ length: 257 }, (_, index) => ({
    ...FIXTURE[0],
    id: 'overflow-' + index,
    cycleId: 'overflow-' + index,
    sourceSequence: index + 1,
  }));
  assert.throws(() => replay(tooMany), /256/);
  assert.throws(() => replay([{ ...FIXTURE[0], extra: true }]), /exact/);
  assert.throws(
    () => replay([{ ...FIXTURE[0], sourceSequence: 0 }]),
    /sourceSequence/,
  );
  assert.throws(
    () =>
      summarize([
        FIXTURE[0],
        { ...FIXTURE[1], cycleId: FIXTURE[0].cycleId, type: 'CLEAR' },
      ]),
    /source and group/,
  );
  assert.throws(
    () => replay([{ ...FIXTURE[0], id: ' has-space' }]),
    /id and cycleId/,
  );
  assert.throws(
    () => replay([{ ...FIXTURE[0], source: 'bad\nsource' }]),
    /group or source/,
  );
  assert.throws(
    () => replay([Object.assign(Object.create(null), FIXTURE[0])]),
    /exact/,
  );
  assert.throws(
    () => replay([{ ...FIXTURE[0], receivedAtMs: -1 }]),
    /occurredAtMs/,
  );
  assert.throws(
    () =>
      replay([
        FIXTURE[1],
        { ...FIXTURE[0], sourceSequence: FIXTURE[1].sourceSequence + 1 },
      ]),
    /occurredAtMs/,
  );
});

void test('a visible later source row rejects a query missing earlier source history', () => {
  const rows = [
    { ...FIXTURE[0], receivedAtMs: 2_000 },
    { ...FIXTURE[1], receivedAtMs: 1_000 },
  ];
  assert.throws(
    () => summarize(rows, { asOfMs: 1_000 }),
    /complete prior source history/,
  );
});

void test('downloadable self-test executes', () => {
  assert.match(
    execFileSync(
      process.execPath,
      ['public/examples/alarm-flood/self-test.mjs'],
      {
        encoding: 'utf8',
      },
    ),
    /PASS/,
  );
});
