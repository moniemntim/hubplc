# HMI event timeline (offline Node.js example)

Verified locally with Node.js 24.19.0; use that version or later. Keep this
folder together. It is a fixed, synthetic data model, not an HMI, historian,
PLC, clock, network, or alarm-platform measurement.

```powershell
# Run these in the folder containing the downloaded files.
node demo.mjs
node --test self-test.mjs
node practice.mjs
```

Expected `demo.mjs` output:

```text
dataset=event-timeline-synthetic-v1 synthetic=true
window=2026-09-17T05:57:00.000Z..2026-09-17T06:00:00.000Z interval=[start,end)
rows=6 receipts=8 notes=1
windowed=PLC_A/TR2039,PLC_A/TR2041,PLC_A/TR2044,HMI_A/TR2048,PLC_A/TR2049
unlocated=HMI_NOTE/NOTE17-V1
observed_source_receive_difference_ms=520
coverage=2026-09-17T05:58:30.000Z..2026-09-17T05:58:40.000Z:SOURCE_CAPTURE_GAP
export_deterministic=true
```

The UTC window is `[2026-09-17T05:57:00.000Z,
2026-09-17T06:00:00.000Z)`, which displays as `13:57:00..14:00:00` at UTC+08.
The half-open end excludes an event exactly at `06:00:00.000Z`.

`fixture.json` has five source/command transitions and one note version. Its
two `TR2041` retransmissions have the same immutable transition payload and
only append receipt records: six timeline rows remain six and receipts become
eight. A changed payload for `PLC_A/TR2041` returns
`PAYLOAD_CONFLICT_REJECTED`; neither the stored event nor its receipts are
replaced.

Every stored event has `transitionId`, `sourceId`, `cycleId`, `sourceTime`,
`receiveTime`, `clockComparable`, `precision`, `kind`, and `actor`. A receipt
supplies `receiveTime`; retransmission receive times stay in bounded receipt
records. `sourceTime` is never rewritten. `520` is only the observed
source-to-receive difference for `TR2041`, because this synthetic fixture
declares comparable clocks and millisecond precision. It is not a network
latency measurement.

An event with missing `sourceTime` goes to `unlocated`; its `receiveTime` is
not used as an occurrence time or to sort it into the source-time window. The
fixed `coverage` metadata explicitly marks a capture gap. Missing rows alone
do not establish a gap or prove that nothing happened.

Notes require a legal, same-cycle non-note `targetKey`. `appendNote` adds a
new version and a note timeline row; it cannot edit source text. Run
`node practice.mjs` to append `NOTE17` version 2. It preserves version 1 and
prints two unlocated note rows. The later note is an authored record, not a
claim that the source event occurred at its `createdAt`.

`practice.mjs` also makes an in-memory copy of `TR2041` with only
`clockComparable: false`. It prints its unchanged raw source time and a null
observed difference. It does not alter the fixture, compensate a clock, or
establish event order or causation.

The exported data has a fixed total key: source-time rows sort by source time,
kind, source ID, and transition ID; unlocated rows sort by kind, source ID,
and transition ID. Export does not add a current-time field, so the same state
exports byte-for-byte identically. A `clockComparable: false` source time can
still appear in that display order, but the order does not establish its real
occurrence order. To explore a source-clock issue, change a
fixture transition's `clockComparable` to `false` and rerun: its raw time is
retained and the model reports no observed difference. This is a warning about
comparability, not a corrected time or a causal conclusion.

All input objects require exact plain-object shapes, bounded IDs, canonical
millisecond ISO UTC strings, and required fields. The sole timestamp exception
is an unknown `sourceTime`: it must be `null` with `clockComparable: false`
and `precision: 'unknown'`. State caps are 32 timeline events, 64 receipts,
and eight total note versions. A new event at the event cap creates
`EVENT_CAPACITY_FAULT`; receipt and note caps reject the attempted append.
Existing records remain unchanged. The model is deliberately bounded
and does not implement persistence, authentication, concurrent writers,
platform ingestion, real-time clock synchronization, or causal analysis.
