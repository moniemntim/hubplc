---
title: HMI 報表篩選與警報歷史查詢
description: 以含時區半開區間[22:00,06:00)查詢昨夜未確認警報，分開歷史事件狀態與目前狀態，設計設備/優先級篩選、空結果、邊界與匯出條件。
date: 2026-09-17
author: 茂伯
draft: false
---

## 先固定時間窗語意

報表查詢要先定義時間區間、時區與事件時間欄。本文採半開區間[start,end)，含start、不含end，時區固定Asia/Taipei；昨夜查詢寫2026-09-16T22:00:00+08:00到2026-09-17T06:00:00+08:00，避免下一班06:00事件被重複算入。

事件狀態要分現在狀態與當時事件。歷史Alarm Journal查的是active、clear、ack等事件發生時間；目前Status查的是現在仍Active或已Cleared的狀態。不要用現在Active篩選器回答昨夜當時未確認的問題。

篩選欄應包括start、end、timezone、source/asset、priority、event type、ack state、provider與是否包含system/shelved。空值、過大範圍與查不到資料都要有明確提示。

查詢時間要先把使用者輸入的本地時間轉成帶offset的時間值，再傳給資料源；報表標題仍顯示使用者輸入與實際UTC或offset，避免跨Gateway時區造成歧義。半開規則要在說明文字中明示。

若資料源只保存事件開始時間而沒有Ack或Clear，報表應標示欄位缺失，不自行推算操作狀態。

| 欄位 | 案例值 | 語意 | 錯誤風險 |
| --- | --- | --- | --- |
| start | 22:00 +08 | 含起點 | 時區漏寫 |
| end | 06:00 +08 | 不含終點 | 重複算下一班 |
| source | P-01 | 事件來源 | 只查display text |
| state | Active/Unacked當時 | 歷史事件狀態 | 誤用目前狀態 |

## 昨夜未確認警報案例

假設P-01在22:15 Active、22:20被Ack、23:00 Clear；P-02在05:59 Active且未Ack，06:00:00 Clear。查昨夜22:00至06:00的歷史Active事件，應包含P-01與P-02；查Active/Unacked事件發生時間，P-01的22:15當時未確認，P-02的05:59也包含；06:00:00因end不含不納入。

如果使用目前狀態查詢，P-01與P-02現在都可能Cleared，便無法回答昨夜誰未確認。Ignition Alarm Journal Query可選Start/End、Include Events、Source、Provider、Priority與Use current status instead of history；設計報表時要把這個選項在畫面上說清楚。

| 事件 | 時間 | 當時狀態 | 現在狀態 | 半開查詢結果 |
| --- | --- | --- | --- | --- |
| P-01 Active | 22:15 | Unacked | Cleared/Acked | 包含 |
| P-01 Ack | 22:20 | Acked | Cleared/Acked | 依Include Ack |
| P-01 Clear | 23:00 | Cleared | Cleared/Acked | 依Include Clear |
| P-02 Active | 05:59 | Unacked | Cleared | 包含 |
| P-02 Clear | 06:00 | Cleared | Cleared | 不含 |

事件在end邊界的測試要有05:59:59.999、06:00:00.000與06:00:00.001三筆。前一筆屬於昨夜窗口，後兩筆不屬於[22:00,06:00)。資料庫精度不足時，報表要標示實際解析度。

若事件已被journal pruning刪除，查詢應顯示retention limitation；空結果不是「昨夜沒有事件」的證明。

同一event可能有Active、Acknowledgment與Clear三個時間；要先問清楚「發生當時未確認」還是「交班時仍未確認」。前者包含兩個Active事件；後者以06:00之前的最後狀態重建，本例只有P-02仍未確認。不能把兩個問題用同一個Unacked選項回答。

報表查詢失敗與空結果要使用不同狀態碼，並讓使用者看到重試、縮小範圍或查資料保留期限的建議。

查詢結果要把filter摘要印在報表：start/end含offset、狀態判斷時間、source、priority、journal與產生時間。若空結果，顯示「符合條件0筆」並保留條件，不顯示查詢失敗或把0當沒有事件。

## 篩選 清除與匯出

設備篩選應用source path或穩定asset ID，不只用畫面顯示名稱；名稱可能改語言或重複。priority用明確最小/最大範圍，event type列出Active、Cleared、Acknowledgment與System。篩選器要有Clear Filters與Restore Defaults，避免上一個人的條件留在畫面。

時間範圍過大會造成查詢慢或資料量過多。可設定預設8小時、最大31天（這是案例策略），超過時要求縮小或改用批次匯出；不可把超大查詢自動截斷而不告知。匯出檔附filter、timezone、row count、generatedAt與資料來源。

Ignition Perspective Alarm Journal Table提供Date Range、Filters、分頁與查詢單筆Alarm/Source Path的介面；Report Alarm Journal Query則可選歷史或current status。這些是Ignition 8.1功能，其他HMI需依產品文件對照。

| 操作 | 成功結果 | 失敗結果 | 排錯 |
| --- | --- | --- | --- |
| 套用昨夜區間 | 列出符合event time | 空白/重複 | 查offset與半開規則 |
| 選P-01 | 只含穩定source | 漏事件 | 查source path/provider |
| 選Unacked | 當時狀態清楚 | 誤用現在狀態 | 重建指定時刻的狀態 |
| 匯出 | 附條件與筆數 | 只出數字 | 查報表資料源 |

目前狀態篩選回答「現在還是什麼狀態」，歷史event篩選回答「當時發生了哪些轉移」。畫面可提供兩個分頁，禁止用同一個Status下拉混淆。

設備名稱可能隨語言變更，source path或穩定ID更適合篩選。顯示名稱可作搜尋輔助，但匯出需保留原始source與display path。

日期選擇器顯示本地時間，查詢服務內部可用UTC，但報表必須回顯轉換規則。夏令時間或跨時區部署時，保存原始offset。

半開時間窗的三筆邊界測試應列在驗收記錄，不只在說明文字中描述。

若查詢服務採不同精度，保存實際解析度與轉換規則。

事件狀態欄應同時顯示event time、activeAt、ackAt、clearAt與現在狀態；如果只顯示一個Status欄，使用者容易把現在Cleared誤讀成當時沒有警報。

## 可重現驗收與限制

優先級範圍要說清楚是否含邊界，例如High到Critical含兩端；空的min/max不可被默認成0或所有級別而不提示。

查詢欄位版本化後，舊報表仍可能缺少新狀態；匯出時列出schema version與資料源版本，方便重現。

若一個事件跨過查詢end才Clear，歷史Active仍可被納入，而Clear事件落在下一窗口；報表要依每個event time分列，不把整個警報生命週期塞進單一窗口。

未指定HMI產品時，不假定PLC能讀報表篩選器、登入session或資料庫；報表層使用歷史/事件服務的公開欄位，控制器只提供來源資料與狀態。

注意Ignition 8.1的system.alarm.queryJournal文件明示時間範圍包含邊界，本文半開區間是報表設計規則，不是該函式預設。先查足所需資料，再依要統計的轉移時間保留start ≤ eventTime < end；不能只把起訖值傳入函式，就宣稱已排除06:00事件。

queryJournal回傳警報事件物件，並不保證每個物件就是一列原始轉移。先依產品欄位取出Active、Ack、Clear各自時間，製作轉移清單，再套本文邊界測試。若改查資料庫原始列，事件週期識別eventid與資料列id要分開，避免同一警報的三次轉移被去重掉。

重建交班時狀態還需要查詢窗之前的前情。例如P-03在21:50已Active且整夜未Ack，單查22:00以後的Active轉移會漏掉它。保存窗口起點狀態或往前追到可靠事件，再推演到06:00之前；前情已被刪除時，標示無法確定，不能當作已確認。

練習把P-02的Ack時間改成06:00整。依本文交班截止前的定義，它仍列為未確認；若改成05:59:59則不列入。接著刪除Ack時間資料，預期顯示待核對，不得自行推定沒有Ack。把這三組結果連同時間精度保存，才能驗證查詢邏輯。

## FAQ 來源與驗證

空結果頁顯示條件摘要與建議檢查：時間窗/時區、source path、journal、event type、priority、是否current status、資料保留期限。不要自動放寬篩選，否則使用者會以為原條件有資料。

報表匯出使用固定欄位順序，附queryId、generatedAt、rowCount與filters JSON摘要。若結果分頁，匯出應明示是全量或目前頁面，不能只檔名寫export。

queryId只識別一次查詢，不會自動凍結資料。要重現同一結果，保存結果快照或可重查的資料版本；若晚到事件補入，重跑結果可能不同，應顯示新版本與新增筆數。

所有案例的eventId、時間與筆數均為虛構手算值，正式系統要以實際journal保留與產品精度驗證。

半開時間窗也要套用到匯出與畫面分頁，不能查詢使用半開、匯出又把end事件加回。

匯出前顯示預估筆數與查詢條件，匯出後保存檔案的queryId、rowCount與產生時間，方便下一班重現。

查詢頁與匯出檔都要列出時區、時間窗、目前或歷史狀態與資料筆數，讓另一人可以重現相同結果。

FAQ1：查現在Cleared能找出昨夜未確認嗎？不能，應查歷史Active/Acknowledgment事件與當時時間。

FAQ2：為何使用半開區間？避免相鄰班次在邊界事件重複計算；end時間不納入。

FAQ3：空結果代表沒有警報嗎？不一定，可能是時間窗、時區、source、journal或狀態語意錯誤。

FAQ4：匯出只要保留事件列就夠嗎？不夠，還要保留start/end含時區、filters、狀態判斷時間、journal與row count。

本文事件、時間、時區與最大範圍為離線案例，未連接Ignition、資料庫或現場HMI。

參考：[Ignition 8.1 Alarm Journal Query：Start/End、事件類型、source、priority與current/history選項。](https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/reporting/report-data/alarm-journal-query)

參考：[Ignition 8.1 Perspective Alarm Journal Table：Date Range、Filters、分頁與歷史/即時查詢介面。](https://www.docs.inductiveautomation.com/docs/8.1/appendix/components/perspective-components/perspective-display-palette/perspective-alarm-journal-table)

參考：[Ignition 8.1 system.alarm.queryJournal：startDate、endDate、state與歷史事件查詢欄位。](https://www.docs.inductiveautomation.com/docs/8.1/appendix/scripting-functions/system-alarm/system-alarm-queryJournal)

## 延伸閱讀

- [HMI 班次交接頁應該留下哪些現場資訊](/articles/hmi-shift-handover-information)
- [HMI 操作按鈕的回饋狀態如何讓使用者知道命令是否生效](/articles/hmi-button-command-feedback)
