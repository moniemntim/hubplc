---
title: 通訊佇列積壓：用七個時間戳分開排隊、接收與解析
description: 下載合成同時鐘資料，逐筆計算排隊、worker 前置、首位元組等待、接收、解析與完成尾段，拒絕缺欄、跨時鐘或倒退的紀錄。
date: 2026-09-21
author: 茂伯
draft: false
category: 工業通訊與網路
---

## 先把總時間拆開，才知道哪一段值得查

`complete - enqueue` 變長只代表整筆工作花久，不能直接寫成設備慢。本篇要求每筆紀錄都在同一單調時鐘下保留：`enqueue`、`dequeue`、`send`、`first_byte`、`last_byte`、`parse_done`、`complete`。它們各自代表進佇列、worker 取出、請求交給本地傳輸層、收到首位元組、收齊最後位元組、解析完成和最後完成點。

相鄰時間戳給出六段延遲：

| 計算                     | 名稱              | 能提出的候選方向               |
| ------------------------ | ----------------- | ------------------------------ |
| `dequeue - enqueue`      | queue             | 佇列中等待                     |
| `send - dequeue`         | worker_pre        | worker 前置、鎖或本地準備      |
| `first_byte - send`      | first_byte_wait   | 網路加上設備收到首回應前的時間 |
| `last_byte - first_byte` | remaining_receive | 首位元組後尚未收齊的時間       |
| `parse_done - last_byte` | parse             | 完整資料已到本地後的解析時間   |
| `complete - parse_done`  | persist_tail      | 解析後的保存、回呼或完成尾段   |

六段相加必須等於 `complete - enqueue`。若最大值相同，程式依表格順序取第一個，並不代表它比其他並列段落更嚴重。最大的段落只是**候選瓶頸**，不證明設備、網路、worker 或 parser 已故障。尤其 `first_byte_wait` 同時涵蓋網路與設備端等待；只知道 `complete - first_byte`，卻沒有 `last_byte`，不能推算 parse 時間。

佇列容量、到達率和服務率的規格與可重現 FIFO 算法，請接著看[PLC 任務超時：工作編號、FIFO 積壓與重入證據](/articles/plc-task-timeout-reentry-backlog)。本篇不重複設計容量或拒絕政策，只檢查一筆已接受工作在各段花了多久。

## 下載後重播四筆合成紀錄

下載同一資料夾的 [模型](/examples/queue-diagnosis/queue-diagnosis-model.mjs)、[固定輸入](/examples/queue-diagnosis/fixture.json)、[輸出程式](/examples/queue-diagnosis/run.mjs)、[獨立測試](/examples/queue-diagnosis/self-test.mjs) 和 [說明](/examples/queue-diagnosis/README.md)。本機以 Node.js 24.19.0 核對，請使用此版或更新版，不需 npm 套件，也不連 PLC、socket 或資料庫。

```powershell
node run.mjs
node --test self-test.mjs
```

資料集明確標為 `synthetic`。JSON 使用 `requestId`、`deviceId`、`workerId`，端點欄位是 `firstByte`、`lastByte`、`parseDone`；表格與輸出中的底線名稱對應同一量測點。每個端點都有整數毫秒 `ms` 與 `clockId`，模型只接受七個端點全數存在、clockId 全相同且時間不倒退的列；因此它不會把不同主機的牆上時鐘或缺欄資料硬算成延遲。輸出同時列出已接受的逐段時間、總和檢查、最大段落候選，以及拒絕原因。

| request_id | queue | worker_pre | first_byte_wait | remaining_receive | parse | persist_tail | total | 最大段落候選         |
| ---------- | ----: | ---------: | --------------: | ----------------: | ----: | -----------: | ----: | -------------------- |
| 781        |   800 |         10 |             200 |                10 |     5 |            5 |  1030 | queue 800            |
| 782        |    10 |         10 |            5000 |                10 |    10 |           10 |  5050 | first_byte_wait 5000 |
| 783        |     5 |          5 |              10 |                10 |  2000 |           10 |  2040 | parse 2000           |
| 784        |     5 |       2000 |              10 |                10 |     5 |            5 |  2035 | worker_pre 2000      |

781 的固定端點是 `100000 → 100800 → 100810 → 101010 → 101020 → 101025 → 101030 ms`，所以可直接手算出 800、10、200、10、5、5，總計 1030。782 的 5000 ms 是首位元組等待，不是已證明的設備故障；783 因為 `last_byte=300030` 已知，才可把其後 2000 ms 明確列為 parse；784 則把候選留在 worker 前置段。

## 拒絕紀錄本身是診斷結果

範例另附三筆不計算的合成列：`invalid-missing` 少了 `complete`、`invalid-clock` 的 `send` 使用另一個 clockId、`invalid-backward` 的 send 早於 dequeue。這些結果不是零延遲，也不是設備回覆慢，而是無法建立合法分段的證據。

現場應讓每一端點由同一個本地單調時鐘記錄，或清楚保留 clock domain 與同步誤差。若 send、首位元組和最後位元組來自不同程式或不同主機，先修正量測邊界；不能按相近牆上時間排序後宣稱是某一段變慢。記錄也應包含 `request_id`、`device_id` 和 `worker_id`，以便在相同量測條件下比對某台設備或某個 worker 的候選段落。

## 用候選段落安排下一筆證據

| 最大段落          | 下一步要補的證據                             | 目前不能下的結論           |
| ----------------- | -------------------------------------------- | -------------------------- |
| queue             | 到達、取出、worker 可用數與已接受／拒絕記錄  | 已知設備慢                 |
| worker_pre        | 鎖等待、執行緒排程或 send 前本地工作         | 已知網路慢                 |
| first_byte_wait   | 同一 request_id 的傳輸與設備端接收／處理紀錄 | 已知是設備或網路其中一方   |
| remaining_receive | 收到首位元組後的傳輸進度與資料大小           | 已知 parser 慢             |
| parse             | last_byte、解析輸入大小、解析步驟與完成紀錄  | 已知 CPU 使用率或 PLC 負載 |
| persist_tail      | 保存／回呼的開始與完成、下游狀態             | 已知資料庫故障             |

不要從這四筆合成數字挑一個全域百分位數當成正式門檻或實機量測。先把同版本、同輸入、同 clock domain 的真實紀錄分開保存，再決定要量哪一段的分布與邊界。這份工具只做離線整數相減，不量測真實 CPU、網路、PLC 或設備。

## 延伸閱讀

- [PLC 任務超時：用工作編號分開輪詢、FIFO 積壓與重入證據](/articles/plc-task-timeout-reentry-backlog)
- [非同步亂序回覆如何用待回覆表配對](/articles/async-out-of-order-pending-map)
