---
title: 背景通訊任務與主循環共享資料快照
description: 以完整snapshot與版本驗收說明背景通訊任務和主循環如何避免欄位混搭，並比較lock、single writer與double buffer。
date: 2026-09-21
author: 茂伯
draft: false
category: 工業通訊與網路
---

## 一 先定義共享資料的完整快照

背景通訊任務與主循環若直接共用 value 變數，主循環可能讀到新值、舊 quality 或不同批次 timestamp。本文建立一個完整 snapshot：value、quality、timestamp、version 必須屬於同一次發布。主循環只消費已完成的 snapshot，通訊任務只寫入下一個版本。這是自訂資料模型，不假設任何 PLC 廠商 API 或記憶體語意。

案例設備每100 ms回報溫度。通訊任務在10:00:00.100收到25.3、Good、採樣時間10:00:00.080，建立version=41；主循環若讀到value=25.3卻仍配version=40的Bad，就會錯誤觸發告警。因此驗收必須把四欄當一個不可拆的邏輯單位。

| 欄位 | 案例值 | 用途 | 不能單獨判斷 |
| --- | --- | --- | --- |
| value | 25.3 | 工程值 | 不能代表品質 |
| quality | Good | 可用性 | 不能代表時間 |
| timestamp | 10:00:00.080 | 來源採樣時間 | 不等於接收時刻 |
| version | 41 | 快照世代 | 不能代替數值 |

snapshot 還要區分 source timestamp 與 receive timestamp。前者由設備資料帶來，後者由通訊任務收到時記錄；主循環可用同一單調時鐘計算抵達後年齡；這尚未涵蓋採樣至抵達的時間，不能用 source timestamp 直接推論網路延遲。

第一個設計決策是所有欄位的發布邊界。可使用 lock 保護整個結構、single writer 加讀取鎖，或 double buffer 搭配明確發布協議。僅交換一個指標並不自動保證 memory visibility；必須依目標語言與執行環境核對同步語意。

snapshot 應帶 schema_version 與 source_id，避免不同設備以相同欄位名稱表達不同單位。value=25.3 若沒有 unit 或來源，主循環不能自行猜成攝氏。這些欄位也應在同一發布邊界，否則仍會出現跨批次混搭。

讀取端複製完成後可把 version 寫入診斷紀錄，計算、告警與畫面都使用同一份 local copy。不要在計算途中再次直接讀共享結構，否則一次處理可能混入下一版。

## 二 lock 與 single writer 的可驗證流程

lock 方案讓 writer 取得互斥鎖，先在鎖內填 value、quality、timestamp，再遞增 version，最後釋放鎖；reader 取得同一把鎖後複製完整 snapshot，再解鎖。reader 在鎖外做計算，避免長時間阻塞通訊任務。version 可從1開始，每次完整發布只加1。

single writer 不是「只有一個寫入者」就足夠。仍要定義 reader 如何看見完成寫入，以及初始化是否完成。若一個通訊任務寫入、兩個主循環讀取，讀取端仍需共同同步機制。收到部分封包時 writer 不得先改共享 value，應在 local candidate 完成解析與驗證後一次發布。

| 階段 | writer動作 | reader可見狀態 | 驗收 |
| --- | --- | --- | --- |
| 解析中 | 只寫local | 上一完整version | 不可看到半包 |
| 驗證完成 | 組snapshot | 仍是上一版 | quality與value一致 |
| 發布 | 鎖內複製並version+1 | 新完整version | 四欄同批 |
| 讀取 | 不再改共享區 | 複製後計算 | 鎖外運算 |

具體錯誤案例：writer先寫value=26.1，接著解析 quality 時逾時，reader 剛好讀到 value=26.1、quality=Good、timestamp=上一筆。這種中間狀態即使偶爾出現也不可接受；lock 或等價發布協議應讓 reader 只看舊完整快照或新完整快照。

若資料無效，仍要發布一個完整狀態，例如 value 保留上一有效值、quality=Bad、timestamp 保留來源欄位並另記 receive timestamp。不可只寫一個 error flag 而讓 value 來自另一版本。

lock 的範圍只包住複製與發布，不包住網路讀取或資料庫寫入。網路操作放在鎖內會讓主循環長時間等待，反而造成週期抖動；先在local區完成，再以短鎖發布。

若 writer 解析失敗，local candidate 應帶明確 reason與接收批次，不能沿用上一次 reason 再把 quality改成Bad。完整錯誤 snapshot讓排查能知道哪一筆失敗。

## 三 double buffer 與記憶體可見性

double buffer 可準備兩份結構：active 是讀者使用的完整快照，back 是 writer 填寫的區域。writer 填完 back 後，必須用目標平台支援的同步原語發布交換，再讓 reader 取得新的 active。不能把「指標交換很快」當成可見性保證，因為編譯器、CPU 或執行緒排程可能重排讀寫。

若環境提供 atomic pointer 或 memory order，應讀其官方語意並以 acquire/release 或等價機制建立 happens-before；若沒有明確語意，使用 lock 比猜測安全。本文不宣稱任一 PLC、RTOS 或腳本環境自動具備這些保證。

| 風險 | 表面現象 | 真正要核對 |
| --- | --- | --- |
| 只換指標 | reader偶爾舊欄位 | 發布與可見性順序 |
| 沒有初始化 | 第一筆全零 | 初始quality與version |
| 兩個writer | version跳號 | 唯一寫入者或鎖 |
| 長時間持鎖 | 週期抖動 | 鎖內只複製快照 |

初始化也要是完整 snapshot。啟動時可設定 value=未定義、quality=Unknown、timestamp缺省、version=0；主循環看到 Unknown 不得把零當成真實量測。第一筆有效資料完成解析後才把 quality 改為Good。

驗收要用壓力與故意延遲放大競態窗口：在 writer 填 value 和 quality 之間插入延遲，reader 高頻讀取並檢查每筆四欄是否屬於同一 version。若出現混搭，就表示同步邊界錯誤，而非單純通訊延遲。

double buffer 的兩份結構都要有初始化與所有欄位，不能只初始化 value。交換後舊 buffer 何時可重用，也要確定沒有 reader 還在使用；必要時以鎖或引用生命週期保護。

memory visibility 測試不應只跑一次。以高頻 writer/reader 重複數百萬次仍未出錯，也只能支持測試環境；正式結論仍需依語言與平台同步規格。

## 四 具體驗收與失敗排查

測試設備每100 ms送遞增序號。正常有效測試version從1到100，每筆value=version×0.1；Bad測試另依保留上一有效值的政策，quality輪流Good與Bad。主循環每10 ms複製snapshot並檢查：version不倒退、同一version的四欄不可混搭、Bad時不得使用新值觸發控制。

第二項測試讓第41筆在解析中逾時。預期共享區仍保持version=40的完整快照；writer完成錯誤處理後才發布version=41、quality=Bad及明確的接收時間。若主循環看到value=4.1但version=40，判定失敗並保存讀取紀錄。

| 驗收項目 | 輸入 | 預期 | 失敗線索 |
| --- | --- | --- | --- |
| 遞增版本 | 1..100 | 不倒退、不混搭 | version跳回 |
| 解析延遲 | 第41筆中斷 | 先維持40 | value/version不符 |
| 無效資料 | CRC錯誤 | 完整Bad快照 | 只改error flag |
| 高頻讀取 | 10ms reader | 每筆可重現 | 偶發半更新 |

排查順序先看版本與 snapshot log，再看 lock/發布事件，最後才看設備值。若 version 正確但 source timestamp 不前進，可能是設備重送或採樣未變；不能把所有問題都歸因於競態。若 version 混搭，先停用無鎖指標交換並改用已核對的同步方案。

本文說明資料一致性與驗收方法，不提供控制輸出或安全互鎖程式。實際系統仍需依目標執行環境確認鎖、atomic、記憶體屏障與任務週期的支援範圍。

可加入 checksum 或結構版本以偵測記憶體被意外覆寫，但 checksum 不是同步機制。若 checksum 計算時欄位仍被 writer 修改，結果同樣不可靠；先完成發布，再在獨立副本驗證。

主循環若錯過多個版本，不一定是競態；可以記錄 skipped_versions=新version-舊version-1，並依需求決定是否需要每一版都處理。資料一致與資料不遺失是兩個不同要求。

## 五 驗收 FAQ 與來源

完整 snapshot 的核心是 value、quality、timestamp、version 同批發布；lock、single writer 或 double buffer 都必須有明確同步語意。指標交換、volatile 或「只有一個 writer」不能單獨視為跨執行緒可見性證明。

FAQ1：只要 value 是原子型別就安全嗎？答：不一定。quality、timestamp與version仍可能來自不同批次，應保護整個snapshot。

FAQ2：double buffer 換指標就一定安全嗎？答：不一定，仍需目標平台支援的發布與記憶體可見性規則；不確定時用lock。

FAQ3：Bad資料可以只更新quality嗎？答：應發布完整Bad snapshot並保留欄位關係，不讓value看似來自新批次。

FAQ4：source timestamp 可以拿來算通訊延遲嗎？答：不能單獨算，還需receive timestamp與時鐘基準。

參考：[Microsoft C++ atomic官方文件：原子操作背景，非PLC API。](https://learn.microsoft.com/en-us/cpp/standard-library/atomic?view=msvc-170)

參考：[Microsoft C++ memory_order官方文件：同步順序，非PLC通用語法。](https://learn.microsoft.com/en-us/cpp/standard-library/atomic-enums?view=msvc-170)

驗收應包含兩個 reader 同時讀取，確認它們各自複製到完整快照，不會一個看到 value新、另一個看到 quality舊。若使用single writer，兩個reader仍必須遵守同一發布協議。

現場診斷畫面也應顯示 version、quality與receive timestamp，讓工程師能把告警當下的資料版本對回通訊日誌，而不是只看到最後一個value。

若資料需要跨多個主循環週期使用，保存讀取時的完整snapshot與version，不要把欄位拆成多個全域變數。後續計算若發現version已變，可依需求重算，但不應靜默混合兩版。

## 延伸閱讀

- [設備回應過長被截斷如何拒絕不完整資料](/articles/reject-truncated-device-response)
- [連線恢復後第一筆資料的新鮮度判斷](/articles/reconnect-first-data-freshness)
