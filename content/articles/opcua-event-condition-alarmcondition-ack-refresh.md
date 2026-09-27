---
title: OPC UA告警的確認恢復與狀態同步
description: 區分DataChange、Event、Condition與AlarmCondition，透過HighHigh觸發、Ack、恢復與ConditionRefresh時序說明Ack不等於恢復，Refresh也不是歷史回放。
date: 2026-09-17
author: 茂伯
draft: false
---

## Event Condition與Alarm

OPC UA DataChange監看Variable值或StatusCode；Event Notification則在EventNotifier上建立MonitoredItem，靠EventFilter的SelectClause與WhereClause選欄位。Condition是會隨時間改變的模型，AlarmCondition延伸AcknowledgeableCondition，增加Active、Suppressed、Shelving等狀態。一次事件通知不是目前狀態表，也不是歷史回放。

本文用虛構HighHigh alarm離線設計，欄位包含EventId、ConditionId、BranchId、SourceNode、Time、Severity、Message、ActiveState、AckedState與Retain。事件資料與目前Condition狀態分開保存，不能只存HighHigh=1。

| 資料模型 | 訂閱方式 | 保存重點 |
| --- | --- | --- |
| Variable DataChange | MonitoredItem | Value、StatusCode、Timestamp |
| Base Event | EventNotifier + EventFilter | EventId、Time、SourceNode |
| Condition | Condition事件/狀態 | ConditionId、BranchId、Retain |
| AlarmCondition | Condition子型別 | Active、Acked、Severity、Message |

EventFilter欄位必須依Server暴露的EventType建立；不能猜SelectClause，也不能把任意Variable告警值當成Event。

Event的Time表示事件時間，ReceiveTime是伺服器收到事件的時間，Client再另記本地接收時間。EventNotificationList不是DataValue清單，不能假設每筆自動帶DataValue的ServerTimestamp或StatusCode；想保存的事件欄位需要依EventType選取，Condition品質則核對Quality欄位。

## Active Ack與恢復

本例採單一Condition的目前分支，Enabled=true、未抑制、未擱置，不要求Confirm；Retain只要仍Active或待Ack就為true。Acknowledge對應事件後，Server發新的狀態事件。E1、E2、E3只是本文識別代號，不是真實EventId格式；Ack成功不改變製程是否仍超限。

| 時間 | 事件/狀態 | Acked | Active | Retain |
| --- | --- | --- | --- | --- |
| t=100 | E1觸發HighHigh | false | true | true |
| t=120 | Ack E1成功後狀態E2 | true | true | true |
| t=150 | 值恢復狀態E3 | true | false | false |

EventId是事件實例識別，ConditionId是Condition實例，兩者不能互換。恢復時要保存同一Condition/Branch的狀態轉移與新的EventId，不能把Acked=true當作Active=false。Retain表示條件是否仍需保留給訂閱者，不是資料庫永久保存承諾。

離線驗收檢查t=120仍Active=true，t=150才變Active=false。若操作者在t=120按Ack但值仍高，畫面應顯示已確認且仍啟動；這正是Ack不等於恢復。

AlarmCondition可能有Branch。同一Condition在不同分支存在不同事件與確認狀態時，保存BranchId才能知道操作者確認哪一個分支；沒有Branch資料時，不要宣稱所有歷史告警都已確認。

## Refresh不是歷史回放

新建立Event subscription通常從建立後的轉移開始，不必補發完整歷史。ConditionRefresh用來同步仍保留的Condition狀態，不是一般歷史事件查詢，也不保證回放所有過去觸發。若Server發RefreshRequiredEventType，Client依模型啟動ConditionRefresh。

| 序列 | 收到內容 | Client處理 |
| --- | --- | --- |
| t=130 | 重連、RefreshStart | 標既有保留條件suspect |
| t=131 | 目前狀態E2，仍Active且已Ack | 移除該分支suspect，不新增觸發數 |
| t=150 | 新恢復狀態E3 | Active=false，Retain=false |
| t=151 | RefreshEnd | 移除未再確認的舊suspect項 |

RefreshStart後把目前保留條件標為待確認；刷新回報或新事件確認到的分支解除該標記，RefreshEnd後清掉仍待確認的舊項。本表沿用E1至E3案例，刷新同步到的是Ack後E2，不是原來尚未Ack的E1。刷新期間新事件可能交錯，不能把刷新每列都當新觸發。

歷史事件需使用Server提供的HistoryRead或專用能力，不能以Refresh名稱推定有完整歷史。重連後若只做Refresh，報告應說明它同步目前保留狀態，不能宣稱補回斷線期間每一筆事件。

Acknowledge方法的輸入通常包含EventId與comment等模型定義欄位，實際Argument需Browse後確認。不要把寫入一個Acked布林值當成通用OPC UA方法，也不要猜Method NodeId。

Retain=false不等於資料已從所有歷史刪除；它描述Condition是否仍需保留給訂閱同步。歷史保存要看Server的History能力與組織資料庫。

如果收到明確拒絕，依回覆原因更新操作狀態；若是網路逾時，確認是否已完成可能未知，不能直接宣稱Acked仍false。保存呼叫結果，透過狀態事件或產品支援的同步方式確認，避免操作員因沒回覆就反覆確認錯誤分支。

WhereClause過濾HighHigh不能取代所有事件保存。若條件從HighHigh降回High，仍需保存恢復事件或狀態轉移，否則只看過濾後通知會誤判Active。

事件流、Condition狀態與歷史資料各自保存來源與版本，重連報告才可說明哪些是同步到的目前狀態，哪些區間仍待查。

## Filter與離線驗收

建立EventFilter前先Browse目標EventType與欄位，依Namespace、TypeDefinition與BrowsePath形成SelectClause；WhereClause只用Server支援的欄位與運算。若欄位不存在，應保存Bad或建立失敗結果，不要把空欄位當正常事件。

| 驗收案例 | 預期保存 | 不可宣稱 |
| --- | --- | --- |
| HighHigh觸發 | E1、ConditionId、Active true | 不是歷史全量 |
| Acknowledge | Ack輸入E1，狀態E2仍Active | 不是恢復 |
| 恢復 | 新事件、Active false | 不是Ack動作 |
| Refresh | Start/狀態/End | 不是事件回放 |

保存EventId、ConditionId、BranchId、SourceNode、Time、Severity、Message、AckedState與Retain；來源節點與時間要和顯示文字分開。若只存Severity與Message，日後無法判斷是哪個條件分支被確認。

本文提供離線資料表與狀態轉移的預期結果，Server的Branch、Event queue、可選欄位及Refresh支援需逐項確認；Condition實例也不一定都作為可Browse的獨立節點暴露，不能假設所有狀態都能直接Read。

SelectClause選出的欄位集合要版本化。Server模型更新後，原本可用的BrowsePath可能消失或型別改變，Client應保存建立Filter時的結果與錯誤，而不是默默少欄位。

重連後取得E2目前狀態，不代表已取得斷線期間每次瞬時觸發。報告分開標示狀態同步完成與歷史缺口，若需要追查斷線時是否發生其他警報，另查產品歷史能力與保存範圍。

ConditionRefresh可能發出RefreshStart與RefreshEnd，也可能與新Event交錯。Client應以批次狀態暫存refresh資料，等排序規則與新事件處理後再發布目前狀態，避免刷新中的舊資料短暫覆蓋新告警。

離線驗收矩陣至少包含觸發、Ack未恢復、恢復、斷線Refresh、Refresh中交錯新Event、缺少可選欄位與Ack錯誤；每列標示預期EventId、ConditionId、BranchId及狀態。

## 事件識別與斷線時的判讀限制

WhereClause只用來過濾符合條件的Event，不是把事件轉成狀態表。若條件要監看HighHigh，仍要保存原始Severity、Message、SourceNode與EventId供稽核。

事件訂閱的建立時點要記錄。DataChange與Event不是同一個MonitoredItem，重連後只重建Variable監視不代表Alarm事件已恢復。驗收表分列EventNotifier、Filter、SelectClause與Condition同步狀態。

若Server不支援ConditionRefresh，重連後可見狀態可能不完整；這是能力缺口，應標品質未知並依產品文件查歷史或重新建立訂閱，不可把空畫面解讀成沒有告警。

將Time、ReceiveTime、Severity與Message分欄，Condition另保存Quality及需要的狀態。SelectClause結果若帶欄位錯誤，要與事件本身品質分開；只顯示目前Active會失去觸發、確認和恢復的處置歷程。

若事件來源Node或EventType不存在，Filter建立應標錯誤並停止更新，不可用空SelectClause當作所有事件。

測試結果應保留原始Notification、Filter版本與重連時間；只留轉換後的畫面文字不足以排查。

Refresh期間同一ConditionBranch可能出現新舊狀態，Client需識別重複及保留較新狀態。EventId是識別用的ByteString，不能按字典序或數字大小決定先後；時間相同或不可信時也不能自行猜測，要依SDK同步機制與原始通知順序核對。

本例t=100可搭配Severity=800、Message=Pressure high及虛構SourceNode。t=120在事件E2看到Acked=true，但Active仍true；t=150在E3看到Active=false。Severity是嚴重程度，不是事件ID，也不能用訊息文字相同推論是同一Condition。

EventId是ByteString，ConditionId及BranchId是NodeId，應保存各自型別與可逆編碼。再記來源Server身分，避免跨Server混用。ConditionId不能拿來當Acknowledge的EventId，EventId也不是通用可讀寫的節點位址。

## FAQ與來源

Refresh測試要加入同一分支的新事件與較舊的保留狀態，確認後到的舊資料不會倒退目前狀態。再測RefreshEnd未到時保持同步未完成，不可因畫面暫時空白就宣告沒有告警。這些是預期驗收條件。

Retain狀態的畫面顯示要和歷史保存政策分開；操作者看到Retain=false，只能知道目前Condition不要求保留，不能推論資料庫沒有舊記錄。

若AlarmCondition支援Shelving，擱置狀態也要與Active、Acked分開，不能把暫時抑制當成恢復。

FAQ1：Acked=true代表告警恢復嗎？不代表，Ack與Active是不同狀態。

FAQ2：Refresh會補回斷線期間所有事件嗎？不一定，它主要同步仍保留的Condition狀態，不是歷史回放。

FAQ3：EventId與ConditionId相同嗎？不同，前者是事件實例，後者是Condition實例。

FAQ4：DataChange的HighHigh值就是Alarm Event嗎？不一定，EventNotifier、EventType與EventFilter要依Server模型確認。

案例、時間與狀態均為離線設計，未連接或確認任何現場警報。

參考：[OPC UA Part 4 §7.22.3 EventFilter：SelectClause與WhereClause。](https://reference.opcfoundation.org/specs/OPC-10000-4/7.22.3)

參考：[OPC UA Part 9 §4 Concepts：Event、Condition與AlarmCondition模型。](https://reference.opcfoundation.org/specs/OPC-10000-9/4)

參考：[OPC UA Part 9 §4.5 Condition state synchronization：ConditionRefresh同步。](https://reference.opcfoundation.org/specs/OPC-10000-9/4.5)

參考：[OPC UA Part 9 §5.7 Acknowledgeable Condition Model。](https://reference.opcfoundation.org/specs/OPC-10000-9/5.7)

## 延伸閱讀

- [OPC UA Deadband門檻與工程單位核對](/articles/opcua-datachange-filter-deadband-engineering-units)
- [OPC UA方法呼叫的參數與結果判讀](/articles/opcua-method-call-arguments-executable-audit)
