# TimedShelve 離線模型

這是 Node.js 24.19+ 可執行的自訂 TimedShelve 教學模型。下載同一資料夾的 `alarm-shelving.mjs`、`fixtures.mjs`、`demo.mjs`、`policy-demo.mjs`、`self-test.mjs`、`practice.mjs` 後執行：

```powershell
node demo.mjs
node policy-demo.mjs
node self-test.mjs
node practice.mjs
```

`demo.mjs` 的逐步結果如下；t=10 明確呼叫 `advance(10)`，因此不需要新 source sample 也會在等號到期解除：

| time               | source active | shelved | alarm visible | quality warning |
| ------------------ | ------------- | ------- | ------------- | --------------- |
| 0 sample           | true          | false   | true          | false           |
| 0 TimedShelve 10ms | true          | true    | false         | false           |
| 10 advance         | true          | false   | true          | false           |
| 12 clear sample    | false         | false   | false         | false           |

TimedShelve 只遮蔽 `alarmVisible`。`active`、`ackedSnapshot`、`quality`、`fresh` 都是來源快照或推導狀態，沒有 Ack 實作。Bad sample 保留最後 Good sample 的 active/acked，不能把壞資料中的 false 當成 Clear；重送或舊 sourceAt 不會刷新 freshness。Bad quality 或 stale freshness 的 warning 永遠不因 shelve 被隱藏。

## 請求與有限界

`shelve` 請求必須是精確的 plain object：

```js
{ epoch: 1, requestId: 'R1', actor: 'Operator', owner: 'OP17', reason: 'noisy during check', durationMs: 10 }
```

欄位不可少、不可多；epoch 必須等於目前 epoch；ID 拒絕尾端換行，owner/reason 為 1..120 個非控制字元。期限為 1..30000ms，時間必須是不倒退 safe integer，並在相加前檢查 overflow。同 requestId 與同一固定 JSON payload 回放但不延長期限；改內容衝突。要重新 shelve，先 `unshelve`，再送新的 requestId。

最多 8 個 shelve 記錄、16 個成功重播鍵、64 個 log；上限可調低測試但不可調高。每個操作預留兩筆 log：先處理到期、再記操作。log 不足時設 `fault=log_capacity`、`known=false`，保留 records；任一 fault 後所有 mutation 回覆 `fault_blocked`。shelf/ledger 滿亦 fault，不會靜默淘汰。

`restart` 是本例自訂策略：新 epoch 將 source 設為 Unknown、把當前 shelf 標記為 restart 結束並設 `known=false`；歷史 shelf 與重播鍵保留。舊 epoch 的相同成功請求只能得到 historical replay，不能建立新 shelf 或延長期限。它不是 OPC UA 重啟規範，也不會解除 fault。

修改 `practice.mjs` 的 duration、owner 或 reason 後執行。預期 `expiry=30100` 且 `shelved:true`；若把 duration 改超過 30000，會得到明確拒絕而非截斷。

本模型是單行程記憶體範例，不是完整 OPC UA、持久化歷史、真實認證、HMI 通知、PLC 通訊、out-of-service 或安全控制實作。
