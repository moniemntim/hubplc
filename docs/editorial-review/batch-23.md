# 第23批：角度差與分段插值

2026-09-28，主線全文閱讀並重寫兩篇，保留原日期與作者。

- plc-angle-wrap-difference：正規化與最短幾何差可執行，半圈+180是平手規則而非實際方向；取樣追蹤要求物理速度界限及小於半圈，失效清基準，區段累計不冒充多圈位置。
- plc-table-piecewise-linear-interpolation：五點節點/區間/超量程可重現；錯誤候選保留工作表，完整驗證後複製並版本比較提交，不宣稱PLC跨任務原子性或感測器校正。
- 八附件同資料夾可跑。來源為CODESYS MOD及ARRAY OF官方文件；JavaScript範例沒有PLC編譯、硬體或原廠模擬器證據。

實際檢查：

- node --experimental-strip-types --test tests/*.test.mjs：最終415/415，unit-tests-batch23.log。
- 共用self-test：129600組整數角度、半圈、極小負值、掉樣/品質/重啟/重複時間、速度矛盾；插值節點/中點/非中點、下降曲線、錯誤/稀疏表、候選複製與版本衝突。
- 回歸補強：半圈不可被1e-9度容差放行。初次lint指出稀疏陣列測試new Array寫法，改為明確設定length，最終全專案oxlint通過。
- standalone-batch23.mjs：兩篇各複製八檔，10條CLI、兩篇stdout逐字核對與20次練習修改全部通過。
- tsc --noEmit、全專案oxlint、本批11檔oxfmt --check與git diff --check通過。
- prepare-articles、prepare-site、最終Vinext build通過：449發布文章、507 sitemap URLs，build-batch23.log。
- 列表/兩篇/404於320/768/1440共12排版檢查通過，layout-batch23/report.json。
- 全文299附件HTTP200且與public來源逐位元組相同。

累計93篇reviewed-local、356篇unreviewed、1篇draft；正式部署證據另存release輸出，全文審查尚未完成。
