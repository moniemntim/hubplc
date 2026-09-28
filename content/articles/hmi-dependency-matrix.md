---
title: HMI畫面與報表的相依性矩陣
description: 用可下載的 CSV 範例建立畫面、資料集、報表、角色與檔案的依賴圖；欄位改名時，可重算直接與間接受影響項目並交付可觀察的回歸紀錄。
date: 2026-09-28
author: 茂伯
draft: false
category: HMI 畫面與操作
tags: HMI, 報表, 相依性, 回歸測試, 資料契約
---

欄位改名最容易漏掉的不是直接綁定畫面，而是「報表讀資料集、另一張畫面再讀報表」這條路徑。相依性矩陣的工作是把這些路徑變成可查的資料，據此選出回歸範圍；它不會代替實際 HMI、排程器、資料庫或權限系統的測試。

本文附的案例是平台中立的虛構冷卻水專案，所有 ID、角色、資料與結果都是教學 fixture，沒有連接 PLC、資料庫、廠商 HMI 或硬體。它的目的只有一個：讓工程團隊能在自己的平台匯出設定後，用同一種欄位重建、審查和驗證矩陣。

## 下載範例與先跑離線檢查

下載 [完整範例 ZIP](/examples/hmi-dependency-matrix.zip)，解壓後即可取得矩陣、兩個資料契約版本、流量資料、報表預期輸出、角色資料與一支不需外部套件的 PowerShell 驗證程式。也可逐一檢視 [README](/examples/hmi-dependency-matrix/README.md)、[依賴矩陣](/examples/hmi-dependency-matrix/dependency-matrix.csv)、[v1 溫度資料](/examples/hmi-dependency-matrix/fixtures/history-temp-v1.csv)、[v2 改名資料](/examples/hmi-dependency-matrix/fixtures/history-temp-v2-renamed.csv)、[流量資料](/examples/hmi-dependency-matrix/fixtures/history-flow-v1.csv)、[角色資料](/examples/hmi-dependency-matrix/fixtures/roles.csv)、[預期報表](/examples/hmi-dependency-matrix/expected/daily-temperature-report.csv) 與 [驗證程式](/examples/hmi-dependency-matrix/verify-fixtures.ps1)。

解壓或複製後，在該資料夾執行：

```powershell
powershell -ExecutionPolicy Bypass -File .\verify-fixtures.ps1
```

檢查程式會驗證 CSV 欄位、所有矩陣引用的 fixture 是否存在，並從 `dataset:history-temp` 沿矩陣邊線重算受影響資源。預期的受影響集合是 `screen:temperature`、`screen:overview`、`report:daily-temperature`、`screen:daily-report`；`screen:flow` 必須不在其中。它也會確認 v1 資料契約有 `temp_avg`，v2 是刻意改名後的候選契約，故不再有該欄位。

這個 PASS 僅代表下載的範例檔與其宣告的關係一致；目標系統的畫面、排程、帳號權限與設備行為仍要另行實測。

## 先把矩陣定義成可查的關係，而不是「有關」

一列矩陣描述一條方向明確的邊：消費者 `from_id` 使用提供者 `to_id`。`access` 只填可判讀的動詞，像 `Read`、`Write`、`Filter`、`Render` 或 `Authorize`；`contract_field` 寫實際欄位或輸出欄位；`evidence` 指向可回查的設定匯出、查詢定義、測試紀錄或人工檢閱記錄。找不到證據就填 `Unknown`，不能填 `Pass`。

| 欄位 | 要回答的問題 | 本例的一筆值 |
| --- | --- | --- |
| `from_id` / `to_id` | 誰使用誰？ | `report:daily-temperature` → `dataset:history-temp` |
| `access` | 使用方式是什麼？ | `Read` |
| `contract_field` | 哪個資料契約要相容？ | `temp_avg` |
| `path_kind` | 是直接還是透過中間資源？ | `direct`；間接關係由圖走訪算出 |
| `condition` | 何時會走這條邊？ | `quality = Good` |
| `evidence` | 用什麼檢查這個宣告？ | `fixtures/history-temp-v1.csv` |
| `owner` / `verification_state` | 誰維護、目前證據狀態？ | `data-owner` / `ExampleOnly` |

不要只列畫面和資料庫連線名稱。同名連線可能指向不同環境，同名畫面也可能在不同專案版次使用不同查詢。資源 ID、版本、查詢／轉換定義、欄位、時間範圍與角色都要能回到實際來源。由工具匯出的交叉參照可當起點，但字串組合、腳本、動態查詢、外部檔案和共用元件仍要人工檢閱並標記為 `Unknown` 或已附證據的關係。

## 可重做案例：`temp_avg` 改為 `temperature_mean`

範例的基準資料集是 `dataset:history-temp`。`screen:temperature` 和 `screen:overview` 直接讀 `temp_avg`；`report:daily-temperature` 讀相同欄位後產生 `daily_temperature_mean`；`screen:daily-report` 只讀報表輸出。`screen:flow` 只讀 `dataset:history-flow`，不該被溫度欄位改名波及。

| 資源 | 與溫度資料集的關係 | 改名後要做的事 |
| --- | --- | --- |
| `screen:temperature` | 直接 `Read temp_avg` | 修正綁定後，以固定快照確認值、單位、空值與品質狀態 |
| `screen:overview` | 直接 `Read temp_avg` | 同時確認溫度與流量區塊，避免只驗首頁一個元件 |
| `report:daily-temperature` | 直接 `Read temp_avg` | 以固定日期預覽或手動觸發，確認資料列、平均與輸出欄位 |
| `screen:daily-report` | 間接，讀報表輸出 | 報表成功後再確認畫面讀到相同版本的輸出 |
| `screen:flow` | 沒有到溫度資料集的路徑 | 留在未受影響清單；不因名稱相似而列入 |

`fixtures/history-temp-v1.csv` 的 Good 資料是 20 °C 與 24 °C，另有一筆空值，因此範例報表的有效平均為 22 °C、有效數 2、空值數 1。`expected/daily-temperature-report.csv` 是這個規則的預期輸出。這些數字是 fixture 的可重算結果，不是任何現場製程或儀器量測。

下一步以 `fixtures/history-temp-v2-renamed.csv` 模擬僅欄位改名。它保留列數、時間、設備 ID、值與品質，但將 `temp_avg` 改成 `temperature_mean`。在尚未更新消費者設定前，所有三個直接讀取者應得到「資料契約欄位不存在」一類的明確失敗；絕不可把舊快取 22 °C 標成新的成功結果。間接畫面要等報表重新產出並帶有可識別版本／時間後才能驗收。

## 從變更清單算出測試範圍

變更審查先寫出輸入，不要從「看起來小」推論範圍：

```text
changed_resource = dataset:history-temp
changed_contract = temp_avg removed; temperature_mean added
baseline = fixture version v1
candidate = fixture version v2
```

然後由 `changed_resource` 沿「被誰使用」的反向邊做圖走訪。第一層是兩張畫面和一份報表；從報表繼續走才會找到 `screen:daily-report`。矩陣不必把 `screen:daily-report` 假寫成直接讀資料集，保留真實的 `screen → report → dataset` 關係，影響分析才可被重算與審查。

每次改動建立一份不可覆蓋的 before/after 矩陣快照，列出新增、移除、改名與尚未確認的關係。若自動搜尋沒有找到引用，結論只能是「未從該搜尋結果發現」，不是「不存在」。動態欄位或腳本路徑需放入人工檢閱待辦，附 owner、版本與到期日。

## 把回歸寫成可觀察的結果

矩陣只會產生受影響集合；通過條件仍要在目標系統定義、執行並保存證據。對每個案例記專案版本、使用者角色、資料時間窗、資料列數、品質、輸出版本／雜湊、實際結果與證據位置。截圖可證明當時畫面，但不能單獨證明查詢條件或後端權限；報表檔也不能只因非空白就算正確。

| 案例 | 前提 | 通過條件 | 失敗時先查 |
| --- | --- | --- | --- |
| 欄位改名尚未修正 | 使用 v2 契約 | 直接消費者有可辨識的契約錯誤，不顯示舊值為最新值 | 綁定、查詢、轉換與快取策略 |
| 畫面修正後 | 固定 v1 等值資料或受控測試資料 | `20`、空值、`24` 的值／單位／品質規則符合設計 | 型別、空值策略、顯示格式 |
| 報表重跑 | 固定日期與設備 | 有效平均 22、有效數 2、空值數 1，且輸出可追溯 | 篩選條件、品質規則、排程身分 |
| 間接畫面 | 已驗證的新報表輸出 | 畫面顯示同一報表版本，不混用舊快取 | 報表版本、快取失效、畫面資料源 |
| 角色變更 | 使用實際目標角色登入 | 拒絕、遮蔽或允許行為符合核准規格 | 執行期權限，不只看設定文字 |

範例中的 `roles.csv` 只是一份預期權限表，並不證明任何廠商平台在執行期會套用它。真正的角色測試必須以目標系統登入、用被核准的測試帳號操作，再留下實際回應和時間。

## 外部檔與未知關係也要入圖

圖片、字型、報表模板、語言包和外部程式可用相同格式建邊，例如畫面 `Render` 資產、報表 `Read` 模板。路徑欄必須記平台實際解析的 URI 或相對基準，不要只記某台工程電腦的磁碟機代號。檔案存在、權限可讀、格式支援與內容版本是不同檢查點；可用檔案大小與雜湊追蹤同名替換。

若報表排程和畫面走不同身分或不同服務帳號，兩者要各自驗證。畫面成功不等於排程可存取，排程成功也不等於操作員看得到輸出。高風險或運轉中的系統先在隔離副本與已核准測試資料上演練。

## 限制、驗收與下一次維護

這份範例未驗證任何 Ignition、GOT、WinCC、Pro-face 或其他產品的設定頁、匯出格式、快取、權限語意、報表功能或硬體行為。套用到特定產品前，要以該版本的官方文件、專案匯出與受控環境實測校正欄位與證據來源。

交付前逐列確認：每條關係有資源 ID、行為、欄位、版本、owner 和證據；受影響集合由目前矩陣重算；未測項與 Unknown 保留在清單中；直接與間接案例都附實際結果。矩陣有缺口時，最誠實的驗收狀態是未確認，而不是把未找到的引用當成未受影響。

## 延伸閱讀

- [HMI字型與圖片遺失的尋找與封裝](/articles/hmi-resource-packaging)
- [HMI設定值變更的確認與讀回](/articles/hmi-setting-value-change-confirm-readback)
