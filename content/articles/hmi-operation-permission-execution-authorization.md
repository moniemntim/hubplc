---
title: HMI 操作權限案例：同一筆 95°C 設定，誰可以提交？
description: 下載離線授權案例，比對四種角色、設備範圍、數值上限、設定版本與工作階段到期，核對排隊、套用和讀回的差別。
date: 2026-09-17
author: 茂伯
draft: false
---

## 先跑同一入口的允許與拒絕案例

本篇用 Node.js 24.19+ 的記憶體模型，讓四種角色提交相同的設定值，再核對結果與寫入次數。沒有網路、登入驗證或 PLC 連線；`S` 等工作階段代碼都是固定測試資料，不能作為正式授權系統。

下載 [model.mjs](/examples/authorization/model.mjs)、[matrix-demo.mjs](/examples/authorization/matrix-demo.mjs)、[downgrade-demo.mjs](/examples/authorization/downgrade-demo.mjs)、[practice.mjs](/examples/authorization/practice.mjs)、[downgrade-practice.mjs](/examples/authorization/downgrade-practice.mjs)、[self-test.mjs](/examples/authorization/self-test.mjs)、[README.md](/examples/authorization/README.md)，放在同一資料夾。開啟該資料夾的終端機：

```powershell
node matrix-demo.mjs
node self-test.mjs
node practice.mjs
```

## 固定規則：角色不能取代數值與設備檢查

設備 A 的配方上限起始為 80°C、revision=1。教材只接受 60～100 的整數，兩端都包含；每次真正套用增加 revision 和 writes。這是虛構參數，與現場製程限值無關。

| 測試代碼 | 角色                                 | 可讀 A | 可直接提交 A 的上限      |
| -------- | ------------------------------------ | ------ | ------------------------ |
| V        | Viewer                               | 是     | 否                       |
| O        | Operator                             | 是     | 否                       |
| S、T     | 同一使用者的兩個 Supervisor 工作階段 | 是     | 是，仍須通過其他條件     |
| M        | Maintenance                          | 是     | 否，本例未授予配方寫入權 |

所有角色都沒有設備 B 的權限。本例沒有「高角色就能做一切」的繼承規則，也沒有實作申請與主管核准流程；Operator 被拒絕後，需要走專案另訂的申請程序。

矩陣案例的預期輸出：

```text
V submit95=ROLE_DENIED writes=0
O submit95=ROLE_DENIED writes=0
M submit95=ROLE_DENIED writes=0
S submit95=QUEUED writes=0
Supervisor150=RANGE_DENIED; resourceB=RESOURCE_DENIED
readback value=95 revision=2 writes=1
oldRevision=REVISION_CONFLICT; expiry=SESSION_EXPIRED_OR_UNKNOWN
matrix: PASS
```

前四列各從新的模型開始，避免前一列的操作影響下一列。`QUEUED` 只表示受理排隊，寫入次數仍為 0。後面的獨立模型在執行後才變成 value=95、revision=2、writes=1；不能把「送出」直接顯示成「已套用」。

Supervisor 提交150仍被範圍檢查拒絕；改用設備B被資源範圍檢查拒絕。設定已改為revision=2之後，仍帶舊revision=1的請求得到 `REVISION_CONFLICT`。工作階段有效期限為虛擬時間600000ms，在等於期限時就拒絕；這是絕對期限，讀取不會延長它。

## 改四個參數，逐項驗證

開啟 `practice.mjs`，修改頂端 `session`、`value`、`target`、`at`。每次執行都建立新模型，因此沒有跨次保留設定。

| session / value / target / at | 第一行 submit              | 第二行 execute    | 最後設備值／writes |
| ----------------------------- | -------------------------- | ----------------- | ------------------ |
| O / 95 / A / 0                | ROLE_DENIED                | UNKNOWN_OPERATION | 80／0              |
| S / 95 / A / 0                | QUEUED                     | APPLIED           | 95／1              |
| S / 150 / A / 0               | RANGE_DENIED               | UNKNOWN_OPERATION | 80／0              |
| S / 95 / B / 0                | RESOURCE_DENIED            | UNKNOWN_OPERATION | 80／0              |
| S / 95 / A / 600000           | SESSION_EXPIRED_OR_UNKNOWN | UNKNOWN_OPERATION | 80／0              |

第二行刻意讓派送器查同一個操作 ID：若第一步拒絕，根本沒有排隊紀錄，所以不是執行失敗，而是 `UNKNOWN_OPERATION`。檢查最後一行的 writes，應只有合法的95案例加一。

這個入口只收 operationId、target、value、expectedRevision。額外塞入前端自稱的 role 欄位會被當成不合法請求；目前角色從模型內的政策表查詢。正式服務仍須先驗證呼叫者身分，不能讓使用者自行選擇本文的 `S` 工作階段代碼。

## 受理與執行各查一次

提交時檢查目前工作階段、設備範圍、角色、數值、設定版本與設備可寫狀態。派送時再查工作階段與授權版本、設定版本及設備可寫狀態。中途降權、工作階段到期、政策服務不可用或設定已被別人改過，都不會沿用排隊當時的許可。

同一ID、相同內容、相同工作階段的重送回 `REPLAY`，不新增操作；相同ID換內容回 `OPERATION_CONFLICT`。已終結的操作再次派送回 `ALREADY_TERMINAL`，不再增加寫入。模型最多16筆操作、64筆稽核，滿了就拒絕，不丟棄舊紀錄後繼續寫入。

OWASP 建議預設拒絕，並在每次請求驗證授權。本例把這兩項原則做成固定決策測試；它沒有實作憑證、工作階段建立、傳輸加密、正式稽核儲存或分散式交易。[OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

要重播「頁面已開著才被降權」與佇列取消，接著執行[權限降級案例](/articles/hmi-role-downgrade-open-screens)。兩篇共用同一個模型，避免一篇允許的路徑在另一篇使用不同規則。設備的模式、互鎖與實際讀回仍須另外驗證；本文的 value 是記憶體值，不是現場量測。
