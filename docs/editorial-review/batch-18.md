# 第18批：趨勢游標、歷史查詢、步驟畫面與交班

完成本機實質審查，2026-09-28。四篇均全文閱讀與重寫，保留原日期、作者茂伯。所有例子是自訂離線Node教材，沒有實機驗證。

- 趨勢游標：RAW/INTERPOLATED/OUTSIDE/UNAVAILABLE，固定樣點、同clock假設、六組可改練習，未宣稱網路延遲。
- 警報報表：窗口Active轉移和截止未Ack分開，帶入窗口前事件、Cleared未Ack及Unknown history；主審修正Clear錯誤排除及coverage硬編碼，保留完整與篩選範圍兩個coverage。
- 步驟畫面：來源完整snapshot的純讀顯示，拒絕矛盾與過期，來源重啟epoch與HMI重開分清；主審修正品質等待語意、液位單位、完成時間投影與demo斷言。
- 交班：兩筆責任接受不改Active/Acked；附加備註要求重新接受，revision衝突、品質/新鮮度、容量限制、輸出副本。獨立複核通過；主審補非enumerable欄位拒絕。

驗證：

- 全站 `node --experimental-strip-types --test tests/*.test.mjs`：408/408，unit-tests-batch18.log。
- tsc --noEmit、全專案oxlint、本批32檔oxfmt --check、git diff --check通過。
- standalone-batch18.mjs：四篇正文附件複製至獨立資料夾，12條命令及固定stdout核對通過。
- practice-batch18.mjs與practice-batch18-extra.mjs：六組游標、Good/版本衝突/空owner、非法attempt、ACK end邊界修改實跑通過。
- prepare-articles、prepare-site、Vinext build通過：449發布文章、507 sitemap URLs，build-batch18.log。
- 列表、四篇與404於320/768/1440共18檢查通過，layout-batch18/report.json。
- 全文263附件HTTP成功且與來源逐位元組一致。

累計83篇reviewed-local、366篇unreviewed、1篇draft。兩個協作代理於收尾時因額度停止；主線接手修正、審查與上述最終驗證。全站實質審查尚未完成。使用者要求先將已完成部分同步發布；正式發布證據另存release紀錄。
