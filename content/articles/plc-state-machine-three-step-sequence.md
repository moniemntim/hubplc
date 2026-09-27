---
title: 用狀態機寫 PLC 順序控制 從三個步驟開始
description: 用 WAIT、RUN、DONE、FAULT 建立三步驟狀態機，透過狀態表、逐掃描案例與逾時／非法狀態處理，讓順序控制可觀察、可復歸。
date: 2026-09-17
author: 茂伯
draft: false
---

## 先把流程拆成狀態

順序控制的第一步不是急著堆接點，而是把流程說成有限個狀態。本篇用虛擬流程示範 WAIT、RUN、DONE 三個狀態：WAIT 等待 Start，RUN 等待模擬完成，DONE 顯示結果後回到 WAIT。每個狀態都要回答三件事：現在允許哪些輸出、何時算完成、遇到異常要去哪裡。案例是合成測試，不連接真實機構。

| 狀態 | 允許輸出 | 進入動作 | 離開條件 |
| --- | --- | --- | --- |
| WAIT | Ready=1 | 清除本次完成旗標 | Start=1→RUN |
| RUN | Busy=1 | 清除本次逾時計時 | DoneInput=1→DONE；Timeout=1→FAULT |
| DONE | Complete=1 | 鎖存結果一次 | Ack=1→WAIT |
| FAULT | Alarm=1 | 保存錯誤代碼 | Reset=1→WAIT |

狀態變數只能在一個決策層被寫入，輸出則由目前狀態集中產生。不要讓 RUN 段、手動段、警報段各自直接改同一個輸出又沒有優先規則。狀態機不是把故障消除，而是把合法轉移和目前責任寫清楚。

## 先做狀態表 再寫程式

1. 列出初始狀態，明確 PLC 啟動後第一個允許的狀態。

2. 每個狀態只列合法輸出與入口條件；未列出的組合視為不允許。

3. 為每個轉移寫出觸發條件、下一狀態與要保存的診斷資料。

4. 加入逾時和非法狀態處理，不能讓流程無限等待而沒有可觀察訊號。

5. 用單步輸入一次只推進一個轉移，逐筆核對狀態表。

```text
通用偽碼（需依目標 PLC 語法調整）：
NextState := State;
CASE State OF
  WAIT: IF Start THEN NextState := RUN; END_IF;
  RUN: IF DoneInput THEN NextState := DONE; ELSIF Timeout THEN NextState := FAULT; END_IF;
  DONE: IF Ack THEN NextState := WAIT; END_IF;
  FAULT: IF Reset THEN NextState := WAIT; END_IF;
  ELSE NextState := FAULT; ErrorCode := 900;
END_CASE;
State := NextState;
Ready := (State = WAIT); Busy := (State = RUN);
Complete := (State = DONE); Alarm := (State = FAULT);
若 DoneInput 與 Timeout 同時成立，本案例採 DoneInput 優先；完成後由新的 State 集中產生輸出。實作時要確認目標語言 CASE 語法、列舉型別、狀態寫入和同一掃描多次轉移的規則。
```

參考：[Schneider Electric EcoStruxure Machine Expert V2.1 官方〈SFC - Sequential Function Chart Language〉，說明 SFC 以 step 表示動作、以 transition 控制順序；本文以此支持狀態與轉移分離的概念，不宣稱其語法可直接移植到 Q 系列。](https://product-help.schneider-electric.com/Machine%20Expert/V2.1/en/SoMProg/SoMProg/D-SE-0083499.html)

## 三步流程的逐步模擬

以下用每列代表一個掃描的合成案例。初始 State=WAIT；第 2 掃描 Start=1，第 5 掃描 DoneInput=1，第 7 掃描 Ack=1。若一個掃描只允許一次狀態轉移，預期是 WAIT→RUN→DONE→WAIT。

| 掃描 | Start | DoneInput | Ack | 前狀態 | 後狀態 | 應觀察 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 0 | 0 | 0 | WAIT | WAIT | Ready=1 |
| 2 | 1 | 0 | 0 | WAIT | RUN | 只進入 RUN |
| 3 | 0 | 0 | 0 | RUN | RUN | Busy=1 |
| 4 | 0 | 0 | 0 | RUN | RUN | 持續等待 |
| 5 | 0 | 1 | 0 | RUN | DONE | 記錄完成 |
| 6 | 0 | 0 | 0 | DONE | DONE | Complete=1 |
| 7 | 0 | 0 | 1 | DONE | WAIT | 回到等待 |
| 8 | 0 | 0 | 0 | WAIT | WAIT | Ready=1 |

先看後狀態，再看由後狀態集中產生的輸出。第 2 掃描若從 WAIT 直接跳 DONE，表示轉移條件被混用或 DoneInput 讀錯；第 5 掃描若 DoneInput 與 Timeout 同時成立，本案例應進 DONE。第 7 掃描回 WAIT 後，如果 Start 仍保持 ON，下一掃描會再進 RUN；要避免重複啟動就必須使用上升緣或要求 Start 放開，不能把長按當成一次命令。

## 等待 逾時與非法狀態

每個等待狀態都要有完成和異常出口。RUN 等待 DoneInput 時，啟動逾時計時；逾時後進 FAULT，保存目前狀態、開始時間或掃描計數。復歸不能只清 Alarm，還要定義回 WAIT、重做 RUN 或等待人工確認。若狀態值不是表中合法值，進入 FAULT 並保存錯誤代碼，比默默回到 WAIT 更容易追查。

| 異常案例 | 完成後應看到 | 失敗先查 |
| --- | --- | --- |
| DoneInput 永遠 0 | RUN 逾時並顯示錯誤 | 輸入位址、條件極性、逾時是否被週期執行 |
| Start 長時間 ON | 流程只在允許的轉移時啟動 | 是否需上升緣或等待 Start 放開 |
| 非法 State | Alarm=1、ErrorCode 被保存 | 是否有其他段寫 State、型別或初始化 |
| Reset 在 RUN 發生 | 依規格中止並回 WAIT 或拒絕 | Reset 優先順序與輸出清除 |
| 同一掃描多次跳步 | 狀態直接跨越中間步驟 | 限制每掃描一次轉移或改用明確事件 |

參考：[Schneider Electric EcoStruxure Machine Expert V2.0 官方〈SFC Elements / ToolBox〉說明 step、transition、initial step 與 transition condition；V1.1〈Sequence of Processing in SFC〉說明初始步驟、轉移檢查和處理順序。這些是 SFC 平台文件，狀態機偽碼仍需依實際語言改寫。](https://product-help.schneider-electric.com/Machine%20Expert/V2.0/en/SoMProg/SoMProg/D-SE-0083503.html)

## 適用型號 限制與常見問題

除錯時可在每個狀態保存一個原因碼，例如由 Start 進入、由 DoneInput 完成、由 Timeout 進故障。這些資料讓你分辨沒有轉移和轉移後輸出不對。若狀態在同一掃描被連續改兩次，先限制一次只允許一個轉移，或建立 nextState 暫存值，最後集中更新 State；這是設計選擇，必須依目標 PLC 掃描和語言規則驗證。

適用型號與限制：本文適用有布林、整數或列舉狀態資料的 PLC 順序控制設計；範例可套用到 Q06UDVCPU、FX、S7 或其他 PLC 的設計思路，但 CASE、SFC、步驟動作、初始化和同掃描轉移規則要按平台手冊改寫。

| 常見問題 | 回答 |
| --- | --- |
| 為什麼不用很多 M 位元表示流程？ | 多個旗標容易形成未定義組合；狀態表可限制一次只有合法狀態。 |
| 每個狀態都要獨立程式段嗎？ | 不一定，但輸出、入口和轉移責任要清楚，避免同一變數多處寫入。 |
| 流程卡住是不是一定要加延時？ | 先確認完成條件和輸入證據，再決定逾時；延時不能掩蓋位址或接線錯誤。 |
| 非法狀態直接回初始可以嗎？ | 可依需求，但應先保存原因；無條件清除可能掩蓋程式覆寫。 |

狀態機完成後還要走一次復歸路徑。測試 FAULT 產生後是否保存錯誤、輸出是否進入要求的安全狀態、Reset 是否需要人工確認，以及回到 WAIT 後舊的 DoneInput、Start 和計時器是否被清乾淨。若沒有清理，下一批流程可能一進 WAIT 就跳過 RUN。這些行為需寫進狀態表，不能只靠維護人員記憶。

寫狀態機時，狀態名稱要描述流程位置，不要只叫 M0、M1、M2。維護人員看到 WAIT_SENSOR、EXECUTE、COMPLETE、FAULT，就能直接聯想到等待哪個條件。每個狀態也應有可觀察的進入時間、活動旗標或原因碼。若流程需要重試，將 RETRY 視為清楚的轉移和計數規則，避免在 RUN 裡偷偷重設計時器而讓等待上限失去意義。

如果狀態機要控制真實設備，先把輸出分成請求、允許和實體輸出三層，並把停止與安全條件放在明確的位置。一般狀態轉移只能表達流程，不會自動提供急停、門禁或安全扭力關閉功能。完成文章中的離線表格後，還要依設備規格做獨立的安全設計與驗證。

## 延伸閱讀

- [請求 接受 完成與失敗 如何設計 PLC 模組間握手](/articles/plc-request-accept-result-handshake)
- [自動與手動模式切換時 PLC 應如何處理既有動作](/articles/plc-auto-manual-mode-switch)
