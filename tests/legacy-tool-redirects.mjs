import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import test from 'node:test';

const redirects = [
  ['/tool/volts-to-watts', '/tool/amps-to-watts'],
  ['/tool/volts-to-watts/', '/tool/amps-to-watts'],
  ['/tool/volts-to-amps', '/tool/watts-to-amps'],
  ['/tool/volts-to-amps/', '/tool/watts-to-amps'],
  ['/tool/watts-to-kva', '/tool/watts-to-va'],
  ['/tool/watts-to-kva/', '/tool/watts-to-va'],
  ['/tool/kva-to-va', '/tool/va-to-kva'],
  ['/tool/kva-to-va/', '/tool/va-to-kva'],
  ['/tool/kw-to-kwh', '/tool/energy-consumption'],
  ['/tool/kw-to-kwh/', '/tool/energy-consumption'],
  ['/tool/watts-to-kwh', '/tool/energy-consumption'],
  ['/tool/watts-to-kwh/', '/tool/energy-consumption'],
  ['/tool/kwh-to-watts', '/tool/kwh-to-kw'],
  ['/tool/kwh-to-watts/', '/tool/kwh-to-kw'],
];

async function reservePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  server.close();
  await once(server, 'close');
  return port;
}

async function waitForWorker(base, worker, output) {
  const deadline = Date.now() + 30_000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(base, { redirect: 'manual' });
      if (response.status < 500) return;
    } catch (error) {
      lastError = error;
    }
    if (worker.exitCode !== null)
      throw new Error(
        `Wrangler local Worker exited before listening (code ${worker.exitCode}):\n${output()}`,
      );
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const errorMessage =
    lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(
    `Wrangler local Worker did not start: ${errorMessage}\n${output()}`,
  );
}

test('legacy tool paths use one permanent redirect and preserve the query', async () => {
  const port = await reservePort();
  const base = `http://127.0.0.1:${port}`;
  const worker = spawn(
    process.execPath,
    [
      path.resolve('node_modules/wrangler/bin/wrangler.js'),
      'dev',
      '--local',
      '--port',
      String(port),
      '--config',
      'deployment/wrangler.jsonc',
      '--compatibility-date',
      '2026-05-22',
    ],
    { stdio: 'pipe' },
  );
  let output = '';
  const collect = (chunk) => {
    output = (output + chunk).slice(-8_000);
  };
  worker.stdout.on('data', collect);
  worker.stderr.on('data', collect);

  try {
    await waitForWorker(base, worker, () => output);
    for (const [source, target] of redirects) {
      const redirect = await fetch(`${base}${source}?campaign=legacy`, {
        redirect: 'manual',
      });
      assert.equal(redirect.status, 308, `${source} uses a permanent redirect`);
      assert.equal(
        redirect.headers.get('location'),
        `${base}${target}?campaign=legacy`,
        `${source} has its exact target and query`,
      );

      const followed = await fetch(redirect.headers.get('location'), {
        redirect: 'manual',
      });
      assert.equal(
        followed.status,
        200,
        `${source} reaches an asset after one redirect`,
      );
    }

    const locale = await fetch(`${base}/api/locale`, {
      headers: { 'Accept-Language': 'en-US' },
    });
    assert.equal(locale.status, 200, 'locale API remains available');
    assert.match(
      locale.headers.get('content-type') ?? '',
      /^application\/json; charset=utf-8$/,
    );
    assert.equal(typeof (await locale.json()).locale, 'string');

    const staticAsset = await fetch(`${base}/robots.txt`);
    assert.equal(
      staticAsset.status,
      200,
      'unrelated static assets still pass through',
    );
    assert.match(await staticAsset.text(), /User-agent:/);
  } finally {
    if (worker.exitCode === null) {
      worker.kill();
      await once(worker, 'exit');
    }
  }
});

test('Worker-first routes include the legacy redirect sources', async () => {
  const wrangler = await readFile('deployment/wrangler.jsonc', 'utf8');
  for (const [source] of redirects)
    assert.match(wrangler, new RegExp(`"${source}"`));
});
