# 第24批：內容價值整改第一輪

2026-09-28。回應使用者要求先整改，重新處理已審查故障復歸篇；不是新增完成篇數。

- 首頁以可直接操作的故障復歸取代尚未完成全文審查的類比代表文章；類比換算工具仍在首頁。
- 文章列表先提供自保持→故障復歸→順序控制三課操作路徑，搜尋保留。
- fault-reset文章新增頁面互動，共用既有resetScan而非再造規則；手動輸入/1掃描/10掃描/11步案例/100筆上限/重設。CLI下載改為進階選配。
- 附完整CODESYS V3 ST FB宣告/實作與PLC_PRG呼叫對照，以及初值/變數映射/監看/Trace與NOT_RUN驗收CSV。
- ST未在CODESYS編譯、原廠模擬或硬體驗證，文章與附件均明示；不是可匯入工程，也不宣稱安全復歸。實際service pack/runtime版本仍待測試者填入。
- remediation-criteria.md記錄新验收方向：任務完成、直接操作、平台依據、證據分層、逐篇合併，不以字數/附件數/測試數當價值證明；未重新送審AdSense。

驗證：

- node --experimental-strip-types --test tests/*.test.mjs：415/415。
- node tests/fault-reset-browser.mjs：320/768/1440，手動釋放再按、長按10掃描、11列與模型逐值核對、100列停止、鍵盤重設、無頁面錯誤/橫向溢出；主線檢視320截圖。
- tsc --noEmit、oxlint、7檔oxfmt --check、git diff --check通過。修正可及性lint指出的重複status語意與非互動tabindex。
- prepare-articles、prepare-site、最終Vinext build通過：449發布文章、507 sitemap URLs。
- 首頁/列表/故障復歸/404 ×320/768/1440：12排版檢查通過。
- 302全文附件HTTP200且byte-equal，包含ST與CSV。

仍為93篇reviewed-local、356篇unreviewed、1篇draft。既有reviewed-local不等於符合全部整改標準；本輪只重新核對fault-reset來源版本，ST未執行，不把它改成實測通過。正式部署另記release證據。
