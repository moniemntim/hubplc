# Alarm lifecycle model

這是 Node.js 24.19+ 可離線執行的教學模型。下載同一資料夾的 `alarm-lifecycle.mjs`、`fixtures.mjs`、`demo.mjs`、`workflow-demo.mjs`、`self-test.mjs`、`practice.mjs` 後，執行：

```powershell
node demo.mjs
node workflow-demo.mjs
node self-test.mjs
node practice.mjs
```

`demo.mjs` 固定輸入依序是 O1 Active、Ack、Clear；O2 Active、Clear（不 Ack）；O3 Active，最後 Ack 舊 O2。它逐列輸出四種 Active/Acked 組合並檢查舊 occurrence 不會確認 O3。

`workflow-demo.mjs` 則依序輸出 Active 時拒絕 Resolve、Operator 拒絕 Resolve、舊 revision 衝突，以及 Clear+Ack 後 Supervisor 成功 Resolve。

## 教學契約

- `sourceCondition` 的上升沿才建立 occurrence；Ack 只改 `acked`，Clear 只改 `active`。
- Ack 請求必須有完全一致的 `occurrenceId`、`expectedRevision`、`requestId`、`actor`、`comment` 欄位。ID 是有界 ASCII，revision 為正 safe integer，comment 為 1..120 個非控制字元且不可只有空白。
- 成功 Ack 的同一 `requestId` 和同一固定 JSON 內容回放 `ack_replay`；同 ID 不同內容為衝突。版本不符不覆寫資料。成功 Ack 會保存 `ackActor`、`ackAt` 與 `comment`。
- workflow 請求也帶 `expectedRevision`；`Open -> InProgress -> Resolved` 每一步都加 revision。Resolve 要同時滿足 inactive、acked、Supervisor 與非空 evidence。
- 本例最多保存 8 個 occurrence、16 個成功 Ack 重播紀錄、128 筆 log。上限可在 `initialLifecycle` 調低作測試，不能調高。occurrence 滿會鎖住來源接收並留下 `occurrence_capacity` fault，等待外部處置，絕不自行復原；log 滿保留狀態與 log，僅給 `lastDecision=log_capacity_fault`。
- log 每筆有 `seq`、`time`、`occurrenceId`、`action`、`actor`。虛擬時間必須是非遞減 safe integer。

`practice.mjs` 的第二個同ID請求使用 different comment，應 ack_request_conflict；把 secondComment 改 seen，應 ack_replay。兩者都保留 revision=2、ackAt=2、原comment，仍新增診斷log。工作流文章另下載 workflow-practice.mjs，預設Supervisor結案為Resolved/v5；改Operator後拒絕並保留InProgress/v4。

這是單行程、單記憶體模型；每個被接受的操作把 state 和 log 一起更新。它沒有持久化、不可變稽核、OPC UA、真實驗證、裝置 Reset、PLC 通訊、通知、去抖或來源品質判定。
