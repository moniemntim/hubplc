---
title: 非同步回覆先到 B、後到 A：配對表與整批結果的完整案例
description: 下載 FC03 離線案例，讓 102 比 101 先完成，核對資料沒有錯配、重複不更新，以及 all 與 partial 的顯示差異。
date: 2026-09-21
author: 茂伯
draft: false
category: 工業通訊與網路
---

## 這次要得到什麼結果

同時等待兩筆讀取，B 比 A 先回來。正確結果是 B 得到 `[300,400]`、A 得到 `[100,200]`，各更新一次。不能因為 A 先送出，就把第一個回覆交給 A。

本文使用已執行的 **Node.js 離線 FC03 callback**，沒有 socket、PLC 或網路封包量測。它沿用[晚到回覆配對器](/articles/sequence-reuse-late-response)，本篇只增加兩筆並行讀取與批次顯示規則；連線世代、TID 不重用及 FC03 欄位說明集中在該篇。

## 下載三個檔案，在同一資料夾執行

需要 Node.js 22.13.0 以上。下載 [fc03-late-response-matcher.mjs](/examples/plc-late-response/fc03-late-response-matcher.mjs)、[batch-view.mjs](/examples/plc-late-response/batch-view.mjs) 與 [batch-demo.mjs](/examples/plc-late-response/batch-demo.mjs)，全部放在同一資料夾：

```powershell
node batch-demo.mjs
```

程式印出三行 JSON 觀察點，最後一行應為：

```text
PASS: correct pairing, once-only updates, malformed isolation and all/partial views
```

所有時間都是 fixture 的單調處理時刻，不會真的等待 1200 ms。每次回覆交給 matcher 後，**只有 classification=completed** 才解碼並保存結果；duplicate、unknown、格式錯誤及晚到資料都不更新結果。

## 先把請求與資料列清楚

兩筆都屬於 epoch=1、peer=gateway-a、Unit ID=1，代表本例需核對下游裝置的閘道情境。每筆讀取兩個 register；資料是無符號 16-bit 大端序整數，未加縮放。

| 工作 | TID | 起始位址（十進位） | 建立時刻 | deadline | 合成正常 PDU |
| --- | --- | --- | --- | --- | --- |
| A | 101 | 16 | 0 ms | 2000 ms | `03 04 00 64 00 C8` → 100、200 |
| B | 102 | 32 | 10 ms | 510 ms | `03 04 01 2C 01 90` → 300、400 |

起始位址保存在請求紀錄中，FC03 正常回覆沒有回傳它。配對不是從數值猜位址，而是由保留的 epoch、peer、TID、Unit ID 和格式檢查定位請求。

## 案例一：B 先完成，A 不會被預填成功

| 處理時刻 | 送入的 callback | 分類與結果 |
| --- | --- | --- |
| 200 | B／102 正常 PDU | B completed、更新次數 1；A 仍 pending |
| 201 | B／102 再送一次 | duplicate，B 更新次數仍 1 |
| 202 | TID=999 | unknown-transaction，不把資料塞給 A |
| 203 | A／101，但 PDU 只有 `03 04 00 64` | wrong-pdu-length，A 仍 pending |
| 1200 | A／101 正常 PDU | A completed、更新次數 1 |

203 ms 的格式錯誤在本例只隔離該次 callback，不立即終止 A。之後合法回覆仍可在 A 的期限前完成；這是此配對器的明確策略，不是宣稱所有通訊函式庫都如此。

`all` 與 `partial` 只是公開資料的規則，不會改動配對器：

- **all**：兩筆都 completed 才公開整批數值；在 200 ms，visible 是 `{}`。
- **partial**：先公開已完成者；在 200 ms，visible 是 `{"B":[300,400]}`，status 仍為 waiting。

1200 ms 後兩者皆 complete，visible 為 `{"A":[100,200],"B":[300,400]}`，updates 為 `{"A":1,"B":1}`。保存順序可以是 B、A，輸出仍依成員身份整理，不能改回 FIFO 配對。

## 案例二：B 到期，A 成功也不能使整批成功

第二條時間線重新建立兩個請求，不沿用前一案例。510 ms 執行 expireThrough，B 轉 expired；600 ms 才收到 B，分類是 late-terminal，不復活它。1200 ms A 正常完成。

這時兩個成員都已是終態，因此 settled=true；但兩種顯示規則的 status 都是 **incomplete**：

| 顯示規則 | visible | states | updates |
| --- | --- | --- | --- |
| all | `{}` | A completed、B expired | A=1、B=0 |
| partial | `{"A":[100,200]}` | A completed、B expired | A=1、B=0 |

partial 能展示 A，並不等於批次通過。all 不展示部分值，也不會撤銷 A 已完成的讀取。只要還有 pending 成員，狀態仍是 waiting；這個小範例沒有提早結算或取消其餘成員。

## 如果你的輸出不一樣

若 A 收到 300、400，查回覆是否錯交給佇列第一筆；若 B 更新兩次，查程式是否跳過 completed 狀態判定直接保存資料。若 203 ms 就把整批判失敗，先確認你實作的格式錯誤政策是否和本例一致。

若執行時找不到模組，確認三個下載檔在同一資料夾，且沒有被瀏覽器改名成 `.txt`。若你修改時間後得到倒退時間錯誤，請按處理先後排序 fixture；捕捉時刻與 callback 的實際處理時刻不是同一欄位。

## 這份練習沒有驗證的事

這裡只處理兩筆短期讀取，沒有實際傳送失敗、執行緒競爭、取消 API、重連器或持久化。資料在同一 JavaScript 呼叫流程中依序處理；不能用這個結果證明多執行緒中的狀態更新已原子化。正式程式還需限制 outstanding 數量、紀錄容量及回覆大小。

協定若沒有對端會回傳的識別欄位，本地新增 TID 不會讓回覆自動可配對。本文也不提供無識別協定的通用補救方法。至於有副作用的寫入，配對成功不等於防止重複執行，應另看[業務冪等鍵與重複寫入](/articles/idempotency-key-duplicate-write)。
