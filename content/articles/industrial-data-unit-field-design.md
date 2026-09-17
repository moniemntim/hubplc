---
title: 工業資料的單位欄位怎麼設計才能避免報表誤讀
description: 以bar/kPa與表壓/絕壓案例建立raw、scale、unit、canonical、display五欄，保存換算版本、參考壓力、品質與跨設備拒收規則。
date: 2026-09-17
author: 站長
draft: false
---

## 五欄分開才可追溯

壓力資料至少分raw、scale、unit、canonical、display。raw是來源原始數值，scale是倍率/偏移或換算規則，unit是raw或工程值的明確單位，canonical是跨設備統一值與單位，display是畫面格式化文字。不要把6.5 bar與650 kPa放在同一欄卻不標來源。

第一組比較案例：A收到6.5 bar(g)，B收到650 kPa(g)，兩者換成kPa後都是650 kPa(g)。下表另用B的絕壓輸入作反例，示範數字一樣仍不可直接混算。1 bar=100 kPa是單位換算關係，canonical unit固定kPa。display可依locale顯示650.0 kPa或6.50 bar，但不能改寫canonical。

表壓與絕壓參考必須獨立。6.5 barg不等於6.5 bara；若參考大氣壓101.325 kPa，6.5 barg約751.325 kPaa，前提是參考壓力與量測定義明確。

| 欄位 | A | B | 規則 |
| --- | --- | --- | --- |
| raw | 6.5 | 650 | 保留來源 |
| scale | bar×100 | kPa×1 | 記版本 |
| unit | bar(g) | kPa(a) | 不可省參考 |
| canonical | 650 kPa(g) | 650 kPa(a) | 參考要一致 |
| display | 6.50 barg | 650 kPaa | 格式化文字 |

欄位契約要把數值、單位和參考系統拆開。raw保存來源數字，例如6.5；sourceScale保存原始值到來源工程值的比例與偏移，本例factor=1、offset=0；unitConversion另保存bar到kPa的乘100；unit保存bar(g)；canonical保存轉換後numeric=650、unit=kPa(g)；display才保存給人看的「650.0 kPa(g)」。display不應回寫成計算輸入，否則四捨五入後的650.0可能取代原始高精度值。

對壓力資料，bar(g)與bar(a)是不同物理參考。前者以當地大氣壓為零點，後者以真空為零點；kPa(g)與kPa(a)同樣不能只看數字相加。資料庫的quantity應寫pressure，reference應寫gauge或absolute，缺少reference時拒收或標成Unknown，不能把單獨的「bar」默認成其中一種。

## 換算與來源表

轉換要有fromUnit、toUnit、factor、offset、reference、methodVersion與rounding。若6.5 bar(g)轉kPa(g)，只乘100；若表壓轉絕壓，還要加當時參考大氣壓，不能只靠unit字串。display四捨五入不應反寫canonical。

OPC UA Part 8的EUInformation提供工程單位資料模型概念，資料模型仍要配合實際設備的量測定義與參考壓力。報表匯總前先驗證unit、quantity與reference，單位未知則拒絕混算。

跨設備案例：A canonical=650 kPa(g)，B canonical=650 kPa(a)；數字相同但物理意義不同，總平均不得直接算1300/2。先分reference或換成同一參考，再計算。

| 來源 | 數值 | 參考 | 可否合併 |
| --- | --- | --- | --- |
| A | 650 kPa(g) | 表壓 | 先轉換 |
| B | 650 kPa(a) | 絕壓 | 先轉換 |
| C | 6.5 bar | 未知 | 拒收 |
| D | 650 kPa | 文件明確 | 依契約 |

換算表可固定為：bar(g)到kPa(g)乘100，bar(a)到kPa(a)乘100；若現場大氣壓假設為101.325 kPa，6.5 bar(g)才可算成650 kPa(g)再加101.325，得到751.325 kPa(a)。這個加值依賴同一時間與位置的大氣壓來源，不能把它當所有設備的常數；若只有6.5 bar而沒有參考資訊，轉換結果應為Rejected。

跨設備比對時先比對quantity、canonicalUnit與reference，再比數字。A送6.50 bar(g)轉成650 kPa(g)，B送650 kPa(g)，兩者可比較；C送650 kPa(a)，即使數字相同也應分組；D送650且unit空白，應進入資料品質錯誤佇列。這個順序能避免報表先聚合、後發現單位不一致而無法追溯。

## 輸入 顯示與排錯

輸入欄先驗證numeric、unit、reference、範圍與精度。使用者輸入6.50 bar(g)時，保存numeric=6.5、unit=bar(g)，換算欄產生650 kPa(g)；若只輸入6.5而沒有unit，不能默認bar。

排錯順序是查raw來源、scale版本、unit字典、canonical規則、reference與display格式。若報表差100倍，先查bar/kPa或倍率；若差約101.325 kPa，查表壓/絕壓；若只差小數，查rounding。

同欄不得混用數字與格式字串。display可以是「650.0 kPa(g)」，但聚合用canonical numeric；原始值與換算證據保留，方便回算。

| 症狀 | 可能原因 | 證據 | 處理 |
| --- | --- | --- | --- |
| 差100倍 | bar/kPa | unit與factor | 補換算 |
| 差101.325 | g/a混用 | reference | 統一參考 |
| 尾數不同 | rounding | scale version | 保留canonical |
| 無法判讀 | unit缺失 | source contract | 拒收/補資料 |

轉換規則需要版本與四捨五入規則。canonicalValue保留足夠精度，displayValue依畫面需求保留一位小數；例如650.04 kPa(g)可顯示650.0，但計算平均仍用650.04。methodVersion可寫pressure-v2，並保存fromUnit、toUnit、factor、offset、referenceSource與roundingMode。規則更新時產生新版本，不覆蓋歷史列的原始與舊canonical值。

OPC UA的EUInformation可描述工程單位與命名空間，但它不能替應用程式確認感測器接的是表壓或絕壓，也不能自動修正錯誤比例。接收端仍要檢查來源文件、量程及reference欄；若設備把6.5 bar(g)錯標成bar(a)，單靠單位代碼無法發現零點語意錯誤，必須靠跨設備或校驗案例攔截。

跨設備驗收可採兩列固定基準：A為6.5 bar(g)，B為650 kPa(g)，轉換後差值應小於指定數值誤差；再加入C為650 kPa(a)，確認它不會被併入表壓平均。若產品只允許單位換算、不支援參考壓力換算，就必須在限制欄明寫，將C分組保存而非自行推導。

## 跨設備報表驗收

先建立設備欄位契約，再做跨設備報表。每列帶asset、raw、rawUnit、canonicalValue、canonicalUnit、reference、methodVersion、display與quality。任何unit或reference未知，放在異常清單，不默認成同單位。

驗收使用A=6.5 bar(g)、B=650 kPa(g)、C=650 kPa(a)、D=6.5無單位。預期A/B可在表壓群組比較，C需轉換或分組，D拒收。顯示改locale或小數位不改canonical與總量。

限制包括感測器是否提供表/絕壓資訊、參考大氣壓來源、換算版本與資料品質。沒有這些欄位時，報表只能呈現原始數值與未知單位，不能補猜工程意義。

測試資料至少包含6.50 bar(g)、650 kPa(g)、650 kPa(a)、缺unit、未知reference與超量程值。預期前兩筆canonical可相等，第三筆本來就是絕壓，可以原樣存入絕壓群組；若要與前兩筆比對，再將表壓加適用的大氣壓，或將絕壓減適用的大氣壓，缺unit與未知reference不得進入共同平均。再測試小數逗號「6,50」是否由輸入層按locale解析，儲存層仍使用數字6.50，避免顯示格式被誤當成千分位。

報表欄位可分成rawValue、rawUnit、canonicalValue、canonicalUnit、reference、displayValue、quality與methodVersion。聚合查詢的條件必須包含canonicalUnit與reference；警報上下限也應先轉到同一參考系統。當轉換失敗時，保留raw資料並標記ConversionError，顯示「不可比較」，不能用零或沿用上一筆壓力掩蓋問題。

## FAQ 來源與驗證

量程與單位檢查要分成兩層。第一層驗證數值能否解析、scale是否有限且unit在允許清單；第二層驗證物理範圍，例如某壓力變送器允許0至10 bar(g)，收到650 kPa(g)換算6.5 bar(g)可接受，收到−50 kPa(g)雖可計算仍應依設備量程標成OutOfRange。這能把「格式正確」和「製程合理」分開。

顯示層若要同時呈現表壓與絕壓，欄名必須帶參考，例如Pressure 650 kPa(g)、Pressure 751.3 kPa(a)，並在工具提示列出大氣壓來源與時間。禁止只顯示650 kPa讓操作員猜零點。下載CSV也應輸出明確unit與reference欄，不能只靠畫面標題保存語意。

建立轉換表時不要把bar(g)到kPa(a)寫成單一乘法。正確流程是先乘100保持表壓參考，再取得同時刻大氣壓，最後才加到絕壓；若大氣壓讀值品質為Bad或時間差超過允許範圍，canonical絕壓應保持未知並保留650 kPa(g)的有效表壓結果。這樣報表不會把過期氣壓偷偷套到新樣本。

稽核記錄應能回答三個問題：來源送了什麼、系統用了哪個版本、畫面最後顯示什麼。一次轉換可記raw=6.5、rawUnit=bar(g)、canonical=650、canonicalUnit=kPa(g)、reference=gauge、methodVersion=pressure-v2、display=650.0 kPa(g)。當使用者改變顯示小數位，只更新display，不重算或改寫canonical。

失敗排查先看欄位而非先調整公式：若數值差100倍，查factor與bar/kPa；若差約101.325，查表壓絕壓混用；若只有部分設備失敗，查來源unit和reference映射；若畫面值正確但平均錯，查聚合是否漏了canonicalUnit或reference條件。修正後以同一批原始資料重跑，確認錯誤列轉為明確品質狀態而不是被默認值掩蓋。

FAQ1：bar與kPa可放同一欄嗎？不可，至少保存unit與canonical unit，換算後才可比較。

FAQ2：6.5 barg等於6.5 bara嗎？不等於，表壓與絕壓參考不同。

FAQ3：display四捨五入會改資料嗎？不應改canonical numeric，只改顯示文字。

FAQ4：沒有unit的6.5能當bar嗎？不能，應拒收或標示未知，除非來源契約明確定義。

本文壓力、換算與參考值為離線假設。

參考：[OPC UA Part 8 §5.6.4 EUInformation：工程單位與單位語意的資料模型。](https://reference.opcfoundation.org/specs/OPC-10000-8/5.6.4)

參考：[NIST SI Appendix B.8：bar到pascal換算係數為100000。](https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8)

參考：[WIKA：表壓相對當地大氣壓，絕壓相對真空。](https://blog.wika.com/en/knowhow/difference-between-gauge-pressure-and-absolute-pressure-measurement/)

## 延伸閱讀

- [工業 CSV 如何保護前導零 長整數和識別碼](/articles/industrial-csv-leading-zeros-long-identifiers)
- [工業報表取樣週期與彙總週期的定義](/articles/sampling-and-aggregation-periods)
