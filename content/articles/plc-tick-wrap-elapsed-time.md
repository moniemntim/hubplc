---
title: PLC 系統 Tick 回繞後的經過時間計算
description: 下載可執行的 Tick 差值案例，驗證 250 到 14 的 20ms、完整回繞與重啟失效，附修改練習及 65536 組邊界檢查。
date: 2026-09-17
author: 茂伯
draft: false
---

## 先跑出 20ms，再看它何時不可信

起點 Tick 為 250，目前為 14，直接減會得到 −236。若使用 0～255、每格 1ms 的循環計數器，而且同次啟動內的間隔確定少於 256ms，經過時間應為 `256 - 250 + 14 = 20ms`。

但 276ms 也會得到相同的兩個讀值。本文的重點不是把負值修成正值，而是把「差值可算」與「量測前提成立」分開。範例在間隔保證不足或啟動世代不同時回報無效，不能把無效當零繼續等。

以下是 **Node.js 離線算術模型**，使用縮小的 8 位元時基，不是 PLC 計時器實測，也不是任何廠牌的指令。兩篇時間教學共用附件；[週期排程篇](/articles/plc-periodic-event-accumulated-timing-error)接續使用合法的相鄰差值，避免各自發明一套回繞規則。

## 下載與執行

需要 Node.js 22.13 或以上。把八檔存到同一個新資料夾，保留檔名，不需要 npm 安裝：

- [tick.mjs：差值與有效性](/examples/tick-scheduling/tick.mjs)
- [scheduler.mjs：週期排程模型](/examples/tick-scheduling/scheduler.mjs)
- [tick-demo.mjs：本篇固定案例](/examples/tick-scheduling/tick-demo.mjs)
- [schedule-demo.mjs：週期比較案例](/examples/tick-scheduling/schedule-demo.mjs)
- [tick-practice.mjs：本篇修改練習](/examples/tick-scheduling/tick-practice.mjs)
- [schedule-practice.mjs：週期修改練習](/examples/tick-scheduling/schedule-practice.mjs)
- [self-test.mjs：差值與排程斷言](/examples/tick-scheduling/self-test.mjs)
- [README.md：執行方式與範圍](/examples/tick-scheduling/README.md)

在該資料夾執行：

```sh
node tick-demo.mjs
node self-test.mjs
node tick-practice.mjs
```

第一條應完整印出：

```text
normal: OK elapsed=10 timeout15=WAIT
wrap: OK elapsed=20 timeout15=TIMEOUT
last tick: OK elapsed=1 timeout15=WAIT
full lap: INTERVAL_UNPROVEN elapsed=null timeout15=INVALID
hidden lap: INTERVAL_UNPROVEN elapsed=null timeout15=INVALID
restart: RESTART elapsed=null timeout15=INVALID
tick demo: PASS
```

第二條顯示 `timing self-test: PASS (65536 wrap pairs + scheduler boundaries)`。第三條以 JSON 顯示 `valid: true`、`elapsed: 20` 與 `timeout15: TIMEOUT`。PASS 代表附件的斷言成立，不代表目標 PLC 時基已量測。

若找不到模組，先核對八個檔案是否位於同一資料夾、是否被另存為 `.txt`。若改了輸入後失敗，保留輸入與錯誤訊息，不要刪掉斷言來通過測試。

## 把輸入契約填清楚

`tick-practice.mjs` 已填入 `start=250`、`now=14`、`gapBound=20`、`nowBoot='A'`。這裡所有單位都是毫秒，一個 Tick 等於 1ms。

| 欄位               | 本例                       | 移到 PLC 前要查的事                      |
| ------------------ | -------------------------- | ---------------------------------------- |
| bits               | 預設 8，範圍 1～32         | 時基實際有效位元，不只看變數名稱         |
| start／now         | 0～255 的整數              | 同一個時基、相同單位及有效品質           |
| startBoot／nowBoot | 教材預設 A；不同值表示重啟 | 真正的啟動識別來源，不能由大小比較猜測   |
| gapBound           | 外部保證的真實間隔上限 20  | 停止更新、斷點、停機等是否可能超過此上限 |
| 逾時門檻           | 15                         | 有效後才比較；大於或等於即逾時           |

**gapBound 不是另一種 Tick 算法，也不是程式量出來的真相。** 本教材因為知道自己注入的時間，所以能提供它。正式系統需要任務與監測設計給出可信上限，或使用更寬且行為明確的來源。不能先算出 20，再把 gapBound 填成 20，宣稱量測已被驗證。

預設 boot=A 同樣只是 fixture 便利值，不會偵測 PLC 重啟。若實際專案未能建立這兩項前提，這個模型不能替你補出證據。

## 對照公式與少一格的錯誤

```js
const modulus = 2 ** bits;
const delta = now >= start ? now - start : modulus - start + now;
```

8 位元的最大值是 255，模數是 **256**。250→255 為 5 格，255→0 還有 1 格，0→14 為 14 格，總共 20。若用 `255 - 250 + 14`，會少算回到零的那一格。

附件使用 JavaScript Number 的整數範圍做此算式，不使用會轉成有號 32 位元的位元運算。移植時要先確定中間型別能容納模數；32 位元時的模數 4294967296 不能存在 32 位元 UDINT 中。不要直接把 JavaScript 的運算規則套到 PLC 的轉型與溢位行為。

| 起點→目前 | 已知間隔上限 | 差值結果 | 15ms 門檻         |
| --------- | ------------ | -------- | ----------------- |
| 20→30     | 10           | 10，有效 | WAIT              |
| 250→14    | 20           | 20，有效 | TIMEOUT           |
| 255→0     | 1            | 1，有效  | WAIT              |
| 250→9     | 15           | 15，有效 | TIMEOUT，等號成立 |
| 250→250   | 256          | 無效     | INVALID，不當成 0 |

同一個 Tick 格內讀兩次可能差 0，並不表示物理時間完全沒經過。解析度限制不能靠把顯示單位改成微秒消除。

## 改動四次，驗證前提失效

每次由原版 `tick-practice.mjs` 開始，只改表內指定欄位，再執行 `node tick-practice.mjs`：

| 修改                                     | 預期 reason        | elapsed／timeout15 |
| ---------------------------------------- | ------------------ | ------------------ |
| 不改                                     | OK                 | 20／TIMEOUT        |
| `const gapBound = 276;`                  | INTERVAL_UNPROVEN  | null／INVALID      |
| `const nowBoot = 'B';`                   | RESTART            | null／INVALID      |
| `const gapBound = 19;`                   | INCONSISTENT_BOUND | null／INVALID      |
| `const now = 9;`、`const gapBound = 15;` | OK                 | 15／TIMEOUT        |

276 的案例不是函式從 250→14 偵測出了漏圈，而是外部已知間隔可能超過一圈，因此拒絕相信差值。即使目前大於起點也有相同問題：20→30 可能是 10ms，也可能是 266ms。

`self-test.mjs` 枚舉 256 個起點 × 256 個合法真實間隔，共 65536 組，確認少於一圈時公式成立；另測 32 位元最後一格、完整一圈、未知上限、重啟、錯誤輸入與門檻等號。這證明的是數學與模型行為，沒有證明現場提供的上限或 boot 可靠。

## 接進流程時，無效要獨立處理

流程至少分成 WAIT、TIMEOUT、INVALID。INVALID 應進入專案定義的「時間來源不可用」處置並保存原因，不能用零代替而讓等待永不逾時，也不能直接視作設備故障復歸完成。是否停止輸出屬於控制設計，附件只回報結果。

本篇是已知前進方向的經過時間差，前提為少於一整圈。若要對循環範圍內的未來截止時間做先後排序，常見方法還有半圈限制；那是另一個契約，不能把本文條件直接套上去。排程附件採相鄰合法差值累積成較寬時間軸，再比較目標時間。

[CODESYS 時間文件](https://content.helpme-codesys.com/en/LibDevSummary/date_time.html) 將 `SysTimeGetMs` 描述為毫秒解析度的 UDINT Tick；完整 32 位元範圍約 49.71 天。這只是 API 規格參考，本附件沒有呼叫該函式，也不能把它當作三菱 Q 系列指令。

實機驗收請另記 CPU／runtime／工程軟體版本、時基 API、解析度、啟動識別、最大更新間隔，以及重啟、任務停用、斷點與回繞附近的 Trace。本篇沒有原廠模擬或實機通過紀錄。

作者：茂伯。問題請寄 [ceo@hubplc.com](mailto:ceo@hubplc.com)，附執行命令、Node.js 版本及修改的輸入。
