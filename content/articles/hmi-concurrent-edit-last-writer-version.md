---
title: 多人改值衝突：保留草稿，重新核對版本後再提交
description: 用同一個 SQLite CAS 案例重播甲乙改值，顯示基準、目前值、草稿、最後提交者；回覆遺失時查原操作，不自動改用新請求。
date: 2026-09-21
author: 茂伯
draft: false
category: HMI 畫面與操作
---

## 一次重播甲乙兩份草稿

本篇使用[雙來源仲裁](/articles/multi-source-cas-arbitration)的同一個 `store.mjs`，資料庫版本規則只維護一份。它是 **Node.js 24.19.0 的 CLI 編輯流程與真實本機 SQLite 實驗**，沒有建立瀏覽器畫面、正式登入、HMI SDK 或 PLC 連線。

下載 [store.mjs](/examples/cas-setting/store.mjs)、[editor.mjs](/examples/cas-setting/editor.mjs)、[hmi-demo.mjs](/examples/cas-setting/hmi-demo.mjs)、[self-test.mjs](/examples/cas-setting/self-test.mjs)、[practice-editor.mjs](/examples/cas-setting/practice-editor.mjs)、[README.md](/examples/cas-setting/README.md)，存在同一資料夾並執行：

```powershell
node self-test.mjs
node hmi-demo.mjs
```

兩個編輯者都讀到 raw500（50.0°C）、version7。A 的草稿是550（55.0°C），B 的草稿是520（52.0°C）。A先提交，B仍拿版本7提交而衝突。固定輸出：

```text
B=conflict base=500@v7 current=550@v8 draft=520 last_writer=A
B-rebased base=550@v8 draft=520
B=committed current=520@v9 last_writer=B device=NOT_CONNECTED
lost-reply=unknown
query-original=COMMITTED current_version=10 history=4
HMI editor demo: PASS
```

每次執行都使用新建的 `hubplc-cas-*` 暫存資料夾，留下 SQLite 檔，未修改真實設定。history=4包括A提交、B衝突、B重新確認後提交、最後一筆回覆被丟棄的提交，不是四次設備操作。

## 衝突時應把哪三份值放在一起

| 畫面需要的資料   | B 衝突時的值  | 從哪裡來                 |
| ---------------- | ------------- | ------------------------ |
| 原基準           | 50.0°C、v7    | B開啟編輯時的快照        |
| 目前權威值       | 55.0°C、v8    | 衝突後重新讀資料庫       |
| 我的草稿         | 52.0°C        | B本地尚待重新確認的意圖  |
| 最後成功提交來源 | A             | 與值及版本一起更新的欄位 |
| 設備狀態         | NOT_CONNECTED | 本例沒有設備連線         |

收到衝突不會把B草稿改55.0，也不會拿最新版號自動送52.0。此時再呼叫 submit 會拒絕，要求明確重新核對。`inspect()` 回傳複本，修改它不會改寫編輯基準。

若要做實際 HMI，畫面可以使用這三欄與原因字串；本下載範例只驗證狀態與資料，沒有驗證字型、觸控或畫面操作。raw÷10才是°C，不能把 raw550 顯示為550°C。

## 重新核對和捨棄是兩個不同操作

`rebaseKeepingDraft()` 重新讀目前資料作為基準，但保留自己的草稿。demo 中它把B基準改成550@v8，草稿仍520。使用者看過差異後，以新 operation id `EDIT-B-NEW` 提交，才形成v9。

`discardDraft()` 則重新讀目前值，同時以它取代自己的草稿。兩者都不會寫資料庫。若重新核對後又有人先改成下一版，再次提交仍會衝突，不能為方便而撤掉版本條件。

執行 `node practice-editor.mjs` 會分三次印出完整物件：衝突畫面、重新核對後的基準、再次提交結果。把 `myDraftRaw=520` 改為530再重跑，B草稿應保留530，最後形成530@v9。練習檔中的 `rebaseKeepingDraft()` 是明寫的確認步驟，正式UI須由使用者看過差異後觸發，不能因腳本連續執行就改成背景自動重試。並發 SQL 行為和各回覆代碼集中說明在[仲裁篇](/articles/multi-source-cas-arbitration)。

## 回覆遺失後只查原操作

最後一筆以 `loseReply:true` 故意丟棄 store.submit 的回覆：資料庫實際已提交，但編輯流程只看到 unknown。這是**合成回覆遺失**，沒有真的斷網。

unknown 時 edit、submit、重新核對和捨棄都被阻擋，保留原操作 ID。`queryOriginal()` 以來源、ID、原 expectedVersion、raw 與 epoch 核對原紀錄；同 ID 若其實對應另一份舊內容，回 IDEMPOTENCY_CONFLICT，不能把舊成功當成本次成功。取得吻合的 COMMITTED 後再讀目前值，才解除未知；查不到時維持 unknown，沒有「沒找到就重送」的分支。本例未實作人工處置、逾時輪詢或持久化編輯草稿。

store 呼叫若拋錯，編輯狀態也保守留 unknown，讓呼叫端先查原操作；不能僅因畫面看到例外就換新 ID。失敗注入的資料庫交易可能已回滾，但編輯層不能把任意例外一律當成未寫入。

## 最後寫入者和時間不能代替版本

這裡更精確的名稱是「最後成功提交來源」。A/B 是測試程式指定的身分，沒有登入驗證；正式系統需從可信任會話取得操作者，不能信任表單任意填的名字。

`committed_at` 在 SQL UPDATE 中以資料庫所用系統時鐘產生 UTC 字串，與值、版本、operation_id 同一交易保存。它不是 PLC生效時間，也不是COMMIT完成耗時量測；不同提交可同毫秒，系統時鐘也可能調整，所以仍以version處理條件更新。history 保存本例提交／衝突結果，不是防竄改稽核日誌。

COMMITTED只表示本機設定資料交易成功，始終 `device=NOT_CONNECTED`。若要再送PLC，需另做[配方套用結果](/articles/recipe-select-verify-apply-device)與[命令紀錄](/articles/operation-log-accepted-applied-equipment-revision)，不能在資料庫成功時就把機台顯示為已套用。

SQLite 的[條件 UPDATE](https://www.sqlite.org/lang_update.html)與[交易語意](https://www.sqlite.org/lang_transaction.html)是共用儲存模型的依據；本篇的 UI 選擇、狀態名稱與固定資料都是教學規則。
