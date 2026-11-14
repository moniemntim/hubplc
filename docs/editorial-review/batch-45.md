# 第四十五批：工具網站首頁與導覽

日期：2026-11-15。依使用者指示，正式網域維持 `hubplc.com`，網站定位改為工具站；參考 `https://lab.sp88.com.tw/` 的用途分類與入口排列，整理現有工具。使用者選擇保留 PLC／Excel 文章舊網址，移出首頁與主選單。

## 改動

- 首頁直接提供 57 個工具的搜尋、分類篩選、建議關鍵字與四個快速入口。預設以 PLC 與通訊 6 個、電路 22 個、編碼 10 個、單位與時間 19 個分區，卡片保留用途摘要；中英文同步。
- 首頁移除文章推薦、文章統計與 Excel 課程區塊。共用主選單改為全部工具、使用說明與問題回報；工具頁結尾導回首頁或問題回報。53 篇公開文章與原網址、文章目錄、Excel 課程、作者證據及發佈門檻維持。
- 原 `/tool` 與 `/tool/` 以單次 308 轉到首頁，保留查詢參數。原有 25 組退役計算器轉址不變。移除重複目錄頁並從 sitemap 排除 `/tool`，目前 sitemap 115 個網址，含 404 共預渲染 116 條路由。
- 更新首頁 SEO、關於工具、問題回報及隱私說明。自動語言選擇與手動偏好擴及首頁、About 與隱私頁；文章閱讀語言維持既有行為。
- 首頁作為工具目錄不載入 AdSense，編碼分類的敏感工具也繼續不載入；一般計算頁及既有文章的廣告配置沿用。首頁及主選單沒有恢復已移除的公開編輯說明。

## 驗證

- 日期紀錄驗證 169 筆、文章產生器 53 篇、站點產生器 115 個網址。
- `node --experimental-strip-types --test --test-reporter=dot tests/*.test.mjs`：468 項通過。
- `tests/legacy-tool-redirects.mjs`：實際本機 Worker 兩項整合測試通過，涵蓋 50 個原轉址入口、2 個目錄轉址、保留重複參數、一跳抵達 200、語言 API 與靜態資源。
- `tests/tool-home-browser.mjs`：最終版首頁 57 個 SSR 工具連結、四分區、搜尋、清除、篩選、空結果復原、快速入口、往返導覽、語言、舊目錄與保留文章網址通過。檢查 320／768／1440px，沒有頁面溢位；無 JavaScript 時仍可取得全部工具連結。
- `tests/locale-browser.mjs`：最終版國家預設語言、手動偏好保留、英文介面，以及首頁／工具導覽九種寬度通過。
- `tests/browser-smoke.mjs`：57 個工具於桌面／手機共 114 次路由、重新載入、輸入清空、範例、搜尋、鍵盤、Big5 複製與 QR 下載解碼檢查通過。最後分類版型調整後，另重跑首頁及語言回歸。
- `tests/power-intent-browser.mjs` 與 `tests/article-evidence-browser.mjs`：原有案例、電力整併、公開文章與暫停公開文章邊界通過。
- `tests/layout-browser.mjs`：最終版首頁、About、隱私、文章目錄、Excel、兩個代表工具與 404，三種寬度共 24 次版面檢查通過；`tests/adsense-browser.mjs` 的 63 個 HTML 頁面與廣告位置檢查通過。
- `scripts/verify-site.mjs`：最終版 62 個主要頁面、目錄轉址、canonical、sitemap、robots、ads.txt 與真正 404 通過。
- TypeScript、oxlint、變更檔案的 oxfmt 與 diff 檢查通過；Vinext 最終建置成功，預渲染 116 條路由。已檢視桌面／手機截圖。

本機報告與截圖位於忽略版控的 `outputs/tool-home/`。正式發布等待對應 Git 提交的 Cloudflare Build 成功後，再以 `outputs/tool-home-release-2026-11-15/` 記錄正式站首頁互動、轉址、語言及全站響應式驗收。本次不代送 AdSense 複查。
