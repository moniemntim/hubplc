---
title: HMI 多語系排版 避免標籤 按鈕與警報被截斷
description: 以泵浦雙語頁面分離翻譯鍵、locale、工程單位、數值與日期，處理長字串、字型缺字、截斷、小數輸入與逐頁雙語驗收。
date: 2026-09-17
author: 茂伯
draft: false
---

## 翻譯鍵 locale與值要分開

多語系不是把畫面上的中文逐字替換成英文。先盤點翻譯鍵、目前locale、顯示文字、工程單位與數值格式；翻譯鍵是穩定識別，值是來自Tag或事件的資料，單位則是工程契約。不可把「Pressure」或「壓力」存進Tag當實際量測值。

虛構泵浦頁用pump.state、alarm.highPressure、button.ack作自訂穩定鍵，分別保存繁體中文與美式英文譯文。壓力原始值為numeric 6.5、單位bar，切換語言只改標籤與格式，不改量測值。本文用zh-TW、en-US表示語言區域，實際欄位或API接受的代碼格式須依產品文件，不混用不同元件的語法。

Ignition system.util.translate查全域翻譯資料；strict=false找不到時回傳原term，strict=true則回傳None。本文自訂鍵要先建立對應翻譯，不會由平台自動理解。發布前檢查缺譯，運轉時使用已審核的回退文字並記錄缺鍵，不能把None或內部鍵名直接留給操作員。

翻譯鍵不要直接使用顯示文字作唯一識別，因為改英文文案會造成歷史與元件引用難以追蹤。鍵表可列key、zh-TW、en-US、術語類別、最大長度、是否允許換行與審核者。

小數輸入測試要包含6.50、6,50、1,234.5、1.234,5、空值、負值與超範圍，並按locale記錄接受/拒絕。格式錯誤與工程範圍錯誤要分開提示。

警報與按鈕的術語表要一起審核，因為Ack、Clear、Reset與Confirm可能代表不同流程動作。翻譯相同不代表語意相同，應保留不同鍵。

| 項目 | 保存內容 | 切換語言時 | 錯誤排查 |
| --- | --- | --- | --- |
| 翻譯鍵 | pump.state | 取另一locale文字 | 查鍵是否存在 |
| 數值 | 6.5 numeric | 只改格式 | 查型別 |
| 單位 | bar | 按工程規格 | 查mapping |
| 日期 | UTC timestamp | 語言改格式；時區獨立設定 | 查locale/timezone |

## 長字串 字型與截斷

長字串範例「排放閥開位回饋未確認」對應Drain valve open feedback not confirmed。若只顯示前十二字元，可能漏掉not而改變判斷。關鍵狀態要完整留在主要畫面，可換行或重新分欄；tooltip及詳細頁只能補充，觸控裝置未必有滑鼠懸停。

字型要覆蓋中文、英文、數字、度數符號與單位。缺字回退可能造成字寬不同、上下基線不齊或方框；在目標瀏覽器、Vision Client或Panel上逐頁查看。不要只在工程電腦上看一張截圖就宣稱支援。

按鈕、表頭、警報、趨勢圖例、彈窗與通知訊息都要列入鍵表。共用鍵保持同一術語，例如「確認」不要一頁譯Acknowledge、另一頁譯Confirm，除非兩者在流程中真的不同。

| 元件 | zh-TW | en-US案例 | 版面規則 |
| --- | --- | --- | --- |
| 按鈕 | 確認 | Acknowledge | 可完整顯示 |
| 警報 | 壓力高 | High pressure | 異常本體與確認狀態分欄 |
| 單位 | 壓力 6.5 bar | Pressure 6.5 bar | 數值與unit分開 |
| 等待狀態 | 等待排放閥回饋 | Waiting for drain feedback | 兩種語言語意一致 |

工程單位與語言切換要分層：Tag保存6.5 numeric，工程規格保存bar，顯示層決定Pressure或壓力；若需要psi，建立明確換算與新unit，不讓翻譯器把bar替換成psi。

字型fallback要在低解析度Panel、瀏覽器縮放、長警報與特殊符號同時測。缺字方框、基線跳動與按鈕高度變化都要截圖列入報告，而不是只看翻譯表有無文字。

版面驗收要同時看一般、維護、警報歷史與登入頁；只檢查主畫面會漏掉彈窗和長欄位。

截斷測試要把長度、字型、縮放、視窗寬度與locale固定。若文字仍放不下，優先改版面或術語，不能刪掉安全條件。缺字回退要顯示可追查警告並列入翻譯完成條件。

## 日期 小數與輸入驗收

先分數值、顯示字串與輸入解析。Ignition Format Transform回傳string，來源Tag仍可保持numeric，不能把格式化後的「6.50 bar」當成原數值直接寫回。日期格式需按元件採用的規則核對；Java SimpleDateFormat的字母大小寫規則不可不加確認套給所有瀏覽器日期元件。

固定日期練習：2026-09-17T13:05:00Z，用UTC+08:00顯示為21:05，用UTC−07:00顯示為06:05，仍是同一時刻。locale改月份與日期文字排列，timezone決定時差，兩個設定獨立。若使用命名時區，另依日期與時區資料庫處理夏令時間，不把固定offset套用全年。

自訂本例輸入契約：en-US接受點作小數，de-DE接受逗號作小數，兩者均不接受千分位；允許0至10 bar、最多兩位小數。6.50在英文、6,50在德文均解析6.5；相反格式要拒絕，不默默移除分隔符變650。這是專案應實作並測試的規格，不保證元件預設已有。

| 測試 | 資料/locale | 預期顯示或結果 | 失敗排查 |
| --- | --- | --- | --- |
| 壓力 | 6.5、zh-TW | 6.50 bar | 格式pattern |
| 壓力 | 6.5、en-US | 6.50 bar | Locale/format |
| 日期 | 同一UTC、offset+08:00 | 21:05 | 查顯示offset |
| 輸入 | 6,50、en-US | 拒絕並提示 | 解析locale |

縮短警報先確認語意：High pressure只對應壓力高，不能翻成High pressure not confirmed而混入確認狀態。將條件「壓力高」、狀態「尚未確認」及下一步各自分欄翻譯，才能在條件恢復或操作確認後正確更新，避免一條長字串藏了三種資訊。

語言切換成功還要確認權限、品質與資料值未被重設，locale變更不應重建成錯誤的設備狀態。

翻譯完成的定義應包含鍵完整、術語一致、長字串可讀、字型覆蓋、數值/單位正確、日期時區正確與輸入錯誤可見，逐項有截圖或測試值。

翻譯錯誤、術語不一致與空間不足要分開開票。鍵不存在是資料表問題；同一中文概念有兩個英文詞是術語問題；文字被截斷是版面問題。不同問題不要用同一個「語言錯誤」狀態掩蓋。

## 雙語逐頁驗收

建立逐頁檢查表：locale已切換、鍵不回退原文、警報/按鈕/表頭完整、單位正確、數值可讀、日期時區正確、輸入接受規則清楚、tooltip與換行正常、缺字沒有方框。每頁保存zh-TW與en-US截圖及viewport尺寸。

先以鍵表掃描缺少翻譯，再用最長英文與最長中文逐頁人工檢查。若一個頁面改寬度，回歸檢查相鄰按鈕、警報表、趨勢圖例與彈窗；多語系版面常因一個長標籤把其他欄位推到裁切。

成功案例：切換語言後source相同、原始值仍6.5、顯示6.50 bar，時區未改時事件時刻也不變。失敗案例包括缺譯回退、截掉not、符號缺字、逗號誤讀成650或把UTC當本地時間。每一筆記錄輸入、預期、實際、元件版本及修正，不用「看起來可以」當驗收。

日期格式的Y與y、M與m意義不同，工程師應以產品文件與固定測試日期驗證。不要用看似正常的月份或分鐘值掩蓋格式錯誤；跨時區測試要保存原始UTC。

多語系資料表的變更需保留版本與審核者，避免某個locale更新後另一個locale仍顯示舊術語。

未指定HMI產品時，不寫特定Translation Manager命令或API。Ignition文件中的translate、setLocale與Format Transform只代表該版本功能，其他平台要按自己的字串表、字型與元件文件驗證。

## FAQ 來源與驗證

FAQ1：翻譯後的數值與單位要一起翻譯嗎？數值保持numeric，工程單位依契約顯示；翻譯文字、單位與換算不可混為一欄。

FAQ2：鍵不存在可以顯示原始鍵嗎？可作診斷fallback，但正式驗收應把回退視為缺翻譯，不讓使用者只看到鍵名。

FAQ3：逗號小數在所有locale都能輸入嗎？不能假定，依元件、Locale與解析規則測試，錯誤要明確提示。

FAQ4：HMI頁面有英文翻譯就代表字型正常嗎？不代表，仍要在目標裝置檢查缺字、回退、截斷、換行與縮放。

本文翻譯鍵、泵浦值、日期、locale與版面均為離線案例。

參考：[Ignition 8.1 system.util.translate：term、locale、strict與缺少翻譯時的回傳行為。](https://docs.inductiveautomation.com/docs/8.1/appendix/scripting-functions/system-util/system-util-translate)

參考：[Ignition 8.1 Data Type Formatting Reference：日期SimpleDateFormat與數字DecimalFormat格式規則。](https://docs.inductiveautomation.com/docs/8.1/appendix/reference-pages/data-type-formatting-reference)

參考：[Ignition 8.1 Perspective Format Transform：依Locale格式化數字與日期、時區與格式pattern。](https://docs.inductiveautomation.com/docs/8.1/ignition-modules/perspective/working-with-perspective-components/bindings-in-perspective/transforms/format-transform)

## 延伸閱讀

- [HMI 批次流程畫面如何呈現步驟 等待和失敗原因](/articles/hmi-batch-step-wait-failure-reason)
- [HMI 斷線與資料暫停的顯示及驗收](/articles/hmi-disconnected-data-paused-display)
