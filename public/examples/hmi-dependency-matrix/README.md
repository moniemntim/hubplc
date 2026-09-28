# HMI dependency matrix fixture

這是平台中立的教學 fixture，不是 HMI 專案、PLC 程式、資料庫備份或可匯入的廠商設定。

## 檔案

- `dependency-matrix.csv`：方向為 `from_id` 使用 `to_id` 的關係圖。
- `fixtures/history-temp-v1.csv`：基準資料契約，含 `temp_avg`。
- `fixtures/history-temp-v2-renamed.csv`：欄位改名候選契約，含 `temperature_mean`，刻意不含 `temp_avg`。
- `fixtures/history-flow-v1.csv`：沒有溫度資料集關係的資料集。
- `fixtures/roles.csv`：教學用預期權限，不能證明執行期帳號權限。
- `expected/daily-temperature-report.csv`：從 v1 的 Good 有效值算出的預期報表列。
- `verify-fixtures.ps1`：不依賴外部模組的結構、改名前後列值與關係檢查。

## 執行

在此資料夾執行：

```powershell
powershell -ExecutionPolicy Bypass -File .\verify-fixtures.ps1
```

預期結果：從 `dataset:history-temp` 可達的資源是 `screen:temperature`、`screen:overview`、`report:daily-temperature` 與 `screen:daily-report`；`screen:flow` 不可達。v1 有 `temp_avg`，v2 不含它且有 `temperature_mean`；v2 的時間、設備、品質與改名前數值都必須和 v1 同列一致。程式會另外重算 v1 的 Good 值平均 22、有效數 2、空值數 1，並與預期報表比較。

PASS 僅驗證此範例的 CSV 結構、關係與數學結果。把它轉換成實際專案時，應以該平台的設定匯出、受控帳號與實際執行紀錄補上 `evidence`，並驗證畫面、報表、排程、快取與權限。
