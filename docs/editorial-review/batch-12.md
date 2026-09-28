# 第十二批：FIFO、串列訊框、通訊資料品質與多語系輸入

起點55篇 reviewed-local、394篇 unreviewed、1篇 draft。全部449篇發布文章仍在逐批審查；機器掃描不視為逐篇完成。

## 內容與整合

- plc-fifo-product-tracking：容量5、head-only ring buffer；同掃描先入列再處理站點事件，滿時先拒P06再出P01。P03明確跳S1，S2出列。事件ID綁內容，duplicate/conflict分開；產品與事件ID各有界，拒絕事件也消耗合法ID。正文加入逐掃描狀態表與可修改練習。
- serial-ascii-stx-length-etx-framing：自訂STX02、三位ASCII長度1..128、可列印payload、ETX03。逐byte、分段與黏包一致，完整frame才發布；500ms總期限等號優先，fault停流而非自動resync。輸入、候選frame與輸出均有界。
- multilingual-unit-decimal-format：共用上一批numeric-input契約；canonical raw=C×10，顯示使用Intl.NumberFormat，输入語系與單位固定在草稿。BigInt精確華氏反轉與步距拒絕，1001個raw往返測試。刪除重複概念、FAQ及不在設定範圍內的混雜案例。
- communication-stop-data-quality-watchdog：外部監視器與虛擬時鐘，停止／突斷、心跳／資料年齡、歷史值／新值、舊epoch／新epoch分開。

## 複核修正

主線發現serial demo在練習改成合法但不完整payload後會存取null fault；已改為顯示stage/published，實跑補ETX前後行為。另加最大133-byte frame與safe-integer deadline邊界。

FIFO補正event ID型別／尾換行與product ID控制字元，新增wrong-order及empty事件消耗ID的證據，明示epoch只是ID格式而非fencing。主線實跑下載副本將SKIP改COMPLETE練習，得到AT_S2後出列。

Locale獨立唯讀複核通過；主線另修正被拒草稿後的demo操作順序，實跑26,5→raw265／79.7°F與錯語系拒絕保留raw253兩個下載副本練習。NIST溫度換算與ECMA-402 NumberFormat官方來源已核對。

## 驗證

主線修正通訊模型：所有事件先檢查心跳期限，拒絕舊epoch也更新既有資料年齡；total source age隨時間推進。逾時後tick繼續更新age且不解除鎖定，graceful stop不能清除watchdog；被拒候選資料不能污染保留值的timestamp metadata。新增對應回歸測試。

- node --experimental-strip-types --test tests/*.test.mjs：340/340通過，unit-tests-batch12.log。
- tsc --noEmit、全專案oxlint、本批28檔oxfmt --check、git diff --check通過。
- 四篇只複製正文連結附件到空資料夾，10條CLI命令通過；四篇demo固定輸出與正文逐字對照通過。
- 修改練習實跑：FIFO SKIP→COMPLETE；serial合法payload但缺ETX／補ETX；locale26,5與錯語系；quality599/600/900ms。固定demo斷言未削弱。
- prepare-articles、prepare-site及Vinext build通過：449篇發布文章、507 sitemap URLs，build-batch12.log。
- 列表、四篇正文與404在320/768/1440px，共18組版面／頁面狀態／pageerror檢查通過，layout-batch12/report.json。
- 全站正文177個附件HTTP200，逐位元組與public來源相同。

累計59篇reviewed-local、390篇unreviewed、1篇draft。本批未提交、推送或發布；全量實質審查尚未完成。

本批均為Node離線教學模型，沒有PLC、HMI SDK、實體串口或設備實測；不冒稱原廠模擬器或完整OPC UA StatusCode實作。
