---
title: PLC 浮點數的容差比較
description: 用工程單位明定絕對與相對容差，逐筆驗收近零、大數值、無效輸入與溢位；不把顯示取整當成比較規則。
date: 2026-09-28
author: 茂伯
draft: false
---

## 先定義判定值與工程窗口

「兩個值看起來都是 2.2」不是驗收條件。比較前先寫下比較的是哪兩個工程值、單位是什麼，以及允許差多少。本篇的離線案例把溫度目標設為 25.000 °C，固定製程窗口為 ±0.050 °C，且**剛好等於界線也合格**。這是案例規格，不是任何溫控設備的建議設定。

浮點表示是另一個問題。CODESYS 的 REAL/LREAL 靜態分析文件以 `1.1 + 1.1` 和 `3.3 - 1.1` 為例：監看值都可顯示為 2.2，直接相等比較仍可能是 FALSE。它也說明 REAL/LREAL 依 IEEE 754 浮點表示，部分十進位小數無法精確表示。這支持「先定義比較規則」，不支持拿一個全域 EPSILON 套到所有訊號。

本篇不處理畫面顯示的四捨五入；顯示格式和下游實際比較值的分層，見[工程數值的四捨五入 負數邊界與顯示格式](/articles/plc-rounding-negative-display-fixed-point)。

## 可下載並重跑的離線案例

下載 [plc-numeric-offline-example.mjs](/examples/plc-numeric/plc-numeric-offline-example.mjs) 到任一資料夾後，在該資料夾執行：

```text
node plc-numeric-offline-example.mjs
```

檔案不連 PLC、不發送網路請求，也不寫入資料，會印出每筆輸入、所採規則和結果。它是 JavaScript IEEE 754 binary64 的離線參考實作，**不是**任何 PLC 的 REAL、LREAL、CPU 指令或 HMI 的實測證據。換 PLC、編譯器、型別或函式庫後，必須在目標環境以相同測資再跑一次。

## 固定工程窗口：只用絕對容差

對「溫度必須距 25 °C 不超過 0.05 °C」這種規格，規則是：

```text
difference = ABS(actual - target)
close = difference <= 0.050 °C
```

兩個值和容差都必須是同一工程單位。把 mA、°C、百分比共用同一個常數，或把畫面小數位當作容差，都會改變規格含義。

| Case                                      | Actual °C | Target °C | 規則           | 預期                                     |
| ----------------------------------------- | --------: | --------: | -------------- | ---------------------------------------- |
| `within-fixed-process-window`             |    25.049 |    25.000 | ABS 差 ≤ 0.050 | 合格                                     |
| `outside-fixed-process-window`            |    25.051 |    25.000 | ABS 差 ≤ 0.050 | 不合格                                   |
| `decimal-boundary-representation-rejects` |    25.050 |    25.000 | ABS 差 ≤ 0.050 | binary64 差值大於 0.050，離線結果不合格  |
| `binary-exact-boundary-includes-equality` |     1.500 |     1.000 | ABS 差 ≤ 0.500 | 合格；證明 `<=` 包含可精確表示的等號邊界 |

執行檔會實際印出 `25.05 - 25` 的 binary64 差值；在目前參考實作中它約為 `0.05000000000000071`，大於 0.05，因此即使數學規格採 `<=`，案例仍得到不合格。不要加任意 EPSILON 把這筆推回合格，那會改變工程窗口。`1.5 - 1 = 0.5` 則可精確表示，離線案例用它證明 `<=` 的等號分支確實存在。若產品規格真的以千分之一 °C 的離散格點發出資料，可先把資料契約定為整數值，再用足夠位寬的整數比較；這需要另定轉換、範圍和溢位規則，不能把每個 REAL 任意乘倍率後宣稱已精確。

## 只有明定的演算法比較才使用相對容差

離線檔案也列出一個不同用途的對稱合併規則：

```text
scale         = MAX(ABS(a), ABS(b))
relativeLimit = relativeTolerance × scale
limit         = MAX(absoluteTolerance, relativeLimit)
close         = ABS(a - b) <= limit
```

此案例的 `absoluteTolerance = 0.01`，`relativeTolerance = 0.0001`（0.01%）。它適合比較兩個數值演算法在不同量級的輸出；是否該用它，必須由需求決定。

| Case                                                |       a |     b | 最大允許差 | 預期與原因                       |
| --------------------------------------------------- | ------: | ----: | ---------: | -------------------------------- |
| `near-zero-uses-absolute-floor`                     |   0.001 |     0 |       0.01 | 合格；近零時由絕對下限主導       |
| `relative-policy-accepts-large-value-difference`    | 10000.5 | 10000 |    1.00005 | 合格；這是演算法比較規則         |
| `fixed-process-window-rejects-that-same-difference` | 10000.5 | 10000 |       0.05 | 不合格；固定製程窗口不因量級放寬 |

同一組 10000.5／10000 在兩種規則得到不同結果是刻意設計：結果要追溯到規格，不能從「比較函式回傳 TRUE」反推產品已合格。

## 無效值、溢位與狀態抖動要分開處理

範例對 NaN、正負 Infinity、負容差和 `ABS(a-b)` 本身溢位都回報明確狀態，絕不把它們當成普通的不合格讀值。PLC 端的有限值檢查、診斷旗標與故障輸出策略依平台而異；本文沒有提供未核對的廠牌指令。CODESYS 的轉換文件也警告，超出目標型別範圍時，結果可能是未定義或目標系統相關的，因此先限制來源範圍，再做轉型與比較。

容差比較也不會自動消除切換抖動。若單次規格是 ±0.050 °C，而輸入在 25.049 和 25.051 間變動，合格旗標交替是這個規則的正常結果。若設備需要穩定的「到位」狀態，另定進入／離開門檻或持續時間，並把前一狀態、初始值、無效資料策略寫入另一份驗收表；不要偷偷放大容差。

## 現場驗收表該記什麼

| 欄位                         | 為什麼要記錄                           |
| ---------------------------- | -------------------------------------- |
| 原始輸入與工程單位           | 排除倍率、符號與量程混用               |
| PLC 型別與轉型位置           | REAL、LREAL 或整數契約會改變可表示範圍 |
| `a`、`b`、差值、容差、結果   | 每一筆可依明訂公式重算                 |
| 邊界、近零、極大值與無效輸入 | 同時驗收正常與拒絕路徑                 |
| CPU、工程軟體、函式庫版本    | 換目標後能重跑同一批案例               |

不要從本篇推論某台 PLC 的 REAL 有多少有效位數，也不要把 JavaScript 報告當 PLC 驗收。CODESYS 官方文件的結論只適用其說明的 REAL/LREAL 與轉換行為；三菱 Q 系列或其他 PLC 的型別、有限值函式、溢位與掃描行為必須查該型號和版本文件並在設備上驗證。

參考：[CODESYS SA0054：REAL/LREAL 等值比較與 IEEE 754 表示](https://content.helpme-codesys.com/en/CODESYS%20Static%20Analysis/_san_rule_sa0054.html)

參考：[CODESYS REAL/LREAL 轉換：範圍與取整行為](https://content.helpme-codesys.com/en/CODESYS%20Development%20System/_cds_operator_real_to.html)

## 延伸閱讀

- [工程數值的四捨五入 負數邊界與顯示格式](/articles/plc-rounding-negative-display-fixed-point)
- [遲滯判斷怎麼寫 讓門檻附近的狀態不要反覆切換](/articles/plc-hysteresis-two-threshold-control)
