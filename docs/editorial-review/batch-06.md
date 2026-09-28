# 第六批：握手、晚到回覆與兩種逾時

本批開始時 ledger 核對為 31 篇 reviewed-local、418 篇 unreviewed、1 篇 draft。所有發布文章仍屬逐篇審查範圍，前批建置與文字掃描不代表剩餘內容已合格。

## 本批內容

- plc-request-accept-result-handshake：單筆 Receiver 協議、資料快照、保持訊號、衝突拒絕與匹配確認。主線審查發現工作提早完成會清掉尚未被 Sender 觀察的 Accept，要求跨結果狀態保留並加入慢 Sender 案例。
- sequence-reuse-late-response：已組框 FC03 callback 配對，epoch 在提交時捕捉，同一 epoch 不重用 TID，65535 用完後拒絕配發。通道關閉由整合端確認，模型不冒稱能觀察網路狀態。
- plc-step-timeout-recovery：只保留單一步驟等待，固定 5000 ms，自訂優先順序、4999／5000／5030 觀察點、故障快照與 Reset 被拒後的新按下。
- plc-watchdog-timeout-diagnosis：移除沒有實測依據的負載耗時表，改用三份合成觀察區分執行超時候選、未啟動候選與缺資料；實際 Runtime 表保持 not_run。

## 審查界線

保留原網址；不同題目以連結銜接，不重複寫通用檢查清單。步驟等待、握手結果期限與任務 Watchdog 各自有明確範圍；教學數值不是廠牌建議參數。

主線已完整閱讀四篇與新增程式。另由獨立審查核對 step-timeout／watchdog 的文章、模型與輸出；未發現實質不一致。該審查執行步驟模型 6 項測試與兩份 demo，並核對 CODESYS 官方 Task 文件。

所有可執行附件都是離線 Node 模型。沒有 PLC、CODESYS Runtime、實際網路或 I/O 測試紀錄；不把這些測試結果宣稱為現場驗收。

## 整合驗證

- `node --experimental-strip-types --test tests/*.test.mjs`：201/201 通過，見 outputs/editorial-review/unit-tests-batch6.log。主線另補了 RESULT 同時收到新 Req 與正確舊 Ack 的回歸測試，結果與文件一致地保持。
- `tsc --noEmit`、全專案 `oxlint`、本批附件／測試的 `oxfmt --check` 通過。
- 四組附件只複製下載所需檔案至獨立暫存目錄後執行成功，見 outputs/editorial-review/standalone-batch6.json。Watchdog 與晚到回覆的 stdout 分別和文章／README 完整比對相同。
- Watchdog 現場 CSV 一列 not_run，18 個實際紀錄欄保持空白；沒有把合成觀察填成量測數字。
- 原 Modbus TCP guide /docs 連結失效，已改成透過官方 specifications 頁確認的 /file/secure/messagingimplementationguide.pdf；Application Protocol 與 CODESYS Task 文件均重新開啟核對。
- prepare-articles、prepare-site 與 Vinext build 成功，449 篇文章／507 URLs；見 outputs/editorial-review/build-batch6.log。
- 文章列表、四篇正文與 404 在 320／768／1440px 共 18 組版面檢查通過，見 outputs/editorial-review/layout-batch6。
- 全站正文連結的 76 個附件 HTTP 200，與 public 來源逐位元組一致。

本輪累計 35 篇 reviewed-local、414 篇 unreviewed、1 篇 draft。四篇以最後版本雜湊入 ledger；全部 449 篇的目標尚未完成。這一輪及前述重寫批次尚未提交或發布。
