---
title: HMI 趨勢游標與事件標記如何協助回看一次異常
description: 用可執行離線模型區分 RAW、INTERPOLATED、OUTSIDE 與不可比較的事件時間。
date: 2026-09-17
author: 茂伯
draft: false
category: HMI 畫面與操作
---

## 先分開游標值與原始樣點

本篇是 Node.js 24.19+ 的離線讀圖契約，不是原生 HMI、historian、PLC 或事件平台。固定 raw 樣點是 1500ms=80、3000ms=62、6000ms=80。游標 3200ms 以兩個 Good 鄰點線性計算為 63.2，必須標為 `INTERPOLATED`；游標剛好在 3000ms 是 `RAW 62`。游標在外側不外推，任一鄰點 Bad 也不插值。

下載 [model.mjs](/examples/trend-cursor/model.mjs)、[fixtures.mjs](/examples/trend-cursor/fixtures.mjs)、[demo.mjs](/examples/trend-cursor/demo.mjs)、[self-test.mjs](/examples/trend-cursor/self-test.mjs)、[practice.mjs](/examples/trend-cursor/practice.mjs)、[README.md](/examples/trend-cursor/README.md)，放在同一資料夾後執行：

```powershell
node demo.mjs
node self-test.mjs
node practice.mjs
```

```text
cursor=3200 kind=INTERPOLATED value=63.2
cursor=3000 kind=RAW value=62
event comparable=true differenceMs=800
demo: PASS
```

## 事件時間只能在明示同域時比較

fixture 的 event source=3200ms、received=4000ms，且明確宣告 `sameClockDomain=true`，所以可算差 800ms。這只是來源與接收處理之間的教材差值，不叫 network latency。不同 clock domain 時，模型輸出 `comparable=false`、difference=null，不用畫面時間硬對齊。

## 自己移動游標，觀察資料身分如何改變

`practice.mjs` 只印出結果，請修改上方兩個參數並比對下表，不必改測試斷言。

| cursorMs | lastPointQuality | 預期 kind    | 預期 value |
| -------- | ---------------- | ------------ | ---------- |
| 4500     | Good             | INTERPOLATED | 71         |
| 3200     | Good             | INTERPOLATED | 63.2       |
| 3000     | Good             | RAW          | 62         |
| 7000     | Good             | OUTSIDE      | null       |
| 3200     | Bad              | UNAVAILABLE  | null       |
| 6000     | Bad              | UNAVAILABLE  | null       |

3200ms 夾在 3000ms=62 與 6000ms=80 之間。手算 `62+(80−62)×(3200−3000)/(6000−3000)=63.2`；移到4500ms時正好在中間，得到71。這兩個值都是讀圖估算，來源只有三筆原始樣點，程式沒有新增量測。

品質變Bad後，3200ms缺少可用的右鄰點，因此不插值；6000ms雖恰有原始列，該列品質不合格，仍不顯示為RAW有效值。若7000ms仍出現估算值，代表你已改變「不外推」契約，應另外標示，不能沿用本文驗收結果。

輸入點必須有嚴格欄位、最多32點、非負safe-integer毫秒時間、有限且絕對值不超過1000000的數值，以及唯一遞增時間。這裡的0ms是案例共同基準，不是自動取得的設備時間；實際資料需另外提供來源、查詢範圍與時鐘證據。

游標值僅供讀圖；不要把它寫回事件、當作新增量測或拿來證明因果。若要處理資料品質與舊值，另看 [HMI 品質 Bad 如何避免把舊值誤認新值](/articles/hmi-bad-quality-stale-value/)，兩個離線模型不可直接拼成實機系統。
