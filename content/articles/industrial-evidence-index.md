---
title: 流量報表證據索引：用三個附件重算平均值
description: 用實際可下載的 CSV、查詢條件與索引文字，讓單一報表數字可離線追到兩筆來源資料。
date: 2026-09-28
author: 茂伯
draft: false
category: 資料記錄與報表
---

## 三個文字檔就能重算一次

這個離線範例有三個實際附件：兩筆來源列、查詢條件和索引說明。它沒有截圖；截圖狀態明確是 `not collected`，不會用不存在的 PNG 充當證據。

| 檔案 | 用途 | 狀態 |
| --- | --- | --- |
| [source.csv](/examples/evidence-index-ev-20260928-001/source.csv) | `LINE-2` 的兩筆 Good 流量樣本 | 已提供的離線範例 |
| [query.json](/examples/evidence-index-ev-20260928-001/query.json) | 絕對起訖、UTC+8、算術平均與品質篩選 | 已提供的離線範例 |
| [index.md](/examples/evidence-index-ev-20260928-001/index.md) | 事件 ID、追溯結論與限制 | 已提供的離線範例 |
| `screen-01.png` | 若要說明畫面瞬時值才需要 | not collected |

`source.csv` 的 `124.4` 與 `125.4` 都符合 `query.json` 的條件，因此 `(124.4 + 125.4) / 2 = 124.9 L/min`。這只能驗證附件內的算術與追溯路徑，不能證明實際儀表、報表服務或畫面曾顯示這些數字。

## 最小命名與使用方式

事件目錄用 `EV-YYYYMMDD-NNN`，這裡是 `EV-20260928-001`。每次重新匯出或換了查詢條件，就建立新的事件 ID，舊檔保留。索引至少寫明來源檔、絕對時間範圍、時區、聚合規則、品質篩選與尚未取得的證據。

收到真實資料時，先保存原始 CSV 和查詢條件，再由 `index.md` 記錄它們的實際位置；如果沒有畫面，就寫 `not collected`。雜湊、跨包 schema、分頁匯出、權限與保存週期屬於完整資料交付流程，不在這個最小索引內。

## 延伸閱讀

- [工業 CSV 交付包如何用 manifest 與查詢快照保存可重現條件](/articles/industrial-csv-package-manifest)
- [HMI 報表篩選與時間窗如何避免重複或漏資料](/articles/hmi-report-filter-time-window-alarm-state)
