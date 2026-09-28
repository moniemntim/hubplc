---
title: 雙來源更新：用 SQLite 條件寫入重現版本衝突與舊主拒絕
description: 下載實際本機 SQLite 案例，讓兩個 Node 程序競爭版本7，驗證一筆提交、一筆衝突，以及原請求重播與 epoch fencing。
date: 2026-09-21
author: 茂伯
draft: false
category: PLC 程式與控制
---

## 這次直接跑資料庫，不只畫版本流程

兩個來源都看到版本7，分別想改成55.0°C與52.0°C。真正需要證明的是：版本條件與更新在同一個儲存邊界成立，不能先 SELECT，再不帶條件地 UPDATE。

本例使用 **Node.js 24.19.0 內建 SQLite，真正在本機建立資料庫**。一條示範依序送 A、B；另一條用兩個 child process 開啟同一資料庫，各讀版本7後等待共同啟動訊號，再各送一次更新。這不是 PLC／網路／多主叢集實測，也沒有建立正式認證服務。

把 [store.mjs](/examples/cas-setting/store.mjs)、[demo.mjs](/examples/cas-setting/demo.mjs)、[race.mjs](/examples/cas-setting/race.mjs)、[race-worker.mjs](/examples/cas-setting/race-worker.mjs)、[self-test.mjs](/examples/cas-setting/self-test.mjs)、[practice.mjs](/examples/cas-setting/practice.mjs)、[README.md](/examples/cas-setting/README.md) 存在同一資料夾，以 Node.js 24.19.0 執行：

```powershell
node self-test.mjs
node demo.mjs
```

每次都在作業系統暫存目錄建立新的 `hubplc-cas-*` 資料夾，保存本次 SQLite 檔供查看；不會覆寫既有檔案，也不會自動刪除。無須安裝 npm 套件。

固定 stdout：

```text
A=COMMITTED version=8 raw=550
B=VERSION_CONFLICT version=8 raw=550
A-replay=COMMITTED replay=true version=8
A-changed=IDEMPOTENCY_CONFLICT
old-writer=FENCED
reopen-query=COMMITTED current_version=8 epoch=2
two-process-race committed=1 conflicts=1 version=8
CAS demo: PASS
```

競爭案例不保證 A 或 B 勝出：共同啟動不是實體同時。它只斷言本次兩個請求中一筆提交、一筆衝突、最終版本8；不能從一次重播推導任意負載下的效能或公平性。

## 固定欄位與 SQL 條件

資源固定 `TEMP_SP`，raw 是0..1000的安全整數，raw÷10是°C；起始 raw=500、version=7、epoch=1。A/B 是程式指定的教學來源，不是使用者自行填字串就完成認證。請求只接受 id、expectedVersion、raw、epoch 四欄；id 限1..40個大寫英數字或連字號。

`BEGIN IMMEDIATE` 取得本資料庫寫入交易後，先查同 id 的請求結果，再執行具條件的 UPDATE。核心條件為：

```sql
WHERE id='TEMP_SP'
  AND version=?
  AND version<2147483647
  AND (SELECT epoch FROM authority WHERE id=1)=?
```

值、版本、最後提交來源、operation_id 與資料庫產生的 UTC 時間在同一 UPDATE 更新；回覆結果存入 operations，再 COMMIT。若 operations 寫入失敗，整個交易回滾，值和版本不能獨自留下。

SQLite 的 [UPDATE 文件](https://www.sqlite.org/lang_update.html)說明 WHERE 決定更新列，零列更新本身不是 SQL 錯誤。本例會在同一交易內分辨 NOT_FOUND、FENCED、VERSION_EXHAUSTED 與 VERSION_CONFLICT；不把零列當成功。SQLite 的[交易文件](https://www.sqlite.org/lang_transaction.html)則說明單一同時寫入交易及 BEGIN IMMEDIATE；這不是跨資料庫或設備的原子保證。

## 重播不能變成另一筆修改

| 情境                                   | 本例結果             | 是否再改值       |
| -------------------------------------- | -------------------- | ---------------- |
| A 以 v7 更新                           | COMMITTED，成為 v8   | 是               |
| B 仍以 v7 更新                         | VERSION_CONFLICT     | 否               |
| 同 id、來源、版本、raw、epoch 完全相同 | 原結果加 replay=true | 否               |
| 同 id 改內容或來源                     | IDEMPOTENCY_CONFLICT | 否               |
| 重新開啟資料庫後查原 id                | 原結果仍可查         | 否               |
| 查不到 id                              | NOT_FOUND            | 不推論未寫入設備 |

operations 保存已進入交易的成功、版本衝突及 fencing 等結果；格式不合法／未列入的來源不建立紀錄。結果是**當次交易的歷史快照**：原操作回覆的 current.version=8，不代表查詢當下整體仍是8；目前值要另呼叫 read()。

換了 expectedVersion 或 epoch 就是不同內容，不能沿用舊 id。衝突後應先重新讀取、看過差異，再建立新意圖與新 id；HMI 的保留草稿流程接[多人改值案例](/articles/hmi-concurrent-edit-last-writer-version)。更廣的逾時與冪等限制見[冪等鍵與重複寫入](/articles/idempotency-key-duplicate-write)。

## epoch 在哪裡阻止舊主

demo 先把資料庫 authority.epoch 由1改成2。舊寫入者即使帶目前 version=8，epoch仍是1，也會被 UPDATE 的儲存條件阻擋，回 FENCED。只有新 epoch 且版本吻合的新請求才可能提交。

這只是同一 SQLite 權威檔案內的協作寫入約束。`rotateEpoch()` 是人工測試入口，沒有做選主、租約、權限或網路分割處理；擁有任意 SQL 寫入權限的人可繞過本 API，其他直寫 PLC 的通道也不受它保護。已完成的舊請求可以回傳歷史結果，但不會因此重新寫入。

要改測結果，執行 `node practice.mjs`。先保持 `secondExpectedVersion=7`，B應衝突、目前仍550@v8；再把該常數改8並重跑，B應提交、目前520@v9。`firstRaw`／`secondRaw` 可改0..1000的整數，每次練習都用新資料庫，不必刪掉固定 demo 的斷言。這個改8的練習代表已重新讀取並確認新版本；正式介面不能在衝突後自動替使用者改版本重送。

## 限制與故障判讀

版本及 epoch 上限2147483647，沒有回捲；operations 上限1000筆，滿了回 LEDGER_FULL，不自動淘汰舊 id。SQLite busy timeout 設5000 ms，若未能取得交易或檔案錯誤，程式會拋錯；這不是已確認的版本衝突，也沒有無限自動重試。

本例不做備份還原、跨主機共用檔案、斷電、重啟後換資料世代、硬體生效或安全控制驗證。資料庫重開只證明本機已提交紀錄仍在；不能拿它宣稱設備命令 exactly-once。Node 所用 API 見 [v24.19.0 SQLite 文件](https://nodejs.org/download/release/v24.19.0/docs/api/sqlite.html)。
