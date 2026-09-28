import { DatabaseSync } from 'node:sqlite';

export const REQUIRED_DETAIL_COUNT = 3;
export const MIN_VALUE = -10_000;
export const MAX_VALUE = 10_000;

const utf8Length = (value) => Buffer.byteLength(value, 'utf8');

export function validateBatchId(value) {
  if (typeof value !== 'string')
    throw new TypeError('batchId must be a string');
  if (!value || value.trim() !== value)
    throw new RangeError(
      'batchId must be nonempty and have no surrounding whitespace',
    );
  if (utf8Length(value) > 64)
    throw new RangeError('batchId must be at most 64 UTF-8 bytes');
  if (/\p{C}/u.test(value))
    throw new RangeError('batchId must not contain control characters');
  return value;
}

export function validateDetails(details) {
  if (!Array.isArray(details) || details.length !== REQUIRED_DETAIL_COUNT)
    throw new RangeError(
      `details must contain exactly ${REQUIRED_DETAIL_COUNT} rows`,
    );
  for (const detail of details)
    if (!detail || typeof detail !== 'object')
      throw new TypeError('each detail must be an object');
  const ordered = [...details].sort((left, right) => left.seq - right.seq);
  for (const [index, detail] of ordered.entries()) {
    const expectedSequence = index + 1;
    if (detail.seq !== expectedSequence)
      throw new RangeError('detail sequences must be exactly 1, 2, 3');
    if (
      !Number.isSafeInteger(detail.value) ||
      detail.value < MIN_VALUE ||
      detail.value > MAX_VALUE
    )
      throw new RangeError(
        `detail values must be integers from ${MIN_VALUE} to ${MAX_VALUE}`,
      );
  }
  return ordered.map(({ seq, value }) => ({ seq, value }));
}

export const B17_DETAILS = Object.freeze([
  Object.freeze({ seq: 1, value: 10 }),
  Object.freeze({ seq: 2, value: 20 }),
  Object.freeze({ seq: 3, value: 30 }),
]);

export class BatchTransactionDatabase {
  constructor(databasePath, { initialize = true } = {}) {
    if (typeof databasePath !== 'string' || databasePath.length === 0)
      throw new TypeError('databasePath must be a nonempty path');
    this.db = new DatabaseSync(databasePath, { timeout: 5000 });
    try {
      this.db.exec('PRAGMA foreign_keys = ON');
      if (initialize) this.#initialize();
    } catch (error) {
      this.db.close();
      throw error;
    }
  }

  #initialize() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS batch_headers (
        batch_id TEXT PRIMARY KEY,
        expected_count INTEGER NOT NULL CHECK(expected_count = 3),
        total INTEGER,
        status TEXT NOT NULL CHECK(status IN ('collecting', 'completed')),
        CHECK(
          (status = 'collecting' AND total IS NULL) OR
          (status = 'completed' AND total IS NOT NULL)
        )
      ) STRICT;
      CREATE TABLE IF NOT EXISTS batch_details (
        batch_id TEXT NOT NULL REFERENCES batch_headers(batch_id),
        seq INTEGER NOT NULL CHECK(seq BETWEEN 1 AND 3),
        value INTEGER NOT NULL CHECK(value BETWEEN -10000 AND 10000),
        PRIMARY KEY(batch_id, seq)
      ) STRICT;
      CREATE TRIGGER IF NOT EXISTS completed_batch_requires_full_details
      BEFORE UPDATE OF status ON batch_headers
      WHEN NEW.status = 'completed' AND (
        (SELECT COUNT(*) FROM batch_details WHERE batch_id = NEW.batch_id) != 3 OR
        (SELECT COALESCE(SUM(value), 0) FROM batch_details WHERE batch_id = NEW.batch_id) != NEW.total
      )
      BEGIN
        SELECT RAISE(ABORT, 'completed batch requires exactly three details and matching total');
      END;
    `);
  }

  writeCompletedBatch(batchId, details) {
    const id = validateBatchId(batchId);
    const rows = validateDetails(details);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.#insertHeader(id);
      for (const row of rows) this.#insertDetail(id, row.seq, row.value);
      const summary = this.#summary(id);
      this.#assertCompleteSummary(summary);
      this.#completeHeader(id, summary.sum);
      this.db.exec('COMMIT');
      return this.readBatch(id);
    } catch (error) {
      this.#rollbackIfOpen();
      throw error;
    }
  }

  runSecondDetailConstraintFailure(batchId) {
    const id = validateBatchId(batchId);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.#insertHeader(id);
      this.#insertDetail(id, 1, 10);
      // Deliberate SQL fault injection after the first successful INSERT.
      this.#insertDetail(id, 2, MAX_VALUE + 1);
      throw new Error(
        'expected the SQLite CHECK constraint to reject the second detail',
      );
    } catch (error) {
      this.#rollbackIfOpen();
      return { error: error.message, state: this.readBatch(id) };
    }
  }

  runExplicitCancellation(batchId) {
    const id = validateBatchId(batchId);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.#insertHeader(id);
      this.#insertDetail(id, 1, 10);
      this.db.exec('ROLLBACK');
      return this.readBatch(id);
    } catch (error) {
      this.#rollbackIfOpen();
      throw error;
    }
  }

  beginUncommittedBatch(batchId, details) {
    const id = validateBatchId(batchId);
    const rows = validateDetails(details);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.#insertHeader(id);
      for (const row of rows) this.#insertDetail(id, row.seq, row.value);
      const summary = this.#summary(id);
      this.#assertCompleteSummary(summary);
      this.#completeHeader(id, summary.sum);
      return summary;
    } catch (error) {
      this.#rollbackIfOpen();
      throw error;
    }
  }

  commit() {
    this.db.exec('COMMIT');
  }

  readBatch(batchId) {
    const id = validateBatchId(batchId);
    const rawHeader = this.db
      .prepare(`
        SELECT batch_id, expected_count, total, status
        FROM batch_headers
        WHERE batch_id = ?
      `)
      .get(id);
    const details = this.db
      .prepare(`
        SELECT seq, value
        FROM batch_details
        WHERE batch_id = ?
        ORDER BY seq
      `)
      .all(id)
      .map(({ seq, value }) => ({ seq, value }));
    const header = rawHeader ? { ...rawHeader } : null;
    const sum = details.reduce((total, detail) => total + detail.value, 0);
    return {
      detailCount: details.length,
      details,
      header,
      headerCount: header ? 1 : 0,
      sequence: details.map((detail) => detail.seq),
      sum,
    };
  }

  tryMarkCompletedWithoutDetails(batchId, total = 0) {
    const id = validateBatchId(batchId);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.#insertHeader(id);
      this.#completeHeader(id, total);
      this.db.exec('COMMIT');
      throw new Error(
        'expected the completed-batch trigger to reject the header',
      );
    } catch (error) {
      this.#rollbackIfOpen();
      return { error: error.message, state: this.readBatch(id) };
    }
  }

  #insertHeader(batchId) {
    this.db
      .prepare(`
        INSERT INTO batch_headers(batch_id, expected_count, total, status)
        VALUES (?, 3, NULL, 'collecting')
      `)
      .run(batchId);
  }

  #insertDetail(batchId, seq, value) {
    this.db
      .prepare(
        'INSERT INTO batch_details(batch_id, seq, value) VALUES (?, ?, ?)',
      )
      .run(batchId, seq, value);
  }

  #summary(batchId) {
    return this.db
      .prepare(`
        SELECT COUNT(*) AS count, MIN(seq) AS minSeq, MAX(seq) AS maxSeq, SUM(value) AS sum
        FROM batch_details
        WHERE batch_id = ?
      `)
      .get(batchId);
  }

  #assertCompleteSummary(summary) {
    if (
      summary.count !== REQUIRED_DETAIL_COUNT ||
      summary.minSeq !== 1 ||
      summary.maxSeq !== REQUIRED_DETAIL_COUNT ||
      !Number.isSafeInteger(summary.sum)
    )
      throw new Error(
        'batch details are not exactly the required complete sequence',
      );
  }

  #completeHeader(batchId, total) {
    this.db
      .prepare(`
        UPDATE batch_headers
        SET total = ?, status = 'completed'
        WHERE batch_id = ?
      `)
      .run(total, batchId);
  }

  #rollbackIfOpen() {
    if (this.db.isTransaction) this.db.exec('ROLLBACK');
  }

  close() {
    this.db.close();
  }
}
