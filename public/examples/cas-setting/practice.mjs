import { join } from 'node:path';
import { SettingStore, makeDirectory } from './store.mjs';
// Change these values, then run: node practice.mjs
const firstRaw = 550;
const secondRaw = 520;
const secondExpectedVersion = 7;
const db = new SettingStore(join(makeDirectory(), 'practice.sqlite'), {
  initialize: true,
});
try {
  console.log(
    'A',
    db.submit('A', { id: 'P-A', expectedVersion: 7, raw: firstRaw, epoch: 1 }),
  );
  console.log(
    'B',
    db.submit('B', {
      id: 'P-B',
      expectedVersion: secondExpectedVersion,
      raw: secondRaw,
      epoch: 1,
    }),
  );
  console.log('current', db.read());
} finally {
  db.close();
}
