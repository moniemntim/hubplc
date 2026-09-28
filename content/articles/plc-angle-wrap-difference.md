---
title: PLC 角度跨越零點的差值計算
description: 用可下載的角度模型重現 358°→2°、半圈歧義、取樣中斷與區段累積，附固定輸出、修改練習及完整邊界測試。
date: 2026-09-17
author: 茂伯
draft: false
---

## 先跑出跨零點的正負差值

358°→2° 直接相減是 −356°，兩個方向之間的最短差卻是 +4°。反向 2°→358° 為 −4°。本文用可執行案例分開處理「最短幾何差」與「能否當作實際位移累加」，避免把兩筆單圈角度誤認為多圈位置。

這是 **Node.js 離線數學模型**，不連 PLC、編碼器或伺服。正方向定義為角度增加，所有角度單位為度；沒有驗證實體旋轉方向、限位或可通行路徑。+4° 不是馬達運動許可。

## 下載與執行

需要 Node.js 22.13 或以上。八檔放同一個新資料夾，不需要 npm 安裝；其中 curve 檔供[查表篇](/articles/plc-table-piecewise-linear-interpolation)與共用自測使用。

- [angle.mjs：正規化、最短差與取樣追蹤](/examples/geometry-table/angle.mjs)
- [curve.mjs：查表模型](/examples/geometry-table/curve.mjs)
- [angle-demo.mjs：本篇固定輸出](/examples/geometry-table/angle-demo.mjs)
- [curve-demo.mjs：查表固定輸出](/examples/geometry-table/curve-demo.mjs)
- [angle-practice.mjs：本篇修改練習](/examples/geometry-table/angle-practice.mjs)
- [curve-practice.mjs：查表修改練習](/examples/geometry-table/curve-practice.mjs)
- [self-test.mjs：邊界斷言](/examples/geometry-table/self-test.mjs)
- [README.md：輸入契約與限制](/examples/geometry-table/README.md)

在該資料夾執行：

```sh
node angle-demo.mjs
node self-test.mjs
node angle-practice.mjs
```

第一條完整輸出應為：

```text
358->2: raw=-356 delta=4 tie=false
2->358: raw=356 delta=-4 tie=false
0->180: raw=180 delta=180 tie=true
180->0: raw=-180 delta=180 tie=true
359.5->0.5: raw=-359 delta=1 tie=false
at=0: BASELINE delta=null segment=0
at=100: TRACKED delta=4 segment=4
at=700: HALF_TURN_UNPROVEN delta=null segment=null
at=800: BASELINE delta=null segment=0
at=900: TRACKED delta=2 segment=2
```

第二條顯示 `geometry self-test: PASS (129600 angle pairs + tracker and curve cases)`。第三條輸出 JSON，應有 `state: TRACKED`、`delta: 4`、`segmentTotal: 4`。若找不到模組，先檢查八檔是否齊全、是否被存成 `.txt`。PASS 是離線斷言結果，不是設備測試通過。

## 幾何函式為什麼把半圈都算成正值

`normalize()` 先把輸入整理到 `[0,360)`，例如 −10→350、725→5。`shortest(previous,current)` 保存整理後的原始差 raw，再修正一次：

```js
if (delta > 180) delta -= 360;
else if (delta <= -180) delta += 360;
```

因此輸出為 `(-180,180]`。0→180 與 180→0 都得到 +180，並回傳 `tie: true`；這是本篇明訂的平手規則，**不是證明兩次運動都向正方向**。45→45 為 0；359.5→0.5 為 +1。

不要把所有負值都加 360，否則 −4 會被改成 +356，已經不是最短有號差。也不要把正規化後的角度當作圈數：725° 正規化為 5° 時，兩整圈資訊已不在結果內。

附件只接受有限數字且絕對值不大於 1e9 度，拒絕 NaN、Infinity、字串與更大的輸入。這是教材範圍，不是編碼器規格。JavaScript 浮點解析度仍有限；極小負數加 360 若捨入到 360，模型改成 0，沒有保證任意小差值都能保留。

## 累積前先證明沒有漏掉半圈

`AngleTracker(360)` 宣告最大速度為 360°/s。相鄰兩筆時間差 100ms，最大可能移動為 36°，嚴格小於 180°，才允許使用最短差累積。上限是外部提供的物理前提，不是模型從兩筆角度推導出來的。

固定案例的時間線：

| 時間 ms | 角度 | 判斷                              | 區段累計        |
| ------- | ---- | --------------------------------- | --------------- |
| 0       | 358  | 第一筆只建 BASELINE               | 0，沒有有效差值 |
| 100     | 2    | 100ms×360°/s=36°；差 +4 可採用    | 4               |
| 700     | 10   | 中斷 600ms，可能走 216°；前提失效 | null            |
| 800     | 12   | 重新建立基準，不跨中斷計算        | 0               |
| 900     | 14   | 新區段差 +2                       | 2               |

最後的 2 不能說成「從 358° 開始只轉了 2°」；它只屬於 800ms 之後的連續區段。若需要停電後仍可靠的多圈位置，要另有合適的位置來源與復原設計。

350→10 的最短差雖然是 +20，也可能真的走了 +380 或 −340。若實際速度上限、取樣間隔、掉包與時間品質未能保證，函式不會替你找回路徑。不要用平滑濾波把錯誤的累積曲線變得好看。

## 改三次輸入，看失效邊界

每次從原版 `angle-practice.mjs` 開始，只改指定欄位後執行 `node angle-practice.mjs`。起點固定為 358°／0ms，新值固定為 2°。

| 修改                        | 預期 state         | delta／segmentTotal        |
| --------------------------- | ------------------ | -------------------------- |
| 不改：gap=100、quality=Good | TRACKED            | 4／4                       |
| `const gap = 500;`          | HALF_TURN_UNPROVEN | null／null；等於半圈也拒絕 |
| `const gap = 0;`            | TIME_INVALID       | null／null；重複時間不累加 |
| `const quality = 'Bad';`    | QUALITY_INVALID    | null／null                 |

若兩筆移動的最短差已大於「速度上限×間隔」，模型回報 `SPEED_INCONSISTENT`，比較另留 1e-9 度數值容差。boot 不同則回報 `RESTART`。上述失效都清除基準，下一筆有效樣本只建 BASELINE，不會以失效前的角度接著算。

quality、boot 與單調毫秒時間都是測試資料，沒有實作真實通訊診斷、PLC 重啟偵測或 Tick 回繞。若來源是有限位元 Tick，先依[Tick 回繞案例](/articles/plc-tick-wrap-elapsed-time)建立有效時間，再供取樣判斷使用。

## 驗收與移植時要留下什麼

自測枚舉 360×360 共 129600 組整數方向，核對輸出範圍、方向正規化與非半圈的反向對稱；另測小數、負值、半圈、掉樣、重新建立基準、品質中斷、重啟及速度矛盾。它不涵蓋編碼器雜訊、機械路徑或原廠運動控制。

移植時保留輸入角度、單位、時間差、raw、delta、有效狀態與區段累計，另記實際速度上限來源及正方向定義。若方向相反，先查新舊順序與設備設定；高速才錯，先查實際間隔與漏樣；每次跨零點錯，先查輸入範圍與半圈條件。

[CODESYS MOD 文件](https://content.helpme-codesys.com/en/CODESYS%20Development%20System/_cds_operator_mod.html) 列出的支援型別為整數類型，不能直接當作 REAL 小數角度的通用取餘指令。本文 JavaScript 實作尚未在 CODESYS、Q 系列或其他 PLC 編譯／實測，型別與數值行為需另行確認。

作者：茂伯。問題請寄 [ceo@hubplc.com](mailto:ceo@hubplc.com)，附前後角度、實際間隔、速度上限與輸出，並註明離線資料或設備量測。
