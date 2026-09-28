import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { IdempotencyLedger } from './idempotency-ledger.mjs';

const minimumNodeVersion = [24, 19, 0];
const versionParts = process.versions.node.split('.').map(Number);
if (
  versionParts[0] < minimumNodeVersion[0] ||
  (versionParts[0] === minimumNodeVersion[0] &&
    (versionParts[1] < minimumNodeVersion[1] ||
      (versionParts[1] === minimumNodeVersion[1] &&
        versionParts[2] < minimumNodeVersion[2])))
)
  throw new Error('This example requires Node.js 24.19.0 or newer.');

const workerPath = fileURLToPath(
  new URL('./crash-worker.mjs', import.meta.url),
);
const temporaryRoot = resolve(tmpdir());
const tempDirectory = resolve(
  mkdtempSync(join(temporaryRoot, 'hubplc-idempotency-ledger-')),
);
const ownershipMarker = join(tempDirectory, '.hubplc-idempotency-ledger-owned');
const ownershipToken = randomUUID();
writeFileSync(ownershipMarker, ownershipToken, {
  encoding: 'utf8',
  flag: 'wx',
});
const databasePath = join(tempDirectory, 'ledger.sqlite');
const lines = [];
const add = (line) => lines.push(line);
let ledger;

const isOwnedTemporaryDirectory = () => {
  const targetRelativeToTemp = relative(temporaryRoot, tempDirectory);
  return (
    tempDirectory !== temporaryRoot &&
    !isAbsolute(targetRelativeToTemp) &&
    !targetRelativeToTemp.startsWith('..') &&
    basename(tempDirectory).startsWith('hubplc-idempotency-ledger-') &&
    lstatSync(tempDirectory).isDirectory() &&
    !lstatSync(tempDirectory).isSymbolicLink() &&
    lstatSync(ownershipMarker).isFile() &&
    !lstatSync(ownershipMarker).isSymbolicLink() &&
    readFileSync(ownershipMarker, 'utf8') === ownershipToken
  );
};

const runCrashWorker = (phase, expectedStatus) => {
  const child = spawnSync(
    process.execPath,
    [workerPath, tempDirectory, phase, ownershipToken],
    {
      encoding: 'utf8',
    },
  );
  assert.equal(child.error, undefined);
  assert.equal(child.status, expectedStatus, child.stderr);
  assert.equal(child.stdout, '');
};

try {
  assert.equal(existsSync(databasePath), false);
  ledger = new IdempotencyLedger(databasePath);
  const request = {
    operationId: 'OP7',
    payload: { operation: 'increment', amount: 1 },
  };
  const first = ledger.apply(request);
  const retryOne = ledger.apply(request);
  const retryTwo = ledger.apply(request);
  assert.equal(first.status, 'applied');
  assert.equal(retryOne.status, 'replayed');
  assert.equal(retryTwo.status, 'replayed');
  assert.deepEqual(retryOne.result, first.result);
  assert.deepEqual(retryTwo.result, first.result);
  assert.equal(ledger.count(), 1);
  add('OP7 first: applied counter=1');
  add('OP7 retry 1: replayed counter=1');
  add('OP7 retry 2: replayed counter=1');

  const conflict = ledger.apply({
    operationId: 'OP7',
    payload: { operation: 'increment', amount: 2 },
  });
  assert.equal(conflict.status, 'conflict');
  assert.equal(ledger.count(), 1);
  add('OP7 changed payload: conflict counter=1');

  ledger.close();
  ledger = new IdempotencyLedger(databasePath);
  const reopened = ledger.apply(request);
  assert.equal(reopened.status, 'replayed');
  assert.deepEqual(reopened.result, first.result);
  assert.equal(ledger.count(), 1);
  ledger.close();
  ledger = undefined;
  add('OP7 after reopen: replayed counter=1');

  runCrashWorker('before-commit', 70);
  ledger = new IdempotencyLedger(join(tempDirectory, 'before-commit.sqlite'));
  assert.equal(ledger.count(), 0);
  assert.equal(ledger.ledgerRecordCount(), 0);
  ledger.close();
  ledger = undefined;
  add('crash before COMMIT: child_exit=70 counter=0 ledger_records=0');

  runCrashWorker('after-commit', 71);
  ledger = new IdempotencyLedger(join(tempDirectory, 'after-commit.sqlite'));
  const afterCrashRetry = ledger.apply({
    operationId: 'CRASH-AFTER',
    payload: { operation: 'increment', amount: 1 },
  });
  assert.equal(afterCrashRetry.status, 'replayed');
  assert.equal(ledger.count(), 1);
  ledger.close();
  ledger = undefined;
  add(
    'crash after COMMIT before reply: child_exit=71 retry=replayed counter=1',
  );

  const expected = [
    'OP7 first: applied counter=1',
    'OP7 retry 1: replayed counter=1',
    'OP7 retry 2: replayed counter=1',
    'OP7 changed payload: conflict counter=1',
    'OP7 after reopen: replayed counter=1',
    'crash before COMMIT: child_exit=70 counter=0 ledger_records=0',
    'crash after COMMIT before reply: child_exit=71 retry=replayed counter=1',
  ];
  assert.deepEqual(lines, expected);
  for (const line of lines) console.log(line);
  console.log('demo: PASS');
} finally {
  try {
    ledger?.close();
  } catch {
    // It is already closed or the child process terminated it.
  }
  if (isOwnedTemporaryDirectory())
    rmSync(tempDirectory, { recursive: true, force: true });
}
