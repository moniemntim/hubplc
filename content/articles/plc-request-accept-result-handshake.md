---
title: 請求 接受 完成與失敗 如何設計 PLC 模組間握手
description: 以離線可執行的接收端模型，逐次觀察 Req、Accept、Busy、Done、Fail 與 ResultAck 的實際掃描順序。
date: 2026-09-17
author: 茂伯
draft: false
---

## 先固定這個自訂握手契約

本文把 Sender 和 Receiver 視為兩個在不同掃描中交換資料的模組。Sender 發布 `Req`、遞增的 `RequestId` 與工作資料；Receiver 才能寫 `Accept`、`Busy`、`Done`、`Fail` 和結果 ID。這是本站的教學協議，不是任何 PLC、通訊模組或廠牌內建旗標。

Receiver 一次只保有一筆工作。它看到已重新武裝的 `Req=1` 時，複製資料快照並接受；`Accept` 保持到**後一次** Sender 快照把 `Req` 釋放。之後 Receiver 只讀自己的快照，畫面或 Sender 再改資料也不能覆寫目前工作。完成時 `Done=1, Fail=0`；失敗時 `Done=0, Fail=1`。兩種結果都帶同一筆 `ResultId`，並一直保持到後一次送達的相同 `ResultAckId`。

| 信號 | 寫入者 | 保持規則 | 收件者要核對 |
| --- | --- | --- | --- |
| `Req`、`RequestId`、資料 | Sender | 到觀察到 `Accept` 後才釋放 | Receiver 在已武裝時接受 |
| `Accept`、`AcceptId` | Receiver | 到後一次 `Req=0` | Sender 核對 ID 後才清 Req |
| `Busy` | Receiver | 只在工作尚未結束的 BUSY 狀態 | RESULT 時為 0，但新 ID 仍被拒絕 |
| `Done` 或 `Fail`、`ResultId` | Receiver | 到相同 `ResultAckId` | Sender 先保存結果再 Ack |
| `ResultAckId` | Sender | 在 Receiver 已觀察 `Req=0` 後送達一個掃描快照 | Receiver 只接受相同 ResultId 且 Accept 已釋放 |
| `RejectId`、`RejectReason` | Receiver | 到衝突的 `Req=0` | Sender 確認拒絕的是自己的 ID |

驗證狀態：以下檔案是純 JavaScript 離線教學模型，沒有連接 PLC、I/O、通訊、實體輸出或安全回路，也沒有宣稱 PLC runtime 或硬體已執行。

## 用前一掃描的輸出決定下一次呼叫

不要用任意命名的「S2、S3」表假設同一掃描內雙方互相看見新輸出。範例的每次 `receiverScan()` 都只讀取**這次傳入的 Sender 快照**，結束後才回傳 Receiver 訊號。因此呼叫次序是：

1. Sender 在自己的掃描末端發布 `Req=1, RequestId=17` 和資料。
2. Receiver 下一次呼叫讀到這個快照，複製資料並輸出 `Accept=1, Busy=1`。
3. Sender 的下一次掃描才看得到 `Accept=17`，然後發布新的快照 `Req=0`。
4. Receiver 讀到 `Req=0` 才撤下 `Accept`；工作尚未結束時保持 `Busy`，已結束時則保持 Done/Fail 和已複製的資料。
5. Receiver 成功或失敗後仍可能保持 `Accept`，但 `Busy` 已是 0；Sender 在後一次掃描先保存結果、釋放 Req，再於後續快照發布相同的 `ResultAckId`；Receiver 才清到 IDLE。

這個順序也說明為什麼 `Accept` 與結果要保持到交接完成。慢一個週期的消費端仍能讀到訊號，也能以 ID 排除前一件工作的晚到回覆；Ack 的遞送條件另見下方。

## 下載同目錄範例並執行七條時間線

範例只需要 [Node.js 22.13.0 或更新版本](https://nodejs.org/en/download)。將 [模型](/examples/plc-handshake/handshake-model.mjs)、[fixture](/examples/plc-handshake/fixtures.mjs)、[輸出程式](/examples/plc-handshake/demo.mjs) 與 [說明](/examples/plc-handshake/README.md) 下載到同一個資料夾後，在該資料夾執行：

```powershell
node demo.mjs
```

每條 fixture 都從新的 `initialReceiver()` 開始，沒有共享狀態。輸出的每一列就是一次 Receiver 呼叫，`snapshot` 是已接受後 Receiver 實際使用的資料，`events` 是該次掃描的診斷。

每次呼叫的 `nowMs` 必須是不可倒退的非負安全整數。省略的 Sender 欄位為 `req=false`、`requestId=null`、`resultAckId=null`、`payload=null`；省略的 worker 欄位為 `complete=false`、`failCode=null`。所以 fixture 某一列未明寫 `Req=1` 就是 Req 已釋放，不是沿用上一列的高位；要模擬保持必須在每一列重複明寫相同 Req、ID 與資料。

| fixture | 可觀察的呼叫順序 | 應驗證的結果 |
| --- | --- | --- |
| `normalDelayedConsumer` | 17 接受、下一次才釋放 Req、工作成功、消費端多等一次、再 Ack | `Accept` 先保持再撤下；`Done` 在延後消費期間不消失 |
| `wrongAck` | 17 完成後先送 `ResultAckId=18`，再送 17 | 錯 Ack 留下 `Done` 與結果；只有 17 清除 |
| `busyNewId` | 17 工作中發布 18 並保持，釋放後完成 17，最後發布 19 | 這是刻意故障注入；18 的拒絕會保持到 18 釋放，17 的資料快照不變，19 才接受 |
| `sameIdHold` | 17 一直保持、完成並 Ack，釋放後重送 17 | 保持高位不重複接受；範例中更改 held payload 是故障注入，舊 ID 是 `STALE_REQUEST_ID` |
| `timeoutWinsSuccess` | 17 的 200 ms 到期與 worker 成功在同一 Receiver 呼叫到達 | 固定為 `Fail/TIMEOUT`，不是 `Done`；錯 Ack 也不能清掉它 |
| `earlyCompleteSlowSender` | Worker 在 Sender 釋放 Req 前完成，接著錯誤地送 Ack | `Accept` 和 `Done` 都保持；釋放 Req 後才可 Ack |
| `timeoutReqHeld` | Req 仍高時到達 200 ms deadline | `Accept` 與 `Fail/TIMEOUT` 同時保持，且 `Busy=0` |

正常 Sender 不會在已保持的 Req 中途把 ID 改成 18；`busyNewId` 是為了驗證 Receiver 面對違規輸入時仍保護原工作。`RejectId` 與 `RejectReason=BUSY` 不是可信的一掃描跨任務脈衝：範例讓它們保持到衝突的 `Req` 被觀察為 0，讓 Sender 有機會核對並停止該筆錯誤請求。

## Busy、結果等待與重新武裝的邊界

當 Receiver 已是 `Busy`，新 ID 不會排隊，也不能改寫 `current.payload`。範例只在衝突 Req 首次斷言時建立一次拒絕記錄；同一 ID 持續為高不會重複建立事件，但 `RejectId`／`RejectReason` 仍保持可讀。Sender 必須先讓 `Req=0`，Receiver 才重新武裝，然後以比已接受 ID 大的 ID 再送一次。這同時處理「Req 一直高」與「結果剛清掉就誤把舊電平當新工作」兩種錯誤。

結果狀態也拒絕新 Req。即使 Sender 在同一 Receiver 呼叫送入新 Req 和正確 `ResultAckId`，該 Req 仍屬於結果尚待確認時看見的要求，會被拒絕；應先釋放 Req，再於後續掃描發布新的遞增 ID。若相同 ResultAck 在 `Req=1` 時先到，Receiver 也保持目前工作和 `Accept`，直到先觀察到 `Req=0`。這是避免舊結果和新資料在同一次狀態轉換互相覆蓋的明確成本。

本文的離線呼叫中，Receiver 在一個後續快照讀到 `Req=0` 後，再讀到帶 ResultAck 的快照即可。這不是宣稱跨任務、遠端 I/O 或通訊封包可以可靠地脈衝一次；實際工程必須為 ResultAck 定義保持、重送或可證明的遞送方式，確保 Receiver 的任務真的取樣到它。

本文的結果期限固定為 **200 ms**，且 Busy 時優先順序為 `timeout > worker failure > worker success`。所以在接受後剛好 200 ms 的同一 Receiver 呼叫，縱使 worker 同時報成功，也固定形成 `Fail/TIMEOUT`。這與[異常情境矩陣](/articles/plc-simulation-abnormal-scenario-matrix)的 300 ms、Request 上升緣、Cancel/Reset 協議不同，兩者不能直接共用訊號或測試結論。

## 現場轉用前要另外定義的項目

這個模型沒有處理多任務排程、I/O 刷新時間、通訊重送、斷電保持、ID 回捲、重啟世代、佇列或安全功能。實際工程至少要補上：哪個任務產生與取樣訊號、每個旗標的裝置位址與保持設定、deadline 的真實時間來源、重啟後如何區分舊結果，以及 Busy 拒絕後 Sender 要記錄、告警或人工重送的處置。

驗收時逐掃描記錄 `Req`、`RequestId`、`AcceptId`、`Busy`、`Done`、`Fail`、`ResultId`、`ResultAckId`、`RejectId`、`RejectReason` 與接受後的資料快照。只有看到成功時 `Done=1, Fail=0`，或失敗時 `Done=0, Fail=1`，並且 ResultId 和 Ack 都相同，才算本次交接閉合。離線測試通過不等於 PLC 程式、設備功能或安全驗收通過。

## 延伸閱讀

- [PLC 異常情境矩陣 以 RequestId 重現逾時 取消與晚到回饋](/articles/plc-simulation-abnormal-scenario-matrix)
- [用狀態機寫 PLC 順序控制 從三個步驟開始](/articles/plc-state-machine-three-step-sequence)
- [流程卡在某一步 怎麼設計等待上限與故障復歸](/articles/plc-step-timeout-recovery)
