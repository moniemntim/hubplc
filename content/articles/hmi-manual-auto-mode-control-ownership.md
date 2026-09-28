---
title: HMI 手自動切換案例：請求、確認模式與控制權分開看
description: 下載固定模式狀態機，重播等待停止、回覆遺失、原ID查詢、控制權拒絕與返回Auto，核對5秒邊界及資料品質。
date: 2026-09-17
author: 茂伯
draft: false
---

## 開始前：本例沒有馬達或輸出點

本篇用 Node.js 24.19+ 執行同步的離線狀態機。它只有模式、控制權、請求紀錄與合成回饋，不連 PLC、不發運動命令，也沒有真正登入。HMI-A、HMI-B 是固定來源名稱，不能當成身份驗證。

下載以下七個檔案到同一資料夾：

- [model.mjs](/examples/mode-ownership/model.mjs)
- [mode-demo.mjs](/examples/mode-ownership/mode-demo.mjs)
- [maintenance-demo.mjs](/examples/mode-ownership/maintenance-demo.mjs)
- [practice.mjs](/examples/mode-ownership/practice.mjs)
- [maintenance-practice.mjs](/examples/mode-ownership/maintenance-practice.mjs)
- [self-test.mjs](/examples/mode-ownership/self-test.mjs)
- [README.md](/examples/mode-ownership/README.md)

在該資料夾開啟終端機，執行：

```powershell
node mode-demo.mjs
node self-test.mjs
node practice.mjs
```

## 第一輪：要求 Manual，為什麼畫面仍是 Auto？

起始 modeConfirmed=Auto、controlOwner=PLC、modeRevision=1。M17要求改為Manual，受理只建立PENDING；沒有立刻改確認模式或控制權。

| 虛擬時間ms | 來源條件／動作                                             | 預期                                |
| ---------- | ---------------------------------------------------------- | ----------------------------------- |
| 0          | HMI-A提出M17                                               | PENDING，確認模式仍Auto             |
| 1          | stopped=false                                              | WAIT_STOPPED，owner仍PLC            |
| 2          | stopped=true，autoIdle=false                               | WAIT_AUTO_IDLE，仍未轉移            |
| 3          | stopped、autoIdle、manualIdle、interlock均合格，Good新資料 | 確認Manual、owner=HMI-A、revision=2 |

`stopped`是來源提供的停止回饋，`autoIdle`是自動流程沒有待處理工作的摘要；兩者分開，避免「速度為零」被誤當「自動流程已交出控制權」。案例不生成停止命令，也沒有證明實際機械已停。

固定輸出如下：

```text
requested=Manual confirmed=Auto owner=PLC reason=WAIT_STOPPED
stopped=true; reason=WAIT_AUTO_IDLE
reply lost: screen=Unknown lastRead=Auto
lookup M17=CONFIRMED; fresh mode=Manual owner=HMI-A revision=2
return=Auto owner=PLC revision=3; no output command exists
mode demo: PASS
```

第三行刻意模擬回覆遺失：來源已切成Manual，接收端卻保留時間2的舊快照，因此顯示結果未知。重連步驟用M17查結果，再取得新的確認模式；不另建M18來「再切一次」。同一ID、相同內容重送回REPLAY，revision仍是2；同ID改target或client則回REQUEST_CONFLICT。

## 第二輪：返回 Auto 仍要重新確認條件

Manual時控制權屬於HMI-A。HMI-B帶正確revision請求Auto，仍得到NOT_OWNER；知道版本不代表持有控制權。這個檢查只是來源仲裁，服務端的人員授權仍須另做，可先看[操作權限案例](/articles/hmi-operation-permission-execution-authorization)。

HMI-A提出A18後，範例依序注入manualIdle=false、sequenceReady=false，分別停在WAIT_MANUAL_IDLE與WAIT_SEQUENCE_READY。只有完整條件合格才確認Auto、交還PLC、revision=3。它沒有「切Auto即開始生產」的輸出或啟動命令。

同時收到另一個新ID時回BUSY，該請求記為已拒絕，不會藏在背景等稍後執行。未完成請求可由原client取消，結果為CANCELLED_BEFORE_MODE_CHANGE；已確認的請求再取消回ALREADY_TERMINAL，不能倒推成設備已撤銷動作。

## 修改練習：4999ms和5000ms差在哪裡？

`practice.mjs`頂端只有兩個要改的參數：`completeAt`與`interlock`。每次執行都從Auto、revision=1開始，並在completeAt注入一筆當時取得的Good回饋。

| completeAt | interlock | 預期請求狀態／reason       | 最後記錄模式 |
| ---------- | --------- | -------------------------- | ------------ |
| 4999       | true      | CONFIRMED／CONDITIONS_MET  | Manual       |
| 5000       | true      | REJECTED／TIMEOUT          | Auto         |
| 4999       | false     | REJECTED／INTERLOCK_DENIED | Auto         |

輸出第一行是請求紀錄，第二行是當時畫面資料。找status、reason、modeConfirmed與controlOwner，比對上表。5秒是教材的等待期限，**等號包含，逾時優先於成功**。只有呼叫scan才推進判定；單純讀view不會偷偷完成切換或宣告逾時。

這裡的TIMEOUT是模擬控制器明確拒絕的結果。若只是HMI自己的等待時間到了、卻沒有來源結果，就應像回覆遺失案例一樣保持Unknown，不能自行推定拒絕或成功。

## 看懂輸入與證據限制

每次scan接收完整來源快照：取得時間、Good/Bad/Unknown、停止、自動待命、手動待命、互鎖、流程起點及維護摘要。時間必須是同一虛擬時鐘的非負安全整數，不能倒退；Good且資料年齡小於1000ms才視為可用，等於1000ms已過期。

Bad、Unknown或過期資料讓待處理請求被明確拒絕，畫面的modeConfirmed/controlOwner顯示Unknown，lastRecordedMode僅保留模型最後紀錄；它不是目前設備已確認的狀態。過期時不要拿灰色的舊模式當作操作許可。

模型最多保存16筆請求，包含被拒絕的項目；滿了拒絕新ID，原紀錄仍可查。紀錄包含請求內容、前後模式／owner／revision與結束時間。它沒有跨程序保存、PLC重啟恢復、真實通訊或安全功能；不能把這段Node程式直接接到輸出點。

維護的進入與退出使用同一模型，另見[維護模式案例](/articles/hmi-maintenance-mode-screen-permissions)，不再複製另一套模式判斷。
