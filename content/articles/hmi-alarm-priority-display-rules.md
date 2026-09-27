---
title: HMI 警報優先級如何轉成值班人員看得懂的顯示規則
description: 以後果、可用反應時間與操作動作建立警報排序，分開priority、顏色、Active/Clear/Ack/Shelved狀態，並提供色盲與誤標審查方法。
date: 2026-09-17
author: 茂伯
draft: false
---

## 優先級先問後果與反應時間

警報優先級不是安全門、紅色圖示或設備名稱的固定排名。先問異常後果、操作人員可採取的動作、可用反應時間、發生頻率與是否有獨立保護。安全門開啟可能需要立即停止流程，也可能只是維修狀態；只有完成具體風險與反應分析，才能決定它在本系統的優先級。

用虛構包裝線比較三筆資訊：停機後安全門關閉回饋異常、製程品質偏差、泵浦保養到期。假設安全控制已完成所需停機，安全門資訊提醒人員依程序檢查，不能靠人員看HMI來防止暴露。品質偏差有五分鐘隔離批次的操作要求，保養提醒則在本班安排。先確認各項動作與後果，再決定是否列操作警報或一般工作提示。

優先級應連到可操作的反應期限與說明文字。若人員看見High卻不知道要做什麼，數字或顏色沒有管理價值。安全功能、互鎖與SIS需由各自設計與驗證負責，HMI顯示只提供操作資訊。

優先級審查可用簡單矩陣：後果分為人員、環境、設備、品質與可用性，反應時間分為秒、分鐘、班次；再問操作員是否有明確動作與成功回饋。若沒有可操作動作，應評估改為事件或診斷訊息，避免值班人員被不可處置的紅色項目占用。

| 項目 | 假設後果 | 可反應時間 | 排序依據 |
| --- | --- | --- | --- |
| 安全門回饋異常 | 停機後需檢查，禁止自行復歸 | 依核准維護程序 | 獨立保護狀態及可用動作 |
| 品質偏差 | 批次需隔離 | 5 min（案例） | 產品損失與操作期限 |
| 保養提醒 | 安排已到期工作 | 本班（案例） | 評估列工作提示 |
| 顯示顏色 | 辨識輔助 | 不適用 | 不能決定安全等級 |

## 把警報資料欄位寫完整

每筆警報至少保存alarmId、source、description、priority、activeAt、ackAt、clearAt、operator action、response deadline、quality與shelved狀態。description要能描述異常與對象，不能只寫Alarm 17。priority是排序資料，顏色是呈現資料，兩者不可互相替代。

忽略色彩時，畫面仍要靠文字、圖示、位置、排序與狀態欄辨認。可用黑白列印、低飽和度與色盲模擬檢查：Active Unacked顯示未確認、Active Acked顯示已確認仍未清除、Cleared Unacked顯示條件已消失但尚未確認；是否完成處理由工作紀錄另判。不要以紅綠單色差異傳達唯一訊息。

ACK是操作者已看見或接手的紀錄，不等於條件清除；Clear是過程條件不再成立。Ignition 8.1文件將Active、Cleared與Acknowledged分成狀態組合，並支援Shelved。這些狀態要在列表與歷史查詢中可分辨。

| 狀態 | 文字顯示 | 可否表示問題消失 |
| --- | --- | --- |
| Active Unacked | 作用中／未確認 | 否 |
| Active Acked | 作用中／已確認 | 否，仍需處置 |
| Cleared Unacked | 條件已清除／未確認 | 條件消失但流程未結束 |
| Cleared Acked | 已清除／已確認 | 保留歷史證據 |
| Shelved | 已暫擱／依設定抑制呈現 | 不代表條件安全 |

同一設備可有不同優先級警報。例如泵浦高溫可能需五分鐘處理，泵浦完全失去冷卻可能需30秒；設備名稱不能決定優先級。每個alarm source都要有自己的setpoint、deadband、delay、priority、response與clear規則。

篩選器支援priority、source、state、時間與責任區域。主列表先按經合理化的priority排序，同級再依自訂到期狀態、期限、activeAt及穩定ID排序。期限未定義者顯示「未設定」，不要填零而誤列最急。畫面另外呈現剩餘時間，不能由顏色猜測嚴重程度。

## 同時出現時怎麼排序

把排序練習獨立為兩筆同級High品質警報。Q1於14:00:00發生，可反應五分鐘，到期14:05:00；Q2於14:00:30發生，可反應兩分鐘，到期14:02:30。14:01:00時，Q2剩90秒、Q1剩240秒，因此同級內Q2在前。兩個期限是自訂練習，不能當安全門的允許暴露時間。

明定排序鍵：priority由高至低；同級內先列已逾期，再列尚未到期；兩類各依到期時間、activeAt及alarmId穩定排序。14:03:00時Q2已逾期30秒、Q1剩120秒，Q2仍在前。逾期只加上文字與時間，不擅自升成Critical；升級需有另行核准的規則。

顏色可提供快速掃視，例如High使用高對比樣式、Low使用另一樣式，但旁邊必須有文字priority與state。紅色不是安全門標記，綠色也不是清除的唯一證據；色盲、投影、夜間模式與列印版都要能理解。

| 排序列 | 值 | 畫面呈現 | 審查問題 |
| --- | --- | --- | --- |
| Q2 deadline | 14:02:30 | 14:03時逾期30秒；High | 是否需升級處置依核准程序 |
| consequence | 品質 | 文字品質偏差 | 是否有隔離步驟 |
| state | Acked/Cleared | 完整狀態詞 | ACK是否被誤讀為修復 |
| source | 區域/設備 | 來源與路徑 | 責任人是否明確 |

排序畫面應提供固定欄位與可追溯篩選。操作員切換只看未確認或只看某區域時，頂端顯示目前filter、結果筆數與時間範圍；避免誤以為列表就是全廠狀態。清除的事件仍可在歷史或journal查詢。

若使用者只想看未確認警報，仍應提供一鍵查看Active Acked、Cleared Unacked、Shelved與歷史；過度篩選會把尚未清除的問題藏起來。來源條件清除、人工確認或暫擱要分別記錄來源或操作者、原因與時間，不能只改畫面。

## 優先級誤標的審查

建立多人分工審查：提出者填後果、反應時間、操作步驟、獨立保護與證據；操作代表檢查是否可在期限內執行；控制工程師核對觸發條件；管理者核准priority與文字。每次setpoint、設備、流程或人員變更都要重新檢查。

常見誤標包括把所有安全相關詞都設最高、把高頻 nuisance alarm升級成Critical、把沒有操作動作的診斷訊息當警報、把ACK按鈕當復歸，以及用顏色取代文字。修正時保留舊版、變更理由與影響範圍，避免只改數字。

Ignition官方8.1資料可作產品欄位參考：priority包含Diagnostic、Low、Medium、High、Critical，狀態可分Active/Cleared與Acked組合；這些是Ignition產品顯示與資料模型，不是通用ISA優先級數字。未指定平台時只採概念，不杜撰API。

測試顏色時用文字與圖示先遮住顏色，再請不同視覺條件的人依priority與state排序；若答案只靠紅綠，規則就不合格。聲音也不能代替文字，因為夜班、噪聲與多重警報會改變聽覺辨識。

ISA公開頁面說明ISA-18系列涵蓋警報生命週期、識別、合理化、設計、操作、維護與變更；本文只引用公開overview，不聲稱讀到付費全文或把任何自訂期限當ISA規定。

## FAQ 來源與驗證

FAQ1：安全門一定要設最高優先嗎？不一定，按後果、可反應時間、獨立保護與操作需求審查；HMI警報不是安全功能。

FAQ2：ACK後可以從畫面移除嗎？不能默認移除；ACK只表示已確認，Active Acked仍可能需要處置。

FAQ3：紅色代表Critical嗎？不能只靠顏色。文字priority、state、來源與圖示要能在色盲與黑白情境辨識。

FAQ4：Clear或shelve算問題已處理嗎？Clear只表示條件恢復，暫擱只改通知或呈現；處理結案要另查證據，不能用隱藏清單代替。

本文警報、反應時間與排序皆為案例規劃。

參考：[Inductive Automation Ignition 8.1 Alarming overview：Active、Cleared、Acknowledged、Shelved與通知流程。](https://www.docs.inductiveautomation.com/docs/8.1/platform/alarming)

參考：[Inductive Automation Ignition 8.1 Alarm Journal：priority、event type與event flags資料欄位。](https://docs.inductiveautomation.com/docs/8.1/platform/alarming/alarm-journal)

參考：[ISA-18 Series公開overview：警報生命週期、合理化、優先級與管理範圍；未宣稱取得付費標準全文。](https://www.isa.org/standards-and-publications/isa-standards/isa-18-series-of-standards)

## 延伸閱讀

- [HMI 確認警報的流程怎麼避免只按掉提示](/articles/hmi-alarm-ack-clear-reset-workflow)
- [HMI 警報洪水時怎麼設計事件摘要與後續處理](/articles/hmi-alarm-flood-event-summary-followup)
