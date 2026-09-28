import { createHash } from 'node:crypto';
import { validateRawRecipe } from './recipe-validation.mjs';

export const INITIAL = Object.freeze({
  schema_version: 'recipe-v3',
  recipe_id: 'R1',
  temp: 50,
  speed: 1200,
  low: 20,
  high: 80,
});
export const TARGET = Object.freeze({
  ...INITIAL,
  temp: 55,
  speed: 1300,
  low: 25,
  high: 85,
});
const fields = ['temp', 'speed', 'low', 'high'];
const units = { temp: '°C', speed: 'rpm', low: '%', high: '%' };
const hash = (value) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
const copy = (value) => structuredClone(value);
const reject = (reason) => ({ ok: false, reason });
export const CONTEXT = Object.freeze({
  user: 'U17',
  session: 'S1',
  device: 'D-03',
  recipeVersion: 8,
});
const sameContext = (value) =>
  value && Object.keys(CONTEXT).every((key) => value[key] === CONTEXT[key]);

// Synchronous, single-owner, in-memory teaching model. No network, PLC, login,
// persistence, real clock, or production transaction/token implementation.
export function createWorkflow() {
  let now = 0,
    revision = 41,
    actual = { ...INITIAL },
    canApply = true,
    visible = [...fields],
    scope = [...fields];
  let serial = 0,
    confirmation = null,
    stage = null,
    unresolved = false,
    writes = 0;
  const canonical = (raw) => {
    const result = validateRawRecipe(raw);
    if (!result.valid) return null;
    return {
      text: result.candidate.canonical,
      value: JSON.parse(result.candidate.canonical),
    };
  };
  const access = () =>
    canApply && fields.every((field) => scope.includes(field));
  const envelope = (candidate) => ({
    schema: 'confirmation-v1',
    context: CONTEXT,
    revision,
    old: actual,
    next: candidate.value,
  });
  const api = {
    inspect: () => copy({ now, revision, actual, writes, unresolved }),
    advance(time) {
      if (!Number.isSafeInteger(time) || time < now || time > 1000000)
        throw new RangeError('monotonic virtual time 0..1000000 required');
      now = time;
    },
    setAccess(value) {
      if (typeof value !== 'boolean') throw new TypeError('boolean required');
      canApply = value;
    },
    setVisible(list) {
      if (!Array.isArray(list) || list.some((field) => !fields.includes(field)))
        throw new TypeError('known fields required');
      visible = [...list];
    },
    setScope(list) {
      if (!Array.isArray(list) || list.some((field) => !fields.includes(field)))
        throw new TypeError('known fields required');
      scope = [...list];
    },
    externalUpdate(raw) {
      const candidate = canonical(raw);
      if (!candidate || candidate.value.recipe_id !== INITIAL.recipe_id)
        throw new TypeError('valid complete R1 recipe required');
      if (revision >= 1000000) throw new RangeError('model revision limit');
      actual = candidate.value;
      revision++;
    },
    select(raw) {
      return { ok: true, selectedRaw: raw, writes };
    },
    prepare(raw, context = CONTEXT) {
      confirmation = null;
      if (unresolved) return reject('UNRESOLVED');
      if (stage?.status === 'ready') return reject('STAGE_PENDING');
      if (!sameContext(context)) return reject('CONTEXT_MISMATCH');
      if (!access()) return reject('PERMISSION_OR_SCOPE');
      const candidate = canonical(raw);
      if (!candidate) return reject('INVALID_RECIPE');
      if (candidate.value.recipe_id !== INITIAL.recipe_id)
        return reject('RECIPE_ID_MISMATCH');
      // Entire payload is written, so every writable field must be visible.
      if (fields.some((field) => !visible.includes(field)))
        return reject('HIDDEN_FIELD');
      const diff = fields
        .filter((field) => actual[field] !== candidate.value[field])
        .map((field) => ({
          field,
          old: actual[field],
          next: candidate.value[field],
          unit: units[field],
        }));
      if (diff.length === 0)
        return { ok: false, reason: 'NO_CHANGE', diff: [] };
      if (now > 700000) return reject('MODEL_TIME_LIMIT');
      if (++serial > 100) return reject('MODEL_OPERATION_LIMIT');
      const digest = hash(envelope(candidate));
      confirmation = {
        id: `C${serial}`,
        candidate,
        revision,
        digest,
        expiresAt: now + 300000,
        used: false,
      };
      return {
        ok: true,
        id: confirmation.id,
        revision,
        digest,
        expiresAt: confirmation.expiresAt,
        diff: copy(diff),
      };
    },
    confirm({ id, digest, raw, context = CONTEXT }) {
      const record = confirmation;
      if (!record || record.id !== id || record.used)
        return reject('CONFIRMATION_UNAVAILABLE');
      // Every attempt consumes this teaching confirmation, including rejection.
      record.used = true;
      if (unresolved) return reject('UNRESOLVED');
      if (!sameContext(context)) return reject('CONTEXT_MISMATCH');
      if (!access()) return reject('PERMISSION_OR_SCOPE');
      if (fields.some((field) => !visible.includes(field)))
        return reject('HIDDEN_FIELD');
      if (now >= record.expiresAt) return reject('EXPIRED');
      if (revision !== record.revision) return reject('REVISION_CONFLICT');
      const candidate = canonical(raw);
      if (
        !candidate ||
        candidate.text !== record.candidate.text ||
        digest !== record.digest ||
        hash(envelope(candidate)) !== record.digest
      )
        return reject('CONTENT_MISMATCH');
      stage = {
        id: `ST${serial}`,
        status: 'ready',
        candidate: copy(candidate),
        revision,
        expiresAt: record.expiresAt,
      };
      return { ok: true, status: 'staged', stageId: stage.id, writes };
    },
    apply(stageId, outcomes = ['ok', 'ok', 'ok', 'ok'], context = CONTEXT) {
      if (!stage || stage.id !== stageId || stage.status !== 'ready')
        return reject('STAGE_UNAVAILABLE');
      stage.status = 'consumed';
      if (unresolved) return reject('UNRESOLVED');
      if (!sameContext(context)) return reject('CONTEXT_MISMATCH');
      if (!access()) return reject('PERMISSION_OR_SCOPE');
      if (now >= stage.expiresAt) return reject('EXPIRED');
      if (fields.some((field) => !visible.includes(field)))
        return reject('HIDDEN_FIELD');
      if (revision !== stage.revision) return reject('REVISION_CONFLICT');
      if (
        !Array.isArray(outcomes) ||
        outcomes.length !== 4 ||
        fields.some(
          (_, index) =>
            !['ok', 'timeout', 'wrong-operation', 'staging-only'].includes(
              outcomes[index],
            ),
        )
      )
        return reject('INVALID_SCRIPT');
      const steps = fields.map((field) => ({ field, status: 'not-sent' }));
      for (let index = 0; index < fields.length; index++) {
        const field = fields[index],
          before = revision,
          outcome = outcomes[index];
        writes++;
        // Fake device mutates its active values even when its reply is lost.
        // staging-only changes no active value. This hidden truth is NOT a reply.
        if (outcome !== 'staging-only') {
          actual = { ...actual, [field]: stage.candidate.value[field] };
          revision++;
        }
        const proof =
          outcome === 'timeout'
            ? null
            : {
                device: 'D-03',
                operation: outcome === 'wrong-operation' ? 'OTHER' : stage.id,
                field,
                value: stage.candidate.value[field],
                area: outcome === 'staging-only' ? 'staging' : 'active',
                revisionBefore: before,
                revisionAfter: revision,
              };
        const matched =
          proof &&
          proof.device === 'D-03' &&
          proof.operation === stage.id &&
          proof.field === field &&
          proof.value === stage.candidate.value[field] &&
          proof.area === 'active' &&
          proof.revisionBefore === before &&
          proof.revisionAfter === before + 1;
        steps[index] = {
          field,
          status: matched ? 'confirmed' : 'unknown',
          proof,
        };
        if (!matched) {
          unresolved = true;
          return {
            ok: true,
            status: index === 0 ? 'unknown' : 'partial',
            steps,
            writes,
          };
        }
      }
      return { ok: true, status: 'applied', steps, writes, revision };
    },
  };
  return api;
}
