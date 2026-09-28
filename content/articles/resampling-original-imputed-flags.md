---
title: 等間隔重採樣如何標示原始點與填補點
description: 用完整不等間隔序列重建每秒格點，保留原始、插值、缺樣與邊界原因，讓每個數字可回算。
date: 2026-09-21
author: 茂伯
draft: false
category: 資料記錄與報表
---

## 先保留原始列，再建立另一張格點表

重採樣的輸出「每秒一筆」只表示結果有規則格點，並不表示現場每秒量過一次。最安全的結構是兩張資料：不可覆寫的 `raw_events`，以及帶 `sourceKind` 的 `resampled_points`。同一個 `value` 欄若沒有來源標記，下載 CSV 後就無法辨別量測與估計。

本篇是離線數學案例，沒有硬體實測，也不應用插值取代 PLC 控制回饋、安全判斷或離散狀態。線性插值只用於本例假設可連續變化的數值；計件、脈衝與開關狀態需要自己的事件語意。

格點一律為 `[12:00:00, 12:00:06]` 的整秒，含兩端。原始事件如下；品質 Bad 的列保留在原始表中，但不是插值支點。

| rawAt    | rawValue | rawQuality | 可作支點？ |
| -------- | -------: | ---------- | ---------- |
| 12:00:00 |       10 | Good       | 是         |
| 12:00:02 |       14 | Good       | 是         |
| 12:00:04 |       18 | Good       | 是         |
| 12:00:06 |       25 | Bad        | 否         |

規則固定為：恰好落在 Good 原始時間的格點標 `RAW`；兩側均有 Good 支點且兩支點相距不超過 2 秒，才作 `LINEAR`；否則值為空並記原因。`maxGap=2s` 是本例的分析政策，不是通用允收標準。

## 把七個格點逐列重算

線性估計使用實際時間，不用資料列序號。對 12:00:01：

`10 + (14 − 10) × (1 − 0) ÷ (2 − 0) = 12`

同理 12:00:03 為 `14 + (18 − 14) × (3 − 2) ÷ (4 − 2) = 16`。完整輸出如下，空值不是 0，也不是沿用上一個量測。

| gridAt   | value | sourceKind | leftRawAt | rightRawAt | reason                       |
| -------- | ----: | ---------- | --------- | ---------- | ---------------------------- |
| 12:00:00 |    10 | RAW        | 12:00:00  | —          | Good 原始事件剛好命中        |
| 12:00:01 |    12 | LINEAR     | 12:00:00  | 12:00:02   | gap 2 s，兩側 Good           |
| 12:00:02 |    14 | RAW        | 12:00:02  | —          | Good 原始事件剛好命中        |
| 12:00:03 |    16 | LINEAR     | 12:00:02  | 12:00:04   | gap 2 s，兩側 Good           |
| 12:00:04 |    18 | RAW        | 12:00:04  | —          | Good 原始事件剛好命中        |
| 12:00:05 |  null | MISSING    | 12:00:04  | —          | 右側只有 Bad，不可插值       |
| 12:00:06 |  null | MISSING    | —         | —          | 原始列 Bad，不把 25 當量測值 |

格點總數是 7，原始 Good 量測只有 3，線性估計 2，缺樣 2。報表若只寫「7 筆有效資料」，已把不同證據混在一起；至少要分別輸出這四個計數。

## 邊界、長缺口與保持前值要另寫規則

格點在第一筆 Good 之前或最後一筆 Good 之後，只有單側資料，屬外推，不是插值。本例禁止外推，所以 12:00:05 保持 null。就算把 12:00:06 的品質改成 Good，04 到 06 的缺口會允許 05 估為 21.5，但只有在它確實是 Good、且仍符合 `maxGap=2s` 時才可寫出。

再做一個邊界測試：把 12:00:06 改成 30 且 Good，並詢問 11:59:59 到 12:00:07。結果中 11:59:59 和 12:00:07 仍必須為 `MISSING / OUTSIDE_SUPPORT`；中間 12:00:05 則為 `LINEAR`，`18+(30−18)×1÷2=24`。這能抓到程式把第一或最後一筆無限延伸的錯誤。

若用途確實需要保持前值，輸出應是另一種 `sourceKind=PREVIOUS`，並包含 `sourceRawAt` 與 `ageSeconds`。例如允許 `maxAge=1s` 時，04 的 Good 18 可在 05 寫成 18／PREVIOUS／age 1；06 因上一個 Good 已經 2 秒前而仍為 null。這是階梯保持假設，與線性估計不同，不能共用 `LINEAR` 標記。

官方 InfluxDB 重採樣文件也要求插值至少要有兩個來源點；格點只有在兩側支點都在 `max_gap` 內或剛好命中原始點時才寫出，過長缺口保留為洞。其 `previous`、`linear` 的意義也不同，可作為本篇「方法必須帶標記」的實作參考。[InfluxDB 3 Resampler：data requirements 與 max_gap](https://docs.influxdata.com/influxdb3/enterprise/plugins/library/official/resampler/)

## 匯出與驗收清單

每個輸出格點至少帶：`gridAt`、`value`、`sourceKind`、`sourceQuality`、`leftRawAt`、`rightRawAt`、`methodVersion`。原始資料另保留原始到達時間、單位和原始品質；不要用 LINEAR 的 Good 外觀覆蓋來源品質。

1. 用上表四個原始列跑一次，應得到 `RAW=3`、`LINEAR=2`、`MISSING=2`，且 01=12、03=16。
2. 將 06 改 Good/30，驗證 05=24／LINEAR，11:59:59 與 12:00:07 仍為空值。
3. 將 `maxGap` 改成 1 秒，驗證 01、03、05 都不能插值；原始 Good 點仍保留。
4. 將 02 或 04 改 Bad，驗證相鄰估計點變 MISSING，而不是使用 Bad 值補線。
5. 匯出 CSV 後按 `leftRawAt`、`rightRawAt` 重算任一 LINEAR 列，確認格點起點、間隔、方法版本和來源欄都還在。

若目的是把高頻資料彙成低頻報表，該輸出應標 `WINDOW_MEAN`、`WINDOW_MAX` 等區間統計，並帶窗口起訖與來源筆數；它不是本篇的瞬時格點。窗口彙總的保存、權重與缺測計算，請看下一篇。

## 延伸閱讀

- [工業報表取樣週期與彙總週期的定義](/articles/sampling-and-aggregation-periods)
- [長時間無資料如何顯示停機還是資料源中斷](/articles/no-data-stopped-or-source-outage)
- [尖峰值被過濾時如何保留原始資料可追溯](/articles/filtered-peaks-raw-data-traceability)

作者／編輯：茂伯。回報 [ceo@hubplc.com](mailto:ceo@hubplc.com)，附原始時間、品質與格點規則。
