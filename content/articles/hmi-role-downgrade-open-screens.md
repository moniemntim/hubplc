---
title: 權限降級後的舊畫面與排隊命令：用版本 12→13→14 重播
description: 使用共用離線授權模型，讓一個畫面更新、另一個保留舊權限，再檢查直接提交、排隊命令與恢復權限後的新操作。
date: 2026-09-21
author: 茂伯
draft: false
category: HMI 畫面與操作
---

## 本篇只查降權後仍留在手上的舊資料

這裡沿用[操作權限矩陣](/articles/hmi-operation-permission-execution-authorization)的模型，不再重複角色表與數值驗證。重點是：頁面開啟時可寫，不代表送出或執行時仍可寫；權限恢復也不代表人員仍想送出之前的草稿。

Node.js 24.19+ 離線案例把「畫面」表示為兩份讀取快照，沒有真正瀏覽器分頁、身份平台或 PLC。S、T 是同一使用者的兩個固定測試工作階段；它們不是登入權杖。

下載 [model.mjs](/examples/authorization/model.mjs)、[matrix-demo.mjs](/examples/authorization/matrix-demo.mjs)、[downgrade-demo.mjs](/examples/authorization/downgrade-demo.mjs)、[practice.mjs](/examples/authorization/practice.mjs)、[downgrade-practice.mjs](/examples/authorization/downgrade-practice.mjs)、[self-test.mjs](/examples/authorization/self-test.mjs)、[README.md](/examples/authorization/README.md)，放在同一資料夾：

```powershell
node downgrade-demo.mjs
node self-test.mjs
node downgrade-practice.mjs
```

## 按操作順序核對，別只看最後值

固定政策起始為 Supervisor、revision=12，設備值80、revision=1。時間是同一虛擬時鐘的毫秒，每一步同步完成；本例沒有量測真實通知延遲或跨服務競態。

| 時間   | 動作                                    | 預期                                      |
| ------ | --------------------------------------- | ----------------------------------------- |
| 0～1   | 合法OP0把值設成85                       | 設備revision=2、writes=1                  |
| 2      | S與T各保存一份權限快照                  | 兩者看到policyRevision=12、canSubmit=true |
| 3      | T提出OP20設成95                         | QUEUED；尚未寫入                          |
| 4      | 測試驅動器將使用者降為Viewer            | 政策revision=13                           |
| 5      | S重讀，T故意不刷新                      | S變唯讀；T仍保有舊的true                  |
| 6      | T繞過舊畫面的提示直接提交OP21           | ROLE_DENIED，writes仍為1                  |
| 7      | 派送器處理先前排隊的OP20                | 再查目前權限，拒絕並終結                  |
| 8～9   | 恢復Supervisor，revision=14，再派送OP20 | 已終結，不復活、不寫入                    |
| 10～12 | T重讀目前設定，明確提出新OP22設成90     | 套用成功，設備revision=3、writes=2        |

預期輸出：

```text
tabA canSubmit=false; oldTabB canSubmit=true
oldTabB direct submit=ROLE_DENIED; writes=1
queued OP20=REJECTED; reason=ROLE_DENIED
restore revision=14; OP20 stays rejected; writes=1
new OP22 applied value=90 revision=3 writes=2
downgrade: PASS
```

writes沒有歸零：降權之前的OP0已合法套用，不會因為後來降權就變成「從未執行」。OP20則只有排隊紀錄，執行前被拒絕，與OP0處置不同。

`canSubmit` 只代表讀取時的角色可提交，不是設備許可或永遠有效的通行證。本例刻意讓T不刷新，仍由模擬執行端拒絕；沒有把按鈕變灰當成保護完成的證據。

## 修改練習：降權後很快恢復，舊佇列可以復活嗎？

`downgrade-practice.mjs` 的 `restoreBeforeDispatch` 預設為 `false`，先執行一次：

```text
{"decision":"ROLE_DENIED"}
{"value":80,"revision":1,"writes":0,"writeEnabled":true}
```

改成 `true` 再執行，第一行應變成 `{"decision":"AUTHORIZATION_CHANGED"}`，設備仍為80、revision=1、writes=0。原因是排隊時依revision=12受理，派送前雖再次成為Supervisor，政策已到14；本教材要求重新讀取並建立新的操作意圖，不讓舊請求因權限恢復而自動執行。

這是明示的案例政策，不是所有身份平台的內建行為。角色名稱相同也不代表政策版本相同，重送原ID不應被當作新的人工確認。

## 讀稽核紀錄與界定驗證範圍

可在練習最後加 `console.log(JSON.stringify(server.inspect().audit, null, 2));`，核對 QUEUED、POLICY_CHANGED、EXECUTION_REJECTED 的順序與operationId。inspect和changeRole是測試驅動器專用入口，真實HMI不應獲得任意修改政策或讀取內部狀態的能力。

模型以同一執行緒同步做授權判斷、記錄與記憶體寫入，因此可以確定每筆使用哪個政策版本；這不證明真實Gateway、佇列與PLC之間已有原子受理邊界。正式系統需另驗撤銷延遲、資料庫交易、在途命令及設備回覆，不能用本例的零網路延遲代替現場驗收。

工作階段存在與目前授權是兩個檢查。本例在每次提交及派送時查現在政策；僅驗證舊登入資料仍有效不足以代表角色未改。[OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) 與 [Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) 可用來核對正式系統的授權與工作階段設計。

後續處置要看操作在哪一段：未送草稿不自動補送，已排隊命令依執行前政策處理，已送往設備的命令繼續查結果。本文只模擬前兩種以及同步完成的記憶體寫入，沒有實體取消功能；結果未知的命令可接著參考[按鈕回饋與原ID查詢案例](/articles/hmi-button-command-feedback)。
