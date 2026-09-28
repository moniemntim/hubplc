# Alarm hysteresis teaching model

Node.js 24.19.0. Save `model.mjs`, `fixtures.mjs`, `demo.mjs`, `self-test.mjs`,
`practice.mjs`, and this README in one folder. Run `node self-test.mjs`, then
`node demo.mjs`. No package installation is required.

The model uses the integer `rawMilliBar` field (mbar), never floating-point
bar values.
Low pressure starts only when `rawMilliBar < 5000` for a continuous 2000 ms.
It clears physically only when an active alarm has `rawMilliBar > 5300` for a
continuous 3000 ms. Equality does not qualify. `active` is the physical
condition result; `latched` preserves the historical alarm after active clears.

Every call returns a state containing raw, sample `quality`,
`evaluationKnown`, low/high timer origins, active, latch, and decision.
`quality` records the received sample; `evaluationKnown` says whether this
event could be evaluated. Thus a gap event keeps `quality=GOOD` but has
`evaluationKnown=false`. Input times must be strictly increasing safe
integers. A gap above 1000 ms or `BAD` quality resets both timers and reports
UNKNOWN without clearing active or latch. The continuity rule is an explicit
zero-order-hold teaching assumption: valid samples at most 1000 ms apart stand
for the interval between them. Sparse endpoints do not prove real process
continuity.

Reset is a fixture boolean, not an HMI command. A fresh valid `reset=false`
sample arms the next `false -> true` edge. While active it is rejected. Once
the physical condition has cleared, a newly armed edge clears the latch only
on a current GOOD sample above 5300 mbar; an inactive sample in the hysteresis
band is rejected as not normal. This example does not implement Ack. There is
no automatic machine restart, device write, or safety function.

`demo.mjs` prints this fixed result (one line for every fixture sample):

```text
equal-low now=0 raw=5000 quality=GOOD evaluationKnown=true low=- high=- active=false latch=false decision=INACTIVE_LOW_EQUAL
low-1 now=500 raw=4999 quality=GOOD evaluationKnown=true low=500 high=- active=false latch=false decision=PENDING_LOW_HOLD
low-equal now=1000 raw=5000 quality=GOOD evaluationKnown=true low=- high=- active=false latch=false decision=INACTIVE_LOW_EQUAL
low-2 now=1500 raw=4999 quality=GOOD evaluationKnown=true low=1500 high=- active=false latch=false decision=PENDING_LOW_HOLD
low-3 now=2000 raw=4999 quality=GOOD evaluationKnown=true low=1500 high=- active=false latch=false decision=PENDING_LOW_HOLD
low-4 now=2500 raw=4999 quality=GOOD evaluationKnown=true low=1500 high=- active=false latch=false decision=PENDING_LOW_HOLD
low-active now=3500 raw=4999 quality=GOOD evaluationKnown=true low=1500 high=- active=true latch=true decision=ACTIVE_LOW_HOLD_MET
high-equal-arm-reset now=4000 raw=5300 quality=GOOD evaluationKnown=true low=- high=- active=true latch=true decision=ACTIVE_HIGH_EQUAL
reset-active now=4500 raw=5400 quality=GOOD evaluationKnown=true low=- high=4500 active=true latch=true decision=RESET_REJECTED_ACTIVE
bad now=5000 raw=5400 quality=BAD evaluationKnown=false low=- high=- active=true latch=true decision=UNKNOWN_BAD_QUALITY
high-after-bad now=5500 raw=5400 quality=GOOD evaluationKnown=true low=- high=5500 active=true latch=true decision=PENDING_HIGH_HOLD
sample-gap now=7001 raw=5400 quality=GOOD evaluationKnown=false low=- high=- active=true latch=true decision=UNKNOWN_SAMPLE_GAP
high-restart now=7501 raw=5400 quality=GOOD evaluationKnown=true low=- high=7501 active=true latch=true decision=PENDING_HIGH_HOLD
high-1 now=8001 raw=5400 quality=GOOD evaluationKnown=true low=- high=7501 active=true latch=true decision=PENDING_HIGH_HOLD
high-2 now=8501 raw=5400 quality=GOOD evaluationKnown=true low=- high=7501 active=true latch=true decision=PENDING_HIGH_HOLD
high-3 now=9001 raw=5400 quality=GOOD evaluationKnown=true low=- high=7501 active=true latch=true decision=PENDING_HIGH_HOLD
high-4 now=9501 raw=5400 quality=GOOD evaluationKnown=true low=- high=7501 active=true latch=true decision=PENDING_HIGH_HOLD
high-5 now=10001 raw=5400 quality=GOOD evaluationKnown=true low=- high=7501 active=true latch=true decision=PENDING_HIGH_HOLD
high-clear now=10501 raw=5400 quality=GOOD evaluationKnown=true low=- high=- active=false latch=true decision=INACTIVE_HIGH_HOLD_MET
release-reset now=11001 raw=5400 quality=GOOD evaluationKnown=true low=- high=- active=false latch=true decision=INACTIVE
reset-latch now=11501 raw=5400 quality=GOOD evaluationKnown=true low=- high=- active=false latch=false decision=LATCH_RESET_ACCEPTED
alarm-hysteresis demo: PASS
```

Run `node practice.mjs` to print editable JSON state snapshots. It copies the
fixture first, so changing it does not change demo assertions. Its supplied
practice changes `samples[2].rawMilliBar` at 1000 ms from 5000 to 4999: the
low hold therefore starts at 500 ms and becomes active at `low-4` (2500 ms),
rather than `low-active` (3500 ms). The later Bad and gap still reset the clear
timer, so physical clear remains `high-clear` (10501 ms). Do not infer PLC
timer behavior, actual sensor continuity, or safety performance from this model.
