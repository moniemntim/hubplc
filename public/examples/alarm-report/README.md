# 夜班警報報表：固定離線投影

本資料夾是 Node 24.19.0 測試過的離線教材。它不連接資料庫、HMI、PLC 或任何平台 API，也不是通用查詢引擎。輸入是已整理的 occurrence snapshots：每個已知 occurrence 最多一個 `ACTIVE`、`ACK`、`CLEAR` 轉移。

```powershell
Invoke-WebRequest -Uri "https://your-site.example/examples/alarm-report/model.mjs" -OutFile model.mjs
Invoke-WebRequest -Uri "https://your-site.example/examples/alarm-report/fixtures.mjs" -OutFile fixtures.mjs
Invoke-WebRequest -Uri "https://your-site.example/examples/alarm-report/demo.mjs" -OutFile demo.mjs
Invoke-WebRequest -Uri "https://your-site.example/examples/alarm-report/self-test.mjs" -OutFile self-test.mjs
Invoke-WebRequest -Uri "https://your-site.example/examples/alarm-report/practice.mjs" -OutFile practice.mjs
node .\demo.mjs
node .\self-test.mjs
node .\practice.mjs
```

固定班次是 `2026-09-16T22:00:00+08:00` 到 `2026-09-17T06:00:00+08:00`，轉換為 UTC `[2026-09-16T14:00:00.000Z,2026-09-16T22:00:00.000Z)`。demo 的 JSON 快照固定顯示：

- `activeTransitions` 是 `OCC-P01`、`OCC-P02`；只看落在半開窗口內的 `ACTIVE` 轉移。
- `unackedAtCutoff` 是 `OCC-P03`、`OCC-P02`；它只列**已知歷史**、截至 `endUtc` 前曾 Active 且未 Ack 的 occurrence。若先 Clear 但仍未 Ack，也會列出。
- `unknownHistory` 是 `OCC-P05`。空轉移不是已 Ack 或未 Ack 的證據。

`TR-P02-K-END` 恰在 `endUtc`，所以不改變 P02 的截止狀態；`TR-P04-K-LAST` 在 `endUtc - 1ms`，所以 P04 不在 unacked 結果。demo 的最後一行是可直接比對的摘要：`snapshot active=P01,P02 unacked=P03,P02 unknown=P05 coverageCompleteForFilter=false`。

`practice.mjs` 頂端的 `ackUtc` 可以改為兩個 canonical 值後重跑：`2026-09-16T22:00:00.000Z` 預期 unacked 是 `OCC-P03,OCC-P02`；`2026-09-16T21:59:59.999Z` 預期只剩 `OCC-P03`。

輸入資料和 filter 都採嚴格 shape。`sourceIds`、`priorities` 可以是 `null` 或最多四個不重複值；時間必須是 canonical UTC ISO 字串，窗口必須 `startUtc < endUtc`。輸出有 `schema`、完整 filters、coverage、三個 row counts 與穩定排序的列，因而可比較固定快照。

`coverage.complete: false` 表示整份資料的歷史 coverage 不完整；`coverage.completeForFilter` 則告訴你本次 filter 後是否仍包含未知 occurrence。`coverage.knownPrehistoryComplete: true` 只對 `history: "COMPLETE"` 的 occurrence 作出前情資料已完整的明示。`UNKNOWN_HISTORY` 不重建 state，也不會進入 unacked 陣列；正式資料保存或來源有缺口時，應用相同方式顯示待查，不能以沒有資料推論已確認。`statusAtCutoff: "ACTIVE_UNACKED"` 表示仍 Active 未確認，`"CLEARED_UNACKED"` 表示已 Clear 但仍未確認。
