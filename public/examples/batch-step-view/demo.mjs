import assert from 'node:assert/strict';
import { cases } from './fixtures.mjs';
import { projectSnapshot } from './model.mjs';

for (const [name, nowMs, input] of cases) {
  const result = projectSnapshot(input, nowMs);
  assert.equal(result.accepted, true);
  console.log(JSON.stringify({ case: name, nowMs, ...result }));
}
assert.equal(
  projectSnapshot(cases.at(-1)[2], cases.at(-1)[1]).view.completion,
  'PROVEN',
);

console.log('demo: PASS read-only authoritative snapshot projection');
