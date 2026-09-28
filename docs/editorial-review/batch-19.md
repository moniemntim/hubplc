# 第19批：操作權限與角色降級共用案例

2026-09-28，完成兩篇實質重寫。另全文讀過手自動模式與維護模式兩篇，但未改完、未標記審查完成。

兩篇共用 public/examples/authorization，減少重複角色矩陣與不一致契約：

- 操作權限：V/O/M可讀不可直接寫A，S/T同一Supervisor不同fixture session；設備B拒絕、60～100整數、工作階段期限等號拒絕、設定revision與排隊/套用分開。正文提供五組可改參數及寫入計數。
- 角色降級：政策12→13→14、兩份UI快照其中一份不刷新、直接提交拒絕、派送前再授權、已完成效果不抹除、舊佇列不復活，恢復後新意圖重讀版本。
- 額外測試：同ID去重/衝突、客戶端自稱role拒絕、政策服務不可用、设备不可寫、排隊中到期、兩個寫入版本競態、數值邊界、16操作/64稽核上限、回傳副本、單調時鐘。

限制明示：純同步記憶體模型，沒有真正身份驗證、網路、PLC、持久化交易或實體取消。fixture管理方法不是對外API。權限矩陣不是所有HMI內建角色。沒有宣稱申請/主管核准流程已實作。

查核來源：當日開啟OWASP Authorization與Session Management官方Cheat Sheets；正文僅引用預設拒絕、逐請求授權與工作階段生命週期，不保留未使用Ignition API承諾。

最終驗證：

- 全站409/409 unit tests通過，unit-tests-batch19.log。
- tsc --noEmit、全專案oxlint、本批10檔oxfmt --check、diff --check通過。
- standalone-batch19.mjs：兩篇各複製七附件至獨立資料夾，10條CLI、正文固定輸出與12次修改案例實跑通過。
- prepare-articles、prepare-site、Vinext build通過：449發布文章、507 sitemap URLs，build-batch19.log。
- 列表、兩篇與404於320/768/1440共12檢查通過，layout-batch19/report.json。
- 270全文附件本地HTTP與來源逐位元組一致。

累計85篇reviewed-local、364篇unreviewed、1篇draft；部署驗證另記release輸出。
