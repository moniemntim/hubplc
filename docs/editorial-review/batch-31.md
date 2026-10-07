# 第31批：PLC I/O 電氣路徑四篇整改

2026-10-07。四篇均全文重寫並從暫時下架清單移除，原網址、日期與作者保留。

- `0-10v-analog-load-ground-response-open-circuit`：將負載分壓與地電位差分開計算，新增現場欄位來源、0／5／10 V 注入與開路診斷邊界。
- `24v-high-low-side-bjt-mosfet-switching`：以 0.2 A 負載比較 MOSFET／BJT 損失，並以 100 mH 線圈重算 24 V 與 0.7 V 箝位的理想衰減時間。
- `24v-input-reverse-polarity-tvs-surge-protection`：同時檢查最低輸入的負載電壓及最高端 TVS VRWM／VC 預算，分離反接、回灌、突波與持續故障。
- `actuator-output-end-to-end`：以線圈兩端都為 24 V 的案例證明差動電壓為 0，再按 PLC 命令、輸出、線圈、機構與回饋五層縮小故障範圍。

四篇共用 `IoPathLesson` 的四種模式，但正文與判斷目標不重複。所有結果是確定性離線計算；沒有 FX5U 類比模組、輸出模組、TVS 浪湧、電磁閥或致動器實測。

工作期間另一個提交新增並發布 `xca-ecu-https-certificate-setup.md`。本批不修改該原稿或其發布狀態，因此目前來源文章共451篇、公開文章預期117篇；本批整改完成的仍為其中116篇 `reviewed-local`。

本批亦修正文章產製器在相關文章清單為空時產生隱含 `any[]` 的型別錯誤，並加入回歸測試；不改變既有相關文章排序。

已執行驗證：

- 全部單元測試 437/437 通過，包含四種 I/O 路徑模型與文章產製器空清單回歸。
- `tsc --noEmit`、全站 oxlint、16檔 oxfmt check 與 `git diff --check` 通過。
- Vinext 最終合併狀態建置成功；公開文章117篇、sitemap 204個URL，其中116篇為已登錄整改文章，XCA文章保留同期提交的公開狀態。
- `io-path-lesson-browser.mjs`：四篇在320／768／1440 px共12組操作通過，另驗證無效輸入撤下結果與鍵盤恢復。
- `layout-browser.mjs`：首頁、文章目錄、四篇文章及404在三種寬度共21組通過。

累計116篇 `reviewed-local`、334篇 `unreviewed`、1篇draft。硬體驗證仍為false；正式部署與線上驗證另記。
