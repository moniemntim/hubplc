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
- 第二十九批完成混疊、濾波代價、週期聚合與重採樣四篇；新增混疊操作頁，累計108/341/1，詳見batch-29.md。
- 第三十批完成24 VDC支路壓降、ORing備援、現場盒插入與UPS事件四篇；共用四模式操作頁，累計112/337/1，詳見batch-30.md。
- 第三十一批完成0–10 V負載、24 V高低側開關、入口保護與致動器端到端四篇；共用I/O路徑操作頁，累計116篇reviewed-local、334篇unreviewed、1篇draft。同期另一提交新增並發布XCA文章，本批不修改其內容，詳見batch-31.md。
- 第三十二批完成既有 XCA ECU HTTPS 憑證指南的逐篇審查與台帳登錄；文章維持公開，累計117篇reviewed-local、333篇unreviewed、1篇draft，詳見batch-32.md。
- 第三十三批再審19篇公開文章：TON／TOF／TP與HMI品質頁面直接操作、Modbus讀取清單附件、26處公開文章延伸閱讀入口修正，並補PLC縮放教學與相關教材導覽；公開數量維持117篇，詳見batch-33.md。
- 第三十四批改善基礎教材在頁面直接操作的路徑，詳見batch-34.md；第三十五批再修四篇 PLC／HMI 教材，詳見batch-35.md。
- 第三十六批重新審查四篇 HMI 教材，補頁面內完整案例與來源／量測點，詳見batch-36.md；累計仍為117篇reviewed-local、333篇unreviewed、1篇draft。
- 第三十七批重新審查多人改值與登入逾時草稿兩篇，將固定判讀案例置於下載之前；公開與審核數量不變，詳見batch-37.md。
- 第三十八批重新稽核全部117篇公開文章的任務獨立性、可重現步驟、來源、版本、截圖與測試證據；未發現冒稱PLC／硬體已實測的文章，所有設備實測仍為未驗證。詳見batch-38.md。
- 第三十九批新增20篇 Excel 公式課程；逐課核對來源 Word、主範例、練習答案、公式、官方來源與對應截圖，並依作者本人提供的實測聲明記錄 Windows 版 Microsoft 365 與 Excel 2021 軟體驗證。累計137篇reviewed-local、333篇unreviewed、1篇draft，詳見batch-39.md。
- 第四十批新增 Excel 公式課程第21至50課共30篇；逐課核對來源 Word、主範例、三題練習、版本、官方來源與網頁版截圖，並延續作者本人提供的 Windows 版 Microsoft 365 與 Excel 2021 實測聲明。累計167篇reviewed-local、333篇unreviewed、1篇draft，詳見batch-40.md。
- 第四十一批完成兩篇 FX5U SD 卡教材審查：作者確認 BIN 與 CSV 寫入／讀回均已在 FX5U 與 SD 卡實際操作；網站另逐段核對控制資料、單次往返判準、圖片與官方來源，修正 CSV 讀取副本會覆寫結果等實作風險。累計169篇reviewed-local、331篇unreviewed、1篇draft，詳見batch-41.md。
- 第四十二批檢查目前公開內容與入口，修正搜尋建議、課程數量／首課標示及16篇Excel課文的資料位置與章節指引；審查與公開數量不變，詳見batch-42.md。
- 第四十三批改善首頁、文章目錄、Excel課程、閱讀頁與共用導覽的視覺層次，修正英文窄螢幕導覽溢位；文章數量與驗證紀錄不變，詳見batch-43.md。

## 暫時下架政策（2026-09-28）

依使用者要求，content/hidden-articles.json 暫停公開未審查文章，保留已處理文章及所有原稿。第四十一批完成後為331篇暫停公開、169篇reviewed-local、1篇draft，共501篇原稿。驗證公開政策再從 reviewed-local 中只產製已有硬體、模擬器或軟體驗證證據的文章；目前為3篇工業硬體驗證與50篇軟體驗證，共53條公開文章路由，另116篇已審查但尚無驗證證據的工業文章由產製階段動態暫停。發布腳本同時移除暫停文章的路由、列表、搜尋與推薦資料；正文中的下架文章連結轉為普通文字。sitemap由公開清單重新生成。

後續每批完成整改及驗證後，需明確從hidden-articles.json移除該批slug，再產製、建置並驗證發布；不要整份清空或僅改draft讓待整改文章重新曝光。
