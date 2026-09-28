import { SettingStore } from './store.mjs';
const [path, actor] = process.argv.slice(2);
if (!path || !['A', 'B'].includes(actor))
  throw new Error('internal race worker arguments required');
const db = new SettingStore(path);
const baseline = db.read();
if (baseline.version !== 7) throw new Error('race requires initial version 7');
process.send({ type: 'ready' });
process.once('message', (message) => {
  if (message !== 'go') throw new Error('invalid barrier message');
  try {
    process.send({
      type: 'result',
      result: db.submit(actor, {
        id: `RACE-${actor}`,
        expectedVersion: baseline.version,
        raw: actor === 'A' ? 550 : 520,
        epoch: baseline.epoch,
      }),
    });
  } finally {
    db.close();
    process.disconnect();
  }
});
