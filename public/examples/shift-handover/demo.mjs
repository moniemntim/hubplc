import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { Handover } from './model.mjs';
import { at, items, request } from './fixtures.mjs';
const before = structuredClone(items);
const h = new Handover({ handoverId: 'SHIFT-20260917-AM', items, at });
assert.equal(h.report(at).status, 'AWAITING_ACCEPTANCE');
console.log(`H1=${h.act(request('H1', 1)).decision}`);
console.log(`H2=${h.act(request('H2', 1)).decision}`);
const report = h.report(at);
assert.equal(report.status, 'RESPONSIBILITY_ACCEPTED');
assert.deepEqual(items, before);
assert.deepEqual(
  report.items.map((x) => [x.active, x.acked]),
  [
    [true, true],
    [false, true],
  ],
);
console.log(`handover=${report.status}; P-01 active=${report.items[0].active}`);
console.log(
  `note=${h.act(request('H1', 2, at, 'note', '補充：請先核對來源壓力趨勢')).decision}`,
);
assert.equal(h.report(at).status, 'AWAITING_ACCEPTANCE');
console.log(`old revision=${h.act(request('H1', 2)).decision}`);
console.log(`reaccept=${h.act(request('H1', 3)).decision}`);
assert.equal(h.report(at).actions.length, 4);
console.log(`after 60001ms=${h.report(at + 60001).status}`);
writeFileSync(
  'handover-report.json',
  JSON.stringify(h.report(at), null, 2) + '\n',
);
console.log('demo: PASS; wrote handover-report.json');
