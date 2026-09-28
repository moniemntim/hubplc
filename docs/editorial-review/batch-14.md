# 第十四批：通知擱置、洪水摘要、優先級畫面與事件時間線

起點63篇reviewed-local、386篇unreviewed、1篇draft。全部449篇發布文章的目標不變。

## 整合方向

四篇各留一個可重現問題：TimedShelve不改來源狀態，洪水摘要保留原始轉換，優先級畫面呈現期限與確認狀態，時間線保留來源時間、收據與備註版本。舊網址保留；刪減泛用原則與無法操作的品牌敘述，避免重講前批生命週期。

主線要求擱置模型保留restart歷史與epoch、Bad不得假Clear、fault警示不能被隱藏。洪水模型改用SHA-256內容版本，限制包含重送的總輸入，練習用同一份修改資料驗證窗口。時間線補嚴格輸入、備註引用不可換對象、版本時間單調與匯出深拷貝。

優先級提供單一離線HTML，五筆固定資料、期限等號、黑白文字、篩選範圍和鍵盤操作；與前批嚴重度／可信來源時間排序明確區分。所有反應秒數均為教材設定。

## 驗證

- 全站單元測試375/375通過，unit-tests-batch14.log。
- tsc --noEmit、全專案oxlint、本批28檔oxfmt --check及git diff --check通過。
- 三篇正文附件複製至獨立資料夾，10條CLI命令通過，正文text輸出逐行吻合；standalone-batch14.json。
- 修改下載副本：洪水late事件移到900000後舊窗50、下一窗1；擱置duration改10後expiry110，均實跑吻合。
- 優先級HTML離線瀏覽器30 checks通過；獨立唯讀審查未發現實質問題。
- prepare-articles、prepare-site、Vinext build通過，449發布文章、507 sitemap URLs。
- 列表、四篇與404在320/768/1440px共18檢查通過；layout-batch14/report.json。
- 全站正文216個附件HTTP200，與public來源逐位元組相同。

累計67篇reviewed-local、382篇unreviewed、1篇draft；全部文章實質審查仍未完成。

本批是本機離線軟體教材，未宣稱PLC、HMI產品、安全控制或現場實測；尚未提交、推送或發布。
