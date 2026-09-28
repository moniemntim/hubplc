---
title: 多警報穩定排序：嚴重度、可信時間與固定快照
description: 下載六筆警報的 Node.js 案例，重現相同嚴重度、未知時間、跨來源同號及換頁時插入新事件的排序結果。
date: 2026-09-21
author: 茂伯
draft: false
category: HMI 畫面與操作
---

## 先決定這一列代表什麼

同一高溫警報從未確認變成已確認，應更新同一次發生的狀態；新的發生才是另一列。本篇接收「已整理好的 occurrence 狀態快照」，不直接消費 Active、Ack、Clear 的原始通知。原始事件如何更新狀態，交給[警報生命週期案例](/articles/alarm-acknowledge-clear-occurrence)，避免拿排序程式代替事件處理器。

本例用 Node.js 24.19.0 執行自訂清單模型，沒有連接 OPC UA、HMI、PLC 或資料庫。它能驗證排序、識別衝突、分區與固定快照換頁；不能證明設備時鐘可信、severity 映射正確或通知沒有遺失。

## 下載六個檔案

放進同一個空資料夾，保留檔名：

- [model.mjs](/examples/alarm-order/model.mjs)
- [fixtures.mjs](/examples/alarm-order/fixtures.mjs)
- [demo.mjs](/examples/alarm-order/demo.mjs)
- [self-test.mjs](/examples/alarm-order/self-test.mjs)
- [practice.mjs](/examples/alarm-order/practice.mjs)
- [README.md](/examples/alarm-order/README.md)

```powershell
node demo.mjs
node --test self-test.mjs
node practice.mjs
```

先看 `fixtures.mjs`。每列的 sourceId、conditionId、occurrenceId 組成唯一鍵，允許 1～24 字元的 ASCII 大寫英文字母、數字、底線與連字號。本例 occurrenceId 是自訂生命週期識別，不是 OPC UA EventId。

## 固定六筆輸入與排序鍵

下表 eventTime 都在 2026-09-28 UTC。receiveTime 統一為 10:00:10，僅供診斷，不作排序替代時間。

| 唯一鍵        | severity | eventTime    | active／acked |
| ------------- | -------- | ------------ | ------------- |
| S1/PRESSURE/A | 900      | 10:00:05.000 | true／false   |
| S1/PRESSURE/B | 700      | 10:00:01.000 | false／false  |
| S1/PRESSURE/C | 900      | 10:00:03.000 | true／true    |
| S1/PRESSURE/D | 900      | 未知         | true／false   |
| S1/PRESSURE/E | 900      | 10:00:03.000 | true／false   |
| S2/PRESSURE/C | 900      | 10:00:03.000 | true／false   |

排序鍵依序是：severity 降冪、可信時間優先、可信 UTC 時間升冪、sourceId、conditionId、occurrenceId 的 ASCII 順序。資料先後抵達不作最後決勝；相同 occurrenceId 在不同來源仍是不同列。

`timeTrusted=true` 是輸入契約，表示提供資料的人已確認時間可以放在同一 UTC 軸比較。模型不會驗證 NTP/PTP 或自行校時；不知道時就填 false。時間欄位只接受完整的 `YYYY-MM-DDTHH:mm:ss.sssZ`，不存在的日期會拒絕；可信時間不能是 null，且需提供 uncertaintyMs（0～60000）。不可信資料可以保留原時間文字供診斷，但排序仍視為未知。

未知時間只排在「相同 severity 的可信時間」之後。因此 D 雖然時間未知，仍排在 severity=700 的 B 前面。這是本例選定的規則，不是所有警報系統的標準。

## 執行後逐列核對

```text
rule=alarm-order/v1
order=S1/PRESSURE/C,S1/PRESSURE/E,S2/PRESSURE/C,S1/PRESSURE/A,S1/PRESSURE/D,S1/PRESSURE/B
activeUnacked=S1/PRESSURE/E,S2/PRESSURE/C,S1/PRESSURE/A,S1/PRESSURE/D
activeAcked=S1/PRESSURE/C
inactiveUnacked=S1/PRESSURE/B
inactiveAcked=
old-page1=S1/PRESSURE/C,S1/PRESSURE/E,S2/PRESSURE/C
old-page2=S1/PRESSURE/A,S1/PRESSURE/D,S1/PRESSURE/B
refreshed-first=S1/PRESSURE/NEW
snapshot-changed=true
```

C、E、S2 的 C 都是900且同時間，最後靠完整唯一鍵決勝；A晚兩秒所以在後；B雖然最早發生，severity較低仍排最後。

分區只是對相同排序結果做篩選，不改 Active 或 Acked。C 已確認但仍作用中，留在 activeAcked；B 已消失但未確認，留在 inactiveUnacked。inactiveAcked 也有保留區，程式沒有自動刪除歷史或執行機台 Reset。

## 換頁期間有新警報怎麼辦

demo 先從舊快照拿前三列，再向輸入加入 severity=1000 的 NEW，最後仍向同一舊快照拿後三列。因此舊頁面合起來正好是原本六列，不重複、不漏列。建立新快照後，NEW 才排到第一列。

`createSnapshot()` 複製並凍結資料，保存規則版本與 SHA-256 內容識別；它不是簽章或權限機制。`page(snapshot, offset, size)` 只對指定快照切片，每頁1～20列。不能每頁重建一次快照，再聲稱 offset 分頁不會漏資料。案例沒有 HTTP API、快照持久化、到期機制或多使用者服務。

輸入最多100列（包括重複列），超過直接拒絕。完全相同唯一鍵與全部欄位的列只留一筆；同鍵不同內容則拒絕整份快照，要求上游先依版本整理，不能猜「最後收到的那筆比較新」。這是快照驗證，不是原始通知去重；Ack 與 Clear 通知不能直接丟進這裡合併。

## 改一個值重跑

`practice.mjs` 將 B 的 severity 改成950，預期第一列變成 S1/PRESSURE/B。把 `bSeverity = 950` 改成 `700`，結果回到原來順序。改成0則出現 `SEVERITY_1_TO_1000` 錯誤，不會靜默把它當最低級。

自我測試另枚舉六筆資料的720種排列，核對排序及快照識別一致；也測跨來源同號、同鍵衝突、非法日期、缺少可信時間、稀疏陣列、輸入上限、快照隔離與換頁。

## 不確定度不能當比較器的捷徑

三筆同 severity 事件分別在0、3、6秒，每筆誤差±2秒，區間會出現 A 與 B 重疊、B 與 C 重疊、A 與 C 不重疊。若「重疊就當相同」再靠輸入順序決勝，結果可能不穩定。本模型只用固定鍵；uncertaintyMs 保留作附註，不參與兩兩區間判斷，也不宣稱名目時間排序能證明因果。

[OPC UA Part 5 BaseEventType](https://reference.opcfoundation.org/specs/OPC-10000-5/6.4.2) 定義 Severity 範圍1～1000，數值越高越嚴重。本例採此數值範圍；廠商 priority=1 的意義仍需另訂映射，不能直接代入。自訂排序、快照及分區政策並非該標準要求。
