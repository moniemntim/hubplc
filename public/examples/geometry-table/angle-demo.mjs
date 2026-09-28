import { shortest, AngleTracker } from './angle.mjs';
for (const [from, to] of [
  [358, 2],
  [2, 358],
  [0, 180],
  [180, 0],
  [359.5, 0.5],
]) {
  const r = shortest(from, to);
  console.log(`${from}->${to}: raw=${r.raw} delta=${r.delta} tie=${r.tie}`);
}
const tracker = new AngleTracker(360);
for (const sample of [
  { angle: 358, at: 0 },
  { angle: 2, at: 100 },
  { angle: 10, at: 700 },
  { angle: 12, at: 800 },
  { angle: 14, at: 900 },
]) {
  const r = tracker.update(sample);
  console.log(
    `at=${sample.at}: ${r.state} delta=${r.delta} segment=${r.segmentTotal}`,
  );
}
