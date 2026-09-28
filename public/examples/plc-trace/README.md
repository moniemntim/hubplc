# PLC trace offline dataset

Requires Node.js 22.13.0 or later and no installed packages. Keep these files
together:

- [run.mjs](./run.mjs): reads the fixture and writes deterministic CSV-like stdout.
- [trace-model.mjs](./trace-model.mjs): task-row and timestamp-snapshot model.
- [fixture.json](./fixture.json): fixed source data and sampling plans.
- [expected-output.txt](./expected-output.txt): exact stdout for the included fixture.

```powershell
node run.mjs
```

The output must exactly equal `expected-output.txt`. If you change the fixture,
run the runner again and keep the resulting output with that changed fixture;
the checked-in expected output intentionally applies only to the reviewed input.

The fixture defines a 2 ms cyclic task, 12 task rows, and events at scans 3, 7,
and 10. `oneShot` is true only in an event task row. The retained `eventCount`
increments on it. Time uses `[startMs, endMs)`; a timestamp on `endMs` belongs
to the next row. The 6 ms `coarse-phase-0` and `coarse-phase-2` plans differ
only by 2 ms of phase, so their OneShot visibility differs while their final
sampled count is both 3.

This is an offline timestamp model. It does not emulate a PLC, CODESYS Trace,
runtime scheduling, task jitter, I/O refresh, or physical inputs/outputs.
