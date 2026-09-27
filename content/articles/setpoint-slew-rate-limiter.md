---
title: 斜率限制器如何防止設定值一步跳到不合理範圍
description: 用 target 0→100、rise 20、fall 10、dt 0.1 的案例，逐步驗證斜率限制、反向、overshoot與無效輸入。
date: 2026-09-17
author: 茂伯
draft: false
---

## 一 先定斜率與狀態

斜率限制器的目的，是把設定值的跳變分散到可接受的更新速度，而不是替控制器保證運動安全。本篇用離線案例：目前值 current=0，目標 target=100，rise_rate=20 units/s，fall_rate=10 units/s，固定週期 dt=0.1 s。每次允許的變化量是 delta=clamp(target-current,-fall_rate×dt,rise_rate×dt)。

先把輸入分成 target、current、dt、rise_rate、fall_rate、valid 和 state。target 是要求值，current 是限制器上一輪實際輸出；不能用尚未限制的 target 當下一輪 current。dt 必須是有效正時間，若逾時、時間倒退或取值失敗，應進入 InvalidTime，不可默默使用上一輪或固定 0.1。

初始化也要明確。若設備目前位置未知，current=0 只是一個離線測試假設，不能表示現場軸或閥已在零點。可以選擇等待有效回讀、以工程定義的安全初值啟動，或拒絕輸出；本文示例在 本篇案例 明確標記 InitialisedFromTest=1。

每輪先算 error=target-current，再決定上升或下降限幅。若 error>0，最大正增量是 rise_rate×dt；若 error<0，最小負增量是 -fall_rate×dt；若 error=0，輸出保持。最後再以 target 與候選值比較，避免浮點誤差讓輸出越過目標。

在介面設計上，rise_rate 與 fall_rate 要和 target 使用相同工程單位。若 target 是百分比而 rate 是每秒百分點，名稱應明確寫成 units_per_second；不能把 20%/s 誤寫成 0.2 或 20，然後靠畫面結果猜。版本化設定還要記錄誰在何時修改 rate，便於重現跳變。

| 參數 | D008 值 | 用途 | 無效處理 |
| --- | --- | --- | --- |
| current | 0 units | 上一輪限制後輸出 | 未知時不可假設0 |
| target | 100 units | 本輪要求 | 缺值設InvalidInput |
| rise/fall | 20/10 units/s | 上升/下降限制 | 負值拒收 |
| dt | 0.1 s | 本輪時間 | 非正或倒退拒收 |

## 二 逐步計算上升與反轉

本篇案例 第一步 error=100，允許增量為 20×0.1=2，因此 next=0+2=2。第二步仍以 current=2 計算，next=4；如此每輪增加 2。第五步的輸出是 10，不是因為一次跳到 100，而是五次各增加 2。這個數值可直接放入離線驗收表。

若 target 在第五步後改為 5，當時 current=10，error=-5，下降上限為 10×0.1=1，因此下一步 next=9。不能使用 rise_rate=20 來處理反向變化，也不能先把 target 夾到 current 附近再宣稱斜率限制已完成。

候選值計算後要做 overshoot 檢查。上升時若 candidate>target，next=target；下降時若 candidate<target，next=target。這個檢查是數值穩健性的一部分，不是把 rate 調大來補救。target=100、current=99.5、rise limit=2 時，輸出應直接落在 100。

| 步驟 | target | current | error | 允許delta | next |
| --- | --- | --- | --- | --- | --- |
| 1 | 100 | 0 | 100 | +2 | 2 |
| 2 | 100 | 2 | 98 | +2 | 4 |
| 5 | 100 | 8 | 92 | +2 | 10 |
| 6 | 5 | 10 | -5 | -1 | 9 |
| 7 | 5 | 9 | -4 | -1 | 8 |

若 target 在第 5 步完成後由 100 改成 5，下一輪使用的是改變後的 target 和改變前的 current=10。計算順序不能先把 current 追到舊 target 再讀新 target。若 target 來自通訊，還應記錄收到時間與套用時間，避免排查時把舊命令當成新命令。

對輸出端還要檢查是否有其他程式段、HMI寫入或通訊服務同時改值。斜率限制器的 delta 表只能證明它自己的計算，不能證明最終端子或設備已依該值動作；因此驗收要把 final_writer 和來源時間一併列出。

驗收時同時記錄 step、target、current、delta、next、state。只看畫面曲線可能漏掉短暫跳變；保存逐步紀錄才能證明每輪增量沒有超過 rate×dt，且 target 改變後方向確實切換。

## 三 無效輸入與時間處理

target 缺值或超出工程允許範圍時，限制器不能把無效值當成 0。本篇案例 可設 target_valid=0，結果保持 last_valid_output，state=InvalidInput，並留下 invalid_reason。是否要將輸出歸零，必須由上層設備規格決定，斜率限制器本身不應擅自改寫。

dt=0、dt<0、時間戳倒退或超過 watchdog 閾值都屬 InvalidTime。若把一次停頓 5 秒直接乘入 rate，輸出可能在一掃描跳 100；若把停頓完全忽略，則可能使追蹤落後。本文規定 InvalidTime 時保持輸出並要求重新建立時間基準，後續策略另由工程規格選定。

rise_rate 或 fall_rate 為負數、非有限數值或超過資料型別範圍時，設 RateConfigError。不能用 abs() 把負設定轉正，因為那會掩蓋設定檔錯誤。初次啟動若 current 未建立，設 InitRequired，不執行斜坡計算。

| 異常 | 狀態 | 輸出 | 需保存 |
| --- | --- | --- | --- |
| target缺值 | InvalidInput | 保持上一有效值 | sample_time、raw target |
| dt倒退 | InvalidTime | 保持輸出 | 前後時間戳 |
| rate<0 | RateConfigError | 拒絕本輪 | rate設定版本 |
| current未知 | InitRequired | 不更新 | 初始化來源 |

invalid input 不應只用一個 BOOL 表示。建議至少區分 TargetInvalid、TimeInvalid、RateInvalid、CurrentUnknown 與 SourceTimeout，並保存最後一次有效輸入。這樣操作員知道是設定值錯誤，還是計時來源失效，不會誤把保持輸出當成斜率限制器正常追蹤。

驗收還要保存每輪的 previous_output，而不是只在錯誤時記錄。若輸出從 8 跳到 12，必須能回看當輪 target、dt、rate 和候選值，判斷是另一個寫入者覆蓋，還是限制器分支錯誤。

排查順序是先查時間，再查 current 是否真的是上一輪 next，接著查 rate 單位，最後才看 target。若 current 每輪都被另一段程式覆寫，限制器公式本身會正確但結果仍跳動；因此 ownership 和寫入來源也是驗收欄位。

本例允許零速率：上升速率為零時只禁止上升，下降仍依下降速率；兩者都零則保持，另顯示RateHold而非RateConfigError。時間無效時保持輸出，捨棄該次時間並重新建立基準，下一個有效週期才恢復。

## 四 反向與精度驗收

反向案例可用 target=5、current=10、dt=0.1。fall limit=-1，next=9；再下一輪是 8。若 target 再改回 100，current=9 時 error=91，立即切回 rise limit +2，next=11。方向切換只改變本輪允許增量，不重設 current，也不把歷史誤差一次補回。

若 dt 用毫秒整數保存，必須在公式前明確轉成秒，例如 100 ms→0.1 s。把 100 直接當秒會造成兩千 units 的允許增量；把 0.1 截成整數 0 又會使輸出永遠不動。資料型別、單位和轉換時機應寫入介面契約。

浮點結果可能出現 1.999999 或 2.000001，驗收可用允差檢查，但不能以允差放寬 overshoot。先用未捨入 candidate 做目標交越檢查，再只在顯示或通訊輸出端做最後一次格式化。

本篇限制器只限制設定值變化率，不處理加速度、jerk、軸回授、限位、互鎖或安全功能。對馬達、缸體或閥的實際動作，仍需由合格工程人員依設備手冊和風險分析決定控制架構。

驗收時也要測零誤差和極小誤差。target=current 時 next 應保持且 delta=0；current=99.9、target=100、rise limit=2 時不得超過 100；current=0.2、target=0、fall limit=1 時不得低於 0。這些測試能抓到符號與 overshoot 分支錯誤。

最後的離線表應把設定值來源、狀態、dt 和輸出放在同一列；若只列輸出曲線，無法區分 target 突變與程式執行延遲。交付前逐項核對 rise、fall、dt 的單位和有效範圍。

若改用外部回讀作為每輪current，便改變本篇以先前輸出為基準的模型，不能再直接宣稱命令輸出每輪受相同增量限制。外部值可供初始化或另設回授控制，但品質與採用時機需另訂。

離線驗收至少重跑四組：0→100 上升、100→0 下降、10→5 反向、dt 無效。每組檢查單輪 delta、是否 overshoot、state 以及恢復後第一個有效輸出。

## 五 驗收 FAQ與來源

本篇案例 通過條件是：上升每輪不超過 2 units，下降每輪不超過 1 unit；第五步輸出 10；target=5 時下一步由 10 變 9；target=100 且 current=99.5 時不超過 100；無效 target、dt 和 rate 均不會產生未標記的跳變。

FAQ1：為何第五步是 10？答：前四次更新後輸出為8，第五步為8+2=10；每一步都使用上一輪限制後的 current。

FAQ2：current 已到10、target 改成5，下一步能直接到5嗎？答：本案例下降上限為 1，所以由 10 到 9；只有 error 的絕對值小於等於允許下降量時才會到達目標。

FAQ3：dt 無效可直接套用固定 0.1 秒嗎？答：不能默默套用。本例標記InvalidTime、保持輸出、捨棄該次時間並重建基準，下一個有效週期才恢復。

FAQ4：斜率限制器能取代安全互鎖嗎？答：不能。它只限制設定值變化率，不證明設備位置、安全門、限位或負載條件安全。

參考：[Python官方time.monotonic：單調時間概念，僅作計時設計參考，非PLC API。](https://docs.python.org/3/library/time.html#time.monotonic)

參考：[MathWorks Rate Limiter官方文件：依經過時間限制上升與下降速率的模型，非PLC指令。](https://www.mathworks.com/help/simulink/slref/ratelimiter.html)

## 延伸閱讀

- [偶數窗口中值如何定義與驗證整數輸出](/articles/even-median-integer-output-policy)
- [斜坡升降速計算如何處理週期不固定](/articles/variable-cycle-ramp-calculation)
