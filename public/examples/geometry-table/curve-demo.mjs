import { Curve, fivePoints } from './curve.mjs';
const curve = new Curve();
for (const x of [0, 50, 125, 150, 175, 199, 200, 201, 250, 350, 400, 401]) {
  const r = curve.calculate(x);
  console.log(
    `x=${x}: ${r.state} y=${r.y === null ? 'null' : Number(r.y.toFixed(6))} version=${r.version}`,
  );
}
const bad = fivePoints();
bad[2][0] = 100;
console.log(
  `bad replacement: ${curve.replace(bad, 1).state} y150=${curve.calculate(150).y}`,
);
const next = fivePoints().map(([x, y]) => [x, y * 2]);
console.log(
  `good replacement: ${curve.replace(next, 1).state} y150=${curve.calculate(150).y} version=${curve.calculate(150).version}`,
);
console.log(`stale replacement: ${curve.replace(fivePoints(), 1).state}`);
