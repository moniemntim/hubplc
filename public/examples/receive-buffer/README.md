# Receive buffer offline example

Verified locally with Node.js 24.19.0; use that version or later. Keep these
files together:

- `receive-buffer-model.mjs` — 2-byte length framing and payload-byte queue.
- `fixture.json` — explicitly synthetic split, coalesced, partial, and oversize input.
- `demo.mjs` — fixed stdout for the fixture.
- `self-test.mjs` — standalone Node assertions with no site-test dependency.

```powershell
node demo.mjs
node --test self-test.mjs
```

The model uses actual Node.js `Buffer` concatenation and slicing, but no socket or
TCP API. A complete frame alone enters the application queue. The queue capacity
counts payload bytes; if a complete frame does not fit, its whole payload is
rejected and existing queue frames stay unchanged. A header declaring a payload
outside `1..maxPayload` stops this model without attempting resynchronization.

The fixture has `maxPayload=1000`, queue capacity 8 bytes, a 4-byte accepted
frame, a coalesced 6-byte rejected frame, one consumption, and a new 4-byte
accepted frame. Its fixed output is:

```text
dataset=receive-buffer-synthetic-v1 synthetic=true
after_chunk_1 framing_bytes=1 queue_bytes=0 completed=0 accepted=0 rejected_queue=0 stopped=false
after_chunk_2 framing_bytes=0 queue_bytes=4 completed=2 accepted=1 rejected_queue=1 stopped=false
consume payload_bytes=4 queue_bytes=0 consumed_frames=1
after_chunk_3 framing_bytes=0 queue_bytes=4 completed=3 accepted=2 rejected_queue=1 stopped=false
conservation completed_payload=14 accepted_payload=8 rejected_payload=6 consumed_payload=4 queue_bytes=4 completed_matches=true accepted_matches=true
eof=COMPLETE
partial_eof=INCOMPLETE_FRAME_AT_EOF framing_bytes=4 loss_inferred=false
oversize stopped=true reason=FRAME_TOO_LARGE queue_bytes=0
```

An incomplete frame at EOF says only that the supplied input ends mid-frame. It
does not infer packet loss. `COMPLETE` says the framing buffer is empty; it does
not say a consumer drained the application queue.

The model accepts payload lengths in `1..maxPayload`; a zero header stops with
`EMPTY_FRAME` so zero-byte work cannot bypass the queue-byte capacity. Teaching
limits are `maxPayload <= 65535`, `queueCapacityBytes <= 65536`,
`maxInputBytes <= 65536`, and `maxFramingBytes <= 65537`; framing must fit
`maxPayload + 2`. A large single chunk is conservatively stopped before
concatenation when it exceeds an applicable limit. These are model bounds, not a
general stream-parser or OS-memory measurement; queue bytes exclude object and
allocation overhead.
