---
title: 資料庫交易如何讓一批紀錄一起提交或回滾
description: 以 Node 24.19+ 與 SQLite 實際寫入 B17 表頭和三筆明細，驗證完整提交、約束失敗回滾、主動取消與其他連線的提交前後可見性。
date: 2026-09-21
author: 茂伯
draft: false
category: 資料記錄與報表
---

## 先核對本例的資料範圍

批次 B17 必須有一筆表頭與三筆明細：序號 1、2、3，數值 10、20、30，合計 60。資料庫中只看到表頭的完成旗標，並不能證明三筆明細都在；完成狀態、筆數、序號和加總都必須一起核對。

本文附的案例實際使用本機 SQLite，不是假想的 PostgreSQL 指令。它只寫 SQLite 檔案，不連 PLC、不寫入設備，也不代表實體製程已完成。範例用 Node 24.19.0 與內建 SQLite 3.53.3 驗證；它的資料庫效果範圍僅限 B17 表頭與明細。

資料契約固定如下：`batch_id` 是非空白、沒有前導或尾隨空白、最多 64 UTF-8 bytes 的字串；一批恰有三列，`seq` 是 1、2、3，`value` 是 -10000 到 10000 的有限安全整數。表頭的 `expected_count` 在資料庫層限制為 3，`(batch_id, seq)` 是唯一鍵，明細值有 SQL `CHECK`。本例的 trigger 會保護程式採用的 `collecting → completed` 更新：它拒絕該更新時明細不足三筆或合計不相符。

## 下載並重跑 B17

下載下列三個檔案到同一個資料夾。範例不需要 npm 套件；使用 Node 24.19.0 或更新版執行，先以 `node --version` 確認。

- [SQLite 批次交易模組](/examples/batch-transaction/batch-transaction.mjs)
- [示範與斷言](/examples/batch-transaction/demo.mjs)
- [README 與精確預期輸出](/examples/batch-transaction/README.md)

```powershell
node demo.mjs
```

示範程式自行建立帶有所有權標記的系統暫存資料夾，在其中新建 SQLite 檔案；它沒有資料庫路徑參數，不會覆寫既有資料庫。成功輸出為：

```text
success: headers=1 details=3 seq=1,2,3 sum=60 status=completed
constraint rollback: error=CHECK constraint failed: value BETWEEN -10000 AND 10000 headers=0 details=0
explicit rollback: headers=0 details=0
observer before COMMIT: headers=0 details=0
observer after COMMIT: headers=1 details=3 seq=1,2,3 sum=60 status=completed
demo: PASS
```

第一行證明 B17 的完整結果。第二行不是先在 JavaScript 把壞值擋掉：它已在同一個明確交易中插入表頭與第一筆明細，第二筆以 `10001` 觸發 SQLite 的 `CHECK(value BETWEEN -10000 AND 10000)`，catch 區塊再明確執行 `ROLLBACK`，最後另查得到 0 表頭、0 明細。第三行則是在插入表頭與第一筆明細後由應用程式主動取消，同樣不留下資料。

## 一個連線內的交易步驟

正常 B17 依下列次序由同一個 `DatabaseSync` 連線處理：

```text
BEGIN IMMEDIATE
INSERT batch_headers(B17, expected_count=3, status='collecting')
INSERT batch_details(B17, 1, 10)
INSERT batch_details(B17, 2, 20)
INSERT batch_details(B17, 3, 30)
SELECT COUNT, MIN(seq), MAX(seq), SUM(value) 驗證為 3、1、3、60
UPDATE batch_headers SET total=60, status='completed'
COMMIT
```

完成更新由 trigger 重新確認明細筆數與合計，不把單一 `completed` 欄位當成驗收證據。程式提交後還以新的查詢讀取表頭與明細，檢查 `headers=1`、`details=3`、`seq=1,2,3`、`sum=60` 及 `status=completed`。SQL 約束負責拒絕不合法資料；交易負責讓這些相關變更要嘛一起留下、要嘛一起取消。本例沒有提供可阻擋任意直接 SQL `INSERT completed`、後續改寫 total／明細的通用不可變批次 schema，也沒有定義資料庫帳號權限；實際系統仍須依寫入路徑與權限另行設計。

SQLite 的手動交易會持續到 `COMMIT` 或 `ROLLBACK`。`BEGIN IMMEDIATE` 立即嘗試建立寫入交易，若別的連線已寫入可能得到 `SQLITE_BUSY`；整合服務應依自己的逾時與退避規則處理，不能當成批次已成功。[SQLite Transaction](https://www.sqlite.org/lang_transaction.html)

## 另一個連線何時看得到資料

範例另開一個 observer 連線。writer 已插入 B17 表頭和三筆明細，也已把狀態更新成 `completed`，但尚未 `COMMIT` 時，observer 執行新查詢仍讀到 0 表頭、0 明細。writer 提交後，observer 再執行新查詢才讀到完整 B17。這是此單機資料庫、這兩個連線與每次查詢結束後重新讀取的實測結果；長時間持有的讀取交易、不同 journal mode 或其他資料庫產品要另外驗證。

範例的 `readBatch()` 以兩個獨立 SELECT 讀表頭與明細，沒有把它們包成一般用途的讀取交易。observer 演練中，兩次 SELECT 之間沒有並行 writer，因此可核對這個固定情境；若正式服務需要在持續寫入時取得跨表一致快照，必須依資料庫、journal mode 與讀取交易策略另行設計及測試。

SQLite 的隔離文件說明，分離資料庫連線的未提交變更不會被讀取；讀取端的快照與 journal mode 仍會影響它何時開始新的視圖。[SQLite Isolation](https://www.sqlite.org/isolation.html)

## 別把資料庫回滾延伸到 PLC 或提交回覆遺失

本例的 `ROLLBACK` 只能取消 SQLite 裡尚未提交的 B17 資料。已送往 PLC 的命令、已寄出的通知、另一個服務已收到的請求，都不會因為這個 SQLite 回滾而撤銷。那些外部效果需要自己的查詢、補償或 outbox 契約；當外部設備是否執行無法證明時，應保留 unknown，不可直接重做。

此外，`COMMIT` 送出後呼叫端沒收到回覆，不能推論回滾。用穩定業務識別重新查詢或重送的做法，請看 [重送寫入如何用冪等鍵保護同一筆資料庫效果](/articles/idempotency-key-duplicate-write)。該篇的提交前／提交後程序結束案例與外部效果邊界適用於這個問題，本文不重複宣稱 crash 或 PLC 驗證。

## 接到實際系統前的驗收

在隔離資料庫重跑成功、第二筆 SQL 約束失敗、主動取消和 observer 可見性後，再測實際連線池是否讓一批操作固定落在同一連線、鎖等待是否有可觀察錯誤、容量不足如何保留既有批次與告警，以及備份／復原後的資料完整性。不要在正式產線批次刻意插入壞資料來證明回滾。

對接 PLC 或其他服務時，另外記錄批次識別、外部命令識別、送出時間、讀回／完成證據與 unknown 的升級流程。SQLite 檔案內 B17 完整，不代表現場設備真的已執行。

## 延伸閱讀

- [重送寫入如何用冪等鍵保護同一筆資料庫效果](/articles/idempotency-key-duplicate-write)
- [批次配方欄位缺漏如何產生完整錯誤清單](/articles/recipe-schema-complete-error-list)
