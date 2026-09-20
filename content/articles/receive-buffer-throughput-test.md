---
title: 接收buffer不足如何做流量測試
description: 以socket、framing與application queue分層，計算100KB/s輸入、80KB/s消費10秒堆積約200KB並設計overflow與背壓測試。
date: 2026-09-21
author: 站長
draft: false
category: 工業通訊與網路
---

## 一 分開三種緩衝與測試單位

接收資料變慢時，先分清 OS socket receive buffer、應用 framing buffer 與待處理 queue。socket buffer 是核心暫存區，應用 framing buffer 用來保留尚未組成完整 frame 的 bytes，queue 保存已組成但尚未消費的工作。把三者混成一個「buffer 大小」會找錯瓶頸，也無法知道記憶體由誰使用。

速率要同時用 bytes/s 與 frame/s 表示。假設每 frame 100 bytes，輸入 100 KB/s 約等於每秒 1000 frames；若 consumer 80 KB/s，10 秒輸入 1000 KB、消費 800 KB，理想 steady 估算堆積 200 KB。這是十進位 KB 與無額外封包負擔的容量示例，實測要另加 framing、header、對齊與 burst。

max_frame 必須先定義，例如 4096 bytes；queue_capacity 以 bytes、frames 或工作數明確表示。若一個工作包含 20 個小 frame，單看 frame 數會低估工作物件與索引記憶體。socket buffer 變大也不會提高 consumer 的實際處理率，只會延後 backpressure 或 overflow 的時間。

| 層次 | 保存內容 | 測試指標 | 常見誤判 |
| --- | --- | --- | --- |
| socket buffer | 核心收到的bytes | 讀取/阻塞 | 當成應用queue |
| framing buffer | 未完成frame | buffer bytes/cursor | 當成遺失 |
| application queue | 已組frame/工作 | depth/oldest age | 只看socket bytes |
| consumer | 解析/處理結果 | bytes/s、frame/s | 忽略burst |
| memory limit | 上述總和 | peak/limit | 只調大buffer |

應用 framing buffer 的 occupancy 要以 byte 和 frame count 同時記錄，因為一個大 frame 可能占滿容量但只增加一個 frame。若 queue 以工作物件保存，還要估算每個物件的固定 overhead；200 KB payload 不等於只需 200 KB RAM。

socket buffer 的 OS 預設值與可調上限需在測試機讀取並記錄，不能從應用 queue 容量推測。調整前後都要做相同測試，並確認調大核心 buffer 沒有讓整機記憶體壓力或其他連線退化。

## 二 用 100 KB/s 與 80 KB/s 建立基準

先做沒有 burst 的基準測試：producer 固定 100 KB/s、consumer 固定 80 KB/s、持續 10 秒、初始 queue=0，理想應看到 input 約 1,000 KB、output 約 800 KB、queue 增加約 200 KB。測試報告要寫單位是十進位 KB=1000 bytes，並列出每次取樣的 bytes_received、frames_completed、queue_bytes 與 latency。

排空時間取決於恢復後的服務餘量。若輸入停止且 consumer 維持 80 KB/s，200 KB 約需 2.5 秒排空；這是假設沒有新輸入、沒有額外 overhead 與處理抖動。若仍以 100 KB/s 到達，consumer 80 KB/s 就不會排空，queue 只會繼續增長直到背壓或上限。

加入 burst 測試，例如前1秒輸入500 KB、後9秒每秒20 KB，共680 KB，十秒平均68 KB/s低於consumer的80 KB/s；第一秒仍會理想堆積420 KB，接著每秒淨減60 KB，約七秒排空。要分別記錄 steady_rate、peak_burst、burst_duration 與最大 queue，不能只用十秒平均判斷容量。

| 案例 | 輸入 | 消費 | 10秒結果/假設 |
| --- | --- | --- | --- |
| steady | 100KB/s | 80KB/s | 約堆200KB |
| 停止後排空 | 停止輸入 | 80KB/s | 200KB約2.5s |
| burst | 1秒500KB後降速 | 80KB/s | 看peak queue |
| 快消費 | 100KB/s | 120KB/s | 可逐步排空 |
| 超過上限 | 100KB/s | 80KB/s、容量150KB | 記overflow/backpressure |

steady 測試要先丟棄暖機與連線建立期間，再算穩定窗口；burst 測試則保留完整開始時間。輸入端的 sleep、批次寫入或作業系統排程可能讓實際 burst 遠高於標稱 100 KB/s，需以接收端計數反推真實 arrival。

測試結束要保存 input、output、queue、overflow 與 latency 總表，讓容量結論可重算。

若 frame 有 12-byte header，1000 frames/s 的應用 payload 100 bytes 會產生額外 12 KB/s；若還有加密、封包或物件配置成本，實際 bytes/s 更高。測試資料需明列 payload 與 wire/application overhead，避免用裸 payload 估算 production 記憶體。

## 三 overflow 延遲與資源上限

in-test overflow 計數要和遺失原因分開：socket read error、framing reject、queue full、application drop、connection reset 各自計數。測試時可以故意把 queue_capacity 設為 150 KB 觀察 200 KB 堆積，但不要把這個壓力注入 production；壓測環境要隔離來源與設備。

每筆或每批要記錄 latency、queue_depth、oldest_age、memory_peak、CPU、frames_received、frames_completed。若 queue_bytes 沒超過上限但 latency 暴增，可能是 consumer 被鎖或解析慢；若 memory_peak 跟 framing buffer 一起升，可能是大 frame 或 cursor 未前移。

max_frame 與 queue 上限要互相檢查。一個合法 4096-byte frame 即使 queue 只剩 3000 bytes，也不能半存後標成完整；可拒絕新 frame、暫停讀取或使用持久化策略。選擇要依訊息是否可重建、是否允許背壓與業務重要性決定，不能預設丟資料。

| 故障 | 計數 | 先查 | 結果 |
| --- | --- | --- | --- |
| queue full | queue_full_count | queue bytes/oldest | 背壓或拒絕 |
| frame過大 | frame_reject_count | length/max_frame | 不allocate |
| 讀取錯誤 | socket_error_count | OS error/連線 | 分開記錄 |
| 處理落後 | latency/P99 | consumer/鎖 | 調整程式 |
| 記憶體超限 | memory_peak | 三層buffer | 停止壓測/降載 |

若測試中 queue full，記錄第一次滿的時間與恢復時間。丟棄策略若允許，只能丟明確可重建的查詢，並把 request_id 和 drop_reason 寫出；控制動作應停止新增、回報上游，而不是靜默刪除。

當 buffer 尚未滿但 latency 已超標時，不能只以「沒有 overflow」判定成功；業務驗收要同時有 queue oldest age、P99 latency 和完成率。若三者中任一超限，測試結果應標不合格並保留資源快照。

壓測結果只能支持被測配置。改變 OS socket buffer、worker 數、frame 大小或網路 offload 後要重新測；不能由一次 10 秒結果宣稱長時間穩定。資源上限與恢復行為都要寫進驗收條件。

## 四 背壓與排查限制

若 consumer 慢讀，TCP 可能透過接收窗口讓傳送端降低速度；這與應用 queue 主動丟棄不同。看到 producer 速率下降時，先比對 socket read 次數、核心 buffer、TCP window、應用 queue 與 consumer service time，再決定是正常 flow control 還是程式阻塞。

一次排查案例：10秒後實際received=998 KB、queue=198 KB、overflow=0、socket error=0、consumer=800 KB，符合 100/80 的理想差值；這不能說資料遺失。另一案例 queue=150 KB、overflow=50 KB、consumer=800 KB，表示達到自訂應用上限，需查 drop/backpressure policy。若 socket error 增加，則另查連線。

測試前先建立資源預算：socket buffer、framing buffer、queue、單筆最大 frame、工作物件與日誌暫存。設定 memory limit 後，在隔離環境逐步提高 burst；一旦 overflow 或 latency 超限就停止，保存結果。不要透過盲目放大 buffer 掩蓋 consumer 永久低於 arrival 的問題。

| 驗收項 | 基準 | 預期 |
| --- | --- | --- |
| 穩定速率 | 100/80KB/s×10s | 約200KB queue |
| 排空 | 停止輸入、80KB/s | 約2.5s（理想） |
| 上限 | queue150KB | overflow/backpressure明確 |
| 大frame | 超max_frame | 拒絕且不allocate |
| 慢讀 | 降低read頻率 | 觀察TCP背壓非隨機丟失 |

延遲報告要區分 queue latency、framing latency 與 consumer latency。P99 變差但平均不變時，先查長尾 burst、鎖競爭與單一大 frame；不要只調整平均 buffer。

若 consumer 暫停 2 秒，短 burst 可能造成 queue 大幅上升；恢復後要量測排空時間與最老工作年齡。只看最終 queue 回到零，可能漏掉過程中延遲已超過業務上限。

本文是 socket 與應用佇列測試方法，不指定 Linux 或 Windows 的實際預設 buffer，也不提供 PLC 指令。OS 參數、socket API、核心統計與網路驅動行為需在目標平台查證。

## 五 驗收 FAQ 與來源

本案例 100 KB/s輸入、80 KB/s消費，基準期間10秒：輸入約 1,000 KB、消費約 800 KB，初始 queue=0 時理想堆積約 200 KB；以十進位 KB、無額外 overhead 為假設。實測要另記 burst、frame overhead、overflow、latency、memory 與資源上限。

TCP flow control 讓慢讀端可降低傳送端速度，通常表現為 backpressure，不代表核心隨機丟失應用資料。應用仍可能因 buffer 上限、程式主動丟棄、連線重置或 framing 錯誤而失資料；排查需把 socket 狀態、應用計數與連線事件放在同一時間線。

FAQ1：TCP 慢讀會自動隨機丟應用資料嗎？答：通常先表現為 flow control/backpressure；應用丟棄、queue full、reset 或 framing error 要分開計數。

FAQ2：socket buffer 加大能解決 consumer 80 KB/s 嗎？答：只能延後堆積或背壓，不能改變長期到達率高於服務率的事實。

FAQ3：為何要分 bytes/s 與 frames/s？答：同樣 bytes/s 下，frame 數會改變解析、索引與呼叫成本；兩者都要量測。

FAQ4：可以在正式設備直接做 overflow 壓測嗎？答：不應直接做。應在隔離測試環境，以明確資源上限與可恢復資料進行。

參考：[RFC 9293：TCP reliable in-order byte-stream 與 flow control 背景，非應用佇列規格。](https://www.rfc-editor.org/rfc/rfc9293)

若同一資料同時有 frame_count 與 payload_bytes，驗收需核對兩者的比例與最大 frame。當平均速率正常但 frame_count 突升，可能是小包風暴，CPU與呼叫成本會先超限；當 payload_bytes 突升，可能是大包或來源異常。

參考：[Linux socket(7) 官方手冊：socket buffer 與選項概念參考，需依目標OS核對。](https://man7.org/linux/man-pages/man7/socket.7.html)

## 延伸閱讀

- [重試如何避免通訊恢復風暴](/articles/retry-backoff-jitter-circuit-breaker)
- [MTU與MSS怎麼分 用PMTUD和封包證據查路徑問題](/articles/mtu-mss-pmtud-wire-evidence)
