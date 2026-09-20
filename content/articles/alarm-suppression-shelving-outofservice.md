---
title: 警報抑制怎麼管 原因 期限與恢復條件要分開
description: 教你區分設計抑制、操作員擱置、維護離線與停用，建立期限、責任、到期重評估及歷史保留。
date: 2026-09-21
author: 站長
draft: false
category: HMI 畫面與操作
---

## 一 抑制不是消除原因

警報抑制只改變通知或顯示策略，不會把製程條件變成正常。先保存active、suppressionMode、reason、owner、startTime、expiryTime、authorization與sourceTimestamp，再決定畫面是否暫時不彈出。Active=true而suppressed=true是合理狀態；操作員不可因畫面安靜就判斷設備已安全。

三類語意要拆開。suppressedByDesign通常是系統依已知運轉狀態自動抑制，例如停機期間不顯示某些非適用警報；shelving是操作員暫時擱置干擾警報，應有期限或明確解除；outOfService是維護人員表示儀表或警報來源正在維護。另有deactivate/disable類功能時，應依產品定義表示停用警報源，不可把它當成一般擱置。

抑制記錄還應保存scope，說明只影響某個客戶端、某個區域，還是所有訂閱者。若一台HMI本地隱藏而伺服器仍發送警報，不能把localHidden寫成標準SuppressedState；兩者在查詢與稽核上要分欄，避免維修人員誤判全廠都已抑制。

| 模式 | 觸發者 | 警報原因是否仍計算 | 恢復方式 |
| --- | --- | --- | --- |
| suppressedByDesign | 系統/策略 | 是 | 條件離開設計狀態後重評估 |
| shelving | 操作員授權 | 是 | 到期、Unshelve或策略解除 |
| outOfService | 維護角色 | 依產品仍監測或標記不可用 | PlaceInService與檢查結果 |
| deactivate | 系統管理者/工程流程 | 依產品可能停止產生事件 | 重新啟用並重新評估 |

不確定某產品的deactivate是否等同OPC UA Disable時，不要直接套用名稱。先查該產品對Condition、Alarm、Shelving與OutOfService的實作；若只做自訂資料庫，就在欄位字典寫清楚轉換，不冒充標準狀態。

## 二 期限 owner與授權

每次抑制都必須有可檢查的責任資訊。建立記錄時要求owner、reason、authorization、開始時間與預計到期；例如操作員O17在14:00因泵浦維修將P-101 shelving到14:30。到14:30由服務端重新評估Active，不要只把顯示旗標改回false。若條件仍存在，警報應再次可見並建立unshelve或expiry事件。

期限不是永久許可。產品若提供MaxTimeShelved或TimedShelve，要遵守其上限；沒有期限能力時，在自訂層另設最長時間與值班清單，並定期提醒主管覆核。到期處理要具備冪等性：重複收到到期工作不應建立多筆恢復事件，也不能自動清除歷史。

本文時間例採TimedShelve；OPC UA另有OneShotShelve，其解除與警報狀態轉換有關，仍受模型的最長擱置限制。設計型抑制通常以運轉條件解除，維護模式則以復役程序解除；不可要求所有模式都使用同一個到期計時器。

授權失敗、owner不存在或reason太短時，拒絕建立抑制並顯示原因。變更時保存前後值、操作者、來源客戶端、稽核ID與伺服器時間。共用帳號會使owner不可追溯，應改用個人身分或額外工單關聯；這是稽核設計，不是把HMI隱藏當作權限控制。

案例中維護人員可輸入工單WO-781、owner=M12、reason=更換溫度探頭、expiry=16:00。服務端在建立時檢查角色，並在15:50提醒；若工單延長，應建立新的授權變更而不是悄悄改掉原到期時間。這讓逾期抑制仍可被追責。

| 欄位 | 例值 | 驗收問題 |
| --- | --- | --- |
| alarmId | P-101-HighTemp | 是否穩定識別同一來源 |
| mode | shelving | 是否與outOfService分開 |
| owner/reason | O17/泵浦維修 | 是否可追責且具體 |
| expiry | 14:30 | 到期是否重新評估Active |
| authorization | role=maintenance | 無權限是否拒絕 |

## 三 恢復與歷史保留

恢復流程先讀原始條件，再清除顯示抑制。假設P-101在14:00仍高溫，14:30 shelving到期：服務端產生Unshelved，重新計算Active=true，畫面顯示高溫仍在，並把到期原因寫入歷史。若14:20溫度已恢復，14:30只會完成抑制狀態收尾，Active應依事件模型為false；不能用到期事件硬設成Active或Inactive。

歷史資料不能因抑制而刪除。至少保存原始Active transition、每次抑制與解除、到期、owner、reason、授權、source/server timestamp及當時quality。報表可提供「抑制中清單」與「曾抑制事件」兩種視圖：前者回答現在有哪些被隱藏，後者回答誰在何時、為何改變顯示。

持續抑制清單應每日或每班檢查，列出已超期、無owner、理由過期、來源已變更及仍Active的項目。若來源品質變成Bad，不要因抑制而隱藏品質警示；可以改用系統故障類別呈現，並把資料不可用與警報顯示策略分開。這樣維護人員不會把沉默誤認成正常。

對於同一警報連續兩次shelving，要分別記錄兩個區間，不要把總時間相加後改寫成一次永久抑制。若來源已經換成新儀表，舊outOfService狀態也不能自動套到新來源；新來源要重新建立條件與責任資訊。

| 時間 | 事件 | Active | 顯示 | 歷史處理 |
| --- | --- | --- | --- | --- |
| 14:00 | 建立shelving | 是 | 暫停通知 | 記錄owner/reason/expiry |
| 14:20 | 來源恢復 | 否 | 仍可查事件 | 記錄復歸，不刪抑制 |
| 14:30 | 到期重評估 | 依原始條件 | 解除隱藏 | 記錄expiry/unshelve |
| 14:35 | 再次高溫 | 是 | 重新顯示 | 新occurrence或新transition |

## 四 平台差異與排查

OPC UA Part 9把SuppressedState、OutOfServiceState與ShelvingState分成不同用途，AlarmCondition也有SuppressedOrShelved與MaxTimeShelved等模型元件。這些欄位是否暴露、方法是否可呼叫，仍取決於伺服器的支援與建模。一般HMI的「隱藏」按鈕可能只是本地畫面設定，不能宣稱已寫入標準ShelvingState，更不能因此改變PLC或安全控制。

排查先看三份證據：來源條件目前值與品質、伺服器Condition狀態、客戶端顯示過濾。若伺服器Active=true且SuppressedOrShelved=true，顯示安靜可能是正常抑制；若伺服器仍未抑制但單一HMI看不到，應查本地過濾或快取。若到期未恢復，查服務端時鐘、expiry持久化、權限及重啟後狀態恢復策略。

本教學不提供關閉安全警報的方法，也不把抑制當作安全旁路。任何涉及人身或設備保護的功能，都必須依適用安全標準、風險評估與獨立驗證設計。本文只處理警報資訊的責任、顯示、稽核與重新評估。完成驗收時，必須證明原始Active transition仍可追溯、抑制有期限與owner、到期會重新計算、歷史不被刪除。

若服務重啟，先決定哪些狀態可恢復，哪些必須標成需要人工覆核；OPC UA若無法判定ShelvedStateMachine原狀態，規範要求設為Unshelved；這不代表Active已恢復正常，自訂NeedsReview只能作額外提示。恢復後重新讀取來源與狀態，並產生服務重啟事件，讓值班人員知道期間可能存在的顯示缺口。

恢復驗收可故意讓服務重啟發生在抑制期間，檢查重啟後仍保留owner、expiry與模式，且能讀回Active。若產品無法持久化，應明示重啟後轉為NeedsReview並告知值班人員，若為OPC UA且原Shelving狀態無法確認，應設Unshelved並重新呈現仍Active警報；NeedsReview是附加稽核狀態，不能取代標準狀態。

## 五 FAQ與官方來源

FAQ1：shelving後Active會變成false嗎？答：不會因shelving自動變成正常；它主要影響顯示，Active仍依來源條件計算。

FAQ2：suppressedByDesign、shelving與outOfService能用同一個Suppressed旗標嗎？答：不建議；責任角色、原因與恢復條件不同，至少要保存模式與來源。

FAQ3：到期時可以直接清除警報嗎？答：不可以。到期應重新評估來源；條件仍在就重新顯示，條件已恢復才由事件模型轉為非Active。

FAQ4：把HMI按鈕隱藏起來是否等於限制權限？答：不是。權限要在服務端或方法層驗證，並記錄owner、授權與稽核事件。

參考：[OPC Foundation OPC UA Part 9，AlarmCondition的SuppressedState、OutOfServiceState、ShelvingState與期限。](https://reference.opcfoundation.org/specs/OPC-10000-9/5.8)

參考：[OPC Foundation OPC UA Part 9，ShelvingStateMachine與TimedShelve/Unshelve方法。](https://reference.opcfoundation.org/specs/OPC-10000-9/5.8.17)

## 延伸閱讀

- [警報確認與警報消失怎麼分 建立可追溯的警報狀態](/articles/alarm-acknowledge-clear-occurrence)
- [多警報如何按嚴重度與時間穩定排序](/articles/alarm-severity-time-stable-order)
