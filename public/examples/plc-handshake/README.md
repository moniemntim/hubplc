# PLC request-accept-result handshake

This is an offline teaching model for one Sender and one Receiver. It needs [Node.js 22.13.0 or newer](https://nodejs.org/en/download), with no package installation, PLC connection, network service, or hardware.

Download `handshake-model.mjs`, `fixtures.mjs`, and `demo.mjs` into the same folder. From that folder, run:

```powershell
node demo.mjs
```

Every `receiverScan()` call reads one Sender snapshot and returns Receiver signals after that scan. A Sender can only observe an `Accept` or result after that call, so the following fixture row is its next scan. `normalDelayedConsumer` follows this order. `busyNewId` is deliberate fault injection: a correct Sender does not replace a held request with a new ID.

`nowMs` is a non-negative safe integer that cannot move backward. Omitted Sender fields are `req=false`, `requestId=null`, `resultAckId=null`, and `payload=null`; omitted worker fields are `complete=false` and `failCode=null`. Each fixture row is independent input, so a held Req must be written again in every row that holds it.

| Field                                                                      | Owner                           | Time rule                                                                                                                                                                                  |
| -------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `sender.req`, `requestId`, `payload`, `resultAckId`                        | Sender                          | Hold Req until a later scan observes matching Accept; publish Ack only after saving the held result and after Req is observed low                                                          |
| `accept`, `busy`, `done`, `fail`, result fields, `rejectId`/`rejectReason` | Receiver                        | Accept stays until Req is observed low, including RESULT; Busy is false in RESULT; Done or Fail stays until a later matching ResultAck; reject stays until conflicting Req is observed low |
| `worker.complete`, `worker.failCode`                                       | Receiver-internal fixture input | Represents a result sampled during the current Receiver call                                                                                                                               |

The model permits one current request. It clones payload at acceptance. A newly asserted Req while Busy keeps `rejectId` and `rejectReason=BUSY` visible until that conflicting Req is released; it is a retained status, not a reliable one-scan cross-task pulse. The current work and snapshot remain unchanged. Releasing Req rearms the receiver; accepted IDs must strictly increase during one model lifetime.

`Done` and `Fail` are mutually exclusive. Either result remains visible until a later matching `ResultAck`; a wrong acknowledgement leaves it unchanged. A matching Ack while Req is still high is deliberately ignored, so current work cannot clear before the Accept handshake is released. In this synchronous offline model, one later Receiver snapshot can deliver the Ack after Req is low. An asynchronous task or transport needs its own hold/retry/delivery policy so that Ack is actually sampled.

This example's deadline is 200 ms and Busy priority is `timeout > worker failure > worker success`. A success sampled at exactly 200 ms yields `Fail/TIMEOUT`, while Accept remains held if Req is still high. It is deliberately distinct from the site's 300 ms abnormal-scenario matrix.

The fixtures demonstrate a normal delayed consumer, wrong acknowledgement, retained Busy rejection, a held/reused ID, early completion before a slow Sender releases Req, and timeout while Req remains held. The model omits PLC scan scheduling, I/O refresh, communications, persistent memory, hardware, safety functions, and restart/session reconciliation.
