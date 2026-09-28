# 第十三批：警報生命週期、處理工作流、遲滯與排序

起點59篇reviewed-local、390篇unreviewed、1篇draft。上輪完成內容與驗證，屬progress。全部449篇發布文章的目標不變。

## 整合方向

第一篇alarm-acknowledge-clear-occurrence與第二篇hmi-alarm-ack-clear-reset-workflow共用同一lifecycle模型，分別教Active/Acked/occurrence與人工Open/InProgress/Resolved；保留原網址，減少概念重複。刪除不屬案例的洪水、品牌畫面與泛用FAQ支線，明示不是OPC UA或真實登入實作。

repeated-alarm-clear-condition聚焦原始整數壓力、嚴格門檻、有效樣本持續時間、Bad/gap與鎖存復歸，不再重講整份確認工作流。

alarm-severity-time-stable-order只接收整理好的occurrence快照，固定total key、時間可信前提、完整identity、exact duplicate與衝突拒絕、同快照分頁。六筆資料720種排列得到同順序及snapshot ID；排序不能代替原始事件處理器。

## 主線複核

排序案例獨立唯讀審查未發現具體問題；主線實跑下載副本severity950/700/0三個練習，第一列變B、恢復原序與明確拒絕均吻合。OPC Foundation Part5 6.4.2的Severity定義已實際查核。

主線要求生命週期補齊有界log、完整Ack內容綁定、Ack人員時間備註、工作流revision及容量故障狀態，避免文件聲稱可追溯卻只保存最後旗標。壓力模型需分開sample quality/evaluationKnown，且低壓候選期間不能只因active尚未啟動就接受解除鎖存。

## 驗證

主線已完成全部四篇與程式複核，另修正undefined request驗證，新增缺少Ack／evidence拒絕回歸；生命週期的最終獨立唯讀複核未發現剩餘問題。故障後known=false並拒絕後續mutation，不能把保留狀態當即時。

- node --experimental-strip-types --test tests/*.test.mjs：356/356通過，unit-tests-batch13.log。
- tsc --noEmit、全專案oxlint、本批27檔oxfmt --check、git diff --check通過。
- 四篇只複製正文附件到獨立空資料夾，12條CLI指令通過；三篇正文text區塊及壓力篇README全輸出與實際stdout一致。
- 下載副本修改練習：Ack同內容回放、Operator或空evidence拒結案、壓力起報提前至2500ms且10501ms才clear、排序950/700/0均實跑符合預期。
- prepare-articles、prepare-site、Vinext build通過：449發布文章、507 sitemap URLs，build-batch13.log。
- 列表、四篇正文與404在320/768/1440px，共18組版面／狀態／pageerror檢查通過，layout-batch13/report.json。
- 全站正文197附件HTTP200且與public來源逐位元組一致。

累計63篇reviewed-local、386篇unreviewed、1篇draft。本批未提交、推送或發布；全部文章實質審查仍未完成。

全部為離線軟體教材，不宣稱PLC、HMI、OPC UA、安全功能或現場設備實測。
