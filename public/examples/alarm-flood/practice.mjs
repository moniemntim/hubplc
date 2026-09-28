import { FIXTURE, LATE_ROW } from './fixtures.mjs';
import { summarize, WINDOW_MS } from './model.mjs';

// Edit copies only. This default shows a late row becoming available after the
// original [0, 900000) snapshot was retained.
const late = { ...LATE_ROW };
const rows = [...FIXTURE, late];
const original = summarize(rows);
const recomputed = summarize(rows, { asOfMs: WINDOW_MS + 20_000 });
const nextWindow = summarize(rows, {
  startMs: WINDOW_MS,
  endMs: WINDOW_MS * 2,
  asOfMs: WINDOW_MS + 20_000,
});

console.log(
  JSON.stringify({
    original: {
      cycles: original.cycleCount,
      version: original.contentVersion,
    },
    recomputed: {
      cycles: recomputed.cycleCount,
      version: recomputed.contentVersion,
    },
    nextWindowCycles: nextWindow.cycleCount,
  }),
);
