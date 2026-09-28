import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  createWorkflow,
  CONTEXT,
  INITIAL,
  TARGET,
} from '../public/examples/recipe-validation/workflow.mjs';
const raw = JSON.stringify(TARGET);
const staged = (f) => {
  const c = f.prepare(raw);
  assert.equal(c.ok, true);
  return f.confirm({ ...c, raw });
};
void test('downloadable workflow self-test executes', () => {
  assert.match(
    execFileSync(
      process.execPath,
      ['public/examples/recipe-validation/workflow-self-test.mjs'],
      { encoding: 'utf8' },
    ),
    /PASS/,
  );
});
void test('canonical formatting and key order preserve digest; no change produces no confirmation', () => {
  const a = createWorkflow().prepare(raw);
  const reordered = JSON.stringify(
    Object.fromEntries(Object.entries(TARGET).reverse()),
    null,
    2,
  );
  const b = createWorkflow().prepare(reordered);
  assert.equal(a.digest, b.digest);
  assert.equal(a.diff.length, 4);
  assert.equal(
    createWorkflow().prepare(JSON.stringify(INITIAL)).reason,
    'NO_CHANGE',
  );
  const f = createWorkflow(),
    c = f.prepare(raw);
  assert.equal(f.confirm({ ...c, raw: reordered }).status, 'staged');
});
void test('full recipe rejects missing, null, strings, unknown units, duplicate keys and hidden fields', () => {
  for (const value of [
    { ...TARGET, temp: null },
    { ...TARGET, temp: '55' },
    { ...TARGET, units: '°F' },
    { ...TARGET, temp: undefined },
  ])
    assert.equal(
      createWorkflow().prepare(JSON.stringify(value)).reason,
      'INVALID_RECIPE',
    );
  assert.equal(
    createWorkflow().prepare(raw.replace('"temp":55', '"temp":55,"temp":56'))
      .reason,
    'INVALID_RECIPE',
  );
  const f = createWorkflow();
  f.setVisible(['temp', 'speed', 'low']);
  assert.equal(f.prepare(raw).reason, 'HIDDEN_FIELD');
  assert.equal(f.inspect().writes, 0);
});
void test('content, hash, identity and session substitution consume confirmation without writes', () => {
  for (const changes of [
    { raw: JSON.stringify({ ...TARGET, temp: 56 }) },
    { digest: 'false' },
    ...Object.keys(CONTEXT).map((key) => ({
      context: { ...CONTEXT, [key]: 'other' },
    })),
  ]) {
    const f = createWorkflow(),
      c = f.prepare(raw);
    assert.equal(f.confirm({ ...c, raw, ...changes }).ok, false);
    assert.equal(f.confirm({ ...c, raw }).reason, 'CONFIRMATION_UNAVAILABLE');
    assert.equal(f.inspect().writes, 0);
  }
});
void test('confirmation expiry boundary, conflict, permissions and full-field scope checked again', () => {
  for (const time of [299999, 300000]) {
    const f = createWorkflow(),
      c = f.prepare(raw);
    f.advance(time);
    assert.equal(f.confirm({ ...c, raw }).ok, time === 299999);
  }
  for (const mutate of [
    (f) => f.setAccess(false),
    (f) => f.setScope(['temp']),
    (f) => f.setVisible(['temp']),
    (f) => f.externalUpdate(JSON.stringify(INITIAL)),
  ]) {
    const f = createWorkflow(),
      c = f.prepare(raw);
    mutate(f);
    assert.equal(f.confirm({ ...c, raw }).ok, false);
    assert.equal(f.inspect().writes, 0);
  }
});
void test('stage rechecks execution conditions, is consumed on failure, and never auto-retries', () => {
  for (const mutate of [
    (f) => f.advance(300000),
    (f) => f.setAccess(false),
    (f) => f.setScope(['temp']),
    (f) => f.setVisible(['temp']),
    (f) => f.externalUpdate(JSON.stringify(INITIAL)),
  ]) {
    const f = createWorkflow(),
      s = staged(f);
    mutate(f);
    assert.equal(f.apply(s.stageId).ok, false);
    assert.equal(f.inspect().writes, 0);
    assert.equal(f.apply(s.stageId).reason, 'STAGE_UNAVAILABLE');
  }
  const f = createWorkflow(),
    s = staged(f);
  assert.equal(f.prepare(raw).reason, 'STAGE_PENDING');
  assert.equal(f.apply(s.stageId, ['invalid']).reason, 'INVALID_SCRIPT');
  assert.equal(f.inspect().writes, 0);
  const sparse = createWorkflow(),
    sparseStage = staged(sparse);
  assert.equal(
    sparse.apply(sparseStage.stageId, Array(4)).reason,
    'INVALID_SCRIPT',
  );
  assert.equal(sparse.inspect().writes, 0);
});
void test('lost reply at every step stops later writes and keeps uncertainty despite actual fake changes', () => {
  for (let index = 0; index < 4; index++) {
    const f = createWorkflow(),
      s = staged(f),
      script = ['ok', 'ok', 'ok', 'ok'];
    script[index] = 'timeout';
    const r = f.apply(s.stageId, script);
    assert.equal(r.status, index === 0 ? 'unknown' : 'partial');
    assert.equal(r.writes, index + 1);
    assert.equal(r.steps[index].status, 'unknown');
    assert.ok(
      r.steps.slice(index + 1).every((step) => step.status === 'not-sent'),
    );
    assert.equal(f.prepare(raw).reason, 'UNRESOLVED');
    assert.equal(f.inspect().unresolved, true);
  }
});
void test('wrong operation and staging-area response never prove active application; returned data is isolated', () => {
  for (const outcome of ['wrong-operation', 'staging-only']) {
    const f = createWorkflow(),
      s = staged(f),
      r = f.apply(s.stageId, [outcome, 'ok', 'ok', 'ok']);
    assert.equal(r.status, 'unknown');
    assert.equal(r.writes, 1);
  }
  const f = createWorkflow();
  const view = f.inspect();
  view.actual.temp = 999;
  assert.equal(f.inspect().actual.temp, 50);
  const c = f.prepare(raw);
  c.diff[0].next = 99;
  const s = f.confirm({ ...c, raw });
  assert.equal(f.apply(s.stageId).status, 'applied');
  assert.equal(f.inspect().actual.temp, 55);
});
void test('model time and operation-count limits refuse invalid progression', () => {
  const f = createWorkflow();
  assert.throws(
    () => f.externalUpdate(JSON.stringify({ ...TARGET, recipe_id: 'R2' })),
    TypeError,
  );
  assert.equal(f.inspect().actual.recipe_id, 'R1');
  assert.equal(f.inspect().revision, 41);
  assert.throws(() => f.advance(NaN), RangeError);
  f.advance(10);
  assert.throws(() => f.advance(9), RangeError);
  assert.throws(() => f.advance(1000001), RangeError);
  for (let i = 0; i < 100; i++) assert.equal(f.prepare(raw).ok, true);
  assert.equal(f.prepare(raw).reason, 'MODEL_OPERATION_LIMIT');
});

void test('latest permissible prepare still reaches exact expiry; later preparation is refused', () => {
  const f = createWorkflow();
  f.advance(700000);
  const c = f.prepare(raw);
  assert.equal(c.expiresAt, 1000000);
  f.advance(1000000);
  assert.equal(f.confirm({ ...c, raw }).reason, 'EXPIRED');
  const g = createWorkflow();
  g.advance(700001);
  assert.equal(g.prepare(raw).reason, 'MODEL_TIME_LIMIT');
  assert.equal(g.inspect().writes, 0);
});
