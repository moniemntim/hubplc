---
title: HMI 趨勢圖怎麼選時間範圍才能支援值班判斷
description: 以虛構溫度十分鐘升高但日平均正常的案例，分辨即時、班次、日、週視圖，重算 time-weighted、SimpleAverage、MinMax 與 raw 查詢的差異。
date: 2026-09-17
author: 站長
draft: false
---

## 先為每個時間範圍定義用途

趨勢圖不是把同一條線拉長或縮短而已。即時視圖回答現在是否正在變化；班次視圖回答一個交班區間發生了什麼；日視圖看日內模式；週視圖看班日、維護或環境週期。先寫清楚用途、時間窗、資料密度、品質與尺度，再選 HMI 元件。本文的門檻和畫面分層是自訂設計，不是 ISA 強制規則。

| 視圖 | 建議時間窗 | 主要問題 | 必帶資訊 |
| --- | --- | --- | --- |
| 即時 | 現在至前30分鐘 | 目前是否仍在升高 | 目前值、quality、更新時間 |
| 班次 | 8或12小時 | 哪一段需交班 | start/end、事件標記 |
| 日 | 24小時 | 日內波動與尖峰 | aggregation、timezone |
| 週 | 7日 | 週期與維護影響 | 日期邊界、缺口 |

以虛構製程溫度為例，值班者需要知道目前75°C、十分鐘前60°C，以及最近樣點是否仍增加；日報則要另看平均、最大值與持續時間。同一historian可以供兩種畫面使用，但不能把日平均放進即時卡片就稱為目前溫度。本文未指定產品正常量程，60.0°C的平均也不能單獨證明安全或合格。

時間範圍還要和班別邊界對齊。若夜班是 22:00–06:00，日視圖不能默認以午夜切開就代表一個班；報告要同時保存 calendar date、shift start/end 和顯示 timezone。跨日查詢若沒有明示，交班者可能把 23:55 的尖峰和 00:05 的恢復拆成兩天。

每個視圖都要有退出路徑：即時發現偏差可切細窗口，班次發現重複可切日視圖，日視圖發現異常可回到 raw/近鄰樣本。不要讓使用者只能放大圖片，卻不能看到查詢模式、品質和實際時間。

同一個資料源可以服務不同視圖，但每個視圖都要有自己的判斷文字。即時顯示「目前上升」，日視圖只能顯示「日平均與最大值」，不能把日平均正常翻譯成目前沒有風險。這種文字契約可避免值班者把管理報表當成即時控制畫面。

## 十分鐘升高但日平均正常的重算

定義完整的一天：10:00至10:09維持60°C，10:09至10:10維持75°C，10:10回到60°C，其餘時間均60°C。這是分段常數、無缺值且品質合格的離線假設；全年任何實際趨勢都不能直接套用。一天共1440分鐘，其中1439分鐘為60°C、一分鐘為75°C，時間加權平均=(60×1439+75×1)/1440=60.0104°C，顯示一位小數為60.0°C。

| 查詢 | 輸入假設 | 算式/結果 | 可下的結論 |
| --- | --- | --- | --- |
| 10分鐘 time-weighted | 60°C 9分鐘、75°C 1分鐘 | (60×9+75×1)/10=61.5°C | 窗口內有升高 |
| 10分鐘 SimpleAverage | 兩個代表樣本 60、75 | (60+75)/2=67.5°C | 不代表時間占比 |
| 日time-weighted | 60°C 1439分鐘、75°C 1分鐘 | 60.0104°C | 平均掩蓋短暫高值 |
| 日 Maximum | 同一日最大樣本 75°C | 75°C | 需查尖峰時間 |

這個案例的結果是查詢選擇造成的可見性差異，不是兩個數值互相矛盾。time-weighted Average 和 SimpleAverage 的意義不同；MinMax 可能在每個 time slice 回傳兩列；LastValue 只回答窗口末端附近的值。使用者要看到 raw 或細 resolution 才能查升高開始時間，不能從日平均反推十分鐘事件。

若 historian 沒有每分鐘樣本，插值或資料缺口會改變結果。報告要列原始樣本、quality、start/end、timezone、aggregation、resolution、interpolation 設定；沒有證據時應標示估計或缺口。

十分鐘的61.5°C按已定義的持續時間計算；67.5°C則只對指定的60、75兩個樣本求算術平均，並不是保證historian會回傳兩列。實際查詢若含終點60、邊界種子值、插值或不同記錄頻率，樣本數與結果會不同。先檢查原始列、時間邊界及離散／類比儲存設定，再選聚合。

## 尺度 縮放 游標的正確用法

Power Chart 官方文件提供 Realtime/Historical range、Pan/Zoom 和 X-trace；Vision Easy Chart 有 Historical、Realtime、Manual mode 及 Raw、Fixed、Natural 等 resolution。這些是產品特定名稱，其他 HMI 不一定相同。縮放只改可見時間範圍，不會把聚合資料變成原始資料；若要查尖峰，重新選細 resolution 或 raw 查詢。

| 操作 | 應確認 | 常見誤讀 |
| --- | --- | --- |
| 切10分鐘 | 起訖、timezone、resolution | 以日線放大冒充raw |
| 開X-trace | 游標時間、顯示值、pen | 把插值值當樣點 |
| 換Y軸尺度 | 單位、上下限、是否共軸 | 不同單位直接比高度 |
| 看週視圖 | 日期/班日邊界、缺口 | 跨時區誤排事件 |
| 匯出 | 查詢條件與aggregation | 只保存圖片無法重查 |

游標讀到的值可能是圖形資料點、插值結果或聚合代表值，取決於元件和 query mode；它不是自動的原始樣點證明。若要證明 10:05:00 有一筆 75°C，必須從 historian 查詢該 timestamp、quality 和原始資料，而不是只引用 X-trace 顯示的 74.2°C。

不可比尺度也會誤導：供水溫度 °C、流量 L/min、閥位 % 要有各自 Y 軸或明確轉換；日平均和瞬時值不能畫在同一圖例卻省略 aggregation。趨勢標題要寫資產、unit、時間窗和資料模式。

尺度固定也不代表可比較。若一條線的 Y 軸 0–100、另一條線 50–80，視覺斜率和高度不能直接拿來比較；報告要把軸範圍、單位、pen 和轉換公式一起保存。游標讀值若來自聚合窗口，也要保留窗口起訖。

「平均」欄位寫清楚時間加權或樣本平均；「最大」寫清楚窗口與品質篩選。Ignition查詢可能包含endDate邊界，連接兩段查詢時需檢查交界是否重複；本篇手算時間段採左含右不含，不代表API自動採相同規則。核對實際回傳列後才能作報告。

## 截圖 報告與排錯流程

報告引用一張趨勢截圖時，檔名或附表保存 asset/tag、UTC start/end、顯示時區、pen、unit、quality filter、chart mode、resolution、aggregation、游標時間與產出時間。截圖旁寫「raw」「time-weighted average」或「SimpleAverage」，不要只寫「歷史趨勢」。這樣另一位工程師才能用同一條件重查。

| 症狀 | 先查 | 合理處置 |
| --- | --- | --- |
| 尖峰消失 | resolution、aggregation、quality | 縮小時間窗或查raw |
| 日平均正常 | 是否time-weighted、窗口 | 另看Min/Max與細窗 |
| 線條平直 | 資料記錄頻率、插值 | 查原始timestamp |
| 兩畫面不同 | timezone、provider、cache | 保存兩邊查詢條件 |
| 游標值怪異 | 是否插值/聚合 | 回 historian 查原樣本 |

若 Tag Historian 未啟用或資料源沒有 timestamp，Easy Chart 可能無法提供相同歷史功能；Power Chart 依賴 Tag Historian license。先查產品版本、模組授權、tag history enable、provider、權限和資料品質，再判斷畫面設定。不要用猜測的 component property 或 API 名稱補救。

完成結果應是一份可重現的判斷：即時視圖指出目前趨勢，十分鐘查詢證明升高窗口，日視圖說明平均未反映尖峰，報告保存 raw/aggregate 標籤。

排錯時先固定同一UTC起訖，比較原聚合與較細查詢；再只切換顯示時區，確認它不改變同一批資料的值。若修改本地輸入時區也改到UTC起訖，就已不是同一查詢。記下查詢時間與顯示時間兩套設定，避免把窗口換了誤當現場溫度改變。

## FAQ 來源與限制

FAQ1：日平均正常是否代表十分鐘尖峰不存在？不是，平均可能掩蓋短事件；要查細時間窗、MinMax 或 raw。

FAQ2：放大圖表就會看到原始樣點嗎？不一定，圖表可能仍使用聚合或插值資料。

FAQ3：X-trace 顯示 74.2°C，可以說現場在該秒就是 74.2°C 嗎？不能，先查 historian 原始 timestamp、quality 與 query mode。

FAQ4：所有 HMI 都有 Raw、MinMax 和 time-weighted Average 嗎？不能假設；需查指定產品和版本文件。

本篇數值是虛構手算，未連接冷卻水設備。Ignition 官方文件支持 Power Chart/Easy Chart 的時間範圍、X-trace、resolution 與 Tag Historian 聚合說明；不代表其他 HMI 相同。

參考：[Ignition Perspective Power Chart。](https://docs.inductiveautomation.com/docs/8.1/appendix/components/perspective-components/perspective-chart-palette/perspective-power-chart)

參考：[Ignition Vision Easy Chart。](https://docs.inductiveautomation.com/docs/8.1/appendix/components/vision-components/charts/easy-chart)

交付驗收逐項記錄：即時、班次、日、週的固定起訖；每個 pen 的單位與軸；raw 或聚合模式；品質與插值；游標讀值是否有原始樣本；截圖檔名和報告版本。若任何欄位未能從產品文件或查詢結果取得，就標示待確認，不用一句「趨勢正常」掩蓋缺口。

參考：[Ignition system.tag.queryTagHistory。](https://www.docs.inductiveautomation.com/docs/8.1/appendix/scripting-functions/system-tag/system-tag-queryTagHistory)

## 延伸閱讀

- [HMI 警報洪水時怎麼設計事件摘要與後續處理](/articles/hmi-alarm-flood-event-summary-followup)
- [HMI 趨勢游標與事件標記如何協助回看一次異常](/articles/hmi-trend-cursor-event-marker-time-alignment)
