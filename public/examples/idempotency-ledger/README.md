# SQLite idempotency ledger (offline)

This folder is a reproducible local SQLite transaction example. It accepts one
fixed operation, `increment`, with an integer `amount` from 1 through 1000.
Its only effect is `increment_count` in a SQLite table. It does not contact a
PLC, start a service, send a request, or represent a physical action.

Run it with [Node.js 24.19.0 or newer](https://nodejs.org/en/download). Node
24.19.0 with bundled SQLite 3.53.3 is the verified baseline for this example;
it uses the built-in `node:sqlite` `DatabaseSync` API and no npm packages.

Keep all files in this folder together and run the following from that folder:

```powershell
node demo.mjs
```

The expected output is exactly:

```text
OP7 first: applied counter=1
OP7 retry 1: replayed counter=1
OP7 retry 2: replayed counter=1
OP7 changed payload: conflict counter=1
OP7 after reopen: replayed counter=1
crash before COMMIT: child_exit=70 counter=0 ledger_records=0
crash after COMMIT before reply: child_exit=71 retry=replayed counter=1
demo: PASS
```

`demo.mjs` creates a new private temporary directory named
`hubplc-idempotency-ledger-*`, asserts that each SQLite file does not already
exist, and removes only that directory at the end. It has no database-path
argument, so it cannot overwrite or remove a database selected by the user.

## Request contract and replay rule

`operationId` must be a nonempty string with no leading or trailing whitespace,
at most 64 UTF-8 bytes, and no control character. The payload must have exactly
these fields:

```js
{ operation: 'increment', amount: 1 }
```

`amount` is a safe integer from 1 to 1000. The module serializes it in this
fixed order before hashing with SHA-256 over UTF-8:

```text
{"amount":1,"operation":"increment"}
```

The SQLite transaction starts with `BEGIN IMMEDIATE`, tries the primary-key
insert into `idempotency_ledger`, updates the counter only for the newly
inserted row, writes the result JSON, and commits. A matching existing ID and
payload returns the stored result with `status: 'replayed'`; a different
payload returns `status: 'conflict'` and does not update the counter.

The demo starts child Node processes that deliberately exit with code 70 just
before `COMMIT`, and code 71 just after `COMMIT` but before a reply could be
returned. The parent itself verifies both persisted states and exits with code
0 when they pass. The child accepts only that newly created, marked temporary
directory together with an in-memory ownership token, derives its fixed
database filename from the requested crash phase, and refuses existing files.
It is an internal helper for `demo.mjs`, not a command to run directly. This
controlled process-exit test is not a power-loss, storage-durability, PLC,
outbox, or external exactly-once test.
