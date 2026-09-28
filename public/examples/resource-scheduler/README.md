# FCFS resource scheduler scan model

These five files form a standalone Node.js 24.19.0-or-newer teaching model. It
does not connect to a PLC, safety controller, HMI, field module, or vendor
simulator.

```powershell
node self-test.mjs
node demo.mjs
```

Each scan has a nondecreasing safe-integer `nowMs`, Boolean request/cancel/reset
signals for A and B, a `release` of either `null` or `{ owner, jobSeq }`, and
the explicit reset inputs `moduleReady` and `safetyConfirmed`. A request rising
edge creates at most one pending record per station. A/B requests rising in the
same scan receive sequence numbers in A then B order. Sequence values are
bounded by 1,000,000 and are never reused, including after cancellation.

`event` is the last event for compatibility with the compact demo line. `events`
is the complete ordered list for that scan: for example, an A grant at the last
sequence can coexist with B's `request_B_rejected_sequence_exhausted` record.

FCFS chooses the lowest pending sequence. Holding a request high cannot create
another record. Pending cancellations happen before arbitration. A release must
match both current owner and job sequence; a valid release clears ownership but
does not grant another station until the next scan. Owner cancellation is only a
recorded request for a separately designed controlled stop; it cannot release a
job directly.

Each grant sets `deadlineMs = nowMs + maxHoldMs`; a later scan with
`nowMs >= deadlineMs` has timeout priority over release. It enters `FAULT_LOCK`,
retains the owner/job sequence, and revokes both enables. A reset needs a new
`resetFault` rising edge plus `moduleReady` and `safetyConfirmed`. A valid reset
clears the retained owner but cannot grant in that scan; the following scan
arbitrates remaining pending work.

`nowMs` may reach `Number.MAX_SAFE_INTEGER` so an already-created deadline at
that value can still time out. Only a new grant checks addition headroom. If
`nowMs + maxHoldMs` would exceed a safe integer, the pending record remains and
the scan records `clock_exhausted`; it does not invent a wrapped deadline.

A request changing from true to false does not cancel its pending record; only
`cancelA` or `cancelB` does. Owner cancellation keeps that owner's enable true
until an explicitly designed controlled stop provides a valid release or a
timeout faults the resource.

The finite-wait claim is conditional: without a fault lock and with every owner
releasing within its declared finite bound, FCFS serves a pending record after
the current owner and all earlier pending records finish. Fault recovery,
controlled stopping, physical safety confirmation, clock source, and true PLC
task serialization require separate system design and validation.
