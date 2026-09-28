import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SettingStore, makeDirectory } from './store.mjs';
export async function runRace() {
  const path = join(makeDirectory(), 'race.sqlite');
  const store = new SettingStore(path, { initialize: true });
  store.close();
  const children = ['A', 'B'].map((actor) =>
    fork(
      fileURLToPath(new URL('./race-worker.mjs', import.meta.url)),
      [path, actor],
      { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] },
    ),
  );
  const result = await new Promise((resolve, reject) => {
    let ready = 0,
      closed = 0;
    const results = [];
    let settled = false;
    const timer = setTimeout(
      () => fail(new Error('race exceeded 10 seconds')),
      10000,
    );
    function fail(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      for (const child of children) child.kill();
      reject(error);
    }
    for (const child of children) {
      let stderr = '';
      child.stderr.on('data', (data) => {
        stderr += data;
      });
      child.on('error', fail);
      child.on('message', (message) => {
        if (message.type === 'ready') {
          ready++;
          if (ready === 2) for (const c of children) c.send('go');
        } else if (message.type === 'result') results.push(message.result);
      });
      child.on('exit', (code) => {
        if (code !== 0)
          return fail(new Error(`worker failed ${code}: ${stderr}`));
        closed++;
        if (closed === 2) {
          if (results.length !== 2)
            return fail(new Error('missing worker result'));
          settled = true;
          clearTimeout(timer);
          resolve(results);
        }
      });
    }
  });
  const reader = new SettingStore(path);
  try {
    const committed = result.filter((r) => r.status === 'COMMITTED').length;
    const conflicts = result.filter(
      (r) => r.status === 'VERSION_CONFLICT',
    ).length;
    assert.equal(committed, 1);
    assert.equal(conflicts, 1);
    assert.equal(reader.read().version, 8);
    assert.equal(reader.history().length, 2);
    return { committed, conflicts, version: reader.read().version };
  } finally {
    reader.close();
  }
}
