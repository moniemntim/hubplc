# 第20批：手自動與維護模式共用案例

2026-09-28完成兩篇實質重寫，接續第19批已全文閱讀的原文；保留日期與作者。共用public/examples/mode-ownership七附件，未另外複製授權或兩套模式機制。

- 手自動：請求與確認模式/控制權分開、等待停止/自動待命、回覆遺失保留Unknown再查原ID、新ID BUSY拒絕不排隊、owner與revision檢查、返回Auto需手動待命與流程起點。
- 維護：Manual→Maintenance→Manual，禁止直接Maintenance→Auto；testStopped/restoreReviewed分別等待。工作單的隔離未驗證、功能測試未執行明示，模式成功不改成實機通過。
- 模型只有記憶體狀態，沒有輸出、網路、登入、PLC或安全功能；signals/scan由可信fixture注入，不能當HMI自行填寫的控制條件。
- 所有時間為虛擬單調ms。age<1000才可用，5秒deadline等號逾時且先於成功；只有scan推進模式。最多16請求且不淘汰結果。view輸出來源條件副本。

主線檢查並實跑：

- tests/mode-ownership.test.mjs：共用self-test覆蓋duplicate/conflict/BUSY、stale revision/owner、4999/5000、Bad/Unknown/interlock、取消、資料過期、維護退出、容量、拷貝不改內部與非法時間/shape。
- 全站410/410測試，unit-tests-batch20.log。
- tsc --noEmit、全專案oxlint、本批10檔oxfmt --check及git diff --check通過。
- standalone-batch20.mjs：兩篇各複製七附件到獨立資料夾；10條CLI、正文stdout及10次修改案例實跑通過。
- prepare-articles、prepare-site、Vinext build通過：449發布文章、507 sitemap URLs，build-batch20.log。
- 列表/两篇/404在320/768/1440共12排版檢查通過；layout-batch20/report.json。
- 全文277附件HTTP成功且與public來源逐位元組相同。

累計87篇reviewed-local、362篇unreviewed、1篇draft；發布證據另存release輸出。整體審查尚未完成。
