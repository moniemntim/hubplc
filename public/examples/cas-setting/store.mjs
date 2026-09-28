import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
export const LIMIT = 2147483647;
export const makeDirectory = () => mkdtempSync(join(tmpdir(), 'hubplc-cas-'));
const plain = (row) => (row ? { ...row } : null);
const validInt = (n, min, max) =>
  Number.isSafeInteger(n) && n >= min && n <= max;
const exactKeys = (o, keys) =>
  o &&
  typeof o === 'object' &&
  !Array.isArray(o) &&
  Reflect.ownKeys(o).length === keys.length &&
  keys.every((k) => Object.hasOwn(o, k));
export class SettingStore {
  #db;
  constructor(path, { initialize = false } = {}) {
    if (initialize && existsSync(path))
      throw new Error('initialization requires a new database path');
    if (!initialize && !existsSync(path))
      throw new Error('database must already exist');
    this.#db = new DatabaseSync(path);
    this.#db.exec('PRAGMA busy_timeout=5000;');
    if (initialize)
      this.#db.exec(`
   CREATE TABLE authority(id INTEGER PRIMARY KEY CHECK(id=1),epoch INTEGER NOT NULL CHECK(epoch BETWEEN 1 AND ${LIMIT}));
   INSERT INTO authority VALUES(1,1);
   CREATE TABLE setting(id TEXT PRIMARY KEY CHECK(id='TEMP_SP'),raw INTEGER NOT NULL CHECK(raw BETWEEN 0 AND 1000),version INTEGER NOT NULL CHECK(version BETWEEN 1 AND ${LIMIT}),last_writer TEXT NOT NULL,operation_id TEXT,committed_at TEXT);
   INSERT INTO setting VALUES('TEMP_SP',500,7,'initial',NULL,NULL);
   CREATE TABLE operations(id TEXT PRIMARY KEY,actor TEXT NOT NULL,request TEXT NOT NULL,result TEXT NOT NULL);
  `);
  }
  close() {
    this.#db.close();
  }
  read() {
    return plain(
      this.#db
        .prepare(
          'SELECT s.*, a.epoch FROM setting s CROSS JOIN authority a WHERE s.id=? AND a.id=1',
        )
        .get('TEMP_SP'),
    );
  }
  history() {
    return this.#db
      .prepare('SELECT id,actor,result FROM operations ORDER BY rowid')
      .all()
      .map((row) => ({ ...row, result: JSON.parse(row.result) }));
  }
  query(actor, id, expectedRequest = null) {
    if (!['A', 'B'].includes(actor)) return { status: 'DENIED' };
    const row = this.#db
      .prepare('SELECT request,result FROM operations WHERE id=? AND actor=?')
      .get(id, actor);
    if (row && expectedRequest !== null) {
      const expected = JSON.stringify({
        actor,
        expectedVersion: expectedRequest.expectedVersion,
        raw: expectedRequest.raw,
        epoch: expectedRequest.epoch,
      });
      if (expectedRequest.id !== id || expected !== row.request)
        return { status: 'IDEMPOTENCY_CONFLICT' };
    }
    return row ? JSON.parse(row.result) : { status: 'NOT_FOUND' };
  }
  submit(actor, request) {
    if (!['A', 'B'].includes(actor)) return { status: 'DENIED' };
    if (
      !exactKeys(request, ['id', 'expectedVersion', 'raw', 'epoch']) ||
      typeof request.id !== 'string' ||
      !/^[A-Z0-9-]{1,40}$/.test(request.id) ||
      !validInt(request.expectedVersion, 1, LIMIT) ||
      !validInt(request.raw, 0, 1000) ||
      !validInt(request.epoch, 1, LIMIT)
    )
      return { status: 'INVALID_REQUEST' };
    const canonical = JSON.stringify({
      actor,
      expectedVersion: request.expectedVersion,
      raw: request.raw,
      epoch: request.epoch,
    });
    this.#db.exec('BEGIN IMMEDIATE');
    try {
      const previous = this.#db
        .prepare('SELECT request,result FROM operations WHERE id=?')
        .get(request.id);
      if (previous) {
        this.#db.exec('COMMIT');
        return previous.request === canonical
          ? { ...JSON.parse(previous.result), replay: true }
          : { status: 'IDEMPOTENCY_CONFLICT' };
      }
      if (
        this.#db.prepare('SELECT COUNT(*) AS n FROM operations').get().n >= 1000
      ) {
        this.#db.exec('ROLLBACK');
        return { status: 'LEDGER_FULL' };
      }
      // This is the storage boundary: both the revision and writer epoch are
      // conditions on the UPDATE, not a read followed by an unconditional write.
      const changed = this.#db
        .prepare(`UPDATE setting SET raw=?, version=version+1,last_writer=?,operation_id=?,committed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id='TEMP_SP' AND version=? AND version<${LIMIT} AND (SELECT epoch FROM authority WHERE id=1)=?`)
        .run(
          request.raw,
          actor,
          request.id,
          request.expectedVersion,
          request.epoch,
        );
      const current = this.read();
      let status;
      if (!current) status = 'NOT_FOUND';
      else if (current.epoch !== request.epoch) status = 'FENCED';
      else if (
        current.version === LIMIT &&
        changed.changes === 0 &&
        request.expectedVersion === LIMIT
      )
        status = 'VERSION_EXHAUSTED';
      else status = changed.changes === 1 ? 'COMMITTED' : 'VERSION_CONFLICT';
      const result = {
        status,
        operationId: request.id,
        current,
        deviceStatus: 'NOT_CONNECTED',
      };
      this.#db
        .prepare(
          'INSERT INTO operations(id,actor,request,result) VALUES(?,?,?,?)',
        )
        .run(request.id, actor, canonical, JSON.stringify(result));
      this.#db.exec('COMMIT');
      return result;
    } catch (error) {
      if (this.#db.isTransaction) this.#db.exec('ROLLBACK');
      throw error;
    }
  }
  rotateEpoch(expected) {
    if (!validInt(expected, 1, LIMIT))
      throw new RangeError('valid expected epoch required');
    const result = this.#db
      .prepare(
        `UPDATE authority SET epoch=epoch+1 WHERE id=1 AND epoch=? AND epoch<${LIMIT}`,
      )
      .run(expected);
    return result.changes === 1;
  }
}
