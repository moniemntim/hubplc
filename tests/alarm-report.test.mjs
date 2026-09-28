import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import {
  CRITICAL_FILTER,
  FILTER,
  FIXTURE,
  SHIFT,
} from '../public/examples/alarm-report/fixtures.mjs';
import {
  createAlarmReport,
  validateFixture,
} from '../public/examples/alarm-report/model.mjs';

void test('fixed +08 night shift has separate window transitions and cutoff state', () => {
  const report = createAlarmReport(FIXTURE, FILTER);
  assert.equal(SHIFT.startUtc, '2026-09-16T14:00:00.000Z');
  assert.equal(SHIFT.endUtc, '2026-09-16T22:00:00.000Z');
  assert.deepEqual(report.rowCount, {
    activeTransitions: 2,
    unackedAtCutoff: 2,
    unknownHistory: 1,
  });
  assert.equal(report.coverage.complete, false);
  assert.equal(report.coverage.completeForFilter, false);
  assert.deepEqual(
    report.activeTransitions.map((row) => [row.occurrenceId, row.transitionId]),
    [
      ['OCC-P01', 'TR-P01-A'],
      ['OCC-P02', 'TR-P02-A'],
    ],
  );
  assert.deepEqual(
    report.unackedAtCutoff.map((row) => row.occurrenceId),
    ['OCC-P03', 'OCC-P02'],
  );
  assert.deepEqual(report.unknownHistory, [
    {
      occurrenceId: 'OCC-P05',
      sourceId: 'P05',
      priority: 'High',
      state: 'UNKNOWN_HISTORY',
    },
  ]);
});

void test('ACK exactly at end is excluded while end minus one millisecond is included', () => {
  const beforeEnd = structuredClone(FIXTURE);
  beforeEnd.occurrences.find(
    (row) => row.occurrenceId === 'OCC-P02',
  ).transitions[1].atUtc = '2026-09-16T21:59:59.999Z';
  assert.deepEqual(
    createAlarmReport(beforeEnd, FILTER).unackedAtCutoff.map(
      (row) => row.occurrenceId,
    ),
    ['OCC-P03'],
  );
  assert.ok(
    !createAlarmReport(FIXTURE, FILTER).unackedAtCutoff.some(
      (row) => row.occurrenceId === 'OCC-P04',
    ),
  );
});

void test('source and priority filters apply to all three result groups', () => {
  const report = createAlarmReport(FIXTURE, CRITICAL_FILTER);
  assert.deepEqual(report.rowCount, {
    activeTransitions: 1,
    unackedAtCutoff: 1,
    unknownHistory: 0,
  });
  assert.equal(report.activeTransitions[0].sourceId, 'P02');
  assert.equal(report.unackedAtCutoff[0].sourceId, 'P02');
  assert.equal(report.coverage.completeForFilter, true);
});

void test('CLEAR without ACK remains unacknowledged at the cutoff', () => {
  const fixture = structuredClone(FIXTURE);
  fixture.occurrences.push({
    occurrenceId: 'OCC-P06',
    sourceId: 'P06',
    priority: 'Low',
    history: 'COMPLETE',
    transitions: [
      {
        transitionId: 'TR-P06-A',
        type: 'ACTIVE',
        atUtc: SHIFT.startUtc,
        order: 1,
      },
      {
        transitionId: 'TR-P06-X',
        type: 'CLEAR',
        atUtc: '2026-09-16T15:00:00.000Z',
        order: 2,
      },
    ],
  });
  const row = createAlarmReport(fixture, FILTER).unackedAtCutoff.find(
    (value) => value.occurrenceId === 'OCC-P06',
  );
  assert.equal(row.statusAtCutoff, 'CLEARED_UNACKED');
});

void test('unknown history cannot be silently classified as acknowledged or unacknowledged', () => {
  const fixture = structuredClone(FIXTURE);
  fixture.coverage.unknownOccurrenceIds = [];
  assert.throws(() => validateFixture(fixture), /exactly name/);
  fixture.coverage.unknownOccurrenceIds = ['OCC-P05'];
  fixture.occurrences[4].transitions = [
    {
      transitionId: 'TR-P05-A',
      type: 'ACTIVE',
      atUtc: SHIFT.startUtc,
      order: 1,
    },
  ];
  assert.throws(() => validateFixture(fixture), /must not claim/);
});

void test('strict bounds and malformed filters are rejected', () => {
  assert.throws(
    () => createAlarmReport({ ...FIXTURE, extra: true }, FILTER),
    /exact/,
  );
  assert.throws(
    () => createAlarmReport(FIXTURE, { ...FILTER, endUtc: FILTER.startUtc }),
    /startUtc/,
  );
  assert.throws(
    () => createAlarmReport(FIXTURE, { ...FILTER, sourceIds: ['P01', 'P01'] }),
    /duplicate/,
  );
  assert.throws(
    () => createAlarmReport(FIXTURE, { ...FILTER, priorities: [] }),
    /nonempty/,
  );
  assert.throws(
    () =>
      createAlarmReport(FIXTURE, {
        ...FILTER,
        startUtc: '2026-09-16T14:00:00Z',
      }),
    /canonical/,
  );
});

void test('downloadable self-test executes', () => {
  assert.match(
    execFileSync(
      process.execPath,
      ['public/examples/alarm-report/self-test.mjs'],
      { encoding: 'utf8' },
    ),
    /PASS/,
  );
});
void test('coverage is derived and agrees with the complete known fixture', () => {
  const known = structuredClone(FIXTURE);
  known.occurrences = known.occurrences.filter((x) => x.history === 'COMPLETE');
  known.coverage.unknownOccurrenceIds = [];
  known.coverage.complete = true;
  const report = createAlarmReport(known, FILTER);
  assert.equal(report.coverage.complete, true);
  assert.equal(report.coverage.completeForFilter, true);
  assert.throws(
    () =>
      createAlarmReport(
        { ...FIXTURE, coverage: { ...FIXTURE.coverage, complete: true } },
        FILTER,
      ),
    /disagrees/,
  );
});
