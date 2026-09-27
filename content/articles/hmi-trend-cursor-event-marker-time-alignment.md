---
title: HMI 趨勢游標與事件標記如何協助回看一次異常
description: 以虛構泵浦切換後流量波動案例，分開 sourceTimestamp、收取時間、操作時間與游標時間，建立事件標記、對齊、插值辨識與證據保存流程。
date: 2026-09-17
author: 茂伯
draft: false
---

## 先定義事件標記與三種時間

先分清來源事件或樣點時間、服務接收時間、操作者動作時間與游標時間。sourceTimestamp的精確語意取決於來源，可能是事件建立、值變更或取樣時間，未必是每次成功通訊時間；serverReceivedAt則是服務收到的時間。operatorAt應由可信操作記錄系統落時，不採任意前端自填時間。

| 時間欄位 | 由誰產生 | 用途 | 不可當作 |
| --- | --- | --- | --- |
| sourceTimestamp | PLC/來源 | 事件與樣點發生順序 | HMI 收到時間 |
| serverReceivedAt | Gateway/SCADA | 查網路/處理延遲 | 現場發生時間 |
| operatorAt | 操作記錄服務 | 操作與備註稽核 | 事件來源時間 |
| cursorTime | 使用者選取 | 讀圖/對齊窗口 | 原始樣點時間 |

事件標記至少保存 markerTime、source、eventType、eventId、備註、作者、來源時間與接收時間。游標只是視覺工具；若游標落在兩個樣點之間，圖表可能顯示插值或聚合值，必須標成讀圖值，不能直接寫入事件資料庫當成量測。

事件標記的來源不能只寫「警報」。應列出來源系統、tag/condition path、eventid、event type、priority、source timestamp、server receive time 和時區。備註則列作者、角色、operatorAt、文字與關聯 operation id，讓後續人員知道這是來源事件還是人工觀察。

同一趨勢可以疊多種標記，但圖例要分組：來源樣點、設備命令、警報事件、人工註解。用同一顏色表示不同時間語意會誤導；標記樣式和文字要能在黑白列印或截圖中辨識。

先保存資料列再畫標記。比對來源時鐘同步、偏差與時間解析度後，才將可比較的來源時間放在同一軸；同時保留接收順序與操作記錄。只換成UTC表示法不會校正錯誤時鐘。不同來源無法精確排序時，標示先後不確定，不為了畫出漂亮曲線任意挪動事件。

## 泵浦切換的對齊時間線

離線案例假設所有來源時鐘已對齊且解析度足夠，顯示時區UTC+8。14:00:00命令由服務發送，14:00:02泵浦回饋由Off變On；流量原始樣點為14:00:01.500的80、14:00:03.000的62、14:00:06.000的80 L/min。低流量事件來源時間03.200、服務接收04.000，操作者05.000確認。

| 時間 | 來源/事件 | 標記內容 | 對齊解讀 |
| --- | --- | --- | --- |
| 14:00:00.000 | command sent | operator/system marker | 命令發出，不代表已啟動 |
| 14:00:02.000 | pump feedback On | source sample | 回饋已變，不等於流量穩定 |
| 14:00:03.000 | flow 80→62 L/min | historian sample | 可查拐點附近樣點 |
| 14:00:03.200 | low-flow alarm source | event marker | 事件來源時間 |
| 14:00:04.000 | HMI 收到 alarm | receive marker | 延遲0.8秒 |
| 14:00:05.000 | Operator Ack | acknowledgement marker | 操作時間，不是恢復 |

以此對齊時鐘假設，事件來源到接收相差0.8秒，仍包含來源與服務處理，不能直接稱網路單程延遲。若線性連接03.000的62和06.000的80，游標在03.200的估算值為62+(80−62)×0.2/3=63.2 L/min；這不是新增的原始樣點，也不保證元件預設線性插值。

泵浦切換後的拐點也不能自動證明因果。時間上先發生只表示可列入調查；還要查閥位、其他泵浦、來源 quality、控制命令與設備文件。標記名稱可以寫 candidate turning point，而不是 root cause。

如果流量樣點只有 14:00:03.000=62 與 14:00:06.000=80，游標在 14:00:04.000 顯示 68 可能只是連線或繪圖插值。正確做法是表格同時列 nearest raw sample、cursor display value 和 interpolation flag；三者不同時，報告不能把 68 寫成原始量測。

以命令發送為零點，回饋在二秒、低流量來源事件在三點二秒、服務接收在四秒、人工確認在五秒。二秒間隔只表示這些可觀察事件的差，不是泵浦純機械反應時間；來源處理及通訊也可能參與。只有接收時間時，更不能反推現場事件的準確先後。

## 用游標查資料而非修改資料

Ignition Power Chart 官方提供 X-trace 與 Historical time axis，可讓使用者在指定區間定位時間；這適合產生檢查線索。操作步驟是：固定 UTC start/end，查詢flow與pump feedback兩條趨勢，另以專案支援的方式對照command與alarm事件標記；先用整段看趨勢，再縮放 14:00:00–14:00:10；把游標放在命令、回饋、拐點和 alarm source time，各自記錄顯示值與資料狀態。

| 游標位置 | 應保存 | 是否可當原始樣點 |
| --- | --- | --- |
| 14:00:00.000 | command marker、source time | 是事件標記，不是flow樣點 |
| 14:00:02.000 | feedback raw timestamp/value | 若查到原樣本才可 |
| 14:00:03.200 | alarm source time、flow近鄰樣本 | 游標值可能插值 |
| 14:00:04.000 | server receive time | 不是alarm發生時間 |
| 14:00:05.000 | operator note與帳號 | 不是設備恢復時間 |

若事件標記從外部資料庫或 Alarm Journal 疊到圖上，要保存來源表、查詢條件、時區與 eventid。Power Chart 的 annotation 功能和 Tag Historian 相關時，仍需確認實際產品版本、權限與資料庫設定；不能因畫面看見一條線就宣稱事件已永久保存。

事件標記的備註應採固定格式：現象、觀察、下一步、作者和時間。不要把推測原因直接寫成事實，例如「泵浦故障」應改成「切換後流量下降，待查回饋/閥位」。後續工程師可以依 source data 補證據。

Power Chart 的 Historical time axis 和 X-trace 是回看的操作工具，實際能否讀取事件、annotation 和 tag history 取決於產品版本、license、權限及資料設定。先確認元件支援和資料源，再設計證據表；不要猜某個 HMI 一定有相同 callback 或 annotation API。

游標操作的驗收可以安排兩次讀取：第一次記錄畫面顯示值與游標時間，第二次用相同起訖與查詢模式取得原始列。若兩次的 provider、時區或聚合不同，差異沒有診斷價值。報告也要保存圖表設定版本，因為元件更新後取樣密度和顯示方式可能改變。

## 資料錯位與證據保存

若 sourceTimestamp 比 serverReceivedAt 晚或早很多，先查來源時鐘、時區、Gateway queue、網路延遲和 historian 寫入，不要直接平移所有事件。保存 offset、原始時間和轉換規則；若時鐘未同步，報告要把時間對齊不確定性標出。時間錯位可能影響排序，但不能靠游標把不確定性消掉。

| 證據 | 內容 | 用途 |
| --- | --- | --- |
| 原始事件 | eventid、source/receive time、type | 辨識 cycle/延遲 |
| 趨勢查詢 | tag、provider、start/end、mode | 重現曲線 |
| 游標紀錄 | cursor time、顯示值、是否插值 | 區分讀圖與樣點 |
| 操作記錄 | user、role、operatorAt、comment | 稽核確認 |
| 畫面快照 | UTC/local、版本、filter | 保留當時視圖 |

排錯順序是先核對時區和時鐘，再核對資料來源與 tag path，再核對歷史 query mode、resolution、quality，最後才看游標位置和畫面快取。若alarm來源另外提供可核對的source time、趨勢只有接收時間，兩者不能直接用畫面像素對齊；應以資料欄位做對齊並保留誤差。

完成結果應是事件時間線和趨勢查詢條件的配對證據，而不是一張沒有時間軸說明的截圖。若只能取得游標插值值，應明示無法證明原始樣點；若缺 source timestamp，應列為資料品質缺口。

不能只用serverReceivedAt減sourceTimestamp當網路延遲。先驗證兩端時鐘、時間欄位語意及來源處理流程；接收序號只能證明該接收端的順序，無法修正來源時鐘或提供單程延遲。Ignition Journal的eventtime也不是未經映射就能代表PLC掃描時間的欄位。

事件重播時應保留原始順序和修訂紀錄。若操作員後來補寫備註，新增一筆 annotation 並引用原 eventId，不要改寫原 sourceTimestamp；若警報重新發生，使用新的事件識別。這使讀者能區分同一次事件的處理過程與下一次獨立異常。

## FAQ 來源與限制

FAQ1：游標在 14:00:03.2 顯示的數值就是那一刻的實測值嗎？不一定，可能是插值或聚合；要查原始樣點與 quality。

FAQ2：HMI 收到 alarm 的時間能當發生時間嗎？不能，需分 sourceTimestamp 與 serverReceivedAt。

FAQ3：切換後先出現流量下降就能證明泵浦造成嗎？不能，時間先後只是調查線索，還需查其他來源和設備證據。

FAQ4：截圖保存了游標就足夠稽核嗎？不夠，還要保存 eventid、查詢條件、timezone、user、備註、來源與版本。

本篇泵浦時間線為案例資料，Ignition Power Chart 官方文件可核對 Historical time axis、Pan/Zoom、X-trace 與 annotation 相關功能；具體資料保存和事件來源仍需查專案版本。

參考：[Ignition Perspective Power Chart。](https://docs.inductiveautomation.com/docs/8.1/appendix/components/perspective-components/perspective-chart-palette/perspective-power-chart)

參考：[Ignition Alarm Journal。](https://docs.inductiveautomation.com/docs/8.1/platform/alarming/alarm-journal)

參考：[Ignition Tag Historian。](https://docs.inductiveautomation.com/docs/8.1/ignition-modules/tag-historian)

## 延伸閱讀

- [HMI 趨勢圖怎麼選時間範圍才能支援值班判斷](/articles/hmi-trend-time-range-sampling-aggregation)
- [HMI 手動與自動模式怎麼在畫面上清楚區分](/articles/hmi-manual-auto-mode-control-ownership)
