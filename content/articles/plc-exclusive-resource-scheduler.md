---
title: PLC 共用資源排程：用 FCFS 保證一次只授權一站
description: 下載 Node 離線逐掃描模型，重現 A/B 同時請求、序號排隊、釋放空掃描、逾時故障鎖與安全復歸邊界。
date: 2026-09-17
author: 茂伯
draft: false
category: PLC 程式與控制
---

## 先定義本例的時間、序號與優先順序

這是 Node.js 24.19.0 的離線逐掃描教材。每次函式呼叫輸入一個單調、不倒退的安全整數 `nowMs`，沒有連接 PLC、安全控制器、HMI、共用模組或原廠模擬器。它只重現一個序列化的 JavaScript 狀態轉換，不能證明實際 task 同步、設備安全狀態或任何機種相容性。

A、B 各最多有一筆 pending。`requestA` 或 `requestB` 的上升沿才會建立 pending；保持為 1 不會再建第二筆。序號從 1 起遞增，上限 1000000，取消後也不重用。若 A、B 同一掃描一起上升，模型先替 A 配序號、再替 B 配序號，因此 A 是明示的同掃描決勝規則，不是程式排列的隱藏偏好。

FCFS 只比較有效 pending 的最小序號。request 從 1 變 0 不等於取消，pending 會保留；只有 `cancelA` 或 `cancelB` 才在仲裁前刪除它，所以取消的 pending 不會被授權。owner 的 cancel 不是 release：模型只記錄 `owner_A_cancel_requires_controlled_stop` 或 B 的同類事件，受控停止要另外設計；在有效 release 或 timeout 前，owner 的 enable 仍維持，不能用 cancel 直接交給另一站。

## 工作、釋放與逾時

授權後，state 有唯一的 `owner` 和 `ownerJobSeq`；只有它對應的 `{ owner, jobSeq }` release 才有效。成功 release 會清 owner，但**該掃描不再授權**，下一掃描才對剩餘 pending 仲裁。這讓監看表能清楚分開「釋放」與「下一站取得」。

每次 grant 設定 `deadlineMs = nowMs + maxHoldMs`。下一次或之後的掃描只要 `nowMs >= deadlineMs`，逾時優先於 release：進入 `FAULT_LOCK`、保留原 owner 與 jobSeq、撤銷 A/B enable，不能當成閒置資源授給 B。`maxHoldMs` 本例限定 1 到 60000。`nowMs` 可以到 `Number.MAX_SAFE_INTEGER`，讓已建立且等於此值的 deadline 仍可被觀察到 timeout；只有新 grant 會檢查加法空間，若 `nowMs + maxHoldMs` 超出安全整數，pending 保留並記錄 `clock_exhausted`，不建立回捲 deadline。

FAULT_LOCK 復歸必須是新的 `resetFault` 上升沿，並同時輸入 `moduleReady=true` 和 `safetyConfirmed=true`。有效復歸只清 retained owner 和 lock，該掃描不 grant；下一掃描才重新依 pending 的舊序號仲裁。reset 按住時，即使稍後才補齊條件，也不會補做，必須先放開再重新上升。

有限等待的說法有前提：沒有 FAULT_LOCK，且每個 owner 都在其聲明的有限上限內正常釋放時，FCFS 才能在目前 owner 與所有更早 pending 結束後服務一筆等待請求。故障、受控停止和實際安全確認期間沒有有限等待保證。

## 下載並執行完整固定案例

將以下五個檔案放在同一個資料夾，以 Node.js 24.19.0 或更新版執行。不需要 npm 套件、網路或設備連線。

- [排程模型](/examples/resource-scheduler/resource-scheduler-model.mjs)
- [固定輸入](/examples/resource-scheduler/fixtures.mjs)
- [self-test](/examples/resource-scheduler/self-test.mjs)
- [逐掃描 demo](/examples/resource-scheduler/demo.mjs)
- [README](/examples/resource-scheduler/README.md)

```powershell
node self-test.mjs
node demo.mjs
```

`demo.mjs` 的完整 14 列如下。`owner=A/1` 是 owner 和工作序號；`pendingB=2` 表示 B 仍排隊。最後一行是 `demo: PASS`。

```text
1 now=0 owner=A/1 pendingA=- pendingB=2 lock=false enable=A grant=A/1 event=granted_A_1
2 now=1 owner=A/1 pendingA=- pendingB=2 lock=false enable=A grant=- event=none
3 now=2 owner=- pendingA=- pendingB=2 lock=false enable=- grant=- event=released_A_1
4 now=3 owner=B/2 pendingA=- pendingB=- lock=false enable=B grant=B/2 event=granted_B_2
5 now=4 owner=B/2 pendingA=- pendingB=- lock=false enable=B grant=- event=owner_B_cancel_requires_controlled_stop
6 now=5 owner=- pendingA=- pendingB=- lock=false enable=- grant=- event=released_B_2
7 now=6 owner=- pendingA=- pendingB=- lock=false enable=- grant=- event=none
8 now=7 owner=A/3 pendingA=- pendingB=- lock=false enable=A grant=A/3 event=granted_A_3
9 now=17 owner=A/3 pendingA=- pendingB=4 lock=true enable=- grant=- event=timeout_A_3
10 now=18 owner=A/3 pendingA=- pendingB=4 lock=true enable=- grant=- event=fault_reset_conditions_not_met
11 now=19 owner=A/3 pendingA=- pendingB=4 lock=true enable=- grant=- event=none
12 now=20 owner=A/3 pendingA=- pendingB=4 lock=true enable=- grant=- event=none
13 now=21 owner=- pendingA=- pendingB=4 lock=false enable=- grant=- event=fault_reset_owner_cleared
14 now=22 owner=B/4 pendingA=- pendingB=- lock=false enable=B grant=B/4 event=granted_B_4
demo: PASS
```

第 3 掃描 A 成功釋放但 B 沒有同掃描取得；第 4 掃描才 grant B。第 9 掃描在 deadline 相等時仍是 timeout，即使有其他等待者也保留 A/3 並撤銷 enable。第 10 次 reset 缺 `moduleReady`；第 11 次雖補齊但 reset 持續為 1，不重試；第 13 次的新邊緣才復歸，B 到第 14 次才取得。

每掃描的 `event` 是供 demo 顯示的最後事件；模型同時提供按發生順序排列的 `events` 陣列，避免一掃描內的較早拒絕被後面的 grant 遺失。例如 A 用最後可用序號而得到 grant、B 同掃描被序號上限拒絕時，`events` 同時保留兩筆。

## 移植到實機前仍未驗證的事

這個模型沒有實作安全迴路、急停、模組關機、受控停止、實際完成訊號、斷電保持、重啟恢復、跨 task 資料競爭或時鐘來源。`moduleReady` 和 `safetyConfirmed` 都是明確模型輸入，不是程式自行量測出的安全證據。實機移植前，應把 request／ack、owner、jobSeq、release、timeout、FAULT_LOCK 和復歸條件放進目標 CPU、通訊和安全設計的驗收紀錄；不可用本例 PASS 當成 PLC 或安全系統的驗證。

## 延伸閱讀

- [PLC 工作參數快照：確認後，下一批才換新版本](/articles/plc-parameter-snapshot)
- [PLC 故障復歸：長按只接受一次的離線練習](/articles/plc-fault-reset-single-acceptance)
