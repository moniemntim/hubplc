---
title: 通訊佇列堆積如何分辨設備慢與程式塞
description: 以arrival10/s、service8/s、60秒初始backlog0案例，分離enqueue/dequeue/send/first_byte/complete並辨識排隊、設備、worker與解析瓶頸。
date: 2026-09-21
author: 站長
draft: false
category: 工業通訊與網路
---

## 一 把排隊等待與設備服務分開

通訊佇列變慢時，先保存每筆工作的 enqueue、dequeue、send、first_byte、complete 時間，且用同一個 monotonic clock 計算差值。enqueue 到 dequeue 是排隊等待；dequeue 到 complete 是服務時間。不能只看 complete−enqueue 就說設備回應慢，因為它可能大部分時間都在程式佇列裡等待。

本案例假設 60 秒內每秒到達 10 件，設備每秒穩定完成 8 件，初始 backlog=0，採 fluid 平均模型估算 backlog=(10−8)×60=120 件。這是容量規劃的近似，不代表每一秒都精確增加兩件；實際要以事件時間戳與服務分布驗證。若容量只有 100，必須提前定義背壓或丟棄規則。

queue_capacity、drop_policy 與 backpressure 必須是明確設定。對停止、寫入或配方變更等動作，不能預設佇列滿就丟棄；可選擇拒絕新請求並回 QueueFull、讓上游降速、或保留到持久佇列。每種工作要標 is_idempotent 與 priority，不能把控制動作和可重建的查詢一樣處理。

| 時間戳 | 含義 | 可計算值 | 排查用途 |
| --- | --- | --- | --- |
| enqueue | 進入程式佇列 | — | 來源到達 |
| dequeue | worker取出 | dequeue-enqueue | 排隊等待 |
| send | 送出請求 | send-dequeue | worker前置延遲 |
| first_byte | 收到首回應 | first_byte-send | 設備/網路首回應 |
| complete | 完整結束 | complete-first_byte | 剩餘服務時間 |

時間戳欄位必須使用同一 clock domain；若 worker 與設備代理各自取時間，先保存原始 clock_id，不能直接相減。可以由接收端以 monotonic 記錄所有本地事件，wall-clock 只用於跨系統對照，並在報表註明同步不確定度。

每筆紀錄還要帶 device_id、worker_id、request_id、queue_depth 與結果。多設備混在一條佇列時，總 backlog 可能掩蓋單一慢設備；分設備統計等待與服務，才能判斷是設備本身、worker 被阻塞，還是解析程序塞住。

## 二 用數據辨識堆積來源

若 dequeue−enqueue 持續上升而 service time 穩定，主要問題是到達率高於處理率或 worker 數不足。若 dequeue 很快但 send 到 first_byte 變長，設備回應慢或網路等待較可能；若 first_byte 已到但 complete−first_byte 變長，應進一步區分剩餘網路接收、解析、資料庫寫入或callback阻塞；單靠首byte時間無法定位是哪一項。

workerblocked 要有證據，例如 worker 取出工作後長時間沒有 send，且 CPU/鎖等待或外部呼叫時間與 send 延遲同時升高。parse慢則比較 first_byte 到 complete 的解析計時與 payload 大小；設備回應慢則比較 send 到 first_byte 與設備端 request_id 紀錄。不要只看到 queue_depth 就改大佇列。

以 10/s 到達、8/s 服務為例，前 10 秒平均 backlog 約 20，30 秒約 60，60 秒約 120。若把 worker 加倍後服務率仍為 8/s，瓶頸可能在單一設備或序列化鎖；若到達率仍10/s而服務能力提高至12/s，已有backlog才會逐步下降；理想每秒減2件，120件約需60秒清空。每個結論都要用時間窗與實測完成數支持。

| 觀察 | 等待 | 服務 | 較可能原因 |
| --- | --- | --- | --- |
| 等待升、服務穩 | 上升 | 穩定 | 到達率/容量 |
| 等待穩、send→首byte升 | 穩定 | 變長 | 設備或網路 |
| 首byte→complete升 | 穩定 | 解析段變長 | parse/寫入 |
| dequeue後久未send | 增加 | 尚未開始 | workerblocked/鎖 |
| 只一台設備惡化 | 該設備升 | 該設備升 | 設備局部慢 |

若 queue_depth 不高但 service time 逐步增加，可能是設備內部佇列或網路延遲；若 service time 穩定而 oldest_age 增加，則是應用到達率問題。兩者都要看分位數與設備 ID，不能用一個全域平均值做結論。

排查報表要同時顯示平均、P95/P99 與最大值。平均 20 ms 可能掩蓋少數 5 秒阻塞；尾端延遲會占用 queue capacity 並觸發上游重試。時間戳應用 monotonic 計差值，對外報表另存 wall-clock，避免系統校時造成負延遲。

## 三 滿佇列 背壓與動作安全

假設容量 100、初始 0、平均淨增加 2/s，約在 50 秒達滿；實際突發可能更早。滿佇列時查詢可回 QueueFull 後由上游重試，但寫入或動作請求要依業務契約決定拒絕、持久化或人工處理。不能默認丟最舊或丟最新，因為兩者都可能改變設備狀態。

背壓要有可觀察訊號，例如 accepted_rate、rejected_rate、queue_depth、oldest_age 與 drop_reason。上游收到背壓後可以降低採樣頻率或停止新增非必要查詢；若上游不支援，就必須在邊界層拒絕並保存 request_id。背壓不是把 timeout 延長到無限。

對不可丟的動作，可建立持久佇列與去重鍵，但必須確認設備是否支援重送。若工作已送出但回覆遺失，重新排入可能造成重複動作；此時標 UnknownOutcome，等待查詢或人工確認，不可只因佇列有空間就自動重播。

| 佇列狀態 | 查詢工作 | 控制動作 | 記錄 |
| --- | --- | --- | --- |
| 低於80% | 接受 | 接受 | 正常 |
| 80–100% | 可降速/限流 | 依優先級 | oldest_age告警 |
| 滿 | QueueFull或背壓 | 不可默認丟棄 | request_id/reason |
| 未知結果 | 查狀態後決定 | 不盲重播 | UnknownOutcome |
| 持續滿 | 擴容/降載 | 工程處置 | 完整時間線 |

若協定支援，背壓回覆可帶retry_after 或降載建議，避免上游在收到 QueueFull 後立即同步重試。若工作不可丟且沒有持久佇列，應讓呼叫者知道提交失敗，而不是把資料留在記憶體中等待重啟後消失。

驗收時刻意把服務率降到 8/s，送入 10/s，確認 backlog、oldest_age 與 QueueFull 在預期區間出現；再恢復服務率到 12/s，確認新工作不再堆積且既有佇列逐步下降。不可只看程式沒有例外就判定排隊設計正確。

## 四 完整排查與限制

一次具體排查可選 request 781：enqueue=100.000、dequeue=100.800、send=100.810、first_byte=101.010、complete=101.030，單位秒。等待 800 ms，send 前置 10 ms，首回應 200 ms，後段 20 ms。這筆主要是排隊等待加設備首回應；若同時看到 queue_depth 上升，先查到達與服務率。

request 782 若 enqueue=101.000、dequeue=101.010、send=101.020、first_byte=106.020、complete=106.040，等待只有 10 ms，但首回應 5 秒，應優先查設備或網路。request 783 若 first_byte 很快而 complete 延遲 2 秒，則查 parser、資料庫或 worker 鎖，不要把設備 timeout 改長掩蓋。

服務率估算要說明時間窗與初始條件。短時間突發、設備批次回應、worker 重啟都會讓 10/s 與 8/s 的流體估算失真；因此把 120 當容量規劃警訊，不是實機保證。最終驗收要使用實際分布、最大工作大小與停機恢復行為。

| 驗收 | 輸入 | 預期結果 |
| --- | --- | --- |
| 正常 | 理想均勻arrival8/s、service8/s | fluid模型淨增0 |
| 堆積 | arrival10/s、service8/s、60s | 平均估算120 |
| 設備慢 | send後5s首byte | service段升 |
| 程式塞 | dequeue後久未send | worker/鎖證據 |
| 恢復 | service12/s | backlog下降 |

恢復測試要包含 worker 重啟：重啟前的持久工作要有唯一 request_id，重啟後只能依去重規則恢復。若沒有持久化證據，不能宣稱工作仍在佇列中。

首byte之後還可能很久才收齊封包。需要時加last_byte與parse_done時間，分開完整接收和純解析；send也明訂為請求全數交給本地socket之時。到達率等於服務能力只有在理想均勻模型才不累積，真實變動負載須留餘裕，不能以平均相等保證不排隊。

本文只討論資料佇列與觀測，不指定 PLC 指令、資料庫產品或安全停機方式。涉及機台動作時，優先級、丟棄與恢復策略需由工程規格核准；queue depth 不能直接作為安全控制條件。

## 五 驗收 FAQ 與來源

本題基準是 60 秒內 arrival=10/s、service=8/s、初始 backlog=0，在穩定 fluid 假設下平均 backlog 增加 120。實際判斷要以 enqueue/dequeue/send/first_byte/complete 的 monotonic 差值分開排隊與服務，並對滿佇列、背壓與不可丟動作定義明確結果。

FAQ1：complete−enqueue 變長就代表設備變慢嗎？答：不一定，可能是排隊等待變長。先分別看 dequeue−enqueue 與 first_byte−send。

FAQ2：佇列滿時可以丟最舊工作嗎？答：不能默認。查詢、控制動作與不可重複工作要有不同契約，丟棄策略必須明訂並記錄。

FAQ3：為何用 monotonic 計延遲？答：wall-clock 可能因校時跳動；monotonic 適合計經過時間，對外顯示再另存牆上時間。

FAQ4：加 worker 就能解決堆積嗎？答：不一定。若單一設備、鎖或解析是瓶頸，加 worker 可能只增加競爭，須用時間戳證據定位。

參考：[Python time.monotonic 官方文件：單調時鐘與經過時間計算參考，非 PLC API。](https://docs.python.org/3/library/time.html#time.monotonic)

參考：[AWS Builders Library：Timeouts、retries and backoff with jitter 的延遲與重試背景，非特定PLC佇列規格。](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)

## 延伸閱讀

- [非同步亂序回覆如何用待回覆表配對](/articles/async-out-of-order-pending-map)
- [重試如何避免通訊恢復風暴](/articles/retry-backoff-jitter-circuit-breaker)
