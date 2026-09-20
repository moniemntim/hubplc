---
title: BCD與二進位轉換如何攔截非法 nibble
description: 說明 packed BCD 每個 nibble 只能是0到9，區分BCD與普通BIN的數值意義、4位與8位容量、轉換方向、非法資料攔截、raw保留與本次完成狀態。
date: 2026-09-21
author: 站長
draft: false
category: PLC 程式與控制
---

## 一 先分清 BCD BIN 與每個 nibble 的合法範圍

BCD 與普通二進位共用 16 位元或 32 位元容器，但位元意義不同。packed BCD 每四個 bit 是一個十進位 digit，正確名稱是 nibble；四個 nibble 可表示 0000 到 9999，每個 nibble 只能是 0 到 9。普通 BIN 則把整個 word 當二進位整數。0x1234 當 BCD 讀成 1234，當 unsigned BIN 計算是 4660，不能因畫面上都顯示十六進位就說兩者相等。

先定義資料契約：raw 保存原始 word，encoding 保存 BCD 或 BIN，digits 保存 4 或 8，valid 保存檢查結果，value 只在合法時更新，error_code 與 diagnostic_time 保存失敗原因。0x12A4 的四個 nibble 是 1、2、10、4，其中 10 超出 0 到 9，因此是非法 BCD。不能把 A 猜成 0、10 或某個修正後數字，也不能先轉換再回頭判斷。

Q06UDVCPU 位於 SH-080809ENG-X 手冊列出的 Universal model QCPU 清單，但這只表示手冊適用範圍線索，不代表每個專案、韌體或工程工具版本都已驗證。本文用手冊中的 BIN、DBIN、BCD、DBCD 名稱說明方向與範圍；實作時依目標工程的指令、資料型別與版本核對。

| 位元樣式 | 按 BCD 解讀 | 按 BIN 解讀 | 判定 |
| --- | --- | --- | --- |
| 0x1234 | 1234 | 4660 | 合法但語意不同 |
| 0x0009 | 9 | 9 | 合法且數值相同 |
| 0x12A4 | 非法 | 4772 | 不可當合法 BCD |
| 0x9999 | 9999 | 39321 | 4 位 BCD 上限 |

輸入檢查應先逐 nibble 掃描，再確認 digits、容器寬度與目標指令方向。偽碼僅示意流程，非可直接編譯：raw 保留；for each nibble，若 digit>9 則 valid=false、error=InvalidBCD；若 valid 才呼叫對應轉換；完成旗標只在本次成功時置位。錯誤分支要清除本次 done，不可沿用上一次成功留下的 result 或完成狀態。

## 二 BCD 轉 BIN 先驗證再產生工程數值

BIN 與 DBIN 的方向是把 BCD 資料轉成二進位數值。4 位版本的合法輸入範圍是 0 到 9999；8 位版本是 0 到 99999999。這裡的 4 位與 8 位指十進位 digit 數，不是『4 個 byte』或任意 16/32 位整數。輸入超過目標 digit 範圍時，不能把高位資料截掉後仍回報成功。

案例 A 的 raw=0x0042：nibble 為 0、0、4、2，合法 BCD 值為 42，轉成 BIN 後數值仍是 42。案例 B 的 raw=0x9999：四個 nibble 均合法，結果是 9999。案例 C 的 raw=0x12A4：第三個 nibble 為 A，預檢失敗，轉換動作不應執行；輸出應保留 raw=0x12A4、valid=false、error=InvalidBCD，並把本次 done=false。

| 測試筆 | raw | 逐 nibble | BCD檢查 | BIN結果 |
| --- | --- | --- | --- | --- |
| A | 0x0042 | 0,0,4,2 | 通過 | 42 |
| B | 0x9999 | 9,9,9,9 | 通過 | 9999 |
| C | 0x12A4 | 1,2,A,4 | 失敗 | 不更新 |
| D | 0x0000 | 0,0,0,0 | 通過 | 0 |

輸入從通訊暫存器來時，還要確認 byte order、word order 與資料更新是否一致。若 0x1234 的高低 byte 被交換成 0x3412，四個 nibble 仍可能全部合法，卻會得到另一個 BCD 數字 3412；這不是 BCD 指令自行修正的問題，而是映射契約錯誤。故障排查要同時看 raw、來源位址、更新時間與 encoding。

若轉換指令回報錯誤，先停在預檢結果，不要把顯示器上的舊值當成本次結果。操作畫面可顯示 LastGoodValue，但欄位名稱要明確；本次 value 應保持 invalid 或 not_updated，並保留上次成功時間。這樣維護者能分清『目前輸入非法』與『最後一次曾有合法值』。

## 三 BIN 轉 BCD 方向 容量與溢位要分開

BCD 與 DBCD 的方向是把 BIN 整數轉成 4 位或 8 位 BCD。4 位輸入合法範圍為 0 到 9999；8 位輸入合法範圍為 0 到 99999999。BIN=1234 可產生 packed BCD 0x1234；BIN=9999 可產生 0x9999；BIN=10000 不能塞進 4 位 BCD。若需求要表示 10000，應改用 8 位規格或拒絕資料，不能截成 0000 或只保留低四位。

案例 D：BIN=99999999 的八位十進位 digit 是 9、9、9、9、9、9、9、9，屬於 DBIN/DBCD 的上限。BIN=100000000 超過八位容量，即使 32 位容器放得下，也不能宣稱 DBCD 成功。容器寬度、十進位 digit 上限與指令支援範圍是三個不同概念，驗收表要分欄記錄。

| 方向 | 輸入合法範圍 | 輸出形態 | 失敗邊界 |
| --- | --- | --- | --- |
| BIN→BCD 4位 | 0…9999 | 4 digit packed BCD | 10000拒絕 |
| BIN→BCD 8位 | 0…99999999 | 8 digit packed BCD | 100000000拒絕 |
| BCD→BIN 4位 | 每 nibble 0…9 | 0…9999 BIN | 任一 nibble A…F拒絕 |
| BCD→BIN 8位 | 每 nibble 0…9 | 0…99999999 BIN | 任一 nibble A…F拒絕 |

轉換前的範圍檢查不能只看有號或無號容器是否溢位。假設 16 位 BIN 欄位存入 10000，數值本身可以存在，但 4 位 BCD 的十進位容量不足；假設 32 位欄位存入 100000000，仍超過 8 位 BCD 的規格。先比較邏輯範圍，再呼叫轉換，失敗時保留 raw_bin、target_digits 與 requested_value。

完成旗標與結果要有本次世代，例如 request_id、cycle_id 或 sequence。新的輸入開始後先把 done、error、result_valid 清成本次未完成；只有預檢通過、轉換完成且輸出寫入成功，才設 done=true 與 result_valid=true。這是通用狀態設計，不代表任何 Q 指令一定提供這些欄位。

## 四 建立非法資料 錯誤與版本的排查流程

第一步保存 raw 與來源。第二步逐 nibble 檢查，記錄 invalid_index、invalid_nibble 與輸入時間。第三步檢查指令方向：BCD→BIN 與 BIN→BCD 不是同一操作，不能只換一個名稱。第四步檢查 digits 與範圍。第五步才查看控制器的錯誤旗標與錯誤碼，並依目標型號手冊確認其意義。手冊描述的錯誤機制不能推廣成所有廠牌或所有版本通用行為。

若 raw=0x12A4 被畫面顯示成 4772，先確認畫面是否把 word 當普通 BIN；這個數字是 0x12A4 的二進位解讀，不代表 BCD 已合法。若 raw=0x3412，四個 nibble 都合法，卻可能是 byte order 錯；此時不能用『沒有錯誤旗標』證明來源正確。資料品質要和數值結果一起傳遞。

| 症狀 | 先查 | 保留紀錄 | 處理 |
| --- | --- | --- | --- |
| 非法A/F nibble | raw與 nibble index | raw、invalid_index、時間 | 拒絕轉換 |
| 結果像反字節 | byte/word order | 來源映射版本 | 修正映射後重測 |
| 10000轉4位成功 | target_digits與範圍檢查 | requested_value、上限 | 拒絕或改8位 |
| 錯誤後仍顯示舊結果 | done/result_valid清除邏輯 | request_id、last_good_at | 區分舊值與本次結果 |

若使用 QCPU 手冊列出的 operation error、SM0 或 SD0 等診斷欄位，應把它們當作該手冊與型號版本的核對項，不要用未確認的抑制或清除機制掩蓋非法輸入。安全作法是保留原始資料、拒絕本次轉換、讓上層決定是否停批或要求重新取樣。本文刻意不教錯誤抑制位元，避免把診斷變成接受壞資料。

離線驗收可準備 0x0000、0x0009、0x1234、0x9999、0x12A4，以及 BIN 10000、99999999、100000000。每筆同時核對方向、數值、raw、狀態與錯誤原因；不要只看最後畫面上的一個數字。

若同一 raw 在不同畫面出現不同數值，先確認顯示層的格式與資料型別，再回到原始位元樣式重算；不可用畫面結果反推來源一定是 BCD。

## 五 驗收表 FAQ 與官方來源

本題驗收標準是：0x1234 作 BCD 得 1234，作 BIN 得 4660；0x12A4 因 nibble A 無效而拒絕；4 位 BCD/BIN 的上限是 9999；8 位 DBIN/DBCD 的上限是 99999999；BIN→BCD 與 BCD→BIN 的方向不可混用；失敗時 raw 保留、result_valid=false、done 不沿用舊成功。對 Q06UDVCPU，仍需在目標工程工具與實際韌體專案中另行核對可用性。

FAQ1：0x12A4 可以自動修成 0x1294 嗎？答：不能把 A 任意解讀成某個 digit。它是非法 BCD，應保留 raw、標記 invalid 並由資料來源或應用規格決定如何處理。

FAQ2：0x1234 到底是 1234 還是 4660？答：取決於 encoding。按 BCD 是 1234，按普通 unsigned BIN 是 4660；資料契約必須明訂，不能從數值畫面猜測。

FAQ3：BIN=10000 能否用 4 位 BCD 保存？答：不能。4 位 BCD 的十進位上限是 9999；應拒絕、改用 8 位規格，或由專案明確採用其他表示方式。

FAQ4：轉換失敗時可以保留上次 result 嗎？答：可以保留為 LastGoodValue，但不能把它標成這次成功結果。每次新請求先清除本次 done/result_valid，並保存 last_good_at 與本次錯誤。

參考：[Mitsubishi Electric MELSEC-Q/L Programming Manual (Common Instruction) SH-080809ENG-X：Universal model QCPU適用線索、BCD/BIN與DBCD/DBIN指令範圍及錯誤說明；實際型號與版本仍須核對。](https://dl.mitsubishielectric.com/dl/fa/document/manual/plc/sh080809eng/sh080809engx.pdf)

參考：[本地核對檔為 SH-080809ENG-X，參考第6.3節的BCD(P)、DBCD(P)、BIN(P)及DBIN(P)段落；本地手冊內容不等於已對目標專案完成編譯或硬體驗證。](https://dl.mitsubishielectric.com/dl/fa/document/manual/plc/sh080809eng/sh080809engx.pdf)

## 延伸閱讀

- [時間差跨越午夜如何以日期時間計算](/articles/datetime-difference-across-midnight)
- [字串數字轉換時怎麼保留原始輸入](/articles/strict-string-number-conversion)
