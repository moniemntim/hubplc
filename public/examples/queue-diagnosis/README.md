# Queue diagnosis offline example

Verified with Node.js 24.19.0; use that version or later. Keep these files together; no `npm install`,
PLC, socket, wall-clock wait, or CPU-load measurement is involved:

- `queue-diagnosis-model.mjs` validates and calculates one timing record.
- `fixture.json` is explicitly synthetic data: four accepted and three rejected records.
- `run.mjs` prints the calculated segments and rejection reasons.
- `self-test.mjs` is an independent Node test and does not import this site's tests.

```powershell
node run.mjs
node --test self-test.mjs
```

Every endpoint has its own integer `ms` and `clockId`. All seven endpoints must
use one clock and be nondecreasing: `enqueue`, `dequeue`, `send`, `firstByte`,
`lastByte`, `parseDone`, `complete`. The model calculates six adjacent segments
and verifies that their sum equals `complete - enqueue`.

`first_byte_wait` runs from handing the request to the local transport until the first response byte. It
can include network and device time. `parse` is only calculable when `lastByte`
is known; `complete - firstByte` alone cannot establish parsing time. The
reported candidate is merely the largest measured segment, not a root-cause or
device-fault conclusion.
