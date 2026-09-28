import { createSnapshot, identity } from './model.mjs';
import { rows } from './fixtures.mjs';
const bSeverity = 950;
const input = rows.map((row) =>
  row.occurrenceId === 'B' ? { ...row, severity: bSeverity } : row,
);
console.log(createSnapshot(input).rows.map(identity).join(','));
