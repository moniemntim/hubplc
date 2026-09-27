---
title: 重試如何避免通訊恢復風暴
description: 以base1秒、倍增2、cap8秒與full jitter案例，說明單一重試責任、27次風暴、deadline、限流與breaker半開探測。
date: 2026-09-21
author: 茂伯
draft: false
category: 工業通訊與網路
---

## 一 退避時程與 jitter 算清楚

本篇自訂重試政策：base=1 秒、倍增 2、cap=8 秒，等待時間不含前一次呼叫耗時。第 1 至第 5 次重試的上限依序為 1、2、4、8、8 秒；若採 full jitter，實際 sleep 在 [0,cap] 均勻抽樣，不是每次固定睡上限。schedule 只描述等待，不代表一定要重試。

例如第一次失敗後 cap=1，抽到 0.63 秒；第二次 cap=2，抽到 1.41 秒；第三次 cap=4，抽到 0.20 秒；第四次 cap=8，抽到 6.7 秒；第五次 cap=8，抽到 2.8 秒。每次要保存 attempt、cap、實際 sleep、錯誤類型與 deadline 剩餘時間，才能重現一次恢復風暴。

沒有 jitter 時，大量客戶使用相同1、2、4、8秒等待間隔，重試時刻便容易同步；忽略呼叫耗時時，累積時刻為第1、3、7、15秒，會形成同步尖峰；full jitter 將請求分散到區間內，但不保證服務一定恢復。base、倍數與 cap 是本案例政策，不可跨設備、協定或供應商直接套用。

| 重試次數 | cap | full jitter範圍 | 固定上限示例 |
| --- | --- | --- | --- |
| 1 | 1s | [0,1] | 1s |
| 2 | 2s | [0,2] | 2s |
| 3 | 4s | [0,4] | 4s |
| 4 | 8s | [0,8] | 8s |
| 5 | 8s | [0,8] | 8s |

jitter 的抽樣結果要記錄 seed 或至少記錄實際 sleep，不必在生產環境固定 seed。驗收可用多筆同時失敗請求觀察時間分布；若所有請求仍集中在 1、2、4、8 秒邊界，代表實際程式沒有套用 full jitter。

若一次呼叫已耗時 7 秒，下一次即使抽到 1 秒，也可能超過總 deadline。重試器先計算剩餘時間，再決定是否 sleep；不能把等待時程和呼叫耗時分開到最後才發現已逾時。

為避免同名變數混淆，8秒是全域等待上限，每輪上限則為min(8秒,1秒乘2的重試序號減一次方)。full jitter每輪在零到該輪上限之間取值，並非第一輪就可等8秒。

## 二 統一重試責任與 27 次上限

本案例讓業務重試由一層負責。若API client、設備driver、佇列worker每層最多嘗試3次，而且3次已包含原始呼叫，最壞底層呼叫為3×3×3=27次。若每層是原始一次再重試三次，則是4×4×4=64次，不能混稱27次。應指定唯一 owner，例如 worker 負責重試，client 與 driver 對上層回報一次失敗；或由 client 負責，外層不得再包重試。

每次工作要有 absolute deadline、attempt_max、rate_limit 與 concurrency_limit。attempt_max=5 不代表一定嘗試五次；非重試錯誤、剩餘時間不足、circuit open 或達到速率限制都要提前結束。attempt 的定義要包括原始呼叫還是只算 retry，文件與日誌必須一致。

可重試錯誤需按語義分類。連線暫時不可用、明確 timeout 或服務忙可能允許重試；參數錯、權限拒絕、格式錯通常不應重試。寫入操作回覆未知時，不能盲目重播，因為設備可能已執行但回覆遺失；要用查詢、冪等鍵或人工確認。

| 層次 | 允許責任 | 超過時 | 禁止 |
| --- | --- | --- | --- |
| API client | 不自行重試 | 回報分類錯誤 | 內層再倍增 |
| driver | 只做協定必要重連 | 回報一次 | 包住整個業務重試 |
| worker | 唯一退避owner | 依deadline結束 | 無限重排 |
| write unknown | 查狀態/冪等鍵 | UnknownOutcome | 盲重播 |

attempt_max 應與 root_request_id 一起計算，內層錯誤向上傳遞時不要重設計數。若 worker 重排工作，仍沿用同一 root deadline 與 attempt budget；建立新工作才使用新的政策，否則佇列會把已逾時請求反覆送出。

驗收時在三層同時注入 timeout，確認實際設備呼叫數符合唯一 owner 的上限，而不是 27 次。日誌須帶 root_request_id、attempt、layer、sleep 與最後 reason，否則只看到「重試三次」無法判斷是哪一層造成風暴。

## 三 circuit breaker 與半開探測

circuit breaker 可把連續失敗分成 Closed、Open、HalfOpen。Closed 正常送出；達到失敗門檻後 Open，在 cooldown 期間快速拒絕，避免所有 worker 持續撞擊故障設備；時間到才放少量 HalfOpen 探測。半開探測成功後回 Closed，失敗則回 Open。門檻、cooldown 與探測數量需寫入政策。

例如 20 秒內連續 5 次可重試 timeout，breaker 進 Open 30 秒；期間一般工作立即得到 CircuitOpen，不進入重試 sleep。30 秒後只允許 1 個 probe，成功且回覆完整才恢復；若 probe 仍 timeout，重新 Open 30 秒。這不是用 breaker 掩蓋永久參數錯誤，非重試錯誤仍直接拒絕並告警。

rate limit 與 concurrency limit 仍需保留。breaker 半開成功不代表可瞬間放回所有 backlog；可設定每秒恢復 2 件、同時最多 1 個設備請求，再逐步增加。恢復時要監看 first_byte、complete、queue_depth 與錯誤率，避免從風暴變成第二次風暴。

| 狀態 | 條件 | 動作 | 記錄 |
| --- | --- | --- | --- |
| Closed | 正常/少量錯誤 | 依政策送出 | attempt與錯誤 |
| Open | 達失敗門檻 | 快速拒絕 | open_until |
| HalfOpen | cooldown到期 | 放1個probe | probe_id |
| 回Closed | probe成功 | 限速恢復 | transition |
| 回Open | probe失敗 | 延長冷卻 | reason |

半開探測要有獨立 probe_id 與超時，且探測結果不能直接視為所有 backlog 成功。設備只恢復一個請求時，先維持低 concurrency，連續多次成功後才逐步放寬；任何一次明確失敗都要記錄狀態轉換。

breaker 以 device 或 endpoint 為粒度較能避免一台故障拖垮全部設備，但若多個 endpoint 共用同一網路或電源，仍需上層總量限制。粒度和共享資源要依現場架構決定，不能複製一套數字到所有系統。

## 四 deadline 未知寫入與排查

假設總 deadline=15 秒，base/cap 時程為 1、2、4、8 秒。若原始呼叫耗時 3 秒、第一次等待 1 秒、第二次呼叫耗時 4 秒，已用 8 秒；此時即使下一次等待上限為2秒，也只能在剩餘 7 秒內決定是否嘗試，不能只檢查等待2秒，卻不限制接下來呼叫的剩餘時間。

讀取操作 timeout 可依 request_id 重試並最後回報 UnknownRead；寫入操作 timeout 要先判斷是否有冪等鍵或查詢方法。若設備可能已完成寫入，重試可能重複動作；應先查狀態、等待事件或交給人工確認。retryable 不等於 safe_to_replay。

看到恢復風暴時先統計每層 attempt 次數、sleep 分布、concurrency、breaker 狀態與 deadline。若所有請求在整秒重來，代表 jitter 未生效；若每筆最多 27 次，代表多層重試；若 breaker 半開同時放出大量 probe，代表半開鎖或限流失效。

| 症狀 | 證據 | 可能原因 | 修正 |
| --- | --- | --- | --- |
| 整秒尖峰 | sleep幾乎固定 | 無jitter | full jitter |
| 27次呼叫 | layer/attempt | 三層重試 | 單一owner |
| 寫入重複 | unknown timeout | 盲重播 | 查詢/冪等鍵 |
| Open仍高流量 | CircuitOpen計數 | 快速拒絕未接上游 | 限流與佇列整合 |
| deadline超時 | 耗時+sleep | 最後才檢查 | 每次前檢查剩餘 |

寫入未知結果的查詢本身也可能 timeout，應設定查詢 deadline 與人工處理狀態，不能因查詢失敗就推論原寫入未發生。所有重試與查詢共用資源時，仍要納入 rate limit，避免恢復流程反過來壓垮設備。

排查時要把原始錯誤與重試決策分開保存：同一個 timeout 可被判定為 retryable，也可能因剩餘 deadline 不足而直接結束。決策 reason 應指出是 Retryable、DeadlineExceeded、AttemptLimit、CircuitOpen 或 UnknownOutcome，不能只記「重試失敗」。

本篇說明自訂通訊策略，不是 PLC、設備或安全控制標準。實際 retryable 錯誤、寫入語義、冪等鍵、連線池與 breaker 參數需依目標設備和服務契約驗證；未確認的寫入不可自動重播。

## 五 驗收 FAQ 與來源

本案例退避 cap 為 1、2、4、8、8 秒，full jitter 各自在 [0,cap] 抽樣；重試責任只由一層擁有，並受 absolute deadline、attempt_max、rate/concurrency limit 與 circuit breaker 約束。寫入 timeout 若結果未知，不可只因 retryable 就盲目重播。

FAQ1：full jitter 是每次固定等 cap 嗎？答：不是。它在 [0,cap] 內抽樣；cap 是上限，實際 sleep 每次可不同。

FAQ2：三層各最多嘗試3次為何可能27次？答：每層3次包含原始呼叫，逐層包住下層失敗，最壞形成3×3×3；應指定唯一重試責任。

FAQ3：寫入 timeout 可以直接重送嗎？答：不能。設備可能已執行但回覆遺失，先查狀態、使用冪等鍵或標 UnknownOutcome。

FAQ4：breaker 半開成功後能立刻放行全部佇列嗎？答：不應直接放行；仍需 concurrency、rate 與逐步恢復，觀察設備延遲和錯誤率。

參考：[AWS Builders Library：Timeouts, retries and backoff with jitter，退避、jitter與重試責任參考。](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)

參考：[Python time.monotonic 官方文件：deadline與經過時間計算參考，非 PLC API。](https://docs.python.org/3/library/time.html#time.monotonic)

## 延伸閱讀

- [通訊佇列堆積如何分辨設備慢與程式塞](/articles/communication-queue-backlog-diagnosis)
- [接收buffer不足如何做流量測試](/articles/receive-buffer-throughput-test)
