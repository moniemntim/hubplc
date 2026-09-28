# PLC backlog offline example

Requires Node.js 22.13.0 or later. No `npm install`, network connection, PLC,
timer, or CPU workload is involved. Keep these files in one directory:

- `backlog-model.mjs` — deterministic FIFO and supplied-trace classifier.
- `fixture.json` — eight fixed arrivals and three synthetic traces.
- `run.mjs` — prints the timetable and trace classifications.
- `self-test.mjs` — standalone Node tests; it does not import this site's test suite.

```powershell
node run.mjs
node --test self-test.mjs
```

The FIFO model has one service slot and a finite waiting capacity that excludes
the active job. It processes a finish at the same timestamp before a new
arrival. The fixture uses arrivals at 0 through 700 ms every 100 ms, a 120 ms
service duration, and waiting capacity 2. All eight jobs are admitted; their
waits are 0, 20, 40, 60, 80, 100, 120, and 140 ms.

`serviceMs=120` is external service duration in this synthetic model. The
runner does no wall-clock waiting and makes no PLC CPU-load measurement. BEGIN
and END mean actual call entry and return; `WORK_COMPLETE` is separate external
work completion. The trace classifier only reports relationships in the input
rows. In particular, `hypothetical-overlap` is not observed Q-series behavior,
does not prove a data overwrite, and a trace with `traceComplete=false` is
classified as insufficient evidence.
