import assert from 'node:assert/strict';
import { createWorkflow, TARGET } from './workflow.mjs';
const raw = JSON.stringify(TARGET);
const flow = createWorkflow();
const shown = flow.prepare(raw);
console.log(
  `diff=${shown.diff.map((row) => `${row.field}:${row.old}->${row.next}${row.unit}`).join(',')}`,
);
console.log(
  `revision=${shown.revision} expires_at=${shown.expiresAt} diff_sha256=${shown.digest}`,
);
const result = flow.confirm({ ...shown, raw });
assert.equal(result.status, 'staged');
console.log(`confirm=${result.status} writes=${flow.inspect().writes}`);
console.log(`replay=${flow.confirm({ ...shown, raw }).reason}`);
for (const { name, alter } of [
  { name: 'expired', alter: (f) => f.advance(300000) },
  {
    name: 'conflict',
    alter: (f) => f.externalUpdate(JSON.stringify({ ...TARGET, temp: 51 })),
  },
  { name: 'permission', alter: (f) => f.setAccess(false) },
]) {
  const f = createWorkflow();
  const c = f.prepare(raw);
  alter(f);
  console.log(
    `${name}=${f.confirm({ ...c, raw }).reason} writes=${f.inspect().writes}`,
  );
}
console.log('confirmation demo: PASS');
