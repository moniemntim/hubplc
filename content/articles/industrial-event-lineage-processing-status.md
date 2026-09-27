---
title: 工業事件資料如何保留來源與處理狀態
description: 用虛構低流量警報建立raw、驗證、轉換、發布狀態及事件血緣。
date: 2026-09-17
author: 茂伯
draft: false
---

## 資料來源與狀態先分層

工業事件進報表前，至少會經過來源、收集、驗證、轉換與發布幾個階段。本文用虛構低流量警報說明，不把最後報表的一列當成唯一真相。raw保留來源payload、source、sourceTimestamp與eventId；collector記錄收到時間、重試次數與傳輸品質；validated標示欄位和識別碼已通過檢查；transformed保存轉換版本；published才是報表可見資料。每個階段都有狀態與錯誤原因。

| 階段 | 必要欄位 | 狀態例 | 可否覆寫 |
| --- | --- | --- | --- |
| raw | source,eventId,payload | RECEIVED | 不可改原文 |
| 驗證 | schema、quality | VALID/REJECTED | 保留判定 |
| 轉換 | ruleVersion、輸出 | CONVERTED | 新增資料集 |
| 發布 | publishTime、dataset | PUBLISHED | 可回溯版本 |
| 失敗 | error、retryCount | RETRY/DEADLETTER | 保留原事件 |

來源時間和處理時間用途不同。sourceTimestamp回答來源何時產生事件，receivedAt回答收集器何時收到，processedAt回答規則何時執行，publishedAt回答何時進報表。時間排序能建立觀察順序，不能僅憑先後宣稱因果；若來源時鐘未同步，保留來源quality，另以clockQuality標示不確定性。

事件進入收集器時要先做不可變封存，之後的驗證與轉換另建欄位或資料集。這樣當規則版本改動，工程師仍可用原payload重算，不會把當時的輸入和後來的解釋混成一列。保存來源名稱、端點、設備識別與schema版本，才能判斷同一eventId是否跨來源重複。

報表發布應保存查詢批次、輸入範圍與完成時間。若一批資料部分成功，摘要要顯示PUBLISHED、REJECTED、RETRY與DUPLICATE各幾筆，不要讓使用者以一個綠色完成圖示誤解為全部資料成功。

事件時間線常有來源時鐘和伺服器時鐘差異。可以比較已同步的時間源或序號，但不能用處理先後推論設備因果；報告把觀察、推定與待確認分欄。

## 警報事件的逐階段追蹤

自訂事件AL-77由來源tag Pump02/Flow在08:15:03.400產生，raw於08:15:03.920收到。驗證檢查eventId、sourceTimestamp、transition與payload schema通過；轉換版本r2把原始level=2映射成報表severity=High；發布於08:15:04.500。報表行必須連回rawId、ruleVersion和處理狀態，不能只留下High文字。

| 時間/識別 | 階段 | 結果 | 可追查欄位 |
| --- | --- | --- | --- |
| 08:15:03.400 AL-77 | source | 事件產生 | source、payload |
| 08:15:03.920 | collector | 收到原文，待驗證 | receivedAt、attempt=1 |
| 08:15:04.100 | validate | VALID | schemaVersion=3 |
| 08:15:04.300 | transform | CONVERTED | ruleVersion=r2 |
| 08:15:04.500 | publish | PUBLISHED | dataset=shift |
| 後續重送 | dedupe | DUPLICATE | rawId、原結果 |

本文AL-77識別單一次轉移。如果同一AL-77因網路重送再到，去重鍵應是來源範圍與eventId的組合，不是只看時間或payload雜湊。去重紀錄要保存firstSeen、duplicateSeen與原處理結果。若eventId只在來源週期內唯一，需再加入sourceBootId或alarm cycleId；不能把不同設備同名ID誤合併。

對警報生命週期，alarm cycleId可代表一次Active到Clear週期，transitionId則識別Active、Ack、Clear等轉換。傳輸事件仍需source與eventId；兩組識別互相關聯，但用途不相同。

## 重送 失敗與資料血緣

驗證失敗不應直接刪除raw。例：AL-78缺sourceTimestamp，狀態為REJECTED，error欄為MISSING_SOURCE_TIME；來源若補上時間而改變payload，需產生新事件ID並以supersedes引用AL-78；若只是用原payload重跑新的處理規則，則新增processingAttempt，仍連到原rawId。同一source+eventId收到不同payload時應隔離成ID衝突，不當作一般重送。轉換規則失敗則進RETRY，含首次共嘗試三次仍失敗進DEADLETTER；每次要記處理版本、錯誤類型與下次重試時間。重送成功不代表原始資料可被改寫。

| 輸入 | 判定 | 結果 | 報表處理 |
| --- | --- | --- | --- |
| 缺eventId | 無法去重 | REJECTED | 不發布，通知來源 |
| 相同source+eventId | 重複輸入 | DUPLICATE | 引用原結果 |
| schema通過但單位錯 | 品質不確定 | QUARANTINED | 保留不發布 |
| 轉換暫時失敗 | 可重試 | RETRY | 不重複產生報表 |
| 三次失敗 | 不可自動重試 | DEADLETTER | 人工處理 |

資料血緣表要把rawId、validatedId、transformedId與reportRowId串起來，並記錄每一步的inputVersion、outputVersion與處理者。若規則r2修正了單位，不能把舊r1結果原地更新到看不出差異；應產生新版本並說明報表採用哪一版。

轉換表應列原始欄位、目的欄位、單位、縮放公式與版本。例：raw level=2只在r2規則中映射High，若r3改為Critical，舊報表仍保留r2版本。讀者可沿血緣查出差異，而不是以最新分類覆蓋歷史。

收集器重試時要區分傳輸失敗和處理失敗。傳輸失敗可以重送同一eventId；處理失敗若是資料格式問題，反覆重試沒有用，應進隔離區並通知負責人。重試延遲、上限及死信清理期限要寫入運維文件。

任何人工修正都建立新處理版本，不修改raw與原validated判定。報表顯示修正版時，附上修正人、時間、理由與原列連結；若沒有授權或證據，維持隔離狀態。

## 查詢 驗收與限制

查一次報表異常時，先由reportRowId找到transformedId，再看ruleVersion與quality，回到validated資料，最後以rawId檢查payload和來源時間。若只看到報表High，無法判斷是來源真的High、轉換映射錯誤或重送造成重複。查詢畫面可提供source、eventId、cycleId、狀態、錯誤、重試與版本篩選。

驗證案例包含成功AL-77與失敗AL-78：成功應只有一列PUBLISHED；AL-77重送應新增DUPLICATE紀錄而不增加報表數；缺timestamp應停在REJECTED。這些是離線資料表預期，不代表任何特定平台已執行。CloudEvents規格可作事件封裝參考，但採用CloudEvents不會自動提供工廠資料庫的去重或血緣。

未指定收集器、資料庫或雲服務時，不寫假API。實作前要確認事件ID來源、保存期限、重試語意、時鐘同步、schema版本、品質碼與權限。報表若需修正，保留原資料、修正版及修正理由。

資料來源若只提供一個遞增序號，仍要保存原始序號與傳輸重試次數；序號可協助排序，不代表應用事件一定成功。發布端對同一source、eventId只接受一次業務結果，其他到達列標記重複，讓稽核者看得出丟棄理由。

報表讀者也要能看見未發布資料的原因。REJECTED、QUARANTINED與DEADLETTER不是同一狀態；前者通常是契約錯誤，後者可能等待品質確認，死信則表示自動重試已停止。狀態標籤配上時間與處理版本，才能安排正確補救。

## FAQ與來源

若要換用其他平台，先對照其事件封裝、批次提交、冪等鍵、品質碼與版本欄位，不能因文件出現event字樣就假定提供完整lineage。

同一事件若先發布後收到更完整的品質資訊，新增可追溯修訂狀態並關聯原報表列，不要刪除原始發布紀錄。這能讓使用者知道數字何時可用、何時被重新評估，以及重新評估使用哪一版規則。

練習另送AL-79作為同一警報的Ack轉移，使用與AL-77相同alarmCycleId但不同transitionId。報表應新增一筆Ack轉移，AL-77的Active仍保留。接著重送AL-79，相同內容只新增接收紀錄；若level被改成另一個值，應標ID_CONFLICT並保留兩份原文，避免把資料衝突藏在去重成功之下。

FAQ1：報表數量少於來源事件就是漏資料嗎？先查REJECTED、RETRY、DEADLETTER與DUPLICATE，不能只比較筆數。

FAQ2：eventId相同一定是同一事件嗎？要連同source範圍、boot或cycle條件判斷。

FAQ3：轉換後資料可刪除raw嗎？不建議，失去血緣後無法分辨規則錯誤與來源錯誤。

FAQ4：處理時間較晚是否代表事件由處理器造成？不代表，時間排序不是因果證明。

參考：[CloudEvents v1.0.2規格：事件context attributes、id、source與time。](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md)

quality不只是Good或Bad兩個顏色。可分來源時間缺失、單位未知、網路重送、格式不合與值超範圍，報表依專案政策決定是否發布；若只剩一個布林值，後續無法說明為何資料被隔離。

完成驗收時以同一AL-77輸入兩次，確認報表只增加一列、去重紀錄增加一次、raw仍有兩次收到證據。再送缺欄位AL-78，確認不會被安靜丟棄，而是可查的REJECTED。

## 延伸閱讀

- [工業報表取樣週期與彙總週期的定義](/articles/sampling-and-aggregation-periods)
- [設備累計值歸零後 日報產量怎麼計算](/articles/counter-reset-rollover-daily-report)
