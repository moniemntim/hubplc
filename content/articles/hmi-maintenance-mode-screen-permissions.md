---
title: HMI 維護模式案例：退出請求不等於測試停止或復原完成
description: 共用模式請求模型，重播進入Maintenance、等待測試停止、等待復原核對與確認回Manual；工作單與隔離證據另列。
date: 2026-09-17
author: 茂伯
draft: false
---

## 與手自動頁共用模式資料，工作紀錄另外保留

本篇沿用[手自動切換案例](/articles/hmi-manual-auto-mode-control-ownership)，專門驗證維護退出時不能省略的顯示與確認。教材是Node.js 24.19+同步記憶體模型，沒有實機、輸出、測試動作或能源隔離功能。

下載 [model.mjs](/examples/mode-ownership/model.mjs)、[mode-demo.mjs](/examples/mode-ownership/mode-demo.mjs)、[maintenance-demo.mjs](/examples/mode-ownership/maintenance-demo.mjs)、[practice.mjs](/examples/mode-ownership/practice.mjs)、[maintenance-practice.mjs](/examples/mode-ownership/maintenance-practice.mjs)、[self-test.mjs](/examples/mode-ownership/self-test.mjs)、[README.md](/examples/mode-ownership/README.md)，放在同一資料夾後執行：

```powershell
node maintenance-demo.mjs
node self-test.mjs
node maintenance-practice.mjs
```

## 固定流程：Maintenance確認後，兩項退出條件仍分開

本例先確認Manual、owner=HMI-A、revision=2，再由HMI-A提出ENTER。來源確認後為Maintenance、revision=3。維護模式仍由同一來源持有控制權，不另外開一條繞過模式入口的寫入路徑。

工作單WO-17另列兩個欄位：isolationEvidence=`not_verified_in_demo`、functionalTest=`not_executed`。這不是要讀者去執行隔離或功能測試，而是讓畫面保留「未驗證／未執行」；Maintenance字樣不能把缺少的證據變成通過。

```text
ENTER confirmed=Maintenance owner=HMI-A revision=3
workOrder=WO-17 isolation=not_verified_in_demo test=not_executed
EXIT pending=WAIT_TEST_STOPPED; confirmed=Maintenance
EXIT pending=WAIT_RESTORE_REVIEW; confirmed=Maintenance
EXIT confirmed=Manual revision=4; Auto not requested
maintenance demo: PASS
```

依序核對第三至五行：

| 來源摘要                                | EXIT結果                     | 畫面仍需表達的事                        |
| --------------------------------------- | ---------------------------- | --------------------------------------- |
| testStopped=false                       | PENDING／WAIT_TEST_STOPPED   | 模型尚未取得測試停止確認，仍Maintenance |
| testStopped=true，restoreReviewed=false | PENDING／WAIT_RESTORE_REVIEW | 停止已確認，但復原核對還沒完成          |
| 兩者true，其他模式條件合格              | CONFIRMED／Manual            | 已退出Maintenance，未提出Auto或生產啟動 |

`testStopped`與`restoreReviewed`都由可信來源快照提供，不是按一下頁面勾選就自行產生。本例不檢查真實測試或設定還原；現場必須由設備與程序產生相應證據。模型的條件名稱只表達介面契約，不是安全隔離證明。

## 改一次復原摘要，確認未完成不會被藏掉

開啟 `maintenance-practice.mjs`，預設 `restoreReviewed=false`。執行後查看輸出的modeConfirmed及pending：

- modeConfirmed應為Maintenance。
- pending.status應為PENDING，reason為WAIT_RESTORE_REVIEW。
- modeRevision仍是3。

改成 `restoreReviewed=true`再執行，預期modeConfirmed為Manual、pending為null、modeRevision=4。每次命令都重新建立模型；這個修改只是注入合成來源摘要，不是核准現場復原。

範例同時測試Maintenance直接要求Auto，應得到TRANSITION_DENIED；本教材只允許先退出到Manual。這是明示的專案假設，不是所有設備的必然規則。後續若要Auto，仍須另提新請求並確認流程起點，不能因一般頁重新出現就自動運轉。

## 異常時留在什麼狀態？

退出等待期間若資料Bad、過期或互鎖拒絕，請求會記錄拒絕原因；沒有成功的模式轉移。資料不可用時畫面顯示Unknown並保留lastRecordedMode供追查，不能把最後Maintenance字樣當成目前設備證明。達5秒等待期限時，本例由模擬來源明確回TIMEOUT；單純HMI失聯則不能自行假定設備收到取消。

取消只處理尚未確認的模式請求。EXIT已確認後再取消，回ALREADY_TERMINAL；這不是實體測試停止協定。本文沒有建立測試命令、解除隔離或重新送能的操作步驟。

角色能否提出請求由授權層另驗證，模式與條件由來源仲裁。需要驗證舊頁面或降權後的請求，可接著跑[共用授權案例](/articles/hmi-role-downgrade-open-screens)。兩個教材各驗證一層，不能因都能執行就宣稱已整合成完整控制系統。

完成這個練習後，應能保留三種不同證據：工作單上的未驗證項、模式請求的前後紀錄、來源的停止與復原摘要。不要用一個maintenance旗標代替全部資訊，也不要在切回一般頁時刪掉未完成的工作。
