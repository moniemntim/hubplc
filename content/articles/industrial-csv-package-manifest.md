---
title: 工業CSV附檔包與查詢快照
description: 用manifest、schema、README與query snapshot組成可驗證CSV附檔包，說明產生者、範圍、完整性與接收驗收。
date: 2026-09-17
author: 站長
draft: false
---

## 一 附檔包的目的與邊界

工業CSV附檔包要解決的是「拿到檔案後能否知道它從哪裡來、有哪些欄位、查詢範圍和完整性」，而不是重新講CSV逗號與引號語法。本文把一次匯出視為目錄中的package，至少包含data.csv、manifest.json、schema.json、README.md與query_snapshot.json。CSV保存列資料，manifest說明產生者與檔案雜湊，schema描述欄位意義與型別，README給操作員閱讀，query snapshot固定原始查詢條件。

案例為LINE-3 2026-09-17 08:00至12:00的溫度匯出。producer寫成Historian-02/exporter-4，packageId=LINE3-20260917-A01，schemaVersion=2.1，data.csv有7200列。這些識別不是檔名推測，而是manifest的結構化欄位。當資料搬到另一台電腦時，使用者仍能由packageId、producer與時間範圍找到責任來源。

附檔包不等於資料已通過製程正確性驗證。sha256只能證明下載後位元組未改變，不能證明感測器校正正確；rowCount只能檢查列數，不能保證沒有漏掉某個設備。README要把這些邊界寫清楚，避免接收者把完整性誤當作真實性或品質。

附檔包的目錄名稱也應固定，例如packageId/data.csv、packageId/manifest.json等，避免使用者把同名CSV從不同批次混在一起。producer在產生前先建立暫存目錄，完成列數與雜湊後才封裝；封裝失敗時清理暫存資料，並把錯誤寫入產生端日誌。

## 二 manifest與schema的分工

manifest應放packageId、createdAt、producer、sourceSystem、querySnapshotFile、schemaFile、files陣列及每個檔案的size、sha256、mediaType、rowCount。schema則描述欄位名稱、資料型別、單位、時區、可空性、唯一性與版本。兩者不要把欄位字典重複寫成兩份；manifest指向schemaVersion，schema保存可供驗證的細節。W3C CSV on the Web文件說明附加metadata可描述表格、欄位、型別與驗證，這正是此分工的依據。

本例schema列出event_time為RFC3339含時區的時間欄位，asset_id為字串，temperature_c為十進位數值，quality為列舉Good、Stale、Bad，sample_id為每個來源設備範圍內唯一。manifest則只記data.csv的sha256=自動產生值，不在文章中捏造固定雜湊。

驗證器先讀manifest找到schema，再計算data.csv雜湊，確認檔案大小與rowCount，最後依schema檢查欄位存在、型別與可空性。若manifest說rowCount=7200但實際是7198，整包標InvalidManifest；不要只顯示警告後讓報表繼續使用。若schemaVersion不支援，保留檔案並回報UnsupportedSchema。

| 檔案 | 必要欄位 | 驗收動作 |
| --- | --- | --- |
| manifest.json | packageId、producer、sha256 | 驗雜湊與列數 |
| schema.json | 欄位、型別、單位 | 逐欄驗證 |
| query_snapshot.json | 範圍、時區、排序 | 重現查詢條件 |
| README.md | 用途、限制、命令 | 人工閱讀核對 |

## 三 producer與查詢快照

producer欄位要能回答誰產生、用哪個版本、從哪個資料源查出來。query_snapshot.json則保存query_name、source、filters、start、end、timezone、order_by、page_size與exporter_version。它不是再次保存所有資料，而是把產生CSV的選擇條件固定下來。查詢若有游標或分頁，也要記錄是否完整跑完及最後一頁的邊界。

LINE-3案例的快照可寫filters為asset_id in [M-301,M-302]、quality in [Good,Stale]，start=2026-09-17T08:00:00+08:00，end=2026-09-17T12:00:00+08:00，order_by=[event_time,asset_id,sample_id]。如此重跑時不會因畫面目前選到另一批設備而產生不同檔案。若資料源時間採UTC，README要說明顯示時區與原始時區。

producer失敗在第4頁時，不應產生一個宣稱完成的manifest。可以先寫暫存data.partial.csv，全部頁面成功後才改名為data.csv並建立manifest。若已發出的package只有部分資料，manifest的status要是incomplete並記錄failure_reason，接收端拒收或進入隔離目錄。

manifest的時間欄位要區分createdAt、資料範圍start與接收時間receivedAt。前者是產生端建立包的時間，資料範圍是列的業務時間，接收時間是目標系統拿到檔案的時間；三者相同並不代表資料即時。若跨日或夏令時間環境，所有時間欄位都要帶時區偏移，README再用文字解釋顯示習慣。

producer若從歷史資料庫分頁讀取，query snapshot還要保存頁面總數、完成頁數與最後游標。若中途重試，應確認重試不會把同一頁重複寫入；本例sample_id只在設備內唯一，因此用asset_id與sample_id作為列身份檢查，event_time另核對，但不要把它們誤當整個package的唯一識別。

## 四 README與接收者操作

README是給人看的最短入口，建議列出套件用途、產生時間、資料範圍、時區、檔案清單、schema版本、雜湊驗證命令與品質欄位解釋。它不應取代機器可解析的manifest。操作員先解壓到隔離目錄，完成後設成唯讀，再依README確認資料來源與時間範圍，接著用工具核對manifest中的檔案大小和sha256，最後才匯入暫存表。

匯入案例：接收端發現README寫7200列，manifest也寫7200，但sha256不符。流程應停止正式匯入、保留原包、記錄接收時間與檔案雜湊，向producer索取重送；不能因列數相同就忽略雜湊錯誤。若sha256相符但schema顯示temperature_c允許null，而報表程式不接受null，這是schema與消費者能力不匹配，應回報SchemaUnsupported，不得直接把null改成0。

接收者匯入後應把packageId、schemaVersion、manifest_hash寫入內部批次表，讓每一列能回指來源包。若同一packageId再次到達，先比manifest雜湊；相同且該批次已成功提交才標DuplicatePackage；先前失敗或未完成則依批次狀態續傳或重試。內容不同標PackageConflict並隔離。

| 狀態 | 觸發條件 | 接收端動作 |
| --- | --- | --- |
| complete | 所有分頁成功且雜湊一致 | 允許暫存匯入 |
| incomplete | 中途失敗或部分列 | 隔離並要求重送 |
| PackageConflict | 同packageId不同manifest | 拒收並保留兩包 |

查詢快照若使用相對時間，例如最近四小時，不能只保存「最近四小時」這句話，應在產生時展開為絕對start與end並記錄時區。否則隔天重跑會選到不同列，接收者無法判斷差異是資料變動還是查詢窗口滑動。

驗收完成後把原始附檔包設為唯讀，另存驗證報告。報告列出接收者、驗證時間、工具版本與失敗項目；日後若發現來源系統修正了資料，應產生新packageId，而不是在原目錄替換CSV。

查詢條件快照不會凍結資料庫。要重現完全相同結果，還需保存原CSV，並記錄資料版本或一致性快照機制；晚到與修正資料會讓同條件重跑不同。分頁也應使用一致資料版本與穩定排序。manifest只列其他檔案雜湊，不能要求它包含自己的最終雜湊；接收端另算manifest_hash。

## 五 查詢快照與驗收

若接收端只需要查詢快照而不需要完整CSV，也仍要保存packageId與manifest_hash作為引用。查詢結果另存query_result.json時，記錄使用的schemaVersion和輸出列數，避免日後把快照結果誤認成原始匯出。這種分層讓小報表可以快速交換，又不會失去完整包的追溯入口。

驗收分成包級、檔案級、欄位級三層。包級確認五個必要檔案與packageId一致；檔案級確認size、sha256、rowCount；欄位級依schema抽樣檢查時間、單位、品質值與sample_id。對本例可抽查08:00、10:00、11:59三個時間點及M-301、M-302兩台設備，核對快照中的排序和篩選條件。

一個完整的驗收表可寫：manifest存在且status=complete；data.csv實列7200與manifest一致；schemaVersion=2.1受接收端支援；query_snapshot的end不含12:00邊界；sha256計算一致；README說明+08:00時區；quality=Bad列沒有被匯入正常報表。每項附命令輸出或查詢結果，避免只勾選「已檢查」。

W3C CSVW與Tabular Data Model提供通用的表格metadata概念，但不會替你的歷史資料定義製程品質，也不保證某個資料庫工具能讀所有schema欄位。本文的package欄位是離線設計樣本，導入現有平台前應做一次小批量相容性測試。

```text
FAQ：manifest的sha256能證明感測器數值正確嗎？
回答：不能；它只支持檔案與參考雜湊一致；參考manifest也要從可信來源取得，感測器校正與資料品質仍由來源系統和品質欄位驗證。
```

```text
FAQ：為何README與schema都要保留？
回答：README服務人員閱讀，schema服務工具驗證；兩者目的不同，不能只留下其中一個。
```

```text
FAQ：查詢快照要保存密碼或token嗎？
回答：不要。只記錄來源名稱、篩選、時間、排序和版本，機密認證資料放在受控的秘密管理系統。
```

```text
FAQ：CSV列數正確但雜湊錯誤可否照用？
回答：不應正式匯入；保留原包並索取重送，因為內容可能在傳輸中被改動。
```

參考：[W3C CSV on the Web Metadata：表格與欄位metadata、型別及驗證](https://www.w3.org/TR/tabular-metadata/)

參考：[W3C Tabular Data Model：表格資料與欄位模型](https://www.w3.org/TR/tabular-data-model/)

## 延伸閱讀

- [工業事件去重與重啟世代](/articles/industrial-event-dedup-generation)
- [工業資料人工修正與撤回版本](/articles/industrial-data-manual-revision)
