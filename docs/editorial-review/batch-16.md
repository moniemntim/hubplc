# 第十六批：按鈕回饋、輸入事件、讀回證據與操作程序

起點71篇reviewed-local、378篇unreviewed、1篇draft。上一批已完成修改與驗證，屬progress；全部449篇發布文章目標不變。

## 整合方向

設定值讀回篇直接使用既有operation-log-v1，不再另建數值解析或寫入模型；固定OP-884/50、52→55/revision42→43。主線刪除硬編碼零request再assert自身的假取消驗證，明示是合成事件讀取器，不操作設備。

警報SOP篇使用既有alarm-lifecycle模型，新增八步逐列assert的procedure-demo與空白紀錄CSV，重點是程序判定與失敗停留，不重講整份四態與結案流程。獨立唯讀審查未發現阻擋問題。

按鈕回饋與輸入事件各提供單檔離線HTML，前者演練Unknown原ID查詢與terminal不回退，後者以form submit單一入口保存snapshot。合成IME和手動可信lookup都明示不代表真實平台行為。

## 驗證

主線另修正互動案例：Unknown的可信lookup可完成、首命令的舊ID不得誤用當前ID、scenario送出後凍結、history滿前先擋狀態推進；輸入頁新增可按的synthetic事件入口、最近16筆診斷說明、120字元與長字串換行、第17筆直接顯示本次未送出。

- 全站單元測試386/386通過，unit-tests-batch16.log。
- tsc --noEmit、全專案oxlint、本批12檔oxfmt --check及git diff --check通過。
- 兩篇正文附件複製到獨立資料夾，五條CLI與正文text輸出核對通過；SOP八列CSV expected與實際stdout一致，status全not_run。
- 下載副本四種修改實跑：matched readback為applied、wrong revision為unknown、Operator/空evidence均拒結案且保留InProgress revision4；practice-batch16.mjs。
- 按鈕頁24項瀏覽器檢查、輸入頁keyboard/synthetic composition/repeat/pointerup/Pending/長字串/容量/取消檢查，在320/768/1440px通過；主線目視兩個320px截圖。
- prepare-articles、prepare-site、Vinext build通過：449發布文章、507 sitemap URLs，build-batch16.log。
- 列表、四篇與404在三種寬度共18檢查通過，layout-batch16/report.json。
- 全站正文230個附件HTTP200且與public來源逐位元組相同。

累計75篇reviewed-local、374篇unreviewed、1篇draft。全部文章實質審查仍未完成。

本批未提交、推送或發布；不宣稱PLC/HMI設備、真實IME、觸控硬體、後端認證或持久化實測。
