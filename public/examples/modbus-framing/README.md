# Modbus TCP 離線組框 fixture

`stream-fixtures.json` 是合成位元組流：第一個 chunk 只有 5 bytes，第二個 chunk 補完 TID `002A` 的 FC03 request，並在同一 chunk 合併另一筆 TID `002B` request。它不是 PCAP，也沒有連線設備。

`modbus-framing.mjs` 以 MBAP 前 6 bytes 的 Length 取得每筆總長 `6 + Length`，不足時保留 remainder；一個 chunk 含多筆完整 ADU 時會逐筆輸出。下載這三個檔案後，在同一資料夾可執行 `node stream-demo.mjs`，它會印出 `TID: 002A, 002B` 與 `remain: 0`。

`block-plan.mjs` 是手動 FC03/FC04 讀取清單的驗算器，不會自動拆分或連線。`block-plan-fixture.json` 包含六筆共 188 words 的清單與三種拒絕案例；下載後可執行 `node block-plan-demo.mjs`。

可在專案根目錄執行下列離線測試：

```text
node --test tests/modbus-framing.test.mjs
```
