---
title: 登入逾時時未送出的設定值如何明確提示
description: 用可下載的 Node.js 案例重現草稿保留、登入逾時拒絕寫入、重新核對版本及查詢已送出的操作，附固定輸出與修改練習。
date: 2026-09-21
author: 茂伯
draft: false
category: HMI 畫面與操作
---

## 先確認設定值究竟送出了沒有

設備最後讀到 80°C、版本 1，使用者在編輯區改成 95°C，尚未送出就登入逾時。此時需要呈現「95°C 尚未送出；需重新驗證身分」，保留基準值與草稿的區別。重新登入成功，也不能自動把 95°C 寫回設備：其他人可能已改成 92°C、版本 2。

本篇提供 **Node.js 離線記憶體模型**，用固定時間重現以上過程。沒有真實登入畫面、密碼驗證、網路或 PLC；輸出中的 `writes` 是模型套用次數。可驗證的是判斷規則與狀態變化，並非 HMI 品牌的原生登入功能或設備實測。

授權及執行前再檢查沿用[操作權限案例](/articles/hmi-operation-permission-execution-authorization)，本篇只增加草稿投影與原操作查詢。不要在兩篇各維護一套權限規則。

## 下載六個附件，執行固定情境

安裝 Node.js 22.13 或以上。將以下六檔存進同一個新資料夾，保留檔名；不需要安裝 npm 套件。

- [model.mjs：共用授權來源](/examples/authorization/model.mjs)
- [draft.mjs：建立與核對草稿](/examples/authorization/draft.mjs)
- [draft-demo.mjs：完整流程](/examples/authorization/draft-demo.mjs)
- [draft-practice.mjs：修改練習](/examples/authorization/draft-practice.mjs)
- [draft-self-test.mjs：斷言檢查](/examples/authorization/draft-self-test.mjs)
- [draft-README.md：範圍與限制](/examples/authorization/draft-README.md)

在該資料夾開啟終端機：

```sh
node draft-demo.mjs
node draft-self-test.mjs
node draft-practice.mjs
```

第一條應依序印出：

```text
expiry: REAUTH_REQUIRED_UNSENT writes=0
same user: READY_FOR_EXPLICIT_SUBMIT writes=0
version changed: base=80 current=92 draft=95; no automatic write
sent then expired: OP9 SENT_RESULT_REQUIRED
lookup OP9: APPLIED value=95 revision=3 writes=2
draft demo: PASS
```

第二條結尾為 `draft self-test: PASS`。第三條先印出 `READY_FOR_EXPLICIT_SUBMIT`、草稿 95、預期版本 1，再印出設備值 80、版本 1、`writes: 0`。能送出只是核對結果，這支練習程式沒有呼叫寫入。

若顯示找不到模組，先核對六檔是否真的在同一資料夾、檔名是否被另存為 `.txt`。若斷言失敗，保留錯誤行與修改過的輸入，不能只刪掉斷言繼續宣稱通過。

## 依時間線對照程式與結果

所有時間均為程式提供的虛擬單調毫秒，執行不必等待十分鐘。教材自訂 session 期限 600000ms、草稿期限 300000ms；到期等號即失效。這是測試政策，不能直接當作現場登入期限建議。

| 虛擬時間         | 操作                                           | 必須看到的結果                                                 |
| ---------------- | ---------------------------------------------- | -------------------------------------------------------------- |
| 590000           | S 讀取 80／版本 1，再建立 95 草稿              | 草稿到期時間為 890000，設備未改                                |
| 600000           | S 到期後讀取；另外直接嘗試提交 BYPASS          | 草稿要求重新驗證；提交被來源以 SESSION_EXPIRED_OR_UNKNOWN 拒絕 |
| 600001～600002   | 延長 S 的測試 session，重新讀取並核對          | READY_FOR_EXPLICIT_SUBMIT，但 writes 仍為 0                    |
| 600003～600006   | T 送出並套用 92／版本 2；S 再核對              | VERSION_CHANGED，同時保留基準 80、目前 92、草稿 95             |
| 600007～600009   | 以版本 2 建立新的編輯意圖，明確提交 OP9 並套用 | 來源成為 95／版本 3；示範畫面假設未收到結果                    |
| 1200001          | S 再度到期，畫面保留已送出的 OP9               | SENT_RESULT_REQUIRED，不能退回「未送出草稿」                   |
| 1200002～1200003 | 延長 S 的測試 session，以 OP9 查詢             | APPLIED、95、套用版本 3；writes 共 2 次                        |

S 與 T 是同一位 Supervisor 的不同測試 session，因此 T 可以模擬另一個已開啟的操作畫面。`renewFixtureSession` 只是測試驅動器延長期限，**沒有驗證密碼或證明使用者身分**；正式系統必須由可信登入服務完成重新驗證後，才取得新的授權上下文。

範例的兩次套用分別是 T 的 92 和 S 明確提交的 95。`reviewDraft()` 只回傳狀態，不會偷偷呼叫 `submit()` 或 `execute()`。

## 改三個輸入，確認沒有默默套用

每個練習都從原版 `draft-practice.mjs` 開始，只改指定一項後重跑 `node draft-practice.mjs`：

| 修改                           | 草稿投影                        | 設備結果             |
| ------------------------------ | ------------------------------- | -------------------- |
| 不改：user 為 S、now 為 600002 | READY_FOR_EXPLICIT_SUBMIT       | 80／版本 1／writes 0 |
| `const user = 'O';`            | OTHER_USER_HIDDEN，不回傳草稿值 | 80／版本 1／writes 0 |
| `const now = 890000;`          | DRAFT_EXPIRED                   | 80／版本 1／writes 0 |

O 是另一位使用者，即使他能讀設備，也不能接續 S 的草稿。`OTHER_USER_HIDDEN` 只表示這個函式回傳的投影不含草稿，**不會清除 JavaScript 記憶體，也沒有儲存隔離或加密**。正式換人登入時，還要清除上一人的畫面、暫存與可存取的草稿資料。

`draft-self-test.mjs` 另外測試 C 改成 F 時回傳 `CONTEXT_CHANGED`，以及目前值／版本不同時回傳 `VERSION_CHANGED`。這些測試直接注入核對資料，不代表連到了另一個真實設備。`reviewDraft` 的輸入限定為本教材建立的資料，不能當作不可信 JSON 的通用安全驗證器。

## 把狀態轉成操作員看得懂的提示

| 模型狀態                       | 畫面應呈現                     | 後續動作                               |
| ------------------------------ | ------------------------------ | -------------------------------------- |
| REAUTH_REQUIRED_UNSENT         | 登入已逾時；95 尚未送出        | 重新驗證，同人回來後重讀設備           |
| READY_FOR_EXPLICIT_SUBMIT      | 基準與權限已重新核對，等待確認 | 使用者明確按套用才提交                 |
| VERSION_CHANGED                | 原始 80、目前 92、草稿 95      | 重新比較後建立新意圖；不沿用舊版本硬寫 |
| DRAFT_EXPIRED／CONTEXT_CHANGED | 草稿過期／設備或單位已變更     | 重新讀取並編輯，不直接送舊草稿         |
| SENT_RESULT_REQUIRED           | OP9 已送出，結果待查           | 重新授權後查原 ID，不另建 ID 重送      |

已送出的 OP9 即使草稿期限也過了，仍須處理原操作結果。關閉畫面或刪除草稿都不等於取消來源已收到的命令。反過來，來源收到但還沒執行的請求若在執行時已逾時，本模型會拒絕；不能因為「曾送出」就顯示完成。

`lookup()` 回傳的 `value` 是請求值；只有 `status: APPLIED` 與非空 `appliedRevision` 才是本模型的套用證據。單看設備恰好等於 95，無法證明是 OP9 造成的。本例查詢還會核對目前 session 與操作擁有人；沒有查到不能解讀成「確定未執行」。記錄只存在記憶體，程式重啟後不保留，也沒有示範正式系統的稽核保存。

## 移到實際 HMI 前要補的證據

先在專案中記錄產品版本、登入服務與 session 政策、設備值及版本來源、草稿保存位置、換人清除方式，以及操作 ID 的持久查詢介面。再測登入逾時當下送出、另一人接手、重新登入時設備已改值、送出後斷線與來源重啟。實際結果須另記設備讀回與操作 ID，不能用本篇的 PASS 代替。

[OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) 與 [Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) 提供 session 與每次請求授權的原則；本文的草稿期限、狀態名稱與 60～100 整數範圍是教材自訂。

作者：茂伯。若輸出與本文不符，請寄至 [ceo@hubplc.com](mailto:ceo@hubplc.com)，附 Node.js 版本、執行命令、修改的參數與錯誤行；請勿附密碼或 session 憑證。
