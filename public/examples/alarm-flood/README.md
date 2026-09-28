# Alarm-flood replay teaching model

Use Node.js 24.19.0. Save model.mjs, fixtures.mjs, demo.mjs, self-test.mjs,
practice.mjs, and this README in one directory. Run:

```powershell
node self-test.mjs
node demo.mjs
node practice.mjs
```

No package, network, PLC, HMI, database, or real clock is used. The fixture is
synthetic: all times are values on one virtual clock, not measured UTC or proof
that field devices are synchronized.

fixtures.mjs deterministically computes 132 transition rows for 50 cycles:
50 ACTIVE, 40 CLEAR, and 42 ACK. The groups are Utility=1, Pump=14,
TemperatureFlow=20, and Communication=15. At [0, 900000), the calculated
snapshot has 40 clear, 10 active, and 8 unacknowledged cycles (3 active and 5
clear). Every trace retains both a cycle id and its original transition rows.

The model has a narrow contract: a submitted replay has at most 512 rows and
admits at most 256 unique transition ids (retransmissions of those ids may
repeat); each row is a plain object with exactly the documented fields, bounded
printable nonblank strings, nonnegative safe-integer clocks, and receivedAtMs
at or after occurredAtMs. sourceSequence is unique across this one synthetic
journal, not a per-device sequence that may repeat. It orders a life cycle by
sourceSequence, never by receivedAtMs; occurredAtMs must not decrease in that
sequence. Later rows of a cycle must retain the ACTIVE row source and group.

Replaying an identical transition id preserves the first original row and
reports it as ignored. The same id with a different payload throws; it is never
silently overwritten. The analysis functions only return new values and never
ACK, clear, alter source rows, or issue a control command.

endMs is exclusive: a transition at 900000 belongs to the next window. The
summary requires complete prior source history among rows available at asOfMs;
it rejects a visible later source row when an earlier row is absent, rather than
inventing an empty state. A bounded query must therefore include the prior
history needed for the requested window. A late
row with occurredAtMs=899999 and receivedAtMs=920000 is absent from the
original asOfMs=900000 snapshot, then appears when recomputed at 920000. The
original object is retained; the later content version hash differs. The hash
is SHA-256 over the canonical unique visible transitions, selected summary, and
window including asOfMs. Duplicate diagnostics and input receive order are not
hashed, so an identical retransmission does not change it. It is a content
identifier for this teaching output, not a signature.

Practice already adds that late row. It prints original cycles=50, recomputed
cycles=51, and nextWindowCycles=0. Change late.occurredAtMs in that copied row
to 900000: the old window returns 50 and nextWindowCycles becomes 1. You can
also remove an ACK row from the copied rows array to see the unacknowledged
count change. The earliest cycle id is only a candidate ordered by source
sequence; the example makes no causal or root-cause claim.
