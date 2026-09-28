# 第四批：掃描、寫入責任與呼叫時序

本批讀完並修正四篇正文，延續全部 449 篇發布文章的逐篇審查。保留原網址；掃描文章只解釋時序，重複寫入文章負責決策與寫入來源，兩者交叉連結，刪除重複 FAQ 與無法判定通過的答案。

## 範圍與接受條件

- plc-scan-cycle-io-refresh：兩種程式順序的五次掃描、半開區間短脈衝取樣；下載後可獨立執行。
- plc-duplicate-coil-multiple-assignment-debug：AB/BA 寫入追蹤、固定 OR 請求與 Stop/Alarm 阻擋、全部 16 組布林結果。
- plc-subprogram-call-frequency-edge-timer：跳過呼叫、保留 Q 重複採用、恢復高位及漏掉脈衝；自訂計時政策不能冒充 TON 驗證。
- plc-forcing-vs-simulated-input：CODESYS 隔離 Simulation 操作、完整 ST 與未填寫實測欄的紀錄表；命令語意有文件依據，沒有聲稱編譯或執行通過。

## 主要修正與來源

Mitsubishi SH-080807ENG-AF §2.8.1 支持 refresh mode 在順序程式前批次更新；§2.8.2 direct mode 有不同時序。附件是獨立 JavaScript 模型，不含 QCPU 執行環境、模組延遲或電氣結果。

重複寫入原文的「1 或依規格」改為本例固定 1；各來源也應有唯一的計算責任。明列純組合邏輯解除 Alarm 後會恢復仍存在的請求，不能被當成人工復歸或防止再啟動功能。

CODESYS Function Block 文件支持實例輸出與內部資料保留；Forcing and Writing 文件描述程式前後施加強制。Write 的單次值若只監看一掃描會漏看，故需保留診斷證據，而非假設肉眼可追上任務週期。

## 驗證記錄

- `node --experimental-strip-types --test tests/*.test.mjs`：168/168 通過，記錄在 outputs/editorial-review/unit-tests-batch4.log。
- `tsc --noEmit`、全專案 `oxlint` 通過；新增 7 個 JavaScript／測試檔格式檢查通過，補充邊界測試後再次格式化並檢查 lint。
- 3 個 CLI demo 在獨立暫存資料夾、僅複製文章下載檔的情況執行成功；記錄在 outputs/editorial-review/standalone-batch4.json。
- CSV 經 Import-Csv 核對 7 列、來源代碼 1/2、W1/F1 預期欄位及全部 not_run。ST 未由 CODESYS 編譯或執行。
- prepare-articles、prepare-site、Vinext build 成功，449 篇文章／507 個 URL。
- 列表、4 篇文章、404 的 320/768/1440px 共 18 組瀏覽器檢查通過。
- 49 個正文連結附件 HTTP 200，與 public 來源逐位元組相同。
- 獨立複核確認掃描表、16 組布林與下載內容相符；補強 Stop 非安全功能的界線與 BA 完整寫入追蹤斷言。

目前 26 篇 reviewed-local、423 篇 unreviewed、1 篇 draft。已完成的是本批四篇，不是全站。未提交或發布本批修改；實機與原廠模擬器驗證仍未執行。
