---
title: 配方選取與套用怎麼分 先驗證再提交設備
description: 區分配方選取與設備套用，建立device、version、checksum、units、scope與verified staging驗證。
date: 2026-09-21
author: 站長
draft: false
category: HMI 畫面與操作
---

## 一 選取只是準備

配方畫面常把「選取」與「套用」做成同一個按鈕，結果使用者只想查看一份draft，設備卻收到寫入。先把流程拆成Select、Verify、Stage、Commit與Result。Select只改畫面目前選中的recipeId與draft內容，不產生設備write；只有使用者明確啟動套用，且驗證成功，才建立一次套用交易。

套用前至少固定deviceId、recipeId、recipeVersion、checksum、units與允許欄位範圍。畫面顯示50.0不能證明設備目前是50.0；要先讀取設備快照和能力聲明，再把draft正規化後比較。設備能力未知時，不宣稱可以原子套用或支援全部欄位。

選取畫面還要顯示draft來源與最後更新時間，讓使用者知道這是本地草稿、伺服器草稿或設備讀回。相同recipeId若來自不同租戶或設備，必須把命名空間一併顯示；只顯示配方名稱容易誤選。

套用按鈕應在選定device與scope後才可用，但按鈕可用不等於設備已接受。服務端仍要重新讀設備能力與權限，畫面上的disable只改善操作，不是授權控制。

建立交易前先鎖定查詢快照，避免畫面同時刷新造成使用者看到兩個版本。快照只供確認，不等於設備目前狀態。

| 階段 | 是否寫設備 | 必備證據 |
| --- | --- | --- |
| Select | 否 | recipeId與draft來源 |
| Verify | 否 | device、version、checksum、範圍 |
| Stage | 依設備能力 | staging結果與局部狀態 |
| Commit | 是或由設備確認 | 明確提交結果 |
| Result | 否 | 讀回值、版本與錯誤 |

這是資訊與設定管理流程，不是安全控制。套用配方前仍要依設備和程序規範確認機台狀態；HMI不能因按下套用就繞過聯鎖或安全檢查。

## 二 verified staging

Verify先對每個欄位做型別、單位、上下限、必要欄位與設備能力檢查。checksum必須由伺服器針對canonical資料計算，不能直接雜湊畫面格式化文字。若draft中的溫度是攝氏而設備期待華氏，必須明示轉換規則與單位，不能只比較字串。

通過後建立verified staging，保存stageId、deviceId、recipeVersion、checksum、操作者、驗證時間與有效期限。staging只表示已準備好，不表示設備已接受。若設備沒有stage能力，服務端要明示只能分批寫入，並在每一步讀回驗證。

案例：R-12版本8要套到D-03。服務端先確認D-03支援欄位A至F，讀回目前版本7，對draft計算checksum示意標記9A2C（非實際計算結果，正式規格另定演算法）；若scope只允許A至D，就拒絕包含E的draft。若驗證完成後設備版本變成9，原stage以version mismatch失效，不能繼續寫。

verified staging要有明確失效原因，例如設備版本改變、checksum不符、欄位超範圍或units未知。失效後保留紀錄供排查，但不可讓失效stage再次進入commit。

若配方含陣列或多段參數，範圍驗證要逐項進行並記錄索引；只檢查總體checksum不能發現某個元素超限。設備讀回也要用相同canonical規則比較。

能力聲明也要有有效時間；設備重連或韌體更新後應重新取得，不能永久快取支援欄位。

| 檢查 | 例值 | 失敗處理 |
| --- | --- | --- |
| deviceId | D-03 | 拒絕跨設備套用 |
| 版本 | recipeVersion=8；expectedDeviceVersion=7 | 目前設備版本非7即失效 |
| checksum | 9A2C | 不同即停 |
| units | °C | 不明確即拒絕 |
| scope | A–D | 超出範圍不寫 |

## 三 非原子設備的部分結果

設備未明示原子commit時，把套用視為可能部分成功。多步流程可能先寫A、B，再在C因範圍錯誤停止；這時結果是Unknown或Partial，而不是成功或自動回滾。服務端要停止後續寫入、讀回已處理欄位、保存步驟與錯誤，交由工程人員決定補償。

不能因timeout就重送全部配方。先查設備是否已接受最後一筆、是否提供交易狀態或版本讀回；對不可重複的寫入，標記UnknownOutcome。若設備確實提供冪等交易ID，才依該能力重試，不能自行假造API。

案例中A、B已讀回新值，C寫入逾時，D尚未處理。畫面應顯示Partial，列出A/B成功、C未知、D未送出，並禁止再次按套用直接重跑。若設備沒有回讀能力，結果只能是Unknown，不能顯示「全部完成」。

部分成功後可提供只讀差異報告，列出每個欄位的送出、已確認、未知和未送狀態。修復前不要用「再套用」覆蓋未知狀態；先確認設備當前版本及是否有回滾能力。

若設備支援分批提交，應在契約中說明每批邊界、順序與失敗後行為。若沒有這些資料，服務端只能把整體結果標成未知，不能推測未回覆批次已成功。

每一步在本地紀錄交易與步驟序號；只有設備協定支援識別回傳時才能在線上配對。回讀關聯無法證明時停在未知，不把回讀錯位當成功。

| 結果 | 畫面 | 後續 |
| --- | --- | --- |
| 全部讀回一致 | Committed | 保存版本與checksum |
| 部分一致 | Partial | 停止、列差異 |
| 逾時未知 | Unknown | 查設備交易狀態 |
| 驗證失敗 | Rejected | 不再送寫入 |

## 四 權限 審計與驗收

權限要按設備、配方範圍與動作分開。使用者可能有查看權限，卻沒有套用D-03的權限；有套用A至D權限，也不代表能改E至F。伺服器端在Verify與Commit都重新檢查權限，不能只相信HMI傳來的role欄位。

每次交易保存原始draft、canonical checksum、deviceId、版本、scope、操作者、stage與commit時間、每個步驟結果及設備回讀。若使用者在確認後修改draft，checksum改變就要重新Verify；舊確認不可沿用。這也避免把畫面截圖當成設備證據。

驗收以模擬設備測五條路徑：正常全部成功、版本變更、checksum錯、單步逾時、權限不足。檢查Select永不寫設備、Verify失敗零寫入、Partial停止後可追查，以及重新登入後仍能看到交易結果。未取得目標設備手冊時，只能交付流程契約與測試表，不能宣稱支援原子套用。

完成的判定是實際生效區讀回值、版本、checksum和scope都符合，並依設備契約確認啟用結果；只讀到staging區相同不代表配方已生效；單有「送出HTTP成功」或按鈕變綠不足以證明設備採用。

稽核資料要避免把密碼、秘密金鑰或不必要的敏感值直接寫入日誌，但要保存足以重建diff與驗證結果的checksum和欄位摘要。日誌權限也應與套用權限分開。

權限測試要包含查看、選取、驗證、stage與commit的不同角色組合；測試結果應證明前端隱藏按鈕後，直接呼叫服務端仍會被拒絕。

結果頁同時提供原始錯誤碼與人類可讀說明，維護人員才能依證據決定重試、回滾或重新驗證。

## 五 FAQ與官方來源

FAQ1：選取配方會寫入設備嗎？答：不會；選取只改draft與目前選項。

FAQ2：checksum相同就一定能套用嗎？答：不一定，仍要核對deviceId、version、units、scope與能力。

FAQ3：部分寫入後能自動重跑嗎？答：未確認設備結果前不要；先停住並讀回或人工處理。

FAQ4：HMI顯示成功是否代表設備成功？答：不代表，需設備回讀或明確commit結果。

參考：[OWASP Transaction Authorization，要求交易資料可辨識、服務端驗證、限制狀態轉換與防TOCTOU。](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html)

參考：[OWASP Input Validation，作為欄位型別、範圍與服務端驗證的安全設計參考。](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)

## 延伸閱讀

- [多個操作員同時改值如何顯示最後寫入者與時間](/articles/hmi-concurrent-edit-last-writer-version)
- [配方欄位變更怎麼確認 canonical diff與有效期](/articles/recipe-canonical-diff-confirmation-revision)
