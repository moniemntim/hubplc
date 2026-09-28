import { createSnapshot, identity, page, partition } from './model.mjs';
import { rows, makeRow } from './fixtures.mjs';
const old = createSnapshot(rows);
console.log('rule=' + old.rule);
console.log('order=' + old.rows.map(identity).join(','));
for (const [name, items] of Object.entries(partition(old)))
  console.log(name + '=' + items.map(identity).join(','));
console.log('old-page1=' + page(old, 0, 3).map(identity).join(','));
rows.push(makeRow('NEW', { severity: 1000 }));
const current = createSnapshot(rows);
console.log('old-page2=' + page(old, 3, 3).map(identity).join(','));
console.log('refreshed-first=' + identity(current.rows[0]));
console.log('snapshot-changed=' + (old.id !== current.id));
