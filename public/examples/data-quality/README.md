# Data-quality watchdog teaching model

Node.js 24.19.0. Offline pure JavaScript, with a virtual clock supplied by each
call. It has no process monitor, network, OPC UA stack, HMI, PLC, persistence,
or device write operation.

Save `model.mjs`, `demo.mjs`, `self-test.mjs`, and this README in one folder.
Run `node self-test.mjs` and then `node demo.mjs`. No package installation is
required.

`tick(nowMs)` is an external monitor observation. The model has no background
timer: if nothing calls `tick`, its state cannot discover that a service stopped.
Every event with `nowMs` checks a heartbeat age of 600 ms first, and equality
expires (`age >= 600`). Once expired, heartbeat or data events cannot restore
GOOD; `restart()` is required. A graceful stop event received before that
deadline becomes `STOPPED` plus `UNCERTAIN`; a missed heartbeat becomes
`WATCHDOG_EXPIRED` plus `BAD`. Both retain `value` and `lastGoodValue`; the
model never substitutes zero.

`restart()` increments the local epoch and leaves the monitor
`CONNECTED_WAITING_DATA` with `BAD` quality. A current connection is not a
fresh measurement. Only `receiveGood()` with the current epoch and valid fresh
data can return `RUNNING`/`GOOD`; old-epoch input is rejected.

The monitor clock, receive clock, and source clock are identifiers. Receive age
is `nowMs - receivedAtMs` only when receive and monitor clock IDs match.
Source freshness is the transport age at receipt, `receivedAtMs - sourceAtMs`,
only when source and receive clock IDs match. Total source age is
`nowMs - sourceAtMs`; it changes on every tick or heartbeat and must stay below
2000 ms along with receive age. Equality is stale. Same-epoch source timestamps
must strictly increase, so a delayed or identical sample cannot refresh age.
`tick()` also updates displayed ages after STOPPED while retaining its graceful
stop reason. The `GOOD`/`UNCERTAIN`/`BAD` names and reasons are this model's own
enum, not OPC UA `StatusCode` values or a complete OPC UA implementation.

`ordinaryAutomaticUse()` is only a teaching gate: it requires RUNNING, GOOD,
and both receive age and total source age below 2000 ms. It is not a safety function. Lost command replies,
real retries, authentication, hardware applied-state readback, and recovery
workflows are intentionally outside this example.
