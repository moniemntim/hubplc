# 第21批：登入逾時草稿與長短按

2026-09-28完成兩篇全文重寫，保留原日期與作者。

- hmi-session-timeout-unsent-draft：共用既有authorization模型，新增草稿投影、可信fixture續期與同人原ID查詢。六附件同資料夾可跑。未送出／已送出分離，重讀版本而非自動提交，95請求值不直接當套用證據。
- hmi-release-only-800ms-pointer-policy：單檔HTML，按住不執行、release判定799/800/801ms。第一pointer所有權、重複up、取消、舊世代、容量與鍵盤替代；真實滑鼠操作與合成事件分開。
- 前者無真實登入、PLC、持久記錄；後者只產生本頁結果，不保證嵌入式HMI、實體觸控或後端冪等。沒有硬體驗證。

主線執行並核對：

- node --experimental-strip-types --test tests/*.test.mjs：413/413通過，unit-tests-batch21.log。
- node tests/release-only-browser.mjs：320/768/1440，原生滑鼠按住/放開/框外、鍵盤、合成邊界與取消/世代/容量；無頁面錯誤、HTTP請求、橫向溢出。人工檢視320截圖。blur及cancel使用注入事件，不是實體OS切換測試。
- standalone-batch21.mjs：正文六附件複製到獨立目錄，三條原版命令與三次修改輸入、stdout逐字核對通過；另跑五條既有授權案例命令確認共享model相容。
- tsc --noEmit、全專案oxlint、本批11檔oxfmt --check、git diff --check通過。
- prepare-articles、prepare-site、Vinext build通過：449發布文章、507 sitemap URLs，build-batch21.log。
- 列表/兩篇/404在320/768/1440共12排版檢查通過，layout-batch21/report.json。
- 全文283附件HTTP成功且與public來源逐位元組相同。

累計89篇reviewed-local、360篇unreviewed、1篇draft。發布證據另存release輸出，不能把本批完成當成全部文章審查完成。
