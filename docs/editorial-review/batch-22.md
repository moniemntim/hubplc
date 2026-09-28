# 第22批：Tick 回繞與週期排程

2026-09-28，主線全文閱讀並重寫兩篇，保留原日期與作者。

- plc-tick-wrap-elapsed-time：模數不是最大值，外部gapBound與boot為必要前提；整圈及重啟無效不回零，15ms等號逾時。共用tick.mjs，8位元65536組差值與32位元最後一格已跑斷言。
- plc-periodic-event-accumulated-timing-error：刪除重複驗收敘述，提供completion/phase可執行比較。phase只做最新一期，Busy跳過不重疊；完成觀察與模擬完成分欄；不假裝補回歷史感測值。
- 兩篇共用八附件；所有時間與工作都是離線fixture，samples知道虛擬真值，不是實機上限或重啟偵測證據。沒有原廠模擬器或硬體驗證。
- 已核對CODESYS官方Duration/Date/Time及Task文件；API規格只作來源，不把JS函式當PLC API。

執行證據：

- node --experimental-strip-types --test tests/*.test.mjs：414/414，unit-tests-batch22.log。
- tests/tick-scheduling.test.mjs：共用self-test檢查差值全域、失效、門檻、完成/固定相位、Busy、同刻、重複掃描、多次回繞、容量及輸入。
- standalone-batch22.mjs：兩篇各複製八檔到獨立資料夾；10條CLI、正文stdout逐字及16次練習修改通過。
- tsc --noEmit、全專案oxlint、本批11檔oxfmt --check與git diff --check通過。
- prepare-articles、prepare-site、Vinext build通過：449發布文章、507 sitemap URLs，build-batch22.log。
- 列表/兩篇/404於320/768/1440共12排版檢查通過；layout-batch22/report.json。
- 全文291附件HTTP200且與public來源逐位元組相同。

累計91篇reviewed-local、358篇unreviewed、1篇draft；正式部署證據另存release輸出。全部審查仍未完成。
