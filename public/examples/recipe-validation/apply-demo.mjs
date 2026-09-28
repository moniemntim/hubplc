import assert from 'node:assert/strict';
import { createWorkflow, TARGET } from './workflow.mjs';
const raw = JSON.stringify(TARGET);
for (const { name, outcomes } of [
  { name: 'success', outcomes: ['ok', 'ok', 'ok', 'ok'] },
  { name: 'timeout-third', outcomes: ['ok', 'ok', 'timeout', 'ok'] },
  { name: 'staging-only', outcomes: ['staging-only', 'ok', 'ok', 'ok'] },
]) {
  const f = createWorkflow();
  f.select(raw);
  const c = f.prepare(raw);
  const s = f.confirm({ ...c, raw });
  console.log(`${name} before_apply_writes=${f.inspect().writes}`);
  const result = f.apply(s.stageId, outcomes);
  console.log(
    `${name} result=${result.status} steps=${result.steps.map((step) => step.status).join(',')} writes=${result.writes}`,
  );
  if (name === 'timeout-third') {
    assert.equal(result.status, 'partial');
    console.log(
      `timeout-third fake_active_low=${f.inspect().actual.low} next_prepare=${f.prepare(raw).reason}`,
    );
  }
  assert.equal(f.apply(s.stageId).reason, 'STAGE_UNAVAILABLE');
}
console.log('apply demo: PASS');
