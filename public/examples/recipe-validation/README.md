# recipe-v3 offline validation

This folder validates flat JSON text against one teaching contract. It does not
communicate with a PLC, deploy a recipe, implement JSON Schema, verify a
signature, or support nested recipes.

Use Node.js 24.19.0 or newer. No npm packages are needed. Keep all six files
in this folder together and run:

```powershell
node self-test.mjs
node demo.mjs
node inspect.mjs
```

The input is bounded at 2048 UTF-8 bytes. At or below that size, `raw.text`
retains the exact supplied JSON text. Above it, the validator does not parse or
retain the text: `raw.text` is null, `raw.truncated` is true, and `incomplete`
is true. The normal error output holds at most three entries. If more errors
exist, the final entry is `error_limit_reached` and `incomplete` is true; no
missing field is fabricated, no value is filled with zero, and no value is
clipped.

The required flat fields are `schema_version`, `recipe_id`, `temp`, `speed`,
`low`, and `high`. Only the literal version `recipe-v3` is accepted. A missing,
non-object, or unsupported version stops field validation. JSON strings such as
`"1200"` are not coerced to numbers. `temp` is -40 through 180 °C, `speed` is
0 through 3000 rpm, and `low`/`high` are 0 through 100 percent. `low <= high`
is compared only after both numbers pass type and range checks.

For valid input, the module emits only a candidate: a fixed canonical JSON
sequence and SHA-256. It does not send or apply that candidate anywhere.

Edit the raw JSON string in inspect.mjs to view full errors and raw evidence.
Top-level duplicate keys (including Unicode-escaped equivalents) are rejected
before field validation. recipe_id must contain non-whitespace text. Unknown
field paths escape tilde and slash as ~0 and ~1; / is the teaching root marker.
