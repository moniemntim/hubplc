import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

export const MAX_OPERATION_ID_BYTES = 64;
export const MAX_INCREMENT_AMOUNT = 1000;

const utf8Length = (value) => Buffer.byteLength(value, 'utf8');

export function validateOperationId(value) {
  if (typeof value !== 'string')
    throw new TypeError('operation_id must be a string');
  if (!value || value.trim() !== value)
    throw new RangeError('operation_id must be nonempty and untrimmed');
  if (utf8Length(value) > MAX_OPERATION_ID_BYTES)
    throw new RangeError(
      `operation_id must be at most ${MAX_OPERATION_ID_BYTES} UTF-8 bytes`,
    );
  if (/\p{C}/u.test(value))
    throw new RangeError('operation_id must not contain control characters');
  return value;
}

export function canonicalizePayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new TypeError('payload must be an object');
  const keys = Object.keys(value).sort();
  if (keys.length !== 2 || keys[0] !== 'amount' || keys[1] !== 'operation')
    throw new RangeError('payload must contain only amount and operation');
  if (value.operation !== 'increment')
    throw new RangeError('payload.operation must be increment');
  if (
    !Number.isSafeInteger(value.amount) ||
    value.amount < 1 ||
    value.amount > MAX_INCREMENT_AMOUNT
  )
    throw new RangeError(
      `payload.amount must be an integer from 1 to ${MAX_INCREMENT_AMOUNT}`,
    );

  const json = `{"amount":${value.amount},"operation":"increment"}`;
  return {
    amount: value.amount,
    json,
    hash: createHash('sha256').update(json, 'utf8').digest('hex'),
    operation: 'increment',
  };
}

const parseStoredResult = (raw) => {
  if (typeof raw !== 'string')
    throw new Error('stored idempotency result is missing');
  const result = JSON.parse(raw);
  if (
    !result ||
    typeof result !== 'object' ||
    result.operation !== 'increment' ||
    !Number.isSafeInteger(result.amount) ||
    !Number.isSafeInteger(result.counter)
  )
    throw new Error('stored idempotency result is invalid');
  return result;
};

export class IdempotencyLedger {
  constructor(databasePath) {
    if (typeof databasePath !== 'string' || databasePath.length === 0)
      throw new TypeError('databasePath must be a nonempty path');
    this.db = new DatabaseSync(databasePath, { timeout: 5000 });
    try {
      this.#initialize();
    } catch (error) {
      this.db.close();
      throw error;
    }
  }

  #initialize() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS counters (
        name TEXT PRIMARY KEY,
        value INTEGER NOT NULL CHECK(value >= 0)
      ) STRICT;
      INSERT OR IGNORE INTO counters(name, value) VALUES ('increment_count', 0);
      CREATE TABLE IF NOT EXISTS idempotency_ledger (
        operation_id TEXT PRIMARY KEY,
        payload_json TEXT NOT NULL,
        payload_hash TEXT NOT NULL,
        result_json TEXT
      ) STRICT;
    `);
  }

  apply({ operationId, payload }, hooks = {}) {
    const id = validateOperationId(operationId);
    const request = canonicalizePayload(payload);
    let transactionOpen = false;
    try {
      this.db.exec('BEGIN IMMEDIATE');
      transactionOpen = true;

      const inserted = this.db
        .prepare(`
          INSERT INTO idempotency_ledger(operation_id, payload_json, payload_hash, result_json)
          VALUES (?, ?, ?, NULL)
          ON CONFLICT(operation_id) DO NOTHING
        `)
        .run(id, request.json, request.hash).changes;

      if (inserted === 0) {
        const stored = this.db
          .prepare(`
            SELECT payload_json, payload_hash, result_json
            FROM idempotency_ledger
            WHERE operation_id = ?
          `)
          .get(id);
        if (!stored) throw new Error('ledger conflict row disappeared');
        if (
          stored.payload_json !== request.json ||
          stored.payload_hash !== request.hash
        ) {
          this.db.exec('ROLLBACK');
          transactionOpen = false;
          return {
            status: 'conflict',
            operationId: id,
            requestPayloadHash: request.hash,
            storedPayloadHash: stored.payload_hash,
          };
        }
        const result = parseStoredResult(stored.result_json);
        this.db.exec('ROLLBACK');
        transactionOpen = false;
        return { status: 'replayed', result };
      }

      this.db
        .prepare(
          "UPDATE counters SET value = value + ? WHERE name = 'increment_count'",
        )
        .run(request.amount);
      const counter = this.#counterValue();
      const result = {
        amount: request.amount,
        counter,
        operation: request.operation,
        operationId: id,
      };
      this.db
        .prepare(
          'UPDATE idempotency_ledger SET result_json = ? WHERE operation_id = ?',
        )
        .run(JSON.stringify(result), id);

      hooks.beforeCommit?.({ operationId: id, result });
      this.db.exec('COMMIT');
      transactionOpen = false;
      hooks.afterCommit?.({ operationId: id, result });
      return { status: 'applied', result };
    } catch (error) {
      if (transactionOpen) {
        try {
          this.db.exec('ROLLBACK');
        } catch {
          // Preserve the original error after the best-effort cleanup.
        }
      }
      throw error;
    }
  }

  count() {
    return this.#counterValue();
  }

  #counterValue() {
    const counter = this.db
      .prepare("SELECT value FROM counters WHERE name = 'increment_count'")
      .get().value;
    if (!Number.isSafeInteger(counter) || counter < 0)
      throw new RangeError(
        'counter is outside the supported safe-integer range',
      );
    return counter;
  }

  ledgerRecordCount() {
    return this.db
      .prepare('SELECT COUNT(*) AS count FROM idempotency_ledger')
      .get().count;
  }

  close() {
    this.db.close();
  }
}
