---
title: 在本機注入 HTTP 回覆延遲，量測 200 ms 逾時與兩次重試
description: 用只讀 loopback HTTP 實驗記錄實際逾時，再用虛擬時間線核對 199／200／201 ms 邊界、三次嘗試與總期限。
date: 2026-09-21
author: 茂伯
draft: false
category: 維護與故障排查
---

## 這次真的延遲哪一段

本例開一個只聽 `127.0.0.1`、由作業系統分配連接埠的臨時 HTTP server。它收到 GET 後，刻意等 20 或 300 ms 才產生固定資料 `{"value":42}`；client 每次設定 200 ms 期限，逾時後隔 50 ms 再試，最多三次。

這是**已執行的本機應用層延遲實驗**，不是網卡封包延遲、TCP 重傳、RS485 時序或 PLC 實測。程式不改網路設定、不連外部服務，也沒有寫入設備的命令。

另外提供**虛擬時間模型**精確比較 199／200／201 ms。兩者分開：虛擬模型用給定數字判定，HTTP 實驗用當次實際經過時間觀察，不能用其中一個取代另一個。

## 先跑本機 HTTP 實驗

使用 Node.js 24.19.0 或更新版本。下載 [local-demo.mjs](/examples/latency-retry/local-demo.mjs)，在下載資料夾執行：

```powershell
node local-demo.mjs
```

單檔不需安裝 npm 套件。它依序做以下事情，結束時關閉 server 與連線：

1. GET `/baseline`：server 延後 20 ms 回覆，預期取得 value=42。
2. GET `/delayed`：server 延後 300 ms，但 client 的本次期限只有 200 ms。
3. 每次 timeout 後等至少約 50 ms 才再試；首次加兩次重試，共三次。
4. client 結束後，等 server 已接受的處理都完成，列印接收與完成計數。

三次 timeout 不是整批成功。最後的 PASS 只表示這組實驗得到預期的「基準成功、三次逾時、server 仍完成處理」；不代表通訊已恢復。

## 怎麼閱讀實際輸出

2026-09-28 在 Windows、Node v24.19.0 執行的[完整觀察紀錄](/examples/latency-retry/observed-windows-node24.txt)摘要如下；每次重跑會不同：

| 項目 | 實際紀錄 |
| --- | --- |
| baseline | completed，28.02 ms |
| 第 1 次延遲請求 | sentAtMs=0；timeout，202.51 ms |
| 第 2 次延遲請求 | sentAtMs=264.71；timeout，205.85 ms |
| 第 3 次延遲請求 | sentAtMs=532.69；timeout，204.08 ms |
| client 結束 | clientEndedAtMs=736.96 ms |
| serverAfterDrain | baseline received/completed=1/1；delayed=3/3 |

`sentAtMs` 從延遲案例起點計算；每列 `elapsedMs` 是該次嘗試本身的時間。`clientEndedAtMs` 不包含最後等待 server 完成的時間。小數顯示至 0.01 ms 只是輸出格式，不是宣稱計時準確度達到 0.01 ms。

理論上 `3×200 + 2×50 = 700 ms`；實測 736.96 ms 多了排程、連線及程式處理耗時。Node 的計時器不保證精確在指定毫秒呼叫，不能把 700 ms 當成這個腳本的硬即時上限。[Node.js Timers 文件](https://nodejs.org/docs/latest-v24.x/api/timers.html)

client timeout 時會銷毀本次 HTTP request，但範例 server 故意繼續完成已接收的應用工作。因此 delayed completed=3 清楚展示：**停止等待不等於對端停止處理**。這裡只有讀取固定值；若換成投料、累加或啟動命令，不能照抄自動重送，請先處理[業務識別與冪等邊界](/articles/idempotency-key-duplicate-write)。

## 再用虛擬模型核對邊界

下載 [timeline.mjs](/examples/latency-retry/timeline.mjs) 與 [virtual-demo.mjs](/examples/latency-retry/virtual-demo.mjs)，放在同一資料夾執行：

```powershell
node virtual-demo.mjs
```

教材契約固定每次 200 ms、兩次間隔 50 ms；回覆處理時刻必須**嚴格早於**本次 deadline 才成功，剛好相等由 timeout 優先。這是明確選定的程式規則，不是宣稱所有通訊函式庫的競爭處理相同。

| case | 輸入 | 預期結果 |
| --- | --- | --- |
| reply-199 | 只允許 1 次，199 ms 回覆 | completed，199 ms 結束 |
| reply-200 | 只允許 1 次，200 ms 回覆 | timeout，attempts-exhausted |
| reply-201 | 只允許 1 次，201 ms 回覆 | timeout，200 ms 已結束等待 |
| three-timeouts | 每次延後 300 ms，總期限 1000 ms | 0／250／500 ms 送出；700 ms attempts-exhausted |
| total-500 | 相同延遲，總期限 500 ms | 只送 0、250 ms 兩次；500 ms total-timeout，不送第三次 |
| total-400 | 相同延遲，總期限 400 ms | 第二次 deadline 被縮至 400 ms，在等待中停止 |

每一列都印出 attempts，包含 sentAtMs、deadlineMs、responseAtMs、endedAtMs。`responseAtMs` 是預先給定的合成回覆時刻，即使比結束時間晚也保留供對照，不會因此把結果改回成功。`null` 延遲代表本案例沒有回覆。

總期限包含嘗試間的 50 ms 等待；若在退避期間到期，就不再送下一次。本機 HTTP 腳本則只實作三次嘗試，**沒有額外 400／500 ms 上位總期限**。不要把虛擬模型的這項功能當成 HTTP 腳本已測過。

## 輸出不符合時怎麼查

若 baseline 都 timeout，先保存輸出與主機負載，確認本機排程是否已延誤；不能宣稱 20 ms 的 server 設定等於實際交易只需 20 ms。若出現連線 error，腳本停止該輪重試並回報，錯誤不會假裝成正常 timeout。

若 serverAfterDrain 少於預期，查看程序是否被中斷、連線是否尚未送達。client 嘗試一次不保證 server 必然接收一次，本例會以實際計數斷言檢查，不僅列出預填數字。

跨請求的晚到 callback 如何避免誤配，另看[連線世代與晚到回覆](/articles/sequence-reuse-late-response)。本篇沒有實作網路重連、寫入去重或網卡故障注入；完成這兩個指令，也還不能證明正式網路的延遲或設備反應。
