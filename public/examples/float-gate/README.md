# binary32 float gate (offline Node.js example)

Verified locally with Node.js 24.19.0; use that version or later. Keep these
files together:

- `float-gate-model.mjs` — strict 4-byte `Buffer` decoder and format/finiteness/quality/range gate.
- `fixture.json` — fixed, explicitly synthetic binary32 bytes and one f32 operation input.
- `demo.mjs` — fixed stdout for the fixture.
- `self-test.mjs` — standalone assertions with no site-test dependency.

Run from this directory:

```powershell
node demo.mjs
node --test self-test.mjs
```

Expected demo output:

```text
dataset=float-gate-binary32-synthetic-v1 synthetic=true
id=be_one bytes=3f800000 endian=be bits=0x3f800000 class=FINITE finite=true quality=good range=PASS usable=true decision=ACCEPT provenance=SOURCE_BYTES value=1
id=le_one bytes=0000803f endian=le bits=0x3f800000 class=FINITE finite=true quality=good range=PASS usable=true decision=ACCEPT provenance=SOURCE_BYTES value=1
id=nan_payload_a bytes=7fc00001 endian=be bits=0x7fc00001 class=NAN finite=false quality=good range=SKIPPED usable=false decision=NONFINITE_REJECTED provenance=SOURCE_BYTES nan_payload=0x400001
id=nan_payload_b bytes=7fc0dead endian=be bits=0x7fc0dead class=NAN finite=false quality=good range=SKIPPED usable=false decision=NONFINITE_REJECTED provenance=SOURCE_BYTES nan_payload=0x40dead
id=pos_inf bytes=7f800000 endian=be bits=0x7f800000 class=POS_INF finite=false quality=good range=SKIPPED usable=false decision=NONFINITE_REJECTED provenance=SOURCE_BYTES
id=neg_inf bytes=ff800000 endian=be bits=0xff800000 class=NEG_INF finite=false quality=good range=SKIPPED usable=false decision=NONFINITE_REJECTED provenance=SOURCE_BYTES
id=finite_out_of_range bytes=40400000 endian=be bits=0x40400000 class=FINITE finite=true quality=good range=FAIL usable=false decision=RANGE_REJECTED provenance=SOURCE_BYTES value=3
id=finite_bad_quality bytes=3f800000 endian=be bits=0x3f800000 class=FINITE finite=true quality=bad range=SKIPPED usable=false decision=QUALITY_REJECTED provenance=SOURCE_BYTES value=1
id=format_short bytes=000080 endian=le bits=none class=NONE finite=SKIPPED quality=good range=SKIPPED usable=false decision=FORMAT_REJECTED provenance=SOURCE_BYTES detail=bytes_must_contain_exactly_4_bytes
id=finite_operation_overflow bytes=7f800000 endian=be bits=0x7f800000 class=POS_INF finite=false quality=good range=SKIPPED usable=false decision=NONFINITE_REJECTED provenance=FINITE_OPERATION_F32_OVERFLOW
```

The gate receives a Node.js `Buffer`, an explicit `be` or `le` order, a `good`
or `bad` quality flag, an inclusive finite `{ min, max }` range, and a
non-empty provenance string. `usable` is true only after all four gates pass.
A source NaN or Infinity is rejected but remains `SOURCE_BYTES`; the raw
special value alone does not establish its cause. The sole
`FINITE_OPERATION_F32_OVERFLOW` output comes from the documented synthetic
`Math.fround()` multiplication with two finite f32 operands.

`nan_payload` is the complete 23-bit fraction field, including the
quiet/signaling-related bit; it is not a payload integer after that bit has
been removed. A declared endian can also be legal but semantically wrong:
`0000803f` declared as `be` is a finite subnormal inside this example's 0..2
range, so the gate accepts it. The integration contract must establish endian.

This code does not parse text values, repair frames, maintain a control state,
or measure a PLC, network, memory, CPU, or device exception behavior. Endian,
quality semantics, engineering range, freshness, and control fallback must be
specified and validated by the target system.
