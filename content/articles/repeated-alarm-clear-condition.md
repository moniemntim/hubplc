---
title: 壓力警報遲滯：整數門檻、連續樣本與鎖存復歸
description: 下載 Node.js 固定壓力樣本，重播嚴格門檻、Bad／gap 重置、物理 clear 與 fresh reset edge。
date: 2026-09-21
author: 茂伯
draft: false
category: 維護與故障排查
---

## 下載固定樣本

本例是 Node.js 24.19.0 的離線 JavaScript 模型，不連 PLC、HMI、感測器或安全回路。將下列六檔存到同一資料夾：

- [model.mjs](/examples/alarm-hysteresis/model.mjs)
- [fixtures.mjs](/examples/alarm-hysteresis/fixtures.mjs)
- [demo.mjs](/examples/alarm-hysteresis/demo.mjs)
- [self-test.mjs](/examples/alarm-hysteresis/self-test.mjs)
- [practice.mjs](/examples/alarm-hysteresis/practice.mjs)
- [README.md](/examples/alarm-hysteresis/README.md)

```powershell
node self-test.mjs
node demo.mjs
```

demo 逐列印出 raw、sample quality、`evaluationKnown`、兩個 timer 起點、active、latch 與 decision；最後為 `alarm-hysteresis demo: PASS`。`quality` 是收到的樣本品質；例如 gap 那筆仍是 Good 樣本，但 `evaluationKnown=false`，明確表示不能依它做連續時間判定。完整固定輸出在 README，可逐行核對。

## 門檻和時間線

壓力一律用整數 `rawMilliBar`（mbar），不把 5.0 bar 寫成浮點比較。本例在 `rawMilliBar < 5000` 連續 2000 ms 後才把物理 `active` 變 true；已 active 後，只有 `rawMilliBar > 5300` 連續 3000 ms 才回 false。5000 與5300等號都不合格，位於遲滯帶時保留現有物理狀態。

每筆 Good 樣本最多相隔1000 ms，才採用 zero-order hold：教材假設該值可代表至下一筆的區間。這不證明真實現場連續；兩筆稀疏端點無法支持兩秒或三秒的製程結論。sample gap >1000 或 quality=BAD 都將 timer 歸零、decision 轉 UNKNOWN，但不會把已 active 或 latched 的歷史偷清掉。

固定 fixture 的關鍵時間線是：1500 ms 的 `low-2=4999` 開始 low hold，3500 ms 的 `low-active=4999` 恰好累積 2000 ms，輸出 `ACTIVE_LOW_HOLD_MET`。5000 ms 的 Bad 立即輸出 `UNKNOWN_BAD_QUALITY`，7001 ms 的 Good 雖然 quality 為 Good，因距前一筆 1501 ms，輸出 `UNKNOWN_SAMPLE_GAP`。7501 ms 重新開始 high hold，10501 ms 的 `high-clear=5400` 恰好累積 3000 ms，輸出 `INACTIVE_HIGH_HOLD_MET` 並保留 latch。

| 條件                  | active | latch | timer             |
| --------------------- | ------ | ----- | ----------------- |
| <5000 持續不足2000 ms | false  | 保留  | low timer 累加    |
| <5000 剛好2000 ms     | true   | true  | low hold 成立     |
| >5300 持續不足3000 ms | true   | true  | high timer 累加   |
| >5300 剛好3000 ms     | false  | true  | physical clear    |
| Bad 或 gap            | 保留   | 保留  | 全部歸零、UNKNOWN |

## active 和 latch 分開

`active` 是本例的物理條件結果；`latched` 記住曾經啟動的告警。物理 clear 不會自動清 latch。reset 只是 fixture 的布林輸入，不是 HMI 命令：必須先有本次 Good、fresh 的 reset=false，下一筆 false→true 才是有效 edge。fault 仍 active 時 edge 回 `RESET_REJECTED_ACTIVE`；physical clear 後仍要求本次 Good 且 `rawMilliBar > 5300`，遲滯帶內會回 `RESET_REJECTED_NOT_NORMAL`，符合時才會回 `LATCH_RESET_ACCEPTED`。本例不實作 Ack／確認人員、事件歷史、寫入未知結果或自動重啟機械。

## 可改輸入練習

執行 `node practice.mjs`。它先複製固定 fixture，讓你改 `rawMilliBar`、quality、reset 或 nowMs，再列印每一筆 JSON state；固定 demo 的 assert 不會受影響。已提供的練習把既有 `samples[2]`（1000 ms）從 `rawMilliBar=5000` 改為 `4999`；low hold 因此從 500 ms 開始，在 `low-4` 的2500 ms 恰好起報，不再等到3500 ms。後段 Bad 和 gap 仍會重置 clear timer，所以仍在 `high-clear` 的10501 ms physical clear。維持 nowMs 嚴格遞增的非負 safe integer，否則模型會拒絕。改成5000或5300可驗證等號不合格；插入1501 ms gap或 BAD 可確認 timer 不會偷算連續時間。

模型只會在每次 `sampleAlarm` 呼叫時計算；它沒有背景 timer。輸入回到正常那筆不會以先前樣本推斷期間是否曾短暫起報。門檻、時間、品質 enum 與 reset 規則都是教材契約，不是任何品牌 PLC timer、原生 alarm、功能安全或設備復歸規格。實際工程須以設備風險、感測器取樣、PLC task、資料品質與安全規格重新驗證。

確認與人工結案另見[警報生命週期](/articles/alarm-acknowledge-clear-occurrence)。本文與該模型尚未接線整合；若 evaluationKnown=false，不能把保留的 active=false 當成新的 Clear 事件轉送。
