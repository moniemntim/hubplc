---
title: HMI數值輸入：精確檢查範圍與步距，再轉成整數
description: 下載 Node.js 範例，重播 0..100.0°C、0.1 步距、wire 0..1000 的文字與 raw envelope 雙入口驗證。
date: 2026-09-21
author: 茂伯
draft: false
category: HMI 畫面與操作
---

## 固定資料契約與兩個入口

這個離線案例的 canonical 資料契約固定為 `schema=numeric-input/v1`、`unit=C`、`scale=10`。此 schema 的 scale 定義是 **wire = 工程值 × 10**，反向為 **工程值 = wire ÷ 10**；它不是另一個含糊的「工程倍率 0.1」。工程值文字是 **0..100.0°C** 的閉區間，步距是 **0.1°C**，wire 是 **0..1000** 的整數；例如 wire `253` 表示 25.3°C。它沒有連到 HMI、server、PLC 或控制輸出。

工程文字入口只接受最多 16 個 ASCII 字元的 `^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$`：不接受空字串、前後空白、`+`／`-`、leading zero、逗號小數點、科學記號、單位後綴或文字。尾零合法，`25.30` 與 `25.3` 都等價。這是本欄位的契約，並不是 locale 顯示規則；畫面若要顯示 `25,3`，不能把那個字串直接送入此入口。

文字解析保留十進位的整數 numerator 和 denominator，以 `BigInt` 判斷範圍及 `value × 10` 是否正好是整數，不使用浮點 epsilon。ECMAScript 對 [`BigInt`](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-bigint-objects) 的規格是此模型的數值運算來源。這只證明這份 Node.js 模型的行為，不能代替任何設備、HMI 元件或實際 server 的驗證。

raw envelope 是另一個入口，不能把文字結果當作它的驗證。它只能有 `schema`、`unit`、`scale`、`raw` 四個 **own enumerable** 欄位：array、缺欄位、extra 欄位、inherited 欄位或 non-enumerable 額外欄位都回 `RAW_ENVELOPE_REJECTED`。通過 shape 後，`raw` 還必須是 JavaScript `number` 的 safe integer，並逐項比對 schema、unit、scale 和 raw 範圍。實際 server 必須獨立重做同一組檢查；本下載程式只模擬這條 server boundary，沒有啟動 server。

## 下載、執行與固定輸出

下載同一資料夾的[模型](/examples/numeric-input/numeric-input-model.mjs)、[fixture](/examples/numeric-input/fixture.json)、[demo](/examples/numeric-input/demo.mjs)、[獨立自測](/examples/numeric-input/self-test.mjs)和[README](/examples/numeric-input/README.md)。本機以 Node.js 24.19.0 核對；使用該版本或更新版本。

```powershell
node demo.mjs
node --test self-test.mjs
```

```text
dataset=numeric-input-synthetic-v1 synthetic=true
contract_schema=numeric-input/v1 unit=C scale=10 engineering=0..100.0C step=0.1 wire=0..1000
entry=engineering id=text_range text=100.04 decision=RANGE_REJECTED last_wire=250 last_engineering=25.0
entry=engineering id=text_step text=25.35 decision=STEP_REJECTED last_wire=250 last_engineering=25.0
entry=engineering id=text_exact text=25.30 decision=ACCEPT last_wire=253 last_engineering=25.3
entry=raw id=raw_string raw=253 raw_type=string decision=RAW_TYPE_REJECTED last_wire=253 last_engineering=25.3
entry=raw id=raw_exact raw=7 raw_type=number decision=ACCEPT last_wire=7 last_engineering=0.7
```

失敗時 model 回傳既有 `lastWire`，不會寫入 0、round 或 clamp。前兩列可看出順序：`100.04` 的精確值大於 100.0，因此先是 `RANGE_REJECTED`；`25.35` 在範圍內，才是 `STEP_REJECTED`。`25.30` 的 numerator/denominator 剛好導出 wire `253`，所以接受。

## 可直接改 fixture 重跑

複製 `fixture.json` 後，修改 `engineering` 的 `text_exact`，再執行 `node demo.mjs`：

1. 改為 `"0"`，預期 `decision=ACCEPT` 且 `last_wire=0`。
2. 改為 `"100.0"`，預期 `decision=ACCEPT` 且 `last_wire=1000`。
3. 改為 `"25.35"`，預期 `decision=STEP_REJECTED`，前一筆有效 wire 保持不變。

將文字還原成 `"25.30"` 後，改 `raw_exact.envelope.raw` 為字串 `"7"`，會得到 `RAW_TYPE_REJECTED`；它不是文字入口的重新解析。改回 JSON number `7` 才接受。最後還原 fixture，才能再次得到上方的固定 stdout。

## 原因判讀與限制

| decision                                             | 已知原因                                         | last value |
| ---------------------------------------------------- | ------------------------------------------------ | ---------- |
| `SYNTAX_REJECTED`                                    | 字串不符合 ASCII、長度、空白、符號或 locale 規則 | 保留       |
| `RANGE_REJECTED`                                     | 工程文字不在 0..100.0，或 raw 不在 0..1000       | 保留       |
| `STEP_REJECTED`                                      | 工程文字在範圍內，但不能精確映射 0.1 步距        | 保留       |
| `RAW_ENVELOPE_REJECTED`                              | raw envelope 不是精確四個 own enumerable 欄位    | 保留       |
| `RAW_TYPE_REJECTED`                                  | raw 不是 safe integer number                     | 保留       |
| `SCHEMA_REJECTED`、`UNIT_REJECTED`、`SCALE_REJECTED` | raw envelope 契約欄位不符                        | 保留       |

本例採 reject policy。若產品要 round、clamp、替代值或寫入重試，必須另定明確事件、原值、導出值與權限規則；不能把它宣稱成這個模型已接受的輸入。實作時也要另定資料世代、並發更新、認證、實際 wire 型別與 PLC／server 手冊所要求的編碼。

Node.js 的 [`node:test`](https://nodejs.org/docs/latest-v24.x/api/test.html) 文件是下載範例所用測試 API 的官方來源；本篇的 schema、unit、range 和 scale 則是刻意固定的教材契約，不是通用產業標準。

## 延伸閱讀

- [binary32 特殊值：先解碼，再用有限性、品質與範圍決定可用性](/articles/float-nan-inf-control-gate)
- [批次配方欄位缺漏如何產生完整錯誤清單](/articles/recipe-schema-complete-error-list)
