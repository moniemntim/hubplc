# HubPLC

PLC 實用工具與技術文章網站。原始碼由 GitHub 管理，Cloudflare Workers 提供靜態網站服務。

## 本機使用

使用 Node.js 22.13 以上與 npm。

- 安裝：npm ci
- 開發：npm run dev
- 測試：npm test
- 組建：npm run build

## Cloudflare 連接 GitHub

選取 moniemntim/hubplc，正式分支 main。
組建命令：npm run build
部署命令：npm run deploy
根目錄保持預設。

部署設定在 deployment/wrangler.jsonc，網站輸出為 dist/client。
這是靜態網站，不需要資料庫或伺服器密鑰。不要把 Cloudflare API token 放入儲存庫。

## 寫文章

請看 content/寫文章指南.md。複製 content/articles/first-article.md，完成後將 draft 改成 false。
網站每次組建會產生文章清單與獨立文章頁，草稿不輸出至網站。
開發時新增文章後重新執行 npm run dev，重新整理頁面。
請勿直接修改自動產生的文章頁。

## 工具

- 4–20 mA 線性換算：含範圍外提示及無效量程檢查。
- 進位轉換：32 位元無號整數，二／十／十六進位。
- Modbus：五位數 40001–49999 保持暫存器慣例，轉零起算位址。

Modbus 參考：https://www.modbus.org/file/secure/modbusprotocolspecification.pdf

## 變現準備

目前未啟用廣告、追蹤或付費服務。待原創文章上線、網站內容與聯絡資訊完整後，再規劃廣告或與文章相關的產品推薦。加入廣告或分析服務時，需要一併更新隱私说明與適用的同意機制。這份程式碼不代表已通過任何廣告平台審核。

## 部署參考

https://developers.cloudflare.com/workers/static-assets/get-started/

