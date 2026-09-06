# 工具區驗證紀錄（2026-09-07）

## 通過的檢查

- `npm test`：29 項通過，包含原函式相容性、文章草稿排除、計算邊界與往返、CRC、暫存器排列、QR 獨立解碼、Big5、所有相容單位往返。
- `node node_modules/typescript/bin/tsc --noEmit`：通過。
- 對全部變更的 TS／TSX／MJS 執行 `oxlint`：通過。
- 對全部變更檔案執行 `oxfmt --check`：通過。
- `npm run build`：21 個靜態輸出路由（含 404），0 跳過。
- `wrangler deploy --config deployment/wrangler.jsonc --dry-run`：通過。
- `npm run test:browser` 對 Wrangler 靜態輸出執行：1280px、390px 共 30 組工具頁直接開啟、重新整理、SEO、無橫向溢出與無效輸入檢查；導覽、搜尋、鍵盤分類、類比預設、Big5 複製／快捷鍵及 PNG／SVG 實際下載通過，下載的兩種格式均經 jsQR 獨立解碼。無瀏覽器錯誤。
- 原 4–20 mA WebMCP 以 `{current:12,low:-50,high:150}` 驗證返回 `{value:50,percent:50,outside:false}` 並同步介面。
- `node --experimental-strip-types scripts/verify-site.mjs`：20 個正常頁面、canonical、sitemap、robots、真正 404 通過。`ads.txt` 精確比對含檔尾換行，200、`text/plain; charset=utf-8`。

## 既有檢查限制

全專案 `npm run lint` 仍回報 25 個既有問題，位於未修改的 `components/ui`、`hooks/use-mobile.ts`、`tests/articles.test.mjs` 及 `tests/calculators.test.mjs`。已以 Git 差異確認這些檔案沒有變更；未停用規則或降低檢查標準。新增與修改程式的 scoped lint 通過。

鎖定版本的本機 Wrangler runtime 最高支援 2026-05-22，故本機 `npm start` 使用此日期；正式部署設定保留原日期。正式輸出採標準頁面連結，避免 Vinext beta 的 RSC 預載錯誤。

測試圖片、下載檔案與 JSON 報告放在忽略版控的 `outputs/`。正式網站部署後另以相同 HTTP 與瀏覽器腳本驗證。

## 回復基準

本次更新前 GitHub main 為 `27fdc6756a1536e5a9100bf877c430c8508b15da`。透過 revert 本次提交並重新部署可回復；不需資料遷移。
