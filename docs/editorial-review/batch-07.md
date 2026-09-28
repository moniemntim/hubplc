# 第七批：批次配對、積壓、延遲重試與冪等

上一輪為 progress：四篇實質重寫、201 項測試、建置、18 組版面與 76 個附件驗證完成。本輪起點經 ledger 雜湊核對為 35 篇 reviewed-local、414 篇 unreviewed、1 篇 draft；仍保留全部 449 篇發布文章的目標。

## 本批工作

- async-out-of-order-pending-map：沿用前批 FC03 matcher，新增兩筆並行讀取與 all／partial 顯示，避免複製另一套 epoch／deadline 契約。固定值 A=100/200、B=300/400；duplicate、unknown 與錯長度不增加更新次數，B 過期時 A 成功也不等於整批完成。
- plc-task-timeout-reentry-backlog：固定到達率、服務時間、等待容量與同時刻順序，附 FIFO 時間表。主線要求把工作生命週期與函式 BEGIN／END 分開，避免把正常跨掃描等待錯稱為執行重入。
- latency-injection-timeout-retry：實際開啟臨時 loopback HTTP GET server，區分真實主機測量與虛擬 deadline 模型。實際三次 client timeout 後 server 仍完成三次工作；記錄當次輸出，沒有改網卡設定或發送外部／設備寫入。
- idempotency-key-duplicate-write：以本機 SQLite 同一交易內的去重、計數更新與結果保存建立可重播邊界；實體 PLC 的未知效果另列，不宣稱本機資料庫等同物理設備只執行一次。

## 證據界線

Node loopback 是本機 HTTP 實驗；虛擬時間線與 FIFO 是合成模型。SQLite 的程序中止／重開驗證不等於硬體斷電，也不等於外部設備驗收。未取得 PLC 型號與追蹤證據，不宣稱任何 Q 系列中斷或排程規則已測過。

## 整合檢查

- 主線已完整閱讀四篇與新增程式，核對委派範圍，修正工作／呼叫生命週期混用、缺資料分類過度肯定，以及交易分支的文字描述。
- `node --experimental-strip-types --test tests/*.test.mjs`：216/216 通過，見 outputs/editorial-review/unit-tests-batch7.log。另執行 public FIFO 自測 4/4。
- `tsc --noEmit`、全專案 `oxlint`、本批 18 個附件／測試的 `oxfmt --check` 通過；`git diff --check` 通過。FIFO JSON 格式檢查一度失敗，修正格式後通過。
- 只複製正文列出的下載檔到獨立暫存目錄，四篇共六條指令均成功，見 outputs/editorial-review/standalone-batch7.json。SQLite stdout 與文章、README 完整相同；公開 HTTP 觀察紀錄中的全部測量值與正文一致。
- SQLite demo／tests 的遞迴清理先檢查解析後的暫存路徑、標記及擁有權；crash child 不接受任意既有資料庫路徑。
- Node Timers、HTTP、SQLite API 與 SQLite Transaction／Atomic Commit 官方文件已開啟核對。HTTP timeout、SQLite child exit 都只按實際測試範圍陳述。
- prepare-articles、prepare-site 與 Vinext build 成功：449 篇文章／507 URLs，見 outputs/editorial-review/build-batch7.log。
- 列表、四篇正文與 404 在 320／768／1440px 共 18 組版面檢查通過，見 outputs/editorial-review/layout-batch7。
- 全站正文連結的 91 個附件 HTTP 200，與 public 來源逐位元組一致。

累計 39 篇 reviewed-local、410 篇 unreviewed、1 篇 draft；ledger 保存四篇最終文字雜湊。全文目標尚未完成，這些重寫批次仍未提交或發布；沒有 PLC／實體 I/O／硬體斷電驗證。
