import {
  callDeadlineTimer,
  callEdge,
  callGapTimer,
  initialDeadlineTimer,
  initialEdge,
  initialGapTimer,
} from './call-frequency-model.mjs';

function print(title, headings, rows) {
  console.log(`\n${title}`);
  console.log(headings.join(','));
  for (const row of rows) console.log(row.join(','));
}

let a = initialEdge();
let b = initialEdge();
const conditionalRows = [];
for (const { ms, clk, aCalled } of [
  { ms: 0, clk: false, aCalled: true },
  { ms: 100, clk: true, aCalled: false },
  { ms: 200, clk: false, aCalled: false },
  { ms: 300, clk: true, aCalled: true },
  { ms: 400, clk: true, aCalled: true },
]) {
  const aBefore = a.previous;
  if (aCalled) a = callEdge(a, { clk });
  const bBefore = b.previous;
  b = callEdge(b, { clk });
  conditionalRows.push([
    ms,
    Number(clk),
    Number(aCalled),
    Number(aBefore),
    Number(a.previous),
    Number(a.q),
    Number(bBefore),
    Number(b.previous),
    Number(b.q),
  ]);
}
print(
  'conditional-versus-always-called',
  [
    'ms',
    'clk',
    'a_called',
    'a_before',
    'a_after',
    'a_q',
    'b_before',
    'b_after',
    'b_q',
  ],
  conditionalRows,
);

let stale = initialEdge();
let naiveCount = 0;
let oneShotCount = 0;
const staleRows = [];
for (const { ms, clk, called } of [
  { ms: 0, clk: false, called: true },
  { ms: 100, clk: true, called: true },
  { ms: 200, clk: true, called: false },
  { ms: 300, clk: true, called: true },
]) {
  if (called) stale = callEdge(stale, { clk });
  naiveCount += Number(stale.q);
  oneShotCount += Number(called && stale.q);
  staleRows.push([
    ms,
    Number(clk),
    Number(called),
    Number(stale.q),
    naiveCount,
    oneShotCount,
  ]);
}
print(
  'stale-q-double-consumption',
  ['ms', 'clk', 'called', 'stored_q', 'naive_count', 'called_and_q_count'],
  staleRows,
);

let resumeA = initialEdge();
let resumeB = initialEdge();
const resumeRows = [];
for (const { ms, clk, enable } of [
  { ms: 0, clk: false, enable: true },
  { ms: 100, clk: true, enable: false },
  { ms: 200, clk: true, enable: false },
  { ms: 300, clk: true, enable: true },
]) {
  if (enable) resumeA = callEdge(resumeA, { clk });
  resumeB = callEdge(resumeB, { clk });
  resumeRows.push([
    ms,
    Number(clk),
    Number(enable),
    Number(resumeA.q),
    Number(resumeB.q),
    Number(enable && resumeB.q),
  ]);
}
print(
  'held-high-resume',
  ['ms', 'clk', 'enable', 'skipped-a_q', 'always-b_q', 'always_b_accepted'],
  resumeRows,
);

let missed = initialEdge();
const missedRows = [];
for (const { ms, clk, called } of [
  { ms: 0, clk: false, called: true },
  { ms: 100, clk: true, called: false },
  { ms: 200, clk: false, called: false },
  { ms: 300, clk: false, called: true },
]) {
  if (called) missed = callEdge(missed, { clk });
  missedRows.push([ms, Number(clk), Number(called), Number(missed.q)]);
}
print('missing-pulse', ['ms', 'clk', 'called', 'a_q'], missedRows);

let deadline = initialDeadlineTimer({ startedAtMs: 0, durationMs: 300 });
let gap = initialGapTimer({ startedAtMs: 0, durationMs: 300, maxGapMs: 150 });
const timerRows = [];
for (const { ms, called } of [
  { ms: 0, called: true },
  { ms: 100, called: true },
  { ms: 200, called: false },
  { ms: 300, called: true },
  { ms: 400, called: true },
]) {
  if (called) {
    deadline = callDeadlineTimer(deadline, { nowMs: ms });
    gap = callGapTimer(gap, { nowMs: ms });
  }
  timerRows.push([
    ms,
    Number(called),
    deadline.elapsedMs,
    Number(deadline.expired),
    gap.gapMs,
    gap.error ?? '-',
    Number(gap.expired),
  ]);
}
print(
  'custom-timer-policies',
  [
    'ms',
    'called',
    'deadline_elapsed',
    'deadline_expired',
    'gap_ms',
    'gap_error',
    'gap_expired',
  ],
  timerRows,
);
