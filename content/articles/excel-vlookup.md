---
title: VLOOKUP 由左向右查表
description: 用員工編號在清單第一欄找人，再帶出右側的部門。本課固定使用完全相符。
author: 茂伯
draft: false
category: Excel 公式教學
tags: Excel, VLOOKUP, Excel 公式
---

本教學由作者茂伯編寫，並由作者在 Windows 版 Microsoft 365 與 Excel 2021 實際操作驗證。

用員工編號在清單第一欄找人，再帶出右側的部門。本課固定使用完全相符。

## 先準備範例資料

開啟空白活頁簿，依下表把資料輸入對應儲存格。A、B 等是欄名；1、2 等是列號。

| 列 | A | B | C | D |
| --- | --- | --- | --- | --- |
| 1 | 員工編號 | 姓名 | 部門 | 查詢編號 |
| 2 | E101 | 林怡君 | 行政 | E103 |
| 3 | E102 | 陳志宏 | 業務 | （空白） |
| 4 | E103 | 王雅婷 | 採購 | （空白） |
| 5 | E104 | 李家豪 | 倉儲 | （空白） |

「（空白）」表示不要輸入任何內容，也不要輸入這段文字。

## 輸入這個公式

在 E2 輸入以下公式，按 Enter。

```excel
=VLOOKUP(D2,A2:C5,3,FALSE)
```

正確結果：採購

語法：

```excel
=VLOOKUP(lookup_value,table_array,col_index_num,[range_lookup])
```

| 引數 | 代表什麼 |
| --- | --- |
| lookup_value | 要查詢的內容。本課是 D2 的員工編號。 |
| table_array | 查詢資料範圍。本課是 A2:C5；編號必須位於這個範圍最左欄。 |
| col_index_num | 要傳回範圍中的第幾欄，從 1 開始數。本課 A、B、C 分別是第 1、2、3 欄，所以填 3。 |
| [range_lookup] | 選填，但本課務必填 FALSE，表示完全相符。FALSE 是邏輯值，不加引號。 |

公式請使用英文名稱及半形標點；若系統以分號分隔引數，請依 Excel 提示改用分號。語法中的方括號表示選填，不必輸入。

## 照著做並核對畫面

1. 在空白工作表的 A1:D5 輸入上表，確認 D2 是 E103。
2. 在 E1 輸入「查詢部門」，再點選 E2。
3. 在 E2 輸入 =VLOOKUP(D2,A2:C5,3,FALSE)，按 Enter。
4. 重新點選 E2，確認顯示「採購」，並對照 C4。

<img src="/images/excel-formulas/excel-vlookup.png" alt="VLOOKUP 範例資料及公式結果的 Excel 網頁版實際操作畫面" width="900" height="465" loading="lazy">

圖 1　Excel 網頁版實際操作畫面

公式在 A2:C5 的第一欄 A 欄找到 E103，再傳回該列第 3 欄 C 欄的「採購」。最後的 FALSE 要求編號完全相符，因此不必先將編號排序。

## 常見錯誤

- 省略最後的 FALSE：預設會使用近似比對，可能查到非預期資料。
- 把欄號當成整張工作表的欄號：欄號應從所選查詢範圍的最左欄開始數。
- 把要查的編號放在範圍中間：編號必須在範圍最左欄，才能向右取回資料。

## 自己試一次

把 D2 從 E103 改為 E102，E2 應顯示哪個部門？

參考答案：

```excel
=VLOOKUP(D2,A2:C5,3,FALSE)
```

結果：業務。E102 在 A3，查詢範圍的第 3 欄是 C 欄，所以傳回 C3 的「業務」。

## 官方參考

[Microsoft Support：VLOOKUP 函數](https://support.microsoft.com/zh-tw/excel/functions/vlookup-function)
