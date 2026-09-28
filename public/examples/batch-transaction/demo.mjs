import assert from 'node:assert/strict';
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
import { B17_DETAILS, BatchTransactionDatabase } from './batch-transaction.mjs';

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

const temporaryRoot = resolve(tmpdir());
const tempDirectory = resolve(
  mkdtempSync(join(temporaryRoot, 'hubplc-batch-transaction-')),
);
const ownershipMarker = join(tempDirectory, '.hubplc-batch-transaction-owned');
const ownershipToken = randomUUID();
writeFileSync(ownershipMarker, ownershipToken, {
  encoding: 'utf8',
  flag: 'wx',
});
const lines = [];
let database;
let observer;

const isOwnedTemporaryDirectory = () => {
  const relativeTarget = relative(temporaryRoot, tempDirectory);
  return (
    tempDirectory !== temporaryRoot &&
    !isAbsolute(relativeTarget) &&
    !relativeTarget.startsWith('..') &&
    basename(tempDirectory).startsWith('hubplc-batch-transaction-') &&
    lstatSync(tempDirectory).isDirectory() &&
    !lstatSync(tempDirectory).isSymbolicLink() &&
    lstatSync(ownershipMarker).isFile() &&
    !lstatSync(ownershipMarker).isSymbolicLink() &&
    readFileSync(ownershipMarker, 'utf8') === ownershipToken
  );
};

const formatState = (state) =>
  `headers=${state.headerCount} details=${state.detailCount}` +
  (state.header
    ? ` seq=${state.sequence.join(',')} sum=${state.sum} status=${state.header.status}`
    : '');

try {
  const successPath = join(tempDirectory, 'success.sqlite');
  assert.equal(existsSync(successPath), false);
  database = new BatchTransactionDatabase(successPath);
  const success = database.writeCompletedBatch('B17', B17_DETAILS);
  assert.deepEqual(success.sequence, [1, 2, 3]);
  assert.equal(success.header?.status, 'completed');
  assert.equal(success.sum, 60);
  lines.push(`success: ${formatState(success)}`);
  database.close();
  database = undefined;

  const constraintPath = join(tempDirectory, 'constraint.sqlite');
  assert.equal(existsSync(constraintPath), false);
  database = new BatchTransactionDatabase(constraintPath);
  const constraint = database.runSecondDetailConstraintFailure('B17');
  assert.match(
    constraint.error,
    /CHECK constraint failed: value BETWEEN -10000 AND 10000/,
  );
  assert.deepEqual(constraint.state, {
    detailCount: 0,
    details: [],
    header: null,
    headerCount: 0,
    sequence: [],
    sum: 0,
  });
  lines.push(
    `constraint rollback: error=${constraint.error} ${formatState(constraint.state)}`,
  );
  database.close();
  database = undefined;

  const cancelledPath = join(tempDirectory, 'cancelled.sqlite');
  assert.equal(existsSync(cancelledPath), false);
  database = new BatchTransactionDatabase(cancelledPath);
  const cancelled = database.runExplicitCancellation('B17');
  assert.equal(cancelled.headerCount, 0);
  assert.equal(cancelled.detailCount, 0);
  lines.push(`explicit rollback: ${formatState(cancelled)}`);
  database.close();
  database = undefined;

  const observerPath = join(tempDirectory, 'observer.sqlite');
  assert.equal(existsSync(observerPath), false);
  database = new BatchTransactionDatabase(observerPath);
  observer = new BatchTransactionDatabase(observerPath, { initialize: false });
  database.beginUncommittedBatch('B17', B17_DETAILS);
  const beforeCommit = observer.readBatch('B17');
  assert.equal(beforeCommit.headerCount, 0);
  assert.equal(beforeCommit.detailCount, 0);
  lines.push(`observer before COMMIT: ${formatState(beforeCommit)}`);
  database.commit();
  const afterCommit = observer.readBatch('B17');
  assert.deepEqual(afterCommit.sequence, [1, 2, 3]);
  assert.equal(afterCommit.header?.status, 'completed');
  assert.equal(afterCommit.sum, 60);
  lines.push(`observer after COMMIT: ${formatState(afterCommit)}`);
  observer.close();
  observer = undefined;
  database.close();
  database = undefined;

  const expected = [
    'success: headers=1 details=3 seq=1,2,3 sum=60 status=completed',
    'constraint rollback: error=CHECK constraint failed: value BETWEEN -10000 AND 10000 headers=0 details=0',
    'explicit rollback: headers=0 details=0',
    'observer before COMMIT: headers=0 details=0',
    'observer after COMMIT: headers=1 details=3 seq=1,2,3 sum=60 status=completed',
  ];
  assert.deepEqual(lines, expected);
  for (const line of lines) console.log(line);
  console.log('demo: PASS');
} finally {
  try {
    observer?.close();
  } catch {
    // The observer was already closed.
  }
  try {
    database?.close();
  } catch {
    // The writer was already closed.
  }
  if (isOwnedTemporaryDirectory())
    rmSync(tempDirectory, { recursive: true, force: true });
}
