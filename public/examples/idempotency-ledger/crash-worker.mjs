import { IdempotencyLedger } from './idempotency-ledger.mjs';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';

const [directory, phase, ownershipToken] = process.argv.slice(2);
if (
  !directory ||
  !['before-commit', 'after-commit'].includes(phase) ||
  !ownershipToken
) {
  process.stderr.write(
    'usage: node crash-worker.mjs <owned-temp-directory> <before-commit|after-commit> <ownership-token>\n',
  );
  process.exit(64);
}

const temporaryRoot = resolve(tmpdir());
const ownedDirectory = resolve(directory);
const directoryRelativeToTemp = relative(temporaryRoot, ownedDirectory);
const markerPath = join(ownedDirectory, '.hubplc-idempotency-ledger-owned');
if (
  ownedDirectory === temporaryRoot ||
  isAbsolute(directoryRelativeToTemp) ||
  directoryRelativeToTemp.startsWith('..') ||
  !basename(ownedDirectory).startsWith('hubplc-idempotency-ledger-') ||
  !lstatSync(ownedDirectory).isDirectory() ||
  lstatSync(ownedDirectory).isSymbolicLink() ||
  !lstatSync(markerPath).isFile() ||
  lstatSync(markerPath).isSymbolicLink() ||
  readFileSync(markerPath, 'utf8') !== ownershipToken
) {
  process.stderr.write(
    'refusing a directory not created and marked by demo.mjs\n',
  );
  process.exit(65);
}

const databasePath = join(
  ownedDirectory,
  phase === 'before-commit' ? 'before-commit.sqlite' : 'after-commit.sqlite',
);
if (existsSync(databasePath)) {
  process.stderr.write('refusing to open an existing database\n');
  process.exit(66);
}

const ledger = new IdempotencyLedger(databasePath);
const operationId = phase === 'before-commit' ? 'CRASH-BEFORE' : 'CRASH-AFTER';
ledger.apply(
  { operationId, payload: { operation: 'increment', amount: 1 } },
  phase === 'before-commit'
    ? { beforeCommit: () => process.exit(70) }
    : { afterCommit: () => process.exit(71) },
);

throw new Error('crash hook did not terminate the worker');
