import assert from 'node:assert/strict';
import { elapsed, timeout, samples } from './tick.mjs';
import { run } from './scheduler.mjs';
export function verify() {
  // All 8-bit starts and legal true gaps; also covers values increasing after wrap.
  for (let start = 0; start < 256; start++)
    for (let gap = 0; gap < 256; gap++)
      assert.equal(
        elapsed({ start, now: (start + gap) % 256, gapBound: gap }).elapsed,
        gap,
      );
  assert.equal(
    timeout(elapsed({ start: 250, now: 9, gapBound: 15 }), 15),
    'TIMEOUT',
  );
  assert.equal(
    elapsed({ start: 250, now: 14, gapBound: 276 }).reason,
    'INTERVAL_UNPROVEN',
  );
  assert.equal(elapsed({ start: 250, now: 250, gapBound: 256 }).elapsed, null);
  assert.equal(
    elapsed({ start: 250, now: 14, gapBound: 20, nowBoot: 'B' }).reason,
    'RESTART',
  );
  assert.equal(
    elapsed({ start: 250, now: 14, gapBound: 19 }).reason,
    'INCONSISTENT_BOUND',
  );
  assert.equal(
    elapsed({ bits: 32, start: 4294967295, now: 0, gapBound: 1 }).elapsed,
    1,
  );
  assert.equal(elapsed({ start: 0, now: 0 }).reason, 'INTERVAL_UNPROVEN');
  for (const bad of [-1, 256, NaN, 1.5])
    assert.throws(
      () => elapsed({ start: bad, now: 0, gapBound: 0 }),
      /invalid/,
    );
  const base = samples(Array.from({ length: 1001 }, (_, i) => i * 10));
  for (const mode of ['completion', 'phase']) {
    const r = run({ mode, scans: base, durations: [80, 120, 50, 100] });
    assert.equal(r.events[9].start, mode === 'phase' ? 9000 : 9780);
    assert.equal(r.fault, null);
    assert.equal(r.missed, 0);
    assert.ok(
      r.events.every((e, i) => !i || e.start >= r.events[i - 1].finish),
    );
  }
  const late = run({
    scans: samples([0, 80, 1000, 1080, 3500, 3580, 4000, 4080]),
  });
  assert.equal(late.events[2].target, 3000);
  assert.equal(late.events[2].lateness, 500);
  assert.equal(late.missed, 1);
  assert.deepEqual(late.skips, [
    { firstTarget: 2000, count: 1, observed: 3500, reason: 'COALESCED' },
  ]);
  const busy = run({
    scans: samples([0, 1000, 2000, 2500, 3000]),
    durations: [2500],
  });
  assert.deepEqual(
    busy.events.map((e) => e.start),
    [0, 3000],
  );
  assert.equal(busy.missed, 2);
  const equal = run({ scans: samples([0, 1000]), durations: [1000] });
  assert.equal(equal.events.length, 2);
  assert.equal(equal.missed, 0);
  const repeat = run({ scans: samples([0, 0, 0, 1000, 1000]), durations: [0] });
  assert.equal(repeat.events.length, 2);
  const wrap = run({
    bits: 8,
    period: 100,
    scans: samples([0, 100, 200, 300, 400], 8),
    durations: [0],
  });
  assert.deepEqual(
    wrap.events.map((e) => e.start),
    [0, 100, 200, 300, 400],
  );
  assert.equal(wrap.fault, null);
  for (const bad of [
    [
      { tick: 0, boot: 'A', gapBound: 0 },
      { tick: 20, boot: 'A', gapBound: 276 },
      { tick: 30, boot: 'A', gapBound: 10 },
    ],
    [
      { tick: 0, boot: 'A', gapBound: 0 },
      { tick: 20, boot: 'B', gapBound: 20 },
    ],
  ]) {
    const r = run({ bits: 8, scans: bad });
    assert.equal(r.events.length, 1);
    assert.ok(r.fault);
    assert.equal(r.events[0].status, 'RUNNING');
  }
  assert.equal(
    run({ scans: samples([0, 1000, 2000]), maxEvents: 2 }).fault,
    'EVENT_CAPACITY',
  );
  assert.throws(() => run({ scans: base, period: 0 }), /invalid/);
  assert.throws(() => samples([0, 20, 10]), /invalid/);
  const input = samples([0, 1000]);
  const before = structuredClone(input);
  run({ scans: input });
  assert.deepEqual(input, before);
  console.log(
    'timing self-test: PASS (65536 wrap pairs + scheduler boundaries)',
  );
}
if (process.argv[1]?.endsWith('self-test.mjs')) verify();
