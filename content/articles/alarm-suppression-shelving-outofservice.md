---
title: 警報抑制怎麼管：TimedShelve 與來源狀態分開
description: 以可執行的離線 TimedShelve 模型分開來源 active/quality/freshness 與通知擱置，處理期限、重播與重啟未知狀態。
date: 2026-09-21
author: 茂伯
draft: false
category: HMI 畫面與操作
---

## 先核對本例的效果範圍

本篇只實作自訂的 `TimedShelve`：暫時把警報通知設為不可見，絕不把來源 `active` 改成 false，也不做 Ack、設備控制或完整 OPC UA。來源快照由 `active`、`acked`、`quality`、`sourceAt` 構成；freshness 由目前虛擬時間和 `sourceAt` 推導。它們與 `shelved` 分開。

| 名稱               | 本例的意思                      | 本例是否實作 |
| ------------------ | ------------------------------- | ------------ |
| TimedShelve        | Operator 暫時隱藏通知，到期重現 | 是           |
| suppressedByDesign | 設計狀態下的系統抑制            | 否           |
| outOfService       | 維護或來源離線語意              | 否           |
| disable            | 停用警報來源                    | 否           |

這些名稱在不同平台可能有不同契約；本例不把它們假裝成同一個旗標。

## 下載、時間表與輸出

下載同資料夾的 [alarm-shelving.mjs](/examples/alarm-shelving/alarm-shelving.mjs)、[fixtures.mjs](/examples/alarm-shelving/fixtures.mjs)、[demo.mjs](/examples/alarm-shelving/demo.mjs)、[policy-demo.mjs](/examples/alarm-shelving/policy-demo.mjs)、[self-test.mjs](/examples/alarm-shelving/self-test.mjs)、[practice.mjs](/examples/alarm-shelving/practice.mjs)，在 Node.js 24.19+ 執行：

```powershell
node demo.mjs
node policy-demo.mjs
node self-test.mjs
node practice.mjs
```

固定 demo 的關鍵列：

```text
t=0 active=true shelved=false alarmVisible=true qualityWarning=false
t=0 active=true shelved=true alarmVisible=false qualityWarning=false
t=10 active=true shelved=false alarmVisible=true qualityWarning=false
t=12 active=false shelved=false alarmVisible=false qualityWarning=false
demo: PASS
```

t=10 是 `advance(10)`。模型在每個操作一開始都先檢查 `now >= expiresAt`，等號即到期，因此不必等下一筆 source sample。沒有呼叫 `advance` 或其他操作，不能把「尚未處理」當成已到期的證據。Clear sample 只更新來源 active；它不會因到期而製造 Active。

## 請求、重播與通知邊界

TimedShelve 請求是嚴格的 plain object：

```js
{ epoch: 1, requestId: 'R1', actor: 'Operator', owner: 'OP17', reason: 'noisy during check', durationMs: 10 }
```

actor 只接受可信 fixture `Operator`，不是實際登入。欄位不可多或少；新操作的 epoch 必須等於目前 epoch，requestId 拒絕尾端換行，owner/reason 不得為空白或控制字元，duration 為 1..30000ms。time 必須是非遞減 safe integer，且先檢查加法不溢位。

成功請求保存固定 JSON payload。相同 requestId 和完全相同內容回放 `shelve_replay`，不延長原 expiry；相同 ID 改內容是衝突。模型不提供直接 renew：先 `unshelve`，再以新 requestId 建立新 shelf。

本例 `now - sourceAt <= 5000ms` 視為 fresh，5001ms 起為 stale；這是教材設定。無論是否 shelved，Bad quality 或 stale source 都會令 `qualityWarningVisible=true`。Bad sample 只更新 quality 與它的 sourceAt，保留最後一筆 Good sample 的 active/acked，不能把壞資料中的 `active=false` 當成 Clear。重送或較舊 sourceAt 被拒絕，不會把 freshness 重新算新。這表示通知擱置不可以藏掉資料品質與新鮮度問題。`acked` 僅為來源快照，本例沒有 Ack API。

## 有界與重啟策略

模型最多保存 8 個 shelf、16 個成功重播鍵與 64 筆 log。滿時設 fault、`known=false` 並停止所有後續 mutation；log 不會為了記拒絕而無限增加。遇到 `fault_blocked` 時，凍結的 source 值不可當作目前設備狀態。

`restart` 是本例自訂策略：進入新 epoch 時來源改為 Unknown、目前 shelf 標記為 restart 結束並轉為 unshelved，且標示 `known=false`。歷史 shelf 與重播鍵保留；舊 epoch 的同一成功請求只能歷史 replay，不能建立新 shelf 或延長期限。來源與擱置請求都必須帶目前 epoch，重送較舊 sourceAt 不會更新 freshness。restart 不是解除 fault 的方法，也不是持久化或 OPC UA 重啟行為保證。

修改 `practice.mjs` 的 duration、owner 或 reason 再執行，可核對 expiry 與 view。此範例是單記憶體 Node 模型，不提供真實認證、持久化、不可變稽核、OPC UA、PLC、HMI 通知、out-of-service、disable 或安全控制。
