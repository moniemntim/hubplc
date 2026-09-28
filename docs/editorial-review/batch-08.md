# 第八批：延遲分段、退避斷路器、SQLite 交易與 HMI 重連

本輪起點為 39 篇 reviewed-local、410 篇 unreviewed、1 篇 draft。上一輪為 progress；仍保留全部 449 篇發布文章的逐篇實質審查目標。

## 本批工作

- communication-queue-backlog-diagnosis：以七個同時鐘端點拆六段延遲，四筆合成資料及三筆拒絕資料可下載重播。首位元組等待不等於設備故障，最大段落只是候選；容量與到達率轉連既有 FIFO 案例，刪除重複泛論。
- retry-backoff-jitter-circuit-breaker：固定 jitter 算術、含呼叫耗時的整體期限，以及序列化單一 permit 的離線斷路器。不能把固定樣本當成均勻分布驗證，或把狀態模型當成實際網路限流器。
- batch-database-transaction：真實本機 SQLite，B17 一表頭三明細、sum=60；第二筆 SQL 約束失敗與顯式取消都回滾，另一連線只在提交後看見完整批次。明確區分流程 trigger 與通用不可變 schema，兩個 SELECT 不是一般並行一致快照。
- hmi-reconnect-stale-callback-unknown-write：generation／viewToken／queryId 阻止舊畫面回覆；OP1 accepted 後斷線保留 unknown，查不到不重送，applied 後仍須放開再按才建立 OP2。另以真的 Node EventEmitter 驗證十次掛載與解除，不宣稱 HMI SDK／瀏覽器／PLC 實測。

## 複核修正

主線已逐篇閱讀正文、範例與測試；修正 SQLite observer 時點、trigger 保證範圍、分段欄位名稱，以及 HMI 沒有現行命令時的回覆處理。獨立只讀複核 HMI 未發現阻擋問題，focused 5/5 與 demo 通過。

斷路器原模型只在 completion 檢查 probe deadline，無回覆時會持續占用 permit；已增加顯式時間觀察、相等邊界優先逾時、過期回覆隔離，以及安全整數上限與連敗窗口測試。主線另補整體呼叫／等待期限相等與 probe deadline 溢位測試。

## 整合驗證

- node --experimental-strip-types --test tests/*.test.mjs：238/238 通過，見 outputs/editorial-review/unit-tests-batch8.log。
- tsc --noEmit、全專案 oxlint、本批 18 個附件／測試與四篇正文的 oxfmt --check 通過。全專案 lint 首次抓到 breaker 兩處 prefer-const，修正後重跑通過。
- 四篇只複製正文下載檔到獨立暫存資料夾，共六條指令全部通過；包含 queue public 自測 2/2、breaker public 自測 4/4。見 outputs/editorial-review/standalone-batch8.json。
- SQLite stdout 與文章、README 精確相同；退避時間線與正文 transcript 相同。HMI 16 事件與兩行 PASS 經主線及獨立複核。
- Node Events、SQLite Transaction／Isolation 與 AWS 官方重試文件已查閱核對。合成 jitter 樣本不聲稱均勻分布通過。
- prepare-articles、prepare-site、Vinext build 通過：449 篇發布文章、507 sitemap URLs。見 outputs/editorial-review/build-batch8.log。
- 文章列表、四篇正文與 404 在 320／768／1440px 共 18 組版面／狀態／頁面錯誤檢查通過，見 outputs/editorial-review/layout-batch8/report.json。
- 全站正文的 105 個附件連結皆 HTTP 200，與 public 來源逐位元組相同。
- git diff --check 通過。原有其他批次與使用者變更保留，沒有提交、推送或發布。

累計 43 篇 reviewed-local、406 篇 unreviewed、1 篇 draft。本文模型未連接 PLC、HMI 或設備；SQLite 為本機資料庫實驗，並未測試硬體斷電或外部控制效果。全部文章的實質審查仍未完成。
