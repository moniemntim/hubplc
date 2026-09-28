---
title: 工業資料保留預覽：到期、Hold 與未知分類的離線案例
description: 以七筆固定資料重跑30天到期預覽，分辨候選、未到期、暫停處置與人工補正；程式不刪資料，期限是教學自訂值。
date: 2026-09-28
author: 茂伯
draft: false
category: 資料記錄與報表
---

## 先做候選預覽，再談刪除

本課用七筆合成資料回答一個問題：以同一個基準時間檢查，哪些已到示例期限、哪些被 Hold 擋住、哪些資料不足而不能判定？程式只讀 JSON 並列印結果，沒有刪除、搬移、資料庫或網路功能。

**30 天是本課自訂的計算規則，不是法定期限或保留建議。**正式資料需要先有組織核定的分類、用途、起算點、期限與例外。這裡沒有判定任何組織適用的法律，也沒有驗證 Purview 或其他平台設定。

## 下載三個檔案，跑同一批資料

將以下三檔存到同一資料夾，保留副檔名：

- [preview.mjs：固定規則與判定函式](/examples/retention-preview/preview.mjs)
- [records.json：七筆輸入與固定基準時間](/examples/retention-preview/records.json)
- [run.mjs：讀取輸入並列出預覽](/examples/retention-preview/run.mjs)

安裝 Node.js 22 或以上後，在該資料夾開終端機執行：

```text
node run.mjs
```

第一次應得到 **2 筆 CANDIDATE、1 筆 KEEP、1 筆 HOLD、3 筆 REVIEW**。CANDIDATE 只表示符合本例的到期候選條件，還不是刪除核准；輸出中沒有 Deleted 狀態。

## 固定規則與欄位怎麼填

| 欄位／規則 | 本例設定 | 現場資料要從哪裡來 |
| --- | --- | --- |
| `asOf` | `2026-09-28T00:00:00Z` | 此次預覽的明確基準時間 |
| `dataClass` | 僅接受 `telemetry-demo` | 已核定的資料分類，不能靠檔名猜 |
| `policyId` | 僅接受 `DEMO-T30-v1` | 適用的政策版次，不自動改用最新版本 |
| `closedAt` | 批次結束時刻 | 來源系統的結束事件，不用複製檔案時間代替 |
| `holds` | 暫停處置的案件 ID 陣列 | 已核對的所有有效限制；未知不能填空陣列 |
| 到期計算 | `closedAt + 30 × 24 小時` | 本例固定720小時，非日曆月 |
| 到期比較 | `asOf >= expiresAt` | 到期瞬間算候選，等號不可漏掉 |

輸入時間只接受 `YYYY-MM-DDTHH:mm:ssZ`，也就是 UTC、整秒。沒有時區、缺少時間或不存在的日期，例如 2 月 30 日，都不能拿來算到期。若來源使用台灣時間，應先正確轉成 UTC；把字尾直接改成 Z 會把時刻改掉。

## 七筆資料逐項判讀

| ID | 結束時間（UTC） | 差異條件 | 輸出 | 原因 |
| --- | --- | --- | --- | --- |
| R01 | 08/28 00:00 | 已超過30天 | CANDIDATE | 09/27 00:00到期 |
| R02 | 08/29 00:00 | 剛好到期 | CANDIDATE | 09/28 00:00到期，等號成立 |
| R03 | 08/30 00:00 | 尚未到期 | KEEP | 09/29 00:00才到期 |
| R04 | 08/28 00:00 | 有兩個Hold | HOLD | 到期也不進候選 |
| R05 | 無 | 缺結束時間 | REVIEW | INVALID_CLOSED_AT |
| R06 | 08/28 00:00 | 分類未確認 | REVIEW | UNMATCHED_POLICY |
| R07 | 08/28 00:00 | 政策版次缺失 | REVIEW | UNMATCHED_POLICY |

年份均為2026。REVIEW 表示資料需補正，不是零天期限。程式先檢查 ID 與 Hold 資料；有任何有效 Hold 就回 HOLD，不繼續計算日期，所以此時 `expiresAt` 為 null。沒有 Hold 才檢查分類、政策與時間；`closedAt` 比 `asOf` 晚也列入 REVIEW。

## 改三次輸入，看條件是否真的有作用

先備份原始 records.json，再每次只改一項，儲存並執行 `node run.mjs`：

1. 將 asOf 改為 `2026-09-27T23:59:59Z`。R02 距到期還有1秒，必須變成 KEEP；不能因為日期已是同一天就算到期。
2. 恢復原始 asOf。從 R04 的 holds 刪掉第一個案件，但保留第二個，仍須是 HOLD。兩個都移除後，R04 才成 CANDIDATE，到期仍是09/27；本例不因解除 Hold 重新起算30天。
3. 將 R01 的 closedAt 改為 `2026-02-30T00:00:00Z`。結果必須是 REVIEW；不能把不存在的日期自動滾到3月再刪資料。

上述操作只改教學 JSON，沒有解除真實案件的 Hold。`holds: []` 的意思是「已確認沒有」，不是「我不知道有哪些」。把 holds 欄刪掉或改成 null，結果是 REVIEW。

## 把預覽交給負責人之前

保留原始輸入、基準時間、政策版次、預覽結果及程式版本；需要核准的人才有辦法重算同一組候選。調整期限、起算點或規則時另建版次，先比較新舊候選差異。

正式流程還要處理多項政策衝突、案件完整性、備份與複本、保存媒體、核准、刪除回執及失敗重試；本例沒有實作這些能力，因此不能把輸出直接接到刪除排程。也沒有通過檔案雜湊或備份還原來證明資料完整。

[Microsoft Purview 的保留規則文件](https://learn.microsoft.com/en-us/purview/retention) 可供理解保留與刪除設定可能同時作用；它描述的是 Microsoft 產品行為，不會替本例或工廠指定30天。套用某個資料平台時，另查該平台的起算點與限制處理，不要把此練習當成平台規格。

## 延伸閱讀

- [驗收紀錄：未測項與不適用的界線](/articles/acceptance-pass-untested-not-applicable)
- [測試報告：保存輸入、版本與重跑結果](/articles/automated-test-report-reproducibility)
