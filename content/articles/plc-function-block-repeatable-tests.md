---
title: 替 PLC 功能塊寫可重複測試 輸入序列與預期結果怎麼保存
description: 以虛構命令接受功能塊建立可重播測試資料，分開純函式與狀態測試，覆蓋正常、忙碌拒絕、重複請求與復歸。
date: 2026-09-17
author: 茂伯
draft: false
---

## 先把測試案例當成可重播資料

功能塊測試要保存初始狀態、每次呼叫輸入及預期結果，讓另一位工程師能重播。本篇使用自訂命令接受器；Start 表示當次送入一筆命令，不是內建上升緣指令。持續 Start=TRUE 代表每次呼叫都送一筆，讓重複請求案例有明確意義。真實按鈕若需邊緣偵測，應在外層另測。

每組案例至少保存CaseId、TesteeVersion、InitialState、InputSequence、ExpectedSequence與判定規則。InitialState不能只寫「正常」，要寫Busy=FALSE、Done=FALSE、ActiveId=0等欄位。InputSequence則逐次列出Start、Cancel、Reset、RequestId，並說明一次資料代表一次功能塊呼叫。

資料格式可用JSON、CSV或測試表保存，但欄位語意要先固定。序列中的TRUE、FALSE、數字、時間和識別碼都要有型別與單位；不能讓讀取器因空白或文字格式不同而默默改變測試。

介面固定如下：Accept、Done、RejectReason 每次呼叫先清零或 NONE；Busy 與 ActiveId 跨呼叫保存。完成時 Busy=FALSE、ActiveId=0，另存 LastCompletedId 及 ResultValid=TRUE。命令識別碼採正整數，0 為無效；空字串由測試讀取器拒絕，不能偷偷轉成零。

測試報告要保留第一個差異，而不是只列最後失敗。第一個差異可能是Accept沒有脈衝、Busy提前清除或Id被覆蓋，後面的Done錯誤往往只是連鎖結果。

CODESYS Test Manager官方文件把測試專案、測試案例與報告分開，IEC unit test可在控制器上以週期一致方式執行；本文只引用其資料化觀念。偽碼是教學表示，不能直接編譯。

## 先分純函式與狀態測試

純函式測試每筆輸入獨立。例如本例定義 Normalize(x)=x/100.0，合法範圍 0 到 100，超界回 Invalid、不發布結果；0、50、100 應得到 0、0.5、1。將順序改成 100、0、50，答案仍相同。這是自訂函式契約，不是某廠牌現成指令。

狀態功能塊則必須保留同一實例的連續呼叫。第一筆 Start=TRUE、RequestId=7 建立工作；第二筆再次送 7 時拒絕為 DUPLICATE，第三筆 CompleteId=7 才完成。若每列重建實例，就看不到重複識別碼或忙碌拒收。不同 CaseId 之間才重新初始化所有欄位。

完整初值為 Busy=FALSE、ActiveId=0、LastCompletedId=0、Accept=FALSE、Done=FALSE、ResultValid=FALSE、RejectReason=NONE。沒有佇列與背景工作。B01 及 R01 的忙碌前置狀態必須由一次合法 Start 建立；報告也保存該次呼叫，不能只直接修改 Busy 位元假裝已開始工作。

Reset 優先，清 Busy、ActiveId、LastCompletedId、ResultValid、Accept、Done 與 RejectReason；該次不接受 Start。Cancel 次之，Busy 時撤銷工作且不產生 Done。Complete 再次之，只有 Busy 且 CompleteId=ActiveId 才完成；最後才檢查 Start。同呼叫只執行一類事件。

完成後清理測試產生的臨時應用程式、強制值與測試旗標，並保存原始案例檔。測試程式若遺留在正式控制器，會讓日後診斷混淆。

版本欄位要跟著案例保存。若修正程式後既有CaseId的ExpectedSequence改變，先判斷是規格修正、錯誤修正還是非預期回歸；不要只把期望值改成新的實際值就標記通過。

## 四組命令案例與具體序列

本篇用四組回歸案例：正常接受與完成、Busy拒絕、重複RequestId、Reset復歸。每一組使用同一個功能塊實例但分開初始化，避免上一組留下的Busy污染下一組。命令資料與回饋資料分欄，因為接受命令和完成條件不是同一事件。

| 案例 | 連續呼叫輸入 | 逐次預期結果 |
| --- | --- | --- |
| N01 | Start7 → Complete7 → 無事件 | Accept1/Busy1 → Done1/Last7 → Done0/Last7 |
| B01 | Start8 → Start9 | 接受8 → BUSY_REJECTED，ActiveId仍8 |
| D01 | Start5 → Start5 | 接受5 → DUPLICATE，ActiveId仍5 |
| R01 | Start6 → Reset → Start9 | Busy1/Id6 → Busy0/Id0 → 接受9 |

每次重播先產生一個清楚的案例標識，報告用同一標識連回輸入檔、程式版本和測試環境。這讓失敗案例能被另一台機器再次執行，而不是只能看一張截圖。

Start 的檢查順序也要固定：先拒絕無效識別碼；若等於目前 ActiveId 或保存的 LastCompletedId，回 DUPLICATE；其他識別碼在 Busy 時回 BUSY_REJECTED。只有空閒且識別碼不同才接受。本例只記目前及最近完成的識別碼，不宣稱能防止所有歷史工作重播。

每組序列都應標明呼叫邊界：第一筆輸入在何時送入、完成回饋在哪一筆出現、功能塊輸出在何時取樣。若測試框架把一個序列壓成同一掃描，可能失去Busy與Done的時間意義；狀態測試必須保留呼叫順序。

N01 的 Done 只在第二次呼叫為 TRUE，第三次呼叫必須變回 FALSE，但 LastCompletedId=7 保留。B01 拒收9後仍等候8的完成。D01 的第二次拒收理由為 DUPLICATE，優先於一般忙碌拒收。R01 復歸與再次啟動分成兩次呼叫，不能在 Reset 同次期待 Accept。

## 邊界 錯誤與回歸判定

代表性邊界包括Start在第一呼叫、Complete早於Accept、Cancel與Complete同時出現、RequestId回到0、錯誤碼尚未清除又來新請求。每個案例要寫優先順序；例如本篇採Cancel優先於Complete，Reset優先於所有工作命令。不要只重複程式內的每一行條件，應挑能區分規格的情境。

| 邊界 | 輸入序列 | 預期事件與狀態 |
| --- | --- | --- |
| 提早完成 | Complete7 → Start7 | NO_ACTIVE且Done0 → 正常接受7 |
| 取消優先 | Start7 → Cancel+Complete7 | 接受7 → Busy0、Done0、Valid0 |
| 無效識別碼 | Start0 | INVALID_REQUEST、Busy0、Accept0 |
| 復歸優先 | Start7 → Reset+Start8 → Start8 | 接受7 → 全部清理不接受8 → 接受8 |

Complete 沒有現行工作時回 NO_ACTIVE；Busy 但識別碼不匹配時回 WRONG_ID，原工作仍存在。所有 RejectReason 都只表達當次拒收，下一次呼叫重設 NONE；若要保存錯誤歷史，測試記錄器另存事件。取消不產生完成紀錄；接受新工作會先清 ResultValid，避免把舊結果當成新結果。

純函式可用排列順序測試檢查參數獨立性，例如把輸入由0、50、100改成100、0、50；狀態功能塊則必須保留順序，因為順序本身就是行為的一部分。

版本修改後若輸出改變，先比對需求與介面契約，再決定更新程式或測試。測試表不是用來強迫新程式通過的橡皮章，而是保存已同意行為的證據。

版本回歸至少比較三件事：同一CaseId的結果是否改變、改變是否有需求單支持、失敗是否只出現在新案例。若改了內部資料結構但外部契約不應變，仍要重跑四組案例，因為狀態初始化和重置很容易被改壞。

## 保存報告 完成預期與FAQ

完成後應有一份可讀報告：每個CaseId列初始狀態、輸入序列、實際輸出、預期輸出、第一個差異位置、TesteeVersion與執行環境。通過表示本次序列符合契約，不表示所有可能輸入都正確，也不表示已在真實設備完成整合驗收。

失敗先查案例是否以同一實例連續呼叫、初始狀態是否真的重設、呼叫順序是否和輸入序列一致，再查RequestId、Busy優先級與Reset清除欄位。若實際結果只是少一個Done，先看完成回饋是否只存在一個呼叫週期，以及測試程式是否在那一刻讀取。

FAQ：一、純函式也要測前後呼叫嗎？可測順序獨立性，但不應依賴前值。二、狀態FB每個案例都能重建嗎？若要測跨呼叫，必須保存同一實例和完整序列。三、期望值不同就直接更新表嗎？不行，先判斷規格或程式哪一方錯。四、CODESYS Test Manager能代表所有PLC框架嗎？不能，平台介面、下載、報告與控制器限制需另查。

適用限制：CODESYS Test Manager官方文件支持測試專案、IEC測試案例和報告流程；Beckhoff TwinCAT Test Framework可作另一平台查閱入口。本文案例是離線設計。

參考：[CODESYS Test Manager 基本功能與 IEC Unit Test](https://content.helpme-codesys.com/en/CODESYS%20Test%20Manager/_tm_basic_function_iec_unittest.html)

參考：[CODESYS Test Manager 測試框架總覽](https://content.helpme-codesys.com/en/CODESYS%20Test%20Manager/_tm_f_test_manager.html)

正常案例通過不代表Busy策略正確。忙碌拒絕案例要確認舊工作仍維持原識別碼、原設定和原完成條件，不能只檢查新請求回傳一個錯誤位元。

平台框架可能要求測試專案、特定Testcase功能塊或控制器下載；若環境不支持自動測試，可先用同樣欄位建立離線重播器，但要標記測試層級和限制。

參考：[Beckhoff TwinCAT Test Framework Quickstart](https://infosys.beckhoff.com/content/1033/tf1140_tc3_testframework/17307967883.html)

## 延伸閱讀

- [PLC 功能塊錯誤輸出怎麼設計 給操作員可採取的下一步](/articles/plc-function-block-error-output-design)
- [NTC PT100 與熱電偶 依溫度範圍 精度與佈線選擇溫度感測器](/articles/temperature-sensor-ntc-pt100-thermocouple-selection)
