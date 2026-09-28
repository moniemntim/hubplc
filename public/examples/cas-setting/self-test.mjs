import assert from 'node:assert/strict';
import { join } from 'node:path';
import { SettingStore, makeDirectory } from './store.mjs';
const path = join(makeDirectory(), 'self-test.sqlite');
let db = new SettingStore(path, { initialize: true });
try {
  const a = { id: 'A1', expectedVersion: 7, raw: 550, epoch: 1 };
  assert.equal(db.submit('A', a).status, 'COMMITTED');
  assert.equal(
    db.submit('B', { ...a, id: 'B1', raw: 520 }).status,
    'VERSION_CONFLICT',
  );
  assert.equal(db.read().raw, 550);
  assert.equal(db.read().version, 8);
  assert.equal(db.submit('A', a).replay, true);
  assert.equal(
    db.submit('A', { ...a, raw: 551 }).status,
    'IDEMPOTENCY_CONFLICT',
  );
  assert.equal(db.rotateEpoch(1), true);
  assert.equal(
    db.submit('B', { id: 'OLD', expectedVersion: 8, raw: 520, epoch: 1 })
      .status,
    'FENCED',
  );
  assert.equal(
    db.submit('B', { id: 'NEW', expectedVersion: 8, raw: 520, epoch: 2 })
      .status,
    'COMMITTED',
  );
  db.close();
  db = new SettingStore(path);
  assert.equal(db.read().version, 9);
  assert.equal(db.query('A', 'A1').current.version, 8);
  assert.equal(db.query('B', 'A1').status, 'NOT_FOUND');
  assert.equal(db.history().length, 4);
  console.log('self-test: PASS');
} finally {
  db.close();
}
