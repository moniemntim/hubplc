---
title: PLC 異常情境矩陣 以 RequestId 重現逾時 取消與晚到回饋
description: 用可離線執行的 Node 模型，固定驗證 WAIT、RUN、DONE、ERROR、CANCELLED 的 RequestId、Ack 與 300 ms 邊界。
date: 2026-09-17
author: 茂伯
draft: false
---

## 先固定這個離線模型的契約

這是純 JavaScript 的教學模型，不連 PLC、I/O、通訊或安全回路。它刻意只處理一件進行中的工作，用 `WAIT`、`RUN`、`DONE`、`ERROR`、`CANCELLED` 五種狀態驗證異常事件；它不是另一篇「三步驟順序控制」的實作，也不宣稱任何廠牌或硬體行為。

| 狀態 | 保留內容 | 能離開的事件 |
| --- | --- | --- |
| `WAIT` | 無現行工作 | 新的 Request 上升緣且 ID 未重用 → `RUN` |
| `RUN` | `CurrentRequestId`、300 ms deadline | Cancel → `CANCELLED`；到時 → `ERROR`；正確 Feedback → `DONE` |
| `DONE` | RequestId 與結果快照 | 相同 `AckId` → 清理後 `WAIT` |
| `ERROR` | RequestId 與 `TIMEOUT` | 明確 Reset → 清理後 `WAIT` |
| `CANCELLED` | RequestId 與 `CANCEL` | 明確 Reset → 清理後 `WAIT` |

`DONE` 不是可立刻開始下一筆的訊號。它保留結果快照直到**之後的掃描**收到相同 `AckId`。`ERROR` 與 `CANCELLED` 不接受 Ack 來清理，只有 Reset 可以回 `WAIT`。這樣終態不會因下一筆輸入覆蓋前一筆的證據。

模型的輸入是取樣後的一個掃描快照：

| 欄位 | 意義 |
| --- | --- |
| `nowMs` | 單調、不倒退的整數毫秒時間 |
| `requestLevel`、`requestId` | Request 是**電平**，模型只把 `false → true` 視為一次明確 Request 事件 |
| `feedbackId`、`ackId` | 本掃描到達的一個回饋或確認；`null` 代表沒有事件 |
| `cancel`、`reset` | 本掃描可觀察到的命令 |

省略的布林欄位預設為 false，省略的 ID 預設為 null；要表示保持高位，每筆快照都須明寫 requestLevel=true 與 requestId。Cancel 只在 RUN 有效，Reset 只在 ERROR／CANCELLED 有效；它們不是 WAIT 的啟動互鎖。

因此 Request 持續為 `true` 不會反覆送件；即使在 `ERROR` 或 `CANCELLED` 時 Reset 回到 `WAIT`，仍保持為 `true` 的 Request 也不會被當成新事件。要再送一件，先釋放 Request，再以新的 ID 產生上升緣。模型不把「高電平」當作佇列，也不把 Busy 拒收的 Request 留待日後執行。

已**接受**的 ID 必須在同一模型生命週期內嚴格遞增，Reset 也不會清掉 `lastAcceptedRequestId`。這是刻意簡化的永不重用政策：舊 `FeedbackId=17` 絕不會在之後配到新的 Request 17。重啟、跨通道或有限序號回捲不在這個模型範圍；實際協議要保留世代／連線範圍等可比對欄位，不能重設計數器後假設舊回覆已消失。

## 同掃描優先順序和 300 ms 邊界

在掃描開始時已是 `RUN`，模型固定依序處理 `Cancel > Timeout > Feedback`。`elapsed >= 300` 就是到時，故 299 ms 的正確回饋會 `DONE`，300 ms 的同掃描正確回饋會 `ERROR/TIMEOUT`，該回饋另記為 `LATE_FEEDBACK`。Cancel 與到時、回饋同掃描時固定為 `CANCELLED/CANCEL`，回饋也只留下 `LATE_FEEDBACK` 診斷。

錯誤 ID 和晚到 ID 的意義不同：`RUN` 內不相符的回饋是 `WRONG_FEEDBACK`，工作仍繼續等待；已經進入任一終態後收到的回饋是 `LATE_FEEDBACK`，不會改寫終態。`WAIT` 收到的回饋是 `ORPHAN_FEEDBACK`。本掃描才由 `WAIT` 接受的 Request 不會接受同掃描 Feedback；這避免將尚未建立的工作和一個同掃描資料誤配。

| 同掃描起始狀態與輸入 | 固定結果 |
| --- | --- |
| `RUN`，Cancel + 到時 + 正確 Feedback | `CANCELLED`，記錄 `LATE_FEEDBACK` |
| `RUN`，到時 + 正確 Feedback | `ERROR/TIMEOUT`，記錄 `LATE_FEEDBACK` |
| `RUN`，未到時 + 錯誤 Feedback | 保持 `RUN`，記錄 `WRONG_FEEDBACK` |
| `DONE`，錯誤 Ack | 保持 `DONE`，記錄 `BAD_ACK` |
| 任一非 `WAIT`，Request 上升緣 | 拒收新請求、不取代原工作；其他事件仍按上述規則處理 |

## 下載與執行四條獨立時間線

範例只需要 [Node.js 22.13.0 或更新版本](https://nodejs.org/en/download)；沒有套件安裝、網路服務或設備下載。取得同目錄的 [模型](/examples/plc-abnormal-matrix/abnormal-matrix-model.mjs)、[時間線與邊界 fixture](/examples/plc-abnormal-matrix/fixtures.mjs)、[輸出程式](/examples/plc-abnormal-matrix/demo.mjs) 和 [README](/examples/plc-abnormal-matrix/README.md) 後，在下載檔案所在的資料夾執行：

```powershell
node demo.mjs
```

每個 fixture 都從新的 `initialMatrix()` 開始，沒有共用狀態或重用 ID 的捷徑。

| fixture | 時間線 | 要核對的證據 |
| --- | --- | --- |
| `normal` | 17 在 0 ms 接受、120 ms 回饋、180 ms Ack | `WAIT → RUN → DONE → WAIT`，結果與 Ack 都是 17 |
| `timeout` | 17 在 0 ms 接受，300 ms 沒有回饋 | `ERROR/TIMEOUT`；301 ms 的 17 是 `LATE_FEEDBACK` |
| `busyReject` | 17 執行時，100 ms 送 18，150 ms 回饋 17 | 18 是 `BUSY_REJECT`，17 仍可完成 |
| `cancel` | 17 在 120 ms Cancel，350 ms 才回饋 | `CANCELLED/CANCEL`；晚到回饋不改狀態，Reset 才清理 |

demo 最後另印出 feedback-at-299、feedback-at-300、feedback-at-301 與 cancel-timeout-feedback 四段，各自終態應為 DONE、ERROR、ERROR、CANCELLED。本站測試另覆蓋 299、300、301 ms 和 Cancel/Timeout/Feedback 同掃描，並檢查錯誤回饋、錯誤 Ack、Request 持續為高及已接受 ID 不可重用。輸出中的 `scanEvents` 是該掃描的診斷，而非新的狀態；要保存完整證據時，像 demo 一樣逐列收集。

## 現場轉用前仍要補的事

這個模型只有明確的單一掃描輸入和整數時間，沒有任務排程、I/O 刷新、通訊重送、斷電保持或安全功能。實際工程要先定義時間來源、Request 上升緣在哪個任務產生、ID 的重啟世代，以及回饋是否能攜帶足以比對的欄位；再在目標工程以實際週期與失聯情境補測。不要把 `BUSY_REJECT` 解讀成排隊，也不要把模型測試通過當成設備或安全驗收。

## 延伸閱讀

- [請求 接受 完成與失敗 如何設計 PLC 模組間握手](/articles/plc-request-accept-result-handshake)
- [序號重用遇到舊回覆如何安全丟棄](/articles/sequence-reuse-late-response)
- [流程卡在某一步 怎麼設計等待上限與故障復歸](/articles/plc-step-timeout-recovery)
