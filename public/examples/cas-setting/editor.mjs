import { SettingStore, makeDirectory } from './store.mjs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

export function openEditor(db, actor) {
  if (!['A', 'B'].includes(actor))
    throw new TypeError('fixed demo actor required');
  let baseline = db.read(),
    current = { ...baseline },
    draftRaw = baseline.raw,
    status = 'editing',
    pending = null;
  return {
    inspect: () =>
      structuredClone({ actor, baseline, current, draftRaw, status }),
    edit(raw) {
      if (!Number.isInteger(raw) || raw < 0 || raw > 1000)
        throw new RangeError('raw 0..1000 required');
      if (status === 'unknown')
        throw new Error('resolve original operation first');
      draftRaw = raw;
    },
    submit(id, { loseReply = false } = {}) {
      if (status !== 'editing')
        throw new Error('explicit rebase required before another intent');
      pending = {
        id,
        expectedVersion: baseline.version,
        raw: draftRaw,
        epoch: baseline.epoch,
      };
      status = 'unknown';
      let result;
      try {
        result = db.submit(actor, pending);
      } catch (error) {
        status = 'unknown';
        throw error;
      }
      // The write actually ran; this flag discards only its reply for teaching.
      if (loseReply) {
        status = 'unknown';
        return { status: 'unknown' };
      }
      current = db.read();
      status =
        result.status === 'COMMITTED'
          ? 'committed'
          : result.status === 'VERSION_CONFLICT'
            ? 'conflict'
            : 'rejected';
      return result;
    },
    queryOriginal() {
      if (status !== 'unknown')
        throw new Error('no unknown original operation');
      const result = db.query(actor, pending.id, pending);
      if (result.status === 'NOT_FOUND') return result;
      current = db.read();
      status =
        result.status === 'COMMITTED'
          ? 'committed'
          : result.status === 'VERSION_CONFLICT'
            ? 'conflict'
            : 'rejected';
      return result;
    },
    rebaseKeepingDraft() {
      if (status === 'unknown')
        throw new Error('resolve original operation first');
      baseline = db.read();
      current = { ...baseline };
      status = 'editing';
      return this.inspect();
    },
    discardDraft() {
      if (status === 'unknown')
        throw new Error('resolve original operation first');
      baseline = db.read();
      current = { ...baseline };
      draftRaw = baseline.raw;
      status = 'editing';
      return this.inspect();
    },
  };
}
export function runEditorDemo() {
  const db = new SettingStore(join(makeDirectory(), 'editors.sqlite'), {
    initialize: true,
  });
  try {
    const a = openEditor(db, 'A'),
      b = openEditor(db, 'B');
    a.edit(550);
    b.edit(520);
    a.submit('EDIT-A');
    b.submit('EDIT-B');
    let view = b.inspect();
    console.log(
      `B=${view.status} base=${view.baseline.raw}@v${view.baseline.version} current=${view.current.raw}@v${view.current.version} draft=${view.draftRaw} last_writer=${view.current.last_writer}`,
    );
    assert.equal(view.status, 'conflict');
    assert.equal(view.draftRaw, 520);
    view = b.rebaseKeepingDraft();
    console.log(
      `B-rebased base=${view.baseline.raw}@v${view.baseline.version} draft=${view.draftRaw}`,
    );
    b.submit('EDIT-B-NEW');
    view = b.inspect();
    console.log(
      `B=${view.status} current=${view.current.raw}@v${view.current.version} last_writer=${view.current.last_writer} device=NOT_CONNECTED`,
    );
    const c = openEditor(db, 'A');
    c.edit(560);
    c.submit('LOST-REPLY', { loseReply: true });
    console.log(`lost-reply=${c.inspect().status}`);
    assert.throws(() => c.submit('DO-NOT-RETRY'));
    console.log(
      `query-original=${c.queryOriginal().status} current_version=${db.read().version} history=${db.history().length}`,
    );
    assert.equal(db.history().length, 4);
    console.log('HMI editor demo: PASS');
  } finally {
    db.close();
  }
}
