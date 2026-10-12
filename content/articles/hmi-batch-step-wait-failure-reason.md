---
title: HMI 批次流程畫面如何呈現步驟 等待和失敗原因
description: 頁面內判讀權威 snapshot 的步驟、品質、等待、失敗與完成證據，再以可下載的離線模型核對重開後重新讀取。
date: 2026-09-17
author: 茂伯
draft: false
---

批次畫面不能用本地計時器或百分比猜流程已完成。它應讀取控制器或流程服務的**完整權威 snapshot**，把目前步驟、attempt、品質、完成證據、等待／失敗原因與復原要求原樣呈現。畫面不改 step、不建立 Retry、不送 Resume，也不因 HMI 重開就重送命令。

以下是 Node.js 24.19+ 的純離線教材；所有時間、步驟與原因都是合成資料，沒有 PLC、設備、身份驗證、持久化或流程控制器。

## 頁面內判讀：等待、失敗和完成分別要顯示什麼？

這是**離線教材**，不是對真實 HMI、PLC、流程控制器或量測鏈的驗證。以下固定 snapshot 足以完成一次畫面判讀，不必下載程式。每個輸入欄位都必須由同一筆權威 snapshot 提供，不能由 HMI 本地計時或舊值補猜：

| 欄位 | 本例輸入 | 來源與量測點 | 頁面應如何使用 |
| --- | --- | --- | --- |
| 批次／配方／步驟／attempt | `CIP-17`、`CIP-R7`、`Drain`、attempt 1 或 2 | 固定控制器 snapshot 的工作上下文；不是 HMI 自行遞增 | 顯示目前是哪一次工作 |
| 液位與品質 | level `35%`、target `20%`、`GOOD`；或 `BAD`／`UNKNOWN` | `waiting-level`、品質等待案例的來源摘要與 quality 欄位 | 決定能否把等待原因顯示為製程條件 |
| 完成證據 | `PROVEN`、`transitionAtMs=134900`、level ≤20% 與 valve feedback GOOD | `complete-with-source-evidence` 的來源 completion 欄位 | 只有全部存在時才能顯示 COMPLETE |
| 失敗／復原 | `PROCESS_TIMEOUT`、`recoveryRequired=true` | `failed-timeout-as-reported` 的來源欄位 | 顯示 FAILED 與需要復原，不能自動 Retry／Resume |
| 新鮮度 | `nowMs` 與 `acquiredAtMs` | 同一固定虛擬 clock；不是控制器實測時間 | 只判斷畫面讀取是否過期 |

操作步驟：

1. 讀取 `waiting-level`：來源說明 level 35% 仍高於 target 20%，品質為 Good。因此顯示 `WAITING`、完成 `NOT_PROVEN`，等待原因是 `LEVEL_ABOVE_TARGET`。
2. 將品質改看 `waiting-quality-bad` 或 `waiting-quality-unknown`：即使頁面保有先前數字，也只能顯示 `WAITING` 與 `DATA_QUALITY_UNAVAILABLE`，不可把舊值當完成。
3. 讀取 `failed-timeout-as-reported`：來源已明示 `PROCESS_TIMEOUT`，結果是 `FAILED`、完成仍 `NOT_PROVEN`、`RECOVERY_REQUIRED`。該筆 `acquiredAtMs=120000 ms` 是合成快照的讀取時刻，不是等待時長；本頁也沒有量測流程逾時。
4. 讀取 `complete-with-source-evidence`：只有 state=COMPLETE、quality=GOOD、completion=PROVEN、證據與 transition 時間都齊全時，才顯示 `COMPLETE`。

完整結果是：等待、資料品質不良、來源已報告失敗及有完成證據四種情況不能用同一個「完成」文字處理。新鮮度也必須分開：`nowMs - acquiredAtMs >= 5000`（等號包含）時顯示 `SOURCE_STALE` 與 `Unknown`，這只表示讀取過期，不代表流程已 timeout。

常見錯誤是以畫面百分比或本地計時器推論完成、把 Bad／Unknown 當作舊 Good、由 120000 ms 推論控制器的 timeout 行為，或在 HMI 重開時自行加 attempt。下一步應以實際系統的 snapshot 介面、來源權威性、保留歷史與復原程序做驗證；本頁的固定資料不能替代它們。

## 延伸：下載並重播固定 snapshot

下載同一資料夾中的 [model.mjs](/examples/batch-step-view/model.mjs)、[fixtures.mjs](/examples/batch-step-view/fixtures.mjs)、[demo.mjs](/examples/batch-step-view/demo.mjs)、[self-test.mjs](/examples/batch-step-view/self-test.mjs) 、[README.md](/examples/batch-step-view/README.md) 與 [practice.mjs](/examples/batch-step-view/practice.mjs)。在該資料夾執行：

```powershell
node demo.mjs
node self-test.mjs
node practice.mjs
```

`demo.mjs` 會輸出七列 JSON，最後一行是 `demo: PASS read-only authoritative snapshot projection`。每列的 `view` 是 HMI 應顯示的投影，沒有控制副作用。

| 固定輸入 case                      | 權威資料重點                                                | 預期 view                                                       |
| ---------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------- |
| `waiting-level`                    | `Drain`、attempt 1、Good、`LEVEL_ABOVE_TARGET`              | `WAITING`、完成 `NOT_PROVEN`；來源摘要明列液位 35% 高於目標 20% |
| `waiting-quality-bad`              | attempt 1、Bad、`DATA_QUALITY_UNAVAILABLE`                  | 保持 `WAITING`，不把舊值當完成                                  |
| `waiting-quality-unknown`          | attempt 1、Unknown、`DATA_QUALITY_UNAVAILABLE`              | 保持 `WAITING`，不把 Unknown 當 Good                            |
| `failed-timeout-as-reported`       | 來源已給 `PROCESS_TIMEOUT`、120000 ms                       | `FAILED`、完成仍 `NOT_PROVEN`、`RECOVERY=REQUIRED`              |
| `controller-restart-recovery-read` | quality `UNKNOWN`、`CONTROLLER_RESTART`、新 `sourceEpoch=8` | `RECOVERY_REQUIRED`，不可假定可 Resume                          |
| `hmi-reopen-reads-new-attempt`     | epoch 8 的新 revision、attempt 2                            | 新讀取的 `WAITING`；不是頁面自己把 attempt 加一                 |
| `complete-with-source-evidence`    | Good、`PROVEN`、evidence、`transitionAtMs=134900`           | `COMPLETE`，畫面可顯示來源的完成條件與 transition 時間          |

失敗列的 120000 ms 是來源 snapshot 的取得時間，`PROCESS_TIMEOUT` 是來源已報告的原因；**不是**這個 renderer 證明了 120 秒控制 timeout。若要檢查單一步驟 timeout 的優先順序、逾時 snapshot 與 reset，請另看 [PLC 步驟等待 timeout 的離線案例](/articles/plc-step-timeout-recovery)。

## snapshot 契約與畫面欄位

每個 snapshot 必須有相同的批次、配方與步驟上下文：`batchId`、`recipeId`、`recipeRevision`、`stepId`、`attempt`、`sourceEpoch`、`snapshotRevision`、`acquiredAtMs`、`state`、`quality`、`completion`、`waitReason`、`failureReason`、`nextCondition`、`recoveryRequired`。範例只接受 exact plain object、有限長字串和正整數 revision／attempt；遺漏、額外欄位、控制字元、未知 enum 都變成 `SOURCE_REJECTED`，畫面顯示 `Unknown` 而非沿用上一筆成功。

| HMI 欄位          | 必須來自哪個 snapshot 欄位                                 | 不可由頁面推論的事             |
| ----------------- | ---------------------------------------------------------- | ------------------------------ |
| Current           | `stepId`、`state`、`attempt`                               | 目前步驟是否已跳轉             |
| Completed         | `completion.status`、`conditionEvidence`、`transitionAtMs` | 從等待時間或數值自行判定完成   |
| Wait reason       | `waitReason`、`quality`、`nextCondition`                   | 把所有 Waiting 寫成 Busy       |
| Failure／recovery | `failureReason`、`recoveryRequired`                        | timeout 後自動 Retry 或 Resume |
| 版本與新鮮度      | `sourceEpoch`、`snapshotRevision`、`acquiredAtMs`          | 用舊畫面當作重開後狀態         |

Good 品質的 `WAITING` 只能使用製程／閥回饋等待原因；Bad 或 Unknown 品質只能使用 `DATA_QUALITY_UNAVAILABLE`，避免畫面把資料問題誤寫成液位或閥已確認。只有來源明示 `state=COMPLETE`、`quality=GOOD`、`completion.status=PROVEN`，且 evidence 與 transition timestamp 都齊全、時間不晚於 snapshot，範例才顯示完成。`WAITING` 搭配 `PROVEN`、`FAILED` 卻沒有 failure reason、品質和等待原因矛盾、或未知 state 都被拒絕；它們不會變成成功。來源可以明示 `quality=UNKNOWN`，但它同樣不代表成功。

## 新鮮度與 HMI 重開

`nowMs` 與 snapshot 的 `acquiredAtMs` 使用同一個非負 safe-integer 虛擬 clock。`nowMs < acquiredAtMs` 是 clock 矛盾；本例 freshness window 是 5000 ms，`nowMs - acquiredAtMs >= 5000`（等號包含）就輸出 `SOURCE_STALE` 與 `Unknown`。這個門檻只避免畫面把過期讀取當成目前狀態，不是流程 timeout、也沒有讓 renderer 背景計時。

HMI 重開時先丟棄本地 view，再重新讀權威 snapshot。控制器重啟的固定列才由 `sourceEpoch=7` 變成 `sourceEpoch=8`；HMI 重開列仍讀 epoch 8 的新 revision 與 attempt 2，以確認畫面不會自己改 epoch 或 attempt。範例沒有任何「重開即命令重送」路徑。控制器是否能在重啟後恢復批次，仍要由保持資料、設備位置、互鎖與現場程序決定；沒有一致的 snapshot 時顯示 `RECOVERY_REQUIRED`。

## 可照做的練習

開啟 `practice.mjs`，將現有的 `attempt: 2` 改成 `attempt: 0`，再執行：

```powershell
node practice.mjs
```

預期輸出 `code: "SOURCE_REJECTED"`、`view.status: "UNKNOWN"`、`completion: "NOT_PROVEN"`。它證明壞 snapshot 不會被補成完成，也不會改動固定 `demo.mjs`。接著改回 `attempt: 2`，輸出會再次顯示 `WAITING` 與 `VALVE_FEEDBACK_PENDING`。

本教材只示範顯示投影。現場應把 snapshot 介面、來源權威性、授權、命令冪等、保留歷史、流程 timeout 與復原程序寫入設備／流程規格，再以實機測試驗證。
