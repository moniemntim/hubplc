# EV-20260928-001

用途：離線示範如何從一分鐘算術平均追到來源列。

資料狀態：合成的固定樣本；不是現場匯出或儀表讀值。

| 檔案 | 用途 | 狀態 |
| --- | --- | --- |
| source.csv | LINE-2 的兩筆 Good 流量樣本 | provided |
| query.json | 時間窗、品質篩選與算術平均 | provided |
| screen-01.png | 畫面瞬時值證據 | not collected |

重算：`(124.4 + 125.4) / 2 = 124.9 L/min`。兩筆列都在 `start` 到 `endExclusive` 的時間窗內，且 quality 為 `Good`。

限制：此檔只支持附件內的算術與追溯；不證明實際儀表、報表服務、時間同步或畫面內容。
