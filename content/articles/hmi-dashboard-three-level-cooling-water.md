---
title: HMI儀表板的三層狀態顯示
description: 以虛構冷卻水系統說明總覽、診斷、點位三層的欄位責任，示範偏差、品質、時間與歷史趨勢如何逐層追查。
date: 2026-09-17
author: 站長
draft: false
---

## 總覽 診斷 點位三層分工

冷卻水系統的儀表板若同時放總流量、每個閥門、所有 quality 和原始 tag path，值班人員很難先判斷偏差是否值得追查。本文採自訂三層：總覽回答「哪個區域需要注意」；診斷回答「哪個支路與元件造成偏差」；點位詳細回答「這筆值的單位、品質、來源時間和原始資料是什麼」。這是工程設計案例，不冒充 ISA 強制畫面標準。

| 層級 | 必要欄位 | 可省略欄位 | 下一步 |
| --- | --- | --- | --- |
| 總覽 | 供/回水、偏差、總流量、品質、更新時間 | 原始 tag path、每閥門命令 | 點入診斷 |
| 診斷 | 支路偏差、泵浦回饋、閥命令/回饋、alarm state | 完整歷史樣本 | 點入點位 |
| 點位 | value、unit、quality、source/server time、tag path | 裝飾圖示 | 查來源/趨勢 |

總覽不是把診斷縮小，而是選擇能支援下一個決策的欄位。每個數值要帶單位與更新時間，品質至少分 Good、Uncertain、Bad 或產品實際可用狀態。若資料超過自訂 freshness，例如 30 秒，只能顯示資料過期提示，不能把最後一個漂亮數字當成目前現場狀態。

分層設計也要處理跨畫面一致性。總覽使用偏差，診斷使用同一公式與同一時間窗，點位則提供原始欄位供核對；若不同畫面各自查不同快取或不同 provider，應在畫面上標出查詢時間與來源，不能讓相同名稱的數字看起來像同一筆資料。

## 用冷卻水案例逐層追查

虛構系統有主供水 12.0°C、回水17.0°C、總流量 120 L/min；自訂注意條件為供回水偏差大於 4.0°C，這個數字只是案例門檻。總覽因此顯示「注意」，但不直接宣稱泵浦故障。值班者點入診斷後看到支路 B 回水 18.0°C、供水 12.0°C、泵浦回饋 Off，而支路A偏差未超過本例門檻，下一步才是查看支路 B 點位和最近趨勢。此處總回水17°C是獨立的虛構量測，不以支路兩筆溫度直接平均；推算混合溫度需同時取得各支路流量及條件。

| 追查步驟 | 畫面資料 | 結果/判斷邊界 |
| --- | --- | --- |
| 總覽 | 偏差5.0°C、流量120、更新 22:10:00 | 值得追查，不是根因 |
| 診斷 | B 支路泵浦命令 On、回饋 Off | 疑似命令/回饋不一致 |
| 點位 | 回饋Bool、Good；最近確認採集22:09:15 | 到22:10已45秒未確認採集 |
| 趨勢 | 10 分鐘供/回水與流量 | 看偏差開始時間 |
| 現場決策 | 依設備文件與權限處理 |  |

如果點位頁顯示 quality Bad，總覽應把偏差標成「資料不可信」或「待確認」，不能用 Bad 值觸發一般控制建議。若 來源時間與Server時間相差45秒，畫面應分別顯示並查時鐘與時間戳定義；不能直接把兩者差值當作網路延遲。這種分層讓使用者知道下一步查哪裡，而不是只變換顏色。

從總覽到診斷要保留支路、時間窗和資料版本；從診斷到點位要保留 tag path 和單位。返回上一層時保留篩選，但重新查詢摘要，避免在別人處理泵浦後仍顯示舊的 Off。未知產品不指定路由 API，僅定義必須保留的上下文。

診斷頁的支路列表應先顯示最需要處理的差異，再提供完整清單。排序條件要寫清楚，例如先 priority，再按偏差絕對值，最後按資料 age；排序只影響呈現，不應改變原始 alarm 或 tag 值。使用者改變排序後，返回總覽仍要回到摘要規則。

本例30秒門檻針對最近確認採集時間；不直接把OPC UA SourceTimestamp當成持續採樣心跳。數值未變時SourceTimestamp可能不前進，因此要核對資料來源更新契約、通訊回覆及品質，再判定Stale。若產品只提供一種時間欄位，先查它代表量測、變更或接收時間，不自行補出ServerTimestamp。

## 正常 注意 異常的視覺層級

視覺層級要同時使用文字、數值、位置、狀態與品質，不只靠紅綠色。正常可顯示數值和「Good/更新時間」；注意顯示偏差與建議檢查路徑；異常顯示 alarm state、Bad/Uncertain、最後有效時間與資料來源。顏色應有文字替代，因為截圖、夜班低亮度與色覺差異都可能使單色訊息失效。

| 狀態 | 總覽呈現 | 診斷呈現 | 點位呈現 |
| --- | --- | --- | --- |
| 正常 | 數值、Good、更新時間 | 支路一致 | value/unit/quality/time |
| 注意 | 偏差文字與來源區域 | 命令/回饋差異 | freshness、趨勢入口 |
| 異常 | Bad/通訊錯誤/最後有效值 | 來源與事件時間線 | raw、quality、錯誤碼 |
| 未知 | No data/待查 | 缺少的支路欄位 | 缺值原因與重試 |

多個 Y 軸或不同單位的趨勢不可只看線條高低。溫度 °C、流量 L/min、閥門百分比要各有明示軸；若用標準化偏差，必須把公式和基準放在畫面或報告。總覽顯示一個「系統健康分數」時，也要能展開來源，不可讓分數取代原始品質。

每一層的欄位都要有可追溯名稱。顯示名稱可以友善，但點位詳細頁仍要列 tag path、provider、source timestamp、server timestamp、unit、quality 和資料查詢時間。這能避免「畫面看起來正常」卻實際讀了錯誤支路或舊資料。

## 歷史趨勢與失敗先查

趨勢用來回答時間問題，不是把總覽的數字放大。以 10 分鐘窗口檢查偏差開始時間，再用班次或日視圖比較是否反覆。Ignition Power Chart 官方提供 Realtime/Historical range、Pan/Zoom 與 X-trace；Vision Easy Chart 另有 Raw、Fixed、Natural 等 resolution mode。產品元件不同時不要混用屬性名稱。

| 症狀 | 先查 | 不要直接下的結論 |
| --- | --- | --- |
| 支路沒有線 | tag history/權限/時間窗 | 不是一定沒有資料 |
| 尖峰消失 | Raw/aggregation/resolution | 不是一定沒有過熱 |
| 數值不同 | unit、quality、interpolation | 不是一定感測器壞 |
| 總覽與點位不同 | 查詢時間/快取/來源 | 不是立即矛盾 |
| 時間錯位 | timezone/source vs server time | 不是事件順序錯 |

另用獨立的製程溫度例子說明聚合，這不是前述冷卻水數字。歷史聚合不等於raw。若 10 分鐘中溫度 60°C 持續 9 分鐘、75°C 持續 1 分鐘，在分段常值假設下，時間加權平均是61.5°C；只取兩個樣本的 SimpleAverage 是 67.5°C，兩者都不能說明每一筆原始樣本。查詢結果要標示 aggregation、resolution、quality filter 和 interpolation。

完成後的驗收結果應是一條可重現路徑：總覽卡片顯示偏差與更新時間；點入診斷保留支路 filter；點入點位看到 unit/quality/source time；趨勢以固定 start/end 和模式重查。若 query timeout 或歷史 provider 不可用，畫面要顯示錯誤與最後成功時間，不要靜默沿用舊圖。

截圖與報告不可只保存一條彩色曲線。應保存 tag/pen 名稱、單位、quality、查詢起訖、時區、aggregation、resolution 和游標讀值。若報告要引用尖峰，應指出它來自 raw、MinMax 或其他聚合，讓另一位工程師可以用相同條件重查。

## FAQ 來源與限制

FAQ1：總覽偏差超過 4°C 就代表泵浦壞了嗎？不是，4°C 是案例門檻；還要查支路、命令/回饋、品質、時間與現場文件。

FAQ2：Good就表示資料一定新嗎？Good與新鮮度分開檢查。使用有明確定義的採集或接收時間；不能僅因來源值未變、SourceTimestamp未變就判斷斷線。

FAQ3：日平均正常可以忽略十分鐘尖峰嗎？不可以。平均會掩蓋短時間事件，需切換細時間窗或 raw/resolution 查明。

FAQ4：三層是否一定要三個畫面？不一定，可用同一元件的 drill-down；重點是欄位責任、來源、返回路徑和權限清楚。

Ignition 官方 Tag History 文件列出 Average、SimpleAverage、MinMax、LastValue 等差異；Power Chart/Easy Chart 文件列出時間範圍、游標與 resolution 行為。ISA 標準全文未取得，本文自訂畫面層級不代表 ISA 規範。

參考：[Ignition Perspective Power Chart。](https://docs.inductiveautomation.com/docs/8.1/appendix/components/perspective-components/perspective-chart-palette/perspective-power-chart)

參考：[Ignition Vision Easy Chart。](https://docs.inductiveautomation.com/docs/8.1/appendix/components/vision-components/charts/easy-chart)

正式交付前逐項檢查：總覽偏差是否能追到同一支路、診斷與點位是否使用同一單位、quality 與 freshness 是否分開、趨勢是否標示 raw 或聚合、返回是否保留 filter、資料失效時是否不會靜默沿用舊值。若任何產品屬性尚未查到版本文件，應列待確認而不是自行補 API名稱或宣稱已測結果。

參考：[Ignition system.tag.queryTagHistory。](https://www.docs.inductiveautomation.com/docs/8.1/appendix/scripting-functions/system-tag/system-tag-queryTagHistory)

## 延伸閱讀

- [HMI首頁的值班任務入口](/articles/hmi-home-task-entry-night-shift)
- [HMI 操作權限頁面如何讓使用者知道自己能做什麼](/articles/hmi-operation-permission-execution-authorization)
