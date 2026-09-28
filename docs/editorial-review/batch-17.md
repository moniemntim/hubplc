# 第17批：載入、綁定、數值裁切與趨勢窗口

狀態：reviewed-local，未發布；review date 2026-09-28。

## 審查與重寫

四篇原文已全文閱讀，將重複抽象建議收斂成四個不同的診斷目的：

- hmi-loading-partial-empty-error-cancel：單檔固定回覆；新查詢建立身份並清除舊資料，同頁去重/衝突、反向分頁、empty/error terminal、cancel晚回覆。主審修正固定epoch依賴、terminal被晚回覆改寫及正文任意回覆都同狀態的錯誤承諾。
- hmi-binding-animation-diagnosis：固定25/26/27與嚴格型別、Good/Auto/enable，四種真DOM故障；改為靜態指示案例，不宣稱原生HMI或動畫能力。
- hmi-numeric-overflow：自訂INT16文字契約，先BigInt範圍檢查；實際scrollWidth/clientWidth判斷裁切，原文/解析值/完整顯示分開。小數捨入改連既有案例，避免重複解析規則。
- hmi-trend-time-range-sampling-aggregation：半開segment、BigInt累積duration×tenths、完整窗口與已知段平均分開，明列raw-change seed平均不是窗口原始样本平均。獨立審查發現raw支線漏值域限制，已修正並新增回歸測試。practice只印結果，不再無條件印PASS。

所有案例為離線瀏覽器或Node教材，無PLC/HMI實機驗證。保留原始日期和茂伯作者。

## 實際驗證

- `node --experimental-strip-types --test tests/*.test.mjs`：391/391通過，unit-tests-batch17.log。
- `node node_modules/typescript/bin/tsc --noEmit`、全專案oxlint、17檔oxfmt --check、git diff --check通過。
- `node tests/loading-states-browser.mjs`：三寬度，重複A/B身份、stale、terminal、反向分頁、cancel、duplicate/conflict、未知rows總數、無網路請求/頁面錯誤/橫向溢位。
- `node tests/binding-diagnosis-browser.mjs`：24項檢查，三寬度及四種DOM故障。
- `node tests/numeric-overflow-browser.mjs`：三寬度、正負邊界、格式/長度拒絕、完整值與裁切分離；另經唯讀獨立檢查。
- 主線目視三個HTML的320px截圖。
- `node outputs/editorial-review/standalone-batch17.mjs`：正文附件複製到獨立資料夾，demo/self-test/practice與正文固定stdout一致；gap/Bad不補零。
- `node outputs/editorial-review/practice-batch17.mjs`：照正文修改副本，輸出knownDuration570000、coverage.95、fullWindowMeanC null、knownMeanC60。
- prepare-articles、prepare-site、Vinext build通過：449發布文章、507 sitemap URLs；build-batch17.log。
- 列表、四篇與404於320/768/1440px共18排版檢查通過；layout-batch17/report.json。
- 全文239個附件HTTP成功且與public來源逐位元組相同。

累計79篇reviewed-local、370篇unreviewed、1篇draft。整體逐篇審查尚未完成；這不是發布紀錄。
