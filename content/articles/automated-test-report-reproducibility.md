---
title: 自動化測試報告如何附上版本 輸入與結果摘要
description: 用可下載的離線 Modbus FC03 範例實際產生版本、輸入、結果與雜湊，並說明它不能證明硬體通訊。
date: 2026-09-28
author: 茂伯
draft: false
category: 維護與故障排查
---

## 一個真的可執行、但不接設備的報告

這組範例會讀取固定的 Modbus FC03 回應 PDU：`03 04 00 FD 00 64`。執行器驗證功能碼、byte count、兩個 16 位元 big-endian 值，以及預期的 `253`、`100`；然後產生結果與 manifest，並以 SHA-256 記錄輸入、執行器和結果檔。它是實際執行的**離線位元組解析**，沒有開 TCP／序列埠、沒有寫入，也沒有連接 PLC 或任何硬體。

- [下載輸入：fc03-known-frame-input.json](/examples/acceptance-report/fc03-known-frame-input.json)
- [下載執行器：run-fc03-report.mjs](/examples/acceptance-report/run-fc03-report.mjs)
- [下載本次離線結果](/examples/acceptance-report/runs/20260928T000639532Z/results.json)
- [下載本次 manifest 與 SHA-256](/examples/acceptance-report/runs/20260928T000639532Z/manifest.json)
- [下載驗收表範本 CSV](/examples/acceptance-report/acceptance-status-template.csv)

在下載檔所在目錄執行：

```text
node run-fc03-report.mjs
```

它每次建立一個新的 `runs/<run_id>/` 子目錄並寫入 `results.json` 與 `manifest.json`，既不覆寫舊結果，也不把新重跑併入舊報告。輸入和執行器的內容相同時，兩個 SHA-256 必須相同；結果包含 `run_id` 和產生時間，所以結果檔的 SHA-256 會不同。這支離線執行器永遠輸出 `hardware_tested: false`；需要硬體證據時，另建受控的硬體測試案例與報告，不能修改這個離線結果的旗標。

## 先看結果，再看它能證明什麼

| 輸出欄位 | 重播時核對 | 它能回答的問題 | 缺少時的結論 |
| --- | --- | --- | --- |
| `artifacts.input.sha256`、`artifacts.runner.sha256` | 輸入與判定程式是否相同 | 是否重播相同條件 | 只能說跑過名稱相同的檔案 |
| `byte_count`、`values`、`expected_values` | 位元組結構和比較值 | 實際判定依據 | 不能看出結果如何形成 |
| `status`、`checks` | 哪個檢查通過或失敗 | 離線執行是否符合預期 | 不能把程式退出碼當整個結果 |
| `hardware_tested`、`scope` | 是否真的碰過設備、測試邊界 | 此報告是否涵蓋硬體 | 不可外推成通訊或現場證據 |

結果的 `status: "pass"` 僅表示此台電腦已成功以該版本的腳本解析固定離線輸入。它能支持「固定 PDU 的結構、byte count 與數值檢查在這次離線執行符合預期」，不能支持 PLC 位址正確、設備會回覆、通訊鏈路可用、暫存器真實數值為 253／100，或現場驗收通過。

## 從離線結果到現場結果，狀態不要混用

Modbus Application Protocol 規定讀取保持暫存器的功能碼為 `03`，正常回應包含功能碼、byte count 與資料欄位；本例只用該訊息結構練習離線判讀。實際寄送請求、位址偏移和設備支援範圍仍須依指定設備文件與受控測試確認。

參考：[Modbus Application Protocol Specification V1.1b3](https://www.modbus.org/file/secure/modbusprotocolspecification.pdf)。

每個真實 `case_id` 對應一筆實際嘗試，並有自己的 `run_id`。一項案例重跑三次，就保存三筆結果，不要以最後一次綠燈覆蓋前兩次。狀態的界線如下：

| status | 使用時機 | 摘要處理 |
| --- | --- | --- |
| `pass` | 已在記錄的條件下取得實際結果，且符合接受準則 | 列入通過與已執行 |
| `fail` | 已執行且實際結果不符合準則 | 列入失敗與已執行，保留差異 |
| `not_run` | 尚未開始，或在開始前取消 | 不列入已執行；寫明下一步 |
| `blocked` | 因權限、治具、隔離或前置條件而不能開始 | 不列入已執行；寫解除條件 |
| `invalid` | 已嘗試，但測試器、量測或附件無法支持結果 | 不把看似合理的數字改成通過；補測 |

若要從離線例子走到真實設備，另外建立案例與證據：明確記錄受測組態、設備型號與版本、讀取範圍、隔離／授權、停止與回復條件，以及封包或設備日誌。那些資料才可以支持硬體層的結果；離線 `pass` 不會自動轉成實機 `pass`。

內容回饋可寄 [茂伯（ceo@hubplc.com）](mailto:ceo@hubplc.com)。

## 延伸閱讀

- [不穩定測試如何用重跑統計判斷是否為環境問題](/articles/rerun-flaky-test-environment-evidence)
- [測試環境與正式環境差異如何列入風險說明](/articles/test-production-environment-risk)
