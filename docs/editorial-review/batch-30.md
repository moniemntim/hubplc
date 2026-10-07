# 第30批：24 VDC 供電鏈四篇整改

2026-10-07。四篇均全文重寫，原網址、日期與作者保留，並從暫時下架清單移除。

- `24vdc-sensor-power-voltage-drop`：把總容量敘述縮成支路問題；新增正負回路、接點電阻、最低允許電壓試算，以及 V1／V2／V3 三點量測。
- `24vdc-oring-redundancy-capacity-overload`：以剩餘單台驗算容量與末端電壓，分清 ORing、均流和 N+1；失效矩陣不含未核准的帶電短接。
- `24vdc-field-box-pluggable-power-integrity-hot-swap`：以 1000 µF、1 A 限流、0.8 A 啟動負載重算 0.288 J 與 120 ms；明示可拆接頭不代表可帶電插拔。
- `24vdc-ups-branch-event-correlation`：以 100 ms 取樣、50 ms 低壓及跨裝置誤差說明漏採與不可排序；新增六筆事件的觀察／推論／缺證表。

四篇共用 `PowerLesson`，但各自回答壓降、備援、插入浪湧與事件證據，不互相複製正文。公式為確定性離線模型；沒有 FX5U、UPS、電源、ORing 或熱插拔硬體測試。來源只支持產品或平台能力，不把文件閱讀寫成實測。

已執行驗證：

- 全部單元測試 433/433 通過，包含四種供電模型的正常、失敗及邊界案例。
- `tsc --noEmit`、全站 oxlint、14 檔 oxfmt check 與 `git diff --check` 通過。
- Vinext 建置成功；公開文章 112 篇、sitemap 199 個 URL。
- `power-lesson-browser.mjs`：四篇在 320／768／1440 px 共 12 組操作通過，另驗證無效輸入撤下結果與鍵盤恢復。
- `layout-browser.mjs`：首頁、文章目錄、四篇文章及 404 在三種寬度共 21 組通過。

累計 112 篇 `reviewed-local`、337 篇 `unreviewed`、1 篇 draft。硬體驗證仍為 false；正式部署與線上驗證另記。
