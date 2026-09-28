---
title: 重送寫入如何用冪等鍵保護同一筆資料庫效果
description: 以 Node 24.19+ 的 node:sqlite 建立可重現 SQLite 範例：同一 operation_id 回傳已保存結果、不同 payload 拒絕衝突，並演練提交前與提交後崩潰。
date: 2026-09-21
author: 茂伯
draft: false
category: 工業通訊與網路
---

## 先核對本例的效果範圍

通訊逾時只表示呼叫端沒有收到回覆，不能據此判定寫入沒有發生。若重試時改用新的業務識別，後端無法知道它是第一次要求還是同一筆要求的重送，遞增、建單與配方套用都可能做兩次。

本篇的可執行案例刻意只做一件事：把 SQLite 表內的 `increment_count` 加上一個已驗證的整數。它不連 PLC、不開 HTTP 服務、不送封包，也不代表實體輸出或機械動作。這個小邊界讓「去重紀錄、計數效果、保存結果」是否真的同時提交可以直接驗證。

案例要求呼叫端在首次送出時產生 `operation_id`，其後每一次重送都原樣沿用。例如 `OP7` 的固定 payload 是：

```json
{"operation":"increment","amount":1}
```

`operation_id` 必須是非空白字串，不可有前導或尾隨空白，UTF-8 編碼最多 64 bytes，且不得有控制字元。payload 只接受兩個欄位：`operation` 必須是 `increment`，`amount` 必須是 1 到 1000 的安全整數。程式將它固定序列化為 `{"amount":1,"operation":"increment"}`，再以 UTF-8 計算 SHA-256。這表示 JSON 欄位先後順序不會改變 payload 身分；額外欄位、浮點數與字串數字則在進入交易前被拒絕。

## 可下載並自行重跑的 SQLite 案例

本案例使用 Node 內建的 [`node:sqlite` `DatabaseSync`](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html)，不安裝 npm 套件。範例已在 Node 24.19.0 實際執行，程式要求 **Node 24.19.0 或更新版**；先確認：

```powershell
node --version
```

下載以下四個檔案到同一個空資料夾，然後在該資料夾執行。它們都是本機檔案，不需要資料庫服務。

- [計數器與冪等帳本模組](/examples/idempotency-ledger/idempotency-ledger.mjs)
- [受控崩潰子程序](/examples/idempotency-ledger/crash-worker.mjs)
- [完整示範與斷言](/examples/idempotency-ledger/demo.mjs)
- [README 與逐行預期輸出](/examples/idempotency-ledger/README.md)

```powershell
node demo.mjs
```

執行器只會用自己透過系統暫存目錄新建的 `hubplc-idempotency-ledger-*` 資料夾，並在其中建立三個新的 SQLite 檔案；它不接受路徑參數、不覆寫既有使用者資料庫。成功時輸出固定如下：

```text
OP7 first: applied counter=1
OP7 retry 1: replayed counter=1
OP7 retry 2: replayed counter=1
OP7 changed payload: conflict counter=1
OP7 after reopen: replayed counter=1
crash before COMMIT: child_exit=70 counter=0 ledger_records=0
crash after COMMIT before reply: child_exit=71 retry=replayed counter=1
demo: PASS
```

前三行使用同一個 `OP7` 和同一 payload；只有第一次讓 SQL 計數器變成 1，兩次重送拿到的是從帳本讀回的原始結果。第四行故意以相同 `OP7` 改送 `amount: 2`，得到 `conflict`，計數器仍是 1。關閉後重新開啟同一 SQLite 檔再送一次，證明回放依賴持久化帳本，而不是單一 Node 行程的記憶體。

## 交易中到底保護了什麼

每個可接受要求會在同一 SQLite 連線內依序執行：

```text
BEGIN IMMEDIATE；INSERT ledger(operation_id, payload_json, payload_hash, result_json = NULL)
  ON CONFLICT DO NOTHING
若新插入：UPDATE counters SET value = value + amount；保存 result_json；COMMIT
若既有資料且 payload 相同：ROLLBACK；回放保存的 result_json
若既有資料但 payload 不同：ROLLBACK；回報 conflict
```

`operation_id` 是帳本的主鍵。先嘗試插入而非先查再插入，才讓資料庫的唯一限制參與取得處理權。`BEGIN IMMEDIATE` 會立即嘗試取得寫入交易；若別的連線已在寫入，SQLite 可能回 `SQLITE_BUSY`，整合者應依自己的逾時與退避策略處理，而不是把它誤當成成功。SQLite 同時只允許一個寫入交易，且官方交易文件也說明 `BEGIN IMMEDIATE` 在已有寫入者時可能失敗。[SQLite Transaction](https://www.sqlite.org/lang_transaction.html)

計數器更新與 `result_json` 都在 `COMMIT` 前。交易尚未提交時發生例外，程式會嘗試 `ROLLBACK`；在正常交易機制下，不會有「帳本說已完成、計數器卻沒加」或反過來的已提交中間狀態。SQLite 將同一交易的資料庫變更以全有或全無的方式提交；這是單一 SQLite 資料庫檔案內的原子邊界。[SQLite Atomic Commit](https://www.sqlite.org/atomiccommit.html)

範例也刻意用兩個獨立子程序做受控故障演練。第一個在寫入帳本、更新計數器與保存結果之後，於 `COMMIT` **之前**以 exit code 70 結束；父程序重新開啟資料庫後看到計數器 0、帳本 0 筆。第二個在 `COMMIT` **之後、回覆呼叫端之前**以 exit code 71 結束；重送同一操作得到已保存結果，計數器仍是 1。父程序檢查兩種情況後正常以 code 0 結束。

這是「受控 Node 子程序在本機結束」的測試，不是斷電、儲存裝置損壞、檔案系統設定或 PLC 電源中斷的驗證。實際部署仍須依儲存裝置、SQLite journaling、備份與復原需求另行驗收。

## 回放與衝突是不同結果

相同 `operation_id` 與相同規格化 payload，案例回傳 `replayed` 和原本保存的結果，完全不再遞增。相同 ID 但 hash 或固定序列化不同，案例回 `conflict`，並保留先前的資料；它不覆蓋，也不猜測哪一份比較新。回放的 counter 是該操作提交當時保存的值，不是重新查詢目前計數器；其他新操作可能已讓目前值增加。這符合常見 API 冪等契約：同一 token 搭配同一參數可安全重送；重用 token 卻更改參數必須失敗。[AWS EC2 idempotency](https://docs.aws.amazon.com/ec2/latest/devguide/ec2-api-idempotency.html)

呼叫端應把「要求已送出但未收到回覆」視為可查詢／可重送同一 ID 的狀態，而不是立即改發 `OP8`。若業務真的要執行另一個遞增，應建立新的 `operation_id`，使兩次效果在帳本中可追溯。

## PLC 或外部效果不在這個交易裡

若同一流程還要寫 PLC、寄信、呼叫另一個服務或驅動實體輸出，本機 SQLite `COMMIT` 無法連同外部效果一起原子提交。尤其是「PLC 已收到命令，但代理在保存結果前中斷」：資料庫可能只有 pending／unknown，不能宣稱實體動作 exactly once，也不能未經查詢就重送。

此時介面要另訂可查證的邊界，例如把已提交的待傳送資料寫入 outbox、讓接收端也辨識同一 `operation_id`、以設備讀回值或完成事件關聯操作，並把無法證明的結果保留為 unknown。本文沒有實作 outbox、PLC 通訊、外部補償、TTL 刪除或跨系統 exactly-once；保留期限、容量滿時的拒絕策略和過期 ID 的處置都必須由實際系統明訂與測試。

## 把這個模式接到實際服務前的驗收項目

先在隔離資料庫驗證同一 ID 同一內容回放、同一 ID 不同內容衝突、重啟後回放，以及提交前／提交後回覆遺失兩種故障點。接著測試並行寫入的 `SQLITE_BUSY`、連線池是否真的將同一筆 SQL 放進同一連線與交易、帳本容量告警與資料保存政策。

若要跨出資料庫，額外核對外部端點是否保存或可查詢 `operation_id`，以及 unknown 狀態由誰處理、多久升級、可以做什麼人工確認。只有所有副作用和結果都落在同一個可原子驗證的邊界內，才可以談該邊界的 exactly once；本篇範例證明的只有 SQLite 內的 SQL 計數器與帳本。

## 延伸閱讀

- [資料庫交易如何讓一批紀錄一起提交或回滾](/articles/batch-database-transaction)
- [HMI 重連後舊回呼如何判為結果不明](/articles/hmi-reconnect-stale-callback-unknown-write)
