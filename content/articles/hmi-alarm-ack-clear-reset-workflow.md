---
title: HMI 警報確認、消失與工作結案的分離流程
description: 以同一個離線 lifecycle 模型，把 Ack、Clear、Open、InProgress、Resolved 與 Reset 明確拆開。
date: 2026-09-17
author: 茂伯
draft: false
category: HMI 畫面與操作
---

## Ack、Clear、Resolved、Reset 是四件事

HMI 不能將「看過」「條件恢復」「工作結案」混成同一個狀態。共用模型明確定義：

| 動作或欄位 | 本例會改什麼    | 不代表什麼                       |
| ---------- | --------------- | -------------------------------- |
| Ack        | `acked=true`    | 條件已消失或工作完成             |
| Clear      | `active=false`  | 有人已確認                       |
| Resolved   | `work=Resolved` | 來源條件已改寫或設備已 Reset     |
| Reset      | 本例沒有此命令  | 可由 Ack、Clear 或 Resolved 推導 |

工作流是獨立的 `Open -> InProgress -> Resolved` 欄位。它讓 HMI 顯示人員處置證據，沒有設備控制、PLC 命令或真實身分驗證功能。

## 下載與工作流 demo

將以下檔案一起下載到同一資料夾：

- [alarm-lifecycle.mjs](/examples/alarm-lifecycle/alarm-lifecycle.mjs)、[fixtures.mjs](/examples/alarm-lifecycle/fixtures.mjs)、[workflow-demo.mjs](/examples/alarm-lifecycle/workflow-demo.mjs)
- [demo.mjs](/examples/alarm-lifecycle/demo.mjs)、[self-test.mjs](/examples/alarm-lifecycle/self-test.mjs)、[practice.mjs](/examples/alarm-lifecycle/practice.mjs)、[workflow-practice.mjs](/examples/alarm-lifecycle/workflow-practice.mjs)

以 Node.js 24.19+ 執行：

```powershell
node workflow-demo.mjs
node self-test.mjs
node workflow-practice.mjs
```

`workflow-demo.mjs` 的固定序列是 O1 Active、Ack、Operator Start；先由 Supervisor 在仍 Active 時嘗試 Resolve，然後 Clear；再測 Operator Resolve、舊 revision，最後才以目前 revision 的 Supervisor 和 evidence 結案。輸出：

```text
active resolve=workflow_rejected_transition
operator resolve=workflow_rejected_request
stale revision=workflow_revision_conflict
supervisor resolve=workflow_resolved revision=5
workflow demo: PASS
```

所以 Ack 或 Clear 單獨都不會變成 Resolved。只有目標已 Clear、已 Ack、actor 為 `Supervisor` 且 evidence 是非空文字，並且 `expectedRevision` 正確時，才能結案。

## HMI 請求與畫面語意

Start 和 Resolve 都帶 `occurrenceId`、`expectedRevision`、`actor`、`action`；Resolve 另帶 evidence。每次 workflow 狀態改變都增加 revision，讓舊畫面不能蓋掉較新的狀態。畫面遇到版本衝突時應重新讀取，而不是重送舊資料。

可依欄位顯示：

- `active=true, acked=false`：發生中，待確認。
- `active=false, acked=false`：已消失，待確認。
- `work=InProgress`：處置中；不能顯示為已排除。
- `work=Resolved`：本教學條件下 Supervisor 已附證據結案；仍不是 Reset。

`Operator`、`Supervisor` 僅是 fixture 的可信字串。實際 HMI 需由後端驗證角色、保存真實身分與證據；本模型沒有登入、授權或審批。

## 可改練習與邊界

執行 `node workflow-practice.mjs`，預期 decision=workflow_resolved、work=Resolved、revision=5。把 `finalActor = 'Supervisor'` 改成 `'Operator'`，預期 decision=workflow_rejected_request、work=InProgress、revision=4；active=false、acked=true 都保持不變。改成空白 evidence 也應拒絕，不得只靠角色結案。生命週期 demo 位於 [另一篇 occurrence 說明](/articles/alarm-acknowledge-clear-occurrence)，可用來核對 Clear 後未 Ack 保留，以及新 occurrence 不受舊項目操作影響。

模型最多保存 8 個 occurrence、16 個成功 Ack 的重播紀錄與 128 筆 log；超過 occurrence 上限會進入需外部處置的 fault，不會自動繼續吸收來源。log 滿時保留所有既有狀態與 log，並以 `lastDecision=log_capacity_fault` 指示拒絕。兩種容量 fault 都會令 known=false，拒絕後續來源、Ack 與工作流操作；保留值不是即時狀態。時間是非遞減 safe integer 的虛擬時計。

本例只在記憶體中一起更新 state 和 log。它不保證持久化、不可變 audit、OPC UA、併發一致性、來源時間可信度、通知、設備 Reset 或 PLC 行為。需要處理重連造成的未知命令時，可參考 [HMI 重連：舊回覆隔離與未知命令](/articles/hmi-reconnect-stale-callback-unknown-write)；安全 Reset 必須另行設計互鎖、權限與 readback。

[下載說明 README](/examples/alarm-lifecycle/README.md)。
