# 工具區驗證紀錄（2026-09-07）

## 文字亂碼修復與常用電力工具

- 工具區由 25 增加至 29：文字亂碼修復與檔案轉碼、電池續航估算、電容放電、dBm／W。路由、搜尋分類、SEO 與 sitemap 由工具登錄資料統一更新。
- 參考 [DigiKey 工具清單](https://www.digikey.tw/zh/resources/online-conversion-calculators)及 [ifreesite 文字亂碼轉換](https://www.ifreesite.com/textconvert.htm)。DigiKey 多數基礎電路功能已有對應頁，本輪補上上述三個常用缺項，未宣稱涵蓋其全部工具或所有進階模式。
- 亂碼工具包含候選比較、手動指定、原文保留、背景 Worker、鍵盤快捷鍵、複製、12 種編碼下載及 UTF-8 BOM。檔案上限 1 MiB，貼上文字上限 20,000 UTF-16 字元單位；ISO-2022-CN／KR 不支援。候選需要使用者確認，遺失字元不能保證恢復。
- 所有資料在瀏覽器處理；未增加依賴、登入、後端、資料庫或追蹤。原 Big5 工具與既有公式未修改。新工具使用既有套件編碼器及原生嚴格 TextDecoder，避開套件 EUC-KR 無效位元組會產生 NUL 的問題。
- `npm test`：53 項通過，包括 12 種編碼、已知位元組、BOM、不可表示字元、EUC-KR 無效資料、電池單位、放電正反算、dBm 邊界與溢位。
- `tsc --noEmit`、全部變更檔案 `oxlint`／`oxfmt --check`、`git diff --check` 通過。Vite `?worker` 的預設匯出由編譯器提供，僅該匯入行針對靜態分析誤判加註 `import/default` 例外；型別、實際瀏覽器與正式組建均驗證其可用性。全專案舊 lint 問題見下方紀錄。
- `npm run build`：35 個靜態路由、0 跳過；Wrangler 部署乾跑通過（134 個資產）。背景轉換程式獨立輸出，只在執行轉換時載入。
- 正式輸出經本機 Wrangler 執行 `tests/text-and-power-browser.mjs`，1280／390／320 px 全通過。涵蓋候選選取、下載位元組、UTF-8 BOM、Big5 CRLF、UTF-16、複製、無效／超大檔案、清空時取消非同步讀取、文字當文字顯示、電池單位、放電反算及 dBm 雙向切換；沒有上傳請求或瀏覽器錯誤。
- `tests/circuit-browser.mjs`：23 組互動情境通過；另驗證極大 RC 時間常數圖中不產生 NaN／Infinity，以及容量換單位溢位時清除結果。
- `tests/browser-smoke.mjs`：29 工具 × 桌面／手機共 58 組路由檢查通過，含搜尋、分類、鍵盤、類比預設、Big5 複製／快捷鍵及 QR PNG／SVG 獨立解碼；無瀏覽器錯誤。
- `scripts/verify-site.mjs`：34 頁、sitemap、robots、404 及 ads.txt 的精確內容、檔尾換行、200／text/plain 通過。
- 部署前回復基準：`3c6302381c247fb7f1066f76bccd0169dca17df3`，保留 Git 歷史。

## 元件圖示與代碼文字修正

- SMD 電容與電阻改用無長接腳的片狀封裝 SVG；電容外觀與代碼拆解分開，文字改為可換行的 HTML 說明格。電阻印字在聚焦時保持原字型且不加底線。
- 軸向電阻調整本體比例，色環裁切於本體內，容差環保留間距；清空後顯示中性外觀與空值說明。
- 外觀／標示参考 Murata 陶瓷電容產品圖、Vishay D/CRCW 規格與電阻色碼圖、KYOCERA 容量代碼文件；來源連結放在各工具公式說明。
- `npm test`：42 項通過。`tsc --noEmit`、變更檔案 `oxlint`、`oxfmt --check`、`git diff --check` 通過。
- `npm run build`：31 個靜態路由、0 跳過；Wrangler `deploy --dry-run` 通過。
- 正式輸出經本機 Wrangler 驗證：`tests/marking-browser.mjs` 在 1280／390／320 px 通過三頁重載、長代碼、104K、R50、各電阻格式、文字邊界、焦點、四色／五色環、反算及無效值清除。已人工檢視桌面與手機截圖。
- `tests/circuit-browser.mjs`：21 組互動情境通過，無瀏覽器錯誤。`scripts/verify-site.mjs`：30 頁、sitemap、robots、404 與精確 ads.txt 回應通過。
- 本輪只執行變更檔案 lint；全專案原有 lint 問題見下方紀錄。未改動計算公式、部署設定或依賴。
- 部署前回復基準：`199e8129b66e0c4f6e8acd376792a0cc8f28b30b`。

## 25 個工具與互動圖示擴充

- 新增 10 個工具頁；升級既有 6 個電路工具的單位輸入、範例／清空、SVG 即時數值與焦點連動。
- 電阻色碼與 SMD 電容改為有層次的元件圖，保留四／五環、代碼拆解與鍵盤操作。
- `npm test`：42 項通過，含 990 組電容代碼往返、完整已支援 EIA-96 對照、2～20 元件、守恆、頻率與分流正反算、空值／錯誤／溢位、原工具回歸。
- `node node_modules/typescript/bin/tsc --noEmit`：通過；變更檔案 `oxlint` 與 `oxfmt --check` 通過；`git diff --check` 通過。
- `npm run build`：31 個靜態路由，0 跳過。Wrangler 部署乾跑通過。
- 正式輸出在本機 Wrangler 上通過 `tests/browser-smoke.mjs`：25 工具 × 1280px／390px 共 50 組路由、重載、SEO、版面與清空檢查；搜尋、分類鍵盤、原功能及 QR PNG／SVG 獨立解碼均通過，無瀏覽器錯誤。
- 正式輸出通過 `tests/circuit-browser.mjs`：21 組互動情境，包含 16 個電路工具的圖示焦點、單位切換保持物理量、清空／恢復範例、20 元件手機版、SMD 各格式、電容反算、分流零值、555 邊界與三相交流。無瀏覽器錯誤。
- `scripts/verify-site.mjs`：30 個頁面、sitemap、robots、真正 404，以及 ads.txt 的完整內容／檔尾換行／200／text/plain 通過。
- 全專案 lint 保留 25 個原有未修改檔案問題，沒有新增 lint 問題；未變更規則。文章仍為 0 篇已發布內容。
- 本輪回復基準為 `4fcf3779dee90a44bf807b15f751307b2897bb54`，保留 Git 歷史供 revert 後重新部署；無資料迁移。
- EIA-96 查表依 Bourns CR0603 文件的 Y、X、A–F 格式，E 系列依 ROHM IEC 60063 文件。電容通用代碼與 J/K/M 容差另依 KYOCERA 文件；不辨識廠商專用標記。

以下保留前一輪驗證紀錄。

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
