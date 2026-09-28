# STX + ASCII length + ETX parser (offline Node.js example)

Verified locally with Node.js 24.19.0; use that version or later. Keep these
files together:

- `serial-ascii-model.mjs` — byte-by-byte state machine with deadline and bounded storage.
- `fixture.json` — fixed, read-only synthetic split, coalesced, and fault input.
- `demo.mjs` — fixed stdout for the fixture.
- `self-test.mjs` — standalone assertions with no site-test dependency.

Run from this directory:

```powershell
node demo.mjs
node --test self-test.mjs
```

Expected demo output:

```text
dataset=serial-ascii-stx-length-etx-synthetic-v1 synthetic=true
chunk_now=0 published=0 stage=LENGTH stopped=false
chunk_now=1 published=0 stage=PAYLOAD stopped=false
chunk_now=2 published=2 stage=WAIT_STX stopped=false
published_index=0 length=5 payload_hex=48454c4c4f frame_hex=0230303548454c4c4f03
published_index=1 length=1 payload_hex=5a frame_hex=023030315a03
fault=lengthSyntax stopped=true reason=LENGTH_SYNTAX_REJECTED expected=ASCII_DECIMAL_0x30_TO_0x39 received=023041
fault=lengthRange stopped=true reason=LENGTH_RANGE_REJECTED expected=LENGTH_1_TO_128 received=02313239
fault=payload stopped=true reason=PAYLOAD_REJECTED expected=PRINTABLE_ASCII_0x20_TO_0x7e received=0230303180
fault=etx stopped=true reason=ETX_REJECTED expected=ETX_0x03 received=023030314104
fault=timeout stopped=true reason=TIMEOUT_REJECTED expected=NEXT_BYTE_BEFORE_DEADLINE received=02
```

Protocol contract: `02` STX, exactly three ASCII decimal length bytes for
payload length 1..128, printable payload bytes `20..7e`, then `03` ETX. The
length counts only payload bytes. The parser compares numeric byte values and
preserves hex diagnostics; it does not call an ASCII decoder that could hide a
high-bit byte.

The total deadline starts at STX and is 500ms. At `now >= deadline`, timeout is
observed before any same-time byte; call `advanceParser(state, now)` even when
there is no byte. Any fault stops flow without automatic resynchronization.
Creating a fresh parser is only a fresh model state, not serial-channel or
late-reply isolation.

Storage is bounded to a 133-byte candidate frame, configurable lifetime input
limit (default 4096), and configurable published-frame limit (default 4). This
is not a Modbus parser, TCP or serial-port implementation, OS-buffer test, or
PLC measurement.
