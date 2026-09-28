# 第十一批：精確數值輸入、多人改值、CAS 與資源排程

起點為 51 篇 reviewed-local、398 篇 unreviewed、1 篇 draft。上一輪是有內容修正與驗證的 progress；仍保持全部 449 篇發布文章的實質審查目標。

## 內容與整合

- hmi-numeric-range-step-validation：以 BigInt 精確解析最多16字元的十進位文字，範圍先於步距，100.04 不偷偷 round，25.30 精確得253。明示 scale=10 是 wire=engineering×10；raw envelope 只收固定四個 own enumerable 欄位，拒絕 shape、型別與契約錯誤，保留最後有效值。
- multi-source-cas-arbitration：真正本機 SQLite 條件 UPDATE，同交易保存設定與 operations；兩個 child process 都讀 v7、共同啟動後只有一筆提交。涵蓋重播、內容衝突、重開讀取、epoch 儲存條件、ledger 上限與 rollback。
- hmi-concurrent-edit-last-writer-version：共用同一 SQLite 儲存實作，CLI 編輯器呈現 baseline/current/draft 與最後提交來源，衝突須明確重新核對，回覆遺失查原請求。新增兩份可改值練習，不要求刪除固定 demo 斷言。
- plc-exclusive-resource-scheduler：14掃描 FCFS，A/B 各一 pending、同掃描決勝、序號不重用、取消與 release 分流、release 空掃描、deadline equality 優先鎖定、復歸新邊緣及下一掃描再授權。

數值與排程為離線軟體模型；CAS 為真實本機 SQLite，回覆遺失仍是合成注入。全批沒有 PLC／HMI SDK、正式登入、安全迴路或設備實測；COMMITTED 不代表 PLC 已生效。

## 主線複核

四篇、附件與測試已全文閱讀。主線修正排程的安全整數上限：既有 MAX_SAFE deadline 必須可觀察到逾時，只有新 grant 才檢查加法空間。另增加 ordered events，防止同掃描較早的拒絕被 grant 覆蓋。

主線發現 unknown 查詢若只比 operation ID，可能將同 ID 的舊成功誤當新內容成功。現查詢綁完整原始 expectedVersion/raw/epoch 與來源；內容不同回 IDEMPOTENCY_CONFLICT。提交後讀取失敗也保留 unknown。獨立複核已重新核對這兩項修正，targeted tests、lint、syntax 與文件對照通過。

## 整合驗證

- node --experimental-strip-types --test tests/*.test.mjs：314/314 通過，紀錄 outputs/editorial-review/unit-tests-batch11.log。
- tsc --noEmit、全專案 oxlint、本批27檔 oxfmt --check 通過。
- 四篇只複製正文下載附件到獨立暫存資料夾，十條 CLI 指令通過；四個 demo stdout 與正文逐字一致。見 standalone-batch11.json。
- 在下載資料夾另執行文中兩個修改練習：CAS expectedVersion=8 得520@v9；HMI draft=530 保留並提交530@v9。沒有改掉固定 demo 的斷言。
- SQLite 實際雙程序競爭、operations INSERT 注入失敗回滾、重開後讀取、ledger1000筆上限等有測試證據；不延伸宣稱負載效能、跨主機或斷電驗證。
- SQLite UPDATE／Transactions、Node24.19 SQLite、TC39 BigInt、Node test 官方來源已核對。
- prepare-articles、prepare-site、Vinext build 通過：449篇發布文章、507 sitemap URLs。見 build-batch11.log。
- 列表、四篇正文與404在320/768/1440px，共18組版面／狀態／頁面錯誤檢查通過。見 layout-batch11/report.json。
- 全站正文157個附件 HTTP200，與 public 來源逐位元組相同；git diff --check 通過。

累計55篇 reviewed-local、394篇 unreviewed、1篇 draft。所有舊批次與使用者變更保留；本批未提交、推送或發布。全部文章仍未審查完成。
