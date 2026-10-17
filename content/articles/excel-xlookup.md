---
title: XLOOKUP 依代碼查找資料
description: 輸入商品代碼，自動帶出對應單價。本課適用於 Windows 版 Microsoft 365 與 Excel 2021；Excel 2016／2019 無法使用此函數。
author: 茂伯
draft: false
category: Excel 公式教學
tags: Excel, XLOOKUP, Excel 公式
---

本教學由作者茂伯編寫，並由作者在 Windows 版 Microsoft 365 與 Excel 2021 實際操作驗證。

輸入商品代碼，自動帶出對應單價。本課適用於 Windows 版 Microsoft 365 與 Excel 2021；Excel 2016／2019 無法使用此函數。

## 先準備範例資料

開啟空白活頁簿，依下表把資料輸入對應儲存格。A、B 等是欄名；1、2 等是列號。

| 列 | A | B | C | D |
| --- | --- | --- | --- | --- |
| 1 | 商品代碼 | 商品名稱 | 單價 | 查詢代碼 |
| 2 | P101 | 便條紙 | 32 | P102 |
| 3 | P102 | 筆記本 | 45 | （空白） |
| 4 | P103 | 原子筆 | 18 | （空白） |
| 5 | P104 | 資料夾 | 60 | （空白） |

「（空白）」表示不要輸入任何內容，也不要輸入這段文字。

## 輸入這個公式

在 E2 輸入以下公式，按 Enter。

```excel
=XLOOKUP(D2,A2:A5,C2:C5)
```

正確結果：45

語法：

```excel
=XLOOKUP(lookup_value,lookup_array,return_array,[if_not_found],[match_mode],[search_mode])
```

| 引數 | 代表什麼 |
| --- | --- |
| lookup_value | 要找的內容。本課用 D2 的商品代碼。 |
| lookup_array | 在哪裡找。本課用 A2:A5 的代碼清單。 |
| return_array | 找到後傳回哪一欄。本課用 C2:C5 的單價，列數須與查找範圍相同。 |
| [if_not_found] | 選填。指定找不到時顯示的內容；本課省略，找不到會顯示 #N/A。 |
| [match_mode] | 選填。本課省略，預設為 0，代表完全相符。 |
| [search_mode] | 選填。本課省略，預設由第一筆往下找；有重複代碼時傳回第一筆。 |

公式請使用英文名稱及半形標點；若系統以分號分隔引數，請依 Excel 提示改用分號。語法中的方括號表示選填，不必輸入。

## 照著做並核對畫面

1. 在空白工作表的 A1:D5 輸入上表，確認 D2 是 P102。
2. 在 E1 輸入「查詢單價」，再點選 E2。
3. 在 E2 輸入 =XLOOKUP(D2,A2:A5,C2:C5)，按 Enter。
4. 重新點選 E2，確認結果為 45，並對照 C3 的單價。

<img src="/images/excel-formulas/excel-xlookup.png" alt="XLOOKUP 範例資料及公式結果的 Excel 網頁版實際操作畫面" width="900" height="465" loading="lazy">

圖 1　Excel 網頁版實際操作畫面

D2 的 P102 在 A3 被找到，所以傳回同一列 C3 的 45。查找範圍與結果範圍分開指定，順序必須一一對應。本課只填前三個引數，使用預設的完全相符。

## 常見錯誤

- 查找範圍與結果範圍列數不同，或兩個範圍起始列不一致：本課都應從第 2 列到第 5 列。
- 出現 #N/A 時，先檢查 D2 的代碼是否存在，以及有沒有多餘空格或文字、數字類型不一致。
- 在 Excel 2016／2019 開啟後以為只是拼字錯誤：這兩個版本不支援 XLOOKUP，請使用本課指定版本。

## 自己試一次

把 D2 從 P102 改為 P104，E2 應顯示多少？

參考答案：

```excel
=XLOOKUP(D2,A2:A5,C2:C5)
```

結果：60。公式不必修改。P104 在 A5，因此傳回同一列 C5 的 60。

## 官方參考

[Microsoft Support：XLOOKUP 函數](https://support.microsoft.com/zh-tw/excel/functions/xlookup-function)
