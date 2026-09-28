# 第十批：數值閘門、配方確認／套用與工作快照

起點是 47 篇 reviewed-local、402 篇 unreviewed、1 篇 draft。上一輪已完成文章與驗證，屬於 progress；完整 449 篇發布文章的目標仍保留。

## 實質修正

- float-nan-inf-control-gate：可下載 binary32 bytes、端序、有限性／品質／閉區間 gate。加入不同 NaN fraction、正負 Inf、負零、subnormal、格式拒絕、有限 operands 經 f32 運算溢位。正文直接教讀者改 fixture 重跑，明示錯誤但合法端序可能仍通過範圍檢查。
- recipe-canonical-diff-confirmation-revision：沿用 recipe-v3 驗證器，定義完整替換及固定單位，拒絕 null、漏欄、未知欄和盲確認。確認綁定完整 old/next、目標、版本、使用者與 session，提供實際 SHA-256、單次受理和期限案例。
- recipe-select-verify-apply-device：與前篇共用 workflow，不再重複一套配方契約。選取／確認零寫入；四欄逐步假設備，第三欄逾時即 partial、第四欄未送；staging 區或錯 operation 不算 applied，未知結果禁止直接重跑。
- plc-parameter-snapshot：Edit／Confirmed／JobSnapshot 的 12 掃描案例，同時顯示版本與 qty/wait 實值。確認與接受同掃描延後、RUN 中保留快照、完成／中止保留 lastJob、IDLE terminal 阻止新或 pending 工作、版本耗盡不回捲。

全部為離線 Node.js 模型，未連 PLC、HMI、設備或原廠模擬器。配方固定 context 與可猜 ID 不是登入／安全 token；同步函式不證明正式交易原子性，假設備的中間狀態不證明機台可安全運轉。

## 複核修正

主線完整閱讀四篇、模型、fixtures 與測試。獨立複核找出確認後 hidden 欄位未在 apply 重查，以及虛擬時鐘上限使晚建立確認無法到期；已修正並通過 focused 再複核。主線另修正 externalUpdate 的固定 R1 約束、稀疏 outcomes 拒絕，並要求工作快照 terminal 優先與完整 stdout。float gate 明示 nan_payload 實為完整 fraction 含相關標誌位，不宣稱窮舉所有 NaN。

## 整合驗證

- node --experimental-strip-types --test tests/*.test.mjs：286/286 通過，見 outputs/editorial-review/unit-tests-batch10.log。
- tsc --noEmit、全專案 oxlint 通過；本批 22 個正文／附件／測試 oxfmt --check 通過。早期 demo tuple 的 lint 與 fixture JSON 格式問題已修正後重跑。
- 只複製各篇正文連結至獨立暫存資料夾，共八條 CLI 指令全部通過；四篇 demo stdout 與正文逐字一致。見 standalone-batch10.json。
- IEEE 754、Node Buffer、ECMAScript Math.fround、OWASP Transaction Authorization 原始來源已查閱，聲明限於實際支持的背景與 API。
- prepare-articles、prepare-site、Vinext build 通過：449 篇發布文章、507 sitemap URLs。見 build-batch10.log。
- 列表、四篇正文及 404 在 320/768/1440px 共 18 組版面／狀態／頁面錯誤檢查通過。見 layout-batch10/report.json。
- 全站正文 137 個附件 HTTP 200，與 public 來源逐位元組相同。
- git diff --check 通過。其他批次與使用者變更保留；沒有提交、推送或發布。

累計 51 篇 reviewed-local、398 篇 unreviewed、1 篇 draft。其餘文章仍需逐篇閱讀、修正與驗證；測試或建置通過不能替代全文審查。
