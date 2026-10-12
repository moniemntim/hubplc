# 第三十五批：把四篇下載優先的教材改為頁面可操作

日期：2026-10-12。公開文章仍為 117 篇；本批沒有新增文章或變更發布邊界。`reviewed-local` 表示文章與合成模型在本機核對，並非 PLC、HMI 或現場設備實測，也不是 AdSense 核准證據。

## 發現與修正

- `plc-scan-cycle-io-refresh`：讀者可直接在頁面切換五次掃描的前兩行賦值順序，比較第 3、4 輪的 M11、Out 與 Applied；另可調整 0／10／20／30 ms 的短脈衝取樣區間。頁面標明理想更新值不等於端子量測。
- `plc-rising-falling-edge-button-event`：頁面預載 12 次長按案例，顯示每輪 Button、Previous、Rise、Fall 與 CommandCount；讀者可接續取樣、放開再按，或從初值重設。
- `hmi-numeric-range-step-validation`：頁面能輸入工程文字並分辨範圍與步距拒絕、接受後的 wire 更新，以及 raw 字串型別拒絕。完整 raw envelope 驗證仍在既有離線模型中。
- `hmi-setting-value-change-confirm-readback`：頁面比較 accepted、相同數字但 operationId 錯誤、明確版本衝突與完整關聯讀回。只有明定的完整證據分支顯示 applied。

四篇保留原有下載模型供進階核對，頁面互動只涵蓋文章明列的合成情境。未知讀回情境不會落入 applied 分支。

## 本機驗證

- `node scripts/prepare-articles.mjs`：117 篇公開文章；`node --experimental-strip-types scripts/prepare-site.mjs`：204 個 sitemap URL；`node scripts/editorial-review-status.mjs --write`：117 reviewed-local、333 unreviewed、1 draft。
- `node --experimental-strip-types --test tests/*.test.mjs`：458/458 通過。新測試逐案例比較頁內與可下載模型，並檢查非法讀回情境。
- `node node_modules/typescript/bin/tsc --noEmit`、`node node_modules/oxlint/bin/oxlint`、受影響程式碼的 `oxfmt --check` 與 `git diff --check` 通過。
- `node node_modules/vinext/dist/cli.js build`：205 個路由預渲染；Wrangler `deploy --dry-run` 通過。
- 正式建置的本機伺服器上，兩支新瀏覽器測試實際點擊 PLC／HMI 教材；`tests/content-value-layout-browser.mjs` 檢查 18 個路由在 320／768／1440 px；`tests/article-browser.mjs` 檢查全部 117 篇公開文章，均通過。

以上僅記錄本機與 dry-run。Google 對「缺乏價值的內容」的判定屬外部審查，須以 AdSense 網站詳情頁的最新狀態為準。
