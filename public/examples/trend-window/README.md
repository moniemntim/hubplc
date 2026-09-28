# Trend window contract

下載 `model.mjs`、`fixtures.mjs`、`demo.mjs`、`self-test.mjs`、`practice.mjs` 至同一資料夾，以 Node.js 24.19+ 執行：

```powershell
node demo.mjs
node self-test.mjs
node practice.mjs
```

資料是非重疊的半開 segments `[startMs,endMs)`；segment 覆蓋到 window 才算已知。Bad segment 或空 gap 不補零。輸出 `knownDuration`、`coverage`、`knownMeanC`；只有 coverage=1 時才有 `fullWindowMeanC`。累積採 BigInt 的 duration×tenths，避免乘法溢位；raw seed 和 changes 也採相同有界 tenths 值域。

固定資料：全天 `[0,86400000)` 大多 60°C，`[10:09,10:10)` 是 75°C。`[10:00,10:10)` weighted=61.5°C，全天 weighted=60.010416666666664°C、max=75°C。`rawChangeSimpleMean` 的 67.5°C 是 seed=60 加變更點=75 的簡單平均；10:00 沒有 raw row，它不是窗口樣本平均。

修改 `practice.mjs` 的 spike segment `startMs += 30000`，可看到 75°C 時間縮短、窗口 weighted 與 coverage 可核對。把 spike quality 改 Bad 則 fullWindowMeanC 為 null，knownMeanC 保持已知段平均；不要把它叫完整平均。

此為自訂離線合約，未實作資料來源品質協定、HMI、PLC、插值或控制寫入。品質／舊值顯示請另外看站內 HMI 品質文章，不能直接當成同一 runtime。
