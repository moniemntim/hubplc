---
title: 配方欄位變更怎麼確認 canonical diff與有效期
description: 教你以canonical diff分辨數值、單位、null、未提供與hidden欄位，並用revision、diffHash、device、version與期限防止確認內容被替換。
date: 2026-09-21
author: 茂伯
draft: false
category: HMI 畫面與操作
---

## 一 差異不是字串比較

配方確認畫面應回答「哪個欄位從什麼變成什麼」，不能只比較兩份JSON或畫面字串。先定義canonical模型：欄位名稱、型別、單位、數值精度、陣列順序與時區都固定，再逐欄產生diff。格式不同但語意相同的50、50.0不應誤報；單位不同或精度改變則要明確顯示。

old與new先區分有值、明確null及未提供；hidden則是另一個顯示權限屬性，可與前三種狀態並存。null可能代表清除；未提供代表此次請求沒有觸碰；hidden代表介面不展示但仍可能是重要設定。不能把三者都轉成空字串，也不能因hidden沒顯示就當作沒有變更。

canonical規則要版本化。若今天把小數精度從一位改成兩位，舊diffHash不能直接拿來確認新規則；服務端應把canonicalSchemaVersion一起放入hash輸入與確認記錄。

顯示差異時分別列出原始表示與正規化值，例如old「1.0 bar」、new「100 kPa」；使用者需要知道轉換結果與原始來源，不能只看到兩個看似不同的字串。

canonical比較器要拒絕未定義的浮點NaN、無限值與超出精度的輸入，避免不同語言序列化出不一致的hash。

| 狀態 | 例子 | diff語意 |
| --- | --- | --- |
| old=50,new=55 | 數值變更 | 顯示50→55與單位 |
| old=50,new=null | 明確清除 | 要求確認清除 |
| old有值,new未提供 | 未提交此欄 | 不應當成清除 |
| hidden欄位改變 | 非視覺欄位 | 依權限顯示或阻擋 |

diff結果要保存canonicalPayload與diffHash。使用者看到的摘要可以簡化，但確認用hash必須涵蓋所有會影響套用的欄位，包括隱藏欄位與版本條件。

## 二 單位與缺失欄位

比較前先做單位正規化，但保留原始單位供顯示。例如old=10°C、new=50°F，依公式canonical均為10°C，語意可能沒有變更；若轉換規則或精度不明，應標為NeedsReview，不把字串相同當成安全。

欄位未提供時，diff要顯示「未提交」而非「改為空」。對patch請求，未提供通常表示保持原值；對完整替換請求，未提供可能是錯誤。這個差異屬於API契約，不能由前端猜測。null也要依欄位是否允許清除判定，不能無條件寫入設備。

hidden欄位必須有策略：有權限者看到完整old/new，無權限者至少看到「存在未顯示變更」並拒絕盲目確認；若產品規定hidden不參與套用，則canonical模型要明文排除。不可只把欄位從畫面CSS隱藏，就認為它不重要。

對陣列欄位要定義順序與識別鍵。若配方項目只是排序改變，可顯示move；若同一識別鍵的值改變，才顯示update；沒有識別鍵時不能猜測兩筆資料是否同一項。

null與未提供的差別也要反映在輸出契約：前者是明確意圖，後者是未觸碰。測試時故意刪除欄位、送null與送空字串，確認三種結果不會共用同一個處理分支。

顯示單位轉換時保留四捨五入規則，否則畫面看似相同而實際canonical值不同，使用者會難以追查。

| 案例 | 顯示 | 決策 |
| --- | --- | --- |
| 單位格式不同 | 10°C→50°F，canonical相同 | 不列實質變更 |
| new=null | 清除校正值 | 需確認且檢查允許清除 |
| new未提供 | 保持舊值 | 不送該欄 |
| hidden checksum改變 | 有未顯示差異 | 阻擋或升級權限 |

## 三 revision防TOCTOU

差異畫面開啟後，其他使用者可能已修改配方。建立diff時讀取revision=41，使用者確認時要把expectedRevision=41、deviceId、version與diffHash一起送到服務端；若目前revision=42，服務端拒絕並要求重新讀取。版本判定與受理必須是原子條件或等價受控邊界，不能先查再無條件寫。只在畫面顯示old值而不傳revision，會產生檢查與使用之間的TOCTOU問題。

確認資料應綁定完整diffHash、目標device、recipeVersion與短有效期，例如確認後五分鐘失效。任一欄位變更、權限變更或期限到期，都要重新產生diff與確認。不要讓使用者只確認「套用」兩個字，卻在伺服器接受另一份payload。

案例：10:00讀revision41，canonical diff為H1。10:02另一人修改units，revision變42；10:03原使用者送H1，服務端比對revision失敗，回傳Conflict並顯示新差異。若服務端只比對recipeId，可能把原本確認的內容套到新版本，這正是要避免的錯誤。

確認頁的diffHash由服務端產生並在執行前重新計算。客戶端回傳的hash只能作索引，不能當作服務端已驗證的證據；執行前再次比較payload、revision與hash。

device與version要綁在確認上，因為同一份配方可能適用多台設備但能力不同。若使用者切換目標設備，舊確認立即失效，即使欄位差異看起來相同。

確認token不應可跨使用者或跨瀏覽器重放；服務端將它綁定操作者與一次操作，執行後立即失效。

| 確認欄位 | 例值 | 失效條件 |
| --- | --- | --- |
| revision | 41 | 目前不是41 |
| diffHash | H1 | payload重新計算非H1 |
| device/version | D-03/8 | 目標或版本改變 |
| expiresAt | 10:05 | 超過有效期 |
| authorization | 使用者U17 | 權限或角色改變 |

## 四 驗收與錯誤處理

驗收先準備old與new各含數值、單位、null、未提供及hidden欄位，檢查canonical diff是否只報語意差異。再測格式改變、欄位順序改變、精度改變、單位換算與陣列增刪。每個案例都要保留原payload、canonical版本、diffHash與顯示摘要，方便比對。

若revision衝突，畫面不要自動合併後直接提交。提供重新載入、重新產生diff與取消三個選項；自動合併只能在產品明確定義欄位策略且重新驗證後進行。若hidden欄位無權限，顯示阻擋原因，不用星號或空白假裝沒有變更。

確認成功不等於設備已套用。308只負責確認差異語意與授權條件；實際設備提交仍需依配方套用流程追蹤準備、提交、讀回及部分結果。本篇的驗收重點是使用者確認的差異與最後受理的內容一致。

排查時依序看canonical輸入、revision讀取時間、diffHash、確認token有效期與服務端最後一次驗證。不要先懷疑格式化或顏色；先證明服務端確認的payload與執行時payload相同。

差異報表可提供「實質變更」「格式變更」「未提供」「權限遮蔽」四個篩選，幫助維護人員先處理真正影響設備的欄位。篩選只改顯示，不改canonical輸入。

若diff產生器遇到未知欄位或無法轉換的單位，應停止確認並標NeedsReview。繼續顯示一個看似完整的差異，會讓使用者誤以為未列出的欄位沒有風險。

遇到差異太大或欄位數量異常時，先要求人工檢查，不以自動合併省略未知欄位。

## 五 FAQ與官方來源

FAQ1：old=50、new=50.0算變更嗎？答：canonical型別與精度相同時可視為同值，但規則必須固定。

FAQ2：未提供欄位是否等於清除？答：不一定；patch通常表示不觸碰，完整替換可能是錯誤，依契約判定。

FAQ3：確認畫面開著很久還能送出嗎？答：確認綁定revision、diffHash、device、version與期限，任一不符就重新產生diff。

FAQ4：hidden欄位可以不放進diff嗎？答：只有契約明確排除才可以，否則應顯示存在未展示變更並阻擋盲確認。

參考：[OWASP Transaction Authorization，涵蓋使用者確認重大交易資料、服務端執行檢查、唯一授權與TOCTOU防護。](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html)

參考：[OWASP Deserialization，提供受信資料、欄位處理與安全反序列化的官方建議背景。](https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html)

## 延伸閱讀

- [配方選取與套用怎麼分 先驗證再提交設備](/articles/recipe-select-verify-apply-device)
- [報表篩選如何保存成可重現條件](/articles/reproducible-report-filter-manifest)
