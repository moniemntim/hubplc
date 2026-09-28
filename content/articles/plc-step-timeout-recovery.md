---
title: PLC 步驟等待逾時：5000 ms 邊界、故障快照與重新啟動
description: 下載單一步驟等待模型，重播 4999 ms 成功、5000 ms 逾時與復歸被拒絕，核對故障快照和新 Start 的條件。
date: 2026-09-17
author: 茂伯
draft: false
---

## 這次只處理一個等待步驟

流程已要求動作，SensorB 卻遲遲沒到位，程式需要回答三件事：從何時開始等、何時停止等待、故障後怎樣重新開始。本篇固定等待上限為 **5000 ms**，是教材自訂值，不是設備建議參數。

附件是已執行的 Node.js 離線模型，沒有連 PLC 或輸出端子。`output` 只是虛擬命令；它變成 false 不等於量到設備已停。本站未執行原廠模擬器或機台測試。

本例只用 `IDLE → WAIT_SENSOR_B → DONE/FAULT`，不放入沒有定義內容的 PREPARE 或 VERIFY。完整多步驟流程見[三步驟狀態機](/articles/plc-state-machine-three-step-sequence)；這裡專注等待與復歸證據。

## 下載後怎麼跑

將 [wait-model.mjs](/examples/plc-step-timeout/wait-model.mjs) 和 [demo.mjs](/examples/plc-step-timeout/demo.mjs) 放在同一資料夾，使用 Node.js 22.13.0 以上執行：

```powershell
node demo.mjs
```

會印出四段案例，每列是輸入快照與處理後狀態的 JSON。時間來自每列 `nowMs`，不是程式跑一輪就加一毫秒；沒有即時等待五秒。

## 先核對初值、允許條件與優先順序

初態 IDLE、output=false、沒有錯誤／快照。Start 初次必須先觀察到 false，之後 false→true 才能開始；初始就保持 true 不啟動。Reset 也必須先在 `valid=true` 時觀察到 false，下一次按下才形成一次復歸請求。

每列省略的 Start、Reset、Stop、SensorB、Ack 預設 false；valid、permit 預設 true。若要重播長按，必須在每列明寫 true，不會自動沿用前一列輸入。

| 起始狀態 | 處理規則 |
| --- | --- |
| IDLE | 新 Start 且 valid、permit 為 true，Stop、SensorB 為 false，才開始等待 |
| WAIT_SENSOR_B | Stop → 無效品質 → permit 消失 → 到時 → SensorB，到前者成立便不再判後者 |
| DONE | 保持到 Ack，Reset 不代替 Ack |
| FAULT | 有效的新 Reset 且符合相同準備條件，回 IDLE；不直接重試等待 |

上述 Stop 是普通邏輯條件，不是安全急停功能。`valid` 表示本次輸入快照是否可用；真正專案需定義它如何由模組品質與資料年齡產生。

## 案例一、二：4999 成功，5000 到位仍逾時

兩條線都先在 nowMs=0 觀察 Start=false，在 nowMs=10 以 Start=true 進入 WAIT_SENSOR_B，記下 enteredAtMs=10。Elapsed 永遠是 `nowMs - enteredAtMs`，等待期間不重設起點。

| 案例 | nowMs | Elapsed | SensorB | 結果 |
| --- | --- | --- | --- | --- |
| success-4999 | 5009 | 4999 | true | DONE、output=false |
| timeout-5000 | 5010 | 5000 | true | FAULT、TIMEOUT_B、output=false |

第二條線在 1010、3010、5009 ms 的觀察仍是等待；到了 5010，即使 SensorB 同時為 true，也按本例「到時優先」進故障。若你的規格接受邊界同時到位，必須同步修改程式、文字和驗收答案，不能只改一個比較符號。

第三段 `late-sample-5030` 故意直到 nowMs=5040 才再次呼叫，故障快照記錄的 Elapsed 是 **5030 ms**。程式只能在下一個觀察點發現已到期，不能捏造它在 5000 ms 當刻就執行過。

## 快照保存故障當下，不跟著目前感測器變

進 FAULT 時保存 `lastFault`：錯誤碼、故障步驟、進入等待時間、故障觀察時間、Elapsed、SensorB、valid、permit、Stop，以及故障前的虛擬命令。FAULT 期間不覆寫它；成功復歸與下一次啟動後也仍保留，直到另一個新故障取代。

`timeout-5000` 的關鍵欄位應為：

```text
code=TIMEOUT_B
faultStep=WAIT_SENSOR_B
enteredAtMs=10
atMs=5010
elapsedMs=5000
sensorB=true
outputBefore=true
```

這表示故障觀察當刻已看到到位，但依規格仍太晚。它與「故障時為 false，後來才變 true」是不同證據。本模型只保存最後一筆故障，不是永久日誌；要做歷史追蹤，須另外保存逐列輸出。

## 案例四：Reset 被拒絕後，長按不會自動重試

`reset-requires-new-press` 延續到時故障，依序重播：

| nowMs | 輸入重點 | 預期狀態／動作 |
| --- | --- | --- |
| 5020 | Reset=true、SensorB=true | FAULT／reset-rejected |
| 5030 | Reset 仍 true、SensorB 已 false | 仍 FAULT，不自動接受長按 |
| 5040 | Reset=false | 重新允許下一次按下 |
| 5050 | Reset=true、Start=true | 回 IDLE／reset-accepted，不同輪啟動 |
| 5060 | Start 仍 true | 保持 IDLE，這不是新上升緣 |
| 5070 | Start=false | 釋放 Start |
| 5080 | Start=true | 新 WAIT_SENSOR_B，enteredAtMs=5080 |

本例把 SensorB 未清除視為新一輪前提不成立，不代表感測器必然損壞。Reset 拒絕時先查來源、極性、品質與設備目前位置，而不是把條件旁路。`valid=false` 也會解除 Reset 的允許記憶，恢復有效後需重新觀察釋放再按下。

## 移植前還缺哪些證據

真正等待上限要依設備動作、允許延遲及任務／I/O 更新設計，不能因故障頻繁就一直加長。此模型沒有判斷實體輸出已關閉，也沒有自動重試、斷電保持與機械互鎖。

現場驗證要額外保留時間來源與解析度、到位訊號取得方式、命令到實際輸出的差異，以及每項復歸前提的依據。任務根本未執行時，這個等待程式也不會自行檢查期限；那是[Watchdog 與遺漏週期排查](/articles/plc-watchdog-timeout-diagnosis)要處理的另一層問題。
