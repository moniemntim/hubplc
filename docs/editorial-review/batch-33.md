# 第三十三批：公開內容的任務完成路徑

日期：2026-10-12。範圍為 19 篇已公開文章的再審；原有 117 篇公開、333 篇暫停公開與 1 篇草稿的邊界不變。`reviewed-local` 表示本文版本與附件已在本機核對，不表示 Google AdSense 核准或實體 PLC／HMI 實測。

## 具體整改

- `plc-ton-tof-tp-timer-selection`：從只可操作 TON 改為頁面可切換 TON、TOF、TP，各有掃描步驟、2 秒邊界、結果判讀及 CODESYS 文件語意。瀏覽器模型未在 CODESYS 編譯或實機執行。
- `hmi-bad-quality-stale-value`：加入零值、Bad、Stale 與序列拒絕的頁內重播及輸入練習；Node 下載為進階選項。瀏覽器教材僅涵蓋指定條件，未接通設備。
- `modbus-function-code-01-04-read-list`：提供四筆已知資料的離線 CSV 與空白 CSV。案例的 `observed_status` 保持 `NOT_RUN`，不能當成設備讀取證據。
- 其餘 16 篇：逐條核對與已暫停公開文章相關的延伸閱讀，改為主題相符且實際公開的教材。來源端 26 個失效閱讀入口已清除；文章產生器本來會將那些連結轉成純文字，公開頁面並未導向 404。
- 五個核心 PLC／Modbus 工具新增精準對應公開教材入口；`plc-scaling` 增加雙語完整操作、原始量程來源、反算、超範圍與錯誤排查。這些工具頁不是硬體驗證紀錄。

## 本機驗證

- `node --experimental-strip-types --test tests/*.test.mjs`：444/444 通過，含公開文章連結檢查。
- `node node_modules/typescript/bin/tsc --noEmit`：通過。
- `node node_modules/oxlint/bin/oxlint`：修正新指南的 JSX 字元後通過。
- 本機瀏覽器：`tests/content-quality-browser.mjs`、`tests/plc-practice-browser.mjs`、`tests/hmi-quality-lesson-browser.mjs`、`tests/article-browser.mjs` 通過；最後一項涵蓋 117 篇公開文章。
- `tests/layout-browser.mjs` 對 PLC 縮放、三計時器、HMI 品質與 Modbus 清單四頁在 320／768／1440 px 檢查，共 15 個頁面／視窗結果（含 404 驗證）通過。
- 兩個 Modbus CSV 本機 HTTP 200，四筆離線案例的 FC、PDU 與預期 byte count 與正文一致。

## 仍需處理

AdSense 的「缺乏價值的內容」是 Google 的站點審查結果，本站無法由上述本機檢查推定已解除。仍有其他 HMI 文章把下載 Node 範例放在操作前面；部分功率與單位工具 URL 共用同一計算核心、頁面任務差異不足。這兩組保留為後續逐頁內容整改，不在本批宣稱完成。
