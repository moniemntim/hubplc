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

## 頁面內手算：先判資料身分，再讀數值

這是**離線教材**，不是對真實 HMI、PLC、historian 或量測鏈的驗證。你不必下載程式；用下表的固定資料完成一次游標判讀。輸入欄位的來源與量測點如下：

| 欄位 | 本例輸入 | 來源與量測點 | 用途 |
| --- | --- | --- | --- |
| 游標時間 `cursorMs` | `3200 ms` | 操作者在本例趨勢時間軸選的位置；時間軸以案例共同的 `0 ms` 為基準 | 決定要找原始點或左右鄰點 |
| 左原始樣點 | `3000 ms = 62`、`Good` | 固定 fixture 的趨勢樣點；量測點是該 tag 在 3000 ms 的已記錄值 | 內插左端 |
| 右原始樣點 | `6000 ms = 80`、`Good` | 固定 fixture 的趨勢樣點；量測點是同一 tag 在 6000 ms 的已記錄值 | 內插右端 |
| 樣點品質 | `Good` | 隨各樣點保存的品質欄位；不是游標位置另量到的品質 | 決定能否顯示 RAW 或內插值 |

操作步驟：

1. 先看 `3200` 是否剛好等於一個樣點時間。它不等於 1500、3000、6000，因此不是 `RAW`。
2. 找到相鄰的 3000 ms 與 6000 ms；兩者都是 `Good`，才可在這一段內插。
3. 代入 `62 + (80 − 62) × (3200 − 3000) / (6000 − 3000)`，得到 `63.2`。
4. 結果應記為 `INTERPOLATED 63.2`，不可標成新量測或原始樣點。

完整案例的結果是：游標 3200 ms 位於兩個 Good 原始點之間，所以顯示 `INTERPOLATED 63.2`。若將游標改為 3000 ms，量測點正好存在，結果是 `RAW 62`；改為 7000 ms 時已在最後一點外側，結果是 `OUTSIDE / null`，不可外推。若把 6000 ms 的品質改成 `Bad`，3200 ms 的結果改為 `UNAVAILABLE / null`，因為右鄰點不再可用。

常見錯誤是把 `INTERPOLATED` 當作感測器的新讀值、在 7000 ms 仍延長直線，或只檢查游標附近而忽略左右任一點的品質。下一步應回查實際趨勢查詢的 tag、時間範圍、來源時鐘與每筆品質；本頁固定樣點不能替代那些現場證據。

## 延伸：下載後重播固定案例

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

## 延伸練習：自己移動游標，觀察資料身分如何改變

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
