---
title: TON TOF 與 TP 計時器怎麼選 以輸入輸出時間線比較
description: 用同一組輸入時間線比較 TON、TOF、TP，處理輸入提早消失、重觸發與中途修改 PT，並標明 Schneider 文件平台與 QCPU 的限制。
date: 2026-09-17
author: 站長
draft: false
---

## 先看輸入與輸出要怎麼走

選計時器不要先看指令名稱，先寫出輸入何時成立、輸出何時應成立。TON 把輸入成立後的等待時間放在輸出變 ON 之前；TOF 在輸入由 ON 變 OFF 後，讓輸出再維持一段時間；TP 由觸發開始輸出固定脈衝。三者都可能有 IN、PT、Q、ET 這類欄位，但實際型別、時間解析度、啟動與重觸發規則要以目標平台文件為準。

| 需求 | 選擇方向 | 輸入提早消失時 | 輸出重點 |
| --- | --- | --- | --- |
| 輸入穩定一段時間才允許動作 | TON | 計時通常被重置或停止，須查平台 | 達到 PT 後 Q 才 ON |
| 輸入放開後延後關閉 | TOF | 下降緣開始計時 | PT 到期前 Q 維持 ON |
| 觸發後只輸出固定時間 | TP | 依平台決定重觸發 | Q 由觸發開始維持 PT |
| 按住才動 | 不一定用計時器 | 直接使用電平並設停止條件 | Q 跟隨輸入 |

本文選用 Schneider Electric EcoStruxure Machine Expert Standard Library 作為具體文件平台，因其官方頁面分別定義 TON、TOF、TP 與 TIME/PT/ET 介面。這只是文件核對平台，不代表 TON、TOF、TP 可直接套用到 Q06UDVCPU；Q 系列的計時器指令、時間單位和解析度仍須另查 Mitsubishi 對應 CPU 與工程軟體手冊。

## 分開畫出 TON TOF TP 的輸入時間線

以下是教學合成案例：PT=2 秒，時間由 0 到 6 秒，每 1 秒取樣一次。三條輸入時間線分開看：TON 的 IN 在 0 秒變 ON 並維持；TOF 的 IN 在 0 秒為 ON、1 秒變 OFF；TP 的 IN 在 0 秒產生上升緣，之後保持 OFF。表格是手算預期，沒有宣稱模擬器或實機已執行。實際 PLC 掃描不是每秒一次，正式測試應用更細的取樣記錄。

| 時間(s) | TON IN/Q | TOF IN/Q | TP 觸發/Q | 說明 |
| --- | --- | --- | --- | --- |
| 0 | 1/0 | 1/1 | 1/1 | TON 開始計時；TOF 仍 ON；TP 開始 |
| 1 | 1/0 | 0/1 | 0/1 | TOF 下降後延時；TP 尚未到期 |
| 2 | 1/1 | 0/1 | 0/0 | TON 到 PT；TP 關閉；TOF 未到期 |
| 3 | 1/1 | 0/0 | 0/0 | TOF 已關閉；TON 仍 ON |
| 4 | 1/1 | 0/0 | 0/0 | 保持結果 |
| 5 | 1/1 | 0/0 | 0/0 | 保持結果 |
| 6 | 1/1 | 0/0 | 0/0 | 案例結束 |

案例中的 TOF 在 t=1 秒下降，若 PT=2 秒，時間線預期在 t=3 秒附近關閉；表格以取樣點展示，所以邊界落在哪一掃描要依平台時間基準。不要把『2 秒』誤讀成精確到毫秒。

## 提早消失 重複觸發與中途改 PT

1. 先在規格表寫出 IN 的上升、下降與可能重複觸發時間，再決定計時器。

2. 本篇 TON 在 IN 提早降為0時重置計時，Q維持0；例如只ON 1秒便放開，不會在原定2秒時突然輸出。

3. 本篇 TOF 的 IN 再升為1時，Q保持1並取消目前的關閉延遲；下次下降再重新計時。

4. 本篇 TP 在 PT 尚未到期時再次出現上升緣，不延長目前脈衝；不要把它當可重觸發的延長器。

5. 在執行中改變 PT：分別測試縮短與延長，記錄當前 ET、Q 和下一次觸發的結果。

```text
通用偽碼（需依目標 PLC 語法調整）：
TonInst(IN := Start, PT := T#2s);
Ready := TonInst.Q;
TofInst(IN := Permit, PT := T#2s);
OutputEnable := TofInst.Q;
TpInst(IN := Trigger, PT := T#2s);
Pulse := TpInst.Q;
這段只表示資料流，實作時需建立符合平台語法的功能塊實例，並確認功能塊每個循環被呼叫。
```

參考：[Schneider Machine Expert V1.1 TON 上升開始計時 下降重置](https://product-help.schneider-electric.com/Machine%20Expert/V1.1/en/standard/topics/ton.htm)

參考：[Schneider Machine Expert V1.1 TOF 下降後延遲關閉](https://product-help.schneider-electric.com/Machine%20Expert/V1.1/en/plc_fbfun/topics/tof.htm)

參考：[Schneider Machine Expert V1.1 TP 固定脈衝與重觸發行為](https://product-help.schneider-electric.com/Machine%20Expert/V1.1/en/plc_fbfun/topics/tp.htm)

## 完成後應看到什麼 失敗先查哪裡

| 測試 | 完成後應看到 | 不同時先查 |
| --- | --- | --- |
| TON 穩定 ON 超過 PT | Q 在 PT 後 ON | PT 單位、掃描週期、IN 是否持續成立 |
| TON 提早 OFF | Q 不應提前 ON | 平台對 IN 下降時 ET/Q 的定義 |
| TOF 放開 | Q 維持至 PT 後關閉 | 下降緣是否被取樣、時間基準 |
| TP 單次觸發 | Q 維持約 PT 後關閉 | 觸發條件、實例是否重複呼叫 |
| 重複觸發 | 依官方規則重新開始或被忽略 | 功能塊版本與重觸發說明 |

若時間總是偏長或偏短，先查工程軟體顯示的 TIME 單位、CPU 時基、掃描時間與輸入更新，再查功能塊的 ET。若 Q 一直不變，查實例是否真的在週期程式呼叫；若同一實例在多個段被呼叫，先合併呼叫點。完成判定必須看 IN、ET、Q 三者，不只看輸出燈。把測試結果分成三種證據：邏輯證據是輸入序列與預期時間線；工程軟體證據是編譯器對型別、時間常數與功能塊實例的接受結果；設備證據則是實際輸入、輸出與量測時間。三者不能互相冒充。

適用型號與限制：本文適用於具計時功能的 PLC 概念教學；TON/TOF/TP 的名稱和 IEC 風格介面以 Schneider Machine Expert 文件為例。未提供特定 Q 系列 CPU 的計時器手冊，因此不得把本文偽碼或 TIME 行為當成 QCPU 可編譯程式。計時器也不是安全延遲或急停功能；安全時間需由安全控制器、硬體與風險評估確認。

## 常見問題與附錄檢查表

| 問題 | 回答 |
| --- | --- |
| TON 和 TP 都能延遲，怎麼分？ | TON 要求輸入持續成立後才輸出；TP 是被觸發後輸出固定脈衝，需求不同。 |
| TOF 輸入一 OFF 就開始延遲嗎？ | 在 Schneider 文件定義中，下降緣啟動延遲；其他平台仍須查其文件。 |
| PT 改了，計時會重新開始嗎？ | 不能猜。把中途改 PT 列入測試，依目標平台的功能塊規則判定。 |
| 可不可以把計時器直接當防抖？ | 可以是一般邏輯方案之一，但輸入濾波、脈衝寬度和設備安全需求仍要另行評估。 |

1. 列出每個計時器的 IN、PT、Q、ET 資料型別與單位。

2. 以 0～6 秒合成序列先手算，再逐掃描記錄實際值。

3. 把提前消失、重複觸發、PT 中途改變列為邊界測試。

附錄操作建議：先用不接輸出的內部位元做測試，避免尚未核對的計時邏輯直接控制馬達、電磁閥或加熱器。將輸入強制值、時間設定和預期輸出寫在同一張表，測完解除強制並確認程式回到正常模式。若使用 HMI 修改 PT，還要測試空值、負值、超大值和運轉中變更；不符合範圍時應拒絕套用或回報錯誤，而不是讓計時器收到未定義參數。

當你要把計時器放進實際流程，請再問一次：輸入是狀態還是事件，輸出是持續允許還是一次脈衝，時間是否必須從硬體時間戳開始計算。TON 適合條件連續成立的確認，TOF 適合保留輸出一段時間，TP 適合把一次觸發轉成固定長度訊號。若需求同時包含確認時間、保持時間和逾時故障，可能需要多個計時器與明確狀態，而不是把三個功能混在一個線圈後面。先畫時間線，再決定程式結構。

參考：[Schneider Electric Machine Expert V1.1〈Differences Between a Function and a Function Block〉說明功能塊具內部記憶、需要透過實例呼叫；這是理解計時器不能任意重複呼叫的官方依據。](https://product-help.schneider-electric.com/Machine%20Expert/V1.1/en/SoLibref/SoLibref/Function_and_Function_Block_Representation/Function_and_Function_Block_Representation-2.htm)

## 延伸閱讀

- [兩個命令同時成立怎麼辦 PLC 優先順序與互斥條件設計](/articles/plc-command-priority-mutual-exclusion)
- [PLC 每秒觸發為什麼會越跑越慢 週期事件與時間累積誤差](/articles/plc-periodic-event-accumulated-timing-error)
