# 文章逐批實質審查

範圍是全部發布文章；未列入 `ledger.json` 的文章均為未審查，不因通過建置或重複文字掃描而視為合格。

`ledger.json` 保存已完成的逐篇處理、證據與文字 SHA-256（CRLF 正規化成 LF）。`inventory.json` 列出每篇狀態。文字變更後顯示 `changed-since-review`，必須重新核對，不能直接以新雜湊覆蓋舊紀錄。

執行 `node scripts/editorial-review-status.mjs --write` 更新盤點。這支程式只追蹤範圍與版本，不做語意評分。

每一批必須讀完正文，檢查標題承諾、步驟、輸入與預期結果、來源支持、附件是否存在、與其他文章是否重疊。教材自訂條件要明說；文件推導、離線模型、原廠模擬器及設備實測分開記錄。沒有設備測試紀錄，不能寫成實測成功。

狀態 `reviewed-local` 表示此版本已實質修正並在本機核對，不表示已發布，也不表示現場硬體驗證。文章適合整合時先整理內容與內部連結，再評估舊網址相容性；不僅憑標題相近刪文。

## 待處理

- 第五批已處理異常模擬矩陣、單掃描 Trace、強制清場、模擬／實機輸入差異及最小重現映射，詳見 batch-05.md。
- 第六批處理請求握手、序號重用／晚到回覆、步驟逾時復歸與 Watchdog，最終狀態與證據見 batch-06.md 及 ledger。
- 第七批已處理 async-out-of-order-pending-map、plc-task-timeout-reentry-backlog、latency-injection-timeout-retry、idempotency-key-duplicate-write，詳見 batch-07.md。
- 第八批已完成 communication-queue-backlog-diagnosis、retry-backoff-jitter-circuit-breaker、batch-database-transaction、hmi-reconnect-stale-callback-unknown-write，詳見 batch-08.md。累計 43 篇，仍有 406 篇發布文章未審查。
- 第九批已完成配方 schema、operation log、離線 HMI 與接收串流，詳見 batch-09.md。累計 47 篇 reviewed-local，402 篇發布文章未審查，1 篇 draft。
- 第十批已完成數值特殊值、配方差異確認、配方套用與工作參數快照，詳見 batch-10.md。累計 51 篇 reviewed-local、398 篇發布文章未審查、1 篇 draft。
- 第十一批已完成精確數值輸入、多人改值、雙來源CAS及共用資源排程，詳見 batch-11.md。累計 55 篇 reviewed-local、394 篇發布文章未審查、1 篇 draft。
- 第十二批已完成FIFO、serial ASCII、通訊停止品質與多語系輸入，詳見 batch-12.md。累計59篇 reviewed-local、390篇 unreviewed、1篇 draft。
- 第十三批已完成警報生命週期、人工結案、壓力遲滯與穩定排序，詳見 batch-13.md。累計63篇 reviewed-local、386篇 unreviewed、1篇 draft。
- 第十四批已完成通知擱置、洪水摘要、優先級互動頁與事件時間線，詳見 batch-14.md。累計67篇 reviewed-local、382篇 unreviewed、1篇 draft。
- 第十五批已完成換色、對話框焦點、品質與斷線顯示；共用優先級HTML與顯示投影減少重複。詳見batch-15.md。累計71篇 reviewed-local、378篇 unreviewed、1篇 draft。
- 第十六批已完成按鈕回饋、輸入事件、讀回證據與警報程序，詳見batch-16.md。累計75篇 reviewed-local、374篇 unreviewed、1篇 draft。
- 第十七批完成載入、綁定、INT16與裁切、趨勢窗口，詳見batch-17.md。累計79篇 reviewed-local、370篇 unreviewed、1篇 draft。
- 第十八批已完成趨勢游標、警報報表、步驟畫面與交班，詳見batch-18.md。累計83篇 reviewed-local、366篇 unreviewed、1篇 draft。
- 使用者要求先發布已完成部分；reviewed-local表示已審查來源狀態，部署證據另記，不代表所有文章完成。
- 第十九批完成操作權限與角色降級兩篇，共用授權教材；累計85篇 reviewed-local、364篇 unreviewed、1篇 draft，詳見batch-19.md。
- 第二十批完成手自動與維護模式兩篇，共用模式案例；累計87篇 reviewed-local、362篇 unreviewed、1篇 draft，詳見batch-20.md。
- 第二十一批完成登入逾時草稿與長短按兩篇，附離線模型及可操作HTML；累計89篇 reviewed-local、360篇 unreviewed、1篇 draft，詳見batch-21.md。
- 第二十二批完成Tick回繞與週期排程兩篇，共用可執行時間模型；累計91篇 reviewed-local、358篇 unreviewed、1篇 draft，詳見batch-22.md。
- 第二十三批完成角度差與分段插值兩篇，補可執行邊界及修改練習；累計93篇 reviewed-local、356篇 unreviewed、1篇 draft，詳見batch-23.md。
- 第二十四批為內容整改第一輪：入口操作路徑、故障復歸頁面互動與未編譯ST對照；不是新增篇數，仍93/356/1。驗收方向見remediation-criteria.md，證據見batch-24.md。
- 第二十五批完成類比換算與異常判讀整改：頁面直接操作、公式與品質分離；累計95/354/1，詳見batch-25.md。
- 其餘文章依 inventory.json 逐批閱讀；既有抽樣筆記不是全文審查完成證明。
- 第二十六批完成五點誤差判讀整改：直接比對偏移／跨度／中間點案例，分開電流注入與壓力基準；累計96/353/1，詳見batch-26.md。
- 第二十七批整組完成資料品質、尖峰、溫漂、長期零漂四篇，兩篇共用頁面重播；累計100/349/1，詳見batch-27.md。
- 第二十八批完成方向、階躍響應、換件、串擾四篇；新增兩篇頁面試算，累計104/345/1，詳見batch-28.md。
