---
title: 批次統計的最小值 最大值與平均 如何處理空批次
description: 用固定的整數縮放離線範例，重現空批次、全 Bad、負值、範圍拒收與筆數上限的批次統計結果。
date: 2026-09-28
author: 茂伯
draft: false
category: PLC 程式與控制
---

## 先固定資料契約，再算平均

下面的範例把工程值放大 10 倍後以整數保存：`-80` 代表 `-8.0`，`1800` 代表 `180.0`。累加、最小值和最大值全程使用整數；平均先保留為「縮放整數總和／筆數」的分數，最後才除以縮放倍率並顯示小數。因此 `-80,-30,-50` 的縮放平均是 `-160 / 3`，工程值是 `-160 / (3 × 10) = -16/3`，約 `-5.333333`；不依賴每筆浮點四捨五入。

本頁附的程式是**離線 JavaScript 驗算範例**，用來確認資料契約與預期結果；它不是 PLC 硬體實作、不是通訊程式，也不宣稱任何廠牌的指令、資料型別或掃描原子性。實際系統的保持區、鎖定、品質旗標和型別容量要由目標控制器與整合設備手冊確認。

| 固定規則 | 值 | 判讀 |
| --- | --- | --- |
| 縮放倍率 | 10 | 工程值 = `scaled / 10` |
| 每批輸入上限 | 4 筆 | 第 5 筆使整批回報 `INPUT_LIMIT_EXCEEDED`；不產生部分統計 |
| 可接受範圍 | `-400` 到 `1800`，含端點 | 即 `-40.0` 到 `180.0` |
| 總和可達範圍 | `-1600` 到 `7200` | 由範圍與 4 筆上限推得，不需猜測容量 |
| 有效樣本 | `quality === "GOOD"`、值是安全整數、且在上述範圍內 | 三個條件缺一不可 |

`inputCount` 是送進離線函式的輸入筆數；只有整批未超過上限時，`totalCount` 才等於已接受檢查的輸入筆數，並包含 Bad 與超範圍值。`validCount` 才是參與統計的筆數。品質、整數或範圍拒收會累加 `rejectedCount`，並留下 `QUALITY_REJECTED`、`VALUE_NOT_SAFE_INTEGER` 或 `RANGE_REJECTED` 原因。若 `inputCount=5`，結果為 `INPUT_LIMIT_EXCEEDED`、`totalCount=0`、`batchError=CAPACITY_LIMIT`，不把第五筆偷算成單筆拒收，也不保留前四筆的部分平均。

## 可直接執行的離線案例

下載 [可直接執行的離線 ZIP](/examples/batch-statistics/batch-statistics-offline-example.zip)，解壓後在資料夾根目錄執行：

```text
node public/examples/batch-statistics/run-example.mjs
node --test tests/batch-statistics.test.mjs
```

ZIP 保留 `public/examples/batch-statistics/` 的 [計算模組](/examples/batch-statistics/batch-statistics.mjs)、[固定輸入](/examples/batch-statistics/fixture.json)、[執行器](/examples/batch-statistics/run-example.mjs) 和 `tests/batch-statistics.test.mjs`。第一個指令只讀本機 `fixture.json`，列出每個批次的結果；不連 PLC、不發送網路請求、不寫入資料庫。第二個指令驗證下列邊界，任何一項改變時都能得到可重現的失敗訊息。

| fixture | 輸入 | 預期關鍵結果 |
| --- | --- | --- |
| `normal` | 100、200、300，均 Good | `sumScaled=600`、平均 `20.0`、min `10.0`、max `30.0` |
| `empty` | 無輸入 | `NO_DATA`；sum、mean、min、max 都是 `null` |
| `allBad` | 三筆值但品質非 Good | `NO_VALID_SAMPLE`；`totalCount=3`、`validCount=0` |
| `negative` | -80、-30、-50，均 Good | min `-8.0`、max `-3.0`、縮放平均 `-160/3`，工程平均 `-16/3` |
| `range` | -400、1800、1801，均 Good | 端點有效，`1801` 是 `RANGE_REJECTED` |
| `capacityAtLimit` | 四筆 1800 | `sumScaled=7200`，剛好是已定義的上界 |
| `capacityExceeded` | 五筆輸入 | `INPUT_LIMIT_EXCEEDED`，不產生部分統計結果 |

`sumScaled=0` 只在至少有一筆有效資料時才是統計值；它可能來自正負值相抵，也可能全部有效值都是零。當 `validCount=0`，範例一律輸出 `sumScaled`、`mean`、`minScaled`、`maxScaled` 為 `null`，避免把工作暫存的零誤報為量測結果。

## 移植到 PLC 前怎麼採用這個規則

先讓資料來源提供批次識別、樣本順序或時間邊界，並在每一筆到達時先套用品質、整數與工程範圍規則。只有有效樣本可更新累加與極值；第一筆有效樣本同時初始化 min 和 max，不能預設為零。結算時把同一時點的 `totalCount`、`validCount`、拒收原因和統計結果封存，才不會由下一批輸入改寫上一批報表。

若一批預期必須有 4 筆，收到 3 筆 Good 的數學平均仍可計算，但是否可標示完成要由製程需求另訂。本文僅判斷統計輸入是否符合固定規則，不把它當成產線完成、設備容量或通訊可靠性的證明。

排查請依序看：

1. `totalCount=0`：檢查批次觸發、時間邊界或來源是否送出資料。
2. `totalCount>0` 且 `validCount=0`：依拒收原因檢查品質旗標、整數轉換與工程範圍。
3. `INPUT_LIMIT_EXCEEDED`：不要採用部分平均；此範例會顯示 `inputCount` 和批次層級的 `CAPACITY_LIMIT`，先處理批次切分、緩衝或規格中的預期筆數。
4. `validCount>0` 但結果異常：回查縮放倍率、原始整數與 batch ID，而非先修改公式。

實際部署若需要小數解析、較大筆數、溢位偵測、重送去重或斷電復原，先把新的上限、拒收規則與驗收 fixture 一起加進測試；不要只把本頁常數放大後假定仍然安全。

## 常見問題

問：空批次的平均可否顯示 0？答：不可以。0 是可能的測量結果，空批次必須是 `NO_DATA`，並讓統計欄位維持未定義。

問：全 Bad 和空批次有何不同？答：全 Bad 有輸入，所以 `totalCount` 大於 0 且可從拒收原因追查；空批次的 `totalCount` 是 0。

問：範例為何不直接提供 PLC 程式？答：品質旗標、整數寬度、持久化與同步方式會隨控制器和架構改變。此範例只固定可驗算的資料行為，實作前需依實際平台設計。

## 延伸閱讀

- [PLC 型別轉換的小數 截斷與超範圍處理](/articles/plc-type-conversion-truncation-range)
- [不良品重測怎麼記錄 PLC 流程避免重算產量](/articles/plc-retest-yield-accounting)
