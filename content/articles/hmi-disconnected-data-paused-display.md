---
title: HMI 斷線與資料暫停的顯示及驗收
description: 用同一個可執行投影分開 connection、pending、epoch、last acquisition 與恢復後的新資料。
date: 2026-09-17
author: 茂伯
draft: false
category: HMI 畫面與操作
---

## 斷線不是把值清零，恢復也不是立刻 Fresh

本頁沿用同一個離線顯示投影，但聚焦 connection。Disconnected 時 last Good 可以留給人員判讀，狀態必須是 `DISCONNECTED`，不是零值或目前可用資料。reconnect 後先進入新 epoch 的 `PENDING_CURRENT_EPOCH`；只有新 epoch、正確 seq、Good 且 acquisition 晚於 reconnect 時刻的資料能解除 pending。

這是畫面資料契約，沒有 PLC 控制、重送命令、實際連線偵測或 watchdog。不同 offline 模型的 runtime 與失效規則不能直接拼接；特別是站內 [通訊停止與資料品質 watchdog](/articles/communication-stop-data-quality-watchdog/) 不是本頁的依賴。

## 下載與連線時間線

下載 [model.mjs](/examples/hmi-quality/model.mjs)、[fixtures.mjs](/examples/hmi-quality/fixtures.mjs)、[connection-demo.mjs](/examples/hmi-quality/connection-demo.mjs)、[quality-demo.mjs](/examples/hmi-quality/quality-demo.mjs)、[self-test.mjs](/examples/hmi-quality/self-test.mjs)、[practice.mjs](/examples/hmi-quality/practice.mjs)，在 Node.js 24.19+ 執行：

```powershell
node connection-demo.mjs
node self-test.mjs
node practice.mjs
```

固定毫秒時間線與輸出：

```text
t=100 acquired=100 sourceChange=0
t=500 state=DISCONNECTED value=62
t=1000 epoch=2 state=PENDING_CURRENT_EPOCH
old-epoch=sample_rejected_epoch pending=true
old-cache=sample_rejected_old_cache pending=true
new-acquisition=sample_good state=FRESH value=64
connection demo: PASS
```

t=100 的相同值成功重新取得，只更新 acquisition=100，sourceChange 保持 0。t=500 的 disconnect 不更新 acquisition。t=1000 reconnect 只建立 pending；舊 epoch 與舊 cache 都不可讓畫面變 Fresh，直到 t=1003 的新取得資料。

## 可核對欄位與趨勢

每一個 sample 都必須有 exact plain fields，並以每 epoch 的連續 seq 排序；seq 是本例接受序列，不是通訊協定的丟包、重排或補送處理。sourceChangedAt 必須是 null 或同一虛擬 clock 中不晚於 acquiredAt。舊 epoch、舊 seq、缺欄位、非 safe time 或舊 acquisition 都被拒絕，且不會刷新 freshness。原始 Bad 的 receipt 時間可更新，但 age 始終按 last Good acquisition 算。

畫面將 connection、pending、rawQuality、lastGoodAcquiredAt、lastSourceChangeAt、lastReceivedAt 與 current time 分開。Bad、Disconnected、pending 或 stale 在 trend 寫 `null` gap，不插值、不用零填補，也不因重連而寫入設備控制。

最多 64 event 和 64 trend history。超限時模型進入 fault 並 `known=false`，保留既有資料且停止新 mutation。`lastGoodAge` 只由 last Good acquisition 計算；fresh 是這個年齡維度，dataState 才是畫面可用性結論。執行 `node practice.mjs`：第一筆是合法零值（seq=1、取得時間100），第二筆是新值7（seq=2、取得時間101），預期 decision=sample_good、value=7、dataState=FRESH。只把第二筆的 `seq: 2` 改成 `seq: 1` 再執行，預期 decision=sample_rejected_seq，value仍為0、lastGoodAcquiredAt仍為100；不要改第一筆或呼叫時的now。延伸閱讀 [HMI 品質 Bad 如何避免把舊值誤認新值](/articles/hmi-bad-quality-stale-value/)。

此範例不聲稱真實 HMI、通訊驅動、資料源會提供同樣的 quality、connection、acquisition 或 source-change 欄位。移植前需把實際來源語意、時間基準與控制保護另外核對。
