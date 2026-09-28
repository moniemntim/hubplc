import assert from 'node:assert/strict';
import { join } from 'node:path';
import { SettingStore, makeDirectory } from './store.mjs';
import { runRace } from './race.mjs';
const path = join(makeDirectory(), 'demo.sqlite');
let db = new SettingStore(path, { initialize: true });
const a = { id: 'OP-A', expectedVersion: 7, raw: 550, epoch: 1 };
try {
  const first = db.submit('A', a);
  assert.equal(first.status, 'COMMITTED');
  console.log(
    `A=${first.status} version=${first.current.version} raw=${first.current.raw}`,
  );
  const b = db.submit('B', {
    id: 'OP-B',
    expectedVersion: 7,
    raw: 520,
    epoch: 1,
  });
  assert.equal(b.status, 'VERSION_CONFLICT');
  console.log(
    `B=${b.status} version=${b.current.version} raw=${b.current.raw}`,
  );
  const replay = db.submit('A', a);
  assert.equal(replay.replay, true);
  console.log(
    `A-replay=${replay.status} replay=${replay.replay} version=${db.read().version}`,
  );
  console.log(`A-changed=${db.submit('A', { ...a, raw: 560 }).status}`);
  assert.equal(db.rotateEpoch(1), true);
  console.log(
    `old-writer=${db.submit('B', { id: 'OLD-WRITER', expectedVersion: 8, raw: 520, epoch: 1 }).status}`,
  );
  db.close();
  db = new SettingStore(path);
  console.log(
    `reopen-query=${db.query('A', 'OP-A').status} current_version=${db.read().version} epoch=${db.read().epoch}`,
  );
  const race = await runRace();
  console.log(
    `two-process-race committed=${race.committed} conflicts=${race.conflicts} version=${race.version}`,
  );
  console.log('CAS demo: PASS');
} finally {
  db.close();
}
