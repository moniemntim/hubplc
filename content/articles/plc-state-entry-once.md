---
title: PLC 狀態進入只執行一次：把初始化、持續取樣與離開保存分開
description: 下載逐掃描離線模型，固定由呼叫端提供已核准狀態，驗證 RUN 初始化只做一次與舊批快照不被新批清除。
date: 2026-09-28
author: 茂伯
draft: false
---

## 本文只處理狀態邊界的資料責任

一項工作進入 RUN 時，通常要清除本批累計值 `BatchSum` 和樣本數 `SampleCount`；RUN
期間每取得一筆有效樣本就累加；離開 RUN 時保存結果。若把清除條件寫成
`StateNow = RUN`，每一掃描都會清零，最後只剩最後一筆樣本。

本範例**不決定任何狀態轉移**。每次呼叫由呼叫端傳入本次已核准的 `StateNow`；模型只保存
上一個已取樣狀態 `StatePrev`，並處理初始化、取樣和保存。它是本站的 JavaScript
**離線模型**，不是 PLC 程式、原廠模擬器或實機結果，不控制輸出、Start、Stop、故障、逾時
或轉移優先序。

下載以下兩個檔案到同一資料夾，以 Node.js 22 以上執行：

- [entry-model.mjs：狀態邊界資料模型](/examples/plc-edges/entry-model.mjs)
- [entry-demo.mjs：S1–S9 的可重現案例](/examples/plc-edges/entry-demo.mjs)

```powershell
node entry-demo.mjs
```

輸出是 CSV。S2 完整列應為 `2,RUN,WAIT,1,0,12,1,12,1,1,,,0`，代表進入 RUN 後先清零、
再收樣本 12；S6 應為 `6,DONE,RUN,0,1,99,0,25,3,1,25,3,1`，代表 NOW 已非 RUN，99
不會被收樣本，但保存 25/3 一次。欄位名稱在第一列，方便直接匯入試算表比對。

## 固定初值、輸入和寫入責任

| 欄位 | 初值或輸入 | 模型中的責任 |
| --- | --- | --- |
| `StateNow` | 每次呼叫由外部提供 | 已核准狀態，只接受 WAIT、RUN、DONE |
| `StatePrev` | WAIT | 模型保存前一次 StateNow；不由其他程式段改寫 |
| `Sample` | 每次呼叫可為數值或空值 | 只有 StateNow=RUN 且為數值時才收進工作區 |
| `BatchSum` / `SampleCount` | 0 / 0 | 目前 RUN 批次的工作區 |
| `EntryCount` | 0 | 每次由非 RUN 進入 RUN 才加一 |
| `SavedSum` / `SavedCount` | 空值 / 空值 | 只在離開 RUN 時複製工作區，之後新批不改寫 |

模型的唯一順序是：先以 StateNow 與 StatePrev 計算進入／離開；進入時清工作區；**僅在
StateNow=RUN 時**收數值樣本；離開時把工作區複製到保存快照；最後把 StateNow 保存為下次
的 StatePrev。`StateNow` 不是模型內部推導出來的，因此本文不提供 NextState、PendingState
或狀態機轉移圖。

```text
EnterRun := (StateNow = RUN) AND (StatePrev <> RUN)
ExitRun  := (StatePrev = RUN) AND (StateNow <> RUN)

IF EnterRun THEN
    BatchSum := 0
    SampleCount := 0
    EntryCount := EntryCount + 1
END_IF

IF (StateNow = RUN) AND (Sample 有數值) THEN
    BatchSum := BatchSum + Sample
    SampleCount := SampleCount + 1
END_IF

IF ExitRun THEN
    SavedSum := BatchSum
    SavedCount := SampleCount
    SaveCount := SaveCount + 1
END_IF

StatePrev := StateNow
```

## 實跑 S1–S9：12、8、5 不能被重複清除

`entry-demo.mjs` 執行的輸入與輸出如下。Prev 是該掃描開始時保存的前態；S6 故意傳入
`Sample=99`，用來證明 StateNow=DONE 時樣本不會被收進 RUN 工作區。

| 掃描 | Prev | StateNow | Sample | EnterRun / ExitRun | BatchSum / SampleCount | SavedSum / SavedCount | EntryCount / SaveCount | 判讀 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 | WAIT | WAIT | — | 0 / 0 | 0 / 0 | — | 0 / 0 | 待機 |
| S2 | WAIT | RUN | 12 | 1 / 0 | 12 / 1 | — | 1 / 0 | 先清零，再收第一筆 |
| S3 | RUN | RUN | 8 | 0 / 0 | 20 / 2 | — | 1 / 0 | 停留 RUN，只累加 |
| S4 | RUN | RUN | — | 0 / 0 | 20 / 2 | — | 1 / 0 | 沒有樣本，資料保留 |
| S5 | RUN | RUN | 5 | 0 / 0 | 25 / 3 | — | 1 / 0 | 第三筆加入本批 |
| S6 | RUN | DONE | 99（忽略） | 0 / 1 | 25 / 3 | 25 / 3 | 1 / 1 | 離開 RUN，只保存一次 |
| S7 | DONE | DONE | — | 0 / 0 | 25 / 3 | 25 / 3 | 1 / 1 | 停留 DONE，不重複保存 |
| S8 | DONE | RUN | — | 1 / 0 | 0 / 0 | 25 / 3 | 2 / 1 | 新批清工作區，舊快照不變 |
| S9 | RUN | RUN | 7 | 0 / 0 | 7 / 1 | 25 / 3 | 2 / 1 | 新批獨立累加 |

S2 若反過來先收樣本才清零，12 會消失。S3 若誤用 `StateNow=RUN` 當作進入條件，結果會變成
8/1，而不是 20/2。S6 的 StateNow 已是 DONE，故模型不收 99；它只保存 S5 留下的 25/3。
這是本文固定的資料規則，不是等待呼叫端下一掃描才切狀態的替代設計。

## 用模型作離線驗收

測試檔會重跑 S1–S9 並驗證：

1. EntryCount 只在 S2 和 S8 變化，最後為 2。
2. SaveCount 只在 S6 變化，S7 仍為 1。
3. S8 清除新的工作區後，SavedSum/SavedCount 仍是 25/3；S9 也不會改寫。
4. S6 傳入的 99 不會被收樣本，因為 StateNow 不是 RUN。

模型拒絕未知狀態、非有限數值樣本、累加後會變成非有限數值的資料，以及會超過
`Number.MAX_SAFE_INTEGER` 的計數器，避免成功回傳下一次必定無法接受的狀態。這仍只驗證
JavaScript 的輸入合約，沒有驗證 PLC 的資料型別轉換、保持區、I/O 更新、中斷、輸入取樣或
現場設備行為。

狀態進入可視為「`State=RUN` 的上升緣」。Siemens 的官方文件說明邊沿判斷會保存前一狀態，
且程式必須處理第一次執行的初始值；它支持本文以 Prev/Now 辨認邊界的概念，並不提供這裡的
批次清除、保存或設備狀態機實作。

參考：[Siemens STEP 7：正、負邊沿指令](https://docs.tia.siemens.cloud/r/en-us/v21/fbd-s7-1200-s7-1500-s7-1200-g2/bit-logic-operations-s7-1200-s7-1500-s7-1200-g2/positive-and-negative-edge-instructions)。

本文沒有在 Q06UDVCPU、GX Works、Siemens、Schneider 或任何硬體上編譯或執行。真正的
狀態轉移、停止與安全遮罩、資料溢位、保持和異常復原，必須由目標工程另行設計及驗證。

## 延伸閱讀

- [三步驟順序控制：WAIT、RUN、DONE 與故障復歸](/articles/plc-state-machine-three-step-sequence)
- [上升緣與下降緣：用逐掃描模型確認長按只送一次命令](/articles/plc-rising-falling-edge-button-event)
