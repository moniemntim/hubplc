---
title: HMI 趨勢時間範圍、取樣與彙總怎麼避免誤讀
description: 以可執行的半開時間分段，分開 duration-weighted window、raw change 簡單平均與缺資料覆蓋率。
date: 2026-09-21
author: 茂伯
draft: false
category: HMI 畫面與操作
---

## 本例採明確分段，不猜測缺口

本篇是 Node.js 24.19+ 的自訂離線 trend contract。每筆 segment 是半開 `[startMs,endMs)`，有 `valueTenths` 和 Good/Bad quality；segments 必須嚴格排序、不可重疊。window 沒有任何 segment 覆蓋的時間是 missing，不會以 0、前一筆或有效資料平均補齊。

下載 [model.mjs](/examples/trend-window/model.mjs)、[fixtures.mjs](/examples/trend-window/fixtures.mjs)、[demo.mjs](/examples/trend-window/demo.mjs)、[self-test.mjs](/examples/trend-window/self-test.mjs)、[practice.mjs](/examples/trend-window/practice.mjs)、[README.md](/examples/trend-window/README.md)，放在同一資料夾後執行：

```powershell
node demo.mjs
node self-test.mjs
node practice.mjs
```

## 固定資料與可核對輸出

全天窗口是 `[0,86400000)`；除了 `[10:09,10:10)` 的 75°C 以外皆為 60°C。全部以整數毫秒與十分之一度累積，duration×value 用 BigInt，避免整數乘法失去精度；最後轉為 Number 輸出平均值，因此小數仍是近似值。

```text
ten-minute weighted=61.5 coverage=1
day weighted=60.010416666666664 max=75
raw-change simple=67.5 (seed 60 + change 75; not window raw)
demo: PASS
```

`[10:00,10:10)` 的 9 分鐘 60°C 加 1 分鐘 75°C，所以 weighted mean 是 61.5°C。全天 weighted mean 是 60.010416666666664°C，max 是 75°C。

67.5°C 是另一個刻意分開的算法：seed=60°C 和 window 內變更點=75°C 的簡單平均。10:00 沒有原始 row，因此它不是該 window 的 raw sample mean，也不可拿它代替 duration-weighted 結果。

## Bad、缺口與覆蓋率

分析結果固定輸出 `knownDuration`、`coverage`、`knownMeanC`、`fullWindowMeanC` 與 max。若 Bad segment 或 gap 使 coverage 小於 1，`fullWindowMeanC=null`；`knownMeanC` 只描述已知時間，名稱不能省略。這避免有效 60°C 被錯稱為完整窗口平均，也不會把 Bad 補成零。

所有輸入都有上限：最多 128 segments、safe-integer 時間、有限且有界的十分之一度值；raw seed/change 也使用相同值域。shape、排序、重疊或窗口邊界不合法會明確拒絕。這是資料投影，不是資料品質協定；需處理來源 Bad／舊值時，另參考 [HMI 品質 Bad 如何避免把舊值誤認新值](/articles/hmi-bad-quality-stale-value/)，不可直接把兩個離線模型拼成同一 runtime。

## 可改練習與限制

`practice.mjs` 將 spike 起點往後 30000ms，並同時延長前一個 60°C segment，讓 coverage 保持完整且 spike 縮短。直接執行可核對 `fullWindowMeanC:60.75`、`coverage:1`，代表 9.5 分鐘 60°C 加 0.5 分鐘 75°C。接著在 `const result = analyzeWindow(...)` 之前加入 `changed[1].quality = 'Bad';`，再執行一次：預期 `knownDuration:570000`、`coverage:0.95`、`fullWindowMeanC:null`、`knownMeanC:60`。程式會印出結果，請比對上述數字；它不把任意修改都宣稱為通過測試。

本例不宣稱任何 HMI、歷史資料庫、取樣 API 或 PLC 使用相同彙總。它不做插值、控制寫入、來源時鐘可信度或缺口修補；現場要依資料源實際語意定義 segment 與品質。
