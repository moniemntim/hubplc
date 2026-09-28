# Numeric input: exact decimal text and raw envelope gate

Verified locally with Node.js 24.19.0; use that version or later. Keep these
files together:

- `numeric-input-model.mjs` — fixed contract, exact decimal parser, raw envelope validator, and last-value state.
- `fixture.json` — fixed, explicitly synthetic input sequence.
- `demo.mjs` — fixed stdout for the fixture.
- `self-test.mjs` — standalone Node assertions with no site-test dependency.

Run from this directory:

```powershell
node demo.mjs
node --test self-test.mjs
```

Expected demo output:

```text
dataset=numeric-input-synthetic-v1 synthetic=true
contract_schema=numeric-input/v1 unit=C scale=10 engineering=0..100.0C step=0.1 wire=0..1000
entry=engineering id=text_range text=100.04 decision=RANGE_REJECTED last_wire=250 last_engineering=25.0
entry=engineering id=text_step text=25.35 decision=STEP_REJECTED last_wire=250 last_engineering=25.0
entry=engineering id=text_exact text=25.30 decision=ACCEPT last_wire=253 last_engineering=25.3
entry=raw id=raw_string raw=253 raw_type=string decision=RAW_TYPE_REJECTED last_wire=253 last_engineering=25.3
entry=raw id=raw_exact raw=7 raw_type=number decision=ACCEPT last_wire=7 last_engineering=0.7
```

The contract is fixed: schema `numeric-input/v1`, unit `C`, scale 10, with
`wire = engineering × 10` and `engineering = wire ÷ 10`; engineering range
0..100.0, step 0.1, and integer wire range 0..1000. The text
grammar accepts only ASCII digits, an optional decimal point with digits after
it, no leading zeroes except `0`, no spaces, signs, comma locale separator,
exponent notation, suffixes, or more than 16 characters. Trailing zeroes are
valid: `25.30` maps exactly to wire 253.

Text validation uses a decimal `BigInt` numerator and denominator. It rejects
100.04 for range before evaluating the step, rejects 25.35 for step, and does
not round or clamp either value. Raw envelopes do not parse text: they must be
plain objects with exactly four own enumerable fields (`schema`, `unit`,
`scale`, `raw`), with no array, missing, extra, or inherited field. `raw` must
be a JavaScript safe integer number, and schema, unit, scale, and range must
all match. A rejection preserves `lastWire`; this model does not operate a
server, PLC, HMI, authorization system, or control output.
