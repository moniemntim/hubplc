# FC03 late-response matcher (offline)

This folder contains a deterministic, in-memory matcher for **already framed**
Modbus TCP FC03 callbacks. It does not open a socket, send a request, connect to
a PLC, or decide whether a transport is actually closed.

Keep these two files in the same downloaded folder:

- [fc03-late-response-matcher.mjs](./fc03-late-response-matcher.mjs) stores a
  local epoch, peer, request deadline, pending state, and FC03 response checks.
- [demo.mjs](./demo.mjs) self-checks late callbacks, response validation,
  deadline boundaries, TID exhaustion, and a FC03 exception.

With Node.js 22.13.0 or later, run this command **from this downloaded folder**:

```powershell
node demo.mjs
```

Expected output:

```text
old_callback,old-epoch
new_callback,completed
duplicate,duplicate
wrong_peer,wrong-peer
wrong_function,wrong-function
wrong_pdu_length,wrong-pdu-length
deadline_just_before,completed
deadline_exact,late
deadline_after,late-terminal
tid_wrap_after_65535,refused
fc03_exception,exception
```

The caller must capture `epoch` when `submitFc03()` returns and pass that
captured value to `acceptCallback()`. `advanceEpoch()` refuses unless
`oldChannelClosed: true` is supplied. That value is an external confirmation
from the integrating application after it has closed the old transport; this
offline model neither observes nor proves any network state.

All `nowMs` and `receivedAtMs` values are processing instants sampled from the
same monotonic clock when the matcher method is invoked. `receivedAtMs` is not
an older packet-capture or callback-arrival timestamp. The matcher rejects a
value earlier than a previously processed instant, so it cannot complete a
callback supposedly received before its request was submitted. The epoch is
different: it is captured at submission and carried unchanged by the callback.

Within one epoch, the allocator never recycles a Transaction Identifier: after
`65535`, it refuses another submission. A caller must externally close the old
channel, advance the epoch, and then begin again at TID `0`. This intentionally
trades throughput/availability for a rule that does not guess whether two
identical same-epoch replies belong to an old or a new request.

`submitFc03()` accepts only a contiguous FC03 range ending at or before address
`65535`: `startAddress + quantity` must be at most `65536`. Therefore address
`65535` can request one register, but not two.

For a normal FC03 response, the matcher checks only available response facts:
Unit ID, function code `03`, byte count `2 × requested register quantity`, and
PDU byte length. It records the request start address and quantity for audit,
but deliberately does not compare an echoed address because an FC03 response
does not contain one. An `83` response is separately accepted as a terminal
Modbus exception only when it has exactly one nonzero exception-code byte.

Audit records are intentionally retained for the short teaching session, even
after an epoch advances. This example omits a production retention, capacity,
or archival policy; an integrating application must define those separately.
