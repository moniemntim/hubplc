---
title: 多警報如何按嚴重度與時間穩定排序
description: 以 OPC UA severity、事件時間與唯一識別建立穩定警報排序，並分開 active、acknowledged 與 cleared 狀態。
date: 2026-09-21
author: 茂伯
draft: false
category: HMI 畫面與操作
---

## 先分 severity vendor priority 與事件狀態

同一設備同時出現高溫、通訊中斷與門未關，畫面若只照收到順序排列，操作員可能先處理較晚但較輕的訊息。先定義資料契約：severity 是嚴重度，priority 是廠商或產品自訂優先欄位，active、acknowledged、cleared 則是事件生命週期。它們不能放進同一個數字欄位混算。

OPC UA Part 5 BaseEventType 的 Severity 定義為 1 到 1000，數值越高代表越嚴重；應以該標準欄位核對來源。它不等於某廠商 priority=1 最重要的慣例。若兩個來源同時提供 severity 與 vendor_priority，介面應保留原值，排序只採已寫入規格的主鍵。

事件時間也要先定義是發生時間、來源時間還是接收時間。來源時間未知時不能假裝精確；可保留 uncertainty 或缺值標記，將該筆排到同 severity 的不確定群組。不要使用不同設備的牆鐘直接比較，也不要因網路較快就把接收時間當發生時間。

本文採自訂清單模型，不聲稱任何 Q 系列 PLC 或 HMI 原生提供此排序。每筆事件至少帶 source_id、condition_id、event_id、severity、event_time、receive_time、active、acknowledged、cleared 與時間不確定度，讓後續排序和排查都有原始證據。

若排序服務重新啟動，應從保存的事件快照重建，而不是按照資料庫回傳的任意順序直接顯示。快照要帶規則版本、來源時間與最後排序鍵；規則版本改變時，應在畫面留下重新排序的原因，避免操作員以為設備又發生一次警報。

對同一 condition 的重複通知，應保留首次發生、最近更新與目前狀態，不要每次重送都新增一列。若來源只給文字沒有事件號，清單可標示可能重複並要求人工合併；這比把兩次通知誤算成兩個故障更容易追查。

## 建立可重現的穩定排序鍵

固定排序鍵依序為 severity 降冪、time_quality_group、UTC nominal event_time 升冪、source_id 與 event_id 組成的唯一鍵升冪。跨 source 的 event_id 不保證唯一，必須把 source_id 一起納入。不要用區間重疊做 pairwise 比較，因為它可能不具傳遞性；不確定度只作附註，不宣稱事件因果。

例：A 高溫 severity=900、事件時間 10:00:05；B 門未關 severity=700、時間 10:00:01；C 通訊告警 severity=900、時間 10:00:03。排序為 C、A、B。若 C 與 A 時間相同，使用 event_id 做最後比較；不能因 C 先抵達就永遠置頂。

如果 severity 相同而時間一筆未知，另一筆是精確 10:00:04，固定把未知時間的 time_quality_group 排在同級已知時間之後；不要以區間重疊反覆比較。UTC nominal time 必須來自可信的來源時鐘，無法轉換時標為未知。規則需寫進測試案例，避免工程師各自用 last received wins。

重複事件要先以 source_id、condition_id、event_id 去重，再排序；缺少唯一識別時只能標記可能重複，不能用訊息文字猜測相同。排序完成後輸出原始欄位與排序鍵，操作員能看到為何某警報在前，也能追查來源是否重送。

當兩台設備的時間不能同步，仍可用同一來源內的事件序號或單調計數排序，但跨來源只應標為近似順序。若唯一識別重複或缺失，先進入待確認區，不要猜測合併。這種保守結果雖然看起來不如自動排序俐落，卻能避免把不同故障錯接成一筆。

排序結果可輸出測試用摘要：每列的 severity、事件時間、唯一識別與狀態。驗收人員依摘要重跑排序，便能確認換頁、重新整理或重啟後沒有偷偷改用接收順序。

## active ack 與復歸清單分開處理

active 表示條件仍存在，acknowledged 表示有人已讀或確認，兩者不是同一件事。已確認但仍 active 的高溫，應留在作用中清單並顯示已確認；未確認但已 cleared 的事件，應進入待檢視或復歸清單，不能因畫面不再閃爍就刪除。

一個可操作的畫面可分三區：作用中未確認、作用中已確認、已復歸待結案。每區仍使用同一穩定排序鍵。例 A severity=900 已確認仍作用中，B severity=800 未確認但已復歸；A 顯示在作用中區，B 顯示在復歸區，不用一個總分把兩種狀態混為同一警報。

收到 acknowledgement 時只轉換 ack 狀態，不能順便把 active 清掉；收到 clear 時只記錄復歸時間，還要保留原本的確認者、原因與來源。若事件狀態來自不同封包，應以版本或來源序號確認新舊，不能單靠接收順序覆蓋較新的狀態。

正常結果是同一批事件刷新後順序不變，已確認和未確認分區正確。失敗結果通常是排序跳動、已確認警報消失或復歸事件被誤當新警報。排查時先比對原始 event_id、狀態轉換時間與排序鍵，再查 UI 快取，不要先調整字型或顏色。

## 驗收 限制與來源

離線驗收至少包括：三筆不同 severity；兩筆同 severity、不同事件時間；同時間不同 event_id；跨 source 的相同 event_id；同一事件依序 active、ack、clear；重送相同事件；以及缺少來源時間。要特別測三個互相重疊但不具傳遞性的時間區間，確認程式只使用固定 total key。預期每次重算都相同，狀態變更只更新對應欄位。

限制是來源設備可能沒有同一時鐘、唯一事件號或完整 acknowledge 語意；此時只能顯示不確定，不應自行補造精確時間。severity 的實際語意需依資訊模型和設備文件確認，廠商 priority 也要另訂對照表。這篇是資料設計與驗收模型。

換頁查詢須固定資料快照或使用相同排序鍵游標；若查第一頁後又有新事件插入，單純使用列數offset可能重複或漏列。驗收時在換頁途中加入高嚴重度事件，確認畫面會提示重新整理，或依快照維持原結果；不能把資料更新造成的漏列歸因於警報已消失。

任何自動排序都應讓值班人員看見規則版本與資料時間，否則同一警報在不同畫面出現不同位置時，現場無法判斷是新事件還是顯示器差異。

## 常見問題與官方參考

FAQ1：OPC UA severity=1 是最嚴重嗎？答：Part 5 BaseEventType 規定範圍 1 到 1000 且數值越高越嚴重；仍須核對來源是否依該欄位提供資料。

FAQ2：vendor priority=1 可以直接當 severity=1000 嗎？答：不可以，兩者語意不同，必須有明確映射規格。

FAQ3：已確認的 active 警報可以移除嗎？答：不應移除，應保留 active 並標示 acknowledged，直到收到可靠復歸。

FAQ4：事件時間缺失能用接收時間補上嗎？答：可作顯示或排序的降級欄位，但必須標為接收時間與不確定；固定鍵仍把同 severity 的未知時間排在已知時間後，不能冒充發生時間。

參考：[OPC Foundation OPC UA Part 9 Alarms and Conditions，Severity、事件與確認／復歸語意參考；實際設備仍須核對其資訊模型。](https://reference.opcfoundation.org/Core/Part9/v105/docs/)

參考：[OPC Foundation OPC UA Part 5 Information Model，事件欄位與型別的官方參考。](https://reference.opcfoundation.org/Core/Part5/v105/docs/)

排序規則也要處理資料延遲：晚到的高嚴重度事件可以插入目前清單，但不能改寫已完成的處理紀錄。畫面應顯示 late arrival 與收到時間，讓操作員知道排序改變是補資料造成。若事件已被確認或復歸，晚到封包只能依版本規則更新，不能清掉人工處置證據。

## 延伸閱讀

- [警報抑制怎麼管 原因 期限與恢復條件要分開](/articles/alarm-suppression-shelving-outofservice)
- [HMI品質Bad如何避免把舊值誤認新值](/articles/hmi-bad-quality-stale-value)
