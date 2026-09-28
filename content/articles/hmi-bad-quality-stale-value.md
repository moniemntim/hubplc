---
title: HMI 品質 Bad 如何避免把舊值誤認新值
description: 以可執行的顯示投影分開原始品質、last Good、取得時間、接收時間與趨勢缺口。
date: 2026-09-21
author: 茂伯
draft: false
category: HMI 畫面與操作
---

## 先核對本例的顯示契約

本例是 Node.js 24.19+ 的 HMI 顯示投影，不是 PLC、OPC UA 客戶端、控制命令或 watchdog runtime。它保存原始自訂 `quality`、connection，以及最近一次 Good 的 value；Bad 不會覆寫 last Good，也不會塞入假零。合法的 `0` 仍是有效數值，未知或尚無 Good 則是 `null`。

同一虛擬單調 clock 下，sample 固定帶 `epoch`、`seq`、`value`、`quality`、`acquiredAt`、`receivedAt`、`sourceChangedAt`。`acquiredAt` 是來源成功取得資料的契約時間，不能因 HMI 收到快取就自行假設；它必須不晚於 `receivedAt`，而 receivedAt 不晚於現在。sourceChangedAt 必須是 null 或同一 clock 中不晚於 acquiredAt。seq 是本例的接受序列，不是通訊協定的丟包、重排或補送處理。

畫面分別顯示：last Good acquisition、lastGoodAge、last source change、最後原始 received time 與 current time。fresh 只計算 `current - lastGoodAcquiredAt < 2000ms`。sourceChangedAt 僅是描述欄位；沒有可信 source clock 時，本例不宣稱 source age。

## 下載與品質 demo

下載同資料夾的 [model.mjs](/examples/hmi-quality/model.mjs)、[fixtures.mjs](/examples/hmi-quality/fixtures.mjs)、[quality-demo.mjs](/examples/hmi-quality/quality-demo.mjs)、[connection-demo.mjs](/examples/hmi-quality/connection-demo.mjs)、[self-test.mjs](/examples/hmi-quality/self-test.mjs)、[practice.mjs](/examples/hmi-quality/practice.mjs)，執行：

```powershell
node quality-demo.mjs
node self-test.mjs
node practice.mjs
```

固定輸出：

```text
t=0 state=FRESH value=0 acquired=0 sourceChange=0 received=0 trend=0
t=500 state=BAD_LAST_GOOD value=0 acquired=0 sourceChange=0 received=500 trend=null
t=2500 state=FRESH value=0 acquired=2500 sourceChange=0 received=2500 trend=0
t=4500 state=STALE value=0 acquired=2500 sourceChange=0 received=2500 trend=null
quality demo: PASS
```

Bad 在 t=500 的 raw receipt 不會改 last Good acquisition=0；趨勢輸出 null gap。t=2500 是相同的合法零值但有新的 acquisition，所以 acquired/received 更新；fixture 明確宣告 sourceChange=0，才會保留 0。相同值本身不能推論來源未變。t=4500 恰好 lastGoodAge=2000，嚴格 `<2000` 因此 Stale，不以舊值延長曲線。

## 畫面規則與限制

Bad 可保留 last Good 供診斷，但畫面必須標成 `BAD_LAST_GOOD`，不可把它當成目前量測。trend 對 Bad、pending、Disconnected、Stale 與拒絕資料都輸出 null，絕不插零。此投影不會自動寫控制或在重連後重送控制命令。

最多保存 64 個事件與 64 個趨勢點。滿時進入 `history_capacity` fault 並標 `known=false`，保留既有資料、停止 mutation，不以無限拒絕日誌掩蓋容量問題。

既有 [通訊停止與資料品質 watchdog](/articles/communication-stop-data-quality-watchdog/) 是不同的 offline watchdog/runtime 模型，不能直接與本投影合併或推導彼此狀態。延伸閱讀 [HMI 斷線與資料暫停的顯示及驗收](/articles/hmi-disconnected-data-paused-display/)。執行 `node practice.mjs`：第一筆是合法零值（seq=1、取得時間100），第二筆是新值7（seq=2、取得時間101），預期 decision=sample_good、value=7、dataState=FRESH。只把第二筆的 `seq: 2` 改成 `seq: 1` 再執行，預期 decision=sample_rejected_seq，value仍為0、lastGoodAcquiredAt仍為100；不要改第一筆或呼叫時的now。
