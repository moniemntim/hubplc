---
title: 多語系與溫度單位切換：保留原值及編輯語境
description: 下載 Node.js 案例，重現 25.3°C 的英文、德文與華氏顯示，驗證切換不改 raw，並精確拒絕不符合步距的輸入。
date: 2026-09-21
author: 茂伯
draft: false
category: HMI 畫面與操作
---

## 先看要避免的錯誤

設備設定是 25.3°C，畫面切成德文顯示 `25,3`，切成華氏顯示 `77.5°F`。如果程式把顯示文字重新解析、覆蓋原值，來回切換就可能讓設定漂移。這個案例始終保存整數 `raw=253`；只有明確確認輸入才改 raw。

本文在 Node.js 24.19 執行自訂編輯模型，實際呼叫 `Intl.NumberFormat`。沒有連接 HMI、PLC 或設備，也沒有驗證原廠輸入元件。範圍與步距沿用[數值輸入案例](/articles/hmi-numeric-range-step-validation)，不另複製一套驗證規則。

## 固定資料契約

| 項目           | 本例設定                                                             |
| -------------- | -------------------------------------------------------------------- |
| canonical 單位 | °C                                                                   |
| 範圍／步距     | 0～100°C／0.1°C                                                      |
| 傳輸物件       | `{ "schema":"numeric-input/v1", "unit":"C", "scale":10, "raw":253 }` |
| scale 定義     | `raw = °C × 10`，所以 253 表示 25.3°C                                |
| 支援輸入語系   | `en-US` 用小數點；`de-DE` 用小數逗號                                 |
| 支援輸入單位   | `C`、`F`；語系與單位必須已知                                         |
| 文字限制       | 最多 16 字元，ASCII 數字；不接受千分位、空白、正負號、指數及單位後綴 |
| 顯示           | 固定一位小數，不分組；格式化文字不回寫 raw                           |

這是窄範圍教材契約，不是完整國際化數字解析器。`-40` 雖可用於溫度公式驗算，並非這個 0～100°C 設定欄的合法輸入。外部 CSV 來源語系不明時，不能默認成目前畫面語系。

## 下載並執行

把以下檔案存進同一個空資料夾，保留檔名：

- [numeric-input-model.mjs](/examples/numeric-input/numeric-input-model.mjs)：共用範圍、步距與 raw 驗證。
- [locale-model.mjs](/examples/numeric-input/locale-model.mjs)：語系解析、精確換算與編輯狀態。
- [locale-demo.mjs](/examples/numeric-input/locale-demo.mjs)：固定操作順序。
- [locale-self-test.mjs](/examples/numeric-input/locale-self-test.mjs)：包含全部 1001 個合法 raw 的往返測試。
- [locale-README.md](/examples/numeric-input/locale-README.md)：執行說明。

```powershell
node --version
node locale-demo.mjs
node --test locale-self-test.mjs
```

本機驗證版本為 `v24.19.0`。第一段輸出應為：

```text
en-US/C: 25.3 °C; raw=253
de-DE/C: 25,3 °C; raw=253
en-US/F: 77.5 °F; raw=253
en-US/C: 25.3 °C; raw=253
```

四次顯示的 raw 都是 253。如果回到 °C 後變成其他值，先找是否把格式化後的 `77.5` 當成儲存值；切換顯示不應呼叫輸入確認。

## 解析結果要連同語系與單位判讀

| 文字    | 輸入語系／單位 | 預期結果                      |
| ------- | -------------- | ----------------------------- |
| `25,3`  | de-DE／C       | ACCEPT，raw=253               |
| `25,3`  | en-US／C       | SYNTAX_REJECTED               |
| `1,234` | 未知／C        | CONTEXT_REJECTED              |
| `1,234` | de-DE／C       | 解析為 1.234°C，STEP_REJECTED |
| `77.5`  | en-US／F       | STEP_REJECTED                 |
| `77.54` | en-US／F       | ACCEPT，raw=253               |

已知 de-DE 下，`1,234` 的意義是小數，不是 1234。仍被拒絕是因為不符合 0.1°C 步距；不能把格式錯誤、範圍錯誤、步距錯誤合成一個模糊提示。

華氏轉攝氏用 `(F − 32) × 5 / 9`。`77.54°F` 正好是 `25.3°C`；`77.5°F` 約為 `25.2778°C`，不符合步距。模型把十進位字串轉成 BigInt 分子／分母，檢查範圍與整除後才轉成小整數，不先四捨五入來湊步距。顯示 77.5°F 不代表輸入 77.5°F 能無損還原原值。

## 重現編輯中切換

demo 接著執行這五步：

1. 初值 raw=253，開始編輯 `26,0`，保存輸入語境 `de-DE/C`。
2. 畫面切成 `en-US/F`。顯示仍是 77.5°F，raw 仍為 253，草稿仍為 `26,0`／de-DE／C。
3. 明確呼叫 `confirm()`，依草稿保存的語境解析，得到 raw=260。
4. 畫面依目前 en-US/F 顯示 `78.8 °F`，草稿清空。
5. 另開 `99.0` 草稿後取消，raw 仍為 260。

這是本例選定的互動政策：切換只改顯示，確認採原輸入語境。實際 HMI 應在草稿旁持續顯示「輸入：de-DE／°C」，避免操作員以為文字已改成華氏。模型沒有視覺元件，也沒有實作設備寫入。

確認被拒絕時，原值與草稿都保留；需要取消後重新開始，不能偷偷採用新畫面語境。`inspect()` 回傳草稿副本，修改診斷輸出不會更動內部草稿。

## 改一個輸入再驗證

把 `locale-demo.mjs` 的 `editor.begin('26,0', 'de-DE', 'C')` 改成 `editor.begin('26,5', 'de-DE', 'C')` 後重跑。確認前仍應是 raw=253；確認結果改成 raw=265，顯示 `79.7 °F`，取消後仍為 265。若把相同文字的輸入語系改成 en-US，確認應拒絕並保留 raw=253。

自我測試涵蓋全部 0～1000 raw 的精確華氏往返、四種顯示組合不改原值、未知語境、非法字元、範圍／步距、草稿確認及取消。它不證明 HMI 鍵盤、貼上事件或後端 API 已套用同樣政策；接設備時仍需記錄提交 payload 與讀回值。

## 來源與延伸

- [ECMA-402 NumberFormat](https://tc39.es/ecma402/#sec-intl.numberformat)：本例使用數字格式化功能；輸入解析是本文自訂政策。
- [NIST 溫度單位](https://www.nist.gov/pml/owm/si-units-temperature)：攝氏／華氏換算關係；不替本文的範圍及步距背書。
- [多人編輯與版本衝突](/articles/hmi-concurrent-edit-last-writer-version)：若草稿期間其他人已改值，需要額外處理版本衝突。
