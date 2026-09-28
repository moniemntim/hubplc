import assert from 'node:assert/strict';
import test from 'node:test';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  SettingStore,
  makeDirectory,
  LIMIT,
} from '../public/examples/cas-setting/store.mjs';
import { runRace } from '../public/examples/cas-setting/race.mjs';
import { openEditor } from '../public/examples/cas-setting/editor.mjs';
const request = (overrides = {}) => ({
  id: 'A1',
  expectedVersion: 7,
  raw: 550,
  epoch: 1,
  ...overrides,
});
const database = () => {
  const path = join(makeDirectory(), 'test.sqlite');
  return { path, db: new SettingStore(path, { initialize: true }) };
};
void test('real SQLite conditional write has one winner in both sequential orders', () => {
  for (const first of ['A', 'B']) {
    const { db } = database();
    try {
      assert.equal(db.submit(first, request()).status, 'COMMITTED');
      assert.equal(
        db.submit(first === 'A' ? 'B' : 'A', request({ id: 'B1', raw: 520 }))
          .status,
        'VERSION_CONFLICT',
      );
      const current = db.read();
      assert.equal(current.version, 8);
      assert.equal(current.last_writer, first);
      assert.equal(current.raw, 550);
      assert.match(
        current.committed_at,
        /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/,
      );
      assert.equal(db.history().length, 2);
    } finally {
      db.close();
    }
  }
});
void test('two ready child processes contend on the same database and old version', async () => {
  assert.deepEqual(await runRace(), { committed: 1, conflicts: 1, version: 8 });
});
void test('replay, changed payload/actor/version/epoch, and reopen preserve original results', () => {
  const setup = database();
  let db = setup.db;
  try {
    const first = db.submit('A', request());
    db.close();
    db = new SettingStore(setup.path);
    assert.deepEqual(db.submit('A', request()), { ...first, replay: true });
    for (const patch of [{ raw: 560 }, { expectedVersion: 8 }, { epoch: 2 }])
      assert.equal(
        db.submit('A', request(patch)).status,
        'IDEMPOTENCY_CONFLICT',
      );
    assert.equal(db.submit('B', request()).status, 'IDEMPOTENCY_CONFLICT');
    assert.equal(db.read().version, 8);
    assert.equal(db.history().length, 1);
    assert.equal(db.query('B', 'A1').status, 'NOT_FOUND');
    assert.equal(db.query('A', 'MISSING').status, 'NOT_FOUND');
  } finally {
    db.close();
  }
});
void test('epoch fencing blocks an old writer even with the current resource version', () => {
  const { db } = database();
  try {
    db.submit('A', request());
    assert.equal(db.rotateEpoch(1), true);
    assert.equal(db.rotateEpoch(1), false);
    assert.equal(
      db.submit('B', request({ id: 'STALE', expectedVersion: 8, epoch: 1 }))
        .status,
      'FENCED',
    );
    assert.equal(db.read().version, 8);
    assert.equal(db.submit('A', request()).replay, true);
    assert.equal(db.read().version, 8);
    assert.equal(
      db.submit(
        'B',
        request({ id: 'FRESH', expectedVersion: 8, epoch: 2, raw: 520 }),
      ).status,
      'COMMITTED',
    );
    assert.equal(db.read().version, 9);
  } finally {
    db.close();
  }
});
void test('invalid input and unknown actor cannot modify setting or create ledger rows', () => {
  const { db } = database();
  try {
    for (const patch of [
      { raw: NaN },
      { raw: '550' },
      { raw: 1001 },
      { raw: -1 },
      { raw: 5.5 },
      { epoch: 0 },
      { expectedVersion: 0 },
      { id: 'x; DROP TABLE setting' },
      { extra: 1 },
    ])
      assert.equal(db.submit('A', request(patch)).status, 'INVALID_REQUEST');
    assert.equal(db.submit('C', request()).status, 'DENIED');
    assert.equal(db.read().version, 7);
    assert.equal(db.history().length, 0);
  } finally {
    db.close();
  }
});
void test('ledger insert failure rolls back setting and revision in the same transaction', () => {
  const { db, path } = database();
  const injector = new DatabaseSync(path);
  try {
    injector.exec(
      "CREATE TRIGGER fail_log BEFORE INSERT ON operations BEGIN SELECT RAISE(ABORT,'injected ledger failure'); END;",
    );
    assert.throws(() => db.submit('A', request()), /injected ledger failure/);
    assert.equal(db.read().version, 7);
    assert.equal(db.read().raw, 500);
    assert.equal(db.history().length, 0);
    injector.exec('DROP TRIGGER fail_log');
    assert.equal(db.submit('A', request()).status, 'COMMITTED');
  } finally {
    injector.close();
    db.close();
  }
});
void test('missing resource and exhausted revision are not reported as ordinary success', () => {
  for (const kind of ['missing', 'exhausted']) {
    const { db, path } = database();
    const inject = new DatabaseSync(path);
    try {
      if (kind === 'missing') inject.exec('DELETE FROM setting');
      else inject.prepare('UPDATE setting SET version=?').run(LIMIT);
      assert.equal(
        db.submit(
          'A',
          request({ expectedVersion: kind === 'missing' ? 7 : LIMIT }),
        ).status,
        kind === 'missing' ? 'NOT_FOUND' : 'VERSION_EXHAUSTED',
      );
    } finally {
      inject.close();
      db.close();
    }
  }
});
void test('HMI conflict preserves draft and requires explicit rebase for the next intent', () => {
  const { db } = database();
  try {
    const a = openEditor(db, 'A'),
      b = openEditor(db, 'B');
    a.edit(550);
    b.edit(520);
    a.submit('A1');
    b.submit('B1');
    const view = b.inspect();
    assert.deepEqual(
      [
        view.baseline.raw,
        view.current.raw,
        view.draftRaw,
        view.current.last_writer,
      ],
      [500, 550, 520, 'A'],
    );
    assert.throws(() => b.submit('B2'), /rebase/);
    assert.equal(db.read().version, 8);
    b.rebaseKeepingDraft();
    assert.equal(b.inspect().draftRaw, 520);
    b.submit('B2');
    assert.equal(db.read().version, 9);
    assert.equal(db.read().last_writer, 'B');
  } finally {
    db.close();
  }
});
void test('lost reply is queried without new submission, while a query miss remains unknown', () => {
  const { db } = database();
  try {
    const a = openEditor(db, 'A');
    a.edit(550);
    a.submit('LOST', { loseReply: true });
    assert.equal(a.inspect().status, 'unknown');
    assert.throws(() => a.submit('NEW'));
    assert.throws(() => a.rebaseKeepingDraft());
    assert.throws(() => a.discardDraft());
    assert.equal(a.queryOriginal().status, 'COMMITTED');
    assert.equal(db.read().version, 8);
    assert.equal(db.history().length, 1);
    const b = openEditor(db, 'B');
    b.submit('invalid lowercase', { loseReply: true });
    assert.equal(b.queryOriginal().status, 'NOT_FOUND');
    assert.equal(b.inspect().status, 'unknown');
    assert.equal(db.read().version, 8);
  } finally {
    db.close();
  }
});
void test('discard resets local draft and returned editor data cannot mutate the baseline', () => {
  const { db } = database();
  try {
    const e = openEditor(db, 'A');
    e.edit(550);
    const view = e.inspect();
    view.baseline.version = 999;
    assert.equal(e.inspect().baseline.version, 7);
    e.discardDraft();
    assert.equal(e.inspect().draftRaw, 500);
  } finally {
    db.close();
  }
});
void test('ledger capacity refuses new IDs but preserves exact replay, and initialization refuses existing files', () => {
  const { db, path } = database();
  const inject = new DatabaseSync(path);
  try {
    db.submit('A', request());
    inject.exec('BEGIN');
    const insert = inject.prepare('INSERT INTO operations VALUES(?,?,?,?)');
    for (let i = 1; i < 1000; i++) insert.run(`FILL-${i}`, 'A', '{}', '{}');
    inject.exec('COMMIT');
    assert.equal(
      db.submit('B', request({ id: 'CAP', expectedVersion: 8 })).status,
      'LEDGER_FULL',
    );
    assert.equal(db.read().version, 8);
    assert.equal(db.submit('A', request()).replay, true);
    assert.throws(
      () => new SettingStore(path, { initialize: true }),
      /new database path/,
    );
    assert.equal(db.read().version, 8);
  } finally {
    inject.close();
    db.close();
  }
});
void test('an unexpected store exception leaves editor unknown until original outcome is established', () => {
  const { db, path } = database();
  const inject = new DatabaseSync(path);
  try {
    const editor = openEditor(db, 'A');
    editor.edit(550);
    inject.exec(
      "CREATE TRIGGER fail_log BEFORE INSERT ON operations BEGIN SELECT RAISE(ABORT,'injected'); END;",
    );
    assert.throws(() => editor.submit('ERR'), /injected/);
    assert.equal(editor.inspect().status, 'unknown');
    assert.equal(editor.queryOriginal().status, 'NOT_FOUND');
    assert.equal(editor.inspect().status, 'unknown');
    assert.equal(db.read().version, 7);
  } finally {
    inject.close();
    db.close();
  }
});
void test('a refresh read failure after commit also blocks a new intent until original query', () => {
  const { db } = database();
  let reads = 0;
  try {
    const adapter = {
      read() {
        if (++reads === 2) throw new Error('read failed');
        return db.read();
      },
      submit: db.submit.bind(db),
      query: db.query.bind(db),
    };
    const editor = openEditor(adapter, 'A');
    editor.edit(550);
    assert.throws(() => editor.submit('READ-FAIL'), /read failed/);
    assert.equal(editor.inspect().status, 'unknown');
    assert.throws(() => editor.submit('NEW'));
    assert.equal(editor.queryOriginal().status, 'COMMITTED');
    assert.equal(db.read().version, 8);
  } finally {
    db.close();
  }
});
void test('unknown resolution binds the complete original request, not an older operation with the same ID', () => {
  const { db } = database();
  try {
    db.submit('A', request({ id: 'REUSED' }));
    const editor = openEditor(db, 'A');
    editor.edit(560);
    editor.submit('REUSED', { loseReply: true });
    assert.equal(editor.inspect().status, 'unknown');
    assert.equal(editor.queryOriginal().status, 'IDEMPOTENCY_CONFLICT');
    assert.equal(editor.inspect().status, 'rejected');
    assert.equal(db.read().raw, 550);
    assert.equal(db.read().version, 8);
  } finally {
    db.close();
  }
});
