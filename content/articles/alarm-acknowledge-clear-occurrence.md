---
title: 警報確認與警報消失怎麼分 建立可追溯的警報狀態
description: 教你把警報發生、確認、復歸與可選Confirm分開建模，保留occurrence與稽核資料。
date: 2026-09-21
author: 站長
draft: false
category: HMI 畫面與操作
---

## 一 先分清四種狀態

警報畫面最容易出錯的地方，是把「有人看過」與「異常已消失」放在同一個布林值。實作時至少保存ActiveState、AckedState、occurrenceId、首次發生時間、最近變化時間與原因。Active表示條件目前仍存在；Acked表示操作員已確認收到通知。兩者互不取代，因此同一筆警報可能是Active+Unacked、Active+Acked、Inactive+Unacked或Inactive+Acked。

先設計狀態表再設計按鈕。警報初次越限時建立occurrenceId，例如P-101-20260920-0007，Active=true、Acked=false；操作員按確認只把Acked改成true並記錄帳號、時間與備註，不能改Active，也不能寫入設備輸出。條件恢復正常時Active=false；如果此前沒有人確認，結果是Inactive+Unacked，清單仍要保留待確認標記，避免警報消失後責任線索一併消失。

實務上不要以畫面顏色推算狀態，因為不同客戶端可能把未確認、未復歸和高嚴重度使用不同色彩。資料模型應把四組狀態直接提供給查詢端，並在每次轉換產生不可變事件。若來源在同一毫秒內抖動，仍以伺服器定義的去抖與occurrence規則處理，不以最後一次輪詢結果覆蓋整段歷史。

| Active | Acked | 畫面意義 | 允許的下一步 |
| --- | --- | --- | --- |
| 是 | 否 | 異常仍在且尚未確認 | 查原因、確認、持續追蹤 |
| 是 | 是 | 異常仍在但已確認 | 修復條件，不重複假定已處理 |
| 否 | 否 | 異常已消失但未確認 | 顯示待確認與復歸時間 |
| 否 | 是 | 異常已消失且已確認 | 本例可封存；有待Confirm則仍需處理 |

這裡的復歸只描述輸入條件回到正常，不表示程序已安全，也不表示設備已重置。若工程需要Reset、解除鎖存或重新允許啟動，應另定控制流程與權限；本篇只管理警報資訊，不能拿確認按鈕代替安全迴路或機台復位。

## 二 occurrence與確認操作

以下occurrenceId與expectedRevision是本篇自訂事件庫欄位，並非OPC UA方法參數。OPC UA Acknowledge使用EventId與Comment；EventId識別事件通知，Condition及其保留分支另依伺服器模型處理，不能直接把occurrenceId當EventId傳入。

每次從非警報變成警報都建立新的occurrenceId，即使同一個來源節點重複發生。若P-101在10:00:00越限，10:00:05按Ack，10:00:08恢復，該筆仍保留Active=false、Acked=true；10:00:20再次越限必須建立0008，而不是把0007重新打開。這樣趨勢、值班報表和重複發生次數才不會混成一筆。

確認服務要驗證操作者身分、操作權限與目前occurrence版本。畫面送出Ack時帶occurrenceId與expectedRevision；本例若目標版本不同，要求重新讀取並明確選定事件；若舊occurrence仍待確認，可對該筆合法歷史項目確認，不能誤確認新發生那筆。成功後寫入ackUser、ackTime、ackComment與auditEventId。備註應說明看到了什麼或採取哪個資訊處理，不要用「已修好」代替實際證據。

OPC UA Part 9的AcknowledgeableCondition提供Acknowledge與可選的Confirm概念。Acknowledge表示操作員確認已看到通知，不保證製程問題已處理；Confirm是另一個可選的後續確認，不能把它當成所有產品都必須具備的第二次Ack。若產品只支援Ack，就在文件中明說Confirm不存在，不要自行把按鈕名稱映射成標準方法。

確認回應成功後，客戶端要重新讀取Condition，而不是相信按鈕本地已變色。若網路重試造成相同Ack送出兩次，服務端以occurrenceId和版本去重；不可把舊occurrence的確認套到新occurrence；舊事件是否可確認，依事件保留與權限規則處理。這項設計特別重要於多個值班站台同時看同一警報。

| 時間 | Active | Acked | occurrence | 應記錄 |
| --- | --- | --- | --- | --- |
| 10:00:00 | 是 | 否 | 0007 | 越限值、source time、原因 |
| 10:00:05 | 是 | 是 | 0007 | 使用者、Ack時間、備註 |
| 10:00:08 | 否 | 是 | 0007 | 恢復值、復歸時間 |
| 10:00:20 | 是 | 否 | 0008 | 新事件，不沿用0007 |

## 三 復歸未確認與重複通知

復歸事件不應自動完成確認。對於Inactive+Unacked，列表可以降低聲音或移到「已消失待確認」區，但仍顯示來源、發生、復歸和未確認狀態。若策略允許自動抑制重複聲音，必須留下silence或notification policy事件，不能修改Acked。這能讓交班人員知道異常雖然暫時消失，仍沒有任何人承擔確認責任。

建立事件處理器時，先處理occurrence邊界，再處理通知。來源值在上升穿越門檻時產生Active transition；值在回復區間並連續穩定指定時間才產生Inactive transition，避免一個抖動訊號快速產生多筆事件。若有on-delay或off-delay，延遲只影響Active轉換時刻，不能把Ack時間改成條件時間。時間欄位要明確標sourceTimestamp、serverTimestamp與receiveTimestamp。

常見失敗是把「清除警報」寫成清零輸入或呼叫設備Reset。排查時先比對原始輸入、門檻與去抖計時，再查服務端事件版本及是否收到Ack；若Active已否但Acked仍否，這不是程式錯誤，而是設計上保留待確認。若同一occurrence出現兩個Ack，依版本只接受第一個有效操作，其餘記為重複請求。

案例驗收可加入夜班交接：甲班在10:05看到Active+Unacked，10:07確認，10:10條件恢復；乙班在10:15查詢，應能看到同一occurrence的完整時間線，而不是只看到一條Inactive紀錄。若10:20再次越限，乙班看到新occurrence並能分辨兩次原因。

| 症狀 | 先查 | 合理結果 |
| --- | --- | --- |
| 警報消失卻仍紅色待處理 | Active/Acked兩欄 | Inactive+Unacked可成立 |
| 按Ack後仍顯示異常 | 輸入與ActiveState | Active不應被Ack清除 |
| 重發通知變新事件 | occurrence邊界 | 同一事件沿用occurrenceId |
| 復歸後又立即出現 | off-delay與原始值 | 新occurrence才新編號 |

## 四 驗收與平台限制

驗收先用虛擬輸入做四組組合，而不是直接在運轉設備按按鈕。依序注入越限、Ack、恢復、再次越限，檢查每一步的Active、Acked、occurrenceId、時間戳和audit事件。再測Ack請求延遲、重複點擊、權限不足、服務重啟與兩個客戶端同時確認。重啟後是否恢復Active或待Ack，取決於產品是否持久化條件狀態，必須查該平台文件。

若使用OPC UA，先確認伺服器真的公開AcknowledgeableConditionType、AlarmConditionType及對應方法，不能只因有警報畫面就宣稱符合Part 9。不同HMI可能只同步目前狀態，不提供完整歷史；此時外部事件庫要保存occurrence與audit資料。Q系列PLC或一般HMI不會因變數名稱叫Ack就自動得到OPC UA語意，介面層必須明確轉換與驗證。

完成標準是：四種狀態可重現、復歸未確認不消失、重發產生新occurrence、Ack不改Active、不觸發Reset或機台動作，且每項操作可由帳號與時間追溯。若產品沒有Confirm，文件明示不支援；若要做安全停機，另由合格的安全設計、驗證與獨立回路負責。

排查時優先看原始事件序列，不要只看最後一格畫面。把source event、server event、Ack方法回應與客戶端顯示分開比對，才能知道是來源沒有復歸、Ack沒有送達、版本衝突，還是畫面快取未刷新。

若資料庫只保存目前狀態，至少要另外保存transition事件；若只保存事件而沒有目前快照，畫面載入會慢且容易漏掉待Ack項目。實作可採目前快照加追加式事件兩層，但需定期以事件重建快照驗證一致性。

## 五 FAQ與官方來源

OPC UA AlarmManager重啟後應恢復AckedState及支援時的ConfirmedState；若無法判定，標準要求設為false。自訂事件庫也要明訂恢復策略，不能把不明狀態自動當已確認。

FAQ1：按下Ack是否代表警報已處理？答：只代表確認收到，除非另有可核對的處理紀錄；Active仍可為真。

FAQ2：警報恢復正常但沒人按Ack，可以直接刪除嗎？答：不應刪除；保留Inactive+Unacked，依政策顯示待確認並保存occurrence。

FAQ3：Confirm是不是第二次Ack？答：它是可選的另一個語意，是否存在要看實作；不可把Ack與Confirm混稱。

FAQ4：Ack按鈕能不能順便Reset機台？答：不能以一般警報確認代替Reset或安全控制；兩者應分開權限、事件與驗證。

參考：[OPC Foundation OPC UA Part 9，AcknowledgeableCondition與Acknowledge/Confirm方法。](https://reference.opcfoundation.org/specs/OPC-10000-9/5.7)

參考：[OPC Foundation OPC UA Part 9，AlarmCondition的Active、Suppressed、OutOfService與Shelving模型。](https://reference.opcfoundation.org/specs/OPC-10000-9/5.8)

## 延伸閱讀

- [權限降級後已開啟的畫面如何重新套用限制](/articles/hmi-role-downgrade-open-screens)
- [警報抑制怎麼管 原因 期限與恢復條件要分開](/articles/alarm-suppression-shelving-outofservice)
