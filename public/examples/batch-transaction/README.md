# SQLite batch transaction (offline)

This folder is an executable local SQLite example for one batch: header `B17`
plus details `(1, 10)`, `(2, 20)`, `(3, 30)`. Its only effect is writing the
SQLite file. It does not connect to a PLC, start a service, or confirm a
physical batch.

Run it with [Node.js 24.19.0 or newer](https://nodejs.org/en/download). Node
24.19.0 with bundled SQLite 3.53.3 is the verified baseline; no npm package is
needed.

Keep every file in this folder together, then run from that folder:

```powershell
node demo.mjs
```

Expected output:

```text
success: headers=1 details=3 seq=1,2,3 sum=60 status=completed
constraint rollback: error=CHECK constraint failed: value BETWEEN -10000 AND 10000 headers=0 details=0
explicit rollback: headers=0 details=0
observer before COMMIT: headers=0 details=0
observer after COMMIT: headers=1 details=3 seq=1,2,3 sum=60 status=completed
demo: PASS
```

The demo creates a fresh marked `hubplc-batch-transaction-*` directory under
the system temporary directory and only removes that resolved, owned directory
at the end. It has no database-path argument and asserts each database file is
new before opening it.

The normal transaction begins with `BEGIN IMMEDIATE`, inserts the collecting
header and all three details, verifies count/sequence/sum, changes the header
to `completed`, then commits. `expected_count = 3`, the `(batch_id, seq)`
primary key, detail `CHECK` constraints, and a completed-status trigger protect
this example's `collecting` to `completed` update against incomplete or
inconsistent details. They do not make this a general immutable-batch schema:
direct SQL inserts/updates and database write permissions need their own design.

The second scenario deliberately inserts the first detail, then sends `10001`
for the second detail directly to SQLite so its `CHECK` constraint fails while
the transaction is open. It explicitly rolls back, then reads 0 headers and 0
details. The next scenario explicitly rolls back after the first detail. The
last scenario holds a complete writer transaction open while a separate
observer connection reads 0 rows; after `COMMIT`, a new observer query reads
the whole completed batch. Its `readBatch()` uses two SELECT statements, not a
general read transaction; the demo has no concurrent writer between those two
SELECT statements. A production cross-table consistent-read requirement needs
its own transaction and journal-mode design.

This does not test a power failure, storage durability, commit-reply loss,
outbox delivery, external services, or PLC effects. Use a stable operation ID
and a separate external-effect contract when those are part of the workflow.
