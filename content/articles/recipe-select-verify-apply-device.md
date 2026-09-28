---
title: 配方選取與套用：重播第三欄逾時的部分結果
description: 下載共用 recipe-v3 工作流，驗證選取與確認零寫入、四欄依序套用，以及逾時後停止、保留未知與禁止直接重跑。
date: 2026-09-21
author: 茂伯
draft: false
category: HMI 畫面與操作
---

## 用同一份配方走完選取、確認與套用

本篇承接[配方差異確認](/articles/recipe-canonical-diff-confirmation-revision)，共用同一個 `workflow.mjs` 及 `recipe-v3` 驗證器。先確認內容，再追蹤每一欄的結果。這是 **Node.js 24.19.0 離線假設備案例**，不開 socket、不連 PLC，也不代表任何原廠設備提供相同的交易識別或讀回能力。

將 [recipe-validation.mjs](/examples/recipe-validation/recipe-validation.mjs)、[workflow.mjs](/examples/recipe-validation/workflow.mjs)、[apply-demo.mjs](/examples/recipe-validation/apply-demo.mjs)、[workflow-self-test.mjs](/examples/recipe-validation/workflow-self-test.mjs)、[workflow-README.md](/examples/recipe-validation/workflow-README.md) 存在同一資料夾，以 Node.js 24.19.0 執行：

```powershell
node apply-demo.mjs
node workflow-self-test.mjs
```

D-03 起始 revision=41，四欄依序為 temp=50°C、speed=1200 rpm、low=20%、high=80%。待套用 R1 版本8是 55°C、1300 rpm、25%、85%。四欄完整寫入，包含值未變的欄位；本例不是 patch。

預期 stdout：

```text
success before_apply_writes=0
success result=applied steps=confirmed,confirmed,confirmed,confirmed writes=4
timeout-third before_apply_writes=0
timeout-third result=partial steps=confirmed,confirmed,unknown,not-sent writes=3
timeout-third fake_active_low=25 next_prepare=UNRESOLVED
staging-only before_apply_writes=0
staging-only result=unknown steps=unknown,not-sent,not-sent,not-sent writes=1
apply demo: PASS
```

## 每個階段的證據要分開

| 操作           | 模型內做什麼                               | 是否增加 writes      |
| -------------- | ------------------------------------------ | -------------------- |
| select(raw)    | 回傳目前選取原文                           | 否；沒有驗證成功承諾 |
| prepare(raw)   | 驗證欄位、權限條件、完整差異與 revision    | 否                   |
| confirm(...)   | 再核對內容與條件，建立記憶體 ready stage   | 否                   |
| apply(stageId) | 消耗 stage，檢查執行條件，才逐欄呼叫假設備 | 有通過才增加         |
| 結果判讀       | 查看各欄位 confirmed／unknown／not-sent    | 不另送寫入           |

`staged` 只是本程序保存的已確認候選，沒有寫入設備 staging 區。apply 再查設備目標 context、權限、全欄 scope 與可見性、revision 及原確認期限；變更或到期時零寫入拒絕。每個 stage 只允許一次 apply 嘗試，拒絕也不復用。已存在 ready stage 時，不接受另一份 prepare。

四欄寫入順序固定 temp、speed、low、high。這個順序僅用於教材資料，沒有證明中間狀態適合機台運轉。真實非原子設備在逐欄更新時可能短暫出現不一致參數，必須依設備契約在適當的非執行狀態操作，或改用設備確實支援的完整提交機制。

## 第三欄逾時為何不能直接重送

固定腳本 `['ok','ok','timeout','ok']` 的第三項，代表假設備已改 low，但回覆遺失。控制工作流不能讀取測試器私下知道的事實來宣布成功：

| 欄位  | 是否送出 | 工作流證據       | 結果      |
| ----- | -------- | ---------------- | --------- |
| temp  | 是       | 關聯的生效區回覆 | confirmed |
| speed | 是       | 關聯的生效區回覆 | confirmed |
| low   | 是       | 沒收到回覆       | unknown   |
| high  | 否       | 第三欄後停止     | not-sent  |

因此整體是 partial，三次寫入，high 仍是80。`fake_active_low=25` 只揭露合成測試的內部真相，**不是工作流取得的設備證據**。它示範「逾時不等於沒寫到」，不能拿來消除 unknown。模型鎖住後續 prepare，回 UNRESOLVED，不會自動重送全部配方，也不自動回滾 temp/speed。

若第一欄就無法確認，整體是 unknown；若先有欄位 confirmed 再遇到未知，則是 partial。若最後一欄逾時，即使測試器知道四欄都改了，工作流仍是 partial。沒有任何實體動作或網路逾時實測。

## 什麼才算這個模型的 applied

假設備的每筆證據包含 device、operation、field、value、area、revisionBefore、revisionAfter。工作流要求設備 D-03、此次 stage ID、正確欄位與目標值、生效區 `active`，以及該步 revision 精確加一。四欄都吻合才回 applied；成功後 revision=45。

這是教材自訂協定，不是通用 PLC 保證。只看到數值相同、收到另一筆 operation 回覆，或讀到 `staging` 區的值，都不能滿足它。`staging-only` 案例第一欄的回覆雖有目標值，實際生效區沒更新，故結果仍是 unknown，後面三欄不送。

改 `apply-demo.mjs` 的 outcomes 即可試驗：把第一個案例改成 `['wrong-operation','ok','ok','ok']`，應只送第一欄後停在 unknown。把 timeout 移到第四欄，會看到前三欄 confirmed、最後一欄 unknown，writes=4。每次執行都是新建合成設備；這不代表正式系統可以靠重啟清除未決命令。

## 交付到設備前還缺哪些證據

本例沒有命令查詢／人工解除 UNRESOLVED、持久化、崩潰恢復、並行操作員、真正權限驗證、設備能力探索或安全聯鎖。`setAccess()`、externalUpdate() 是注入條件；真實系統須從權威來源取得權限與設備狀態。校驗、完整 schema 與確認規則沿用前篇，沒有以 checksum 取代欄位檢查。

正式介接前，要用目標設備手冊確定生效區、版本定義、關聯方法、可否原子提交及中間狀態限制；不能把本例的 revision+1、stage ID 或四欄順序照抄成原廠 API。若協定不能證明這些條件，應調整結果聲明，保留未知與人工處理流程。

[OWASP 交易授權指引](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html)提供執行前再次檢查授權與限制狀態轉換的背景；並未保證設備寫入的原子性。命令紀錄請接[accepted 與 applied](/articles/operation-log-accepted-applied-equipment-revision)，執行中參數的生效邊界請接[PLC 工作參數快照](/articles/plc-parameter-snapshot)。
