---
title: PLC 工作參數快照：確認後，下一批才換新版本
description: 用可下載的 Node 逐掃描模型，分開 Edit、Confirmed、JobSnapshot，核對確認、工作接受、完成與中止的版本邊界。
date: 2026-09-17
author: 茂伯
draft: false
category: PLC 程式與控制
---

## 先定義本例的接受與拒絕規則

這是 Node.js 24.19.0 的離線逐掃描教材；每次呼叫是一個模型掃描，沒有連 PLC、HMI、設備或原廠模擬器。它說明工作參數何時固定，不能證明實機的同步、結構複製原子性、保持記憶或任何 PLC 機種的適用性。

本例只有兩個參數：`qty` 是 1 到 1000 的安全整數，`wait_ms` 是 0 到 60000 的安全整數。提交的 `Edit` 必須剛好有這兩欄；少欄、多欄、字串、NaN、無限大、非整數或超界，確認一律拒絕。拒絕不會改 `Confirmed` 或 version。version 從 1 起，最高是 2147483647；到上限後拒絕確認，不做回捲。

`confirm` 只在上升沿提交，按住不會重複確認；失敗後也要先放開，再按一次才重試。`acceptRequest` 是保持到 PLC 回覆的層級請求：IDLE 時上升沿最多建立一份工作，保持為 1 不會重複啟動；要再建立新工作，必須先放開再重新提出請求。RUN 時收到的新請求拒絕且不排隊。

`complete` 與 `abort` 只能二擇一。RUN 時它們會將目前快照留在 `lastJob`，並清除 `JobSnapshot`、回到 IDLE；IDLE 時只是忽略。兩者同掃描為模型輸入錯誤，避免猜測優先順序。IDLE 的任一 terminal 訊號優先於新或等待中的 acceptRequest：terminal 仍顯示 ignored，但工作請求回覆 `terminal_signal_active`、清除等待，必須放開後重新提出。

## 三份資料各自何時改動

| 資料        | 誰在本模型寫入       | 何時供工作使用                 |
| ----------- | -------------------- | ------------------------------ |
| Edit        | 每次掃描輸入         | 尚未生效，可包含未確認或無效值 |
| Confirmed   | 合法 confirm 上升沿  | 等下一次工作接受               |
| JobSnapshot | 接受一份 IDLE 工作時 | RUN 全程只讀這一版             |

工作開始後，Edit 可以繼續改，Confirmed 也可以有新版本；現有 RUN 的 `JobSnapshot` 不變。這是「下一工作才更新」：新版本不會改寫已接受工作的數量或等待時間。

## 下載並執行固定掃描案例

把以下五個檔案放在同一個資料夾，以 Node.js 24.19.0 或更新版執行。不需 npm 套件或網路連線。

- [模型](/examples/parameter-snapshot/parameter-snapshot-model.mjs)
- [固定輸入](/examples/parameter-snapshot/fixtures.mjs)
- [self-test](/examples/parameter-snapshot/self-test.mjs)
- [逐掃描 demo](/examples/parameter-snapshot/demo.mjs)
- [README](/examples/parameter-snapshot/README.md)

```powershell
node self-test.mjs
node demo.mjs
```

`demo.mjs` 固定輸出完整 12 列，最後是 `demo: PASS`。每列的 `snapshot_values=qty/wait_ms` 讓讀者直接核對整份資料，而非只看 version。第 2 掃描確認 `120/700` 且同時提出工作，顯示 `confirm=accepted accept=deferred`；第 3 掃描請求仍保持，才建立 snapshot version 8。

```text
1 IDLE confirmed=7 snapshot=- snapshot_values=- confirm=none accept=none terminal=none
2 IDLE confirmed=8 snapshot=- snapshot_values=- confirm=accepted accept=deferred terminal=none
3 RUN confirmed=8 snapshot=8 snapshot_values=120/700 confirm=none accept=accepted terminal=none
4 RUN confirmed=8 snapshot=8 snapshot_values=120/700 confirm=none accept=none terminal=none
5 RUN confirmed=8 snapshot=8 snapshot_values=120/700 confirm=rejected accept=none terminal=none
6 RUN confirmed=8 snapshot=8 snapshot_values=120/700 confirm=none accept=none terminal=none
7 RUN confirmed=9 snapshot=8 snapshot_values=120/700 confirm=accepted accept=none terminal=none
8 IDLE confirmed=9 snapshot=- snapshot_values=- confirm=none accept=none terminal=completed
9 IDLE confirmed=9 snapshot=- snapshot_values=- confirm=none accept=none terminal=none
10 RUN confirmed=9 snapshot=9 snapshot_values=200/900 confirm=none accept=accepted terminal=none
11 RUN confirmed=9 snapshot=9 snapshot_values=200/900 confirm=none accept=none terminal=none
12 IDLE confirmed=9 snapshot=- snapshot_values=- confirm=none accept=none terminal=aborted
demo: PASS
```

第 5 掃描的 `qty=0` 拒絕後，version 仍是 8。第 7 掃描合法確認成 version 9，但工作仍讀 snapshot version 8；完成後的第 10 掃描才建立 version 9 的新工作。第 11 掃描保持 acceptRequest 為 1，沒有第二次接受。

## 同掃描確認和接受，為何要等一掃描

本例先處理 confirm。若 confirm 上升沿合法且 acceptRequest 也剛上升，模型回覆 `deferred`，要求請求保持到下一掃描；下一掃描才從新的 Confirmed 複製完整 JobSnapshot。這可明確避免工作在同一掃描混入確認前後的欄位。

若同掃描確認被拒絕，這次工作請求也回覆 `confirmation_rejected`，不會偷偷用舊 Confirmed 啟動。若等待確認的 acceptRequest 在下一掃描前放開，回覆 `accept_request_released_before_ack`，不建立工作。這是本例的握手規則；移植時必須用目標 PLC、HMI 與通訊協議實際支援的 request／ack 設計驗證。

## 實機移植前仍要另外驗證

模型只做一個 JavaScript 函式內的狀態轉換。跨 PLC task、HMI 分段傳送、通訊斷線、重啟後的保留值、實際 job 完成證據及安全聯鎖，都沒有在此驗證。若要用在設備，需把完整表單、確認脈衝、request／ack、RUN／complete／abort 與版本上下限對應到實際 CPU、程式與現場驗收紀錄；不可把這個離線 PASS 當成真正 PLC 的原子或同步證明。

## 延伸閱讀

- [PLC 狀態進入時只執行一次：分開初始化與每掃描動作](/articles/plc-state-entry-once)
- [PLC 故障復歸：長按只接受一次的離線練習](/articles/plc-fault-reset-single-acceptance)
