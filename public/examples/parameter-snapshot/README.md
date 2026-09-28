# Parameter snapshot scan model

These five files are a standalone Node.js 24.19.0-or-newer teaching model. It
does not connect to a PLC, HMI, field device, or vendor simulator.

```powershell
node self-test.mjs
node demo.mjs
```

Every scan input has exactly these fields:

```js
{
  edit: { qty: 120, wait_ms: 700 },
  confirm: false,
  acceptRequest: false,
  complete: false,
  abort: false,
}
```

`qty` must be a safe integer in `1..1000`; `wait_ms` must be a safe integer in
`0..60000`. The Edit submission must contain exactly both fields. Only the
rising edge of `confirm` validates and copies the complete Edit record to
Confirmed, then increments its version. A rejected submission leaves Confirmed
and its version unchanged; release `confirm` before trying again. Version
`2147483647` is the stated upper bound, so confirmation is rejected instead of
wrapping.

`acceptRequest` is a level-held handshake. A rising request when IDLE starts one
RUN job and emits one `acceptance.status=accepted`; holding it high cannot start
another job. Release it before the next request. If a valid confirm rising edge
and accept rising edge occur together, acceptance is `deferred` and the request
must remain high through the next scan. That next scan creates the Snapshot from
the new Confirmed version. If the confirmation is rejected or the request is
released first, no job starts.

While RUN, later confirmations can update Confirmed but never change
`jobSnapshot`. `complete` or `abort` ends the RUN job, copies its Snapshot to
`lastJob`, and clears `jobSnapshot`. Both terminal signals high in one scan are
rejected as an invalid model input. A request raised while RUN is rejected and
is not queued. In IDLE, either terminal signal takes priority over a new or
deferred request: the terminal is reported as ignored, the request is rejected
as `terminal_signal_active`, and it must be released before another request.

`demo.mjs` prints every scan's snapshot version and `snapshot_values=qty/wait_ms`.
It shows version 8 holding `120/700` after Confirmed reaches version 9, then
the next RUN job holding version 9 with `200/900`.

This is one JavaScript function call per teaching scan. It does not prove PLC
task synchronization, atomic structure copies across PLC tasks, retained-memory
behavior, HMI transport completeness, or compatibility with any PLC family.
