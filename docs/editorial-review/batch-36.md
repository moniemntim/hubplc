# 第三十六批：四篇 HMI 教材的頁面內案例與重新審查

日期：2026-10-12。逐篇閱讀下列四篇正文，對照各自固定輸入、可下載模型及輸出。四篇原本已公開，本批沒有新增文章；`reviewed-local` 只表示目前版本的文字與合成案例在本機核對，不代表 HMI、PLC、流程服務或現場設備實測，也不代表 AdSense 審核通過。

## 標題、案例與差異

| 文章 | 頁面內可以完成的任務 | 與相近文章的界線 |
| --- | --- | --- |
| `hmi-trend-cursor-event-marker-time-alignment` | 由 3000 ms=62、6000 ms=80 的 Good 樣點，手算 3200 ms 游標為 `INTERPOLATED 63.2`，並辨認 RAW、OUTSIDE、Bad 的反例。 | 處理趨勢讀圖身分與事件時鐘；不是 HMI 舊值顯示或寫入控制。 |
| `hmi-report-filter-time-window-alarm-state` | 以 `[22:00,06:00)` 判斷 P02 截止邊界、P03 跨窗前情、P04 截止前 ACK 與 P05 未知歷史；得到 Active=P01/P02、未確認=P03/P02。 | 處理歷史查詢與 coverage；不是即時警報確認工作流。 |
| `hmi-reconnect-stale-callback-unknown-write` | 在頁面追蹤 OP1 accepted→斷線→舊值 99 丟棄→新值 9 套用→`not-found` 仍 unknown→applied→放開再按送 OP2；核對 payload 與 sends。 | 處理重連後查詢身分與未知命令；不同於一般按鈕回饋或服務端冪等文章。 |
| `hmi-batch-step-wait-failure-reason` | 逐筆判讀等待、Bad/Unknown、來源報告的 `PROCESS_TIMEOUT`、有來源證據的 COMPLETE，分開 5000 ms 新鮮度與流程 timeout。 | 只投影權威 snapshot；不同於 PLC 步驟 timeout 的控制邏輯。 |

正文均先交代輸入欄位的來源與量測點，再列操作步驟、完整結果、反例、常見錯誤與下一步查證。四篇將下載路徑留作進階重播，不要求讀者先安裝 Node 才看見案例。相近主題的文章任務不同，因此保留原網址及交叉連結。所有時間與數值屬固定教材；沒有現場量測、登入驗證或設備寫入。特別核對 `acquiredAtMs=120000` 只是合成快照取得時刻，不能當作流程等待 120 秒的證據。

## 本機核對

- 已讀四篇最終正文與其對應固定案例；`node public/examples/trend-cursor/demo.mjs`、`node public/examples/alarm-report/demo.mjs`、`node public/examples/hmi-reconnect/demo.mjs`、`node public/examples/batch-step-view/demo.mjs` 均印出預期結果及 PASS。
- `node scripts/prepare-articles.mjs` 產出 117 篇公開文章；`node --experimental-strip-types scripts/prepare-site.mjs` 產出 204 個 sitemap URL（工具整併前數字）。
- `tests/content-value-layout-browser.mjs` 已在本機正式建置的伺服器檢查含這四篇在內的 22 條路由、320／768／1440 px、HTTP 及橫向溢位，通過；`tests/articles.test.mjs` 通過。

這些核對不代表 Google 已重新抓取或 AdSense 已解除「缺乏價值的內容」。正式發布、Workers Build 與線上路由另行核對。
