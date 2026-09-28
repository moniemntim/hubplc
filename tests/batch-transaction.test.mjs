import assert from 'node:assert/strict';
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
import test from 'node:test';
import {
  B17_DETAILS,
  BatchTransactionDatabase,
  MAX_VALUE,
  validateBatchId,
  validateDetails,
} from '../public/examples/batch-transaction/batch-transaction.mjs';

const withTemporaryDirectory = (run) => {
  const temporaryRoot = resolve(tmpdir());
  const directory = resolve(
    mkdtempSync(join(temporaryRoot, 'hubplc-batch-transaction-test-')),
  );
  const markerPath = join(directory, '.hubplc-batch-transaction-owned');
  const ownershipToken = randomUUID();
  writeFileSync(markerPath, ownershipToken, { encoding: 'utf8', flag: 'wx' });
  try {
    return run(directory);
  } finally {
    const relativeTarget = relative(temporaryRoot, directory);
    const isOwnedTemporaryDirectory =
      directory !== temporaryRoot &&
      !isAbsolute(relativeTarget) &&
      !relativeTarget.startsWith('..') &&
      basename(directory).startsWith('hubplc-batch-transaction-test-') &&
      lstatSync(directory).isDirectory() &&
      !lstatSync(directory).isSymbolicLink() &&
      lstatSync(markerPath).isFile() &&
      !lstatSync(markerPath).isSymbolicLink() &&
      readFileSync(markerPath, 'utf8') === ownershipToken;
    if (isOwnedTemporaryDirectory)
      rmSync(directory, { recursive: true, force: true });
  }
};

void test('B17 commits one header and three complete details', () =>
  withTemporaryDirectory((directory) => {
    const database = new BatchTransactionDatabase(
      join(directory, 'batch.sqlite'),
    );
    try {
      const batch = database.writeCompletedBatch('B17', B17_DETAILS);
      assert.deepEqual(batch.sequence, [1, 2, 3]);
      assert.deepEqual(batch.details, B17_DETAILS);
      assert.equal(batch.headerCount, 1);
      assert.equal(batch.detailCount, 3);
      assert.equal(batch.header?.status, 'completed');
      assert.equal(batch.sum, 60);
    } finally {
      database.close();
    }
  }));

void test('a real second-row SQLite CHECK failure explicitly rolls back first-row data', () =>
  withTemporaryDirectory((directory) => {
    const database = new BatchTransactionDatabase(
      join(directory, 'batch.sqlite'),
    );
    try {
      const result = database.runSecondDetailConstraintFailure('B17');
      assert.match(
        result.error,
        /CHECK constraint failed: value BETWEEN -10000 AND 10000/,
      );
      assert.equal(result.state.headerCount, 0);
      assert.equal(result.state.detailCount, 0);
    } finally {
      database.close();
    }
  }));

void test('duplicate and invalid requests leave an already committed B17 unchanged', () =>
  withTemporaryDirectory((directory) => {
    const database = new BatchTransactionDatabase(
      join(directory, 'batch.sqlite'),
    );
    try {
      const original = database.writeCompletedBatch('B17', B17_DETAILS);
      assert.throws(
        () => database.writeCompletedBatch('B17', B17_DETAILS),
        /UNIQUE constraint failed: batch_headers.batch_id/,
      );
      for (const invalidDetails of [
        [null, { seq: 2, value: 20 }, { seq: 3, value: 30 }],
        [
          { seq: 1, value: Number.NaN },
          { seq: 2, value: 20 },
          { seq: 3, value: 30 },
        ],
        [
          { seq: 1, value: 10 },
          { seq: 1, value: 20 },
          { seq: 3, value: 30 },
        ],
      ])
        assert.throws(() =>
          database.writeCompletedBatch('B17', invalidDetails),
        );

      assert.deepEqual(database.readBatch('B17'), original);
    } finally {
      database.close();
    }
  }));

void test('explicit cancellation and completed-without-details both leave no accepted batch', () =>
  withTemporaryDirectory((directory) => {
    const database = new BatchTransactionDatabase(
      join(directory, 'batch.sqlite'),
    );
    try {
      const cancelled = database.runExplicitCancellation('B17');
      assert.equal(cancelled.headerCount, 0);
      assert.equal(cancelled.detailCount, 0);
      const bogusComplete = database.tryMarkCompletedWithoutDetails('B18');
      assert.match(
        bogusComplete.error,
        /completed batch requires exactly three details/,
      );
      assert.equal(bogusComplete.state.headerCount, 0);
      assert.equal(bogusComplete.state.detailCount, 0);
    } finally {
      database.close();
    }
  }));

void test('an independent observer sees the batch only after commit and input remains bounded', () =>
  withTemporaryDirectory((directory) => {
    const databasePath = join(directory, 'batch.sqlite');
    const writer = new BatchTransactionDatabase(databasePath);
    const observer = new BatchTransactionDatabase(databasePath, {
      initialize: false,
    });
    try {
      writer.beginUncommittedBatch('B17', B17_DETAILS);
      assert.deepEqual(observer.readBatch('B17').details, []);
      writer.commit();
      const visible = observer.readBatch('B17');
      assert.equal(visible.header?.status, 'completed');
      assert.deepEqual(visible.sequence, [1, 2, 3]);
      assert.equal(visible.sum, 60);
      assert.throws(() => validateBatchId(' B17'), /surrounding whitespace/);
      assert.throws(
        () =>
          validateDetails([
            { seq: 1, value: 1 },
            { seq: 2, value: 2 },
          ]),
        /exactly 3/,
      );
      assert.throws(
        () =>
          validateDetails([
            { seq: 1, value: 1 },
            { seq: 2, value: 2 },
            { seq: 3, value: MAX_VALUE + 1 },
          ]),
        /integers/,
      );
    } finally {
      observer.close();
      writer.close();
    }
  }));
