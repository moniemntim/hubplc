# 第25批：類比換算與來源品質整改

2026-09-28，全文閱讀兩篇原文後重寫，保留作者與日期。

- plc-analog-scaling-pressure-temperature-level：頁面直接算壓力/溫度/液位/counts，逐欄、三點、錯誤輸入；CLI不是前置。共用既有analogConvert，不複製另一套縮放公式。
- 4-20ma-scaling-open-overrange-diagnostics：刪除重複三點換算與另一套假通用raw範圍，聚焦數學/來源品質/故障原因三層；0mA不自動歸因斷線，NE43依產品設定，未實作NE43或復原狀態機。
- 新增AnalogLesson供兩篇共用。Good+量程內才提供本例usableValue，否則保留未裁切算式但usableValue=null。品質是使用者輸入，不是偵測設備。
- 文章入口加入類比換算操作課。新增通道CSV九組固定條件；觀察值、品質、時間、型號、證據留空，狀態NOT_RUN。
- 查閱Beckhoff NAMUR官方資料；NI原連結工具抓取逾時，未依其未讀內容作主張。全部為瀏覽器試算，無硬體或校正證據。

驗證：

- node --experimental-strip-types --test tests/*.test.mjs：416/416，unit-tests-batch25.log。
- tests/analog-lesson-browser.mjs：兩篇×320/768/1440，共6組互動測試；端點/中點/0/3.2/22、Bad/Unknown、counts/溫度/液位、空白/零跨度及鍵盤復原。無pageerror或頁面橫向溢出；主線檢視320截圖。
- check-analog-record.mjs：9組CSV與公式一致，採1e-12絕對容差處理浮點表示；所有觀察欄空白且NOT_RUN。
- tsc --noEmit、oxlint、9檔oxfmt --check、git diff --check通過。
- prepare-articles、prepare-site、Vinext build通過：449發布文章、507 sitemap URLs。
- 列表/兩篇/404×320/768/1440：12排版檢查通過。
- 303正文附件HTTP200且與來源byte-equal。

累計95篇reviewed-local、354篇unreviewed、1篇draft。原有已審查文章不自動符合新整改標準；全站整改仍未完成，沒有重新送審AdSense。正式發布證據另記release。
