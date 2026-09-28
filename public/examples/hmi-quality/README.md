# HMI quality display projection

Node.js 24.19+ 的離線、單記憶體顯示投影範例。下載同資料夾的 `model.mjs`、`fixtures.mjs`、`quality-demo.mjs`、`connection-demo.mjs`、`self-test.mjs`、`practice.mjs` 後執行：

```powershell
node quality-demo.mjs
node connection-demo.mjs
node self-test.mjs
node practice.mjs
```

契約使用一個非遞減 safe-integer 虛擬 clock。sample 需有精確欄位 `epoch`、`seq`、`value`、`quality`、`acquiredAt`、`receivedAt`、`sourceChangedAt`；`acquiredAt <= receivedAt <= now`，而 sourceChangedAt 必須是 null 或同一虛擬 clock 中不晚於 acquiredAt。每 epoch 的 seq 必須剛好等於預期值。seq 是本例的接受序列，不是通訊協定的丟包、重排或補送處理。

- 只有 Good、有限數值、有效 epoch/seq 且新的 acquisition 能更新 last Good。
- Bad 更新 raw quality/receivedAt，保留 last Good value 和 acquisition；不寫 0。valid `0` 是正常值。
- 相同值但新的 acquisition 更新 acquired/received，保留 `lastSourceChangeAt`。
- view 也輸出 `lastGoodAge`。fresh 定義是 `now - lastGoodAcquiredAt < 2000`；sourceChangedAt 只供描述，source 時鐘未知時不聲稱 source age。
- reconnect 建立新 epoch 和 pending；舊 epoch、錯 seq 或 acquisition 不晚於 reconnect 的快取，不能解除 pending。
- trend 在 Bad、斷線、pending、stale、拒絕事件寫入 `null` gap，不插零，也不寫控制命令。

最多 64 筆 event 與 64 筆 trend history；滿時設 `fault=history_capacity`、`known=false`，保留原資料並停止後續 mutation。這個 projection 不能直接和 `public/examples/data-quality` 的 watchdog 模型拼接：兩者的 runtime、失效與接受契約不同。

修改 `practice.mjs`：將 `value: 0` 改為 `7`、`acquiredAt/receivedAt: 101`、`seq: 2`，預期 Fresh 的新值 7；再把 seq 改回 1，預期 `sample_rejected_seq`。合法零仍顯示 `value:0`；模型不補預設值。
