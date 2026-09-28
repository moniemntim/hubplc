# 第五批：測試覆蓋、取樣與清場

上一輪判定為 progress：工作區有 26 篇經雜湊比對的 reviewed-local 文章、可執行附件及 168 項通過測試。本輪核對盤點仍為 26 / 423 / 1，繼續全部 449 篇發布內容的實質審查。

## 本批範圍

- 異常模擬矩陣：四條獨立可重播流程、事件優先序、300 ms 邊界與識別碼生命週期。
- 單掃描 Trace：用具體時間表區分事件與取樣結果，計數保留證據不能冒充精確時間線。
- force-list-clear：原標題承諾自動列出／清除卻沒有實作，改成明確的 CODESYS 隔離案例清場；重複操作原理解說整合至前批強制值文章，以原網址保留清場目的。
- simulation-real-input-io-sensor：raw 公式、端子校驗與物理參考三層分開；軟體結果不宣稱模組或感測器通過。
- 最小重現映射：補上單檔六筆資料、錯誤與正確起點的兩組重播，移除沒有附工程檔卻像已提供工程專案的敘述；PLC 專案交接另列實際需要的資料。

## 來源及證據界線

CODESYS Simulation 文件明列 I/O 通道不更新、fieldbus 不傳送；I/O Mapping 文件說明映射與 bus cycle 的分工。Forcing and Writing 文件的查詢範圍是目前應用程式一般強制，CFC 是例外。文章只據此描述工具範圍，沒有捏造 CODESYS 執行結果。

新清場及硬體量測 CSV 各 7 列保持 not_run，另有 7 列 synthetic 算術案例。已以解析器確認欄數、結果欄與空白實測欄，公式重新計算符合；換算工具四個輸入經實際瀏覽器操作符合文章答案。

## 整合檢查

- `node --experimental-strip-types --test tests/*.test.mjs`：179/179，見 outputs/editorial-review/unit-tests-batch5.log。
- `tsc --noEmit`、全專案 `oxlint`、本批 8 個 mjs 格式檢查通過；`git diff --check` 通過。
- 三組附件複製到獨立暫存資料夾後可執行；Trace 與全文 stdout 相同，異常矩陣四個邊界結果為 DONE／ERROR／ERROR／CANCELLED，映射兩組斷言通過。
- prepared-value 清除步驟經獨立審查補齊；依 CODESYS 官方 tutorial 確認 BOOL 可切至空白，需重開宣告／Watch 確認。
- 原異常矩陣下載指令依賴 repo tests，主線移除並把可重播邊界搬進下載 fixture；另明寫預設欄位與各命令的有效起始狀態。
- Trace 模型增加 10000 筆上限，避免微小間隔或超大輸入導致無界配置；預期文字固定 LF，避免跨系統 stdout 比對漂移。
- prepare-articles、prepare-site、Vinext build 成功：449 篇／507 URLs。
- 列表、五篇文章、404 在 320/768/1440px 共 21 組版面檢查通過。
- 64 個正文連結附件 HTTP 200 且內容與 public 來源逐位元組一致。

本輪累計 31 篇 reviewed-local、418 篇 unreviewed、1 篇 draft，全文目標仍未完成。硬體、CODESYS 實際執行仍未測；本批尚未提交或發布。
