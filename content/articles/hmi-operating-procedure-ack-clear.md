---
title: HMI 警報操作程序：把每一步寫成可核對的結果
description: 用共用警報模型重播八步演練，逐項記錄Ack、來源Clear、角色拒絕、版本衝突與工作結案，附空白紀錄表。
date: 2026-09-17
author: 茂伯
draft: false
---

## 把程序與判定表一起下載

這篇是[警報工作流案例](/articles/hmi-alarm-ack-clear-reset-workflow)的逐步演練表，不另建一套警報規則。模型、欄位和限制共用，這裡集中練習「這一步有沒有完成，若沒有應停在哪裡」。

將 [alarm-lifecycle.mjs](/examples/alarm-lifecycle/alarm-lifecycle.mjs)、[fixtures.mjs](/examples/alarm-lifecycle/fixtures.mjs)、[procedure-demo.mjs](/examples/alarm-lifecycle/procedure-demo.mjs)、[workflow-practice.mjs](/examples/alarm-lifecycle/workflow-practice.mjs)與[procedure-record.csv](/examples/alarm-lifecycle/procedure-record.csv)存在同一資料夾。使用 Node.js 24.19.0 或更新版本：

```powershell
node procedure-demo.mjs
node workflow-practice.mjs
```

第一個程式逐步呼叫共用模型，檢查八筆結果；任一結果不符就拋出錯誤。第二個程式用來改角色與證據。這是記憶體中的合成來源，不連 HMI、PLC 或警報平台；Operator、Supervisor 是教材輸入，沒有真實登入或授權驗證。

## 八步程序與停留條件

程序代號 `SOP-DEMO-AL01/v1`，對象是單一 O1。t=1..8 是虛擬順序時間，不代表秒數、反應期限或設備穩定時間。

| 步驟 | 教材動作                            | 預期結果                                        | 這一步不能被解讀成什麼 |
| ---- | ----------------------------------- | ----------------------------------------------- | ---------------------- |
| P01  | 注入來源Active                      | active=true、acked=false、Open、revision1       | 還沒有人確認           |
| P02  | 對O1/revision1送Ack                 | active=true、acked=true、revision2              | Ack沒有清除來源        |
| P03  | Operator開始處置                    | InProgress、revision3                           | 工作開始不代表完成     |
| P04  | 尚Active時嘗試結案                  | workflow_rejected_transition，仍revision3       | 拒絕後不能填已完成     |
| P05  | 注入來源Clear                       | active=false、acked=true、InProgress、revision4 | Clear沒有替工作結案    |
| P06  | Operator嘗試結案                    | workflow_rejected_request，仍revision4          | 顯示按鈕不代表模型接受 |
| P07  | Supervisor帶舊revision3             | workflow_revision_conflict，仍revision4         | 不能把舊表單直接當最新 |
| P08  | Supervisor帶revision4及非空evidence | Resolved、revision5                             | 工作結案不是設備Reset  |

P04、P06、P07是故意的故障注入。示範腳本知道後續輸入，因此會繼續演練；正式操作程序遇到拒絕或來源不明，應先核對原因與新狀態，不可把腳本「繼續下一列」當現場處置命令。

程式最後應輸出：

```text
P08 decision=workflow_resolved active=false acked=true work=Resolved revision=5
procedure: PASS (8 checks; synthetic state only)
```

## 改一個條件，檢查是否真的停住

`workflow-practice.mjs` 預設的 `finalActor = 'Supervisor'` 與非空 evidence，輸出：

```text
decision=workflow_resolved work=Resolved revision=5 active=false acked=true
```

只把 `finalActor` 改成 `'Operator'` 再執行，應得到 `decision=workflow_rejected_request`、`work=InProgress`、`revision=4`。改回 Supervisor，再把 `evidence` 改成空字串，同樣拒絕；即使 active=false、acked=true，也不能缺少本例規定的結案證據。

紀錄表的 expected 欄已填，actual、notes 留給你填；八列 status 都是 `not_run`。執行後按終端輸出填入實際結果，保存程式版本與修改內容。本站驗證的是軟體模型的八步結果，不是這份空白表已經由現場人員填妥，也不是硬體驗收。

## 套到真實程序前還缺什麼

先指定真實資料來源、事件識別、來源品質、畫面版本與角色驗證方式。此模型只接收布林來源條件，沒有品質感測、穩定等待、工單通知或安全聯鎖；來源Unknown或Bad時不能直接注入false而聲稱Clear。需要這類邊界時先看[資料品質與舊值](/articles/hmi-bad-quality-stale-value)，不要把兩個離線模型當成已整合的設備系統。

確認框開啟後若已產生新一輪警報，要重新核對occurrenceId；舊O1的Ack不能代表新O2已確認。這個分支的可執行重播放在[警報發生紀錄案例](/articles/alarm-acknowledge-clear-occurrence)，本篇不重複整份生命週期教學。

八步結果只證明這個自訂契約中的狀態轉移。現場適用條件、人工責任、故障升級方式與設備復歸程序，仍必須由機台的核准文件明定。
