import assert from 'node:assert/strict';
import { Handover, MAX_ACTIONS } from './model.mjs';
import { at, items, request } from './fixtures.mjs';
const create = () => new Handover({ handoverId: 'T', items, at });
export function verify() {
  const hidden = { ...items[0] };
  Object.defineProperty(hidden, 'owner', {
    value: '早班甲',
    enumerable: false,
  });
  assert.throws(
    () => new Handover({ handoverId: 'T', items: [hidden], at }),
    /invalid/,
  );
  const h = create();
  assert.equal(h.act(request('H1', 1)).decision, 'ACCEPTED');
  assert.equal(h.act(request('H1', 1)).decision, 'REVISION_CONFLICT');
  assert.equal(h.act(request('H2', 1)).decision, 'ACCEPTED');
  assert.equal(h.report(at).status, 'RESPONSIBILITY_ACCEPTED');
  assert.deepEqual(
    h.report(at).items.map((x) => [x.active, x.acked]),
    [
      [true, true],
      [false, true],
    ],
  );
  assert.equal(
    h.act(request('H1', 2, at, 'note', '新資訊，需要重讀')).decision,
    'NOTE_APPENDED',
  );
  assert.equal(h.report(at).status, 'AWAITING_ACCEPTANCE');
  assert.equal(h.report(at).actions.length, 3);
  assert.equal(
    h.act({ ...request('H1', 3), actor: '其他人' }).decision,
    'WRONG_OWNER',
  );
  assert.equal(h.act(request('H1', 3, at - 1)).decision, 'INVALID_REQUEST');
  const bad = structuredClone(items);
  bad[0].quality = 'Bad';
  const b = new Handover({ handoverId: 'BAD', items: bad, at });
  assert.equal(b.act(request('H1', 1)).decision, 'NEEDS_CLARIFICATION');
  assert.equal(b.report(at).actions.length, 0);
  assert.equal(create().act(request('H1', 1, at + 60000)).decision, 'ACCEPTED');
  assert.equal(
    create().act(request('H1', 1, at + 60001)).decision,
    'NEEDS_CLARIFICATION',
  );
  const cap = create();
  for (let i = 0; i < MAX_ACTIONS; i++)
    assert.equal(
      cap.act(request('H1', i + 1, at, 'note', '新的追蹤事項')).decision,
      'NOTE_APPENDED',
    );
  const before = cap.report(at);
  assert.equal(cap.act(request('H1', 17)).decision, 'CAPACITY_REACHED');
  assert.deepEqual(cap.report(at), before);
  const clone = h.report(at);
  clone.items[0].active = false;
  clone.actions[0].note = 'mutated';
  assert.equal(h.report(at).items[0].active, true);
  assert.notEqual(h.report(at).actions[0].note, 'mutated');
  assert.throws(
    () =>
      new Handover({
        handoverId: 'T',
        at,
        items: [{ ...items[0], owner: '' }],
      }),
    /invalid/,
  );
  assert.throws(
    () => new Handover({ handoverId: 'T', at, items: [items[0], items[0]] }),
    /invalid/,
  );
}
verify();
console.log(
  'self-test: PASS (revision, quality, freshness, capacity, independent alarm state)',
);
