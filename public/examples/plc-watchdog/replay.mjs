// Synthetic evidence exercise, not a CODESYS watchdog implementation or log parser.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const fixture = JSON.parse(
  readFileSync(new URL('./observations.json', import.meta.url), 'utf8'),
);
assert.equal(fixture.evidence, 'synthetic');
const { intervalMs, watchdogMs, sensitivity } = fixture.configuration;
assert.equal(sensitivity, 1, 'This exercise only covers sensitivity 1');
for (const n of [intervalMs, watchdogMs])
  assert.ok(Number.isFinite(n) && n > 0);
const omittedWindowMs = Math.max(watchdogMs * sensitivity, 2 * intervalMs);
console.log(
  `synthetic only; execution > ${watchdogMs} ms; omitted window ${omittedWindowMs} ms`,
);
for (const row of fixture.cases) {
  assert.ok(Number.isFinite(row.lastStartMs) && row.lastStartMs >= 0);
  assert.ok(
    Number.isFinite(row.observedAtMs) && row.observedAtMs >= row.lastStartMs,
  );
  for (const key of ['taskEnabled', 'traceComplete', 'running'])
    assert.equal(typeof row[key], 'boolean');
  const sinceStartMs = row.observedAtMs - row.lastStartMs;
  let classification = 'INSUFFICIENT_EVIDENCE';
  if (row.taskEnabled && row.traceComplete) {
    if (row.running) {
      if (row.runtimeExecutionMs !== null) {
        assert.ok(
          Number.isFinite(row.runtimeExecutionMs) &&
            row.runtimeExecutionMs >= 0,
        );
        classification =
          row.runtimeExecutionMs > watchdogMs
            ? 'EXECUTION_CANDIDATE'
            : 'NO_THRESHOLD_EXCEEDED';
      }
    } else {
      classification =
        sinceStartMs > omittedWindowMs
          ? 'OMITTED_CANDIDATE'
          : 'NO_THRESHOLD_EXCEEDED';
    }
  }
  assert.equal(classification, row.expected, row.id);
  console.log(
    `${row.id}: sinceStart=${sinceStartMs} ms, execution=${row.runtimeExecutionMs ?? 'unknown'} ms -> ${classification}`,
  );
}
console.log(
  '3 synthetic assertions passed; no runtime or output behavior verified',
);
