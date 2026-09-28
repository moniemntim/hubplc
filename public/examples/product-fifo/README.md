# Product FIFO ring buffer

Run with Node.js 24.19.0 or newer:

```powershell
node self-test.mjs
node demo.mjs
node practice.mjs
```

This capacity-5, single-writer model processes `enqueue` before `stationEvent` each scan. Thus a full queue rejects P06 even when that scan subsequently dequeues P01; resend P06 next scan, where it writes to the wrapped tail. `head`, `tail`, and `count` distinguish full from empty.

Only head can advance: S1 COMPLETE gives `AT_S2`, S1 SKIP gives `SKIP_S1`, and S2 COMPLETE dequeues only either ready head state. Wrong product, station, or order leaves the ring unchanged. Event IDs are `E<epoch>-<sequence>` with epoch 1..255 and sequence 1..1000000. Same ID plus same payload is duplicate; changed payload conflicts. Event and product-ID records each cap at 20; new records are rejected when full, never silently evicted. Product IDs cannot be reused during this model lifetime.

This does not implement parallel stations, real physical takeaway, timeout, restart recovery, persistence, PLC synchronization, or device safety.

A valid-format event consumes its event-ID record before semantic checks. Thus an empty or wrong-order event retried with the same ID is duplicate; send a new ID after correcting it. Epoch is only ID syntax, not active-epoch fencing or an ordering guarantee.
