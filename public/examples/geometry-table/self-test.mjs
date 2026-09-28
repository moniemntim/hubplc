import assert from 'node:assert/strict';
import { normalize, shortest, AngleTracker } from './angle.mjs';
import { Curve, fivePoints } from './curve.mjs';
export function verify() {
  assert.equal(normalize(-10), 350);
  assert.equal(normalize(-Number.MIN_VALUE), 0);
  const sparse = [];
  sparse.length = 2;
  assert.throws(() => new Curve(sparse), /TABLE_ERROR/);
  assert.equal(normalize(725), 5);
  assert.equal(Object.is(normalize(-0), -0), false);
  for (const bad of [NaN, Infinity, '2', 1e10])
    assert.throws(() => normalize(bad), /angle/);
  for (let from = 0; from < 360; from++)
    for (let to = 0; to < 360; to++) {
      const d = shortest(from, to);
      assert.ok(d.delta > -180 && d.delta <= 180);
      assert.equal(normalize(from + d.delta), to);
      if (!d.tie) assert.equal(d.delta + shortest(to, from).delta, 0);
    }
  assert.equal(shortest(180, 0).delta, 180);
  assert.equal(shortest(359.5, 0.5).delta, 1);
  const tracker = new AngleTracker();
  assert.equal(tracker.update({ angle: 358, at: 0 }).state, 'BASELINE');
  assert.equal(tracker.update({ angle: 2, at: 100 }).delta, 4);
  assert.equal(
    tracker.update({ angle: 10, at: 600 }).state,
    'HALF_TURN_UNPROVEN',
  );
  assert.equal(tracker.update({ angle: 12, at: 700 }).state, 'BASELINE');
  assert.equal(tracker.update({ angle: 14, at: 800 }).segmentTotal, 2);
  assert.equal(
    tracker.update({ angle: 15, at: 801, quality: 'Bad' }).state,
    'QUALITY_INVALID',
  );
  assert.equal(tracker.update({ angle: 15, at: 900 }).state, 'BASELINE');
  assert.equal(tracker.update({ angle: 16, at: 900 }).state, 'TIME_INVALID');
  const restarted = new AngleTracker();
  restarted.update({ angle: 0, at: 0 });
  assert.equal(
    restarted.update({ angle: 1, at: 10, boot: 'B' }).state,
    'RESTART',
  );
  const fast = new AngleTracker();
  fast.update({ angle: 0, at: 0 });
  assert.equal(
    fast.update({ angle: 100, at: 100 }).state,
    'SPEED_INCONSISTENT',
  );
  const half = new AngleTracker(359.999999999);
  half.update({ angle: 0, at: 0 });
  assert.equal(
    half.update({ angle: 180, at: 500 }).state,
    'SPEED_INCONSISTENT',
  );
  const c = new Curve();
  for (const [x, y] of [
    ...fivePoints(),
    [50, 4],
    [150, 14],
    [250, 27.5],
    [350, 45],
    [125, 11],
    [175, 17],
    [199, 19.88],
    [201, 20.15],
  ])
    assert.ok(Math.abs(c.calculate(x).y - y) < 1e-10);
  assert.equal(c.calculate(400).right, 4);
  for (const x of [-1, 401]) assert.equal(c.calculate(x).state, 'OUT_OF_RANGE');
  assert.equal(c.calculate(NaN).y, null);
  assert.equal(c.calculate(150, 'Bad').state, 'QUALITY_INVALID');
  assert.equal(c.calculate(150, 'Good', 'mA').state, 'UNIT_MISMATCH');
  for (const bad of [
    [],
    [[0, 0]],
    [
      [0, 0],
      [0, 1],
    ],
    [
      [1, 0],
      [0, 1],
    ],
    [
      [0, 0],
      [1, NaN],
    ],
    [[0, 0], [1]],
    Array.from({ length: 33 }, (_, i) => [i, i]),
  ]) {
    assert.throws(() => new Curve(bad), /TABLE_ERROR/);
    assert.equal(c.replace(bad, 1).state, 'TABLE_ERROR');
    assert.equal(c.calculate(150).y, 14);
  }
  const points = fivePoints().map(([x, y]) => [x, y * 2]);
  assert.equal(c.replace(points, 1).state, 'COMMITTED');
  points[1][1] = 999;
  assert.equal(c.calculate(150).y, 28);
  assert.equal(c.replace(fivePoints(), 1).state, 'VERSION_CONFLICT');
  assert.equal(c.calculate(150).version, 2);
  const descending = new Curve([
    [0, 10],
    [100, -10],
  ]);
  assert.equal(descending.calculate(50).y, 0);
  console.log(
    'geometry self-test: PASS (129600 angle pairs + tracker and curve cases)',
  );
}
if (process.argv[1]?.endsWith('self-test.mjs')) verify();
