import assert from 'node:assert/strict';
import { createWorkflow, TARGET, CONTEXT } from './workflow.mjs';
const raw = JSON.stringify(TARGET);
export function runChecks() {
  const flow = createWorkflow();
  assert.equal(flow.select(raw).writes, 0);
  const shown = flow.prepare(raw);
  assert.equal(shown.diff.length, 4);
  const staged = flow.confirm({ ...shown, raw });
  assert.equal(staged.status, 'staged');
  assert.equal(flow.inspect().writes, 0);
  assert.equal(
    flow.confirm({ ...shown, raw }).reason,
    'CONFIRMATION_UNAVAILABLE',
  );
  assert.equal(flow.apply(staged.stageId).status, 'applied');
  assert.equal(flow.inspect().revision, 45);
  assert.equal(flow.apply(staged.stageId).reason, 'STAGE_UNAVAILABLE');
  const partial = createWorkflow();
  const review = partial.prepare(raw);
  const s = partial.confirm({ ...review, raw });
  const result = partial.apply(s.stageId, ['ok', 'ok', 'timeout', 'ok']);
  assert.equal(result.status, 'partial');
  assert.deepEqual(
    result.steps.map((step) => step.status),
    ['confirmed', 'confirmed', 'unknown', 'not-sent'],
  );
  assert.equal(result.writes, 3);
  assert.equal(partial.inspect().actual.low, 25);
  assert.equal(partial.inspect().actual.high, 80);
  assert.equal(partial.prepare(raw).reason, 'UNRESOLVED');
  const expired = createWorkflow();
  const old = expired.prepare(raw);
  expired.advance(300000);
  assert.equal(expired.confirm({ ...old, raw }).reason, 'EXPIRED');
  const changed = createWorkflow();
  const old2 = changed.prepare(raw);
  changed.externalUpdate(JSON.stringify({ ...TARGET, temp: 51 }));
  assert.equal(changed.confirm({ ...old2, raw }).reason, 'REVISION_CONFLICT');
  const wrong = createWorkflow();
  const old3 = wrong.prepare(raw);
  assert.equal(
    wrong.confirm({ ...old3, raw, context: { ...CONTEXT, device: 'OTHER' } })
      .reason,
    'CONTEXT_MISMATCH',
  );
  const hidden = createWorkflow();
  const hc = hidden.prepare(raw);
  const hs = hidden.confirm({ ...hc, raw });
  hidden.setVisible(['temp']);
  assert.equal(hidden.apply(hs.stageId).reason, 'HIDDEN_FIELD');
  assert.equal(hidden.inspect().writes, 0);
  const late = createWorkflow();
  late.advance(700001);
  assert.equal(late.prepare(raw).reason, 'MODEL_TIME_LIMIT');
  return true;
}
runChecks();
console.log('workflow self-test: PASS');
