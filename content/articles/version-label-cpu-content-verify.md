---
title: 版本標籤與CPU內容比對
description: 區分版本修訂、SHA256、Verify with PLC與CPU自診斷，建立V12同名檔、未選項、保護狀態與RUN動態D值的完整比對方法。
date: 2026-09-17
author: 站長
draft: false
---

## 版本標籤與證據邊界

版本標籤是工程管理索引，不是CPU內容校驗值。GX Works2 4.6提供修訂資訊、備份、清單、還原與驗證範圍；它能說明專案如何演進，不能單靠V12名稱證明CPU內的程式、參數與資料完全相同。

建立基線時保存專案檔、工程路徑、CPU型號與序號、GX Works2版本、建立時間、修訂說明與核准人。檔名相同不代表內容相同；同一V12檔可能被覆寫或放在不同資料夾，名稱不會揭露差異。

工程檔SHA256只證明某次計算的檔案bytes與另一份檔案相同，不能直接證明CPU內容相同，也不能把CPU診斷自檢轉成與PC檔案的SHA256比較。本文不虛構CPU checksum API。

CPU記憶體自檢和GX Works2 Verify with PLC是不同層次。前者可發現內部記憶體或參數異常，後者依選取項目比較PC工程資料與CPU資料；自檢正常不等於PC與CPU一致。

RUN期間D裝置計數、累計量與配方目前值可能正常變化，應和code、parameter基線分開。動態D值不應納入程式內容雜湊，否則每次運轉都會被誤判成版本變更。

比較前應固定CPU連線目標，確認不是另一台同型號設備。若現場有多個Q06UDVCPU，序號、站名與連線路徑要寫入報告；只看到型號相同不代表連到正確的控制器。讀錯目標時，Verify結果即使Pass也沒有工程意義。

## Revision與Verify範圍

4.6.1可建立修訂備份，4.6.2顯示修訂清單，4.6.3還原備份，4.6.5驗證修訂。要把修訂記錄與實際備份檔一起保存；只有V12文字而沒有檔案，後續不能重現當時內容。

15.2 Verify with PLC列出programs、parameters、智慧模組參數、device comments、device memory與file registers等可選目標。報告要逐項記錄pass、fail、not selected、not applicable或protected，不能用一個總結詞掩蓋未比較項目。 本文Pass、未選取與受保護等為報告分類，實際工具訊息依版本為準。HMI工程不在這項PLC內容比對內，需另行核對。

| 項目 | V12基線 | Verify結果 | 結論 |
| --- | --- | --- | --- |
| MAIN程式 | 檔案與SHA256 | Pass | 選定MAIN相符 |
| 參數 | 參數檔 | Not selected | 不能說參數一致 |
| D100計數 | RUN動態值 | 未納入 | 不作code判定 |
| 受保護檔 | 有保護設定 | 需認證 | 範圍受限 |

保護狀態必須單獨記錄。受密碼或存取控制保護的資料可能需要認證，未讀到差異不等於已證明相同。Not selected表示沒有比較，Not applicable表示功能或資料不適用，Protected表示權限或檔案限制，三者不能改寫成Pass。

MAIN pass只能表示MAIN選定範圍通過。參數、模組設定、PLC裝置註解、檔案寄存器或裝置資料未比較時，報告不可標成完整專案一致。

若工程站搬遷或重新安裝GX Works2，先確認版本和專案格式，再計算SHA256；格式轉換可能產生新的檔案bytes。新雜湊只能描述轉換後檔案，不可回頭證明原始CPU內容。原始檔、轉換檔與操作記錄應分開保存。

若比較報告需要交接，將每個未選項寫成具體待辦，例如下一次窗口要比較參數與模組設定，而不是只留「請再確認」。待辦需有資料來源、負責人與允許的完成條件，否則版本標籤仍會被誤用成一致性證明。

## V12與動態D值案例

案例一有兩份工程副本都標為V12，A與B的MAIN相同，但參數不同。兩份檔案SHA256不同，這只證明bytes不同；接著仍要用Verify或差異檢視找出差異範圍，不能只寫V12錯誤。

案例二只選MAIN做Verify並得到Pass，參數、模組設定與device memory未選取。正確結論是「MAIN選定範圍與CPU相符」，不是「V12完整下載正確」。

案例三RUN中D100由1200變1320，而程式與參數Verify仍Pass。D100是運轉資料，不能因數值不同就判定程式被改；若要保存製程狀態，另記時間、單位、品質與來源。

動態觀察要定義窗口。要比對初值，選初始化完成且來源穩定的受控窗口；要觀察RUN行為，保存多筆時間序列並標runtime evidence。兩種證據不能混成code版本。

還原V11後也要重新核對專案與CPU。還原畫面成功不代表現場已回到V11；寫入、Verify與製程回歸是三件事，應分開記錄。

差異報告的結論應使用受限語句，例如「MAIN與選定參數通過，device memory未比較，受保護檔案待認證」。這種寫法保留證據邊界；若日後有人只摘錄第一個Pass，也能從同一段看到尚未完成的範圍。

## 差異處理與限制

Verify顯示Fail時，先看差異項目、選取範圍、讀取目標、CPU型號、工程版本與保護狀態，不要先覆寫PC或CPU，避免破壞原始差異證據。保存fail報告、原檔SHA256、讀取時間與操作者。

Not applicable要查型號、資料類型或版本是否支援；Not selected要回到比較勾選；Protected要走認證與權限程序。三種狀態都不能直接改成Pass。

| 結果 | 先查 | 不能宣稱 | 補強 |
| --- | --- | --- | --- |
| Pass | 選取項目 | 全部一致 | 擴大範圍再驗 |
| Fail | 差異與目標 | 只有版本名錯 | 保存雙方資料 |
| Not selected | 勾選範圍 | 未比較項目一致 | 重新選取 |
| Protected | 權限與版本 | 內容相同 | 取得認證 |

CPU自檢正常但Verify失敗可以同時成立：CPU內部記憶體自洽，不代表與目前PC檔案相同。反過來，部分Verify通過也不代表未選資料正確，兩種證據必須分欄。

最小交付物包括修訂清單、專案SHA256、CPU與工具識別、Verify項目與結果、保護或不適用狀態、runtime資料是否排除、差異處理決策與回歸測試結果。

如果差異只出現在device memory，要先問需求是在審查程式版本還是製程狀態。程式版本審查可排除正常變動的RUN資料，狀態稽核則應保留變動時間序列與批次資訊。兩者都重要，但不能使用同一個Pass定義。

回歸測試的結果也不能取代內容比對。測試通過表示在該觀察窗口下功能符合預期，Verify通過表示選定資料相符；若參數未選取，兩者合併仍不能證明全部內容一致。

## FAQ與來源

每次比較都保存結果檔與時間，避免只留口頭結論。

版本基線還要保存讀取方式與範圍，因為同一工程檔可選擇不同資料集寫入或比較。記錄誰建立基線、何時從哪個CPU讀取，以及是否包含註解、初值、檔案寄存器和智慧模組參數，後來的審查才不會把兩份不同範圍的結果硬湊成一致。

FAQ1：SHA256相同能證明CPU相同嗎？答：不能。它只證明兩份檔案bytes相同，仍需對指定CPU資料執行Verify with PLC。

FAQ2：只驗MAIN通過能否說V12完整一致？答：不能。未選參數、模組設定或裝置資料時，只能宣稱MAIN選定範圍通過。

FAQ3：CPU自診斷正常是否等於PC工程檔正確？答：不等於。CPU自檢與PC/CPU Verify的對象不同。

FAQ4：RUN中的D100變化是否代表程式被改？答：不代表。D100可能是正常運轉資料，應另以runtime evidence保存。

參考：[GX Works2 Version 1 Operating Manual Common：4.6 Managing Project Revisions與15.2 Verify with PLC，頁4-47至4-51、15-29起。](https://dl.mitsubishielectric.com/dl/fa/document/manual/plc/sh080779eng/sh080779engas.pdf)

參考：[Mitsubishi QnUCPU User Manual：CPU線上操作與記憶體檢查限制的文件核對。](https://dl.mitsubishielectric.com/dl/fa/document/manual/plc/sh080807eng/sh080807engaf.pdf)

## 延伸閱讀

- [診斷歷史環形覆蓋與定期匯出](/articles/diagnostic-history-ring-export)
- [PLC線上修改後如何安排回歸測試範圍](/articles/plc-online-change-regression-scope)
