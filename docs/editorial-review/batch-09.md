# 第九批：配方驗證、命令紀錄、離線畫面與接收串流

本批起點為 43 篇 reviewed-local、406 篇 unreviewed、1 篇 draft。範圍仍為全部 449 篇發布文章；本批完成不代表全站已完成。

## 實質修正

- recipe-schema-complete-error-list：提供六個下載檔，從可修改原文到 required/type/range/cross/unknown 錯誤、截斷標記與固定候選雜湊。拒絕重複鍵、空白 ID、非有限數字與未知版本；候選不是設備套用結果。
- operation-log-accepted-applied-equipment-revision：固定 OP884 的九種事件資料，分開接受、送出、未知、版本拒絕與關聯讀回證據。序號決定事件順序，時間倒退只加警示；僅接受四位年份、毫秒 UTC 格式。未連設備，未建立正式稽核儲存。
- offline-hmi-non-operable-controls：可直接開啟的單檔 HTML，十種固定合成情境；區分快取查看、模擬查詢與本頁模擬寫入。品質、資料年齡、來源確認、世代、權限與未決命令共同限制寫入，事件處理器也重新檢查。
- receive-buffer-throughput-test：自訂 2-byte length-prefix 的 Node Buffer 案例，分開未完整 framing bytes 與完整 payload queue。修正 100/80 KB/s 的十秒算術、零長度／超長 header 停流、同 chunk 先前完整 frame 保留，以及 EOF COMPLETE 不代表 consumer 已處理完。

主線閱讀並複核正文、模型、fixtures 與測試；離線 HMI 另有獨立只讀複核。重複的 retry、unknown write、queue 容量推導改連既有案例，保留本篇操作所需資訊。

## 驗證

- node --experimental-strip-types --test tests/*.test.mjs：260/260 通過，紀錄 unit-tests-batch9.log。後續 recipe sort 補明確 comparator，該範圍 7/7 重跑通過。
- tsc --noEmit 通過；全專案 oxlint 初次指出 recipe sort 缺 comparator，修正後通過；本批 25 個檔案 oxfmt --check 通過，修改檔另重跑通過。
- 僅複製正文下載檔至獨立暫存資料夾，七條 CLI 指令通過；三個 demo stdout 與正文逐字相同。紀錄 standalone-batch9.json。
- 單檔 HMI 在三種寬度共 30 情境通過，另核對鍵盤、4999/5000 ms 邊界與移除 DOM disabled 後仍拒絕操作，無 HTTP 資源請求。見 offline-hmi-batch9/report.json。
- prepare-articles、prepare-site、Vinext build 通過：449 篇發布文章、507 sitemap URLs。見 build-batch9.log。
- 列表、四篇文章與 404 在 320/768/1440px 共 18 組版面及頁面錯誤檢查通過。見 layout-batch9/report.json。
- 全站正文 122 個附件 HTTP 200，與 public 來源逐位元組相同。
- git diff --check 通過。保留其他批次與使用者變更，未提交、推送或發布。

累計 47 篇 reviewed-local、402 篇 unreviewed、1 篇 draft。本批皆為離線軟體案例，沒有 PLC／HMI 原廠模擬器或設備實測證據。
