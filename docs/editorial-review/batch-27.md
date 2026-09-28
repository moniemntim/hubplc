# 第27批：類比資料品質、尖峰與漂移四篇整組整改

2026-09-28。使用者指出單篇進度過於零碎，本批按主題群一起改寫、驗證與發布。

- analog-raw-quality-filter-overrange：完整讀原文後重寫，八筆恢復步驟、缺樣重建窗口、零合法，移除假通用故障碼推論。
- filtered-peaks-raw-data-traceability：完整讀原文後重寫，共用三點重播，明確區分整窗平均18與移動平均23.333；四個位置追查與觸發來源案例。
- analog-temperature-drift-thermal-baseline：子代理完整閱讀並改写，主線逐段審核整稿；受控溫度、三段回程、參考源與條件表、offset/gain計算。NI官方來源查核。
- sensor-zero-drift-check-standard-trend：子代理完整閱讀並改寫，主線逐段審核整稿；固定基準跨週紀錄、調整前後留存、端點斜率與%FS，NIST官方來源查核。
- 四篇保留URL/作者/日期；刪減重複FAQ與泛用段落，品質課與尖峰課、熱漂與長期零漂各自分工並互連。
- 兩篇直接操作頁共用filterSequence，不新增CLI前置。Bad清窗、三筆Good重建、lastGood和age分離。所有數字是合成案例，沒有硬體／PLC平台模擬驗證。

已完成驗證：

- node --experimental-strip-types --test tests/*.test.mjs：420/420。
- tsc --noEmit、oxlint、9檔oxfmt --check、git diff --check通過。
- check-drift-batch27.mjs：溫漂加性/比例斜率及三週零漂算例重算通過。
- prepare-articles、prepare-site、Vinext build通過，449公開文章與507 sitemap URLs。
- filter-lesson-browser.mjs：兩篇×三尺寸共6組，恢復、尖峰、階躍、缺樣、零、非法輸入撤表與鍵盤恢復；無pageerror及頁面橫向溢出。主線檢視320截圖。
- layout-browser.mjs：列表、四篇、404×三尺寸，共18組通過。

累計100篇reviewed-local、349篇unreviewed、1篇draft。全站整改仍在進行，舊審查不自動等於符合新標準。未重送AdSense。正式站發版核對另記release。
