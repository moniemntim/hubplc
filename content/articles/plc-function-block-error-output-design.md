---
title: PLC 功能塊錯誤輸出怎麼設計 給操作員可採取的下一步
description: 以虛擬讀取模組建立 Status、Reason、Retryable、Context 與 first cause，區分參數錯、設備忙、逾時和來源無效。
date: 2026-09-17
author: 茂伯
draft: false
---

## 錯誤輸出要回答四個問題

一個功能塊只輸出 Error=TRUE，操作員仍不知道是參數錯、設備忙、逾時，還是來源資料無效。本文建立虛擬讀取模組 FB_ReadModule，輸入 Request、ModuleId、Capacity、Offset、Length 與 SourceValid，輸出 Status、Reason、Retryable、Context、Done、Busy。Status 表示目前狀態，Reason 表示本模組定義的原因，Retryable 表示本次失敗是否允許重試，Context 保存 ModuleId、RequestId、時間與原始參數。

文中的原因碼是應用層自訂識別，不是假裝成任何廠商或通訊協定的錯誤碼。若底層函式回傳官方錯誤，應另外保存 VendorStatus，再映射成已文件化的應用 Reason。沒有證據時只能標 UNKNOWN_SOURCE，不可自行編造一個看似正式的廠商碼。

| 欄位 | 本例用途 | 操作員看到的意義 |
| --- | --- | --- |
| Status | IDLE、BUSY、DONE、ERROR | 目前流程位置 |
| Reason | PARAM_INVALID、SOURCE_INVALID、DEVICE_BUSY、TIMEOUT、MODULE_MISSING | 失敗原因 |
| Retryable | TRUE或FALSE | 是否可按重試 |
| Context | ID、參數、時間、底層值 | 排查線索 |

初始化時 Status=IDLE、Reason=NONE、Retryable=FALSE、Done=FALSE、Busy=FALSE。接受 Request 後才進 BUSY；成功進 DONE；失敗進 ERROR 並鎖存 first cause。新 Request 在 BUSY 時回 BUSY_REJECT，不覆蓋目前 Context，也不重設現行工作的計時器。

## 虛擬讀取模組的錯誤優先級

本例容量固定為十六筆，參數以足夠寬的有號整數檢查，先拒絕 Capacity 不等於 16、Offset<0、Length<=0 或 Length>Capacity，再算 Capacity-Length 並比較 Offset，避免無號減法先下溢。超出任一條件即 ERROR/PARAM_INVALID，不呼叫設備。參數合法後才檢查 SourceValid；FALSE 即 SOURCE_INVALID。設備回報忙碌則進 ERROR/DEVICE_BUSY，可在復歸後以新識別碼重試。

接受要求時複製參數，啟動 300 ms 計時；運轉中不改讀外部參數欄位。入口參數錯先於來源無效。進入 BUSY 後，同掃描優先序固定為來源無效、模組不存在、設備忙、到時、正常回覆；錯誤均只針對目前工作。沒有更高順位錯誤時，elapsed>=300 ms 進 ERROR/TIMEOUT，只有 elapsed<300 ms 且 RequestId 匹配才進 DONE。

| 條件 | Reason | Retryable | 操作員下一步 |
| --- | --- | --- | --- |
| 容量非16、負Offset、Length不在1..16或範圍越界 | PARAM_INVALID | 否 | 修正設定後重新送出 |
| SourceValid=FALSE | SOURCE_INVALID | 否 | 檢查來源品質 |
| 設備回 BUSY | DEVICE_BUSY | 是 | 等待可用後重試 |
| 300 ms無回覆 | TIMEOUT | 是 | 確認連線再重試一次 |
| 模組不存在 | MODULE_MISSING | 否 | 核對組態與接線 |

可重試不等於模組自動重試。上層為一次操作保存 RetryCount，最多追加一次讀取要求；不因 Reason 從 DEVICE_BUSY 變成 TIMEOUT 又取得一次機會。Retryable=FALSE 表示條件修正前禁止重送，修正後仍可開始新的操作。離開 ERROR 前先完整複製 Context 到 LastError，再清理現行工作，新工作不得覆蓋保存的錯誤紀錄。

## 四條時間線與 first cause

四條時間線都從 IDLE、RequestId=0、Context 清空開始。案例 A 送入合法 ModuleId=3、Offset=4、Length=2，100 ms 收到同一 RequestId 的資料，進 DONE。案例 B 參數 Length=0，在同一掃描記錄 PARAM_INVALID，不呼叫設備。案例 C 在 100 ms 收到設備 BUSY，立即進 ERROR/DEVICE_BUSY；150 ms Reset 後回 IDLE，200 ms 送出新 RequestId=22，250 ms 收到回覆 #22 進 DONE。案例 D 送出後 300 ms 沒回覆，進 TIMEOUT；350 ms 才到的舊資料只記晚到事件，不改 ERROR。

| 時間 | 案例A正常 | 案例B參數錯 | 案例C設備忙 | 案例D逾時 |
| --- | --- | --- | --- | --- |
| 0 ms | BUSY#21 | ERROR/PARAM_INVALID | BUSY#21 | BUSY#21 |
| 100 ms | DONE#21 | ERROR/PARAM_INVALID | ERROR/DEVICE_BUSY | BUSY#21 |
| 150 ms | Ack後IDLE | 需修正參數 | Reset→IDLE | BUSY#21 |
| 200 ms | — | — | 送Request#22 | BUSY#21 |
| 250 ms | — | — | DONE#22 | BUSY#21 |
| 300 ms | — | — | — | ERROR/TIMEOUT |
| 350 ms | — | — | — | LATE_RESPONSE丟棄 |

first cause 只在一次工作尚未有原因時寫入。若 300 ms 到時後又收到底層通訊錯誤，最後 Status 仍是 ERROR，Reason 仍是 TIMEOUT，Context 追加 SecondaryReason=LATE_TRANSPORT；不能用較晚的事件改掉第一個可觀察原因。若參數錯和來源無效同時成立，優先保留 PARAM_INVALID，因為應先修正輸入契約。

1. 在接受 Request 時複製參數與 RequestId 到 Context。

2. 入口先檢查參數；BUSY 依來源、模組不存在、設備忙、逾時、匹配回覆的固定順序判斷。

3. 第一次失敗即鎖存 FirstReason、FirstTime與當時快照。

4. 後續事件只追加診斷欄位，不重寫終態或第一原因。

5. 完成或錯誤後等待 Ack/Reset，清理後才回 IDLE。

## 輸出有效性與診斷保存

BUSY 時 Busy=TRUE、Done=FALSE；DONE 時 Busy=FALSE、Done=TRUE，結果 Valid=TRUE；ERROR 時兩者皆 FALSE，Valid=FALSE 並撤除輸出要求。Busy 新請求的拒收放在獨立 RejectReason，不覆蓋現行 Reason。Ack 或 Reset 與新請求同時到達只處理清理，新請求須稍後再送。

Context 保存 RequestId=21、ModuleId=3、Offset=4、Length=2、Capacity=16 與開始時間。到時後仍要能讀到這些資料。Reset 先存 LastError，再清空現行 Context；RequestId=22 建立新的 Context，不能到那時才嘗試保存已清空的舊資料。LastError 保留最近失敗，成功工作不應清掉它。

設備忙和逾時的處置不同。DEVICE_BUSY 在本例先形成 ERROR，Reset 後才可用新 RequestId 重試；TIMEOUT 表示在 300 ms 內沒有合格回覆，除了檢查連線，也要查看是否收到錯誤但未被解析。兩者都可能 Retryable=TRUE，卻不能用相同的操作提示或相同的計數器。

時間線驗收還要記錄未發生的事件。例如案例 B 參數錯時，設備呼叫計數必須維持 0；案例 C 設備忙時，第一次 Request 的 Context 不可被第二次 Request 清掉；案例 D 逾時後，350 ms 的資料不得增加 DoneCount。這些負向條件能證明錯誤優先級真的在資料流入口生效。

## 最後狀態 復歸與操作提示

DONE 代表資料快照已經有效，但不代表下一個工作已可立即開始。上層收到 Done 後送 Ack；Ack 的 RequestId 不匹配時，模組維持 DONE 並記 BAD_ACK。ERROR 也不自動變回 IDLE：操作員要先閱讀 Reason 與 Context，針對 PARAM_INVALID 修正參數，針對 SOURCE_INVALID 恢復來源品質，針對 TIMEOUT 檢查連線後按 Reset。Reset 只能在 Busy=FALSE 且輸出請求已撤除時被接受。

Reset 先把失敗 Context 存入 LastError，才清除現行 RequestId、FirstReason、Reason、計時器、Done、Retryable 與暫存結果，回 IDLE。每掃描都更新 Request 的邊緣記憶，Reset 不清除該前值，故持續高電位不會自動重啟。新工作要有新上升緣及未與晚到資料重用的識別碼。晚到資料只記錄，不得改寫 ERROR 或下一工作的結果。

操作員畫面應根據 Reason 顯示下一步：PARAM_INVALID 顯示要檢查 Capacity、Offset、Length 與 Offset<=Capacity-Length；DEVICE_BUSY 顯示等待或由上層重試；TIMEOUT 顯示確認連線和讀取計數；SOURCE_INVALID 顯示先恢復來源品質；MODULE_MISSING 顯示核對組態。不要把所有 Reason 都顯示成『請重試』，那會把不可重試的錯誤變成無限迴圈。

| 終態 | 復歸前提 | 可接受動作 | 不可做的事 |
| --- | --- | --- | --- |
| DONE | 匹配Ack | 清理後新Request | 用晚到資料改結果 |
| ERROR/PARAM_INVALID | 參數已修正 | Reset後新Request | 自動重試 |
| ERROR/TIMEOUT | 連線狀態確認 | 最多一次重試 | 無限重試 |
| ERROR/SOURCE_INVALID | 來源Valid恢復 | Reset後重新讀 | 把舊值當新值 |

畫面若要允許重試，應同時顯示目前 RequestId、上次 FirstReason 和剩餘重試次數。重試按鈕不能直接把 Retryable=False 的錯誤送回模組；介面先拒絕並保留原始 Context，讓操作員知道應先修改設定或恢復來源。

## FAQ 驗收與平台限制

問：Reason 可以直接沿用廠商數字嗎？只有已查到並保留來源的底層狀態才可放在 VendorStatus；應用 Reason 必須自訂命名並說明映射，不能冒充廠商碼。問：TIMEOUT 一定要重試嗎？不一定，本例只允許 Reset 後由操作流程最多送出一次新 Request，仍須先檢查連線。問：晚到回覆可以把 ERROR 改成 DONE 嗎？不可以，RequestId 已結束，晚到資料只做診斷紀錄。問：first cause 為什麼不能更新成最後一個錯誤？因為排查需要知道最先讓工作失敗的證據，後續事件只能作為補充。

1. 用五組輸入測試參數錯、來源無效、設備忙、正常回覆和逾時。

2. 核對每組的 Status、Reason、Retryable、Context 與操作提示。

3. 在同一掃描注入參數錯加設備忙，確認 first cause 為 PARAM_INVALID。

4. 在 TIMEOUT 後注入晚到回覆，確認終態與 RequestId 不變。

5. 測試 Reset、Ack錯誤與新 RequestId，確認沒有舊資料穿透。

適用限制：本文是虛擬讀取模組的應用層錯誤設計，不提供任何特定 PLC、模組或通訊協定的廠商錯誤碼。CODESYS Behaviour Model 說明非同步功能塊可用 xBusy、xDone、xError 與錯誤識別輸出表達外部裝置工作；其 Error Handling 文件也要求只回傳受影響函式庫已文件化的錯誤碼。本文只借用這種介面分工。

參考：[CODESYS Behaviour Model and Interface Design](https://content.helpme-codesys.com/en/LibDevSummary/behaviour_model.html)

參考：[CODESYS Error Handling guidance](https://content.helpme-codesys.com/en/LibDevSummary/errors.html)

## 延伸閱讀

- [子程式沒有每掃描執行 內部計時與邊緣判斷會怎樣](/articles/plc-subprogram-call-frequency-edge-timer)
- [替 PLC 功能塊寫可重複測試 輸入序列與預期結果怎麼保存](/articles/plc-function-block-repeatable-tests)
