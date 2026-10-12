# 第三十四批：把基礎操作帶回頁面

日期：2026-10-12。這批針對既有公開內容的使用路徑，不新增文章，也不把字數、頁數或測試數當成 AdSense 核准證據。`reviewed-local` 僅表示目前文字與離線模型在本機核對；沒有 PLC、HMI、OPC UA 或現場硬體驗證。

## 稽核觀察

- 現有公開文章 117 篇。以 `Node.js`、`node ...mjs` 或下載 `.mjs` 搜尋，67 篇有離線程式路徑，其中 20 篇屬 HMI 主題。這個計數是閱讀障礙候選清單；「提到 Node」不等於該頁沒有價值，須逐篇看是否在安裝前已有可驗證結果。
- 全文相似度稽核沒有找到公開文章的完整重複頁。題目相近也不能單靠標題或共用模型判定應刪除；本批保留不同讀者任務，對頁內流程做針對性補足。
- AdSense 審查內部判定原因不可由程式碼、字數、測試或上述候選數量推定。

## 本批修正

- HMI 品質、斷線與趨勢：頁內重播 Good／Bad／stale、重連 epoch 與趨勢 coverage；下載的 Node 模型保留為進階路徑。coverage 只缺 1 秒時顯示 0.9983，不四捨五入成 1；完全沒有已知秒數時不顯示平均。
- HMI 模式與授權四篇：Manual 5 秒邊界與互鎖、Maintenance 退出的兩項摘要、設定值提交與派送、降權後舊佇列，各自有不同頁內結果。瀏覽器分支只涵蓋明列的合成條件，不代替完整離線模型或正式身份授權。
- 警報三篇：共用 O1 的 Active、Acked、工作狀態與 revision 互動；來源 Clear 可以發生在 Ack 前，但結案需已 Clear、已 Ack、InProgress、目前 revision、Supervisor 與非空 evidence。來源生命週期、工作流及 SOP 各自保留用途。
- PLC 浮點容差與固定小數取整：頁內可輸入邊界案例；固定絕對窗口與明訂的相對演算法分開，負數中點以 Raw100 整數規則處理。JavaScript binary64 結果不是 PLC REAL／LREAL 證據。
- RS485 無回應文章新增空白交易紀錄 CSV，要求標明觀察來源；只有 TX 燈時不能假填請求 bytes。
- PLC 進位工具增加 8-bit FF 有號／無號案例與排錯步驟。功率及單位工具的每頁任務指引另按其各自輸入、公式、限制與後續用途核對。

## 驗證與未完成項

- `node scripts/prepare-articles.mjs` 與 `node --experimental-strip-types scripts/prepare-site.mjs`：117 篇公開文章、204 個 sitemap URL；`node scripts/editorial-review-status.mjs`：117 reviewed-local、333 unreviewed、1 draft。
- `node --experimental-strip-types --test tests/*.test.mjs`：452/452 通過；`node node_modules/typescript/bin/tsc --noEmit`、`node node_modules/oxlint/bin/oxlint`、受影響程式碼的 `oxfmt --check`、`git diff --check` 均通過。
- `node node_modules/vinext/dist/cli.js build`：205 routes 預渲染；`node node_modules/wrangler/bin/wrangler.js deploy --config deployment/wrangler.jsonc --dry-run`：通過。
- 正式建置的本機伺服器：`tests/article-browser.mjs` 對 117 篇公開文章通過；PLC 數值、HMI 模式與授權、HMI 斷線與趨勢、警報、基礎內容及工具指引六支瀏覽器腳本通過。`tests/content-value-layout-browser.mjs` 對 14 個受影響路由在 320／768／1440 px 檢查元件、HTTP 200 與橫向溢位；RS485 CSV HTTP 200。
- 本段只記錄本機與 dry-run 結果；正式站發布及 AdSense 狀態另由發布後即時驗證。

剩餘的 Node 路徑候選文章仍須按主題逐頁查；目前的內容修正不能保證 Google 解除「缺乏價值的內容」。AdSense 的審查狀態以其即時網站詳情頁為準。
