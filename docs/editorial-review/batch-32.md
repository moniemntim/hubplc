# 第32批：XCA ECU HTTPS 憑證指南審查

2026-10-12。審查既有公開文章 `xca-ecu-https-certificate-setup`；沒有改動原文、公開狀態或 `hidden-articles.json`。

- 全文核對標題承諾、根 CA／設備憑證分工、固定 IP SAN、Windows 根憑證存放區、設備端匯出與瀏覽器驗收條件。文內將示範值、設備部署與完成條件分開，沒有把本機文章檢查說成 ECU、Windows 或瀏覽器的實測成功。
- 本機 `public/images/xca-ecu-https-certificate-setup/image1.png` 至 `image19.png` 全數存在；文章引用的 19 個圖號恰為 1 至 19。
- 文中三個引用網址於審查日回應 HTTP 200：XCA Step by Step、XCA Certificate Input Dialog、Chrome DevTools Security。
- 來源與 19 個 PNG 原始位元組檢查未發現 PEM 私鑰標記，或密碼、API key、secret、token 的指派格式。環境沒有 OCR 工具，因此此項不是畫面文字辨識；也沒有開啟或公布任何可能的敏感內容。

已執行：`node scripts/prepare-articles.mjs`（117 篇公開文章）、`node scripts/editorial-review-status.mjs`。後者在登錄前仍為 116 篇 `reviewed-local`、334 篇 `unreviewed`、1 篇 `draft`；完成台帳登錄後以 `--write` 更新 inventory，再重新驗證。

限制：未執行 XCA、Windows 憑證匯入、ECU 端安裝、Chrome/Edge 實際 HTTPS 連線或任何硬體／供應商平台測試；`reviewed-local` 僅表示本文內容、資產與公開參考資料在本機完成審查。
