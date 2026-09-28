# Recipe confirmation and apply teaching model

Node.js 24.19.0. Offline, synchronous, single-owner and in-memory. No PLC, network, login, persistence or production tokens.

Save these files in one folder:

- recipe-validation.mjs (existing recipe-v3 validator)
- workflow.mjs
- workflow-self-test.mjs
- confirmation-demo.mjs for the confirmation article, or apply-demo.mjs for the apply article
- workflow-README.md

Run `node workflow-self-test.mjs`, then the downloaded demo. Both demos can coexist. INITIAL/TARGET and CONTEXT in workflow.mjs are fixed fixtures. No package installation is required.

Full replacement of temp (°C), speed (rpm), low/high (%), recipe R1. Missing/null/string numeric values and unknown fields are rejected. No unit conversion or partial patch. All four fields must be visible and in scope because all four are written. Confirmation binds fixed user/session/device/recipe version, complete old/next values and current revision in SHA-256. This is Node-specific serialization, not a cross-language canonicalization standard or signature.

Virtual time starts at zero, advance() takes a monotonic safe integer up to 1000000 ms. Expiry is exactly 300000 ms after prepare; equality expires. At most 100 confirmations. Each confirm attempt consumes its record; a ready stage blocks another prepare. Each apply attempt consumes its stage. All state resets on process restart; this does NOT implement safe recovery.

Apply scripts have exactly four entries: ok, timeout, wrong-operation or staging-only. Each write is separate. timeout may have already updated the fake active value; no reply means unknown. staging-only does not update active values. Mismatched proof stops later writes. Any unknown latches UNRESOLVED and blocks new preparation. No rollback, retry or unresolved recovery is implemented. Confirmed prior fields plus unknown => partial; unknown first field => unknown. Four matched active proofs => applied, revision 41->45.

The fake proof protocol requires device/operation/field/value/active area and revision+1. Real equipment may support none of these. The model's synchronous check and mutation does not establish production database atomicity or safe intermediate equipment states. Permission/scope setters and externalUpdate() are trusted scenario injection, not public service endpoints. select() only echoes a local draft and has no validation guarantee.

externalUpdate() only accepts R1 and refuses further external updates at revision 1000000. It is a scenario input, not an equipment write counter. A stage rechecks all-field visibility immediately before starting its writes.

prepare() after virtual time 700000 returns MODEL_TIME_LIMIT, so every issued confirmation can reach its full 300000 ms expiry within the clock domain.
