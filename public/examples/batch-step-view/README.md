# Batch-step HMI snapshot projection (offline)

這是 Node.js 24.19+ 的離線、單記憶體、**純讀取**案例。從同一下載資料夾保留
`model.mjs`、`fixtures.mjs`、`demo.mjs`、`self-test.mjs`、`practice.mjs`，執行：

```powershell
node demo.mjs
node self-test.mjs
node practice.mjs
```

`demo.mjs` 固定輸出七列 JSON：`waiting-level`、`waiting-quality-bad`、
`waiting-quality-unknown`、來源已報告的 `failed-timeout-as-reported`、
`controller-restart-recovery-read`，以及 HMI 重開後讀到的 `hmi-reopen-reads-new-attempt`。
控制器重啟那列已改為 `sourceEpoch=8`；接著是 epoch 8 的新 revision／attempt 讀取，最後一列是
來源明示的 `COMPLETE/PROVEN/transitionAtMs`。它們都不是頁面保留或遞增上一個 view。

每筆輸入都必須是精確 plain object，且只接受受限的 batch/recipe/step 文字、正整數
epoch/revision/attempt、列舉 state/quality/reason，以及精確的 completion 物件。所有
`nowMs`、`acquiredAtMs`、`transitionAtMs` 在同一個非負 safe-integer 虛擬 clock；
`transitionAtMs <= acquiredAtMs <= nowMs`。本例的 freshness window 是 5000 ms，
`nowMs - acquiredAtMs >= 5000`（等號含）會輸出 `SOURCE_STALE` 和 `Unknown`，而不是保留舊的
完成畫面。`nowMs < acquiredAtMs` 也拒絕。

`WAITING` 的 Good 品質只可使用製程／閥回饋等待原因；Bad 或 Unknown 品質只能使用
`DATA_QUALITY_UNAVAILABLE`。完成只有來源明示 `state=COMPLETE`、`quality=GOOD`、`completion.status=PROVEN`，並提供不晚於
snapshot 的 `conditionEvidence` 和 `transitionAtMs` 時才可投影。等待/執行/失敗/Recovery 都必須是
`NOT_PROVEN`；例如 `WAITING` 卻附 `PROVEN` 證據是 `SOURCE_REJECTED`。來源可明示
`quality=UNKNOWN`，但僅在 `RECOVERY_REQUIRED` 顯示，並不代表成功。

`PROCESS_TIMEOUT` 只是 fixture 中**控制器已報告的原因**。此 renderer 不以 120000 ms 或任何
來源時間自行計時、宣告 timeout、完成、Retry、Resume、送命令或修改 step/attempt。HMI 重開的做法是
丟棄本地 view，再讀同一份或更新後的權威 snapshot；它不會重送任何命令。

練習：修改 `practice.mjs` 的 `attempt: 2` 成 `attempt: 0`，執行 `node practice.mjs`；預期
`code` 變成 `SOURCE_REJECTED`、`view.status` 保持 `UNKNOWN`、`completion` 為 `NOT_PROVEN`。
這項練習只改輸入資料，不會令固定的 `demo.mjs` assertion 失敗。
