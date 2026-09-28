---
title: 重試退避與斷路器：固定 jitter 算術、整體期限與單一 probe
description: 下載可離線重播的 Node 模型，驗算固定 jitter 等待、整體 deadline 截斷、五次失敗開路及半開 probe 的 token 與逾時邊界。
date: 2026-09-21
author: 茂伯
draft: false
category: 工業通訊與網路
---

## 這是離線狀態教材，不是 PLC 或網路實測

重試需要同時限制嘗試、等待與整體期限；斷路器需要保留哪一個 probe 還有效。本篇提供固定輸入的 Node.js 模型，所有時間由呼叫者以整數毫秒傳入。它不睡眠、不開 timer、不連 PLC 或網路，也不量測 CPU。每一個狀態改變都由 `advanceBreaker`、`acquirePermit` 或 `completePermit` 的明確呼叫觸發。

AWS 對遠端呼叫的可靠性指引建議限制重試、使用遞增退避與 jitter，並按用途決定 timeout 與停止重試的時機；這是設計背景，不是本篇數值的來源或 PLC 行為保證。[AWS Well-Architected：Control and limit retry calls](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_limit_retries.html) 與 [AWS Builders' Library：Timeouts, retries and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/) 都應配合目標服務契約閱讀。

`simulateRetry` 的所有耗時輸入都假設是**外層已確認可安全重試的讀取失敗**；它沒有寫入語意、UnknownOutcome 或冪等判斷，不能把未知寫入套入。設備可能已完成動作但回覆遺失時，要先有可查詢結果、冪等鍵或人工流程；相關資料效果請看[重送寫入如何用冪等鍵保護同一筆資料庫效果](/articles/idempotency-key-duplicate-write)。需要觀察真實 timeout 與重試反應時，另看[通訊延遲注入如何量測系統的逾時與重試反應](/articles/latency-injection-timeout-retry)。

## 下載後重播固定 jitter 與 deadline

下載同一資料夾的 [模型](/examples/retry-breaker/retry-breaker-model.mjs)、[示範](/examples/retry-breaker/demo.mjs)、[獨立測試](/examples/retry-breaker/self-test.mjs) 和 [說明](/examples/retry-breaker/README.md)。本機以 Node.js 24.19.0 核對；使用此版本或更新版本，沒有 npm 套件或本網站測試相依。

```powershell
node demo.mjs
node --test self-test.mjs
```

模型固定 `base=1000 ms`、倍數 2、`cap=8000 ms`，並帶入五個固定 `U` 值：`0.63, 0.705, 0.05, 0.8375, 0.35`。每一列採 `floor(U × cap)`：

| retry 編號 | cap ms |      U | wait ms |
| ---------: | -----: | -----: | ------: |
|          1 |   1000 |   0.63 |     630 |
|          2 |   2000 |  0.705 |    1410 |
|          3 |   4000 |   0.05 |     200 |
|          4 |   8000 | 0.8375 |    6700 |
|          5 |   8000 |   0.35 |    2800 |

這五個值是便於驗算的固定樣本，沒有隨機產生器，也**不驗證均勻分布**。`attempt` 包含原始呼叫：示範使用六個虛擬失敗呼叫耗時 `100, 200, 300, 400, 500, 600 ms` 與整體 `deadline=13000 ms`。前四次等待完整，第五次呼叫於 10440 ms 結束後，原本 2800 ms 的等待只剩 2560 ms，時間到 13000 ms，因此第六次不開始。

```text
retry attempt,start_ms,call_ms,wait_requested_ms,wait_observed_ms,ended_by
1,0,100,630,630,continue
2,730,200,1410,1410,continue
3,2340,300,200,200,continue
4,2840,400,6700,6700,continue
5,9940,500,2800,2560,DEADLINE_BEFORE_NEXT_ATTEMPT
retry ended_at_ms=13000 attempts_include_original=true
```

整體 deadline 必須同時計入已花費的呼叫與等待，不能只在 retry sleep 前檢查。若虛擬呼叫本身剛好到達 deadline，模型回 `DEADLINE_DURING_CALL`；這表示本次觀察已到期限，不主張遠端工作必然停止。

## 五次失敗、單一 permit 與半開 probe

本教材的 breaker 規格是：同一串**連續**可重試失敗在 20000 ms 窗口內累積到 5 次，就從 `CLOSED` 轉為 `OPEN` 30 秒。成功或不可重試完成會清掉連續失敗計數。模型刻意只允許一個 active permit；普通呼叫和半開 probe 都不能並行取得第二個 permit。

這是純 state 函式，不是跨執行緒鎖。呼叫端必須由單一 owner 串行呼叫，並保存每次回傳的 `state`；兩個 thread 各自從同一份舊 `before` 呼叫 `acquirePermit`，不會構成實際互斥，也不代表本例驗證過並行安全。普通 `CALL` 沒有自身 deadline，外層必須交回成功或失敗；只有 `PROBE` 使用本例的 1000 ms timeout。

示範在 0、100、200、300、400 ms 完成五次可重試失敗，得到 `OPEN` 與 `open_until_ms=30400`。在 1000 ms 取 permit 得 `CIRCUIT_OPEN_REJECTED`。30400 ms 的明確 `acquirePermit` 才進入 `HALF_OPEN`，發出 `probe-6`，其獨立 deadline 為 31400 ms；同一刻第二個要求回 `ACTIVE_PERMIT_REJECTED`。

`advanceBreaker`、`acquirePermit` 與 `completePermit` 都先以傳入的 now 觀察 probe 是否到期，再處理 token；因此 31400 ms 即使傳入 `SUCCESS`，仍得到 `PROBE_TIMEOUT` 並重新 OPEN 到 61400 ms。冷卻從**觀察到 timeout 的 now=31400 ms**開始，不是過期時間自行推進。若完全沒有 completion，後續明確呼叫 `advanceBreaker(state, 31400)` 同樣會讓 probe 逾時並釋放 active permit；31401 ms 才抵達的舊 token 回覆為 `STALE_TOKEN_IGNORED`，不會關閉新的 OPEN 狀態。另一個固定情境在 30450 ms 以相同 probe 成功完成，才回 `PROBE_SUCCESS_CLOSED`。

示範的 breaker stdout 固定為：

```text
breaker after_five_failures=OPEN open_until_ms=30400
breaker open_reject=CIRCUIT_OPEN_REJECTED
breaker probe=PROBE_GRANTED token=probe-6 deadline_ms=31400
breaker second_probe=ACTIVE_PERMIT_REJECTED
breaker equality=PROBE_TIMEOUT phase=OPEN open_until_ms=61400
breaker old_reply=STALE_TOKEN_IGNORED
breaker probe_success=PROBE_SUCCESS_CLOSED phase=CLOSED
```

這個小模型不做速率限制、逐步回放佇列或多設備聚合，也沒有聲稱每秒放行幾件。實際系統應另外定義服務端容量、重試所有權、寫入結果查詢和監控欄位。

## 模型能驗證什麼，不能驗證什麼

`self-test.mjs` 與網站內測試會驗證固定 U 的 cap／wait 算術、attempt 是否含原始呼叫、deadline 截斷、半開的第二 permit 拒絕、deadline 相等時 timeout 優先、沒有 completion 時的顯式逾時觀察、舊 token 忽略、20000 ms 窗口邊界、連敗清除，以及不合法、倒退或溢位時間被拒絕。

它不能驗證真實 jitter 分布、實際設備恢復、網路延遲、PLC 掃描時間、寫入是否已執行，或任何特定服務的 retryable 錯誤分類。把模型中的 5 次、20000 ms、30000 ms、1000 ms 視為明確可測的教材政策；移植前必須按目標服務與風險重新決定。

## 延伸閱讀

- [重送寫入如何用冪等鍵保護同一筆資料庫效果](/articles/idempotency-key-duplicate-write)
- [通訊延遲注入如何量測系統的逾時與重試反應](/articles/latency-injection-timeout-retry)
- [通訊佇列積壓：用七個時間戳分開排隊、接收與解析](/articles/communication-queue-backlog-diagnosis)
