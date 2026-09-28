# Retry and circuit-breaker offline example

Verified locally with Node.js 24.19.0; use that version or later. Keep these
files in one directory:

- `retry-breaker-model.mjs` — virtual retry and circuit-breaker state model.
- `demo.mjs` — deterministic sample timeline and breaker transitions.
- `self-test.mjs` — independent Node assertions without this site's test suite.

```powershell
node demo.mjs
node --test self-test.mjs
```

The five fixed samples are `0.63, 0.705, 0.05, 0.8375, 0.35`; with base 1000,
multiplier 2, and cap 8000, they produce caps `1000, 2000, 4000, 8000, 8000`
and waits `630, 1410, 200, 6700, 2800` ms. They are fixed arithmetic inputs,
not a test of a random generator or a uniform distribution. Attempts include the
original call. The demo's overall 13000 ms deadline clips the fifth requested
wait from 2800 to 2560 ms, so no sixth call begins.

`simulateRetry` accepts only virtual durations for failures whose read semantics
have already been confirmed safe to retry by an outer layer. It does not model
writes, unknown outcomes, or idempotency decisions.

The breaker opens after five consecutive retryable failures within 20000 ms and
holds OPEN for 30000 ms. `advanceBreaker`, `acquirePermit`, and `completePermit`
first observe whether a probe is due; equality is timeout before token outcome.
The timeout opens from the explicit observation time, and an old reply is then
ignored. An explicit `advanceBreaker` also expires a probe with no reply. Only
the probe has a 1000 ms deadline; a normal CALL must be completed by its outer
owner. These pure state functions require one serialized owner that saves every
returned state; they are not a thread-safe lock. No real timer, network, PLC,
rate limiter, or CPU measurement is present.
