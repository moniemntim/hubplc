---
title: HMI 批次流程畫面如何呈現步驟 等待和失敗原因
description: 用可下載的離線 snapshot 投影，呈現控制器權威的步驟、attempt、品質、等待、失敗與重開後重新讀取。
date: 2026-09-17
author: 茂伯
draft: false
---

批次畫面不能用本地計時器或百分比猜流程已完成。它應讀取控制器或流程服務的**完整權威 snapshot**，把目前步驟、attempt、品質、完成證據、等待／失敗原因與復原要求原樣呈現。畫面不改 step、不建立 Retry、不送 Resume，也不因 HMI 重開就重送命令。

以下是 Node.js 24.19+ 的純離線教材；所有時間、步驟與原因都是合成資料，沒有 PLC、設備、身份驗證、持久化或流程控制器。

## 下載並重播固定 snapshot

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

第三列的 120000 ms 只是來源 snapshot 的取得時間與已報告原因，**不是**這個 renderer 證明了 120 秒控制 timeout。若要檢查單一步驟 timeout 的優先順序、逾時 snapshot 與 reset，請另看 [PLC 步驟等待 timeout 的離線案例](/articles/plc-step-timeout-recovery)。

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
