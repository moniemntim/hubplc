---
title: HMI 報表篩選與警報歷史查詢
description: 以含時區半開區間[22:00,06:00)查詢昨夜未確認警報，分開歷史事件狀態與目前狀態，設計設備/優先級篩選、空結果、邊界與匯出條件。
date: 2026-09-17
author: 茂伯
draft: false
---

## 先把問題拆成兩張表

交班「這一班發生哪些 Active？」和「06:00 截止時哪些已發生且尚未確認？」不是同一個篩選。前者只選轉移時間落在窗口內的 `ACTIVE`；後者要有窗口開始前的完整前情，才能重建截止前狀態。

以下可下載的 Node 24.19.0 離線教材，使用固定的 `+08:00` 夜班：

```plaintext
[2026-09-16T22:00:00+08:00, 2026-09-17T06:00:00+08:00)
=[2026-09-16T14:00:00.000Z, 2026-09-16T22:00:00.000Z)
```

`start` 包含，`end` 排除。模型不讀資料庫、HMI 或 PLC，也不假定任何產品 API；它只投影已整理且固定的 occurrence snapshots。

## 下載後重現固定快照

在同一個空資料夾下載 [model.mjs](/examples/alarm-report/model.mjs)、[fixtures.mjs](/examples/alarm-report/fixtures.mjs)、[demo.mjs](/examples/alarm-report/demo.mjs)、[self-test.mjs](/examples/alarm-report/self-test.mjs) 、[README.md](/examples/alarm-report/README.md) 和 [practice.mjs](/examples/alarm-report/practice.mjs)，然後執行：

```powershell
node .\demo.mjs
node .\self-test.mjs
node .\practice.mjs
```

demo 印出的 JSON 有固定 `schema`、完整 `filters`、`coverage`、三個 row counts 與排序好的資料列：

| 結果                | 固定資料 | 原因                                                                                                                                                              |
| ------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `activeTransitions` | P01、P02 | `ACTIVE` 分別在 22:15、05:59，落在半開窗口內。                                                                                                                    |
| `unackedAtCutoff`   | P03、P02 | 這是**已知歷史**中截至 06:00 曾 Active 且尚未 Ack 的列；P03 在 21:50 已 Active，P02 的 ACK 恰在 06:00，不屬於截止前。先 Clear 但尚未 Ack 的 occurrence 也會列出。 |
| `unknownHistory`    | P05      | fixture 明示歷史缺失，因此是 `UNKNOWN_HISTORY`。                                                                                                                  |

P04 的 ACK 是 `05:59:59.999`，所以已在 cutoff 前確認，不列入 unacked。P02 的 ACK 是 `06:00:00.000`，因此仍列入。兩者是同一個半開邊界規則的反例對照。

demo 最後也印出可直接比對的固定摘要：`snapshot active=P01,P02 unacked=P03,P02 unknown=P05 coverageCompleteForFilter=false`。

## 資料契約與判讀

每筆 occurrence 有穩定 `occurrenceId`、`sourceId`、`priority` 與 `history`。`ACTIVE` 是本 occurrence 開始生效的轉移，`ACK` 是同一 occurrence 的確認轉移，`CLEAR` 是同一 occurrence 的解除轉移；截止狀態只讀這一筆 occurrence 的時間序列，不會把另一個來源或 occurrence 的 ACK 混入。每個已知 occurrence 最多一個 `ACTIVE`、`ACK`、`CLEAR`，每個轉移都有穩定 `transitionId`、canonical UTC `atUtc` 和 `order`。結果的 `ACTIVE_UNACKED` 表示截止仍 Active 且未確認，`CLEARED_UNACKED` 表示截止前已 Clear 但仍未確認。這是教材為了讓判讀與邊界可驗證而縮小的格式，並不處理任意警報生命週期或資料庫查詢。

`coverage.complete: false` 先說明整份結果的歷史 coverage 不完整，因此 `unackedAtCutoff` 不是完整的未確認名單；它是已知完整前情的結果。`coverage.completeForFilter` 進一步說明目前 source/priority filter 是否排除了所有未知 occurrence。`coverage.knownPrehistoryComplete: true` 只保證 `history: "COMPLETE"` 的 occurrence 前情已齊全。P03 證明只查窗口內 Active 會漏掉 carry-in；P05 則不能因轉移清單為空而被當作已確認或未確認。缺保留資料、缺開始前狀態或缺 Ack 資料時，應輸出 `UNKNOWN_HISTORY`，而不是推論。

filter 只有 `startUtc`、`endUtc`、`sourceIds`、`priorities`；時間必須是 canonical UTC ISO，`startUtc < endUtc`，設備與優先級可為 `null` 或最多四個不重複值。`self-test.mjs` 同時驗證 P02/P04 邊界、P02 的設備與 Critical 篩選、缺歷史與格式拒絕。

## 修改練習與限制

在 `practice.mjs` 頂端把 `ackUtc` 設為 `2026-09-16T22:00:00.000Z` 後執行，預期 `unacked=P03,P02`；改成 `2026-09-16T21:59:59.999Z` 後重跑，預期只剩 P03，而 P05 仍是 `UNKNOWN_HISTORY`。這改變的是教材快照，不是對歷史服務或現場設備的寫入。

本例不量測查詢延遲、資料庫保留、時鐘精度、PLC 狀態或平台權限。正式報表還要保存資料來源、資料版本、實際時間精度與 coverage，並依使用中的產品資料模型取得完整前情。

## 延伸閱讀

- [HMI 班次交接頁應該留下哪些現場資訊](/articles/hmi-shift-handover-information)
- [警報事件時間線如何保留收件與註記](/articles/hmi-event-timeline-alarm-operation-note)
