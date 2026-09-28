# Batch statistics offline fixture

Run from the repository root:

```text
node public/examples/batch-statistics/run-example.mjs
```

The input contract is fixed: `scaledValue` is a safe integer in tenths, `quality` must be `GOOD`, values must be within `-400..1800`, and a batch contains at most four samples. A five-sample batch returns `INPUT_LIMIT_EXCEEDED` with no partial statistics. This is an offline JavaScript calculation fixture, not PLC code or a hardware test.
