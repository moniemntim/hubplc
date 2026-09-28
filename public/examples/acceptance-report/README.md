# 離線 FC03 報告與驗收表範本

`run-fc03-report.mjs` 是可實際執行的離線教學工具：它只讀取 `fc03-known-frame-input.json` 內的固定位元組，寫出結果與 manifest，且不開網路、序列埠或任何硬體連線。結果中的 `hardware_tested: false` 是這個範例的重要限制。

在此目錄執行：

```text
node run-fc03-report.mjs
```

它每次建立新的 `runs/<run_id>/` 子目錄，並寫入兩個輸出：

- `results.json`：固定 PDU 的功能碼、byte count、數值與檢查結果。
- `manifest.json`：執行器、輸入與結果的 SHA-256，以及本次離線執行資訊。

輸入和執行器檔案內容相同時，它們的 SHA-256 必須相同；結果含 `run_id` 和產生時間，結果檔的 SHA-256 會不同。這支執行器永遠輸出 `hardware_tested: false`，不能把它改成硬體測試結論。

`acceptance-status-template.csv` 是空白的資料列範本，不代表任何產品、配置或需求已支援。填寫時每列只能使用 `pass`、`fail`、`not_run`、`blocked`、`not_applicable` 或 `invalid` 其中之一；`pass` 必須有實際結果與證據位置，`not_applicable` 必須有配置或需求依據。

不要在公開輸出填入密碼、token、個資、內網位址或無法公開的附件路徑。硬體、寫入或實體輸出驗證另依專案授權、隔離、停止和回復程序進行。
