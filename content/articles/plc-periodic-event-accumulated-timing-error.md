---
title: PLC 每秒觸發為什麼會越跑越慢 週期事件與時間累積誤差
description: 用同一組可執行時間資料比較完成後再等與固定相位排程，重現第十次 9780／9000ms、落後合併、Busy missed 與回繞失效。
date: 2026-09-17
author: 茂伯
draft: false
---

## 把「每秒一次」拆成兩個明確需求

一件工作耗時 80ms，完成後再等 1000ms，兩次開始就相隔 1080ms。若需求是對齊 0、1000、2000…，下一個目標必須沿固定相位推進，並規定工作尚未完成或晚到時怎麼處理。

本篇用 **Node.js 離線排程模型**重現兩種做法，提供固定輸出、可修改輸入與斷言。時間、處理耗時與完成都是注入的虛擬資料；程式沒有忙等、sleep、PLC 通訊或真實非同步工作。它能驗證政策，不會證明實機每秒準時。

兩篇共用[Tick 回繞模型](/articles/plc-tick-wrap-elapsed-time)：先確認相鄰時間差有效，再累積成從 0 開始的時間軸。失去回繞或重啟前提時停止模型，不繼續追趕事件。

## 下載後先比較第十次

需要 Node.js 22.13 或以上；八檔存同一資料夾，不需 npm 安裝。

- [tick.mjs：Tick 差值與資料有效性](/examples/tick-scheduling/tick.mjs)
- [scheduler.mjs：兩種排程政策](/examples/tick-scheduling/scheduler.mjs)
- [tick-demo.mjs：回繞案例](/examples/tick-scheduling/tick-demo.mjs)
- [schedule-demo.mjs：本篇固定比較](/examples/tick-scheduling/schedule-demo.mjs)
- [tick-practice.mjs：時基修改練習](/examples/tick-scheduling/tick-practice.mjs)
- [schedule-practice.mjs：本篇修改練習](/examples/tick-scheduling/schedule-practice.mjs)
- [self-test.mjs：共用斷言](/examples/tick-scheduling/self-test.mjs)
- [README.md：完整執行契約](/examples/tick-scheduling/README.md)

在該資料夾執行：

```sh
node schedule-demo.mjs
node self-test.mjs
node schedule-practice.mjs
```

第一條完整輸出應為：

```text
completion: 0,1080,2200,3250,4350,5430,6550,7600,8700,9780
phase: 0,1000,2000,3000,4000,5000,6000,7000,8000,9000
late: target=3000 start=3500 missed=1 next=5000
busy: starts=0,3000 missed=2
schedule demo: PASS
```

第二條顯示 `timing self-test: PASS (65536 wrap pairs + scheduler boundaries)`。第三條列出 JSON，供下節逐欄核對。找不到模組時，先檢查八檔的位置與副檔名，不要把表格手算當成命令已執行。

## 讀懂兩列開始時間為什麼不同

第一個比較使用 1000ms 週期、每 10ms 一次虛擬掃描、耗時依序循環 80、120、50、100ms。這些時間剛好落在掃描格點，因此此段沒有完成觀察延遲；真實專案通常沒有這個保證。

| 模式       | 下一個目標的依據                | 第十次開始 | 相對 9000ms      |
| ---------- | ------------------------------- | ---------- | ---------------- |
| completion | 掃描觀察到本次完成的時間 + 1000 | 9780       | 晚 780           |
| phase      | 原定目標沿 1000ms 格點前進      | 9000       | 本組理想資料為 0 |

在上述格點條件下，completion 的下一次開始為「本次開始 + 耗時 + 1000」。前九次耗時總和是 780ms，因此第十次落在 9780。若掃描更慢，還會再加上完成被看見、到期被看見的延遲，不能只靠這個簡式預測實機。

phase 保住的是目標相位，不是保證執行準時。只有在工作可完成且掃描剛好看見目標時，才得到 0、1000、2000 這列。本文採不可重疊政策，每次掃描最多啟動一件，沒有無上限補做迴圈。

## 逐步重現落後到 3500ms 的情況

原版 `schedule-practice.mjs` 設定 `mode='phase'`、`duration=80`，掃描時間為 `[0,80,1000,1080,3500,3580,4000,4080]`。執行後檢查 `events`：

| 原目標 target | 開始 start | 模擬完成 finish | 觀察完成 observedFinish | lateness |
| ------------- | ---------- | --------------- | ----------------------- | -------- |
| 0             | 0          | 80              | 80                      | 0        |
| 1000          | 1000       | 1080            | 1080                    | 0        |
| 3000          | 3500       | 3580            | 3580                    | 500      |
| 4000          | 4000       | 4080            | 4080                    | 0        |

3500ms 才再掃描時，2000 與 3000 兩期都已到。本篇的 **phase 明定只做最新一期**：2000 計入 `COALESCED`，執行目標 3000 的一期，實際開始 3500。不是補做兩件，也不是把 2000 的樣本假裝補回。

因此最後 `missed=1`，`skips` 有 `firstTarget=2000,count=1,observed=3500,reason=COALESCED`，最後一件之後 `nextTarget=5000`。`lateness` 為 start−target；`duration` 為 finish−start，兩欄不能相加後都叫處理時間。

如果目的是現在溫度，3500ms 連讀兩次也不會還原 2000ms 的溫度。若必須保存每筆歷史取樣，需要上游時間戳、序號與有界緩衝；補做資料整理與補回過去感測值是不同問題。本附件沒有實作歷史取樣或補做佇列。

## 修改兩個參數，觀察政策差異

每個練習都先還原 `schedule-practice.mjs`，只改指定欄位再重跑：

| 修改                         | events 的開始時間   | missed | 原因                                             |
| ---------------------------- | ------------------- | ------ | ------------------------------------------------ |
| 不改                         | 0、1000、3500、4000 | 1      | 合併掉目標 2000                                  |
| `const mode = 'completion';` | 0、1080             | 0      | 第二件於 3500 才被觀察完成，下一目標為 4500      |
| `const duration = 2500;`     | 0、3500             | 3      | 1000 忙碌錯過；3500 合併 2000；4000 再因忙碌錯過 |

completion 的 `missed=0` 不代表有維持每秒準時。此模式根本沒有建立固定的 1000、2000…目標，因此不會把那些格點計為 missed。比較時必須一起看 mode、start 與 nextTarget。

Busy 的固定示範另用 `[0,1000,2000,2500,3000]`、duration=2500。開始時間為 0、3000；1000、2000 兩期都因第一件未完而跳過，missed=2。若完成與新目標恰好同時，模型先觀察完成再判斷到期，因此 duration=1000 時允許在 1000 啟動下一件。

## 如何處理回繞、重啟與容量

`samples(times)` 將已知虛擬時刻轉為 16 位元 Tick、啟動世代 A 及相鄰真實間隔上限。它知道模擬真值，**不是實機時間讀取器**。移植前需要提供可信時基與更新間隔保證，不能把從 Tick 算出的差值又冒充外部上限。

模型由相鄰合法差值累積，因此多次正常回繞不必清空排程；但任何相鄰間隔可能達一整圈、boot 改變，或差值超出所宣告的上限，都回傳 fault 並停止處理後續掃描。沒有自動清零或補做。停止模型不代表已讓真實設備停止。

| 限制或異常                  | 模型行為                                   |
| --------------------------- | ------------------------------------------ |
| 每次觀察落後多期            | 常數次數計算 missed，最多啟動一件          |
| 同一時間重複掃描            | 不重複產生同一個固定相位事件               |
| 預設最多 32 個事件          | 第 33 個到期啟動要求回報 EVENT_CAPACITY    |
| 最多 2000 筆掃描、32 種耗時 | 超出設定範圍拒絕輸入                       |
| 時基失效而工作尚無完成觀察  | 保留 RUNNING 記錄與 fault，不改成 COMPLETE |

RUNNING 在這裡只表示模型缺乏後續完成觀察，不能用來推論實體設備現在還在動。若要復原，應保存 fault 與原紀錄，依專案策略重建起點及確認工作狀態；附件不示範自動重送設備命令。

`self-test.mjs` 檢查第十次開始、落後合併、Busy、完成與到期同刻、重複掃描、8 位元多次回繞、重啟與失去一圈前提，以及事件容量。這些已執行的離線斷言不包含原廠模擬器或實機測試。

## 在 PLC 上還要量哪些欄位

移植時先記錄 CPU、runtime、工程軟體版本、實際時基 API、任務週期與排程政策。每筆保存目標時間、實際開始、實際完成、完成被觀察時間、Busy、missed、跳過原因與時間品質。將 start−target 和 finish−start 分開畫圖，才能區分排程延遲與工作耗時。

[CODESYS Task 文件](https://content.helpme-codesys.com/en/CODESYS%20Development%20System/_cds_f_reference_task.html) 描述循環工作週期與抖動；這支持另量實際任務行為，並不替本篇 JavaScript 模型提供 PLC 精度保證。Q、FX、S7 或其他平台需核對各自手冊，不能把本例函式名當成 PLC API。

作者：茂伯。問題請寄 [ceo@hubplc.com](mailto:ceo@hubplc.com)，附 mode、duration、完整掃描時間表及輸出；請區分離線結果與設備 Trace。
