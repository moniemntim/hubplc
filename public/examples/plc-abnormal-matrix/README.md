# PLC abnormal-scenario matrix

This is an offline teaching model. It needs [Node.js 22.13.0 or newer](https://nodejs.org/en/download) and no packages, PLC connection, network service, or hardware.

Run these commands from this folder:

```powershell
node demo.mjs
```

Download abnormal-matrix-model.mjs, fixtures.mjs and demo.mjs into the same folder. No repository files are required. `abnormal-matrix-model.mjs` exports `initialMatrix()` and `matrixScan()`. Each call is one sampled scan. `fixtures.mjs` contains four main timelines plus four independent boundary/priority cases; `demo.mjs` renders all eight.

The boundary sections finish in DONE, ERROR, ERROR and CANCELLED respectively. Omitted booleans default to false; omitted IDs default to null. To represent a held request, explicitly supply requestLevel=true and its requestId on every sampled scan.

The contract is deliberately narrow: one running request, `Cancel > Timeout > Feedback`, a 300 ms deadline, matching Ack only for `DONE`, Reset only for `ERROR` and `CANCELLED`, and strictly increasing accepted RequestId values for one model lifetime.
