# 第29批：取樣、濾波、聚合與重採樣四篇整改

2026-09-28。四篇均全文閱讀，原日期/URL/作者保留。

- sampling-aliasing-frequency-validation：主線重寫，新增12筆相位感知正弦互動，70/100→30、提高fs、Nyquist邊界不同相位及未知訊號限制；查閱ADI MT-002。
- noise-spectrum-sampling-filter-selection：子代理重寫、主線逐段審核。五點/十一點群延遲、階躍、脈衝、獨立雜訊公式；主線明訂最後舊值記錄起點與第一新值時間，避免N與N-1間隔混稱。連結既有品質/尖峰操作課。
- sampling-and-aggregation-periods：子代理重寫、主線逐段審核。採集/保存/彙總/畫面四層契約、半開窗、平均61和缺測加權64。主線修正描述範圍並分開兩組驗收向量。
- resampling-original-imputed-flags：子代理重寫、主線逐段審核。完整七格點、RAW/LINEAR/MISSING、maxGap、禁止外推與前值年齡；InfluxDB來源查核。
- 所有案例為合成；沒有PLC/ADC/資料庫部署或硬體實測。未虛構產品通用參數。

已執行驗證：

- 單元測試423/423，unit-tests-batch29.log。
- tsc --noEmit、oxlint、9檔oxfmt --check與git diff --check通過。
- check-batch29-cases.mjs：濾波阶躍、聚合權重及七點插值重算通過。
- prepare-articles、prepare-site、Vinext build成功，449公開文章/507 sitemap URLs。
- alias-lesson-browser.mjs：320/768/1440三組，折返、改fs、零/90度相位、無效輸入撤下及鍵盤恢復。無pageerror或頁面橫向溢出；主線檢視320px截圖。
- layout-browser.mjs：列表、四篇、404×三尺寸共18組通過。

累計108 reviewed-local、341 unreviewed、1 draft。全站整改未完成，舊審查不保證符合新標準；未重新提交AdSense。正式部署另記release證據。
