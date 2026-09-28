# operation-log-v1 offline evidence reader

This folder reads synthetic operation-log-v1 event chains for one fixed
metadata record: `OP-884`, user `U17`, equipment `EQ-A`, tag `TEMP_SP`, recipe
screen, °C, displayed old value 50, authority old value 52, expected revision
42, and requested value 55. Those authority values are fixture assumptions,
not live equipment reads.

The metadata keys and values are this model's fixed teaching contract. Key
order does not matter, but every own key must match and an extra `token` or
other field is rejected. To change the metadata, update the model and fixtures
together; this reader is not for arbitrary production logs.

Keep all five files together and run with Node.js 24.19.0 or newer:

```powershell
node self-test.mjs
node demo.mjs
```

Events are processed in `seq` order, never sorted by timestamps. Every event
requires a four-digit-year, millisecond ISO UTC `serverTime`; a backward timestamp produces a
warning but cannot reorder evidence. The reader accepts at most 12 events and
4096 UTF-8 bytes after serializing the already-provided event object sequence.
It does not cap a raw file before that object allocation. Events must be
JSON-shaped: cyclic values and `BigInt` are invalid. It rejects unknown fields,
including password/token-like additions, and never writes secrets.

`accepted` and `sent` are not `applied`. A readback becomes applied only when
operation ID, equipment, tag, value 55, revision before 42, and revision after
43 all match. This `revisionAfter = revisionBefore + 1` condition is this
teaching contract, not a universal equipment rule. Same value with the wrong
operation or target stays unknown.

The model begins in `pending`; an explicit first `pending` event is optional,
so an `accepted` event at `seq: 1` is valid.
Malformed proof, duplicate/missing sequence, or illegal transitions are invalid
rather than inferred as success. Explicit `rejected` needs a reason such as
`VERSION_CONFLICT observed=43 expected=42`; a later differing readback is not
automatically rejection.

This is a local evidence interpretation model. It does not authenticate users,
write PLC values, guarantee log durability, establish trusted clocks, hash-chain
events, or prove atomic equipment revision updates.
