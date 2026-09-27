---
title: Modbus TCP資料品質 Fresh Stale Bad如何定義與驗收
description: 以自訂Fresh、Stale、Bad規則處理Modbus TCP溫度資料，分清有效PDU、timeout、無效碼、超範圍，以及receivedAt和sourceTimestamp。
date: 2026-09-17
author: 茂伯
draft: false
---

## Fresh Stale Bad先定義清楚

Modbus TCP不原生定義Fresh、Stale、Bad，本篇自訂規則先判斷語義錯誤，再看資料年齡。尚無有效初值或收到明確無效碼、超範圍資料時，立即Bad。其餘情況按最後有效值的age判斷：小於5秒Fresh，5秒以上且小於30秒Stale，30秒以上Bad。單筆逾時增加失敗記錄，不直接改成Bad，也不刷新age。

「收到正常PDU」不等於語義有效。伺服器可能回傳正常的Modbus封包，但暫存器內容是感測器錯誤碼、初始化值或超出工程範圍的數字。程式必須先驗證Unit ID、交易識別、功能碼、位元組長度和 signed INT16 解碼，再驗證自訂無效碼與工程範圍，全部通過才更新value與品質。

| 狀態 | 成立條件 | value使用規則 |
| --- | --- | --- |
| Fresh | 無明確錯誤且0≤age<5 s | 可顯示，控制用途另經評估 |
| Stale | 無明確錯誤且5≤age<30 s | 保留值但本篇禁止當即時控制量 |
| Bad | 無初值、無效碼、超範圍或age≥30 s | 不可用；仍可保留舊值供診斷 |
| 恢復候選 | 新回覆尚未完成檢查 | 驗證後才能更新最後有效值 |

資料結構建議把rawInt16、scaledValue、quality、qualityReason、receivedAt、sourceTimestamp、transactionId和validForControl一起保存。rawInt16有助於追查位元組順序與符號解碼，scaledValue供顯示，qualityReason說明為何被接受或拒絕；如果只留下25.3，日後無法分辨原始253、轉換錯誤或人工修改。

兩種轉移要分開：沒有新資料時依age由Fresh轉Stale再轉Bad；明確無效碼或超範圍會直接轉Bad並保持，直到新資料通過全部檢查。錯誤交易回覆直接丟棄、增加通訊錯誤記錄，不拿它覆蓋量測品質；舊值繼續依時間老化。

## INT16×0.1溫度解碼案例

假設設備以一個16位帶符號整數回傳溫度，工程單位為原始值×0.1 °C。原始值253解碼為25.3 °C，原始值-50為-5.0 °C。這是本文自訂設備資料格式，不代表所有Modbus設備；資料表若指定無號、不同倍率或高低位元組順序，必須依資料表改寫。

設定工程範圍為-40.0至125.0 °C，無效碼為INT16最小值-32768。收到253時先確認功能碼、長度、位址與來源，再計算25.3並更新最後有效接收時間；來源時間只有設備確實提供才保存；收到-32768時不把它乘0.1變成-3276.8，而是保留上一個顯示值、quality=Bad、reason=INVALID_CODE。收到1500則為150.0 °C，超出上限，同樣不可標Fresh。

| 原始INT16 | 換算 | 品質與處理 |
| --- | --- | --- |
| 253 | 253×0.1=25.3°C | 範圍內，PDU有效則Fresh |
| -50 | -50×0.1=-5.0°C | 範圍內，PDU有效則Fresh |
| 1500 | 1500×0.1=150.0°C | 超上限，Bad，保留上一值 |
| -32768 | 自訂無效碼，不換算 | Bad，記錄INVALID_CODE |

當PDU回覆的交易識別不符合目前請求，必須丟棄並記錄LATE_RESPONSE，不可用它刷新資料age。若Unit ID或功能碼錯誤，即使TCP與Modbus例外格式正確，也不能更新最後有效值。這些檢查應在縮放前完成，避免錯誤封包先寫入資料庫再被另一層修正。

若通訊函式只回傳一個整數，應在邊界先做符號解碼，不能用無號型別直接比較。工程範圍比較也要在縮放後或等價的原始值範圍內一致執行：-40.0至125.0 °C對應原始值-400至1250。所有拒絕原因要寫入日誌，否則維護人員只會看到溫度長時間不變。

## 接收時間與設備來源時間

分開保存本次receivedAt和lastValidReceivedAt：前者記錄本次封包到達時間，後者只在該測點資料通過全部檢查時更新。sourceTimestamp是設備確實提供的量測時間，沒有便填null，不能以接收時間冒充。age用本機單調時鐘距離最後有效接收的秒數計算；UTC時間供記錄比對，不能直接拿會校時的牆上時鐘當逾時計時器。

若設備提供的來源時間晚於本機目前時間、格式錯誤或跳回過去，該次PDU仍可依資料內容判定，但要把sourceTimeValid設為false並記錄原因；是否允許進入Fresh需由明確規則決定。本文規則是來源時間缺失不阻止Fresh，因為Modbus常沒有時間欄位；來源時間存在但不可信時，Fresh仍可代表通訊資料新鮮，歷史分析則標記時間不可靠。

| 欄位 | 範例 | 用途 |
| --- | --- | --- |
| value | 25.3 °C | 最後通過驗證的工程值 |
| lastValidReceivedAt | 本機12:00:05.200 | 最後有效值的接收時間；另存單調時鐘值 |
| sourceTimestamp | 設備12:00:04.900或null | 判斷量測來源時間 |
| qualityReason | OK/INVALID_CODE/TIMEOUT | 告警、排查與歷史追溯 |

時間門檻要用單調時鐘比較，資料庫保存的UTC時間則供人員追溯。若系統校時把牆上時鐘往回調，age不能因此變成負值；若設備來源時間跳回，sourceTimeValid應為false，但receivedAt和quality規則仍可依本文定義運作。

驗收時先建立一筆253的正常基線，再故意送出-32768、1500、錯誤Unit ID、錯誤功能碼和逾時。每種情境都要記錄raw值、換算值、quality、reason、兩個時間戳、lastValidPdu是否改變與控制輸出是否被禁止，不能只看畫面顏色。

案例：設備在12:00:00量到253，網路延遲200 ms，客戶端12:00:00.200收到。sourceTimestamp應為12:00:00，receivedAt為12:00:00.200；12:00:05時資料age約4.8秒，仍Fresh。若12:00:06沒有新PDU，age約5.8秒，轉Stale；這不是因為數值25.3改變，而是有效資料取得時間已過門檻。

## 逾時 保留與恢復時間線

自訂輪詢週期兩秒，單筆期限500 ms。t=0與t=2各取得253，所以最後有效時間為2。t=4送出請求，在4.5逾時；age=2.5秒，仍Fresh但通訊失敗計數增加。t=7的age=5秒轉Stale；t=32的age=30秒轉Bad。從頭到尾保留25.3作診斷，不因同一數字沒有變動就重新計時。

恢復接續前例：t=32為Bad；t=32.5收到1500，解碼為150.0°C，超出自訂125°C上限，保持Bad與最後有效時間2。t=33收到253且通過交易、格式、解碼與範圍檢查，才同時更新25.3、最後有效接收時間33、Fresh與可用狀態。正常回覆沒有一個通用的例外碼零欄位，應按正常或例外PDU結構解析。

| 時間/事件 | 原始值與結果 | 狀態動作 |
| --- | --- | --- |
| 0與2 s | 253→25.3°C | 最後有效時間更新到2 |
| 4.5 s | 4秒請求逾時；age=2.5 | Fresh；失敗計數加一 |
| 7 s | age=5 | Stale；禁止當即時控制量 |
| 32 s | age=30 | Bad；資料過期告警 |
| 32.5 s | 1500超範圍 | Bad；最後有效時間仍2 |
| 33 s | 253驗證通過 | Fresh；最後有效時間改33 |

品質告警要區分TIMEOUT、INVALID_CODE、OUT_OF_RANGE、BAD_TRANSACTION和NO_INITIAL_VALUE。恢復時清除的應是對應連續失敗計數，歷史事件仍保留；否則操作員只看到目前Fresh，無法知道中間曾經有30秒資料中斷。

歷史趨勢應把缺測期間寫成Bad或明確空值，不能用前值補滿後再標Fresh。若業務需要插值，插值結果要另標derived並保存來源區間，不能覆蓋原始Modbus品質。

若設備資料表的比例、符號或無效碼與本文不同，應以設備文件覆蓋本文示例並在設定檔標明版本。換設備或韌體後重新執行邊界測試，避免沿用舊倍率造成假Fresh。

驗收報告保存原始封包、品質狀態與設定版本，讓換機後仍能追溯。

資料庫或SCADA可以保存Bad之前的最後值，但查詢介面應同時返回quality、reason、receivedAt和sourceTimestamp。只返回25.3而省略Bad狀態，會讓下游以為設備目前仍正常。

## FAQ與官方概念依據

FAQ 1：Fresh、Stale、Bad是Modbus標準狀態嗎？答：不是。它們是本文為應用資料品質自訂的規則；Modbus回覆成功仍需做資料語義、範圍與新鮮度檢查。

FAQ2：逾時後一定要清零或立即Bad嗎？本篇不清零，也不立即Bad；保留最後有效值並按age門檻分類，同時增加通訊失敗記錄。Stale與Bad不得被本篇示例當成即時控制量；實際停機、替代量或其他動作須由製程設計決定。

FAQ 3：沒有設備來源時間時，receivedAt可以當sourceTimestamp嗎？答：不可以冒充。最後有效接收的單調時鐘值可用於資料age，sourceTimestamp應為null或標記不可用。

FAQ 4：收到正常PDU就能清除Bad嗎？答：不能。要先通過INT16解碼、無效碼、工程範圍、交易與來源檢查；例如1500雖是正常封包，150.0°C超範圍仍是Bad。

參考：[OPC UA Part 4 §7.11 DataValue：StatusCode、SourceTimestamp與ServerTimestamp的資料品質概念。](https://reference.opcfoundation.org/specs/OPC-10000-4/7.11)

若SCADA只允許一個品質欄位，可在介面層將Fresh映射為可用、Stale映射為不確定、Bad映射為不可用，但要保留原始qualityReason。這種映射是整合層決定，不應宣稱它是Modbus回覆中的標準欄位。

資料恢復後第一個有效253要同時解除Bad告警、更新接收時間並重設失敗計數；若只有PDU到達但範圍錯誤，告警保持不變。這個順序可避免短暫錯誤值先被控制程式採用。

參考：[OPC UA Part 8 A.4.3 Data and error mapping：Quality與Timestamp映射概念。](https://reference.opcfoundation.org/specs/OPC-10000-8/a-4-3)

本篇為應用層模型，不指定PLC、SCADA型號或現成品質代碼。OPC UA來源用於品質與時間戳概念，不表示Fresh、Stale、Bad可直接當標準StatusCode數值。上述時間線與測試輸入為離線設計。

## 延伸閱讀

- [Modbus Security/TLS怎麼導入 802 憑證與角色授權的邊界](/articles/modbus-security-tls-certificates-roles)
- [Modbus TCP資料分塊與最大讀取量](/articles/modbus-tcp-register-block-read-limits)
