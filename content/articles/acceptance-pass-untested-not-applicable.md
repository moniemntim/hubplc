---
title: 驗收紀錄如何區分通過未測與不適用
description: 用可下載的驗收表範本分開通過、未測、不適用與失敗，並讓放行判斷可由明細重算。
date: 2026-09-28
author: 茂伯
draft: false
category: 維護與故障排查
---

## 先讓每一列能支持一個決定

驗收表不是勾選清單；每列都應對應一個可判定的要求、特定配置和一種驗證方法。把「讀值正確、斷線後顯示警示、恢復後不重複寫入」塞在同一列，讀值成功時就會掩蓋其他兩項尚未驗證的路徑。

本頁提供可直接下載的空白驗收表範本。它不宣告任何需求已支援、沒有重播結果，也不含設備結論。

- [下載驗收狀態表範本 CSV](/examples/acceptance-report/acceptance-status-template.csv)
- [下載欄位和填寫規則](/examples/acceptance-report/README.md)

每次驗收先複製檔案、建立新的 `acceptance_id`，再填入真實可追溯資料。空白欄位應視為資料未完成，不能默認為通過或不適用。

## 通過、未測與不適用的界線

| 狀態 | 何時可填 | 必要紀錄 | 不可拿來代替 |
| --- | --- | --- |
| `pass` | 已依指定方法取得符合準則的結果 | 實際值、版本、證據位置、執行時間 | 口頭確認、模擬器替代實機 |
| `fail` | 已執行且不符合準則 | 預期與實際差異、影響、重測連結 | 偏差核准或修正計畫 |
| `not_run` | 要求適用，但尚未取得結果 | 未測原因、所需資源、下一步 | 因設備未到而寫不適用 |
| `blocked` | 要求適用，但前置條件阻止執行 | 阻塞者、解除條件、重新安排方式 | 已完成或已判定 |
| `not_applicable` | 配置或核准範圍明確排除此要求 | 配置／需求依據與核准識別 | 工具缺少、時間不足、結果不理想 |
| `invalid` | 已嘗試但量測、資料或程序不足以判定 | 無效原因、受影響證據與補測方式 | `pass` 或 `fail` 的猜測 |

例如第二通道未裝在核准配置中，且需求版本也排除了它，才可以填 `not_applicable`，並連到配置清單。若合約包含第二通道但硬體尚未到，則是 `not_run` 或 `blocked`。若在模擬器測到資料轉換正常，這只能支持明確寫成「模擬轉換」的要求；實體 I/O 仍保持未測。

## 填表時從要求往證據走

CSV 範本用以下欄位避免「OK」沒有意義：

| 欄位 | 現場要填什麼 |
| --- | --- |
| `requirement_id`、`requirement_text` | 可查的要求與可判定的行為 |
| `configuration_id`、`version_under_test` | 此列適用的組態、軟體／韌體／設定版本 |
| `method`、`acceptance_criterion` | 量測、檢查、分析或演示的方式和門檻 |
| `actual_result`、`executed_at`、`evidence_uri` | 實際觀測、執行時間及原始檔、日誌或受控系統位置 |
| `status`、`status_reason` | 當前結論及其理由 |
| `approval_or_scope_reference` | `not_applicable` 的核准範圍或需求／配置依據 |
| `next_action`、`owner`、`due_date` | 未完成項目的下一個可關閉動作 |

不要把不同證據強度混在同一欄：官方支援聲明回答「供應商說支援什麼」，現場測試回答「本配置觀測到什麼」。兩者都可保留，但不能互相代填。

## 摘要要同時列範圍和分母

假設一份驗收計畫有 12 列：8 `pass`、1 `fail`、2 `not_run`、1 已核准 `not_applicable`。適用項為 11 項；已執行並可判定項為 9 項。可寫成：

| 指標 | 計算 | 結果 |
| --- | --- | --- |
| 執行完成比例 | (pass + fail) / 適用項 | 9 / 11 = 81.8% |
| 適用項通過覆蓋 | pass / 適用項 | 8 / 11 = 72.7% |
| 已執行項通過比例 | pass / (pass + fail) | 8 / 9 = 88.9% |

這是純計算範例，不是下載表的實測成績。分母中的 `not_applicable` 必須先有配置或需求依據；`not_run`、`blocked`、`invalid` 不應消失。關鍵要求若未通過或未測，即使整體比例很好，是否放行仍由事先約定的放行準則與授權人員決定，不能自行用平均數取代。

## 重測不會抹除原始事實

修正後建立新的結果列或新的執行識別，連回原本的 `fail`、`invalid` 或 `blocked`。原始狀態、受測版本、證據和當時原因都保留；「最新狀態」可以顯示在摘要，但不能刪除歷史來讓表格變綠。

如果版本、設定、量測方法或配置有變，先做影響分析：原證據能覆蓋哪一部分、哪些列需要重測。把測試後換上的 V2 寫進同一張 V1 通過表，會使通過結果失去可追溯性。

NASA 的 Requirements Verification Matrix 說明需求、驗證方式和結果應維持識別與追溯；其產品驗證資料也要求關注配置、異常和偏差。本文借用這些文件管理原則，並非 NASA 或任何機型的驗收規範。

參考：[NASA Requirements Verification Matrix](https://www.nasa.gov/reference/appendix-d-requirements-verification-matrix/)；[NASA Product Verification](https://www.nasa.gov/reference/5-3-product-verification/)。

內容回饋可寄 [茂伯（ceo@hubplc.com）](mailto:ceo@hubplc.com)。

## 延伸閱讀

- [整合驗收未完成時如何清楚標示限制與後續證據](/articles/integration-acceptance-incomplete-evidence)
- [自動化測試報告如何附上版本 輸入與結果摘要](/articles/automated-test-report-reproducibility)
