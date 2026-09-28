// Starts only a temporary loopback read-only server. Does not change network settings.
import assert from 'node:assert/strict';
import http from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';
import { performance } from 'node:perf_hooks';
const serviceJobs = [];
const counts = {
  baseline: { received: 0, completed: 0 },
  delayed: { received: 0, completed: 0 },
};
const server = http.createServer((req, res) => {
  const scenario =
    req.url === '/baseline'
      ? 'baseline'
      : req.url === '/delayed'
        ? 'delayed'
        : null;
  if (req.method !== 'GET' || !scenario) {
    res.writeHead(404).end();
    return;
  }
  counts[scenario].received++;
  // Intentionally let application work finish even if the client has disconnected.
  serviceJobs.push(
    (async () => {
      await sleep(scenario === 'baseline' ? 20 : 300);
      counts[scenario].completed++;
      if (!res.destroyed)
        res
          .writeHead(200, { 'content-type': 'application/json' })
          .end('{"value":42}');
    })(),
  );
});
function oneRead(port, path) {
  const started = performance.now();
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result, detail = null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        result,
        elapsedMs: Number((performance.now() - started).toFixed(2)),
        detail,
      });
    };
    const req = http.get(
      { hostname: '127.0.0.1', port, path, agent: false },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('error', (error) =>
          finish('error', error.code ?? error.message),
        );
        res.on('end', () => {
          if (performance.now() - started >= 200) finish('timeout');
          else if (res.statusCode === 200 && body === '{"value":42}')
            finish('completed');
          else finish('error', 'unexpected-response');
        });
      },
    );
    req.on('error', (error) => finish('error', error.code ?? error.message));
    const timer = setTimeout(() => {
      finish('timeout');
      req.destroy();
    }, 200);
  });
}
try {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  console.log(
    `Node ${process.version}; ${process.platform}; loopback HTTP application delay only`,
  );
  const baseline = await oneRead(port, '/baseline');
  console.log(JSON.stringify({ case: 'baseline', ...baseline }));
  const started = performance.now();
  const attempts = [];
  for (let attempt = 1; attempt <= 3; attempt++) {
    const sentAtMs = Number((performance.now() - started).toFixed(2));
    const outcome = await oneRead(port, '/delayed');
    attempts.push({ attempt, sentAtMs, ...outcome });
    if (outcome.result !== 'timeout' || attempt === 3) break;
    await sleep(50);
  }
  const clientEndedAtMs = Number((performance.now() - started).toFixed(2));
  console.log(JSON.stringify({ case: 'delayed', attempts, clientEndedAtMs }));
  await Promise.all(serviceJobs);
  console.log(JSON.stringify({ serverAfterDrain: counts }));
  assert.equal(
    baseline.result,
    'completed',
    'baseline exceeded the deadline or failed; inspect host load and logs',
  );
  assert.equal(attempts.length, 3);
  assert.ok(attempts.every((attempt) => attempt.result === 'timeout'));
  assert.deepEqual(counts, {
    baseline: { received: 1, completed: 1 },
    delayed: { received: 3, completed: 3 },
  });
  console.log(
    'PASS: baseline read, three client timeouts, server work still completed',
  );
} finally {
  const closed = new Promise((resolve) => server.close(resolve));
  server.closeAllConnections();
  await closed;
  await Promise.allSettled(serviceJobs);
}
