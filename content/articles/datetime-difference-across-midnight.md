---
title: 時間差跨越午夜如何以日期時間計算
description: 以合成批次資料集D021教你用完整年月日與時區計算跨午夜、跨月、閏日時間差，並分離UTC事件時間、接收時間、牆鐘校時、monotonic間隔、重啟epoch與時間品質。
date: 2026-09-21
author: 茂伯
draft: false
category: PLC 程式與控制
---

## 一 先把時間點與時間差的輸入契約寫清楚

跨午夜的難點不是把時分秒相減，而是先判斷兩筆資料是否屬於同一個日期與同一條時間線。本篇把事件時間 event_time、接收時間 received_time、時間品質 time_quality、來源時區與重新啟動世代 epoch 分開保存；輸出則包含 elapsed、status、diagnostic 與使用的規則版本。若資料只有 23:59:58 這種時分秒，沒有日期，就不能先假定它一定是次日，必須要求上游補日期或標記 DateMissing。這個限制比任何補 86400 的公式都可靠。

計算前先統一成帶時區的絕對時間，建議內部保存 UTC，顯示時再轉成操作員選定的時區。例：2026-09-17T23:59:58+08:00 到 2026-09-18T00:00:03+08:00，相減是 5 秒；兩個本地時刻看似只差五秒，是因為日期確實前進一天。若把結束日期誤寫成 2026-09-17，結果就是 -86395 秒，這應輸出 DateOrderError，而不是默默加一天。

本例區分 SameDateValid、CrossDateValid、DateMissing、TimezoneMissing、ClockAdjusted 與 RebootBoundary；日期倒退統一標為 DateOrderError。不要只用一個 valid 布林值，否則維護者無法知道是缺日期、時鐘品質不足，還是真的順序錯誤。

| 欄位 | 範例 | 用途 | 無效時處理 |
| --- | --- | --- | --- |
| event_time | 2026-09-18T00:00:03+08:00 | 事件發生時間 | 缺日期標 DateMissing |
| received_time | 2026-09-18T00:00:04+08:00 | 接收延遲分析 | 可缺但不可冒充事件時間 |
| time_quality | Good/Adjusted/Unknown | 判斷可否比較 | Unknown 不自動宣稱精確 |
| epoch | boot-17 | 重啟後隔離時間線 | monotonic不可跨世代相減 |

輸入契約還要固定精度與合法範圍。例如來源只提供秒，elapsed=5.4 秒不能由資料本身推導；若開始與結束解析度都是一秒，結果應附 resolution=1s，而不是格式化成毫秒。開始時間等於結束時間可代表零秒，也可能是重複事件，需依 event_id 與批次規則判斷，不能只靠差值。

## 二 逐筆計算跨午夜 跨月與閏日

正常流程是先解析開始與結束的完整年月日，再做絕對時間相減。案例 A：2026-09-17 23:59:58 到 2026-09-18 00:00:03，結果為 5 秒，狀態 CrossDateValid。案例 B：2026-01-31 23:59:50 到 2026-02-01 00:00:20，結果為 30 秒；月份改變不應由固定的每月天數推算。案例 C：2028-02-28 23:59:59 到 2028-02-29 00:00:01，2028 是閏年，結果為 2 秒。資料處理器應使用日曆函式，不能寫死二月 28 天。

同一組時分秒若日期不同，意義完全不同。2026-09-18 00:00:03 到同日 00:00:08 是 5 秒；結束日期若誤寫前一日，則是 -86395 秒，應標 DateOrderError。若允許跨日批次，另定 max_window，例如 36 小時；超過就標 OutOfWindow，不取絕對值掩蓋錯誤。

| 案例 | 開始(+08) | 結束(+08) | 差值 | 狀態 |
| --- | --- | --- | --- | --- |
| 跨午夜 | 9/17 23:59:58 | 9/18 00:00:03 | 5 秒 | CrossDateValid |
| 跨月 | 1/31 23:59:50 | 2/1 00:00:20 | 30 秒 | CrossDateValid |
| 閏日 | 2028/2/28 23:59:59 | 2/29 00:00:01 | 2 秒 | CrossDateValid |
| 日期倒退 | 9/18 00:00:03 | 9/17 00:00:08 | -86395 秒 | DateOrderError |

不要把時分秒拆成 hour×3600+minute×60+second 後只比較數字，再遇到午夜就一律加 86400。這種做法無法處理跨月、閏日、時區偏移，也會把真實的日期倒退誤判成正常跨日。若系統確實只給時分秒，必須先建立日期推定規則，例如由批次日期或序號提供日期；推定結果要記錄 date_inferred=true，並保留原始欄位供追查。

跨日窗口要與業務流程一起定義。一次換班可能允許 8 小時 30 分，長時間批次則可能允許 36 小時；max_window 不是由午夜這個字自動決定。若超過窗口，保存 elapsed_raw 供調查，輸出 status=OutOfWindow，禁止把結果截成零或取絕對值後當作正常。

## 三 UTC 牆鐘調時與 monotonic 間隔要分開

UTC 時間適合記錄事件發生的絕對時刻；時區或夏令時間的顯示變化，不等於 UTC 牆鐘被調整。NTP 或人工改 UTC 才是牆鐘跳動事件。monotonic 只適合同一執行環境量經過時間，不能當跨設備事件時間，也不能跨重啟延續。可同時保存 event_utc 與 receive_monotonic，兩者不可互換。

若 event_utc 與 received_utc 兩端時鐘已同步且品質合格，兩者差值才可估算事件到接收的延遲。若 NTP 在中間把接收端牆鐘往回調 2 秒，牆鐘差值不再可靠；此時 monotonic_receive_end−monotonic_receive_start 只能量本地處理區間，不能補出遠端傳輸延遲，並應標 ClockAdjusted。

時區是顯示與解析規則，不是把 UTC 直接加八小時的永久真理。資料若含 +08:00，先依 offset 轉 UTC；若只寫 Asia/Taipei，還要由目標平台的時區資料庫解析。對沒有時區的字串，狀態應是 TimezoneMissing。本文案例在台北固定偏移下運算，不能推論其他地區全年都沒有夏令時間。

牆鐘校時期間要保存校時事件、前後 offset、來源與品質。若工作是量測馬達運轉 3.5 秒，應在同一程序取 monotonic；若工作是判斷批次跨日，則使用含日期的 UTC。ClockAdjusted 資料不可宣稱精確物理耗時，直到品質重新恢復。

日期型別的另一個邊界是資料來源混用格式，例如一筆使用 2026-09-18T00:00:03Z，另一筆使用 2026/09/18 08:00:03。兩者可能表示同一時刻，也可能因第二筆缺少時區而不確定。解析器要先記錄格式與來源，再決定是否接受；不可只看到相同數字便直接拼接。

## 四 重啟 品質與失敗排查流程

重啟會切斷 monotonic 的可比性，也可能使牆鐘尚未同步。每次啟動建立新 epoch，例如 boot-17；事件保存 epoch、啟動時間、clock_sync_state 與序號。不同 epoch 的 monotonic 值一律不能相減；若兩端有可信且品質合格的 UTC，UTC 事件仍可跨 boot 比較，但要保留 RebootBoundary 警告。接收順序也不能改寫事件發生順序。

失敗排查按層次進行。第一層查字串是否完整、日期是否存在、時區是否一致；第二層查解析器是否正確處理月份與閏年；第三層查來源時鐘是否校時、品質是否 Unknown；第四層查是否跨 epoch 或收到重送。每層都保留原始值與診斷時間，避免只在最後顯示一個 GenericError。

| 現象 | 先查 | 應保留欄位 | 預期狀態 |
| --- | --- | --- | --- |
| 23:59:58 到 00:00:03 被算負值 | 日期與時區 | raw_start/raw_end/date | DateOrderError 或修正後 CrossDateValid |
| 牆鐘差值突然負數 | 校時記錄與 monotonic | clock_adjust_at、offset_before/after | ClockAdjusted |
| 重啟後差值巨大 | epoch 與同步狀態 | boot_id、sync_state | RebootBoundary |
| 同事件重複兩次 | event_id、sequence | duplicate_of、received_time | DuplicateIgnored |
| 只收到時分秒 | 批次日期來源 | date_inferred、source | DateMissing 或明確推定 |

可採用以下非可直接編譯的偽碼：先 parse(start,end)；缺日期或時區就回傳無效；不同 epoch 時禁止使用 monotonic 差值，只有 UTC 品質合格才允許跨 boot；ClockAdjusted 時標記不可作精確耗時；最後以 UTC 相減並檢查 0≤elapsed≤max_window。日期型別範圍、溢位與錯誤回傳仍須依目標平台核對。

完成結果應能讓操作員看見 5 秒、使用的日期與時區、品質及是否跨午夜；失敗結果應看見原因與原始字串。這比只顯示『時間差=5』更容易在月份切換、校時或重啟後維護。

## 五 驗收案例 FAQ 與官方來源

驗收資料集包含五筆：2026-09-17 23:59:58 到次日 00:00:03 應得 5 秒；2026-01-31 23:59:50 到 2 月 1 日 00:00:20 應得 30 秒；2026-09-18 00:00:03 到同日 00:00:08 應得 5 秒；結束日期錯寫成前一日應拒絕 -86395 秒；缺時區應為 TimezoneMissing。每筆核對 raw、UTC、epoch、quality、elapsed 與 status。

FAQ1：23:59:58 到 00:00:03 是否永遠是 5 秒？答：只有在日期、時區與同一時間線已確認時才是。若日期缺失，不能把時分秒差自動加 86400。

FAQ2：為什麼不直接用 received_time 算事件耗時？答：接收時間包含網路、佇列與處理延遲，不能取代 event_time。兩者都保存，才能分析延遲與事件發生時間。

FAQ3：NTP 校時後的負差是不是製程倒退？答：不一定。先查校時事件與 time_quality；同一程序的經過時間可用 monotonic，但跨設備與報表仍需可信 UTC。

FAQ4：重啟後可以把新舊資料相減嗎？答：只有在外部可信 UTC、epoch 關係與品質契約允許時才可；單靠 monotonic 或序號不能跨重啟宣稱連續。

參考：[Python datetime 官方文件：日期、時間、時區與 timedelta 的資料模型參考；不代表任何 PLC API。](https://docs.python.org/3/library/datetime.html)

參考：[Python time.monotonic 官方文件：同一執行環境量測經過時間的參考；不作絕對事件時間。](https://docs.python.org/3/library/time.html#time.monotonic)

參考：[RFC 3339：含時區的網路日期時間格式與 offset 表示；實際平台解析能力仍須另核對。](https://www.rfc-editor.org/rfc/rfc3339)

輸出可分成 elapsed_seconds、elapsed_display、status、warning_flags 與 diagnostic_id。display 只是格式化文字；status 描述是否可用，warning_flags 描述跨日、校時或粗解析度，避免只顯示一個無法追查的數字。

## 延伸閱讀

- [百分比變更率遇到前值為零 如何定義結果](/articles/percent-change-zero-baseline)
- [BCD與二進位轉換如何攔截非法 nibble](/articles/bcd-binary-conversion-invalid-nibble)
