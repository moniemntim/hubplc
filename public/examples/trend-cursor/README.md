# Trend cursor model

下載 `model.mjs`、`fixtures.mjs`、`demo.mjs`、`self-test.mjs`、`practice.mjs` 到同一資料夾，以 Node.js 24.19+ 執行 `node demo.mjs`、`node self-test.mjs`、`node practice.mjs`。

游標剛好命中 Good 樣點為 RAW；位於兩個 Good 樣點之間才是 INTERPOLATED；外側為 OUTSIDE；任一鄰點 Bad 為 UNAVAILABLE，不外推。事件差值僅在 fixture 宣告 `sameClockDomain=true` 時輸出，不能稱網路延遲。
