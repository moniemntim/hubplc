# HubPLC

PLC 實用工具與技術文章網站。GitHub 管理原始碼，Cloudflare Workers 提供 Vinext 靜態輸出。

## 本機使用

使用 Node.js 22.13 以上與 npm。

```sh
npm ci
npm run dev
npm test
npx tsc --noEmit
npm run lint
npm run build
npx wrangler deploy --config deployment/wrangler.jsonc --dry-run
```

瀏覽器回歸測試使用 Playwright：先 `npx playwright install chromium`，啟動網站後執行 `npm run test:browser`。`TEST_BASE_URL` 可指定待測網站（預設 `http://localhost:3000`），`BROWSER_EXECUTABLE` 可指定本機 Chromium／Edge 執行檔。測試使用隔離的無頭瀏覽器，不使用個人瀏覽器資料；報告及測試 QR 檔案放在忽略版控的 `outputs/browser-qa`。

## Cloudflare 連接 GitHub

- 儲存庫：`moniemntim/hubplc`，正式分支：`main`。
- 組建：`npm run build`；部署：`npm run deploy`。
- 部署設定：`deployment/wrangler.jsonc`；靜態輸出：`dist/client`。
- 網域在 Cloudflare dashboard 設定。不要將 API token 放入儲存庫。
- Git 歷史保留前一版；需要回復時，revert 對應提交並讓 Cloudflare 重新部署，或從 Cloudflare 部署歷史回復。

## 寫文章

請看 `content/寫文章指南.md`。複製 `content/articles/first-article.md`，完成後將 `draft` 改成 `false`。組建會產生文章清單、獨立文章頁與 sitemap，草稿不輸出。新增文章後重新啟動開發伺服器；不要修改自動產生的文章頁。

## 工具架構

`/tool` 提供搜尋和分類，15 個獨立頁面位於 `/tool/<slug>`。工具登錄表在 `lib/tools/registry.ts`；公式在 `lib/tools`；各頁面僅引用自己的計算器。`lib/calculators.ts` 保留原函式介面，類比頁保留 4–20 mA WebMCP 行為。

工具包含類比、PLC 縮放、進位、Modbus 位址與 CRC、暫存器、分壓、電力、555、色碼、串並聯、RC、QR、Big5 及九类單位換算。所有輸入在瀏覽器內處理，不呼叫外部轉換 API。一般換算輸入不寫入網址或儲存；線上碼錶 `/tool/stopwatch` 使用 localStorage 保留計時與單圈紀錄，分享按鈕將狀態放入網址 fragment，開啟分享後各自獨立操作。QR 使用 `qrcode`，Big5 僅載入 `@kayahr/text-encoding` 的 Big5 編碼表；套件將 `big5-hkscs` 視為 Big5 別名。

計算結果基於頁面標示的理論條件。模組量程及暫存器排列請依設備手冊；質量流量與體積流量不互換，壓力換算不改變表壓／絕對壓基準。

## ads.txt

`public/ads.txt` 由根路徑 `/ads.txt` 提供，`public/_headers` 明確設定 `text/plain; charset=utf-8`。內容為使用者提供的發布商紀錄並保留檔尾換行。本次未加入廣告程式碼、追蹤、自動廣告；此檔案不代表廣告平台已審核通過。

## 參考

- [Cloudflare 靜態資源](https://developers.cloudflare.com/workers/static-assets/get-started/)
- [Modbus 規格](https://www.modbus.org/file/secure/modbusprotocolspecification.pdf)
- [TI NE555 資料表](https://www.ti.com/lit/ds/symlink/ne555.pdf)

## 目前版本注意事項

正式輸出使用標準頁面連結，避開 Vinext 1.0.0-beta.5 的 RSC 預載錯誤。本機 npm start 以 2026-05-22 相容日期啟動，以符合鎖定的 Wrangler runtime；正式部署仍沿用部署設定的日期。
