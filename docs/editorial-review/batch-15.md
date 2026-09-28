# 第十五批：換色、焦點、品質與斷線顯示

起點67篇reviewed-local、382篇unreviewed、1篇draft。上一輪完成內容與驗證，屬progress。全部449篇發布文章的目標不變。

## 整合方向

alarm-color-migration-accessibility不另建警報狀態模型，與第14批priority共用單一HTML。新增theme/v1、theme/v2色條切換及版本文字，回退不改資料；人員任務CSV全為not_run。獨立審查發現測試的虛擬時間未對齊正文，已將theme測試改回14:03:00並重跑42 checks。原優先級文章與舊行為仍適用。

hmi-alert-dialog-focus-layering改為單檔native dialog練習，焦點循環、Escape與取消、背景不可互動、同步警報與本機草稿刪除各自可核對。延遲注入有界且重設時清除，避免幽靈事件。

hmi-bad-quality-stale-value與hmi-disconnected-data-paused-display共用顯示投影模型，各自聚焦Bad/last Good與重連pending。來源變更時間只能保存來源宣告值，不能由兩次數值相等推論；與既有runtime watchdog模型明確分開。

## 驗證

主線與獨立審查另修正：拒絕舊cache不得消耗接受序號或更新接受時間；sourceChangedAt不得晚於acquiredAt。主線另外實跑Good/Bad在Disconnected及舊cache拒絕後接受metadata不變、同seq新值可恢復。練習正文曾與程式不一致，已改為baseline0@100、第二筆7@101，僅修改第二筆seq做拒絕測試。

- 全站單元測試383/383通過，unit-tests-batch15.log。
- tsc --noEmit、全專案oxlint、本批16檔oxfmt --check、git diff --check通過。
- 兩篇各自複製正文六個附件到獨立資料夾，六條CLI指令與正文text輸出通過；standalone-batch15.json。
- 下載副本的第二筆seq改1後sample_rejected_seq，保留原value0與acquired100，實跑通過；practice-batch15.mjs。
- 共用priority HTML的42瀏覽器checks通過，含14:03主題切換／回退與print版本；CSV六列均not_run且實際回答／時間空白。
- dialog獨立下載HTML的Edge鍵盤、背景inert、取消／Escape、同步摘要、reset取消timer、local刪除及三種viewport通過；主線目視modal-320.png。
- prepare-articles、prepare-site與Vinext build通過：449發布文章、507 sitemap URLs，build-batch15.log。
- 列表、四篇與404在320/768/1440px共18檢查通過；layout-batch15/report.json。
- 全站正文224個附件HTTP200且與public來源逐位元組一致。

累計71篇reviewed-local、378篇unreviewed、1篇draft。全部文章實質審查仍未完成。

所有案例是離線合成教材，不宣稱設備、讀屏、人員辨識或安全功能實測。本批尚未提交、推送或發布。
