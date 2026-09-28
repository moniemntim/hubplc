import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  lstatSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  canonicalizePayload,
  IdempotencyLedger,
  validateOperationId,
} from '../public/examples/idempotency-ledger/idempotency-ledger.mjs';

const workerPath = fileURLToPath(
  new URL(
    '../public/examples/idempotency-ledger/crash-worker.mjs',
    import.meta.url,
  ),
);

const withTemporaryDirectory = (run) => {
  const temporaryRoot = resolve(tmpdir());
  const directory = resolve(
    mkdtempSync(join(temporaryRoot, 'hubplc-idempotency-ledger-test-')),
  );
  const markerPath = join(directory, '.hubplc-idempotency-ledger-owned');
  const ownershipToken = randomUUID();
  writeFileSync(markerPath, ownershipToken, { encoding: 'utf8', flag: 'wx' });
  try {
    return run(directory, ownershipToken);
  } finally {
    const directoryRelativeToTemp = relative(temporaryRoot, directory);
    const isOwnedTemporaryDirectory =
      directory !== temporaryRoot &&
      !isAbsolute(directoryRelativeToTemp) &&
      !directoryRelativeToTemp.startsWith('..') &&
      basename(directory).startsWith('hubplc-idempotency-ledger-test-') &&
      lstatSync(directory).isDirectory() &&
      !lstatSync(directory).isSymbolicLink() &&
      lstatSync(markerPath).isFile() &&
      !lstatSync(markerPath).isSymbolicLink() &&
      readFileSync(markerPath, 'utf8') === ownershipToken;
    if (isOwnedTemporaryDirectory)
      rmSync(directory, { recursive: true, force: true });
  }
};

void test('same operation and canonical payload replay a stored result; a changed payload conflicts', () =>
  withTemporaryDirectory((directory) => {
    const ledger = new IdempotencyLedger(join(directory, 'ledger.sqlite'));
    try {
      const request = {
        operationId: 'OP7',
        payload: { amount: 1, operation: 'increment' },
      };
      const first = ledger.apply(request);
      const retry = ledger.apply({
        operationId: 'OP7',
        payload: { operation: 'increment', amount: 1 },
      });
      const conflict = ledger.apply({
        operationId: 'OP7',
        payload: { operation: 'increment', amount: 2 },
      });

      assert.equal(first.status, 'applied');
      assert.equal(retry.status, 'replayed');
      assert.deepEqual(retry.result, first.result);
      assert.equal(conflict.status, 'conflict');
      assert.equal(ledger.count(), 1);
      assert.equal(ledger.ledgerRecordCount(), 1);
    } finally {
      ledger.close();
    }
  }));

void test('a replay survives closing and reopening the SQLite file', () =>
  withTemporaryDirectory((directory) => {
    const databasePath = join(directory, 'ledger.sqlite');
    let ledger = new IdempotencyLedger(databasePath);
    const first = ledger.apply({
      operationId: 'REOPEN-1',
      payload: { operation: 'increment', amount: 3 },
    });
    ledger.close();

    ledger = new IdempotencyLedger(databasePath);
    try {
      const replay = ledger.apply({
        operationId: 'REOPEN-1',
        payload: { amount: 3, operation: 'increment' },
      });
      assert.equal(replay.status, 'replayed');
      assert.deepEqual(replay.result, first.result);
      assert.equal(ledger.count(), 3);
    } finally {
      ledger.close();
    }
  }));

void test('the fixed request contract rejects malformed IDs and payloads', () => {
  assert.throws(() => validateOperationId(''), /nonempty/);
  assert.throws(() => validateOperationId(' OP7'), /untrimmed/);
  assert.throws(() => validateOperationId('x'.repeat(65)), /64 UTF-8/);
  assert.throws(
    () =>
      canonicalizePayload({ operation: 'increment', amount: 1, source: 'PLC' }),
    /only amount and operation/,
  );
  assert.throws(
    () => canonicalizePayload({ operation: 'increment', amount: 1.5 }),
    /integer/,
  );
});

void test('uncommitted child exit rolls back, committed-before-reply exit replays', () =>
  withTemporaryDirectory((directory, ownershipToken) => {
    const beforePath = join(directory, 'before-commit.sqlite');
    const before = spawnSync(
      process.execPath,
      [workerPath, directory, 'before-commit', ownershipToken],
      {
        encoding: 'utf8',
      },
    );
    assert.equal(before.status, 70, before.stderr);
    let ledger = new IdempotencyLedger(beforePath);
    assert.equal(ledger.count(), 0);
    assert.equal(ledger.ledgerRecordCount(), 0);
    ledger.close();

    const afterPath = join(directory, 'after-commit.sqlite');
    const after = spawnSync(
      process.execPath,
      [workerPath, directory, 'after-commit', ownershipToken],
      {
        encoding: 'utf8',
      },
    );
    assert.equal(after.status, 71, after.stderr);
    ledger = new IdempotencyLedger(afterPath);
    try {
      const replay = ledger.apply({
        operationId: 'CRASH-AFTER',
        payload: { operation: 'increment', amount: 1 },
      });
      assert.equal(replay.status, 'replayed');
      assert.equal(ledger.count(), 1);
      assert.equal(ledger.ledgerRecordCount(), 1);
    } finally {
      ledger.close();
    }
  }));
