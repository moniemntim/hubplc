---
title: OPC UA方法呼叫的參數與結果判讀
description: 以虛構CalculateVolume與ResetCounter方法示範OPC UA參數schema、Executable/UserExecutable、設備狀態、三層錯誤、審計與timeout未知結果的安全判讀。
date: 2026-09-17
author: 站長
draft: false
---

## Method不是Variable寫入

OPC UA Variable是可讀寫的資料節點，Method則是Object的可呼叫元件，兩者不能用同一套操作理解。呼叫前先Browse目標Object的HasComponent，找到Method NodeId，再讀InputArguments與OutputArguments。每個Argument要核對名稱、DataType、ValueRank、陣列維度與產品限制；不能看到DisplayName像CalculateVolume就猜NodeId或直接送Call。

| 檢查項 | 離線例子 | 不通過時 |
| --- | --- | --- |
| ObjectId | ns=2;s=Tank01 | 停止組裝Call |
| MethodId | ns=2;s=Tank01.CalculateVolume | 以Browse結果確認 |
| InputArguments | Radius Double、Height Double | 檢查順序與型別 |
| OutputArguments | Volume Double | 保存schema版本 |
| 權限與狀態 | Executable及UserExecutable | 先記錄拒絕原因 |

本例自訂CalculateVolume為純計算，順序是Radius、Height，兩者皆Double純量、ValueRank=-1，以公尺為單位，允許0至10且須為有限值。輸出Volume為Double立方公尺。Radius=2、Height=5，π×2²×5約62.832。這是完整的虛構契約，不表示任一設備原本提供此方法。

完成本頁的結果是得到一張方法契約：ObjectId、MethodId、方法名稱、參數順序、型別、ValueRank、單位、允許範圍、呼叫者與設備狀態。契約通過前只做離線驗證，不做Method Call。

## Executable UserExecutable與權限不能混用

Executable表示目前方法可執行，但不考慮目前使用者權限；UserExecutable才反映該使用者是否被允許呼叫。兩個布林值都只是呼叫前的檢查訊號，不是成功保證。即使兩者為true，Server在實際Call時仍可能因設備狀態、參數、角色或內部互鎖拒絕；若UserExecutable為false，不應以換成匿名或重試來繞過權限。

| 情況 | Executable | UserExecutable | 處置 |
| --- | --- | --- | --- |
| 方法停用 | false | false或未知 | 不呼叫，記錄狀態 |
| 可執行但無此角色權限 | true | false | 顯示權限不足 |
| 兩者皆true | true | true | 本例核對參數契約 |
| 讀值過期 | 可能true | 可能true | 重新讀狀態，不直接呼叫 |
| 呼叫後回應遺失 | 未知 | 未知 | 結果UnknownOutcome，不自動重試 |

本例CalculateVolume只做純計算，不要求機械Idle；若產品方法有其他狀態限制，需另列文件依據。具有副作用的ResetCounter或StartCycle則是另一種情況，timeout後可能已執行，只是回覆未送達，不能直接自動重試。

審核畫面應把Executable、UserExecutable、角色、設備狀態與方法契約分欄顯示。這能避免操作員看到一個true就以為所有條件都滿足，也能讓失敗報告區分權限拒絕、狀態拒絕與參數錯誤。

## 三層錯誤與參數邊界檢查

Method Call的結果至少分成service-level、operation-level與per-argument三層。Service-level錯誤表示整個服務請求無法被接受，例如Session或請求格式問題；operation-level StatusCode表示這個Method操作是否完成；inputArgumentResults則逐項指出哪個參數型別或範圍不合。不能只看一個總狀態就把所有參數標成成功。

| 案例 | 服務層 | 操作層 | 參數層／結果 |
| --- | --- | --- | --- |
| Session失效 | Bad_SessionIdInvalid | 無Call結果 | 不產生參數結果 |
| Radius文字 | Good | Bad_InvalidArgument | 第1參數型別錯 |
| Height負值 | Good | Bad_InvalidArgument | 第2參數超範圍 |
| 設備忙碌 | Good | 依方法文件的狀態拒絕碼 | 參數可正確但狀態拒絕 |
| 回覆逾時 | 通道未必錯 | 結果未知 | 不可據此重送副作用命令 |

按本例契約，Radius=0、Height=5合法且體積0；Height=-1不合法；Radius=2若編成String也不符Double，即使文字可以轉成數字。再測Height=[5]，單元素陣列仍不等於ValueRank=-1純量。先核對Variant型別、維度及範圍，才計算數值。

若操作層為Bad，輸出Arguments應視為不可用；不要讀取看似存在的舊結果。若規範或產品以Uncertain回傳部分結果，則保存結果和不確定原因，交給應用規則決定是否顯示，不能直接當Good。

## 審計格式與未知結果處理

每次呼叫審計至少記錄methodName、ObjectId、MethodId、schema版本、輸入摘要、呼叫者、角色、Executable、UserExecutable、設備狀態、發送時間、Session識別、operation StatusCode、inputArgumentResults、輸出參數與完成時間。秘密憑證或敏感輸入只存遮罩或雜湊，不把原文寫入公開日誌。

案例一以Double 2.0與5.0為輸入，對應結果Volume約62.832；案例二Height=-1超出本例0至10範圍，應在本地契約驗證擋下。若故意在測試Server驗證錯誤回覆，operation可回Bad_InvalidArgument，逐參數結果則保存實際型別或範圍錯誤。案例三是另一個具副作用的ResetCounter回覆逾時，標UnknownOutcome並查狀態，不套用純計算的重試假設。

若Session在方法完成前終止，Server端工作可能已完成而結果被丟棄。重連後先用唯讀狀態、generation或審計紀錄查明，再由人工或明確的冪等契約決定下一步。不能把Client timeout當作設備取消，也不能把重試當成通用修復。

規範不替每個設備定義ResetCounter、CalculateVolume的語意、冪等性或取消能力。本文不寫任何廠商API、PLC指令或實機操作，只提供方法契約、錯誤分層與紀錄格式。

審計紀錄的時間也要標示UTC與單調序列。若同一Call的送出、回應和重連跨過時鐘校正，不能只用畫面時間判斷先後；可保存clientSequence、Session識別與單調經過時間，讓後續人員知道哪一筆回應屬於哪個請求。

對真正會改變設備的Method，驗收要先建立人工批准門檻和操作狀態鎖。即使輸入參數通過，沒有明確的設備Ready證據也應停止；測試Server只能驗證schema與回應格式，不能證明現場互鎖、機械狀態或方法副作用符合預期。

本例NodeId中的ns=2只表示目前Session的命名空間索引，持久化契約還要保存namespace URI。重連後重新解析URI，再確認Object與Method的關係；同名方法可能掛在不同Object下，不能只用Method顯示名稱來拼呼叫。若方法沒有輸入參數，依模型傳空陣列，也不是送一個空字串當佔位。

## FAQ 驗收與官方依據

FAQ1：Executable=true就能保證Call成功嗎？答：不能，仍要看UserExecutable、角色、參數和設備狀態。

FAQ2：Method可以當Variable寫入嗎？答：不可以，需依Method Service呼叫。

FAQ3：Call timeout後可以再送一次嗎？答：副作用方法不可機械重試，先判定UnknownOutcome。

FAQ4：總狀態Good但方法失敗可能嗎？服務層Good表示有Call回覆，還須看各CallMethodResult的statusCode。operation為Bad_InvalidArgument時，再看inputArgumentResults找出錯誤參數；不能把服務層Good當成方法成功。

驗收使用測試Server或離線文件範例，列出空白、邊界、錯型、權限不足、設備忙碌與回覆遺失。保存ObjectId、MethodId、Arguments schema、三層結果與審計欄位。完成條件是每個結果都能回答「哪一層拒絕、是否可能已執行、下一步要查什麼」，而非只有成功率。

參考：[OPC UA Part 3 §5.7.1 Method NodeClass](https://reference.opcfoundation.org/specs/OPC-10000-3/5.7.1)

參考：[OPC UA Part 4 §5.12 Method Service Set](https://reference.opcfoundation.org/specs/OPC-10000-4/5.12)

官方規範說明Method NodeClass、InputArguments、OutputArguments、Executable/UserExecutable與Method Service結果；目標Server的實際方法、角色與設備狀態仍須依產品文件核對。本文案例是離線審核模型。

交付時把「可呼叫」和「已呼叫」分成兩個欄位，並把未知結果列入例外清單。這能避免日後只看到布林權限或最後輸出，就誤以為方法曾成功執行。所有自訂CalculateVolume數字都應標明是算式驗證，不是Server實測回覆。

審查者還要核對方法所屬Object與輸出參數的版本。即使MethodId未變，Argument順序、ValueRank或輸出型別改變也應視為契約變更；先停用自動呼叫，更新schema並重跑離線邊界案例。

若呼叫者更換角色，重新讀UserExecutable並重建審計上下文；不能沿用前一個Session的權限判斷。

這項檢查同樣適用於方法重新Browse後的NodeId變更。

## 延伸閱讀

- [OPC UA告警的確認恢復與狀態同步](/articles/opcua-event-condition-alarmcondition-ack-refresh)
- [OPC UA歷史讀取的分頁續傳與資料品質](/articles/opcua-historyread-continuation-point-quality)
