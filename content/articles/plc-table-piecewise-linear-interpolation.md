---
title: PLC 查表與分段線性插值
description: 執行五點合成曲線案例，驗證節點、中點與區間邊界，並重現重複 X 拒絕、超量程、整表換版及舊版本衝突。
date: 2026-09-17
author: 茂伯
draft: false
---

## 用同一份五點表算出 14 EU

輸入 X=150，左右校正點為 (100,8) 與 (200,20)，比例是 `(150−100)/(200−100)=0.5`，所以 Y=8+0.5×12=14 EU。不能先做整數除法得到 0，也不能用整條曲線的兩端取代局部線段。

本篇提供 **Node.js 離線查表模型**。X 是合成 count，Y 是合成 EU；五點都不是感測器校正實測。模型正確只能證明依給定表執行插值，不能證明量測精度、溫漂或實際製程。

| 索引 | X count | Y EU |
| ---- | ------- | ---- |
| 0    | 0       | 0    |
| 1    | 100     | 8    |
| 2    | 200     | 20   |
| 3    | 300     | 35   |
| 4    | 400     | 55   |

例如只取兩端做 Y=55×X/400，X=200 會變成 27.5，已偏離原表的 20。分段插值應保留全部原始節點。

## 下載並執行固定案例

需要 Node.js 22.13 或以上。八檔存同一個新資料夾，不需 npm 安裝；angle 檔供[角度篇](/articles/plc-angle-wrap-difference)與共用自測使用。

- [curve.mjs：查表與整表換版](/examples/geometry-table/curve.mjs)
- [angle.mjs：角度模型](/examples/geometry-table/angle.mjs)
- [curve-demo.mjs：本篇固定輸出](/examples/geometry-table/curve-demo.mjs)
- [angle-demo.mjs：角度固定輸出](/examples/geometry-table/angle-demo.mjs)
- [curve-practice.mjs：本篇修改練習](/examples/geometry-table/curve-practice.mjs)
- [angle-practice.mjs：角度修改練習](/examples/geometry-table/angle-practice.mjs)
- [self-test.mjs：節點、區間及失敗斷言](/examples/geometry-table/self-test.mjs)
- [README.md：輸入契約與限制](/examples/geometry-table/README.md)

在該資料夾執行：

```sh
node curve-demo.mjs
node self-test.mjs
node curve-practice.mjs
```

第一條完整輸出為：

```text
x=0: NODE y=0 version=1
x=50: INTERPOLATED y=4 version=1
x=125: INTERPOLATED y=11 version=1
x=150: INTERPOLATED y=14 version=1
x=175: INTERPOLATED y=17 version=1
x=199: INTERPOLATED y=19.88 version=1
x=200: NODE y=20 version=1
x=201: INTERPOLATED y=20.15 version=1
x=250: INTERPOLATED y=27.5 version=1
x=350: INTERPOLATED y=45 version=1
x=400: NODE y=55 version=1
x=401: OUT_OF_RANGE y=null version=1
bad replacement: TABLE_ERROR y150=14
good replacement: COMMITTED y150=28 version=2
stale replacement: VERSION_CONFLICT
```

第二條顯示 `geometry self-test: PASS (129600 angle pairs + tracker and curve cases)`；其中 129600 指共用角度檢查，不是校正點數。第三條 JSON 應包含 `left:1,right:2,ratio:0.5,y:14,version:1`。若找不到模組，檢查附件是否齊全與副檔名，不要只看手算答案就宣稱程式通過。

## 沿著區間索引檢查公式

模型先完整驗證曲線，再拒絕無效品質、錯誤單位與超量程輸入。剛好命中節點時直接回傳該 Y，left 與 right 相同、ratio=0。X=400 因此使用索引 4，不讀不存在的索引 5。

其他輸入找第一個 X 大於輸入的右點，左點為 right−1，再計算：

```js
const ratio = (x - xLeft) / (xRight - xLeft);
const y = yLeft + ratio * (yRight - yLeft);
```

| 輸入 | left／right | ratio | y              |
| ---- | ----------- | ----- | -------------- |
| 125  | 1／2        | 0.25  | 11             |
| 175  | 1／2        | 0.75  | 17             |
| 199  | 1／2        | 0.99  | 19.88          |
| 200  | 2／2        | 0     | 20，直接取節點 |
| 201  | 2／3        | 0.01  | 20.15          |

199 與 201 能檢查節點兩側是否切到正確線段；125 與 175 則能抓出「每次只取兩端平均」的假插值。固定輸出為方便比對，最多顯示六位小數；模型保留 Number 計算結果，不把顯示格式當成取整政策。

## 修改輸入，確認異常不被補成零

每次先還原 `curve-practice.mjs`，只改表內指定一項後執行 `node curve-practice.mjs`：

| 修改                     | 預期 state      | y    |
| ------------------------ | --------------- | ---- |
| 不改：x=150              | INTERPOLATED    | 14   |
| `const x = 250;`         | INTERPOLATED    | 27.5 |
| `const x = 400;`         | NODE            | 55   |
| `const x = 401;`         | OUT_OF_RANGE    | null |
| `const quality = 'Bad';` | QUALITY_INVALID | null |
| `const unit = 'mA';`     | UNIT_MISMATCH   | null |

此表固定 X 單位 count、Y 單位 EU；相同數字換成 mA 不自動當成同一物理量。超量程既不外插也不裁切到端點；null 配合 valid=false 表示沒有可用結果。若要保持最後有效值，必須另帶時間與品質，不能把舊值冒充這次插值成功。

## 換表成功與失敗都要驗證

`curve-demo.mjs` 後半段依序做三件事：

1. 把候選表第三點的 X 改為 100，與第二點重複。`replace(candidate,1)` 回傳 TABLE_ERROR；原工作表仍為版本 1，X=150 仍算 14。
2. 用完整五點表將所有 Y 加倍，帶預期版本 1 提交。驗證通過後整表複製，版本成為 2，X=150 改算 28。
3. 再帶舊的預期版本 1 提交，回傳 VERSION_CONFLICT，不能覆蓋版本 2。

候選表需有 2～32 個完整點，X 嚴格遞增；重複、倒序、缺值、稀疏陣列與非有限數都拒絕。X、Y 與輸入數字的絕對值上限為 1e9，是本教材範圍。Y 可以下降，例如 (0,10)→(100,−10)，中點為 0，不應為了排序而擅自改動 Y。

模型把有效候選複製到私有工作資料，所以呼叫端之後修改原陣列不會改到已提交曲線。這只是單一 JavaScript 流程的整表切換，**不是 PLC 跨任務原子操作或 HMI 分批傳輸的實作證明**。現場仍需候選區、完整性檢查、提交握手及一致版本讀取；不要逐點修改運算中的工作表。

## 驗收範圍與常見錯誤

自測會跑五個原始節點、四個中點、125／175、199／201、下降曲線、末點、超量程、品質、單位、錯誤表、候選複製及舊版本衝突。這些都是合成資料的演算法驗證，沒有實際校正或原廠模擬器測試。

| 現象                     | 先核對                                  |
| ------------------------ | --------------------------------------- |
| 整段停在左點             | 比例是否做了整數除法                    |
| 節點附近跳值             | 左右索引及工作表版本是否一致            |
| 最後一點錯誤             | 是否直接處理末點，避免索引超界          |
| 換表後舊結果繼續出現     | 查看提交狀態、預期版本與輸出的 version  |
| 輸出看似合理但物理意義錯 | count／mA、工程單位、倍率與校正資料來源 |

[CODESYS ARRAY OF 文件](https://content.helpme-codesys.com/en/CODESYS%20Development%20System/_cds_datatype_array.html) 說明陣列上下界及索引存取；本文附件沒有在 CODESYS、Q 系列或其他 PLC 編譯。移植時需另確認陣列宣告、REAL／LREAL 精度與換表同步。若輸出要整數，應在插值後明訂取整方式，而非交給畫面顯示格式決定。

真實校正請另保存標準器、量測條件、單位、校正表版本與可追溯測點。查表程式通過不會消除點本身的誤差、回差或溫漂。

作者：茂伯。問題請寄 [ceo@hubplc.com](mailto:ceo@hubplc.com)，附表格、輸入、left／right／ratio、版本與完整輸出，註明合成資料或實測資料。
