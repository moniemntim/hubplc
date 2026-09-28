---
title: 警報確認與警報消失怎麼分：以 occurrence 保留生命週期
description: 用可執行的離線模型分開 Active、Acked、Clear 與 occurrence，並以版本和重播鍵處理確認請求。
date: 2026-09-21
author: 茂伯
draft: false
category: HMI 畫面與操作
---

## 先核對本例的效果範圍

Ack 是「有人確認收到」，Clear 是「來源條件目前不成立」。兩者不能互相代替，也不會發出設備 Reset。本頁提供的是 Node.js 24.19+ 的單行程記憶體模型；它以固定虛擬時間和測試資料重現狀態，不連 PLC、OPC UA、帳號系統或資料庫。

一筆 occurrence 有兩個獨立欄位：

| Active | Acked | 意義                   |
| ------ | ----- | ---------------------- |
| true   | false | 條件仍在，尚未有人確認 |
| true   | true  | 條件仍在，但已確認收到 |
| false  | false | 條件消失，仍待確認     |
| false  | true  | 條件消失，也已確認     |

來源由 `false -> true` 時才建立新 occurrence。Ack 只改 `acked`；Clear 只改 `active`。因此 Clear 時尚未 Ack 的項目必須留下，不能因畫面不再閃爍就消失。

## 下載與固定生命週期輸出

下載以下所有檔案，存進同一資料夾：

- [alarm-lifecycle.mjs](/examples/alarm-lifecycle/alarm-lifecycle.mjs)、[fixtures.mjs](/examples/alarm-lifecycle/fixtures.mjs)、[demo.mjs](/examples/alarm-lifecycle/demo.mjs)
- [workflow-demo.mjs](/examples/alarm-lifecycle/workflow-demo.mjs)、[self-test.mjs](/examples/alarm-lifecycle/self-test.mjs)、[practice.mjs](/examples/alarm-lifecycle/practice.mjs)

執行 `node demo.mjs`。固定輸入依序做 O1 Active、Ack、Clear；O2 Active、Clear（未 Ack）；O3 Active，最後再 Ack 舊 O2：

```text
O1 active=true acked=false revision=1
O1 active=true acked=true revision=2
O1 active=false acked=true revision=3
O2 active=false acked=false revision=2
O3 active=true acked=false revision=1
old=O2 acked=true O3 acked=false
lifecycle demo: PASS
```

這同時核對四種 Active/Acked 狀態，以及舊 O2 的確認沒有套到新 O3。它不證明斷電後可恢復，也不證明實機警報條件已清除。

執行 `node self-test.mjs` 可重跑兩個固定 demo 的斷言。人工處理流程另見[工作結案案例](/articles/hmi-alarm-ack-clear-reset-workflow)。

## occurrence、revision 與 Ack 重播

模型用 `O1`、`O2` 這類簡化 occurrence ID。每次 Clear 後的新 Active 都建立新 ID，不能把舊列重新打開。

Ack 的純資料請求有五個固定欄位：

```js
{ occurrenceId: 'O1', expectedRevision: 1, requestId: 'R1', actor: 'Operator', comment: 'seen' }
```

它拒絕未知欄位、非正 safe-integer revision、非 ASCII 的 requestId、空白或控制字元 comment。成功 Ack 保存 `ackActor`、`ackAt`、`comment`，並加 revision。相同 requestId 與完全相同固定 JSON payload 回覆 `ack_replay`，不再加 revision；相同 ID 但不同內容是 `ack_request_conflict`。版本過期回覆 `ack_revision_conflict`，資料不會覆寫。只有成功 Ack 才占用重播鍵。

`Operator` 與 `Supervisor` 是可信 fixture 字串，不是認證或權限系統。移植時必須由實際服務驗證身分、角色及請求來源。

## 有界狀態與練習

本例最多 8 個 occurrence、16 個成功 Ack 重播紀錄及 128 筆 log；測試可把上限調低但不能提高。occurrence 滿時記錄 `occurrence_capacity` fault，來源接收停止且不會自動恢復，必須由外部系統處置。log 滿時不再變更 occurrence、ledger 或 log，只以 `lastDecision=log_capacity_fault` 表示拒絕。兩種容量 fault 都會令 `known=false` 並拒絕後續來源、Ack 與工作流操作；保留的旗標不能再當即時狀態。每筆 log 包含 seq、time、occurrenceId、action、actor；time 是非遞減 safe integer。

執行 `node practice.mjs`。第一個請求用 P1／seen，第二個沿用 P1 但 comment=different，預期 decision=ack_request_conflict、revision=2、ackAt=2、comment=seen、active=true。把 `secondComment = 'different'` 改成 `'seen'` 再跑，decision 改成 ack_replay，其餘欄位仍相同。拒絕與重播會新增 log 並推進模型時間，但不修改該 occurrence 的確認內容。

本模型只在同一記憶體操作中一起更新 state 和 log。它沒有持久化、不可變稽核、併發交易、OPC UA、真實登入、設備 Reset、PLC 通訊、通知、去抖或來源品質判定；那些能力需另依平台與控制系統設計及驗證。

[下載說明 README](/examples/alarm-lifecycle/README.md)。
