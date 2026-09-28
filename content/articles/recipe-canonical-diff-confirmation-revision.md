---
title: 配方差異確認：綁定內容、設備、版本與五分鐘有效期
description: 下載 Node.js 離線案例，從四欄差異與 SHA-256 到單次確認，重播內容替換、版本衝突及到期拒絕；確認成功仍是零設備寫入。
date: 2026-09-21
author: 茂伯
draft: false
category: HMI 畫面與操作
---

## 先跑一次完整確認

本篇沿用[配方欄位驗證](/articles/recipe-schema-complete-error-list)的 `recipe-v3`，不另建另一套欄位規則。案例是 **Node.js 24.19.0 的單一擁有者、同步記憶體模型**，沒有伺服器登入、PLC、HMI SDK、通訊或真實權限系統。它驗證的是：顯示的差異與受理的內容是否一致。

將 [recipe-validation.mjs](/examples/recipe-validation/recipe-validation.mjs)、[workflow.mjs](/examples/recipe-validation/workflow.mjs)、[confirmation-demo.mjs](/examples/recipe-validation/confirmation-demo.mjs)、[workflow-self-test.mjs](/examples/recipe-validation/workflow-self-test.mjs)、[workflow-README.md](/examples/recipe-validation/workflow-README.md) 存在同一資料夾，以 Node.js 24.19.0 執行：

```powershell
node confirmation-demo.mjs
node workflow-self-test.mjs
```

`workflow.mjs` 的 `INITIAL` 是來源快照：R1、50°C、1200 rpm、low=20%、high=80%；`TARGET` 是待確認的完整配方：55°C、1300 rpm、25%、85%。設備固定 D-03、配方版本 8、操作者 U17、教學 session S1，目前 revision=41。

預期 stdout：

```text
diff=temp:50->55°C,speed:1200->1300rpm,low:20->25%,high:80->85%
revision=41 expires_at=300000 diff_sha256=de0e1713857add3d61a927ccb59be29d364ca69ec8f51d5257c1592f29b2eb0d
confirm=staged writes=0
replay=CONFIRMATION_UNAVAILABLE
expired=EXPIRED writes=0
conflict=REVISION_CONFLICT writes=0
permission=PERMISSION_OR_SCOPE writes=0
confirmation demo: PASS
```

`expires_at=300000` 是從虛擬時間 0 起的毫秒值，不是 Unix timestamp。時間只會被 `advance()` 推進；等五分鐘不會改變模型。`staged` 表示記憶體內已有待套用資料，**writes=0**；它不是設備已生效。

## 這份配方究竟怎麼比較

本例是完整替換，四個數值欄位都必填，單位由 schema 固定：temp 為 °C、speed 為 rpm、low/high 為 %。沿用驗證器的型別、範圍、low≤high、2048-byte 原文上限和重複鍵拒絕。recipe_id 固定 R1，不能把確認轉用另一份配方。

| 輸入差異                          | 本例處理       | 操作時怎麼判讀            |
| --------------------------------- | -------------- | ------------------------- |
| `55` 與 `55.0`、JSON 欄位順序不同 | canonical 相同 | 不產生格式假差異          |
| temp 由 50 改 55                  | 一筆 temp 差異 | 顯示兩值及 °C             |
| temp=null                         | 拒絕           | 不支援清除數值            |
| temp 未提供                       | 拒絕           | 不是 patch 的「保持舊值」 |
| temp="55" 或新增 units="°F"       | 拒絕           | 不自行轉型或換算          |
| 任一待寫欄位被隱藏                | HIDDEN_FIELD   | 無法看完整內容就不能確認  |
| 完全相同                          | NO_CHANGE      | 不建立確認                |

四欄都會送入後續套用，即使其中某欄未變。因此本例要求四欄全可見、全在授權 scope 內；不能只授權 temp，卻順帶覆寫其餘三欄。若產品真的需要可清除欄位、patch、華氏換算或陣列，必須另定版本化契約和測試；本例沒有實作這些語意。

## 確認綁定的是完整內容

`prepare()` 先驗證完整資料，產生固定欄位順序的 canonical 值，再將 confirmation-v1、設備／使用者／session／配方版本、revision、完整 old 與 next 一起計算 SHA-256。畫面差異只有變更欄位，雜湊輸入仍涵蓋全部值。這是此 Node.js 教材的固定序列化規則，未宣稱跨語言 canonical JSON 標準相容。

`confirm()` 收到 ID、digest 與原文後，重新驗證原文，重算 digest，並比對模型內保存的內容。只傳回看似正確的 digest 不足以換掉 payload。每個確認 **只允許一次嘗試**：成功或拒絕都消耗它；重新 prepare 也取代舊確認。已有 ready stage 時必須先處理該 stage，不能悄悄建立另一筆覆蓋。

| 檢查時點                          | 例子                 | 結果                |
| --------------------------------- | -------------------- | ------------------- |
| 確認時內容變成 temp=56            | 原確認 temp=55       | CONTENT_MISMATCH    |
| 切設備、session、使用者或配方版本 | 不再等於固定 context | CONTEXT_MISMATCH    |
| 其他更新使 revision=42            | 原確認 expected=41   | REVISION_CONFLICT   |
| 虛擬時間到 299999                 | 期限尚未到           | 可確認              |
| 虛擬時間到 300000                 | 相等也視為到期       | EXPIRED             |
| 權限／scope 改變                  | 失去任一待寫欄位權限 | PERMISSION_OR_SCOPE |

修改 `confirmation-demo.mjs` 的 `raw`，例如改成 `JSON.stringify({...TARGET,temp:56})`，重新執行就會產生不同差異和雜湊。若要測「確認後偷換內容」，只改 `confirm({...shown,raw:...})` 的 raw，保留 prepare 原值；結果應拒絕，而不是生成新的有效確認。第一個正常案例的 assert 也會因此失敗，這是故意改測拒絕分支的結果。

## 這些檢查沒有證明什麼

C1、S1 等是固定教學識別碼，不是不可猜的安全 token。`setAccess()` 是注入測試條件，並不驗證真實身分；雜湊也不是簽章。狀態只存在單一程序記憶體，未實作並行交易、跨程序鎖、重啟恢復、TLS 或授權服務。模型最多建立 100 次確認，虛擬時間限 0..1000000 ms，用來限制示範執行。700000 ms 是最後可建立確認的時點，之後 prepare 回 MODEL_TIME_LIMIT，確保五分鐘期限仍可在此模型內走到。

實際系統需要在權威服務內，把版本檢查、單次受理與狀態持久化放在一致的受控邊界。不能把本例同步函式等同於已完成資料庫原子交易。OWASP 的[交易授權指引](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html)支持顯示重要交易資料、由服務端檢查、限制有效期與單次授權；它並未驗證本例的 PLC 能力。

確認後的 stage 如何處理四欄寫入與第三欄逾時，接著跑[配方選取與套用案例](/articles/recipe-select-verify-apply-device)。命令狀態紀錄另見[accepted 與 applied 的證據界線](/articles/operation-log-accepted-applied-equipment-revision)。
